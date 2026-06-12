export function guardarEnSlot(slotIndex, gameState) {
  const slots = JSON.parse(localStorage.getItem('rpg_slots') || '[null, null, null, null, null]');
  
  const slotData = {
    fecha: new Date().toISOString(),
    personaje: {
      nombre: gameState.personaje.nombre,
      clase: gameState.personaje.clase,
      nivel: gameState.personaje.nivel,
      hp: gameState.personaje.hp
    },
    ubicacion: gameState.mundo.ubicacion,
    estadoCompleto: gameState
  };
  
  slots[slotIndex] = slotData;
  localStorage.setItem('rpg_slots', JSON.stringify(slots));
  return true;
}

export function cargarDeSlot(slotIndex) {
  const slots = JSON.parse(localStorage.getItem('rpg_slots') || '[null, null, null, null, null]');
  if (slots[slotIndex]) {
    return slots[slotIndex].estadoCompleto;
  }
  return null;
}

export function borrarSlot(slotIndex) {
  const slots = JSON.parse(localStorage.getItem('rpg_slots') || '[null, null, null, null, null]');
  slots[slotIndex] = null;
  localStorage.setItem('rpg_slots', JSON.stringify(slots));
}

export function obtenerInfoSlots() {
  const slots = JSON.parse(localStorage.getItem('rpg_slots') || '[null, null, null, null, null]');
  return slots.map(s => s ? {
    fecha: s.fecha,
    personaje: s.personaje,
    ubicacion: s.ubicacion
  } : null);
}

export function exportarPartida(gameState) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `partida_${gameState.personaje.nombre}_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function exportarPersonaje(personaje) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(personaje, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `pj_${personaje.nombre}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function importarJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error("Archivo JSON inválido"));
      }
    };
    reader.readAsText(file);
  });
}
