from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pathlib import Path

import aiofiles

router = APIRouter(prefix="/api")

_AVATARS = Path("static/avatars")
_TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = 3 * 1024 * 1024  # 3 MB


def normalizar_nombre_avatar(nombre: str) -> str:
    return "".join(c for c in nombre if c.isalnum() or c in "-_")[:32]


def obtener_avatar_url(nombre: str) -> str | None:
    safe = normalizar_nombre_avatar(nombre)
    if not safe:
        return None

    destino = _AVATARS / f"{safe}.png"
    if not destino.exists():
        return None

    return f"/static/avatars/{safe}.png"


@router.post("/avatar/subir", summary="Subir avatar de jugador")
async def subir_avatar(
    nombre: str = Form(...),
    file: UploadFile = File(...),
):
    if file.content_type not in _TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa JPG, PNG o WebP.",
        )

    contenido = await file.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="La imagen no puede superar 3 MB.",
        )

    safe = normalizar_nombre_avatar(nombre)
    if not safe:
        raise HTTPException(status_code=400, detail="Nombre de jugador inválido.")

    _AVATARS.mkdir(parents=True, exist_ok=True)
    destino = _AVATARS / f"{safe}.png"

    async with aiofiles.open(destino, "wb") as f:
        await f.write(contenido)

    return {"ok": True, "url": f"/static/avatars/{safe}.png"}
