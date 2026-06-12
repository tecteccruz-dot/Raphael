export const mapaXoxoc = {
  luminaerion: {
    nombre: 'Luminaerion',
    descripcion: 'Continente principal, fértil y civilizado. Concentra el mayor poder político y religioso.',
    icono: '☀️',
    peligro: 'Bajo-Medio',
    reinos: {
      tumbaflor: {
        nombre: 'Tumbaflor',
        descripcion: 'Pueblo comercial famoso por su mercado de flores perennes.',
        fondo: 'tumbaflor_plaza.png',
        ubicaciones: {
          plaza: { nombre: 'Plaza Mayor', descripcion: 'El corazón del pueblo, lleno de vida y puestos mercantiles.', lugares: ['Tablón de misiones', 'Fuente central'], fondo: 'tumbaflor_plaza.png' },
          taberna: { nombre: 'Taberna del Cardo', descripcion: 'Cálida, ruidosa y siempre acogedora.', lugares: ['Gordo Wren - Tabernero'], fondo: 'tumbaflor_plaza.png' },
          templo: { nombre: 'Templo de Lulú', descripcion: 'Un modesto pero hermoso lugar de culto.', lugares: ['Sacerdotisa Mara'], fondo: 'tumbaflor_plaza.png' },
          herreria: { nombre: 'Herrería de Brann', descripcion: 'Calor sofocante y el constante repiqueteo del martillo.', lugares: ['Herrero Brann'], fondo: 'tumbaflor_plaza.png' }
        }
      },
      elixiria: {
        nombre: 'Elixiria',
        descripcion: 'Ciudad-estado teocrática, inmaculada por fuera pero estricta y controladora por dentro.',
        fondo: 'tumbaflor_plaza.png',
        ubicaciones: {
          plaza_purificacion: { nombre: 'Plaza de la Purificación', descripcion: 'Lugar de reuniones masivas y sermones religiosos.', lugares: ['Estatua de Lulú'], fondo: 'tumbaflor_plaza.png' },
          templo_mayor: { nombre: 'Templo Mayor', descripcion: 'La sede del poder del Consejo y Los Sanguines.', lugares: ['Sumo Sacerdote Auren'], fondo: 'tumbaflor_plaza.png' },
          celdas: { nombre: 'Celdas del Templo', descripcion: 'Prisiones frías y oscuras bajo la ciudad.', lugares: ['Guardia Sanguine'], fondo: 'tumbaflor_plaza.png' },
          calles: { nombre: 'Calles Blancas', descripcion: 'Calles patrulladas constantemente por fervorosos guardias.', lugares: ['Mercaderes locales'], fondo: 'tumbaflor_plaza.png' }
        }
      },
      laguna_lamina: {
        nombre: 'Laguna Lámina',
        descripcion: 'Un cuerpo de agua sereno donde se forjaron antiguas armas sagradas.',
        fondo: 'tumbaflor_plaza.png',
        ubicaciones: {
          orilla: { nombre: 'Orilla de los Susurros', descripcion: 'Aguas cristalinas que parecen reflejar memorias antiguas.', lugares: ['Pescadores ermitaños'], fondo: 'tumbaflor_plaza.png' }
        }
      },
      gran_cantera: {
        nombre: 'Gran Cantera de Lumina',
        descripcion: 'De aquí se extrajo la piedra blanca para construir Elixiria.',
        fondo: 'tumbaflor_plaza.png',
        ubicaciones: {
          excavacion: { nombre: 'Zona de Excavación', descripcion: 'Esclavos y prisioneros trabajan día y noche.', lugares: ['Capataces'], fondo: 'tumbaflor_plaza.png' }
        }
      }
    }
  },
  myuri: {
    nombre: 'Myuri',
    descripcion: 'Continente de ruinas arcanas, mazmorras y laboratorios que esconden los secretos del origen de Lulú.',
    icono: '🔮',
    peligro: 'Medio-Alto',
    reinos: {
      ruinas_arcanas: {
        nombre: 'Ruinas Arcanas',
        descripcion: 'Restos de una civilización mágicamente avanzada.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          entrada: { nombre: 'Puerta Quebrada', descripcion: 'Umbral colapsado hacia lo desconocido.', lugares: ['Cazadores de tesoros'], fondo: 'mazmorra_sala.png' }
        }
      },
      laboratorios: {
        nombre: 'Laboratorios Antiguos',
        descripcion: 'Complejos subterráneos donde la magia y la carne se mezclaban.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          sala_quimera: { nombre: 'Sala de las Quimeras', descripcion: 'Frascos gigantes rotos y huesos extraños.', lugares: ['Mutaciones sobrevivientes'], fondo: 'mazmorra_sala.png' }
        }
      },
      mazmorras: {
        nombre: 'Mazmorras de Myuri',
        descripcion: 'Profundos túneles llenos de trampas mortales y horrores sin nombre.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          nivel_1: { nombre: 'Nivel Superior', descripcion: 'Pasillos de piedra húmeda.', lugares: ['Goblins saqueadores'], fondo: 'mazmorra_sala.png' }
        }
      }
    }
  },
  ryquem: {
    nombre: 'Ryquem',
    descripcion: 'Tierra fracturada y disputada, famosa por sus yacimientos de cristales mágicos puros.',
    icono: '💎',
    peligro: 'Medio',
    reinos: {
      yacimientos: {
        nombre: 'Yacimientos de Cristal',
        descripcion: 'Minas a cielo abierto que brillan con luz propia.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          pozo_brillante: { nombre: 'El Pozo Brillante', descripcion: 'Un cráter lleno de formaciones cristalinas.', lugares: ['Mineros independientes'], fondo: 'mazmorra_sala.png' }
        }
      },
      gremios: {
        nombre: 'Ciudad de los Gremios',
        descripcion: 'Un asentamiento caótico controlado por sindicatos comerciales.',
        fondo: 'tumbaflor_plaza.png',
        ubicaciones: {
          mercado_negro: { nombre: 'Mercado Negro', descripcion: 'Donde los cristales se intercambian por sangre y secretos.', lugares: ['Contrabandistas'], fondo: 'tumbaflor_plaza.png' }
        }
      }
    }
  },
  ahco: {
    nombre: 'Ahco',
    descripcion: 'El continente más peligroso y salvaje. Volcanes activos, tierra negra y el misterioso Levy.',
    icono: '🌋',
    peligro: 'Alto-Extremo',
    reinos: {
      volcanes: {
        nombre: 'Cumbres de Ceniza',
        descripcion: 'Picos ardientes que expulsan humo constantemente.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          crater: { nombre: 'Cráter de Fuego', descripcion: 'Ríos de magma y criaturas elementales.', lugares: ['Salamandras de fuego'], fondo: 'mazmorra_sala.png' }
        }
      },
      niebla: {
        nombre: 'Valle de la Niebla Densa',
        descripcion: 'Un pantano tóxico donde la visibilidad es nula y habitan criaturas colosales.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          pantano: { nombre: 'Corazón del Pantano', descripcion: 'Árboles muertos y aguas venenosas.', lugares: ['Bestias del cieno'], fondo: 'mazmorra_sala.png' }
        }
      },
      levy: {
        nombre: 'El Levy',
        descripcion: 'Una anomalía espacial o criatura del tamaño de un país, nadie que haya entrado ha regresado.',
        fondo: 'mazmorra_sala.png',
        ubicaciones: {
          borde: { nombre: 'Borde del Levy', descripcion: 'El límite donde la realidad comienza a distorsionarse.', lugares: ['Cultistas de la locura'], fondo: 'mazmorra_sala.png' }
        }
      }
    }
  }
};
