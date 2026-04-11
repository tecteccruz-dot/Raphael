from fastapi import APIRouter, HTTPException

from app.esquemas.personaje import CreacionPersonaje
from app.servicios import datos_dnd

router = APIRouter(prefix="/api")


@router.get("/dnd/razas")
def get_razas():
    return datos_dnd.razas()


@router.get("/dnd/clases")
def get_clases():
    return datos_dnd.clases()


@router.get("/dnd/trasfondos")
def get_trasfondos():
    return datos_dnd.trasfondos()


@router.get("/dnd/reglas")
def get_reglas():
    return datos_dnd.reglas()


@router.get("/dnd/nombres")
def get_nombres():
    return datos_dnd.nombres()


@router.post("/personaje/preparar")
def preparar_personaje(datos: CreacionPersonaje):
    # Importación local para evitar ciclos en el arranque
    from app.websocket.gestor_conexiones import gestor_conexiones

    _razas = datos_dnd.razas()
    _clases = datos_dnd.clases()
    _trasfondos = datos_dnd.trasfondos()

    if datos.raza not in _razas:
        raise HTTPException(status_code=400, detail=f"Raza '{datos.raza}' no reconocida.")
    if datos.clase not in _clases:
        raise HTTPException(status_code=400, detail=f"Clase '{datos.clase}' no reconocida.")
    if datos.trasfondo not in _trasfondos:
        raise HTTPException(status_code=400, detail=f"Trasfondo '{datos.trasfondo}' no reconocido.")

    gestor_conexiones.registrar_personaje_pendiente(
        datos.sala_id, datos.nombre, datos.model_dump()
    )
    return {"ok": True}
