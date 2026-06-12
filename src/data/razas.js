export const razas = [
  {
    id: 'humano',
    nombre: 'Humano',
    descripcion: 'Versátiles y adaptables, los humanos se encuentran en todos los rincones del mundo. Aprenden rápido y son capaces de dominar cualquier disciplina.',
    bonificaciones: { FUE: 1, DES: 1, CON: 1, INT: 1, SAB: 1, CAR: 1 },
    rasgos: ['Versatilidad humana'],
    velocidad: 30,
    subrazas: []
  },
  {
    id: 'elfo',
    nombre: 'Elfo',
    descripcion: 'Seres mágicos de gracia y belleza, viven siglos y tienen una profunda conexión con la naturaleza y la magia.',
    bonificaciones: { DES: 2 },
    rasgos: ['Visión en la oscuridad', 'Linaje feérico'],
    velocidad: 30,
    subrazas: [
      {
        id: 'alto_elfo',
        nombre: 'Alto Elfo',
        descripcion: 'Estudiosos de la magia ancestral y las artes arcanas.',
        bonificaciones: { INT: 1 },
        rasgos: ['Truco adicional']
      },
      {
        id: 'elfo_bosque',
        nombre: 'Elfo del Bosque',
        descripcion: 'Guardianes de los bosques profundos, ágiles e intuitivos.',
        bonificaciones: { SAB: 1 },
        rasgos: ['Pies ligeros', 'Máscara de la espesura'],
        velocidad: 35
      },
      {
        id: 'elfo_oscuro',
        nombre: 'Elfo Oscuro (Drow)',
        descripcion: 'Habitantes de las profundidades con magia inherente.',
        bonificaciones: { CAR: 1 },
        rasgos: ['Visión superior en la oscuridad', 'Magia drow']
      }
    ]
  },
  {
    id: 'enano',
    nombre: 'Enano',
    descripcion: 'Robustos y fuertes, excelentes mineros y guerreros que valoran el honor y la tradición por encima de todo.',
    bonificaciones: { CON: 2 },
    rasgos: ['Visión en la oscuridad', 'Resiliencia enana'],
    velocidad: 25,
    subrazas: [
      {
        id: 'enano_colinas',
        nombre: 'Enano de las Colinas',
        descripcion: 'Conocidos por su gran resistencia, son más duros que la piedra.',
        bonificaciones: { SAB: 1 },
        rasgos: ['Dureza enana (HP+1/nivel)']
      },
      {
        id: 'enano_montana',
        nombre: 'Enano de la Montaña',
        descripcion: 'Fuertes guerreros acostumbrados al terreno escarpado.',
        bonificaciones: { FUE: 2 },
        rasgos: ['Entrenamiento con armadura enana']
      }
    ]
  },
  {
    id: 'mediano',
    nombre: 'Mediano',
    descripcion: 'Gente pequeña que sobrevive en un mundo de grandes criaturas gracias a su agilidad, ingenio y una suerte legendaria.',
    bonificaciones: { DES: 2 },
    rasgos: ['Suerte', 'Bravura'],
    velocidad: 25,
    subrazas: [
      {
        id: 'piesligeros',
        nombre: 'Piesligeros',
        descripcion: 'Maestros del sigilo y amigables por naturaleza.',
        bonificaciones: { CAR: 1 },
        rasgos: ['Sigilo natural']
      },
      {
        id: 'fornido',
        nombre: 'Fornido',
        descripcion: 'Más resistentes al veneno y robustos que sus hermanos.',
        bonificaciones: { CON: 1 },
        rasgos: ['Resiliencia de los fornidos']
      }
    ]
  },
  {
    id: 'semielfo',
    nombre: 'Semielfo',
    descripcion: 'Caminan en dos mundos, combinando la versatilidad humana con los sentidos agudos y la belleza élfica.',
    bonificaciones: { CAR: 2, FUE: 1, DES: 1 }, // Simplificado para la app
    rasgos: ['Visión en la oscuridad', 'Linaje feérico'],
    velocidad: 30,
    subrazas: []
  },
  {
    id: 'semiorco',
    nombre: 'Semiorco',
    descripcion: 'Feroces y de fuerte constitución. Las emociones los dominan, haciendo de ellos temibles guerreros.',
    bonificaciones: { FUE: 2, CON: 1 },
    rasgos: ['Visión en la oscuridad', 'Resistencia implacable', 'Ataques salvajes'],
    velocidad: 30,
    subrazas: []
  },
  {
    id: 'gnomo',
    nombre: 'Gnomo',
    descripcion: 'Llenos de energía, curiosidad y creatividad. Excelentes inventores e ilusionistas.',
    bonificaciones: { INT: 2 },
    rasgos: ['Visión en la oscuridad', 'Astucia gnoma'],
    velocidad: 25,
    subrazas: [
      {
        id: 'gnomo_bosque',
        nombre: 'Gnomo del Bosque',
        descripcion: 'Tímidos pero astutos, con habilidad para las ilusiones menores.',
        bonificaciones: { DES: 1 },
        rasgos: ['Ilusionista nato']
      },
      {
        id: 'gnomo_rocas',
        nombre: 'Gnomo de las Rocas',
        descripcion: 'Grandes artesanos y curiosos sobre cómo funciona el mundo.',
        bonificaciones: { CON: 1 },
        rasgos: ['Conocimiento de artífice']
      }
    ]
  },
  {
    id: 'tiefling',
    nombre: 'Tiefling',
    descripcion: 'Llevan la marca de un pacto antiguo con entidades infernales. A menudo desconfiados, pero capaces de gran poder mágico.',
    bonificaciones: { CAR: 2, INT: 1 },
    rasgos: ['Visión en la oscuridad', 'Resistencia infernal', 'Legado infernal'],
    velocidad: 30,
    subrazas: []
  },
  {
    id: 'draconido',
    nombre: 'Dracónido',
    descripcion: 'Orgullosos seres dracónicos bípedos. Valoran su clan por encima de todo y pueden exhalar ataques elementales.',
    bonificaciones: { FUE: 2, CAR: 1 },
    rasgos: ['Ascendencia dracónica', 'Arma de aliento'],
    velocidad: 30,
    subrazas: []
  }
];
