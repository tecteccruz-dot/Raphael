from __future__ import annotations

import json
import os
from pathlib import Path

import httpx


_PROMPT_MAESTRO = Path("prompts/prompt_maestro.txt")
_SCHEMA_RESPUESTA = {
    "type": "object",
    "properties": {
        "narracion": {"type": "string"},
        "resumen_delta": {"type": "string"},
        "fin_de_turno": {"type": "boolean"},
        "acciones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "tipo": {
                        "type": "string",
                        "enum": ["danio", "curacion", "estado", "xp", "agregar_actor"],
                    },
                    "actor_id": {"type": "string"},
                    "objetivo": {"type": "string"},
                    "cantidad": {"type": "integer"},
                    "motivo": {"type": "string"},
                    "estado": {
                        "type": "string",
                        "enum": ["listo", "caido", "incapacitado", "muerto"],
                    },
                    "nombre": {"type": "string"},
                    "control": {"type": "string", "enum": ["jugador", "ia"]},
                    "iniciativa": {"type": "integer"},
                    "vida_maxima": {"type": "integer"},
                    "vida_actual": {"type": "integer"},
                },
                "required": ["tipo"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["narracion", "resumen_delta", "fin_de_turno", "acciones"],
    "additionalProperties": False,
}


class LMStudioError(RuntimeError):
    pass


def _base_url() -> str:
    base = str(os.getenv("LM_STUDIO_BASE_URL") or "http://127.0.0.1:1234/v1").rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return base


def _modelo_configurado() -> str:
    return str(os.getenv("LM_STUDIO_MODEL") or "").strip()


def _timeout() -> httpx.Timeout:
    try:
        read = max(10.0, float(os.getenv("LM_STUDIO_TIMEOUT") or "120"))
    except ValueError:
        read = 120.0
    return httpx.Timeout(connect=10.0, read=read, write=30.0, pool=5.0)


def _cargar_prompt_maestro() -> str:
    try:
        contenido = _PROMPT_MAESTRO.read_text(encoding="utf-8-sig").strip()
    except FileNotFoundError:
        contenido = ""
    if contenido:
        return contenido
    return "Eres la Dungeon Master de Raphael. Narra con claridad y devuelve JSON valido."


def _prompt_sistema() -> str:
    return (
        f"{_cargar_prompt_maestro()}\n\n"
        "Instrucciones tecnicas:\n"
        "- Devuelve siempre JSON valido que respete el schema exacto.\n"
        "- La narracion debe estar en espanol.\n"
        "- Cierra siempre el turno con fin_de_turno=true.\n"
        "- El servidor aplica y valida la verdad final; tu solo propones cambios.\n"
    )


def _extraer_contenido_message(message: object) -> str:
    """Devuelve el texto del mensaje, con fallback a reasoning_content para modelos de razonamiento."""
    if not isinstance(message, dict):
        return ""
    contenido = str(message.get("content") or "").strip()
    if contenido:
        return contenido
    # Modelos de razonamiento (QwQ, DeepSeek-R1, etc.) ponen la respuesta en reasoning_content
    return str(message.get("reasoning_content") or "").strip()


def _parsear_json_respuesta(contenido: str) -> dict[str, object]:
    texto = str(contenido or "").strip()
    if not texto:
        raise LMStudioError("LM Studio respondio vacio.")

    try:
        data = json.loads(texto)
    except json.JSONDecodeError as exc:
        inicio = texto.find("{")
        fin = texto.rfind("}")
        if inicio < 0 or fin <= inicio:
            raise LMStudioError("LM Studio no devolvio JSON valido.") from exc
        try:
            data = json.loads(texto[inicio : fin + 1])
        except json.JSONDecodeError as inner_exc:
            raise LMStudioError("LM Studio devolvio una respuesta que no se pudo parsear.") from inner_exc

    if not isinstance(data, dict):
        raise LMStudioError("LM Studio no devolvio un objeto JSON.")

    data.setdefault("narracion", "")
    data.setdefault("resumen_delta", "")
    data.setdefault("fin_de_turno", True)
    data.setdefault("acciones", [])
    if not isinstance(data.get("acciones"), list):
        data["acciones"] = []
    return data


async def listar_modelos() -> list[str]:
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        response = await client.get(f"{_base_url()}/models")
        response.raise_for_status()
        payload = response.json()

    data = payload.get("data", []) if isinstance(payload, dict) else []
    return [str(item.get("id")) for item in data if isinstance(item, dict) and item.get("id")]


async def modelo_activo() -> str | None:
    fijo = _modelo_configurado()
    if fijo:
        return fijo

    modelos = await listar_modelos()
    return modelos[0] if modelos else None


async def estado_servidor() -> dict[str, object]:
    base_url = _base_url()
    configurado = _modelo_configurado()
    try:
        modelos = await listar_modelos()
        return {
            "ok": True,
            "base_url": base_url,
            "modelo_configurado": configurado or None,
            "modelo_activo": configurado or (modelos[0] if modelos else None),
            "modelos": modelos,
        }
    except Exception as exc:
        return {
            "ok": False,
            "base_url": base_url,
            "modelo_configurado": configurado or None,
            "modelo_activo": None,
            "modelos": [],
            "detalle": str(exc),
        }


async def probar_conexion() -> dict[str, object]:
    modelo = await modelo_activo()
    if not modelo:
        raise LMStudioError("No hay ningun modelo cargado en LM Studio.")

    payload = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": "Responde de forma breve y valida JSON simple."},
            {"role": "user", "content": '{"ping":"raphael"}'},
        ],
        "temperature": 0.1,
        "max_tokens": 120,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "raphael_ping",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "ok": {"type": "boolean"},
                        "mensaje": {"type": "string"},
                    },
                    "required": ["ok", "mensaje"],
                    "additionalProperties": False,
                },
            },
        },
    }

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        response = await client.post(f"{_base_url()}/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()

    choices = data.get("choices", []) if isinstance(data, dict) else []
    if not choices:
        raise LMStudioError("LM Studio no devolvio choices en la prueba.")

    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    return _parsear_json_respuesta(_extraer_contenido_message(message))


async def resolver_turno(contexto: dict[str, object]) -> dict[str, object]:
    modelo = await modelo_activo()
    if not modelo:
        raise LMStudioError("No hay ningun modelo cargado en LM Studio.")

    payload = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": _prompt_sistema()},
            {
                "role": "user",
                "content": json.dumps(contexto, ensure_ascii=False),
            },
        ],
        "temperature": 0.65,
        "frequency_penalty": 0.5,
        "presence_penalty": 0.25,
        "max_tokens": 900,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "raphael_turno",
                "strict": True,
                "schema": _SCHEMA_RESPUESTA,
            },
        },
    }

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        response = await client.post(f"{_base_url()}/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()

    choices = data.get("choices", []) if isinstance(data, dict) else []
    if not choices:
        raise LMStudioError("LM Studio no devolvio una respuesta usable.")

    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    return _parsear_json_respuesta(_extraer_contenido_message(message))
