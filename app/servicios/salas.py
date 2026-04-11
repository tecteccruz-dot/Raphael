from __future__ import annotations

import json
import secrets
from datetime import datetime
from pathlib import Path


_BASE = Path("datos/salas")
_SALAS = _BASE / "salas.json"
_ESCENARIOS = _BASE / "escenarios.json"
_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _asegurar_archivos() -> None:
    _BASE.mkdir(parents=True, exist_ok=True)

    if not _SALAS.exists():
        _SALAS.write_text(json.dumps({"salas": []}, ensure_ascii=False, indent=2), encoding="utf-8")


def _cargar_json(path: Path, default: object) -> object:
    if not path.exists():
        return default

    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def listar_escenarios() -> list[dict[str, str]]:
    return list(_cargar_json(_ESCENARIOS, []))


def obtener_escenario(escenario_id: str) -> dict[str, str] | None:
    buscado = (escenario_id or "").strip()
    if not buscado:
        return None

    for escenario in listar_escenarios():
        if escenario.get("id") == buscado:
            return dict(escenario)

    return None


def listar_salas() -> list[dict[str, object]]:
    _asegurar_archivos()
    data = _cargar_json(_SALAS, {"salas": []})
    salas = data.get("salas", []) if isinstance(data, dict) else []
    return [dict(sala) for sala in salas if isinstance(sala, dict)]


def _guardar_salas(salas: list[dict[str, object]]) -> None:
    _asegurar_archivos()
    payload = {"salas": salas}
    _SALAS.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def obtener_sala(sala_id: str) -> dict[str, object] | None:
    buscada = (sala_id or "").strip().upper()
    if not buscada:
        return None

    for sala in listar_salas():
        if str(sala.get("id", "")).upper() == buscada:
            return dict(sala)

    return None


def _generar_id_sala(ids_existentes: set[str], longitud: int = 6) -> str:
    while True:
        sala_id = "".join(secrets.choice(_ALFABETO) for _ in range(longitud))
        if sala_id not in ids_existentes:
            return sala_id


def crear_sala(nombre: str, escenario_id: str) -> dict[str, object]:
    nombre_limpio = (nombre or "").strip()
    if len(nombre_limpio) < 3:
        raise ValueError("El nombre de la sala debe tener al menos 3 caracteres.")

    escenario = obtener_escenario(escenario_id)
    if not escenario:
        raise ValueError("El escenario seleccionado no existe.")

    salas = listar_salas()
    ids_existentes = {str(sala.get("id", "")).upper() for sala in salas}
    sala_id = _generar_id_sala(ids_existentes)

    sala = {
        "id": sala_id,
        "nombre": nombre_limpio[:60],
        "escenario_id": escenario["id"],
        "escenario_nombre": escenario["nombre"],
        "escenario_descripcion": escenario["descripcion"],
        "creada_en": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    salas.insert(0, sala)
    _guardar_salas(salas)
    return dict(sala)
