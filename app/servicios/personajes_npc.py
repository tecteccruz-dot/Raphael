from __future__ import annotations

import json
import secrets
from pathlib import Path

from app.modelos.personajes_npc import InstanciaNPC, PersonajePersistente, PlantillaNPC
from app.servicios import salas as servicio_salas


_BASE_DATOS = Path(__file__).resolve().parents[2] / "datos" / "personajes"
_ARCHIVO_PLANTILLAS = _BASE_DATOS / "npc_plantillas.json"
_ARCHIVO_NPC_UNICOS = _BASE_DATOS / "npc_unicos.json"
_NOMBRE_ARCHIVO_PERSISTENTES = "actores_persistentes.json"
_CAMPOS_PERSONAJE = (
    "id",
    "plantilla_id",
    "nombre",
    "tipo",
    "control",
    "raza",
    "clase",
    "trasfondo",
    "nivel",
    "vida_actual",
    "vida_maxima",
    "mana_actual",
    "mana_maximo",
    "xp_actual",
    "xp_maximo",
    "estado",
    "estadisticas",
    "habilidades",
    "pasivas",
    "tiradas",
    "inventario",
    "resumen",
    "reclutado",
    "persistente",
    "jugador_nombre",
    "sala_id",
    "avatar_url",
)


def _nuevo_id(prefijo: str) -> str:
    return f"{prefijo}_{secrets.token_hex(4)}"


def _leer_json(path: Path, predeterminado: object) -> object:
    if not path.exists():
        return predeterminado

    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def _guardar_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _asegurar_catalogos_base() -> None:
    _BASE_DATOS.mkdir(parents=True, exist_ok=True)

    if not _ARCHIVO_PLANTILLAS.exists():
        _guardar_json(_ARCHIVO_PLANTILLAS, {"plantillas": []})

    if not _ARCHIVO_NPC_UNICOS.exists():
        _guardar_json(_ARCHIVO_NPC_UNICOS, {"npc_unicos": []})


def _cargar_lista_desde_archivo(path: Path, clave: str) -> list[dict[str, object]]:
    _asegurar_catalogos_base()
    data = _leer_json(path, {clave: []})
    items = data.get(clave, []) if isinstance(data, dict) else []
    return [dict(item) for item in items if isinstance(item, dict)]


def _archivo_persistentes_sala(sala_id: str, *, crear: bool = True) -> Path:
    ruta = servicio_salas.ruta_archivo_partida(sala_id, _NOMBRE_ARCHIVO_PERSISTENTES, crear=crear)
    if crear and not ruta.exists():
        _guardar_json(ruta, {"actores_persistentes": []})
    return ruta


def _cargar_persistentes_sala(sala_id: str) -> list[dict[str, object]]:
    archivo = _archivo_persistentes_sala(sala_id, crear=True)
    data = _leer_json(archivo, {"actores_persistentes": []})
    items = data.get("actores_persistentes", []) if isinstance(data, dict) else []
    return [dict(item) for item in items if isinstance(item, dict)]


def _guardar_persistentes_sala(sala_id: str, personajes: list[PersonajePersistente]) -> None:
    archivo = _archivo_persistentes_sala(sala_id, crear=True)
    _guardar_json(
        archivo,
        {"actores_persistentes": [personaje.a_dict() for personaje in personajes]},
    )


def _payload_desde_objeto(actor_o_personaje: object) -> dict[str, object]:
    if isinstance(actor_o_personaje, (PlantillaNPC, InstanciaNPC, PersonajePersistente)):
        return actor_o_personaje.a_dict()

    if isinstance(actor_o_personaje, dict):
        return dict(actor_o_personaje)

    payload: dict[str, object] = {}
    for campo in _CAMPOS_PERSONAJE:
        if hasattr(actor_o_personaje, campo):
            payload[campo] = getattr(actor_o_personaje, campo)
    return payload


def _instancia_desde_payload(
    payload: dict[str, object],
    *,
    nombre: str | None = None,
    sala_id: str | None = None,
    overrides: dict[str, object] | None = None,
) -> InstanciaNPC:
    datos = dict(payload)
    if overrides:
        datos.update(dict(overrides))

    if nombre is not None and str(nombre).strip():
        datos["nombre"] = str(nombre).strip()

    datos["id"] = str(datos.get("id") or _nuevo_id("npc")).strip()
    if sala_id:
        datos["sala_id"] = str(sala_id).strip().upper()

    return InstanciaNPC.desde_dict(datos, sala_id=sala_id)


def _personaje_persistente_desde_objeto(sala_id: str, actor_o_personaje: object) -> PersonajePersistente:
    datos = _payload_desde_objeto(actor_o_personaje)
    if not datos:
        raise ValueError("No pudimos leer los datos del actor indicado.")

    datos["id"] = str(datos.get("id") or _nuevo_id("personaje")).strip()
    datos["nombre"] = str(datos.get("nombre") or "").strip()
    datos["sala_id"] = str(sala_id or "").strip().upper()
    datos["persistente"] = True

    if not datos["nombre"]:
        raise ValueError("El personaje persistente necesita un nombre.")

    return PersonajePersistente.desde_dict(datos, sala_id=sala_id)


def cargar_plantillas_npc() -> list[PlantillaNPC]:
    plantillas: list[PlantillaNPC] = []
    for item in _cargar_lista_desde_archivo(_ARCHIVO_PLANTILLAS, "plantillas"):
        plantilla = PlantillaNPC.desde_dict(item)
        if not plantilla.id or not plantilla.nombre:
            continue
        plantillas.append(plantilla)
    return plantillas


def obtener_plantilla_npc(plantilla_id: str) -> PlantillaNPC | None:
    buscado = str(plantilla_id or "").strip().casefold()
    if not buscado:
        return None

    for plantilla in cargar_plantillas_npc():
        if plantilla.id.casefold() == buscado:
            return plantilla
    return None


def listar_npc_unicos() -> list[PersonajePersistente]:
    npc_unicos: list[PersonajePersistente] = []
    for item in _cargar_lista_desde_archivo(_ARCHIVO_NPC_UNICOS, "npc_unicos"):
        personaje = PersonajePersistente.desde_dict(item)
        if not personaje.id or not personaje.nombre:
            continue
        npc_unicos.append(personaje)
    return npc_unicos


def obtener_npc_unico(npc_id: str) -> PersonajePersistente | None:
    buscado = str(npc_id or "").strip().casefold()
    if not buscado:
        return None

    for npc in listar_npc_unicos():
        if npc.id.casefold() == buscado:
            return npc
    return None


def crear_instancia_desde_plantilla(
    plantilla_id: str,
    nombre: str | None = None,
    sala_id: str | None = None,
    overrides: dict[str, object] | None = None,
) -> InstanciaNPC:
    plantilla = obtener_plantilla_npc(plantilla_id)
    if not plantilla:
        raise ValueError("No encontramos la plantilla de NPC indicada.")

    payload = plantilla.a_dict()
    payload["id"] = _nuevo_id("npc")
    payload["plantilla_id"] = plantilla.id
    payload["persistente"] = bool(payload.get("persistente", False))
    return _instancia_desde_payload(payload, nombre=nombre, sala_id=sala_id, overrides=overrides)


def guardar_actor_persistente(sala_id: str, actor_o_personaje: object) -> PersonajePersistente:
    personaje = _personaje_persistente_desde_objeto(sala_id, actor_o_personaje)
    existentes = listar_actores_persistentes(sala_id)

    for indice, actual in enumerate(existentes):
        if actual.id != personaje.id:
            continue
        existentes[indice] = personaje
        _guardar_persistentes_sala(sala_id, existentes)
        return personaje

    existentes.insert(0, personaje)
    _guardar_persistentes_sala(sala_id, existentes)
    return personaje


def listar_actores_persistentes(sala_id: str) -> list[PersonajePersistente]:
    personajes: list[PersonajePersistente] = []
    for item in _cargar_persistentes_sala(sala_id):
        personaje = PersonajePersistente.desde_dict(item, sala_id=sala_id)
        if not personaje.id or not personaje.nombre:
            continue
        personajes.append(personaje)
    return personajes


def convertir_actor_a_persistente(
    sala_id: str,
    actor_id_o_actor: str | object,
) -> PersonajePersistente:
    actor = actor_id_o_actor
    if isinstance(actor_id_o_actor, str):
        from app.servicios.combate import gestor_combate

        actor = gestor_combate.buscar_actor(sala_id, actor_id=actor_id_o_actor, referencia=actor_id_o_actor)
        if not actor:
            raise ValueError("No encontramos el actor indicado para volverlo persistente.")

    return guardar_actor_persistente(sala_id, actor)


def cargar_actor_persistente(sala_id: str, personaje_id: str) -> PersonajePersistente | None:
    buscado = str(personaje_id or "").strip().casefold()
    if not buscado:
        return None

    for personaje in listar_actores_persistentes(sala_id):
        if personaje.id.casefold() == buscado:
            return personaje
    return None
