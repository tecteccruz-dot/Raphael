from __future__ import annotations

import random
import re
import secrets
import unicodedata

from app.modelos.tiradas import TiradaPendiente
from app.servicios.combate import ActorCombate, gestor_combate


ATRIBUTOS_VALIDOS = {"fue", "des", "con", "int", "sab", "car"}


def _modificador_atributo(valor: int | None) -> int:
    return ((valor or 10) - 10) // 2


def _normalizar_texto(valor: object) -> str:
    texto = str(valor or "").strip().casefold()
    texto = unicodedata.normalize("NFD", texto)
    return "".join(caracter for caracter in texto if unicodedata.category(caracter) != "Mn")


def _extraer_modificador_desde_tirada(linea: object) -> tuple[str, int] | None:
    texto = str(linea or "").strip()
    coincidencia = re.match(r"^(.*?)\s*([+-]\d+)\s*$", texto)
    if not coincidencia:
        return None
    nombre = _normalizar_texto(coincidencia.group(1))
    return nombre, int(coincidencia.group(2))


def _obtener_actor_valido(sala_id: str, actor_id: str) -> ActorCombate:
    actor = gestor_combate.buscar_actor(sala_id, actor_id=actor_id, referencia=actor_id)
    if not actor:
        raise ValueError("No encontramos el actor indicado para la tirada.")
    return actor


def calcular_modificador_actor(
    sala_id: str,
    actor_id: str,
    *,
    atributo: str | None = None,
    habilidad: str | None = None,
) -> int:
    actor = _obtener_actor_valido(sala_id, actor_id)
    habilidad_normalizada = _normalizar_texto(habilidad)

    if habilidad_normalizada:
        for tirada in actor.tiradas:
            extraida = _extraer_modificador_desde_tirada(tirada)
            if not extraida:
                continue
            nombre, valor = extraida
            if nombre == habilidad_normalizada:
                return valor

    atributo_limpio = str(atributo or "").strip().lower()
    if atributo_limpio in ATRIBUTOS_VALIDOS:
        return _modificador_atributo(actor.estadisticas.get(atributo_limpio))

    return 0


def crear_tirada_pendiente(
    sala_id: str,
    *,
    actor_id: str,
    atributo: str,
    habilidad: str,
    dc: int,
    motivo: str,
    accion_original: dict[str, object] | None = None,
    accion_interpretada: dict[str, object] | None = None,
    modificador: int | None = None,
    auto_resolver: bool | None = None,
) -> TiradaPendiente:
    escena = gestor_combate.obtener_escena(sala_id)
    if not escena or not escena.activa:
        raise ValueError("No hay una escena de combate activa para crear la tirada.")

    actor = _obtener_actor_valido(sala_id, actor_id)
    modificador_final = (
        int(modificador)
        if modificador is not None
        else calcular_modificador_actor(
            sala_id,
            actor.id,
            atributo=atributo,
            habilidad=habilidad,
        )
    )
    control = str(actor.control or "jugador").strip().lower() or "jugador"
    tirada = TiradaPendiente(
        id=f"tirada_{secrets.token_hex(5)}",
        actor_id=actor.id,
        actor_nombre=actor.nombre,
        control=control,
        atributo=str(atributo or "").strip().lower(),
        habilidad=str(habilidad or "").strip(),
        dc=max(1, int(dc or 10)),
        modificador=modificador_final,
        motivo=str(motivo or "").strip() or "Accion bajo incertidumbre",
        accion_original=dict(accion_original or {}),
        accion_interpretada=dict(accion_interpretada or {}),
        auto_resolver=bool(control == "ia" if auto_resolver is None else auto_resolver),
        sala_id=sala_id,
    )
    escena.tirada_pendiente = tirada
    escena.accion_pendiente = {
        "actor_id": actor.id,
        "actor_nombre": actor.nombre,
        "accion_original": dict(accion_original or {}),
        "accion_interpretada": dict(accion_interpretada or {}),
    }
    return tirada


def resolver_tirada_pendiente(sala_id: str, *, tirada_id: str | None = None) -> TiradaPendiente:
    escena = gestor_combate.obtener_escena(sala_id)
    if not escena or not escena.activa:
        raise ValueError("No hay una escena de combate activa para resolver la tirada.")

    tirada = escena.tirada_pendiente
    if not tirada:
        raise ValueError("No hay una tirada pendiente en esta sala.")
    if tirada_id and tirada.id != tirada_id:
        raise ValueError("La tirada pendiente ya cambio antes de resolverse.")
    _obtener_actor_valido(sala_id, tirada.actor_id)
    if tirada.resultado_dado is not None:
        raise ValueError("La tirada pendiente ya fue resuelta.")

    dado = random.randint(1, 20)
    tirada.resultado_dado = dado
    tirada.critico = dado == 20
    tirada.desastre = dado == 1
    tirada.total = dado + int(tirada.modificador or 0)
    tirada.exito = tirada.total >= int(tirada.dc or 0)
    escena.tirada_pendiente = tirada
    return tirada


def limpiar_tirada_pendiente(
    sala_id: str,
    *,
    tirada_id: str | None = None,
    limpiar_accion: bool = False,
) -> bool:
    escena = gestor_combate.obtener_escena(sala_id)
    if not escena:
        return False

    tirada = escena.tirada_pendiente
    if tirada_id and tirada and tirada.id != tirada_id:
        return False

    escena.tirada_pendiente = None
    if limpiar_accion:
        escena.accion_pendiente = None
    return True
