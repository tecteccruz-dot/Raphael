from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass
class TiradaPendiente:
    id: str
    actor_id: str
    actor_nombre: str
    control: str
    atributo: str
    habilidad: str
    dc: int
    modificador: int
    motivo: str
    accion_original: dict[str, object]
    accion_interpretada: dict[str, object]
    auto_resolver: bool
    sala_id: str
    resultado_dado: int | None = None
    total: int | None = None
    exito: bool | None = None
    critico: bool | None = None
    desastre: bool | None = None

    def a_dict(self) -> dict[str, object]:
        return asdict(self)

    @classmethod
    def desde_dict(cls, datos: dict[str, object] | None) -> "TiradaPendiente":
        payload = dict(datos or {})
        return cls(
            id=str(payload.get("id") or "").strip(),
            actor_id=str(payload.get("actor_id") or "").strip(),
            actor_nombre=str(payload.get("actor_nombre") or "").strip(),
            control=str(payload.get("control") or "").strip().lower() or "jugador",
            atributo=str(payload.get("atributo") or "").strip().lower(),
            habilidad=str(payload.get("habilidad") or "").strip(),
            dc=int(payload.get("dc") or 0),
            modificador=int(payload.get("modificador") or 0),
            motivo=str(payload.get("motivo") or "").strip(),
            accion_original=dict(payload.get("accion_original") or {}),
            accion_interpretada=dict(payload.get("accion_interpretada") or {}),
            auto_resolver=bool(payload.get("auto_resolver", False)),
            sala_id=str(payload.get("sala_id") or "").strip(),
            resultado_dado=int(payload["resultado_dado"]) if payload.get("resultado_dado") is not None else None,
            total=int(payload["total"]) if payload.get("total") is not None else None,
            exito=bool(payload["exito"]) if payload.get("exito") is not None else None,
            critico=bool(payload["critico"]) if payload.get("critico") is not None else None,
            desastre=bool(payload["desastre"]) if payload.get("desastre") is not None else None,
        )
