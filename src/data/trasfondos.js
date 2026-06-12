export const trasfondos = [
  {
    id: 'acolito',
    nombre: 'Acólito',
    descripcion: 'Has pasado tu vida al servicio de un templo, realizando ritos sagrados y estudiando la fe.',
    proficiencias: ['Perspicacia', 'Religión'],
    equipamiento: [
      { id: 'simbolo_sagrado', nombre: 'Símbolo sagrado', tipo: 'equipo', cantidad: 1 },
      { id: 'libro_oraciones', nombre: 'Libro de oraciones', tipo: 'equipo', cantidad: 1 },
      { id: 'incienso', nombre: 'Incienso (varitas)', tipo: 'consumible', cantidad: 5 },
      { id: 'vestiduras', nombre: 'Vestiduras', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 15
  },
  {
    id: 'criminal',
    nombre: 'Criminal',
    descripcion: 'Conoces los bajos fondos y tienes un historial de romper la ley para sobrevivir o lucrar.',
    proficiencias: ['Engaño', 'Sigilo'],
    equipamiento: [
      { id: 'herramientas_ladron', nombre: 'Herramientas de ladrón', tipo: 'equipo', cantidad: 1 },
      { id: 'palanca', nombre: 'Palanca', tipo: 'equipo', cantidad: 1 },
      { id: 'ropa_oscura', nombre: 'Ropa oscura con capucha', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 15
  },
  {
    id: 'forastero',
    nombre: 'Forastero',
    descripcion: 'Creciste lejos de la civilización y las comodidades, sobreviviendo en la naturaleza salvaje.',
    proficiencias: ['Atletismo', 'Supervivencia'],
    equipamiento: [
      { id: 'baston', nombre: 'Bastón', tipo: 'arma', cantidad: 1 },
      { id: 'trampa_caza', nombre: 'Trampa de caza', tipo: 'equipo', cantidad: 1 },
      { id: 'trofeo_animal', nombre: 'Trofeo animal', tipo: 'equipo', cantidad: 1 },
      { id: 'ropa_viajero', nombre: 'Ropa de viajero', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 10
  },
  {
    id: 'noble',
    nombre: 'Noble',
    descripcion: 'Vienes de una familia con poder, riqueza o influencia. La gente te trata con reverencia (o desdén).',
    proficiencias: ['Historia', 'Persuasión'],
    equipamiento: [
      { id: 'anillo_sello', nombre: 'Anillo con sello', tipo: 'equipo', cantidad: 1 },
      { id: 'pergamino_linaje', nombre: 'Pergamino de linaje', tipo: 'equipo', cantidad: 1 },
      { id: 'ropa_fina', nombre: 'Ropa fina', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 25
  },
  {
    id: 'sabio',
    nombre: 'Sabio',
    descripcion: 'Has pasado años aprendiendo saberes oscuros y conocimiento histórico en grandes bibliotecas.',
    proficiencias: ['Arcanos', 'Historia'],
    equipamiento: [
      { id: 'tintero', nombre: 'Tintero y pluma', tipo: 'equipo', cantidad: 1 },
      { id: 'pergamino_blanco', nombre: 'Hoja de pergamino', tipo: 'consumible', cantidad: 10 },
      { id: 'bolsa_arena', nombre: 'Bolsa de arena fina', tipo: 'equipo', cantidad: 1 },
      { id: 'cuchillo_pequeno', nombre: 'Cuchillo pequeño', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 10
  },
  {
    id: 'soldado',
    nombre: 'Soldado',
    descripcion: 'Conoces la disciplina militar y la brutalidad de la guerra por experiencia propia.',
    proficiencias: ['Atletismo', 'Intimidación'],
    equipamiento: [
      { id: 'insignia_rango', nombre: 'Insignia de rango', tipo: 'equipo', cantidad: 1 },
      { id: 'trofeo_batalla', nombre: 'Trofeo de batalla', tipo: 'equipo', cantidad: 1 },
      { id: 'juego_dados', nombre: 'Juego de dados', tipo: 'equipo', cantidad: 1 },
      { id: 'ropa_comun', nombre: 'Ropa común', tipo: 'equipo', cantidad: 1 }
    ],
    oroInicial: 10
  }
];
