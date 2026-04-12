from __future__ import annotations

import json
import secrets
from datetime import datetime
from pathlib import Path


_BASE_PROYECTO = Path(__file__).resolve().parents[2]
_BASE = _BASE_PROYECTO / "datos" / "salas"
_BASE_PARTIDAS = _BASE_PROYECTO / "partidas"
_SALAS = _BASE / "salas.json"
_ESCENARIOS = _BASE / "escenarios.json"
_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_HOST_COOKIE_PREFIX = "raphael_host_"
_ESCENARIOS_POR_DEFECTO = [
    {
        "id": "taberna_bruma",
        "nombre": "La Taberna de la Bruma",
        "descripcion": "La aventura comienza en una taberna fronteriza donde los rumores sobre desapariciones y criaturas extranas no dejan de crecer.",
    },
    {
        "id": "bosque_susurros",
        "nombre": "Bosque de los Susurros",
        "descripcion": "Un sendero antiguo atraviesa un bosque envuelto en niebla, con ruinas ocultas y voces que parecen guiar o confundir a los viajeros.",
    },
    {
        "id": "fortin_ceniza",
        "nombre": "Fortin de la Ceniza",
        "descripcion": "Las murallas de un fortin castigado por la guerra esconden secretos militares, reliquias perdidas y una amenaza lista para despertar.",
    },
]


def _asegurar_archivos() -> None:
    _BASE.mkdir(parents=True, exist_ok=True)

    if not _SALAS.exists():
        _SALAS.write_text(json.dumps({"salas": []}, ensure_ascii=False, indent=2), encoding="utf-8")

    if not _ESCENARIOS.exists():
        _ESCENARIOS.write_text(json.dumps(_ESCENARIOS_POR_DEFECTO, ensure_ascii=False, indent=2), encoding="utf-8")


def _cargar_json(path: Path, default: object) -> object:
    if not path.exists():
        return default

    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def _sanitizar_sala_publica(sala: dict[str, object]) -> dict[str, object]:
    publica = dict(sala)
    publica.pop("host_token", None)
    publica["host_configurado"] = bool(sala.get("host_token"))
    return publica


def _listar_salas_privadas() -> list[dict[str, object]]:
    _asegurar_archivos()
    data = _cargar_json(_SALAS, {"salas": []})
    salas = data.get("salas", []) if isinstance(data, dict) else []
    return [dict(sala) for sala in salas if isinstance(sala, dict)]


def _buscar_sala_privada(sala_id: str) -> dict[str, object] | None:
    buscada = (sala_id or "").strip().upper()
    if not buscada:
        return None

    for sala in _listar_salas_privadas():
        if str(sala.get("id", "")).upper() == buscada:
            return dict(sala)

    return None


def normalizar_sala_id(sala_id: str) -> str:
    return (sala_id or "").strip().upper()


def ruta_partida_sala(sala_id: str, *, crear: bool = False) -> Path:
    sala_limpia = normalizar_sala_id(sala_id)
    if not sala_limpia:
        raise ValueError("La sala indicada no es valida.")

    ruta = _BASE_PARTIDAS / sala_limpia
    if crear:
        ruta.mkdir(parents=True, exist_ok=True)
    return ruta


def ruta_archivo_partida(sala_id: str, nombre_archivo: str, *, crear: bool = False) -> Path:
    nombre_limpio = (nombre_archivo or "").strip()
    if not nombre_limpio:
        raise ValueError("El archivo de partida necesita un nombre.")
    return ruta_partida_sala(sala_id, crear=crear) / nombre_limpio


def nombre_cookie_host(sala_id: str) -> str:
    sala_segura = "".join(caracter for caracter in str(sala_id or "").upper() if caracter.isalnum())
    return f"{_HOST_COOKIE_PREFIX}{sala_segura or 'SALA'}"


def listar_escenarios() -> list[dict[str, str]]:
    _asegurar_archivos()
    data = _cargar_json(_ESCENARIOS, _ESCENARIOS_POR_DEFECTO)
    if not isinstance(data, list):
        return [dict(escenario) for escenario in _ESCENARIOS_POR_DEFECTO]

    escenarios: list[dict[str, str]] = []
    for escenario in data:
        if not isinstance(escenario, dict):
            continue

        escenario_id = str(escenario.get("id", "")).strip()
        nombre = str(escenario.get("nombre", "")).strip()
        descripcion = str(escenario.get("descripcion", "")).strip()
        if not escenario_id or not nombre or not descripcion:
            continue

        escenarios.append(
            {
                "id": escenario_id,
                "nombre": nombre,
                "descripcion": descripcion,
            }
        )

    if escenarios:
        return escenarios

    return [dict(escenario) for escenario in _ESCENARIOS_POR_DEFECTO]


def obtener_escenario(escenario_id: str) -> dict[str, str] | None:
    buscado = (escenario_id or "").strip()
    if not buscado:
        return None

    for escenario in listar_escenarios():
        if escenario.get("id") == buscado:
            return dict(escenario)

    return None


def listar_salas() -> list[dict[str, object]]:
    return [_sanitizar_sala_publica(sala) for sala in _listar_salas_privadas()]


def _guardar_salas(salas: list[dict[str, object]]) -> None:
    _asegurar_archivos()
    payload = {"salas": salas}
    _SALAS.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def obtener_sala(sala_id: str) -> dict[str, object] | None:
    sala = _buscar_sala_privada(sala_id)
    return _sanitizar_sala_publica(sala) if sala else None


def es_host(sala_id: str, host_token: str | None) -> bool:
    sala = _buscar_sala_privada(sala_id)
    token_esperado = str(sala.get("host_token", "")) if sala else ""
    token_actual = str(host_token or "")
    return bool(token_esperado and token_actual) and secrets.compare_digest(token_actual, token_esperado)


def _generar_id_sala(ids_existentes: set[str], longitud: int = 6) -> str:
    while True:
        sala_id = "".join(secrets.choice(_ALFABETO) for _ in range(longitud))
        if sala_id not in ids_existentes:
            return sala_id


def crear_sala(nombre: str, escenario_id: str) -> tuple[dict[str, object], str]:
    nombre_limpio = (nombre or "").strip()
    if len(nombre_limpio) < 3:
        raise ValueError("El nombre de la sala debe tener al menos 3 caracteres.")

    escenario = obtener_escenario(escenario_id)
    if not escenario:
        raise ValueError("El escenario seleccionado no existe.")

    salas = _listar_salas_privadas()
    ids_existentes = {str(sala.get("id", "")).upper() for sala in salas}
    sala_id = _generar_id_sala(ids_existentes)
    host_token = secrets.token_urlsafe(24)

    sala = {
        "id": sala_id,
        "nombre": nombre_limpio[:60],
        "escenario_id": escenario["id"],
        "escenario_nombre": escenario["nombre"],
        "escenario_descripcion": escenario["descripcion"],
        "resumen_partida": escenario["descripcion"],
        "creada_en": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "host_token": host_token,
    }

    salas.insert(0, sala)
    _guardar_salas(salas)
    ruta_partida_sala(sala_id, crear=True)
    return _sanitizar_sala_publica(sala), host_token


def reclamar_host(sala_id: str) -> tuple[dict[str, object], str]:
    buscada = (sala_id or "").strip().upper()
    if not buscada:
        raise ValueError("La sala indicada no es valida.")

    salas = _listar_salas_privadas()

    for indice, sala in enumerate(salas):
        if str(sala.get("id", "")).upper() != buscada:
            continue

        if sala.get("host_token"):
            raise ValueError("Esta sala ya tiene un host asignado.")

        host_token = secrets.token_urlsafe(24)
        actualizada = dict(sala)
        actualizada["host_token"] = host_token
        salas[indice] = actualizada
        _guardar_salas(salas)
        return _sanitizar_sala_publica(actualizada), host_token

    raise ValueError("No encontramos la sala solicitada.")


def eliminar_sala(sala_id: str) -> dict[str, object] | None:
    buscada = (sala_id or "").strip().upper()
    if not buscada:
        return None

    salas = _listar_salas_privadas()
    restantes: list[dict[str, object]] = []
    eliminada: dict[str, object] | None = None

    for sala in salas:
        if eliminada is None and str(sala.get("id", "")).upper() == buscada:
            eliminada = dict(sala)
            continue

        restantes.append(dict(sala))

    if not eliminada:
        return None

    _guardar_salas(restantes)
    return _sanitizar_sala_publica(eliminada)


def obtener_resumen_partida(sala_id: str) -> str:
    sala = _buscar_sala_privada(sala_id)
    if not sala:
        return ""
    return str(sala.get("resumen_partida") or "").strip()


def actualizar_resumen_partida(
    sala_id: str,
    resumen: str,
    *,
    append: bool = False,
    limite: int = 2400,
) -> dict[str, object] | None:
    buscada = (sala_id or "").strip().upper()
    texto = str(resumen or "").strip()
    if not buscada:
        return None

    salas = _listar_salas_privadas()

    for indice, sala in enumerate(salas):
        if str(sala.get("id", "")).upper() != buscada:
            continue

        actual = str(sala.get("resumen_partida") or "").strip()
        if append and texto:
            if texto.casefold() in actual.casefold():
                combinado = actual
            elif actual:
                combinado = f"{actual}\n{texto}"
            else:
                combinado = texto
        else:
            combinado = texto

        combinado = combinado.strip()
        if limite > 0 and len(combinado) > limite:
            combinado = combinado[-limite:].lstrip()

        actualizada = dict(sala)
        actualizada["resumen_partida"] = combinado
        salas[indice] = actualizada
        _guardar_salas(salas)
        return _sanitizar_sala_publica(actualizada)

    return None
