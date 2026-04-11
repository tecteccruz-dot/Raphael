from __future__ import annotations

from pydantic import BaseModel, model_validator

_STANDARD = frozenset({15, 14, 13, 12, 10, 8})
_ATRIBUTOS = frozenset({"fue", "des", "con", "int", "sab", "car"})


class CreacionPersonaje(BaseModel):
    nombre: str
    sala_id: str
    raza: str
    subraza: str | None = None
    clase: str
    trasfondo: str
    ascendencia_draconica: str | None = None
    modificadores_libres: dict[str, int] | None = None  # para semielfo: {attr: 1, attr: 1}
    atributos: dict[str, int]
    habilidades_elegidas: list[str] = []

    @model_validator(mode="after")
    def validar_atributos(self) -> CreacionPersonaje:
        if set(self.atributos.keys()) != _ATRIBUTOS:
            raise ValueError(f"Se requieren exactamente estos atributos: {sorted(_ATRIBUTOS)}")
        if frozenset(self.atributos.values()) != _STANDARD:
            raise ValueError(f"Los valores deben ser el Standard Array: {sorted(_STANDARD, reverse=True)}")
        return self
