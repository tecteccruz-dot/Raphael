from fastapi import FastAPI, Form, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import avatar as api_avatar
from app.api import personaje as api_personaje
from app.servicios import salas as servicio_salas
from app.websocket.gestor_conexiones import gestor_conexiones


app = FastAPI(title="Raphael")
app.include_router(api_avatar.router)
app.include_router(api_personaje.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


def _salas_dashboard() -> list[dict[str, object]]:
    resultado: list[dict[str, object]] = []

    for sala in servicio_salas.listar_salas():
        sala_id = str(sala.get("id", "")).strip()
        enriquecida = dict(sala)
        enriquecida["jugadores_activos"] = len(gestor_conexiones.obtener_jugadores_sala(sala_id))
        resultado.append(enriquecida)

    return resultado


def _render_dashboard(
    request: Request,
    *,
    error: str | None = None,
    status_code: int = 200,
):
    salas = _salas_dashboard()

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "salas": salas,
            "escenarios": servicio_salas.listar_escenarios(),
            "error": error,
            "total_jugadores_activos": sum(int(sala.get("jugadores_activos", 0)) for sala in salas),
        },
        status_code=status_code,
    )


@app.get("/", response_class=HTMLResponse, summary="Dashboard de salas")
async def dashboard(request: Request):
    return _render_dashboard(request)


@app.post("/salas/crear", response_class=HTMLResponse, summary="Crear sala")
async def crear_sala(
    request: Request,
    nombre_sala: str = Form(...),
    escenario_id: str = Form(...),
):
    try:
        sala = servicio_salas.crear_sala(nombre_sala, escenario_id)
    except ValueError as exc:
        return _render_dashboard(request, error=str(exc), status_code=400)

    return RedirectResponse(url=f"/personaje?sala={sala['id']}", status_code=303)


@app.get("/personaje", response_class=HTMLResponse, summary="Crear personaje")
async def crear_personaje_view(
    request: Request,
    sala: str | None = Query(default=None),
):
    sala_actual = servicio_salas.obtener_sala(sala or "")
    sala_id = str(sala_actual.get("id") if sala_actual else (sala or "")).strip()

    return templates.TemplateResponse(
        request,
        "inicio.html",
        {
            "sala_prefijada": sala_id or None,
            "sala_bloqueada": bool(sala_actual),
            "sala_nombre": sala_actual.get("nombre") if sala_actual else None,
            "escenario_nombre": sala_actual.get("escenario_nombre") if sala_actual else None,
            "escenario_descripcion": sala_actual.get("escenario_descripcion") if sala_actual else None,
            "sala_no_encontrada": bool(sala) and not sala_actual,
        },
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
    sala_actual = servicio_salas.obtener_sala(sala_id)

    return templates.TemplateResponse(
        request,
        "chat.html",
        {
            "sala_id": sala_id,
            "nombre": nombre,
            "sala_nombre": sala_actual.get("nombre") if sala_actual else sala_id,
            "escenario_nombre": sala_actual.get("escenario_nombre") if sala_actual else "Sala lista",
            "escenario_descripcion": sala_actual.get("escenario_descripcion") if sala_actual else "Haz clic en tu personaje o en otro jugador para abrir su resumen textual.",
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
