export function calcularModificador(stat) {
  return Math.floor((stat - 10) / 2);
}

export function calcularModificadores(stats) {
  const mods = {};
  for (const [key, value] of Object.entries(stats)) {
    mods[key] = calcularModificador(value);
  }
  return mods;
}

export function calcularHPMaximo(claseId, nivel, modCON) {
  const dados = {
    barbaro: 12, guerrero: 10, paladin: 10, explorador: 10,
    picaro: 8, bardo: 8, clerigo: 8, druida: 8, monje: 8, brujo: 8,
    mago: 6, hechicero: 6
  };
  const dadoBase = dados[claseId] || 8;
  
  // A nivel 1, es dado máximo + CON. Para simplificar, aquí lo tratamos como máximo.
  // En un sistema real, niveles 2+ sumarían la media o tirada, pero lo haremos fijo (dado/2 + 1)
  let hp = dadoBase + modCON;
  if (nivel > 1) {
    const media = Math.floor(dadoBase / 2) + 1;
    hp += (media + modCON) * (nivel - 1);
  }
  return Math.max(hp, 1);
}

export const tablaXP = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

export function verificarSubidaNivel(xpActual, nivelActual) {
  if (nivelActual >= 20) return false;
  return xpActual >= tablaXP[nivelActual]; // nivelActual es 1-indexed, tablaXP es 0-indexed (índice 1 = XP para nivel 2)
}

export const costosCompraPuntos = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

export const arrayEstandar = [15, 14, 13, 12, 10, 8];

export function tirarD6() {
  return Math.floor(Math.random() * 6) + 1;
}

export function tirar4d6() {
  const tiradas = [tirarD6(), tirarD6(), tirarD6(), tirarD6()];
  tiradas.sort((a, b) => b - a); // Ordenar descendente
  return tiradas[0] + tiradas[1] + tiradas[2]; // Sumar los 3 mayores
}

export function generarInventarioInicial(claseId, trasfondoId, clasesData, trasfondosData) {
  const inventario = [];
  
  const clase = clasesData.find(c => c.id === claseId);
  if (clase && clase.equipoInicial) {
    inventario.push({ id: `arma_${claseId}`, nombre: clase.equipoInicial.arma, tipo: 'arma', cantidad: 1, equipado: true });
    if (clase.equipoInicial.armadura !== 'Sin armadura' && clase.equipoInicial.armadura !== 'Ropa común') {
      inventario.push({ id: `armadura_${claseId}`, nombre: clase.equipoInicial.armadura, tipo: 'armadura', cantidad: 1, equipado: true });
    }
    const extras = clase.equipoInicial.extras.split(', ');
    extras.forEach((ex, i) => {
      inventario.push({ id: `extra_${claseId}_${i}`, nombre: ex, tipo: 'equipo', cantidad: 1 });
    });
  }

  const trasfondo = trasfondosData.find(t => t.id === trasfondoId);
  if (trasfondo && trasfondo.equipamiento) {
    trasfondo.equipamiento.forEach(item => {
      // Evitar duplicados simples (si ya tiene armadura y ropa, etc)
      const existe = inventario.find(i => i.nombre === item.nombre);
      if (existe) {
        existe.cantidad += item.cantidad;
      } else {
        inventario.push({ ...item });
      }
    });
  }

  // Objeto básico para todos
  inventario.push({ id: 'pocion_curacion_1', nombre: 'Poción de curación', tipo: 'consumible', cantidad: 1 });

  return inventario;
}
