import { mapaXoxoc } from '../data/ubicaciones';

export function obtenerUbicacionActual(continente, reino, ubicacionId) {
  if (!mapaXoxoc[continente]) return null;
  if (!mapaXoxoc[continente].reinos[reino]) return null;
  if (!mapaXoxoc[continente].reinos[reino].ubicaciones[ubicacionId]) return null;
  
  return mapaXoxoc[continente].reinos[reino].ubicaciones[ubicacionId];
}

export function obtenerDestinosDisponibles(continenteActual, reinoActual) {
  const destinos = [];
  
  if (!mapaXoxoc[continenteActual]) return [];
  
  // Ubicaciones dentro del mismo reino
  if (mapaXoxoc[continenteActual].reinos[reinoActual]) {
    const ubs = mapaXoxoc[continenteActual].reinos[reinoActual].ubicaciones;
    for (const [id, data] of Object.entries(ubs)) {
      destinos.push({
        tipo: 'local',
        id: id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        ruta: { continente: continenteActual, reino: reinoActual, ubicacion: id }
      });
    }
  }

  // Otros reinos en el mismo continente
  for (const [rId, rData] of Object.entries(mapaXoxoc[continenteActual].reinos)) {
    if (rId !== reinoActual) {
      destinos.push({
        tipo: 'viaje',
        id: rId,
        nombre: `Viajar a ${rData.nombre}`,
        descripcion: rData.descripcion,
        // Al viajar a un reino, llegamos a su primera ubicación por defecto
        ruta: { continente: continenteActual, reino: rId, ubicacion: Object.keys(rData.ubicaciones)[0] }
      });
    }
  }

  return destinos;
}

export function obtenerRutaViaje(continente, reino, ubicacion) {
  if (!mapaXoxoc[continente]) return "Ubicación desconocida";
  
  const cNombre = mapaXoxoc[continente].nombre;
  
  if (!mapaXoxoc[continente].reinos[reino]) return cNombre;
  const rNombre = mapaXoxoc[continente].reinos[reino].nombre;
  
  if (!mapaXoxoc[continente].reinos[reino].ubicaciones[ubicacion]) return `${cNombre} > ${rNombre}`;
  const uNombre = mapaXoxoc[continente].reinos[reino].ubicaciones[ubicacion].nombre;
  
  return `${cNombre} > ${rNombre} > ${uNombre}`;
}

export function obtenerFondoUbicacion(continente, reino, ubicacion) {
  const ubi = obtenerUbicacionActual(continente, reino, ubicacion);
  if (ubi && ubi.fondo) {
    return `/backgrounds/${ubi.fondo}`;
  }
  // Fallback si no tiene
  return '/backgrounds/tumbaflor_plaza.png';
}

export function buscarUbicacionGlobal(ubicacionId) {
  // Búsqueda plana por ID de ubicación para comandos de la IA simplificados
  // La IA a veces dice [SET_LOCATION tumbaflor_taberna] en lugar del path completo
  for (const [cId, cData] of Object.entries(mapaXoxoc)) {
    for (const [rId, rData] of Object.entries(cData.reinos)) {
      for (const [uId, uData] of Object.entries(rData.ubicaciones)) {
        if (uId === ubicacionId || `${rId}_${uId}` === ubicacionId) {
          return { continente: cId, reino: rId, ubicacion: uId };
        }
      }
    }
  }
  return null;
}
