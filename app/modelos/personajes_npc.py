from __future__ import annotations

from dataclasses import dataclass, field


ESTADOS_PERSONAJE = {"listo", "caido", "incapacitado", "muerto"}


def _texto(valor: object, predeterminado: str = "") -> str:
    return str(valor if valor is not None else predeterminado).strip()


def _texto_opcional(valor: object) -> str | None:
    texto = _texto(valor)
    return texto or None


def _entero(valor: object, predeterminado: int = 0, *, minimo: int | None = None) -> int:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        numero = predeterminado

    if minimo is not None and numero < minimo:
        return minimo
    return numero


def _copiar_estadisticas(valor: object) -> dict[str, int]:
    if not isinstance(valor, dict):
        return {}

    resultado: dict[str, int] = {}
    for clave, numero in valor.items():
        clave_limpia = _texto(clave)
        if not clave_limpia:
            continue
        resultado[clave_limpia] = _entero(numero, 0)
    return resultado


def _copiar_lista_texto(valor: object) -> list[str]:
    if not isinstance(valor, list):
        return []
    return [_texto(item) for item in valor if _texto(item)]


def _copiar_inventario(valor: object) -> list[dict[str, object]]:
    if not isinstance(valor, list):
        return []
    return [dict(item) for item in valor if isinstance(item, dict)]


def _normalizar_estado(valor: object) -> str:
    estado = _texto(valor, "listo").lower() or "listo"
    if estado not in ESTADOS_PERSONAJE:
        return "listo"
    return estado


def _payload_normalizado(
    datos: dict[str, object] | None,
    *,
    persistente_predeterminado: bool,
    sala_id_predeterminada: str | None = None,
) -> dict[str, object]:
    payload = dict(datos or {})

    vida_maxima = _entero(payload.get("vida_maxima"), 1, minimo=1)
    vida_actual = _entero(payload.get("vida_actual"), vida_maxima, minimo=0)
    vida_actual = max(0, min(vida_actual, vida_maxima))

    mana_maximo = _entero(payload.get("mana_maximo"), 0, minimo=0)
    mana_actual = _entero(payload.get("mana_actual"), mana_maximo, minimo=0)
    mana_actual = max(0, min(mana_actual, mana_maximo))

    xp_maximo = _entero(payload.get("xp_maximo"), 0, minimo=0)
    xp_actual = _entero(payload.get("xp_actual"), 0, minimo=0)
    if xp_maximo > 0:
        xp_actual = max(0, min(xp_actual, xp_maximo))

    estado = _normalizar_estado(payload.get("estado"))
    if vida_actual <= 0 and estado == "listo":
        estado = "caido"

    sala_id = _texto_opcional(payload.get("sala_id"))
    if sala_id_predeterminada:
        sala_id = _texto(sala_id_predeterminada).upper()
    elif sala_id:
        sala_id = sala_id.upper()

    return {
        "id": _texto(payload.get("id")),
        "plantilla_id": _texto_opcional(payload.get("plantilla_id")),
        "nombre": _texto(payload.get("nombre"), "NPC"),
        "tipo": _texto(payload.get("tipo"), "npc") or "npc",
        "control": _texto(payload.get("control"), "ia").lower() or "ia",
        "raza": _texto(payload.get("raza")),
        "clase": _texto(payload.get("clase")),
        "trasfondo": _texto(payload.get("trasfondo")),
        "nivel": _entero(payload.get("nivel"), 1, minimo=1),
        "vida_actual": vida_actual,
        "vida_maxima": vida_maxima,
        "mana_actual": mana_actual,
        "mana_maximo": mana_maximo,
        "xp_actual": xp_actual,
        "xp_maximo": xp_maximo,
        "estado": estado,
        "estadisticas": _copiar_estadisticas(payload.get("estadisticas")),
        "habilidades": _copiar_lista_texto(payload.get("habilidades")),
        "pasivas": _copiar_lista_texto(payload.get("pasivas")),
        "tiradas": _copiar_lista_texto(payload.get("tiradas")),
        "inventario": _copiar_inventario(payload.get("inventario")),
        "resumen": _texto(payload.get("resumen")),
        "reclutado": bool(payload.get("reclutado", False)),
        "persistente": bool(payload.get("persistente", persistente_predeterminado)),
        "jugador_nombre": _texto_opcional(payload.get("jugador_nombre")),
        "sala_id": sala_id,
        "avatar_url": _texto_opcional(payload.get("avatar_url")),
    }


@dataclass
class FichaNPCBase:
    id: str
    nombre: str
    tipo: str = "npc"
    control: str = "ia"
    plantilla_id: str | None = None
    raza: str = ""
    clase: str = ""
    trasfondo: str = ""
    nivel: int = 1
    vida_actual: int = 1
    vida_maxima: int = 1
    mana_actual: int = 0
    mana_maximo: int = 0
    xp_actual: int = 0
    xp_maximo: int = 0
    estado: str = "listo"
    estadisticas: dict[str, int] = field(default_factory=dict)
    habilidades: list[str] = field(default_factory=list)
    pasivas: list[str] = field(default_factory=list)
    tiradas: list[str] = field(default_factory=list)
    inventario: list[dict[str, object]] = field(default_factory=list)
    resumen: str = ""
    reclutado: bool = False
    persistente: bool = False
    jugador_nombre: str | None = None
    sala_id: str | None = None
    avatar_url: str | None = None

    def a_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "plantilla_id": self.plantilla_id,
            "nombre": self.nombre,
            "tipo": self.tipo,
            "control": self.control,
            "raza": self.raza,
            "clase": self.clase,
            "trasfondo": self.trasfondo,
            "nivel": self.nivel,
            "vida_actual": self.vida_actual,
            "vida_maxima": self.vida_maxima,
            "mana_actual": self.mana_actual,
            "mana_maximo": self.mana_maximo,
            "xp_actual": self.xp_actual,
            "xp_maximo": self.xp_maximo,
            "estado": self.estado,
            "estadisticas": dict(self.estadisticas),
            "habilidades": list(self.habilidades),
            "pasivas": list(self.pasivas),
            "tiradas": list(self.tiradas),
            "inventario": [dict(item) for item in self.inventario],
            "resumen": self.resumen,
            "reclutado": self.reclutado,
            "persistente": self.persistente,
            "jugador_nombre": self.jugador_nombre,
            "sala_id": self.sala_id,
            "avatar_url": self.avatar_url,
        }


@dataclass
class PlantillaNPC(FichaNPCBase):
    @classmethod
    def desde_dict(cls, datos: dict[str, object] | None) -> "PlantillaNPC":
        return cls(**_payload_normalizado(datos, persistente_predeterminado=False))


@dataclass
class InstanciaNPC(FichaNPCBase):
    @classmethod
    def desde_dict(
        cls,
        datos: dict[str, object] | None,
        *,
        sala_id: str | None = None,
    ) -> "InstanciaNPC":
        return cls(
            **_payload_normalizado(
                datos,
                persistente_predeterminado=False,
                sala_id_predeterminada=sala_id,
            )
        )


@dataclass
class PersonajePersistente(FichaNPCBase):
    persistente: bool = True

    @classmethod
    def desde_dict(
        cls,
        datos: dict[str, object] | None,
        *,
        sala_id: str | None = None,
    ) -> "PersonajePersistente":
        return cls(
            **_payload_normalizado(
                datos,
                persistente_predeterminado=True,
                sala_id_predeterminada=sala_id,
            )
        )
