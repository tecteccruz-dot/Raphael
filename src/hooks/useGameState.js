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

    let habilidadesTexto = '';
    if (personaje.habilidades) {
      const { pasiva, activa1, activa2, activa3, unica } = personaje.habilidades;
      habilidadesTexto = `
HABILIDADES DEL JUGADOR (Debes respetar estrictamente sus límites y costos):
- Pasiva: ${pasiva?.nombre || 'Ninguna'} (Límite: ${pasiva?.limitacion || 'N/A'}) - ${pasiva?.descripcion || ''}
- Activa 1: ${activa1?.nombre || 'Ninguna'} (Límite: ${activa1?.limitacion || 'N/A'}) - ${activa1?.descripcion || ''}
- Activa 2: ${activa2?.nombre || 'Ninguna'} (Límite: ${activa2?.limitacion || 'N/A'}) - ${activa2?.descripcion || ''}
- Activa 3: ${activa3?.nombre || 'Ninguna'} (Límite: ${activa3?.limitacion || 'N/A'}) - ${activa3?.descripcion || ''}
- Única: ${unica?.nombre || 'Ninguna'} (Límite: ${unica?.limitacion || 'N/A'}) - ${unica?.descripcion || ''}`;
    }

    let npcsTexto = '';
    const npcsVivos = mundo.npcs.filter(n => n.vivo);
    if (npcsVivos.length > 0) {
      npcsTexto = '\n\nENTIDADES EN ESCENA:\n' + npcsVivos.map(n => {
        let nTxt = `- ${n.nombre} (ID: ${n.id}, ${n.enGrupo ? 'En tu grupo' : n.relacion})`;
        if (n.hp) nTxt += ` | HP: ${n.hp.actual}/${n.hp.maximo}`;
        if (n.estadisticas) nTxt += ` | Stats: FUE ${n.estadisticas.FUE}, DES ${n.estadisticas.DES}`;
        if (n.inventario && n.inventario.length > 0) {
          nTxt += ` | Inv: ${n.inventario.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}`;
        }
        return nTxt;
      }).join('\n');
    }

    return `ESTADO ACTUAL:
Jugador: ${personaje.nombre} (Nivel ${personaje.nivel} ${personaje.raza} ${personaje.clase})
HP: ${personaje.hp.actual}/${personaje.hp.maximo} | CA: ${personaje.claseArmadura}
Stats: FUE ${personaje.estadisticas.FUE}, DES ${personaje.estadisticas.DES}, CON ${personaje.estadisticas.CON}, INT ${personaje.estadisticas.INT}, SAB ${personaje.estadisticas.SAB}, CAR ${personaje.estadisticas.CAR}
Condiciones: ${personaje.condiciones.length > 0 ? personaje.condiciones.join(', ') : 'Ninguna'}
Ubicación: ${nombreRuta} (${mundo.horaDia}, Día ${mundo.diaActual})
Oro: ${oro} po | Inventario: ${invNombres || 'Vacío'}
Misiones/Flags activas: ${flagsActivas || 'Ninguna'}${habilidadesTexto}${npcsTexto}
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
