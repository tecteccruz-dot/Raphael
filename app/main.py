from fastapi import FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import avatar as api_avatar
from app.api import personaje as api_personaje
from app.websocket.gestor_conexiones import gestor_conexiones


app = FastAPI(title="Raphael")
app.include_router(api_avatar.router)
app.include_router(api_personaje.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse, summary="Inicio")
async def inicio(request: Request):
    return templates.TemplateResponse(
        request,
        "inicio.html",
        {},
    )


@app.get("/salud", response_class=JSONResponse, summary="Estado del servidor")
async def salud():
    return {
        "ok": True,
        "servidor": "Raphael",
        "mensaje": "Servidor funcionando correctamente",
    }


@app.get("/sala/{sala_id}", response_class=HTMLResponse, summary="Sala de chat")
async def ver_sala(
    request: Request,
    sala_id: str,
    nombre: str = Query(..., min_length=2, max_length=24),
):
    return templates.TemplateResponse(
        request,
        "chat.html",
        {
            "sala_id": sala_id,
            "nombre": nombre,
        },
    )


async def publicar_presencia(sala_id: str) -> None:
    await gestor_conexiones.enviar_presencia_a_sala(sala_id)


@app.websocket("/ws/{sala_id}/{nombre}")
async def websocket_sala(websocket: WebSocket, sala_id: str, nombre: str):
    exito, _ = await gestor_conexiones.conectar(sala_id, nombre, websocket)

    if not exito:
        return

    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{nombre} entro a la sala.",
        },
    )
    await publicar_presencia(sala_id)

    try:
        while True:
            datos = await websocket.receive_json()
            tipo = datos.get("tipo", "mensaje")

            if tipo == "ping":
                await gestor_conexiones.enviar_json_personal(
                    websocket,
                    {
                        "tipo": "pong",
                    },
                )
                continue

            if tipo == "privacidad":
                bloqueado = bool(datos.get("bloqueado"))
                actualizado = gestor_conexiones.actualizar_privacidad(sala_id, nombre, bloqueado)

                if actualizado:
                    await publicar_presencia(sala_id)

                continue

            mensaje = str(datos.get("mensaje", "")).strip()

            if not mensaje:
                continue

            await gestor_conexiones.enviar_json_a_sala(
                sala_id,
                gestor_conexiones.construir_evento_chat(sala_id, nombre, mensaje),
            )

    except WebSocketDisconnect:
        gestor_conexiones.desconectar(sala_id, nombre)

        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"{nombre} salio de la sala.",
            },
        )
        await publicar_presencia(sala_id)

    except Exception:
        gestor_conexiones.desconectar(sala_id, nombre)

        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"{nombre} se desconecto por un error.",
            },
        )
        await publicar_presencia(sala_id)
