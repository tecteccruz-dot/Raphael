import asyncio
import re

from fastapi import FastAPI, Form, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import avatar as api_avatar
from app.api import personaje as api_personaje
from app.servicios import lmstudio as servicio_lmstudio
from app.servicios.combate import ActorCombate, gestor_combate
from app.servicios import personajes_npc as servicio_personajes_npc
from app.servicios import salas as servicio_salas
from app.servicios import sesiones_jugador
from app.servicios import tiradas as servicio_tiradas
from app.websocket.gestor_conexiones import gestor_conexiones


app = FastAPI(title="Raphael")
app.include_router(api_avatar.router)
app.include_router(api_personaje.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")
_HOST_COOKIE_MAX_AGE = 60 * 60 * 24 * 180
_LOCKS_RESOLUCION_IA: dict[str, asyncio.Lock] = {}
_TAREAS_LIMPIEZA_TIRADA: dict[str, asyncio.Task] = {}
_EVENTOS_CONTINUACION_TIRADA: dict[str, tuple[str, asyncio.Event]] = {}
_ATRIBUTOS_TIRADA_VALIDOS = {"fue", "des", "con", "int", "sab", "car"}


def _token_host_request(request: Request, sala_id: str) -> str | None:
    return request.cookies.get(servicio_salas.nombre_cookie_host(sala_id))


def _es_host_request(request: Request, sala_id: str) -> bool:
    return servicio_salas.es_host(sala_id, _token_host_request(request, sala_id))


def _aplicar_cookie_host(response: RedirectResponse, sala_id: str, host_token: str) -> None:
    response.set_cookie(
        key=servicio_salas.nombre_cookie_host(sala_id),
        value=host_token,
        max_age=_HOST_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def _limpiar_cookie_host(response: RedirectResponse, sala_id: str) -> None:
    response.delete_cookie(
        key=servicio_salas.nombre_cookie_host(sala_id),
        path="/",
    )


def _asegurar_host_request(request: Request, sala_id: str) -> dict[str, object]:
    sala_actual = servicio_salas.obtener_sala(sala_id)
    if not sala_actual:
        raise HTTPException(status_code=404, detail="No encontramos la sala solicitada.")

    if not _es_host_request(request, sala_id):
        raise HTTPException(status_code=403, detail="Este navegador no tiene permisos de host para esa sala.")

    return sala_actual


def _salas_dashboard(request: Request) -> list[dict[str, object]]:
    resultado: list[dict[str, object]] = []

    for sala in servicio_salas.listar_salas():
        sala_id = str(sala.get("id", "")).strip()
        enriquecida = dict(sala)
        enriquecida["jugadores_activos"] = len(gestor_conexiones.obtener_jugadores_sala(sala_id))
        enriquecida["es_host_actual"] = _es_host_request(request, sala_id)
        resultado.append(enriquecida)

    return resultado


def _render_dashboard(
    request: Request,
    *,
    error: str | None = None,
    status_code: int = 200,
):
    salas = _salas_dashboard(request)

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
        sala, host_token = servicio_salas.crear_sala(nombre_sala, escenario_id)
    except ValueError as exc:
        return _render_dashboard(request, error=str(exc), status_code=400)

    response = RedirectResponse(url=f"/personaje?sala={sala['id']}", status_code=303)
    _aplicar_cookie_host(response, str(sala["id"]), host_token)
    return response


@app.post("/salas/{sala_id}/reclamar-host", response_class=HTMLResponse, summary="Reclamar host")
async def reclamar_host(
    request: Request,
    sala_id: str,
):
    try:
        sala, host_token = servicio_salas.reclamar_host(sala_id)
    except ValueError as exc:
        return _render_dashboard(request, error=str(exc), status_code=400)

    response = RedirectResponse(url=f"/host/{sala['id']}", status_code=303)
    _aplicar_cookie_host(response, str(sala["id"]), host_token)
    return response


@app.post("/salas/{sala_id}/eliminar", response_class=HTMLResponse, summary="Eliminar sala")
async def eliminar_sala(request: Request, sala_id: str):
    sala_actual = servicio_salas.obtener_sala(sala_id)
    if not sala_actual:
        return _render_dashboard(request, error="No encontramos la sala que intentas eliminar.", status_code=404)

    if not _es_host_request(request, sala_id):
        return _render_dashboard(request, error="Solo el host de esta sala puede eliminarla.", status_code=403)

    await gestor_conexiones.cerrar_sala(
        sala_id,
        mensaje=f"La sala '{sala_actual.get('nombre') or sala_id}' fue eliminada por el host.",
    )
    gestor_combate.eliminar_sala(sala_id)
    servicio_salas.eliminar_sala(sala_id)
    sesiones_jugador.eliminar_sala(sala_id)
    _LOCKS_RESOLUCION_IA.pop(sala_id, None)
    _cancelar_tarea_limpieza_tirada(sala_id)

    response = RedirectResponse(url="/", status_code=303)
    _limpiar_cookie_host(response, sala_id)
    return response


@app.get("/personaje", response_class=HTMLResponse, summary="Crear personaje")
async def crear_personaje_view(
    request: Request,
    sala: str | None = Query(default=None),
):
    sala_actual = servicio_salas.obtener_sala(sala or "")
    sala_id = str(sala_actual.get("id") if sala_actual else (sala or "")).strip()
    es_host = bool(sala_actual) and _es_host_request(request, sala_id)

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
            "es_host": es_host,
            "host_url": f"/host/{sala_id}" if sala_actual and es_host else None,
        },
    )


@app.get("/salud", response_class=JSONResponse, summary="Estado del servidor")
async def salud():
    return {
        "ok": True,
        "servidor": "Raphael",
        "mensaje": "Servidor funcionando correctamente",
    }


@app.get("/host/{sala_id}", response_class=HTMLResponse, summary="Panel de host")
async def host_dashboard(
    request: Request,
    sala_id: str,
):
    sala_actual = servicio_salas.obtener_sala(sala_id)
    sala_encontrada = bool(sala_actual)
    es_host = sala_encontrada and _es_host_request(request, sala_id)
    jugadores_activos = gestor_conexiones.obtener_jugadores_sala(sala_id) if sala_encontrada else []
    status_code = 200 if es_host else (404 if not sala_encontrada else 403)

    return templates.TemplateResponse(
        request,
        "host.html",
        {
            "sala_id": sala_id,
            "sala_encontrada": sala_encontrada,
            "sala_nombre": sala_actual.get("nombre") if sala_actual else sala_id,
            "escenario_nombre": sala_actual.get("escenario_nombre") if sala_actual else None,
            "escenario_descripcion": sala_actual.get("escenario_descripcion") if sala_actual else None,
            "creada_en": sala_actual.get("creada_en") if sala_actual else None,
            "host_configurado": bool(sala_actual.get("host_configurado")) if sala_actual else False,
            "es_host": es_host,
            "jugadores_activos": jugadores_activos,
            "total_jugadores_activos": len(jugadores_activos),
        },
        status_code=status_code,
    )


@app.get("/sala/{sala_id}", response_class=HTMLResponse, summary="Sala de chat")
async def ver_sala(
    request: Request,
    sala_id: str,
    nombre: str = Query(..., min_length=2, max_length=24),
):
    sala_actual = servicio_salas.obtener_sala(sala_id)
    es_host = bool(sala_actual) and _es_host_request(request, sala_id)

    return templates.TemplateResponse(
        request,
        "chat.html",
        {
            "sala_id": sala_id,
            "nombre": nombre,
            "sala_nombre": sala_actual.get("nombre") if sala_actual else sala_id,
            "escenario_nombre": sala_actual.get("escenario_nombre") if sala_actual else "Sala lista",
            "escenario_descripcion": sala_actual.get("escenario_descripcion") if sala_actual else "Haz clic en tu personaje o en otro jugador para abrir su resumen textual.",
            "es_host": es_host,
            "host_url": f"/host/{sala_id}" if sala_actual and es_host else None,
        },
    )


async def publicar_presencia(sala_id: str) -> None:
    await gestor_conexiones.enviar_presencia_a_sala(sala_id)


async def publicar_combate(sala_id: str) -> None:
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "combate_estado",
            "combate": gestor_combate.estado_publico(sala_id),
        },
    )


def _cancelar_tarea_limpieza_tirada(sala_id: str) -> None:
    tarea = _TAREAS_LIMPIEZA_TIRADA.pop(sala_id, None)
    if tarea and not tarea.done():
        tarea.cancel()
    _EVENTOS_CONTINUACION_TIRADA.pop(sala_id, None)


def _crear_evento_continuacion_tirada(sala_id: str, tirada_id: str) -> asyncio.Event:
    evento = asyncio.Event()
    _EVENTOS_CONTINUACION_TIRADA[sala_id] = (tirada_id, evento)
    return evento


def _marcar_tirada_lista_para_continuar(sala_id: str, *, tirada_id: str | None = None) -> bool:
    registro = _EVENTOS_CONTINUACION_TIRADA.get(sala_id)
    if not registro:
        return False

    tirada_registrada, evento = registro
    tirada_objetivo = str(tirada_id or "").strip()
    if tirada_objetivo and tirada_objetivo != tirada_registrada:
        return False

    evento.set()
    return True


def _serializar_tirada_publica(sala_id: str, tirada: object) -> dict[str, object]:
    datos = tirada.a_dict() if hasattr(tirada, "a_dict") else dict(tirada or {})
    actor = gestor_combate.buscar_actor(sala_id, actor_id=str(datos.get("actor_id") or ""))
    if actor and actor.jugador_nombre:
        datos["jugador_autorizado"] = actor.jugador_nombre
    return datos


def _atributo_tirada_seguro(valor: object) -> str:
    atributo = str(valor or "").strip().lower()
    return atributo if atributo in _ATRIBUTOS_TIRADA_VALIDOS else ""


def _dc_tirada_segura(valor: object, *, por_defecto: int = 10) -> int:
    try:
        dc = int(valor)
    except (TypeError, ValueError):
        dc = por_defecto
    return max(5, min(dc, 30))


def _contexto_interpretacion_accion(
    sala_id: str,
    *,
    nombre_jugador: str,
    accion_jugador: dict[str, object],
) -> dict[str, object]:
    sala_actual = servicio_salas.obtener_sala(sala_id) or {}
    return {
        "motor": "Raphael",
        "sala": {
            "id": sala_id,
            "nombre": sala_actual.get("nombre") or sala_id,
            "escenario_nombre": sala_actual.get("escenario_nombre") or "Sin escenario",
            "escenario_descripcion": sala_actual.get("escenario_descripcion") or "",
            "resumen_partida": servicio_salas.obtener_resumen_partida(sala_id),
        },
        "combate": gestor_combate.contexto_ia(sala_id),
        "historial_reciente": gestor_conexiones.obtener_historial_sala(sala_id, limite=8),
        "jugador": nombre_jugador,
        "accion_declarada": accion_jugador,
        "instruccion": (
            "Interpreta la accion declarada. Decide si requiere tirada y sugiere atributo, habilidad, DC y motivo. "
            "No confirmes exito ni consecuencia final."
        ),
    }


def _interpretacion_pide_tirada(interpretacion: dict[str, object] | None) -> bool:
    if not isinstance(interpretacion, dict):
        return False
    if bool(interpretacion.get("requiere_aclaracion")):
        return False
    return bool(interpretacion.get("requiere_tirada"))


def _crear_tirada_desde_interpretacion(
    sala_id: str,
    *,
    nombre_jugador: str,
    accion_jugador: dict[str, object],
    interpretacion: dict[str, object],
):
    escena = gestor_combate.obtener_escena(sala_id)
    if not escena or not escena.activa:
        raise ValueError("No hay una escena activa para solicitar una tirada.")
    if escena.tirada_pendiente:
        raise ValueError("Ya hay una tirada pendiente en esta sala.")

    actor_actual = gestor_combate.buscar_actor(sala_id, actor_id=escena.turno_actor_id or "")
    if not actor_actual:
        raise ValueError("No encontramos al actor actual para crear la tirada.")
    if actor_actual.control == "jugador":
        jugador_actor = str(actor_actual.jugador_nombre or "").strip().casefold()
        if jugador_actor != str(nombre_jugador or "").strip().casefold():
            raise ValueError("Solo el jugador con el turno actual puede solicitar esta tirada.")

    motivo = str(interpretacion.get("motivo") or "").strip() or (
        f"Resolver la accion declarada por {actor_actual.nombre}."
    )
    return servicio_tiradas.crear_tirada_pendiente(
        sala_id,
        actor_id=actor_actual.id,
        atributo=_atributo_tirada_seguro(interpretacion.get("atributo")),
        habilidad=str(interpretacion.get("habilidad") or "").strip(),
        dc=_dc_tirada_segura(interpretacion.get("dc_sugerida"), por_defecto=10),
        motivo=motivo,
        accion_original=accion_jugador,
        accion_interpretada=interpretacion,
        auto_resolver=actor_actual.control == "ia",
    )


def _accion_jugador_post_tirada(
    sala_id: str,
    datos_tirada: dict[str, object],
) -> dict[str, object] | None:
    escena = gestor_combate.obtener_escena(sala_id)
    if not escena:
        return None

    accion_pendiente = escena.accion_pendiente if isinstance(escena.accion_pendiente, dict) else {}
    accion_original = accion_pendiente.get("accion_original")
    accion_interpretada = accion_pendiente.get("accion_interpretada")

    if not isinstance(accion_original, dict) or not accion_original:
        return None

    accion = dict(accion_original)
    if isinstance(accion_interpretada, dict) and accion_interpretada:
        accion["accion_interpretada"] = dict(accion_interpretada)
    accion["tirada"] = dict(datos_tirada)
    accion["resolucion_tirada_lista"] = True
    return accion


async def _publicar_tirada_solicitada(sala_id: str, tirada: object) -> None:
    _cancelar_tarea_limpieza_tirada(sala_id)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "tirada_solicitada",
            "tirada": _serializar_tirada_publica(sala_id, tirada),
        },
    )


def _mensaje_sistema_tirada(datos_tirada: dict[str, object]) -> str:
    modificador = int(datos_tirada.get("modificador") or 0)
    signo = f"+{modificador}" if modificador >= 0 else str(modificador)
    detalle = "exito" if datos_tirada.get("exito") else "fallo"
    if datos_tirada.get("critico"):
        detalle = f"{detalle}, critico"
    elif datos_tirada.get("desastre"):
        detalle = f"{detalle}, desastre"
    return (
        f"Tirada de {datos_tirada.get('actor_nombre', 'actor')}: "
        f"{datos_tirada.get('resultado_dado', '--')} {signo} = {datos_tirada.get('total', '--')} "
        f"contra DC {datos_tirada.get('dc', '--')} ({detalle})."
    )


async def _limpiar_tirada_resuelta_despues(
    sala_id: str,
    datos_tirada: dict[str, object],
    *,
    demora_maxima: float = 8.0,
) -> None:
    tirada_id = str(datos_tirada.get("id") or "").strip()
    evento_continuacion = None
    try:
        evento_continuacion = _crear_evento_continuacion_tirada(sala_id, tirada_id)
        try:
            await asyncio.wait_for(evento_continuacion.wait(), timeout=demora_maxima)
        except asyncio.TimeoutError:
            pass

        if not servicio_tiradas.limpiar_tirada_pendiente(sala_id, tirada_id=tirada_id, limpiar_accion=False):
            return
        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "tirada_cancelada",
                "tirada_id": tirada_id,
            },
        )
        await publicar_combate(sala_id)
        accion_resuelta = _accion_jugador_post_tirada(sala_id, datos_tirada)
        if accion_resuelta:
            await _resolver_cadena_ia(sala_id, accion_jugador=accion_resuelta)
        else:
            escena = gestor_combate.obtener_escena(sala_id)
            if escena:
                escena.accion_pendiente = None
    except asyncio.CancelledError:
        return
    finally:
        registro = _EVENTOS_CONTINUACION_TIRADA.get(sala_id)
        if registro and registro[0] == tirada_id and registro[1] is evento_continuacion:
            _EVENTOS_CONTINUACION_TIRADA.pop(sala_id, None)
        tarea = _TAREAS_LIMPIEZA_TIRADA.get(sala_id)
        if tarea is asyncio.current_task():
            _TAREAS_LIMPIEZA_TIRADA.pop(sala_id, None)


def _programar_limpieza_tirada(sala_id: str, datos_tirada: dict[str, object]) -> None:
    _cancelar_tarea_limpieza_tirada(sala_id)
    _TAREAS_LIMPIEZA_TIRADA[sala_id] = asyncio.create_task(
        _limpiar_tirada_resuelta_despues(sala_id, dict(datos_tirada))
    )


async def _resolver_tirada_y_publicar(
    sala_id: str,
    *,
    tirada_id: str | None = None,
    autor: str | None = None,
) -> dict[str, object]:
    tirada = servicio_tiradas.resolver_tirada_pendiente(sala_id, tirada_id=tirada_id)
    datos_tirada = _serializar_tirada_publica(sala_id, tirada)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "tirada_resuelta",
            "tirada": datos_tirada,
            "autor": autor,
        },
    )
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": _mensaje_sistema_tirada(datos_tirada),
        },
    )
    await publicar_combate(sala_id)
    _programar_limpieza_tirada(sala_id, datos_tirada)
    return datos_tirada


def _resumen_host_sala(sala_id: str) -> dict[str, object]:
    return {
        "jugadores_conectados": gestor_conexiones.obtener_resumen_jugadores_sala(sala_id),
        "combate": gestor_combate.estado_publico(sala_id),
        "actores_persistentes": [
            personaje.a_dict()
            for personaje in servicio_personajes_npc.listar_actores_persistentes(sala_id)
        ],
    }


def _resumir_orden_actores(combate: dict[str, object]) -> str:
    actores = combate.get("actores") if isinstance(combate, dict) else []
    if not isinstance(actores, list) or not actores:
        return "sin actores"

    partes: list[str] = []
    for actor in actores:
        if not isinstance(actor, dict):
            continue
        partes.append(f"{actor.get('nombre', 'Actor')} ({actor.get('iniciativa', '--')})")
    return ", ".join(partes)


def _mensaje_resolucion_ia(actor: dict[str, object], *, turno_jugador: bool) -> str:
    nombre = str(actor.get("nombre") or "El actor")
    if turno_jugador:
        return f"[Narracion] Raphael resuelve la accion de {nombre} y deja la escena lista para el siguiente turno."
    return f"[Narracion] Raphael controla el turno de {nombre} y mueve la escena con rapidez."


async def _publicar_evento_ia(sala_id: str, mensaje: str) -> None:
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "ia",
            "autor": "Raphael",
            "mensaje": mensaje,
        },
    )


async def _publicar_ia_escribiendo(sala_id: str) -> None:
    await gestor_conexiones.enviar_json_a_sala(sala_id, {"tipo": "ia_escribiendo"})


async def _publicar_ia_escribiendo_fin(sala_id: str) -> None:
    await gestor_conexiones.enviar_json_a_sala(sala_id, {"tipo": "ia_escribiendo_fin"})


def _lock_resolucion_ia(sala_id: str) -> asyncio.Lock:
    return _LOCKS_RESOLUCION_IA.setdefault(sala_id, asyncio.Lock())


def _ultimo_evento_historial(sala_id: str, tipo: str) -> str:
    buscado = str(tipo or "").strip().lower()
    for evento in reversed(gestor_conexiones.obtener_historial_sala(sala_id, limite=20)):
        if str(evento.get("tipo") or "").strip().lower() != buscado:
            continue
        return str(evento.get("mensaje") or "").strip()
    return ""


def _contexto_turno_ia(
    sala_id: str,
    *,
    accion_jugador: dict[str, object] | None = None,
    evento_reactivo: dict[str, object] | None = None,
) -> dict[str, object]:
    sala_actual = servicio_salas.obtener_sala(sala_id) or {}
    combate = gestor_combate.contexto_ia(sala_id)
    actor_actual = combate.get("actor_actual") or {}

    ultima_narracion_ia = _ultimo_evento_historial(sala_id, "ia")

    escenario_descripcion = str(sala_actual.get("escenario_descripcion") or "")
    if ultima_narracion_ia:
        escenario_descripcion = "El escenario base ya fue presentado antes. Solo vuelve a mencionarlo si cambia algo importante."

    incluir_ultimo_chat = bool(accion_jugador) and actor_actual.get("control") == "jugador"
    tirada_resuelta = {}
    if isinstance(accion_jugador, dict) and isinstance(accion_jugador.get("tirada"), dict):
        tirada_resuelta = dict(accion_jugador.get("tirada") or {})

    # Instrucción específica según quién actúa
    es_turno_ia = actor_actual.get("control") == "ia"
    nombre_actor = actor_actual.get("nombre", "el actor")

    if es_turno_ia:
        instruccion = (
            f"Es el turno de {nombre_actor}, controlado por ti como DM. "
            f"DEBES hacer que {nombre_actor} realice una accion concreta y activa: atacar, hablar, moverse, usar un objeto, huir, o cualquier cosa apropiada para su personaje. "
            f"No lo narres solo observando o manteniendose quieto. "
            f"Si hay un evento_reactivo reciente, {nombre_actor} DEBE responder a el de forma creible. "
            f"Narra su accion en tercera persona y aplica las acciones de juego correspondientes."
        )
    else:
        instruccion = (
            f"Narra SOLO lo que {nombre_actor} hace o dice, usando la accion_disparadora como fuente exacta. "
            f"NO narres reacciones, respuestas ni decisiones de otros actores: eso ocurre en sus propios turnos. "
            f"Si la accion implica un efecto mecanico (dano, curacion, estado), aplicalo en el campo acciones. "
            f"Cierra el turno con fin_de_turno=true."
        )
        if tirada_resuelta:
            instruccion += (
                " Ya existe una tirada resuelta por el servidor. "
                "Debes usar ese resultado como verdad final del intento, sin pedir otra tirada ni ignorarla."
            )

    return {
        "motor": "Raphael",
        "sala": {
            "id": sala_id,
            "nombre": sala_actual.get("nombre") or sala_id,
            "escenario_nombre": sala_actual.get("escenario_nombre") or "Sin escenario",
            "escenario_descripcion": escenario_descripcion,
            "resumen_partida": servicio_salas.obtener_resumen_partida(sala_id),
        },
        "combate": combate,
        "narraciones_recientes": [
            e for e in gestor_conexiones.obtener_historial_sala(sala_id, limite=12)
            if str(e.get("tipo") or "") == "ia"
        ][-4:],
        "ultima_narracion_ia": ultima_narracion_ia,
        "ultimo_mensaje_chat": _ultimo_evento_historial(sala_id, "chat") if incluir_ultimo_chat else "",
        "accion_disparadora": accion_jugador or {},
        "tirada_resuelta": tirada_resuelta,
        "evento_reactivo": evento_reactivo or {},
        "instruccion": instruccion,
    }

def _sincronizar_actor_jugador(sala_id: str, actor: ActorCombate) -> bool:
    if not actor.jugador_nombre:
        return False

    return gestor_conexiones.actualizar_perfil_jugador(
        sala_id,
        actor.jugador_nombre,
        vida_actual=actor.vida_actual,
        vida_maxima=actor.vida_maxima,
        mana_actual=actor.mana_actual,
        mana_maximo=actor.mana_maximo,
        xp_actual=actor.xp_actual,
        xp_maximo=actor.xp_maximo,
        resumen=actor.resumen or None,
    )


def _sincronizar_actor_persistente(sala_id: str, actor: ActorCombate) -> bool:
    if actor.tipo != "npc" or not actor.persistente:
        return False

    servicio_personajes_npc.guardar_actor_persistente(sala_id, actor)
    return True


def _payload_persistente_desde_actor(
    sala_id: str,
    actor: ActorCombate,
    *,
    reclutado: bool | None = None,
    nombre: str | None = None,
) -> dict[str, object]:
    return {
        "id": actor.id,
        "plantilla_id": actor.plantilla_id,
        "nombre": (nombre or actor.nombre).strip(),
        "tipo": actor.tipo,
        "control": actor.control,
        "raza": actor.raza or "",
        "clase": actor.clase or "",
        "trasfondo": actor.trasfondo or "",
        "nivel": int(actor.nivel or 1),
        "vida_actual": int(actor.vida_actual or 0),
        "vida_maxima": int(actor.vida_maxima or 1),
        "mana_actual": int(actor.mana_actual or 0),
        "mana_maximo": int(actor.mana_maximo or 0),
        "xp_actual": int(actor.xp_actual or 0),
        "xp_maximo": int(actor.xp_maximo or 0),
        "estado": actor.estado,
        "estadisticas": dict(actor.estadisticas),
        "habilidades": list(actor.habilidades),
        "pasivas": list(actor.pasivas),
        "tiradas": list(actor.tiradas),
        "inventario": [dict(item) for item in actor.inventario],
        "resumen": actor.resumen,
        "reclutado": actor.reclutado if reclutado is None else bool(reclutado),
        "persistente": True,
        "jugador_nombre": actor.jugador_nombre,
        "sala_id": sala_id,
        "avatar_url": actor.avatar_url,
    }


def _aplicar_personaje_persistente_a_actor(actor: ActorCombate, personaje: object) -> None:
    actor.plantilla_id = getattr(personaje, "plantilla_id", actor.plantilla_id) or actor.plantilla_id
    actor.persistente = bool(getattr(personaje, "persistente", True))
    actor.reclutado = bool(getattr(personaje, "reclutado", False))
    actor.sala_id = str(getattr(personaje, "sala_id", actor.sala_id or "") or "").strip().upper() or actor.sala_id
    actor.resumen = str(getattr(personaje, "resumen", actor.resumen) or actor.resumen)


def _acotar_entero(valor: object, *, minimo: int, maximo: int) -> int | None:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return None
    return max(minimo, min(numero, maximo))


def _aplicar_acciones_ia(sala_id: str, acciones: list[object]) -> dict[str, object]:
    cambios_jugadores = False
    aplicadas: list[str] = []
    ignoradas: list[str] = []

    for accion in acciones[:12]:
        if not isinstance(accion, dict):
            ignoradas.append("Se ignoro una accion sin formato valido.")
            continue

        tipo = str(accion.get("tipo") or "").strip().lower()
        actor_id_raw = str(accion.get("actor_id") or "").strip()
        actor_id = re.sub(r"[^\w]", "", actor_id_raw, flags=re.ASCII) or None
        referencia = str(accion.get("objetivo") or "").strip() or None

        if tipo == "agregar_actor":
            nombre = str(accion.get("nombre") or "").strip()
            plantilla_id = str(accion.get("plantilla_id") or "").strip() or None
            npc_unico_id = str(accion.get("npc_unico_id") or "").strip() or None
            personaje_id = str(accion.get("personaje_id") or "").strip() or None
            iniciativa = _acotar_entero(accion.get("iniciativa"), minimo=-10, maximo=40)
            vida_maxima = _acotar_entero(accion.get("vida_maxima"), minimo=1, maximo=999)
            vida_actual = _acotar_entero(accion.get("vida_actual"), minimo=0, maximo=999)
            control = str(accion.get("control") or "ia").strip().lower() or "ia"
            actor_base = None

            if personaje_id:
                actor_base = servicio_personajes_npc.cargar_actor_persistente(sala_id, personaje_id)
                if not actor_base:
                    ignoradas.append(f"No encontramos el actor persistente '{personaje_id}'.")
                    continue
            elif npc_unico_id:
                actor_base = servicio_personajes_npc.obtener_npc_unico(npc_unico_id)
                if not actor_base:
                    ignoradas.append(f"No encontramos el NPC unico '{npc_unico_id}'.")
                    continue

            if not (plantilla_id or npc_unico_id or personaje_id) and (not nombre or iniciativa is None or vida_maxima is None):
                ignoradas.append("Se ignoro un refuerzo sin nombre, iniciativa o vida validos.")
                continue
            try:
                gestor_combate.agregar_npc(
                    sala_id,
                    nombre=nombre or None,
                    iniciativa=iniciativa,
                    vida_maxima=vida_maxima,
                    vida_actual=vida_actual,
                    control=control,
                    ajustar_turno=False,
                    plantilla_id=plantilla_id,
                    actor_base=actor_base,
                )
                nombre_actor = nombre or getattr(actor_base, "nombre", "") or plantilla_id or npc_unico_id or personaje_id or "un actor"
                aplicadas.append(f"Entra {nombre_actor}.")
            except ValueError as exc:
                ignoradas.append(str(exc))
            continue

        if tipo == "xp" and str(referencia or "").strip().casefold() == "grupo":
            cantidad = _acotar_entero(accion.get("cantidad"), minimo=0, maximo=1000)
            if cantidad is None:
                ignoradas.append("Se ignoro una accion de XP sin cantidad valida.")
                continue

            for actor_publico in gestor_combate.contexto_ia(sala_id).get("actores", []):
                if not isinstance(actor_publico, dict) or actor_publico.get("tipo") != "jugador":
                    continue
                actor = gestor_combate.buscar_actor(sala_id, actor_id=str(actor_publico.get("id") or ""))
                if not actor:
                    continue
                nuevo_xp = int(actor.xp_actual or 0) + cantidad
            _, actor = gestor_combate.editar_actor(
                sala_id,
                actor.id,
                xp_actual=nuevo_xp,
                ajustar_turno=False,
            )
            cambios_jugadores = _sincronizar_actor_jugador(sala_id, actor) or cambios_jugadores
            _sincronizar_actor_persistente(sala_id, actor)

            aplicadas.append(f"El grupo recibe {cantidad} XP.")
            continue

        actor = gestor_combate.buscar_actor(sala_id, actor_id=actor_id, referencia=referencia)
        if not actor:
            ignoradas.append(f"No se encontro el objetivo '{referencia or actor_id or 'desconocido'}'.")
            continue

        if tipo == "danio":
            cantidad = _acotar_entero(accion.get("cantidad"), minimo=0, maximo=999)
            if cantidad is None:
                ignoradas.append(f"Se ignoro un dano sin cantidad valida sobre {actor.nombre}.")
                continue
            nueva_vida = max(0, int(actor.vida_actual or 0) - cantidad)
            _, actor = gestor_combate.editar_actor(
                sala_id,
                actor.id,
                vida_actual=nueva_vida,
                ajustar_turno=False,
            )
            cambios_jugadores = _sincronizar_actor_jugador(sala_id, actor) or cambios_jugadores
            _sincronizar_actor_persistente(sala_id, actor)
            aplicadas.append(f"{actor.nombre} recibe {cantidad} de dano.")
            continue

        if tipo == "curacion":
            if actor.estado == "muerto":
                ignoradas.append(f"No se puede curar a {actor.nombre} porque esta muerto.")
                continue
            cantidad = _acotar_entero(accion.get("cantidad"), minimo=0, maximo=999)
            if cantidad is None:
                ignoradas.append(f"Se ignoro una curacion sin cantidad valida sobre {actor.nombre}.")
                continue
            maximo = int(actor.vida_maxima or max(1, cantidad))
            nueva_vida = min(maximo, int(actor.vida_actual or 0) + cantidad)
            _, actor = gestor_combate.editar_actor(
                sala_id,
                actor.id,
                vida_actual=nueva_vida,
                ajustar_turno=False,
            )
            cambios_jugadores = _sincronizar_actor_jugador(sala_id, actor) or cambios_jugadores
            _sincronizar_actor_persistente(sala_id, actor)
            aplicadas.append(f"{actor.nombre} recupera {cantidad} PG.")
            continue

        if tipo == "estado":
            estado = str(accion.get("estado") or "").strip().lower()
            if not estado:
                ignoradas.append(f"Se ignoro un cambio de estado vacio sobre {actor.nombre}.")
                continue
            try:
                _, actor = gestor_combate.editar_actor(
                    sala_id,
                    actor.id,
                    estado=estado,
                    ajustar_turno=False,
                )
                cambios_jugadores = _sincronizar_actor_jugador(sala_id, actor) or cambios_jugadores
                _sincronizar_actor_persistente(sala_id, actor)
                aplicadas.append(f"{actor.nombre} queda en estado {estado}.")
            except ValueError as exc:
                ignoradas.append(str(exc))
            continue

        if tipo == "xp":
            cantidad = _acotar_entero(accion.get("cantidad"), minimo=0, maximo=1000)
            if cantidad is None:
                ignoradas.append(f"Se ignoro una accion de XP sin cantidad valida sobre {actor.nombre}.")
                continue
            _, actor = gestor_combate.editar_actor(
                sala_id,
                actor.id,
                xp_actual=int(actor.xp_actual or 0) + cantidad,
                ajustar_turno=False,
            )
            cambios_jugadores = _sincronizar_actor_jugador(sala_id, actor) or cambios_jugadores
            _sincronizar_actor_persistente(sala_id, actor)
            aplicadas.append(f"{actor.nombre} recibe {cantidad} XP.")
            continue

        ignoradas.append(f"El tipo de accion '{tipo}' todavia no esta soportado.")

    return {
        "cambios_jugadores": cambios_jugadores,
        "aplicadas": aplicadas,
        "ignoradas": ignoradas,
    }


async def _publicar_resultado_avance(sala_id: str, resultado: dict[str, object]) -> None:
    saltados = resultado.get("saltados") or []
    if saltados:
        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"Se omiten los turnos de {', '.join(str(nombre) for nombre in saltados)} porque no pueden actuar.",
            },
        )

    if resultado.get("hubo_vuelta"):
        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"Comienza la ronda {resultado.get('ronda_actual', 1)}.",
            },
        )

    actor_actual = resultado.get("actor_actual")
    if isinstance(actor_actual, dict):
        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"Ahora actua {actor_actual.get('nombre', 'el siguiente actor')}.",
            },
        )

async def _resolver_cadena_ia(
    sala_id: str,
    *,
    accion_jugador: dict[str, object] | None = None,
    evento_reactivo: dict[str, object] | None = None,
) -> dict[str, object]:
    ultima_respuesta: dict[str, object] = {
        "ok": True,
        "combate": gestor_combate.estado_publico(sala_id),
    }

    async with _lock_resolucion_ia(sala_id):
        accion_actual = accion_jugador
        reaccion_pendiente = evento_reactivo

        for _ in range(6):
            combate_antes = gestor_combate.estado_publico(sala_id)
            if not combate_antes.get("activa"):
                ultima_respuesta["combate"] = combate_antes
                break

            if combate_antes.get("tirada_pendiente"):
                ultima_respuesta["combate"] = combate_antes
                break

            actor_actual = combate_antes.get("actor_actual")
            if not isinstance(actor_actual, dict):
                ultima_respuesta["combate"] = combate_antes
                break

            if actor_actual.get("control") == "jugador" and not combate_antes.get("espera_resolucion"):
                ultima_respuesta["combate"] = combate_antes
                break

            turno_jugador = actor_actual.get("control") == "jugador"
            aviso = None
            await _publicar_ia_escribiendo(sala_id)

            try:
                respuesta_ia = await servicio_lmstudio.resolver_turno(
                    _contexto_turno_ia(
                        sala_id,
                        accion_jugador=accion_actual,
                        evento_reactivo=reaccion_pendiente,
                    )
                )

                ok_respuesta, motivo_error = servicio_lmstudio.respuesta_turno_es_valida(respuesta_ia)
                if not ok_respuesta:
                    respuesta_ia = {
                        "narracion": _mensaje_resolucion_ia(actor_actual, turno_jugador=turno_jugador),
                        "resumen_delta": "",
                        "acciones": [],
                        "fin_de_turno": True,
                    }
                    aviso = f"Respuesta invalida del modelo: {motivo_error}. Raphael uso resolucion segura."

            except Exception:
                aviso = "LM Studio no respondio a tiempo, asi que Raphael uso una resolucion local basica."
                respuesta_ia = {
                    "narracion": _mensaje_resolucion_ia(actor_actual, turno_jugador=turno_jugador),
                    "resumen_delta": "",
                    "acciones": [],
                    "fin_de_turno": True,
                }

            narracion = str(respuesta_ia.get("narracion") or "").strip()
            if aviso:
                narracion = f"{narracion}\n\n{aviso}" if narracion else aviso
            await _publicar_ia_escribiendo_fin(sala_id)
            if narracion:
                await _publicar_evento_ia(sala_id, narracion)

            aplicacion = _aplicar_acciones_ia(sala_id, list(respuesta_ia.get("acciones") or []))
            resumen_delta = str(respuesta_ia.get("resumen_delta") or "").strip()
            if resumen_delta:
                servicio_salas.actualizar_resumen_partida(sala_id, resumen_delta, append=True)

            if aplicacion.get("cambios_jugadores"):
                await publicar_presencia(sala_id)

            resultado = gestor_combate.avanzar_turno(sala_id)
            await _publicar_resultado_avance(sala_id, resultado)
            await publicar_combate(sala_id)

            ultima_respuesta = {
                "ok": True,
                "combate": resultado.get("estado") or gestor_combate.estado_publico(sala_id),
                "respuesta_ia": respuesta_ia,
                "acciones_aplicadas": aplicacion.get("aplicadas") or [],
                "acciones_ignoradas": aplicacion.get("ignoradas") or [],
            }

            # La accion del jugador solo vive en su turno.
            accion_actual = None

            # Pero su resultado inmediato puede alimentar la reaccion del siguiente actor una sola vez.
            if narracion and isinstance(actor_actual, dict):
                reaccion_pendiente = {
                    "actor_origen": actor_actual.get("nombre"),
                    "detalle": narracion,
                }

            siguiente = resultado.get("actor_actual")
            if not isinstance(siguiente, dict) or siguiente.get("control") != "ia":
                break

    return ultima_respuesta

@app.get("/api/host/sala/{sala_id}/combate", response_class=JSONResponse, summary="Estado de combate para host")
async def api_host_estado_combate(request: Request, sala_id: str):
    sala_actual = _asegurar_host_request(request, sala_id)
    datos = _resumen_host_sala(sala_id)
    return {
        "ok": True,
        "sala": {
            "id": sala_id,
            "nombre": sala_actual.get("nombre"),
            "escenario_nombre": sala_actual.get("escenario_nombre"),
            "escenario_descripcion": sala_actual.get("escenario_descripcion"),
            "creada_en": sala_actual.get("creada_en"),
        },
        **datos,
    }


@app.get("/api/host/sala/{sala_id}/actores-persistentes", response_class=JSONResponse, summary="Listar actores persistentes")
async def api_host_listar_actores_persistentes(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    return {
        "ok": True,
        "actores_persistentes": [
            personaje.a_dict()
            for personaje in servicio_personajes_npc.listar_actores_persistentes(sala_id)
        ],
    }


@app.get("/api/host/sala/{sala_id}/ia/estado", response_class=JSONResponse, summary="Estado de LM Studio")
async def api_host_estado_ia(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    return {
        "ok": True,
        "ia": await servicio_lmstudio.estado_servidor(),
    }


@app.post("/api/host/sala/{sala_id}/ia/probar", response_class=JSONResponse, summary="Probar LM Studio")
async def api_host_probar_ia(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    try:
        resultado = await servicio_lmstudio.probar_conexion()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "ok": True,
        "resultado": resultado,
    }


@app.post("/api/host/sala/{sala_id}/combate/iniciar", response_class=JSONResponse, summary="Iniciar encuentro")
async def api_host_iniciar_combate(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    jugadores = gestor_conexiones.obtener_resumen_jugadores_sala(sala_id)

    try:
        combate = gestor_combate.iniciar_con_jugadores(sala_id, jugadores)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"El host inicio un encuentro. Orden de iniciativa: {_resumir_orden_actores(combate)}.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/detener", response_class=JSONResponse, summary="Detener encuentro")
async def api_host_detener_combate(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    combate = gestor_combate.detener(sala_id)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": "El host cerro la escena de turnos. La sala vuelve a modo libre.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/agregar-npc", response_class=JSONResponse, summary="Agregar NPC")
async def api_host_agregar_npc(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    payload = await request.json()
    nombre = str(payload.get("nombre") or "").strip() or None
    plantilla_id = str(payload.get("plantilla_id") or "").strip() or None
    npc_unico_id = str(payload.get("npc_unico_id") or "").strip() or None
    personaje_id = str(payload.get("personaje_id") or "").strip() or None
    plantilla = payload.get("plantilla") if isinstance(payload.get("plantilla"), dict) else None
    actor_base = None

    if personaje_id:
        actor_base = servicio_personajes_npc.cargar_actor_persistente(sala_id, personaje_id)
        if not actor_base:
            raise HTTPException(status_code=404, detail="No encontramos el actor persistente solicitado.")
    elif npc_unico_id:
        actor_base = servicio_personajes_npc.obtener_npc_unico(npc_unico_id)
        if not actor_base:
            raise HTTPException(status_code=404, detail="No encontramos el NPC unico solicitado.")

    try:
        combate = gestor_combate.agregar_npc(
            sala_id,
            nombre=nombre,
            iniciativa=int(payload["iniciativa"]) if payload.get("iniciativa") not in (None, "") else None,
            vida_maxima=int(payload["vida_maxima"]) if payload.get("vida_maxima") not in (None, "") else None,
            vida_actual=int(payload["vida_actual"]) if payload.get("vida_actual") not in (None, "") else None,
            control=str(payload.get("control") or getattr(actor_base, "control", "ia")),
            plantilla_id=plantilla_id,
            plantilla=plantilla,
            actor_base=actor_base,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    nombre_evento = nombre or getattr(actor_base, "nombre", "")
    if not nombre_evento and plantilla_id:
        plantilla_ref = servicio_personajes_npc.obtener_plantilla_npc(plantilla_id)
        nombre_evento = plantilla_ref.nombre if plantilla_ref else plantilla_id
    if not nombre_evento and npc_unico_id:
        nombre_evento = npc_unico_id
    if not nombre_evento and personaje_id:
        nombre_evento = personaje_id
    if not nombre_evento:
        nombre_evento = "Un NPC"

    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{nombre_evento} entra en la escena.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/avanzar", response_class=JSONResponse, summary="Avanzar turno")
async def api_host_avanzar_combate(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    combate_antes = gestor_combate.estado_publico(sala_id)
    actor_actual = combate_antes.get("actor_actual")

    if combate_antes.get("tirada_pendiente"):
        raise HTTPException(status_code=400, detail="Hay una tirada pendiente por resolver antes de avanzar.")

    if isinstance(actor_actual, dict) and (
        bool(combate_antes.get("espera_resolucion")) or actor_actual.get("control") == "ia"
    ):
        return await _resolver_cadena_ia(sala_id)

    try:
        resultado = gestor_combate.avanzar_turno(sala_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": "El host fuerza el paso al siguiente turno.",
        },
    )
    await _publicar_resultado_avance(sala_id, resultado)
    await publicar_combate(sala_id)

    siguiente = resultado.get("actor_actual")
    if isinstance(siguiente, dict) and siguiente.get("control") == "ia":
        return await _resolver_cadena_ia(sala_id)

    return {"ok": True, **resultado}


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/editar", response_class=JSONResponse, summary="Editar actor")
async def api_host_editar_actor(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)
    payload = await request.json()

    try:
        combate, actor = gestor_combate.editar_actor(
            sala_id,
            actor_id,
            iniciativa=int(payload["iniciativa"]) if payload.get("iniciativa") not in (None, "") else None,
            vida_actual=int(payload["vida_actual"]) if payload.get("vida_actual") not in (None, "") else None,
            vida_maxima=int(payload["vida_maxima"]) if payload.get("vida_maxima") not in (None, "") else None,
            estado=str(payload["estado"]) if payload.get("estado") not in (None, "") else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if actor.jugador_nombre:
        gestor_conexiones.actualizar_vida_jugador(
            sala_id,
            actor.jugador_nombre,
            vida_actual=actor.vida_actual,
            vida_maxima=actor.vida_maxima,
        )
        await publicar_presencia(sala_id)

    _sincronizar_actor_persistente(sala_id, actor)
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/persistir", response_class=JSONResponse, summary="Persistir actor")
async def api_host_persistir_actor(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)
    payload = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}

    actor = gestor_combate.buscar_actor(sala_id, actor_id=actor_id, referencia=actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="No encontramos el actor solicitado.")
    if actor.tipo == "jugador":
        raise HTTPException(status_code=400, detail="Los jugadores ya tienen su propia persistencia.")

    reclutado = bool(payload.get("reclutado", actor.reclutado))
    nombre = str(payload.get("nombre") or actor.nombre).strip()

    try:
        personaje = servicio_personajes_npc.guardar_actor_persistente(
            sala_id,
            _payload_persistente_desde_actor(
                sala_id,
                actor,
                reclutado=reclutado,
                nombre=nombre,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    actor.nombre = personaje.nombre
    _aplicar_personaje_persistente_a_actor(actor, personaje)

    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": (
                f"{personaje.nombre} queda guardado como personaje persistente."
                if not personaje.reclutado
                else f"{personaje.nombre} queda guardado como personaje persistente reclutado."
            ),
        },
    )
    await publicar_combate(sala_id)
    return {
        "ok": True,
        "personaje": personaje.a_dict(),
        "combate": gestor_combate.estado_publico(sala_id),
    }


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/caida", response_class=JSONResponse, summary="Marcar caida")
async def api_host_marcar_caida(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)

    try:
        combate, actor = gestor_combate.marcar_caida(sala_id, actor_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if actor.jugador_nombre:
        gestor_conexiones.actualizar_vida_jugador(
            sala_id,
            actor.jugador_nombre,
            vida_actual=actor.vida_actual,
            vida_maxima=actor.vida_maxima,
        )
        await publicar_presencia(sala_id)

    _sincronizar_actor_persistente(sala_id, actor)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{actor.nombre} cae a 0 PG y queda pendiente de una tirada de salvacion.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/salvacion", response_class=JSONResponse, summary="Resolver salvacion")
async def api_host_resolver_salvacion(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)

    try:
        combate, actor, tirada, exito = gestor_combate.resolver_salvacion(sala_id, actor_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if actor.jugador_nombre:
        gestor_conexiones.actualizar_vida_jugador(
            sala_id,
            actor.jugador_nombre,
            vida_actual=actor.vida_actual,
            vida_maxima=actor.vida_maxima,
        )
        await publicar_presencia(sala_id)

    _sincronizar_actor_persistente(sala_id, actor)
    mensaje = (
        f"{actor.nombre} supera la tirada de salvacion ({tirada}) y queda incapacitado."
        if exito
        else f"{actor.nombre} falla la tirada de salvacion ({tirada}) y muere."
    )
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": mensaje,
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate, "tirada": tirada, "exito": exito}


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/revivir", response_class=JSONResponse, summary="Revivir actor")
async def api_host_revivir_actor(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)
    payload = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}

    try:
        combate, actor = gestor_combate.revivir_actor(
            sala_id,
            actor_id,
            vida_actual=int(payload.get("vida_actual") or 1),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if actor.jugador_nombre:
        gestor_conexiones.actualizar_vida_jugador(
            sala_id,
            actor.jugador_nombre,
            vida_actual=actor.vida_actual,
            vida_maxima=actor.vida_maxima,
        )
        await publicar_presencia(sala_id)

    _sincronizar_actor_persistente(sala_id, actor)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{actor.nombre} vuelve a estar en condiciones de actuar.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/combate/actor/{actor_id}/quitar", response_class=JSONResponse, summary="Quitar actor")
async def api_host_quitar_actor(request: Request, sala_id: str, actor_id: str):
    _asegurar_host_request(request, sala_id)
    combate_antes = gestor_combate.estado_publico(sala_id)
    actor = next((item for item in combate_antes.get("actores", []) if item.get("id") == actor_id), None)
    if not actor:
        raise HTTPException(status_code=404, detail="No encontramos el actor solicitado.")

    combate = gestor_combate.quitar_actor(sala_id, actor_id)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{actor.get('nombre', 'El actor')} sale de la escena de turnos.",
        },
    )
    await publicar_combate(sala_id)
    return {"ok": True, "combate": combate}


@app.post("/api/host/sala/{sala_id}/limpiar-historial", response_class=JSONResponse, summary="Limpiar historial de sala")
async def api_host_limpiar_historial(request: Request, sala_id: str):
    _asegurar_host_request(request, sala_id)
    gestor_conexiones.limpiar_historial(sala_id)
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": "El host limpio el historial de la sala. La IA empieza desde cero.",
        },
    )
    return {"ok": True}


@app.post("/api/host/sala/{sala_id}/jugador/{nombre}/expulsar", response_class=JSONResponse, summary="Expulsar jugador")
async def api_host_expulsar_jugador(request: Request, sala_id: str, nombre: str):
    _asegurar_host_request(request, sala_id)
    expulsado = await gestor_conexiones.expulsar_jugador(sala_id, nombre)
    if not expulsado:
        raise HTTPException(status_code=404, detail="No encontramos ese jugador conectado en la sala.")
    await gestor_conexiones.enviar_json_a_sala(
        sala_id,
        {
            "tipo": "sistema",
            "mensaje": f"{nombre} fue expulsado de la sala.",
        },
    )
    await publicar_presencia(sala_id)
    return {"ok": True}


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
    await publicar_combate(sala_id)

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

            if tipo == "saltar_turno":
                combate = gestor_combate.estado_publico(sala_id)
                if not combate.get("activa"):
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": "No hay una escena de turnos activa en este momento.",
                        },
                    )
                    continue

                try:
                    gestor_combate.registrar_accion_jugador(sala_id, nombre)
                except ValueError as exc:
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": str(exc),
                        },
                    )
                    continue

                await gestor_conexiones.enviar_json_a_sala(
                    sala_id,
                    {
                        "tipo": "sistema",
                        "mensaje": f"{nombre} cede su turno.",
                    },
                )
                await publicar_combate(sala_id)
                await _resolver_cadena_ia(
                    sala_id,
                    accion_jugador={
                        "tipo": "salto",
                        "autor": nombre,
                        "detalle": f"{nombre} cede su turno.",
                    },
                )
                continue

            if tipo == "tirar_dado":
                combate = gestor_combate.estado_publico(sala_id)
                tirada = combate.get("tirada_pendiente")
                if not isinstance(tirada, dict):
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": "No hay una tirada pendiente para resolver.",
                        },
                    )
                    continue

                actor_tirada = gestor_combate.buscar_actor(
                    sala_id,
                    actor_id=str(tirada.get("actor_id") or ""),
                )
                if not actor_tirada:
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": "El actor de la tirada ya no existe en la escena.",
                        },
                    )
                    continue

                if str(tirada.get("control") or "").strip().lower() != "jugador":
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": "Esa tirada se resuelve de forma automatica en el servidor.",
                        },
                    )
                    continue

                if str(actor_tirada.jugador_nombre or "").strip().casefold() != nombre.strip().casefold():
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": "Solo el jugador autorizado puede lanzar ese dado.",
                        },
                    )
                    continue

                try:
                    await _resolver_tirada_y_publicar(
                        sala_id,
                        tirada_id=str(tirada.get("id") or "").strip() or None,
                        autor=nombre,
                    )
                except ValueError as exc:
                    await gestor_conexiones.enviar_json_personal(
                        websocket,
                        {
                            "tipo": "error",
                            "mensaje": str(exc),
                        },
                    )
                continue

            if tipo == "continuar_tirada":
                _marcar_tirada_lista_para_continuar(
                    sala_id,
                    tirada_id=str(datos.get("tirada_id") or "").strip() or None,
                )
                continue

            mensaje = str(datos.get("mensaje", "")).strip()

            if not mensaje:
                continue

            try:
                combate = gestor_combate.estado_publico(sala_id)
                if combate.get("activa"):
                    gestor_combate.registrar_accion_jugador(sala_id, nombre)
            except ValueError as exc:
                await gestor_conexiones.enviar_json_personal(
                    websocket,
                    {
                        "tipo": "error",
                        "mensaje": str(exc),
                    },
                )
                continue

            await gestor_conexiones.enviar_json_a_sala(
                sala_id,
                gestor_conexiones.construir_evento_chat(sala_id, nombre, mensaje),
            )
            await publicar_combate(sala_id)
            if combate.get("activa"):
                accion_jugador = {
                    "tipo": "mensaje",
                    "autor": nombre,
                    "detalle": mensaje,
                }
                interpretacion: dict[str, object] | None = None
                try:
                    interpretacion = await servicio_lmstudio.interpretar_accion(
                        _contexto_interpretacion_accion(
                            sala_id,
                            nombre_jugador=nombre,
                            accion_jugador=accion_jugador,
                        )
                    )
                except Exception:
                    interpretacion = None

                if _interpretacion_pide_tirada(interpretacion):
                    try:
                        tirada = _crear_tirada_desde_interpretacion(
                            sala_id,
                            nombre_jugador=nombre,
                            accion_jugador=accion_jugador,
                            interpretacion=interpretacion or {},
                        )
                    except ValueError as exc:
                        await gestor_conexiones.enviar_json_personal(
                            websocket,
                            {
                                "tipo": "error",
                                "mensaje": str(exc),
                            },
                        )
                    else:
                        await _publicar_tirada_solicitada(sala_id, tirada)
                        await publicar_combate(sala_id)
                        if tirada.auto_resolver:
                            await _resolver_tirada_y_publicar(sala_id, tirada_id=tirada.id, autor="Raphael")
                        continue

                await _resolver_cadena_ia(
                    sala_id,
                    accion_jugador=accion_jugador,
                )

    except WebSocketDisconnect:
        gestor_conexiones.desconectar(sala_id, nombre)
        if not gestor_conexiones.obtener_jugadores_sala(sala_id):
            return

        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"{nombre} salio de la sala.",
            },
        )
        await publicar_presencia(sala_id)
        await publicar_combate(sala_id)

    except Exception:
        gestor_conexiones.desconectar(sala_id, nombre)
        if not gestor_conexiones.obtener_jugadores_sala(sala_id):
            return

        await gestor_conexiones.enviar_json_a_sala(
            sala_id,
            {
                "tipo": "sistema",
                "mensaje": f"{nombre} se desconecto por un error.",
            },
        )
        await publicar_presencia(sala_id)
        await publicar_combate(sala_id)
