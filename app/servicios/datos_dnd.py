import json
from functools import cache
from pathlib import Path

_BASE = Path("datos/dnd")


@cache
def razas() -> dict:
    return json.loads((_BASE / "razas.json").read_text(encoding="utf-8"))


@cache
def clases() -> dict:
    return json.loads((_BASE / "clases.json").read_text(encoding="utf-8"))


@cache
def trasfondos() -> dict:
    return json.loads((_BASE / "trasfondos.json").read_text(encoding="utf-8"))


@cache
def reglas() -> dict:
    return json.loads((_BASE / "reglas_atributos.json").read_text(encoding="utf-8"))


@cache
def nombres() -> list[str]:
    return json.loads((_BASE / "nombres.json").read_text(encoding="utf-8"))
