from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


_BASE = Path("datos/salas")
_SESIONES = _BASE / "jugadores.json"


def _ahora() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _asegurar_archivo() -> None:
    _BASE.mkdir(parents=True, exist_ok=True)
    if not _SESIONES.exists():
        _SESIONES.write_text(json.dumps({"sesiones": []}, ensure_ascii=False, indent=2), encoding="utf-8")


def _cargar() -> list[dict[str, object]]:
    _asegurar_archivo()
    with _SESIONES.open("r", encoding="utf-8-sig") as fh:
        data = json.load(fh)
    sesiones = data.get("sesiones", []) if isinstance(data, dict) else []
    return [dict(sesion) for sesion in sesiones if isinstance(sesion, dict)]


def _guardar(sesiones: list[dict[str, object]]) -> None:
    _asegurar_archivo()
    _SESIONES.write_text(json.dumps({"sesiones": sesiones}, ensure_ascii=False, indent=2), encoding="utf-8")


def registrar_preparacion(
    sala_id: str,
    nombre: str,
    token: str | None,
    datos_creacion: dict[str, object],
) -> None:
    token_limpio = (token or "").strip()
    if not token_limpio:
        return

    sala_limpia = (sala_id or "").strip().upper()
    nombre_limpio = (nombre or "").strip()
    sesiones = _cargar()
    ahora = _ahora()
    nuevas: list[dict[str, object]] = []
    registro_actualizado = False

    for sesion in sesiones:
        misma_sala = str(sesion.get("sala_id", "")).upper() == sala_limpia
        mismo_token = str(sesion.get("token", "")) == token_limpio
        mismo_nombre = str(sesion.get("nombre", "")).casefold() == nombre_limpio.casefold()

        if misma_sala and mismo_token:
            actualizada = dict(sesion)
            actualizada["nombre"] = nombre_limpio
            actualizada["datos_creacion"] = dict(datos_creacion)
            actualizada["actualizada_en"] = ahora
            nuevas.append(actualizada)
            registro_actualizado = True
            continue

        if misma_sala and mismo_nombre and not mismo_token:
            continue

        nuevas.append(dict(sesion))

    if not registro_actualizado:
        nuevas.insert(
            0,
            {
                "token": token_limpio,
                "sala_id": sala_limpia,
                "nombre": nombre_limpio,
                "datos_creacion": dict(datos_creacion),
                "perfil": None,
                "creada_en": ahora,
                "actualizada_en": ahora,
            },
        )

    _guardar(nuevas)


def obtener_sesion(sala_id: str, token: str | None) -> dict[str, object] | None:
    sala_limpia = (sala_id or "").strip().upper()
    token_limpio = (token or "").strip()
    if not sala_limpia or not token_limpio:
        return None

    for sesion in _cargar():
        if str(sesion.get("sala_id", "")).upper() == sala_limpia and str(sesion.get("token", "")) == token_limpio:
            return dict(sesion)

    return None


def obtener_sesion_por_nombre(sala_id: str, nombre: str) -> dict[str, object] | None:
    sala_limpia = (sala_id or "").strip().upper()
    nombre_limpio = (nombre or "").strip()
    if not sala_limpia or not nombre_limpio:
        return None

    for sesion in _cargar():
        misma_sala = str(sesion.get("sala_id", "")).upper() == sala_limpia
        mismo_nombre = str(sesion.get("nombre", "")).casefold() == nombre_limpio.casefold()
        if misma_sala and mismo_nombre:
            return dict(sesion)

    return None


def guardar_perfil(sala_id: str, nombre: str, token: str | None, perfil: dict[str, object]) -> None:
    token_limpio = (token or "").strip()
    if not token_limpio:
        return

    sala_limpia = (sala_id or "").strip().upper()
    nombre_limpio = (nombre or "").strip()
    sesiones = _cargar()
    ahora = _ahora()

    for indice, sesion in enumerate(sesiones):
        misma_sala = str(sesion.get("sala_id", "")).upper() == sala_limpia
        mismo_token = str(sesion.get("token", "")) == token_limpio
        if not (misma_sala and mismo_token):
            continue

        actualizada = dict(sesion)
        actualizada["nombre"] = nombre_limpio
        actualizada["perfil"] = dict(perfil)
        actualizada["actualizada_en"] = ahora
        sesiones[indice] = actualizada
        _guardar(sesiones)
        return


def guardar_perfil_por_nombre(sala_id: str, nombre: str, perfil: dict[str, object]) -> None:
    sala_limpia = (sala_id or "").strip().upper()
    nombre_limpio = (nombre or "").strip()
    if not sala_limpia or not nombre_limpio:
        return

    sesiones = _cargar()
    ahora = _ahora()
    cambios = False

    for indice, sesion in enumerate(sesiones):
        misma_sala = str(sesion.get("sala_id", "")).upper() == sala_limpia
        mismo_nombre = str(sesion.get("nombre", "")).casefold() == nombre_limpio.casefold()
        if not (misma_sala and mismo_nombre):
            continue

        actualizada = dict(sesion)
        actualizada["nombre"] = nombre_limpio
        actualizada["perfil"] = dict(perfil)
        actualizada["actualizada_en"] = ahora
        sesiones[indice] = actualizada
        cambios = True

    if cambios:
        _guardar(sesiones)


def olvidar_sesion(sala_id: str, token: str | None) -> None:
    sala_limpia = (sala_id or "").strip().upper()
    token_limpio = (token or "").strip()
    if not sala_limpia or not token_limpio:
        return

    sesiones = [
        sesion
        for sesion in _cargar()
        if not (
            str(sesion.get("sala_id", "")).upper() == sala_limpia
            and str(sesion.get("token", "")) == token_limpio
        )
    ]
    _guardar(sesiones)
