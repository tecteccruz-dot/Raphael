from dataclasses import asdict, dataclass

from fastapi import WebSocket

from app.api.avatar import obtener_avatar_url
from app.servicios import sesiones_jugador

# ---------------------------------------------------------------------------
# Constantes D&D
# ---------------------------------------------------------------------------

_HABILIDAD_A_ATRIBUTO: dict[str, str] = {
    "Acrobacias": "des", "Arcanos": "int", "Atletismo": "fue",
    "Engaño": "car", "Historia": "int", "Intimidación": "car",
    "Investigación": "int", "Juego de manos": "des", "Medicina": "sab",
    "Naturaleza": "int", "Percepción": "sab", "Actuación": "car",
    "Persuasión": "car", "Religión": "int", "Sigilo": "des",
    "Supervivencia": "sab", "Perspicacia": "sab", "Trato con animales": "sab",
}

_SLOTS_MAGIA_NIVEL_1: dict[str, int] = {
    "barbaro": 0, "guerrero": 0, "monje": 0, "paladin": 0,
    "explorador": 0, "picaro": 0,
    "bardo": 2, "clerigo": 2, "druida": 2, "mago": 2,
    "hechicero": 2, "brujo": 1,
}

_ATRIBUTOS_VALIDOS = {"fue", "des", "con", "int", "sab", "car"}


# ---------------------------------------------------------------------------
# Funciones auxiliares de construcción del personaje
# ---------------------------------------------------------------------------

def _mod(valor: int) -> int:
    return (valor - 10) // 2


def _calcular_atributos_finales(
    base: dict[str, int],
    raza_data: dict,
    subraza_id: str | None,
    mods_libres: dict[str, int] | None,
) -> dict[str, int]:
    resultado = dict(base)

    mods = raza_data.get("modificadores", raza_data.get("modificadores_base", {}))
    for attr, bonus in mods.items():
        if attr in _ATRIBUTOS_VALIDOS:
            resultado[attr] = min(20, resultado[attr] + bonus)

    if subraza_id:
        sub = raza_data.get("subrazas", {}).get(subraza_id, {})
        for attr, bonus in sub.get("modificadores", {}).items():
            if attr in _ATRIBUTOS_VALIDOS:
                resultado[attr] = min(20, resultado[attr] + bonus)

    for attr, bonus in (mods_libres or {}).items():
        if attr in _ATRIBUTOS_VALIDOS:
            resultado[attr] = min(20, resultado[attr] + bonus)

    return resultado


def _calcular_pg(clase_data: dict, atributos: dict[str, int]) -> int:
    return clase_data["dado_golpe"] + _mod(atributos["con"])


def _calcular_tiradas(habilidades: list[str], atributos: dict[str, int]) -> list[str]:
    tiradas: list[str] = []
    for hab in habilidades:
        attr = _HABILIDAD_A_ATRIBUTO.get(hab)
        if not attr:
            continue
        total = _mod(atributos.get(attr, 10)) + 2  # +2 competencia nivel 1
        signo = "+" if total >= 0 else ""
        tiradas.append(f"{hab} {signo}{total}")
    return tiradas


def _extraer_equipo(opciones: list) -> list[str]:
    return [op[0] if isinstance(op, list) else op for op in opciones]


def _construir_inventario(
    clase_data: dict,
    trasfondo_data: dict,
    raza_data: dict,
    subraza_id: str | None,
) -> list[dict]:
    inv: list[dict] = []
    for item in _extraer_equipo(clase_data.get("equipo_inicial", [])):
        inv.append({"icono": "[C]", "nombre": item, "detalle": clase_data["nombre"], "cantidad": 1})
    for item in trasfondo_data.get("equipo_inicial", []):
        inv.append({"icono": "[T]", "nombre": item, "detalle": trasfondo_data["nombre"], "cantidad": 1})
    for item in raza_data.get("equipo_inicial", []):
        inv.append({"icono": "[R]", "nombre": item, "detalle": "Equipo racial", "cantidad": 1})
    if subraza_id:
        sub = raza_data.get("subrazas", {}).get(subraza_id, {})
        for item in sub.get("equipo_inicial", []):
            inv.append({"icono": "[R]", "nombre": item, "detalle": "Subraza", "cantidad": 1})
    return inv


def _construir_habilidades_clase(clase_data: dict, trasfondo_data: dict) -> list[str]:
    return list(clase_data.get("rasgos_nivel_1", [])) + (
        [trasfondo_data["rasgo"]] if trasfondo_data.get("rasgo") else []
    )


def _construir_pasivas(raza_data: dict, subraza_id: str | None) -> list[str]:
    pasivas = list(raza_data.get("rasgos", []))
    if subraza_id:
        sub = raza_data.get("subrazas", {}).get(subraza_id, {})
        pasivas.extend(sub.get("rasgos", []))
    return pasivas


def crear_perfil_desde_datos(datos: dict) -> "PerfilJugador":
    from app.servicios import datos_dnd as _dnd

    raza_id: str = datos["raza"]
    subraza_id: str | None = datos.get("subraza")
    clase_id: str = datos["clase"]
    trasfondo_id: str = datos["trasfondo"]
    mods_libres: dict[str, int] | None = datos.get("modificadores_libres")
    habilidades_elegidas: list[str] = datos.get("habilidades_elegidas", [])

    raza_data = _dnd.razas()[raza_id]
    clase_data = _dnd.clases()[clase_id]
    trasfondo_data = _dnd.trasfondos()[trasfondo_id]

    atributos = _calcular_atributos_finales(datos["atributos"], raza_data, subraza_id, mods_libres)
    pg = max(1, _calcular_pg(clase_data, atributos))
    mana = _SLOTS_MAGIA_NIVEL_1.get(clase_id, 0)

    nombre_raza = raza_data["nombre"]
    if subraza_id:
        sub = raza_data.get("subrazas", {}).get(subraza_id, {})
        nombre_raza = sub.get("nombre", nombre_raza)

    habs_trasfondo: list[str] = trasfondo_data.get("habilidades", [])
    habs_raza: list[str] = list(raza_data.get("competencias", []))
    if subraza_id:
        habs_raza += raza_data.get("subrazas", {}).get(subraza_id, {}).get("competencias", [])
    todas_habilidades = list(dict.fromkeys(habs_trasfondo + habs_raza + habilidades_elegidas))

    return PerfilJugador(
        nombre=datos["nombre"],
        raza=nombre_raza,
        clase=clase_data["nombre"],
        trasfondo=trasfondo_data["nombre"],
        nivel=1,
        vida_actual=pg,
        vida_maxima=pg,
        mana_actual=mana,
        mana_maximo=mana,
        xp_actual=0,
        xp_maximo=300,
        estadisticas=atributos,
        habilidades=_construir_habilidades_clase(clase_data, trasfondo_data),
        pasivas=_construir_pasivas(raza_data, subraza_id),
        tiradas=_calcular_tiradas(todas_habilidades, atributos),
        inventario=_construir_inventario(clase_data, trasfondo_data, raza_data, subraza_id),
        resumen=(
            f"{nombre_raza} {clase_data['nombre']} · Trasfondo: {trasfondo_data['nombre']} · "
            f"PG {pg} · "
            f"FUE {atributos['fue']} DES {atributos['des']} CON {atributos['con']} "
            f"INT {atributos['int']} SAB {atributos['sab']} CAR {atributos['car']}."
        ),
        avatar_url=obtener_avatar_url(datos["nombre"]),
    )


# ---------------------------------------------------------------------------

ARQUETIPOS_BASE = (
    {
        "clase": "Guerrero del Alba",
        "nivel": 3,
        "vida_actual": 34,
        "vida_maxima": 34,
        "mana_actual": 8,
        "mana_maximo": 12,
        "xp_actual": 180,
        "xp_maximo": 300,
        "estadisticas": {
            "fue": 15,
            "des": 11,
            "con": 14,
            "int": 8,
            "sab": 10,
            "car": 12,
        },
        "habilidades": [
            "Golpe con escudo",
            "Desafio marcial",
            "Segundo aliento",
        ],
        "pasivas": [
            "Guardia inquebrantable",
            "Veterano del frente",
        ],
        "tiradas": [
            "Ataque +5",
            "Defensa +4",
            "Percepcion +2",
        ],
        "inventario": [
            {
                "icono": "[S]",
                "nombre": "Escudo con emblema",
                "detalle": "Bloquea 1 impacto por escena",
                "cantidad": 1,
            },
            {
                "icono": "[P]",
                "nombre": "Tonico rojo",
                "detalle": "Recupera 8 puntos de vida",
                "cantidad": 2,
            },
        ],
        "resumen": "Lider de primera linea. Aguanta castigo y protege al grupo.",
    },
    {
        "clase": "Maga del Velo",
        "nivel": 3,
        "vida_actual": 22,
        "vida_maxima": 22,
        "mana_actual": 28,
        "mana_maximo": 28,
        "xp_actual": 210,
        "xp_maximo": 300,
        "estadisticas": {
            "fue": 7,
            "des": 10,
            "con": 9,
            "int": 16,
            "sab": 14,
            "car": 11,
        },
        "habilidades": [
            "Descarga arcana",
            "Niebla ilusoria",
            "Marca del eclipse",
        ],
        "pasivas": [
            "Canalizacion precisa",
            "Ojo para lo oculto",
        ],
        "tiradas": [
            "Conjuro +6",
            "Investigacion +5",
            "Voluntad +4",
        ],
        "inventario": [
            {
                "icono": "[B]",
                "nombre": "Grimorio plegable",
                "detalle": "Contiene rituales de apoyo",
                "cantidad": 1,
            },
            {
                "icono": "[C]",
                "nombre": "Cristal de foco",
                "detalle": "Mejora conjuros de control",
                "cantidad": 1,
            },
        ],
        "resumen": "Arcanista de control. Lee la escena y cambia el ritmo del combate.",
    },
    {
        "clase": "Explorador Sombrio",
        "nivel": 3,
        "vida_actual": 26,
        "vida_maxima": 26,
        "mana_actual": 14,
        "mana_maximo": 18,
        "xp_actual": 195,
        "xp_maximo": 300,
        "estadisticas": {
            "fue": 10,
            "des": 16,
            "con": 11,
            "int": 12,
            "sab": 13,
            "car": 9,
        },
        "habilidades": [
            "Disparo preciso",
            "Paso lateral",
            "Trampa rapida",
        ],
        "pasivas": [
            "Vision nocturna",
            "Pisada silenciosa",
        ],
        "tiradas": [
            "Sigilo +6",
            "Supervivencia +5",
            "Iniciativa +5",
        ],
        "inventario": [
            {
                "icono": "[A]",
                "nombre": "Arco corto",
                "detalle": "Disparo a distancia media",
                "cantidad": 1,
            },
            {
                "icono": "[T]",
                "nombre": "Kit de trampas",
                "detalle": "Sirve para emboscadas",
                "cantidad": 3,
            },
        ],
        "resumen": "Especialista en movilidad. Encuentra rutas, trampas y blancos debiles.",
    },
    {
        "clase": "Clerigo de Bronce",
        "nivel": 3,
        "vida_actual": 28,
        "vida_maxima": 28,
        "mana_actual": 20,
        "mana_maximo": 24,
        "xp_actual": 205,
        "xp_maximo": 300,
        "estadisticas": {
            "fue": 11,
            "des": 9,
            "con": 13,
            "int": 10,
            "sab": 15,
            "car": 13,
        },
        "habilidades": [
            "Luz restauradora",
            "Sello de amparo",
            "Martillo solar",
        ],
        "pasivas": [
            "Fe templada",
            "Aura de serenidad",
        ],
        "tiradas": [
            "Sanacion +6",
            "Religion +5",
            "Persuasion +4",
        ],
        "inventario": [
            {
                "icono": "[H]",
                "nombre": "Campana sagrada",
                "detalle": "Activa bendiciones menores",
                "cantidad": 1,
            },
            {
                "icono": "[V]",
                "nombre": "Velas rituales",
                "detalle": "Material para plegarias",
                "cantidad": 4,
            },
        ],
        "resumen": "Soporte espiritual. Mantiene con vida al grupo y controla el desgaste.",
    },
)


@dataclass
class PerfilJugador:
    nombre: str
    clase: str
    nivel: int
    vida_actual: int
    vida_maxima: int
    mana_actual: int
    mana_maximo: int
    xp_actual: int
    xp_maximo: int
    estadisticas: dict[str, int]
    habilidades: list[str]
    pasivas: list[str]
    tiradas: list[str]
    inventario: list[dict[str, object]]
    resumen: str
    privacidad_bloqueada: bool = False
    raza: str = ""
    trasfondo: str = ""
    avatar_url: str | None = None


@dataclass
class SesionJugador:
    websocket: WebSocket
    perfil: PerfilJugador
    token_sesion: str | None = None


def obtener_iniciales(nombre: str) -> str:
    partes = [parte for parte in nombre.strip().split() if parte]

    if not partes:
        return "??"

    if len(partes) == 1:
        return partes[0][:2].upper()

    return f"{partes[0][0]}{partes[1][0]}".upper()


def crear_perfil_inicial(nombre: str) -> PerfilJugador:
    indice = sum(ord(caracter) for caracter in nombre.strip().lower()) % len(ARQUETIPOS_BASE)
    base = ARQUETIPOS_BASE[indice]

    return PerfilJugador(
        nombre=nombre,
        clase=base["clase"],
        nivel=base["nivel"],
        vida_actual=base["vida_actual"],
        vida_maxima=base["vida_maxima"],
        mana_actual=base["mana_actual"],
        mana_maximo=base["mana_maximo"],
        xp_actual=base["xp_actual"],
        xp_maximo=base["xp_maximo"],
        estadisticas=dict(base["estadisticas"]),
        habilidades=list(base["habilidades"]),
        pasivas=list(base["pasivas"]),
        tiradas=list(base["tiradas"]),
        inventario=[dict(item) for item in base["inventario"]],
        resumen=base["resumen"],
        privacidad_bloqueada=False,
        avatar_url=obtener_avatar_url(nombre),
    )


def perfil_a_dict(perfil: PerfilJugador) -> dict[str, object]:
    return asdict(perfil)


def perfil_desde_dict(datos: dict[str, object]) -> PerfilJugador:
    payload = dict(datos or {})
    return PerfilJugador(
        nombre=str(payload.get("nombre", "")),
        clase=str(payload.get("clase", "")),
        nivel=int(payload.get("nivel", 1) or 1),
        vida_actual=int(payload.get("vida_actual", 0) or 0),
        vida_maxima=int(payload.get("vida_maxima", 1) or 1),
        mana_actual=int(payload.get("mana_actual", 0) or 0),
        mana_maximo=int(payload.get("mana_maximo", 0) or 0),
        xp_actual=int(payload.get("xp_actual", 0) or 0),
        xp_maximo=int(payload.get("xp_maximo", 0) or 0),
        estadisticas=dict(payload.get("estadisticas") or {}),
        habilidades=list(payload.get("habilidades") or []),
        pasivas=list(payload.get("pasivas") or []),
        tiradas=list(payload.get("tiradas") or []),
        inventario=[dict(item) for item in (payload.get("inventario") or []) if isinstance(item, dict)],
        resumen=str(payload.get("resumen", "")),
        privacidad_bloqueada=bool(payload.get("privacidad_bloqueada", False)),
        raza=str(payload.get("raza", "")),
        trasfondo=str(payload.get("trasfondo", "")),
        avatar_url=payload.get("avatar_url"),
    )


class GestorConexiones:
    def __init__(self) -> None:
        # sala_id -> { nombre_jugador: sesion }
        self.conexiones_por_sala: dict[str, dict[str, SesionJugador]] = {}
        # (sala_id, token_o_nombre) -> datos de personaje pendientes de conectar
        self.personajes_pendientes: dict[tuple[str, str], dict] = {}
        # sala_id -> eventos recientes relevantes para la IA
        self.historial_por_sala: dict[str, list[dict[str, str]]] = {}

    def registrar_personaje_pendiente(
        self,
        sala_id: str,
        nombre: str,
        datos: dict,
        token_sesion: str | None = None,
    ) -> None:
        clave = (token_sesion or "").strip() or nombre
        self.personajes_pendientes[(sala_id, clave)] = dict(datos)
        sesiones_jugador.registrar_preparacion(sala_id, nombre, token_sesion, dict(datos))

    async def conectar(self, sala_id: str, nombre: str, websocket: WebSocket) -> tuple[bool, str]:
        await websocket.accept()
        token_sesion = (websocket.query_params.get("token") or "").strip() or None

        sala = self.conexiones_por_sala.setdefault(sala_id, {})

        if nombre in sala:
            sesion_existente = sala[nombre]
            if token_sesion and sesion_existente.token_sesion == token_sesion:
                try:
                    await sesion_existente.websocket.close(code=4001)
                except Exception:
                    pass
                self.desconectar(sala_id, nombre)
            else:
                await websocket.send_json(
                    {
                        "tipo": "error",
                        "mensaje": f"Ya existe un jugador con el nombre '{nombre}' en la sala '{sala_id}'.",
                    }
                )
                await websocket.close(code=1008)
                return False, "nombre_duplicado"

        datos_pendientes = None
        if token_sesion:
            datos_pendientes = self.personajes_pendientes.pop((sala_id, token_sesion), None)

        if not datos_pendientes:
            datos_pendientes = self.personajes_pendientes.pop((sala_id, nombre), None)

        perfil: PerfilJugador | None = None
        if datos_pendientes:
            try:
                perfil = crear_perfil_desde_datos(datos_pendientes)
            except Exception:
                perfil = None

        if perfil is None and token_sesion:
            sesion_guardada = sesiones_jugador.obtener_sesion(sala_id, token_sesion)
            if sesion_guardada:
                perfil_guardado = sesion_guardada.get("perfil")
                datos_guardados = sesion_guardada.get("datos_creacion")
                try:
                    if isinstance(perfil_guardado, dict):
                        perfil = perfil_desde_dict(perfil_guardado)
                    elif isinstance(datos_guardados, dict):
                        perfil = crear_perfil_desde_datos(datos_guardados)
                except Exception:
                    perfil = None

        if perfil is None:
            perfil = crear_perfil_inicial(nombre)

        try:
            from app.servicios.combate import gestor_combate as _gestor_combate

            combate = _gestor_combate.contexto_ia(sala_id)
            for actor in combate.get("actores", []):
                if str(actor.get("jugador_nombre") or actor.get("nombre") or "").casefold() == nombre.casefold():
                    if actor.get("vida_actual") is not None:
                        perfil.vida_actual = int(actor["vida_actual"])
                    if actor.get("vida_maxima") is not None:
                        perfil.vida_maxima = int(actor["vida_maxima"])
                    if actor.get("mana_actual") is not None:
                        perfil.mana_actual = int(actor["mana_actual"])
                    if actor.get("mana_maximo") is not None:
                        perfil.mana_maximo = int(actor["mana_maximo"])
                    if actor.get("xp_actual") is not None:
                        perfil.xp_actual = int(actor["xp_actual"])
                    if actor.get("xp_maximo") is not None:
                        perfil.xp_maximo = int(actor["xp_maximo"])
                    if actor.get("raza"):
                        perfil.raza = str(actor["raza"])
                    if actor.get("trasfondo"):
                        perfil.trasfondo = str(actor["trasfondo"])
                    if actor.get("resumen"):
                        perfil.resumen = str(actor["resumen"])
                    break
        except Exception:
            pass

        sala[nombre] = SesionJugador(websocket=websocket, perfil=perfil, token_sesion=token_sesion)
        sesiones_jugador.guardar_perfil(sala_id, nombre, token_sesion, perfil_a_dict(perfil))

        await websocket.send_json(
            {
                "tipo": "conexion_ok",
                "mensaje": f"Conectado a la sala '{sala_id}' como '{nombre}'.",
                "session_token": token_sesion,
            }
        )

        return True, "ok"

    def desconectar(self, sala_id: str, nombre: str) -> None:
        sala = self.conexiones_por_sala.get(sala_id)

        if not sala:
            return

        sesion = sala.pop(nombre, None)
        if sesion:
            sesiones_jugador.guardar_perfil(
                sala_id,
                nombre,
                sesion.token_sesion,
                perfil_a_dict(sesion.perfil),
            )

        if not sala:
            self.conexiones_por_sala.pop(sala_id, None)

    async def enviar_json_personal(self, websocket: WebSocket, datos: dict) -> None:
        await websocket.send_json(datos)

    async def enviar_json_a_sala(self, sala_id: str, datos: dict) -> None:
        sala = self.conexiones_por_sala.get(sala_id, {})
        nombres_a_quitar: list[str] = []
        self._registrar_evento_historial(sala_id, datos)

        for nombre, sesion in list(sala.items()):
            try:
                await sesion.websocket.send_json(datos)
            except Exception:
                nombres_a_quitar.append(nombre)

        for nombre in nombres_a_quitar:
            self.desconectar(sala_id, nombre)

    def actualizar_privacidad(self, sala_id: str, nombre: str, bloqueado: bool) -> bool:
        sala = self.conexiones_por_sala.get(sala_id, {})
        sesion = sala.get(nombre)

        if not sesion:
            return False

        sesion.perfil.privacidad_bloqueada = bloqueado
        sesiones_jugador.guardar_perfil(
            sala_id,
            nombre,
            sesion.token_sesion,
            perfil_a_dict(sesion.perfil),
        )
        return True

    def _registrar_evento_historial(self, sala_id: str, datos: dict[str, object]) -> None:
        tipo = str(datos.get("tipo") or "").strip().lower()
        if tipo not in {"chat", "ia", "sistema"}:
            return

        mensaje = str(datos.get("mensaje") or "").strip()
        if not mensaje:
            return

        historial = self.historial_por_sala.setdefault(sala_id, [])
        historial.append(
            {
                "tipo": tipo,
                "autor": str(datos.get("autor") or ("Sistema" if tipo == "sistema" else "Raphael")).strip(),
                "mensaje": mensaje,
            }
        )

        if len(historial) > 40:
            del historial[:-40]

    def obtener_historial_sala(self, sala_id: str, limite: int = 12) -> list[dict[str, str]]:
        historial = self.historial_por_sala.get(sala_id, [])
        if limite <= 0:
            return [dict(item) for item in historial]
        return [dict(item) for item in historial[-limite:]]

    def limpiar_historial(self, sala_id: str) -> None:
        self.historial_por_sala.pop(sala_id, None)

    async def cerrar_sala(self, sala_id: str, mensaje: str | None = None) -> int:
        sala_limpia = str(sala_id or "").strip()
        sala = self.conexiones_por_sala.pop(sala_limpia, {})
        self.historial_por_sala.pop(sala_limpia, None)

        claves_pendientes = [
            clave
            for clave in self.personajes_pendientes
            if str(clave[0] or "").strip().upper() == sala_limpia.upper()
        ]
        for clave in claves_pendientes:
            self.personajes_pendientes.pop(clave, None)

        if not sala:
            return 0

        if mensaje:
            payload = {"tipo": "sistema", "mensaje": mensaje}
            for sesion in list(sala.values()):
                try:
                    await sesion.websocket.send_json(payload)
                except Exception:
                    pass

        total = 0
        for sesion in list(sala.values()):
            try:
                await sesion.websocket.close(code=4002)
            except Exception:
                pass
            total += 1

        return total

    async def expulsar_jugador(self, sala_id: str, nombre: str) -> bool:
        sala = self.conexiones_por_sala.get(sala_id, {})
        sesion = sala.get(nombre)
        if not sesion:
            return False
        try:
            await sesion.websocket.send_json({
                "tipo": "expulsado",
                "mensaje": "El host te ha expulsado de la sala.",
            })
            await sesion.websocket.close(code=4000)
        except Exception:
            pass
        self.desconectar(sala_id, nombre)
        return True

    def _serializar_perfil_para(self, perfil: PerfilJugador, destinatario: str) -> dict[str, object]:
        puede_ver = destinatario == perfil.nombre or not perfil.privacidad_bloqueada

        datos: dict[str, object] = {
            "nombre": perfil.nombre,
            "iniciales": obtener_iniciales(perfil.nombre),
            "avatar_url": perfil.avatar_url,
            "privacidad_bloqueada": perfil.privacidad_bloqueada,
            "puede_ver": puede_ver,
        }

        if not puede_ver:
            datos.update(
                {
                    "clase": "Informacion bloqueada",
                    "nivel": None,
                    "vida_actual": None,
                    "vida_maxima": None,
                    "mana_actual": None,
                    "mana_maximo": None,
                    "xp_actual": None,
                    "xp_maximo": None,
                    "estadisticas": {},
                    "habilidades": [],
                    "pasivas": [],
                    "tiradas": [],
                    "inventario": [],
                    "resumen": "Este jugador ha bloqueado su ficha.",
                }
            )
            return datos

        datos.update(
            {
                "clase": perfil.clase,
                "raza": perfil.raza,
                "trasfondo": perfil.trasfondo,
                "nivel": perfil.nivel,
                "vida_actual": perfil.vida_actual,
                "vida_maxima": perfil.vida_maxima,
                "mana_actual": perfil.mana_actual,
                "mana_maximo": perfil.mana_maximo,
                "xp_actual": perfil.xp_actual,
                "xp_maximo": perfil.xp_maximo,
                "estadisticas": dict(perfil.estadisticas),
                "habilidades": list(perfil.habilidades),
                "pasivas": list(perfil.pasivas),
                "tiradas": list(perfil.tiradas),
                "inventario": [dict(item) for item in perfil.inventario],
                "resumen": perfil.resumen,
            }
        )
        return datos

    def construir_evento_chat(self, sala_id: str, nombre: str, mensaje: str) -> dict[str, object]:
        sala = self.conexiones_por_sala.get(sala_id, {})
        sesion = sala.get(nombre)
        perfil = sesion.perfil if sesion else None

        autor = perfil.nombre if perfil else nombre
        avatar_url = perfil.avatar_url if perfil else obtener_avatar_url(nombre)

        return {
            "tipo": "chat",
            "autor": autor,
            "iniciales": obtener_iniciales(autor),
            "avatar_url": avatar_url,
            "mensaje": mensaje,
        }

    def obtener_jugadores_sala(self, sala_id: str) -> list[str]:
        sala = self.conexiones_por_sala.get(sala_id, {})
        return sorted(sala.keys())

    def obtener_perfiles_sala(self, sala_id: str) -> list[PerfilJugador]:
        sala = self.conexiones_por_sala.get(sala_id, {})
        return [sesion.perfil for _, sesion in sorted(sala.items(), key=lambda item: item[0].casefold())]

    def obtener_resumen_jugadores_sala(self, sala_id: str) -> list[dict[str, object]]:
        resumenes: list[dict[str, object]] = []

        for perfil in self.obtener_perfiles_sala(sala_id):
            resumenes.append(
                {
                    "nombre": perfil.nombre,
                    "clase": perfil.clase,
                    "raza": perfil.raza,
                    "nivel": perfil.nivel,
                    "vida_actual": perfil.vida_actual,
                    "vida_maxima": perfil.vida_maxima,
                    "mana_actual": perfil.mana_actual,
                    "mana_maximo": perfil.mana_maximo,
                    "xp_actual": perfil.xp_actual,
                    "xp_maximo": perfil.xp_maximo,
                    "estadisticas": dict(perfil.estadisticas),
                    "habilidades": list(perfil.habilidades),
                    "pasivas": list(perfil.pasivas),
                    "tiradas": list(perfil.tiradas),
                    "inventario": [dict(item) for item in perfil.inventario],
                    "trasfondo": perfil.trasfondo,
                    "resumen": perfil.resumen,
                    "avatar_url": perfil.avatar_url,
                }
            )

        return resumenes

    def actualizar_perfil_jugador(
        self,
        sala_id: str,
        nombre: str,
        *,
        vida_actual: int | None = None,
        vida_maxima: int | None = None,
        mana_actual: int | None = None,
        mana_maximo: int | None = None,
        xp_actual: int | None = None,
        xp_maximo: int | None = None,
        resumen: str | None = None,
    ) -> bool:
        sala = self.conexiones_por_sala.get(sala_id, {})
        sesion = sala.get(nombre)
        perfil = sesion.perfil if sesion else None

        if not perfil:
            sesion_guardada = sesiones_jugador.obtener_sesion_por_nombre(sala_id, nombre)
            perfil_guardado = sesion_guardada.get("perfil") if sesion_guardada else None
            if not isinstance(perfil_guardado, dict):
                return False
            try:
                perfil = perfil_desde_dict(perfil_guardado)
            except Exception:
                return False

        if vida_maxima is not None:
            perfil.vida_maxima = max(1, int(vida_maxima))

        if vida_actual is not None:
            maximo = int(perfil.vida_maxima or 1)
            perfil.vida_actual = max(0, min(int(vida_actual), maximo))

        if mana_maximo is not None:
            perfil.mana_maximo = max(0, int(mana_maximo))

        if mana_actual is not None:
            maximo_mana = int(perfil.mana_maximo or 0)
            perfil.mana_actual = max(0, min(int(mana_actual), maximo_mana))

        if xp_maximo is not None:
            perfil.xp_maximo = max(0, int(xp_maximo))

        if xp_actual is not None:
            maximo_xp = int(perfil.xp_maximo or 0)
            if maximo_xp > 0:
                perfil.xp_actual = max(0, min(int(xp_actual), maximo_xp))
            else:
                perfil.xp_actual = max(0, int(xp_actual))

        if resumen is not None:
            perfil.resumen = str(resumen)

        sesiones_jugador.guardar_perfil(
            sala_id,
            nombre,
            sesion.token_sesion if sesion else None,
            perfil_a_dict(perfil),
        )
        sesiones_jugador.guardar_perfil_por_nombre(sala_id, nombre, perfil_a_dict(perfil))
        return True

    def actualizar_vida_jugador(
        self,
        sala_id: str,
        nombre: str,
        *,
        vida_actual: int | None = None,
        vida_maxima: int | None = None,
    ) -> bool:
        return self.actualizar_perfil_jugador(
            sala_id,
            nombre,
            vida_actual=vida_actual,
            vida_maxima=vida_maxima,
        )

    async def enviar_presencia_a_sala(self, sala_id: str) -> None:
        sala = self.conexiones_por_sala.get(sala_id, {})
        nombres_a_quitar: list[str] = []
        nombres_ordenados = sorted(sala.keys(), key=str.casefold)

        for destinatario, sesion in list(sala.items()):
            jugadores = [
                self._serializar_perfil_para(sala[nombre].perfil, destinatario)
                for nombre in nombres_ordenados
            ]

            try:
                await sesion.websocket.send_json(
                    {
                        "tipo": "presencia",
                        "jugadores": jugadores,
                        "total": len(jugadores),
                    }
                )
            except Exception:
                nombres_a_quitar.append(destinatario)

        for nombre in nombres_a_quitar:
            self.desconectar(sala_id, nombre)


gestor_conexiones = GestorConexiones()
