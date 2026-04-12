from __future__ import annotations

from dataclasses import dataclass, field
import random
import secrets


ESTADOS_ACTOR = {"listo", "caido", "incapacitado", "muerto"}
ESTADOS_ACTUAN = {"listo"}
TIPOS_ACTOR = {"jugador", "npc"}
CONTROLES_ACTOR = {"jugador", "ia"}


def _mod(valor: int | None) -> int:
    return ((valor or 10) - 10) // 2


def _nuevo_actor_id(prefijo: str) -> str:
    return f"{prefijo}_{secrets.token_hex(4)}"


@dataclass
class ActorCombate:
    id: str
    nombre: str
    tipo: str
    control: str
    iniciativa: int
    vida_actual: int | None = None
    vida_maxima: int | None = None
    estado: str = "listo"
    avatar_url: str | None = None
    raza: str | None = None
    trasfondo: str | None = None
    clase: str | None = None
    nivel: int | None = None
    mana_actual: int | None = None
    mana_maximo: int | None = None
    xp_actual: int | None = None
    xp_maximo: int | None = None
    estadisticas: dict[str, int] = field(default_factory=dict)
    habilidades: list[str] = field(default_factory=list)
    pasivas: list[str] = field(default_factory=list)
    tiradas: list[str] = field(default_factory=list)
    inventario: list[dict[str, object]] = field(default_factory=list)
    resumen: str = ""
    jugador_nombre: str | None = None
    orden_creacion: int = 0


@dataclass
class EscenaCombate:
    sala_id: str
    activa: bool = False
    ronda: int = 1
    turno_actor_id: str | None = None
    espera_resolucion: bool = False
    actores: list[ActorCombate] = field(default_factory=list)
    secuencia: int = 0


class GestorCombate:
    def __init__(self) -> None:
        self.escenas_por_sala: dict[str, EscenaCombate] = {}

    def _escena(self, sala_id: str) -> EscenaCombate:
        return self.escenas_por_sala.setdefault(sala_id, EscenaCombate(sala_id=sala_id))

    def _ordenar_actores(self, escena: EscenaCombate) -> None:
        escena.actores.sort(
            key=lambda actor: (
                -int(actor.iniciativa),
                actor.nombre.casefold(),
                actor.orden_creacion,
            )
        )

    def _actor_por_id(self, escena: EscenaCombate, actor_id: str | None) -> ActorCombate | None:
        if not actor_id:
            return None

        for actor in escena.actores:
            if actor.id == actor_id:
                return actor

        return None

    def _actor_actual(self, escena: EscenaCombate) -> ActorCombate | None:
        return self._actor_por_id(escena, escena.turno_actor_id)

    def _actor_jugador(self, escena: EscenaCombate, nombre: str) -> ActorCombate | None:
        buscado = (nombre or "").strip().casefold()
        if not buscado:
            return None

        for actor in escena.actores:
            if actor.jugador_nombre and actor.jugador_nombre.casefold() == buscado:
                return actor

        return None

    def _serializar_actor(self, actor: ActorCombate, *, es_actual: bool) -> dict[str, object]:
        return {
            "id": actor.id,
            "nombre": actor.nombre,
            "tipo": actor.tipo,
            "control": actor.control,
            "iniciativa": actor.iniciativa,
            "vida_actual": actor.vida_actual,
            "vida_maxima": actor.vida_maxima,
            "estado": actor.estado,
            "avatar_url": actor.avatar_url,
            "clase": actor.clase,
            "nivel": actor.nivel,
            "jugador_nombre": actor.jugador_nombre,
            "es_actual": es_actual,
        }

    def _serializar_actor_para_ia(self, actor: ActorCombate, *, es_actual: bool) -> dict[str, object]:
        puede_actuar = actor.estado in ESTADOS_ACTUAN

        # Actores fuera de combate (caido/incapacitado) que no son el actor actual:
        # solo datos mínimos para que la IA sepa que existen pero no los narre actuando.
        if not puede_actuar and not es_actual:
            return {
                "id": actor.id,
                "nombre": actor.nombre,
                "tipo": actor.tipo,
                "estado": actor.estado,
                "puede_actuar": False,
            }

        datos: dict[str, object] = {
            "id": actor.id,
            "nombre": actor.nombre,
            "tipo": actor.tipo,
            "control": actor.control,
            "iniciativa": actor.iniciativa,
            "vida_actual": actor.vida_actual,
            "vida_maxima": actor.vida_maxima,
            "mana_actual": actor.mana_actual,
            "mana_maximo": actor.mana_maximo,
            "estado": actor.estado,
            "clase": actor.clase,
            "nivel": actor.nivel,
            "jugador_nombre": actor.jugador_nombre,
            "es_actual": es_actual,
            "puede_actuar": puede_actuar,
        }
        # Datos detallados: solo para el actor que tiene el turno
        if es_actual:
            datos.update({
                "raza": actor.raza,
                "xp_actual": actor.xp_actual,
                "xp_maximo": actor.xp_maximo,
                "estadisticas": dict(actor.estadisticas),
                "habilidades": list(actor.habilidades),
                "pasivas": list(actor.pasivas),
                "tiradas": list(actor.tiradas),
                "resumen": actor.resumen,
            })
        return datos

    def _buscar_siguiente_listo(
        self,
        escena: EscenaCombate,
        *,
        desde_actor_id: str | None = None,
    ) -> tuple[ActorCombate | None, bool, list[str]]:
        total = len(escena.actores)
        if total == 0:
            return None, False, []

        indice_inicial = -1
        if desde_actor_id:
            for indice, actor in enumerate(escena.actores):
                if actor.id == desde_actor_id:
                    indice_inicial = indice
                    break

        saltados: list[str] = []
        hubo_vuelta = False

        for paso in range(1, total + 1):
            indice = (indice_inicial + paso) % total
            if indice <= indice_inicial:
                hubo_vuelta = True

            actor = escena.actores[indice]
            if actor.estado in ESTADOS_ACTUAN:
                return actor, hubo_vuelta, saltados

            saltados.append(actor.nombre)

        return None, hubo_vuelta, saltados

    def _asegurar_turno_valido(self, escena: EscenaCombate) -> list[str]:
        if not escena.activa:
            escena.turno_actor_id = None
            escena.espera_resolucion = False
            return []

        actual = self._actor_actual(escena)
        if actual and actual.estado in ESTADOS_ACTUAN:
            return []

        siguiente, hubo_vuelta, saltados = self._buscar_siguiente_listo(
            escena,
            desde_actor_id=actual.id if actual else None,
        )

        if not siguiente:
            escena.turno_actor_id = None
            escena.espera_resolucion = False
            return saltados

        if hubo_vuelta and actual:
            escena.ronda += 1

        escena.turno_actor_id = siguiente.id
        escena.espera_resolucion = False
        return saltados

    def estado_publico(self, sala_id: str) -> dict[str, object]:
        escena = self.escenas_por_sala.get(sala_id)
        if not escena:
            return {
                "activa": False,
                "ronda": 0,
                "espera_resolucion": False,
                "actor_actual": None,
                "actores": [],
                "total_actores": 0,
            }

        actual = self._actor_actual(escena)
        return {
            "activa": escena.activa,
            "ronda": escena.ronda if escena.activa else 0,
            "espera_resolucion": escena.espera_resolucion,
            "actor_actual": self._serializar_actor(actual, es_actual=True) if actual else None,
            "actores": [
                self._serializar_actor(actor, es_actual=bool(actual and actor.id == actual.id))
                for actor in escena.actores
            ],
            "total_actores": len(escena.actores),
        }

    def contexto_ia(self, sala_id: str) -> dict[str, object]:
        escena = self.escenas_por_sala.get(sala_id)
        if not escena:
            return {
                "activa": False,
                "ronda": 0,
                "espera_resolucion": False,
                "actor_actual": None,
                "actores": [],
                "total_actores": 0,
            }

        actual = self._actor_actual(escena)
        actores_vivos = [a for a in escena.actores if a.estado != "muerto"]
        actores_muertos = [a for a in escena.actores if a.estado == "muerto"]
        return {
            "activa": escena.activa,
            "ronda": escena.ronda if escena.activa else 0,
            "espera_resolucion": escena.espera_resolucion,
            "actor_actual": self._serializar_actor_para_ia(actual, es_actual=True) if actual else None,
            "actores": [
                self._serializar_actor_para_ia(actor, es_actual=bool(actual and actor.id == actual.id))
                for actor in actores_vivos
            ],
            "bajas": [{"nombre": a.nombre, "tipo": a.tipo} for a in actores_muertos],
            "total_actores": len(actores_vivos),
        }

    def buscar_actor(
        self,
        sala_id: str,
        *,
        actor_id: str | None = None,
        referencia: str | None = None,
    ) -> ActorCombate | None:
        escena = self.escenas_por_sala.get(sala_id)
        if not escena:
            return None

        if actor_id:
            encontrado = self._actor_por_id(escena, actor_id)
            if encontrado:
                return encontrado

        buscado = str(referencia or "").strip().casefold()
        if not buscado:
            return None

        for actor in escena.actores:
            if actor.nombre.casefold() == buscado:
                return actor
            if actor.jugador_nombre and actor.jugador_nombre.casefold() == buscado:
                return actor
            if actor.id.casefold() == buscado:
                return actor

        return None

    def recalcular_escena(self, sala_id: str) -> dict[str, object]:
        escena = self._escena(sala_id)
        self._ordenar_actores(escena)
        self._asegurar_turno_valido(escena)
        return self.estado_publico(sala_id)

    def iniciar_con_jugadores(self, sala_id: str, jugadores: list[dict[str, object]]) -> dict[str, object]:
        if not jugadores:
            raise ValueError("No hay jugadores conectados para iniciar el encuentro.")

        escena = self._escena(sala_id)
        escena.activa = True
        escena.ronda = 1
        escena.turno_actor_id = None
        escena.espera_resolucion = False
        escena.actores = []
        escena.secuencia = 0

        for jugador in jugadores:
            escena.secuencia += 1
            estadisticas = jugador.get("estadisticas") or {}
            iniciativa = random.randint(1, 20) + _mod(estadisticas.get("des"))
            vida_maxima = int(jugador.get("vida_maxima") or 1)
            vida_actual = int(jugador.get("vida_actual") or vida_maxima)
            escena.actores.append(
                ActorCombate(
                    id=_nuevo_actor_id("jugador"),
                    nombre=str(jugador.get("nombre") or "Jugador"),
                    tipo="jugador",
                    control="jugador",
                    iniciativa=iniciativa,
                    vida_actual=vida_actual,
                    vida_maxima=vida_maxima,
                    estado="listo",
                    avatar_url=jugador.get("avatar_url"),
                    raza=str(jugador.get("raza") or ""),
                    trasfondo=str(jugador.get("trasfondo") or ""),
                    clase=str(jugador.get("clase") or ""),
                    nivel=int(jugador.get("nivel") or 1),
                    mana_actual=int(jugador.get("mana_actual") or 0),
                    mana_maximo=int(jugador.get("mana_maximo") or 0),
                    xp_actual=int(jugador.get("xp_actual") or 0),
                    xp_maximo=int(jugador.get("xp_maximo") or 0),
                    estadisticas=dict(jugador.get("estadisticas") or {}),
                    habilidades=list(jugador.get("habilidades") or []),
                    pasivas=list(jugador.get("pasivas") or []),
                    tiradas=list(jugador.get("tiradas") or []),
                    inventario=[dict(item) for item in (jugador.get("inventario") or []) if isinstance(item, dict)],
                    resumen=str(jugador.get("resumen") or ""),
                    jugador_nombre=str(jugador.get("nombre") or ""),
                    orden_creacion=escena.secuencia,
                )
            )

        self._ordenar_actores(escena)
        siguiente, _, _ = self._buscar_siguiente_listo(escena)
        escena.turno_actor_id = siguiente.id if siguiente else None
        return self.estado_publico(sala_id)

    def detener(self, sala_id: str) -> dict[str, object]:
        escena = self._escena(sala_id)
        escena.activa = False
        escena.turno_actor_id = None
        escena.espera_resolucion = False
        return self.estado_publico(sala_id)

    def agregar_npc(
        self,
        sala_id: str,
        *,
        nombre: str,
        iniciativa: int,
        vida_maxima: int,
        vida_actual: int | None = None,
        control: str = "ia",
        ajustar_turno: bool = True,
    ) -> dict[str, object]:
        escena = self._escena(sala_id)
        if not escena.activa:
            raise ValueError("Primero inicia un encuentro para agregar actores.")

        nombre_limpio = (nombre or "").strip()
        if len(nombre_limpio) < 2:
            raise ValueError("El NPC debe tener al menos 2 caracteres en el nombre.")

        control_limpio = (control or "ia").strip().lower()
        if control_limpio not in CONTROLES_ACTOR:
            raise ValueError("El control del actor no es valido.")

        vida_max = max(1, int(vida_maxima or 1))
        vida_now = int(vida_actual if vida_actual is not None else vida_max)
        vida_now = max(0, min(vida_now, vida_max))
        actual_id = escena.turno_actor_id

        escena.secuencia += 1
        escena.actores.append(
            ActorCombate(
                id=_nuevo_actor_id("npc"),
                nombre=nombre_limpio[:40],
                tipo="npc",
                control=control_limpio,
                iniciativa=int(iniciativa),
                vida_actual=vida_now,
                vida_maxima=vida_max,
                estado="listo" if vida_now > 0 else "caido",
                orden_creacion=escena.secuencia,
            )
        )

        self._ordenar_actores(escena)
        escena.turno_actor_id = actual_id or escena.turno_actor_id
        if ajustar_turno:
            self._asegurar_turno_valido(escena)
        return self.estado_publico(sala_id)

    def editar_actor(
        self,
        sala_id: str,
        actor_id: str,
        *,
        iniciativa: int | None = None,
        vida_actual: int | None = None,
        vida_maxima: int | None = None,
        mana_actual: int | None = None,
        mana_maximo: int | None = None,
        xp_actual: int | None = None,
        xp_maximo: int | None = None,
        estado: str | None = None,
        ajustar_turno: bool = True,
    ) -> tuple[dict[str, object], ActorCombate]:
        escena = self._escena(sala_id)
        actor = self._actor_por_id(escena, actor_id)
        if not actor:
            raise ValueError("No encontramos el actor indicado.")

        if vida_maxima is not None:
            actor.vida_maxima = max(1, int(vida_maxima))

        if vida_actual is not None:
            maximo = int(actor.vida_maxima or max(1, vida_actual))
            actor.vida_actual = max(0, min(int(vida_actual), maximo))

        if mana_maximo is not None:
            actor.mana_maximo = max(0, int(mana_maximo))

        if mana_actual is not None:
            maximo_mana = int(actor.mana_maximo or 0)
            actor.mana_actual = max(0, min(int(mana_actual), maximo_mana))

        if xp_maximo is not None:
            actor.xp_maximo = max(0, int(xp_maximo))

        if xp_actual is not None:
            maximo_xp = int(actor.xp_maximo or 0)
            if maximo_xp > 0:
                actor.xp_actual = max(0, min(int(xp_actual), maximo_xp))
            else:
                actor.xp_actual = max(0, int(xp_actual))

        if iniciativa is not None:
            actor.iniciativa = int(iniciativa)

        if estado is not None:
            estado_limpio = str(estado).strip().lower()
            if estado_limpio not in ESTADOS_ACTOR:
                raise ValueError("El estado del actor no es valido.")
            actor.estado = estado_limpio

        if actor.vida_actual is not None and actor.vida_actual <= 0 and actor.estado == "listo":
            actor.estado = "caido"

        if (
            estado is None
            and actor.vida_actual is not None
            and actor.vida_actual > 0
            and actor.estado in {"caido", "incapacitado"}
        ):
            actor.estado = "listo"

        if actor.estado == "muerto":
            actor.vida_actual = 0

        self._ordenar_actores(escena)
        if ajustar_turno:
            self._asegurar_turno_valido(escena)
        return self.estado_publico(sala_id), actor

    def marcar_caida(self, sala_id: str, actor_id: str) -> tuple[dict[str, object], ActorCombate]:
        return self.editar_actor(sala_id, actor_id, vida_actual=0, estado="caido")

    def resolver_salvacion(self, sala_id: str, actor_id: str) -> tuple[dict[str, object], ActorCombate, int, bool]:
        escena = self._escena(sala_id)
        actor = self._actor_por_id(escena, actor_id)
        if not actor:
            raise ValueError("No encontramos el actor indicado.")

        tirada = random.randint(1, 20)
        exito = tirada >= 10
        estado = "incapacitado" if exito else "muerto"
        datos, actor_actualizado = self.editar_actor(sala_id, actor_id, vida_actual=0, estado=estado)
        return datos, actor_actualizado, tirada, exito

    def revivir_actor(
        self,
        sala_id: str,
        actor_id: str,
        *,
        vida_actual: int = 1,
    ) -> tuple[dict[str, object], ActorCombate]:
        escena = self._escena(sala_id)
        actor = self._actor_por_id(escena, actor_id)
        if not actor:
            raise ValueError("No encontramos el actor indicado.")

        maximo = int(actor.vida_maxima or 1)
        vida = max(1, min(int(vida_actual), maximo))
        return self.editar_actor(sala_id, actor_id, vida_actual=vida, estado="listo")

    def quitar_actor(self, sala_id: str, actor_id: str) -> dict[str, object]:
        escena = self._escena(sala_id)
        actual_id = escena.turno_actor_id
        escena.actores = [actor for actor in escena.actores if actor.id != actor_id]
        if actual_id == actor_id:
            escena.turno_actor_id = None
        self._ordenar_actores(escena)
        self._asegurar_turno_valido(escena)
        return self.estado_publico(sala_id)

    def validar_accion_jugador(self, sala_id: str, nombre: str) -> tuple[bool, str | None]:
        escena = self.escenas_por_sala.get(sala_id)
        if not escena or not escena.activa:
            return True, None

        actor = self._actor_jugador(escena, nombre)
        if not actor:
            return False, "No formas parte de la escena activa."

        if actor.estado == "muerto":
            return False, "Tu personaje esta muerto y no puede actuar."

        if actor.estado == "caido":
            return False, "Tu personaje esta caido y debe resolver una tirada de salvacion."

        if actor.estado == "incapacitado":
            return False, "Tu personaje esta incapacitado y su turno se omite."

        actual = self._actor_actual(escena)
        if not actual or actual.id != actor.id:
            return False, "No es tu turno."

        if actual.control != "jugador":
            return False, "Este turno esta controlado por la IA."

        if escena.espera_resolucion:
            return False, "La accion actual ya fue enviada y esta pendiente de resolucion."

        return True, None

    def registrar_accion_jugador(self, sala_id: str, nombre: str) -> dict[str, object]:
        permitido, mensaje = self.validar_accion_jugador(sala_id, nombre)
        if not permitido:
            raise ValueError(mensaje or "No puedes actuar en este momento.")

        escena = self._escena(sala_id)
        escena.espera_resolucion = True
        return self.estado_publico(sala_id)

    def avanzar_turno(self, sala_id: str) -> dict[str, object]:
        escena = self._escena(sala_id)
        if not escena.activa:
            raise ValueError("No hay una escena activa en esta sala.")

        actual = self._actor_actual(escena)
        actual_id = actual.id if actual else None
        actual_ronda = escena.ronda

        siguiente, hubo_vuelta, saltados = self._buscar_siguiente_listo(
            escena,
            desde_actor_id=actual_id,
        )

        if not siguiente:
            escena.turno_actor_id = None
            escena.espera_resolucion = False
            return {
                "estado": self.estado_publico(sala_id),
                "actor_anterior": self._serializar_actor(actual, es_actual=False) if actual else None,
                "actor_actual": None,
                "saltados": saltados,
                "ronda_anterior": actual_ronda,
                "ronda_actual": actual_ronda,
                "hubo_vuelta": False,
            }

        if hubo_vuelta and actual_id:
            escena.ronda += 1

        escena.turno_actor_id = siguiente.id
        escena.espera_resolucion = False

        return {
            "estado": self.estado_publico(sala_id),
            "actor_anterior": self._serializar_actor(actual, es_actual=False) if actual else None,
            "actor_actual": self._serializar_actor(siguiente, es_actual=True),
            "saltados": saltados,
            "ronda_anterior": actual_ronda,
            "ronda_actual": escena.ronda,
            "hubo_vuelta": escena.ronda != actual_ronda,
        }


gestor_combate = GestorCombate()
