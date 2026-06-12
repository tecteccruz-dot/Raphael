import { useMemo } from 'react';
import { useGameStore } from '../engine/state';
import { obtenerUbicacionActual, obtenerRutaViaje } from '../engine/travel';

export function useGameState() {
  const personaje = useGameStore(s => s.personaje);
  const mundo = useGameStore(s => s.mundo);
  const inventario = useGameStore(s => s.inventario);
  const oro = useGameStore(s => s.oro);

  // Derivados útiles
  const ubicacionActual = useMemo(() => {
    return obtenerUbicacionActual(mundo.continente, mundo.reino, mundo.ubicacion);
  }, [mundo.continente, mundo.reino, mundo.ubicacion]);

  const nombreRuta = useMemo(() => {
    return obtenerRutaViaje(mundo.continente, mundo.reino, mundo.ubicacion);
  }, [mundo.continente, mundo.reino, mundo.ubicacion]);

  const porcentajeHp = useMemo(() => {
    if (!personaje) return 0;
    return (personaje.hp.actual / personaje.hp.maximo) * 100;
  }, [personaje]);

  const armaduraEquipada = useMemo(() => {
    return inventario.find(i => i.tipo === 'armadura' && i.equipado);
  }, [inventario]);

  const armaEquipada = useMemo(() => {
    return inventario.find(i => i.tipo === 'arma' && i.equipado);
  }, [inventario]);

  // Contexto para enviar a la IA
  const construirContextoSistema = () => {
    if (!personaje) return '';

    const invNombres = inventario.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
    const flagsActivas = Object.entries(mundo.flags)
      .filter(([_, v]) => v)
      .map(([k]) => k).join(', ');

    return `ESTADO ACTUAL:
Jugador: ${personaje.nombre} (Nivel ${personaje.nivel} ${personaje.raza} ${personaje.clase})
HP: ${personaje.hp.actual}/${personaje.hp.maximo} | CA: ${personaje.claseArmadura}
Stats: FUE ${personaje.estadisticas.FUE}, DES ${personaje.estadisticas.DES}, CON ${personaje.estadisticas.CON}, INT ${personaje.estadisticas.INT}, SAB ${personaje.estadisticas.SAB}, CAR ${personaje.estadisticas.CAR}
Condiciones: ${personaje.condiciones.length > 0 ? personaje.condiciones.join(', ') : 'Ninguna'}
Ubicación: ${nombreRuta} (${mundo.horaDia}, Día ${mundo.diaActual})
Oro: ${oro} po | Inventario: ${invNombres || 'Vacío'}
Misiones/Flags activas: ${flagsActivas || 'Ninguna'}
`;
  };

  return {
    personaje,
    mundo,
    inventario,
    oro,
    ubicacionActual,
    nombreRuta,
    porcentajeHp,
    armaduraEquipada,
    armaEquipada,
    construirContextoSistema
  };
}
