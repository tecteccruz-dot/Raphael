import { buscarUbicacionGlobal } from './travel';

export function parsearRespuesta(textoCompleto) {
  const result = {
    turno: '',
    intencion: '',
    tirada: '',
    mecanica: '',
    narracion: '',
    comandos: [],
    estadoEscena: '',
    opciones: [],
    exp: ''
  };

  // Helper function to extract content between brackets
  const extractBlock = (title, text) => {
    // Escapar corchetes para la regex
    const t = title.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`\\[${t}\\][\\s\\n]*([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  result.turno = extractBlock('Turno', textoCompleto);
  result.intencion = extractBlock('Resumen de Intención', textoCompleto);
  result.tirada = extractBlock('🎲 Tirada 🎲', textoCompleto);
  result.mecanica = extractBlock('Mecánica', textoCompleto);
  
  // Si la IA falla en el formato y no usa [Narración], intentamos extraer el texto principal
  const narracionExtraida = extractBlock('Narración', textoCompleto);
  if (narracionExtraida) {
    result.narracion = narracionExtraida;
  } else {
    // Si no hay bloque narrativo explícito, tomamos todo el texto que no esté dentro de corchetes
    result.narracion = textoCompleto.replace(/\[.*?\][\s\S]*?(?=\n\[|$)/g, '').trim();
    if (!result.narracion) result.narracion = textoCompleto; // Fallback extremo
  }

  result.estadoEscena = extractBlock('Estado de Escena', textoCompleto);
  result.exp = extractBlock('EXP', textoCompleto);

  // Parse Opciones
  const opcionesRaw = extractBlock('Opciones', textoCompleto);
  if (opcionesRaw) {
    result.opciones = opcionesRaw
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // Parse Comandos
  const comandosRaw = extractBlock('COMANDOS', textoCompleto);
  if (comandosRaw) {
    // Extraer todos los [COMANDO args] de la sección
    const regexComandos = /\[([A-Z_]+)([^\]]*)\]/g;
    let match;
    while ((match = regexComandos.exec(comandosRaw)) !== null) {
      result.comandos.push({
        tipo: match[1],
        args: match[2].trim()
      });
    }
  } else {
    // Backup: buscar comandos sueltos en todo el texto si el bloque falló
    const regexComandos = /\[(DAMAGE|HEAL|ADD_XP|SET_CONDITION|REMOVE_CONDITION|ADD_ITEM|REMOVE_ITEM|DAMAGE_ITEM|ADD_GOLD|REMOVE_GOLD|SET_LOCATION|SPAWN_NPC|KILL_NPC|DAMAGE_NPC|SET_NPC_RELATION|SET_FLAG|SET_TIME)([^\]]*)\]/g;
    let match;
    while ((match = regexComandos.exec(textoCompleto)) !== null) {
      result.comandos.push({
        tipo: match[1],
        args: match[2].trim()
      });
    }
  }

  return result;
}

export function ejecutarComando(comando, store) {
  const args = comando.args.split(' ');
  const logStr = `[${comando.tipo} ${comando.args}]`;
  
  try {
    switch (comando.tipo) {
      case 'DAMAGE':
        if (args[0] === 'player') store.damagePlayer(parseInt(args[1], 10));
        break;
      case 'HEAL':
        if (args[0] === 'player') store.healPlayer(parseInt(args[1], 10));
        break;
      case 'ADD_XP':
        store.addXp(parseInt(args[0], 10));
        break;
      case 'SET_CONDITION':
        store.setCondition(args.join(' '));
        break;
      case 'REMOVE_CONDITION':
        store.removeCondition(args.join(' '));
        break;
      case 'ADD_ITEM':
        // eslint-disable-next-line no-case-declarations
        const idItem = args[0];
        // eslint-disable-next-line no-case-declarations
        const nombreItem = args.slice(1).join(' ').replace(/['"]/g, '');
        store.addItem({ id: idItem, nombre: nombreItem, tipo: 'equipo' });
        break;
      case 'REMOVE_ITEM':
        store.removeItem(args[0]);
        break;
      case 'ADD_GOLD':
        store.addGold(parseInt(args[0], 10));
        break;
      case 'REMOVE_GOLD':
        store.removeGold(parseInt(args[0], 10));
        break;
      case 'SET_LOCATION':
        // eslint-disable-next-line no-case-declarations
        const ubicacionRaw = args[0];
        // Buscar la ubicación en el mapa global
        // eslint-disable-next-line no-case-declarations
        const hallada = buscarUbicacionGlobal(ubicacionRaw);
        if (hallada) {
          store.setLocation(hallada.continente, hallada.reino, hallada.ubicacion);
        } else {
          console.warn(`Ubicación no encontrada en el mapa: ${ubicacionRaw}`);
          // Fallback, intentamos inyectarlo igual (no ideal)
          store.setLocation(store.mundo.continente, store.mundo.reino, ubicacionRaw);
        }
        break;
      case 'SPAWN_NPC':
        store.spawnNpc({ id: args[0], nombre: args.slice(1).join(' ').replace(/['"]/g, '') });
        break;
      case 'KILL_NPC':
        store.killNpc(args[0]);
        break;
      case 'SET_FLAG':
        store.setFlag(args[0], args[1] === 'true');
        break;
      case 'SET_TIME':
        store.setTime(args[0]);
        break;
      // Comandos que se asumen visuales o de narrativa (sin estado fuerte aún)
      case 'DAMAGE_NPC':
      case 'SET_NPC_RELATION':
      case 'DAMAGE_ITEM':
        break;
      default:
        console.warn('Comando no reconocido:', comando.tipo);
    }
    
    // Log técnico
    store.addLogTecnico(logStr);
    
  } catch (err) {
    console.error(`Error ejecutando comando ${logStr}:`, err);
  }
}

export function ejecutarComandos(comandos, store) {
  comandos.forEach(cmd => ejecutarComando(cmd, store));
}
