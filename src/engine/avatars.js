// Gestor para emparejar automáticamente NPCs con sus avatares en la carpeta de assets

const modules = import.meta.glob('../assets/Imagenes/Personajes/**/*.png', { eager: true });

const avataresCache = {};

// Construir caché
for (const path in modules) {
  // path se ve como: '../assets/Imagenes/Personajes/Humanos/Roberto.png'
  const parts = path.split('/');
  const filename = parts[parts.length - 1]; // 'Roberto.png'
  const idMatch = filename.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
  
  // Guardamos el módulo exportado (la URL de la imagen en Vite)
  avataresCache[idMatch.toLowerCase()] = modules[path].default || modules[path];
}

export function obtenerAvatarNpc(idNpc, nombreNpc) {
  if (!idNpc) return null;
  
  // Intento 1: match exacto por ID
  let match = avataresCache[idNpc.toLowerCase()];
  if (match) return match;
  
  // Intento 2: match parcial (el archivo contiene el ID)
  for (const [key, url] of Object.entries(avataresCache)) {
    if (key.includes(idNpc.toLowerCase()) || idNpc.toLowerCase().includes(key)) {
      return url;
    }
  }

  // Intento 3: buscar por nombre completo si se proporcionó
  if (nombreNpc) {
    const nombreClean = nombreNpc.toLowerCase().replace(/\s+/g, '_');
    match = avataresCache[nombreClean];
    if (match) return match;

    for (const [key, url] of Object.entries(avataresCache)) {
      if (key.includes(nombreClean) || nombreClean.includes(key)) {
        return url;
      }
    }
  }

  return null;
}

export function obtenerAvataresDisponibles() {
  return Object.keys(avataresCache);
}
