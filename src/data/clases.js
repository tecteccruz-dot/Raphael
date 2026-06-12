export const clases = [
  {
    id: 'barbaro',
    nombre: 'Bárbaro',
    descripcion: 'Guerreros salvajes que canalizan su furia en el campo de batalla para desatar golpes devastadores.',
    dadoGolpe: 'd12',
    estadisticaPrincipal: 'FUE',
    salvaciones: ['FUE', 'CON'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Escudos'],
    proficienciasArmas: ['Armas simples', 'Armas marciales'],
    habilidadesDisponibles: ['Atletismo', 'Naturaleza', 'Percepción', 'Supervivencia', 'Trato con animales', 'Intimidación'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Hacha de guerra', armadura: 'Sin armadura', extras: 'Jabalina x4, Paquete de explorador' },
    subclases: [
      { id: 'berserker', nombre: 'Senda del Berserker', descripcion: 'El salvajismo absoluto, ataques extra pero a riesgo de agotamiento.' },
      { id: 'guerrero_totem', nombre: 'Guerrero del Tótem', descripcion: 'Comunión con espíritus animales que otorgan poderes sobrenaturales.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0
  },
  {
    id: 'bardo',
    nombre: 'Bardo',
    descripcion: 'Músicos y contadores de historias que tejen magia a través de su arte y palabras inspiradoras.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'CAR',
    salvaciones: ['DES', 'CAR'],
    proficienciasArmadura: ['Armaduras ligeras'],
    proficienciasArmas: ['Armas simples', 'Espadas cortas', 'Espadas largas', 'Estoques', 'Ballestas de mano'],
    habilidadesDisponibles: ['Cualquiera', 'Cualquiera', 'Cualquiera'],
    numHabilidades: 3,
    equipoInicial: { arma: 'Estoque', armadura: 'Armadura de cuero', extras: 'Laúd, Paquete de diplomático' },
    subclases: [
      { id: 'colegio_conocimiento', nombre: 'Colegio del Conocimiento', descripcion: 'Expertos en todo tipo de saberes e interrupción mágica.' },
      { id: 'colegio_valor', nombre: 'Colegio del Valor', descripcion: 'Bardos de batalla que inspiran el ataque y usan armas y armaduras mejores.' }
    ],
    trucos: 2, hechizosConocidos: 4, ranurasNivel1: 2
  },
  {
    id: 'brujo',
    nombre: 'Brujo',
    descripcion: 'Buscadores de secretos arcanos que han hecho pactos con seres de otro mundo a cambio de poderes.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'CAR',
    salvaciones: ['SAB', 'CAR'],
    proficienciasArmadura: ['Armaduras ligeras'],
    proficienciasArmas: ['Armas simples'],
    habilidadesDisponibles: ['Arcanos', 'Engaño', 'Historia', 'Intimidación', 'Investigación', 'Naturaleza', 'Religión'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Espada corta', armadura: 'Armadura de cuero', extras: 'Foco arcano, Paquete de erudito' },
    subclases: [
      { id: 'archihada', nombre: 'El Archihada', descripcion: 'Magia ilusoria e influencias feéricas.' },
      { id: 'infernal', nombre: 'El Infernal', descripcion: 'Poder de las llamas y magia de destrucción.' }
    ],
    trucos: 2, hechizosConocidos: 2, ranurasNivel1: 1
  },
  {
    id: 'clerigo',
    nombre: 'Clérigo',
    descripcion: 'Campeones divinos imbuidos con magia sacra para curar aliados y castigar a los enemigos.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'SAB',
    salvaciones: ['SAB', 'CAR'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Escudos'],
    proficienciasArmas: ['Armas simples'],
    habilidadesDisponibles: ['Historia', 'Perspicacia', 'Medicina', 'Persuasión', 'Religión'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Maza', armadura: 'Cota de escamas', extras: 'Símbolo sagrado, Paquete de sacerdote, Escudo' },
    subclases: [
      { id: 'dominio_vida', nombre: 'Dominio de la Vida', descripcion: 'Maestros de la curación y preservación de la vida.' },
      { id: 'dominio_luz', nombre: 'Dominio de la Luz', descripcion: 'Devoción a ideales de renacimiento, usan magia de fuego y resplandor.' }
    ],
    trucos: 3, hechizosConocidos: 2, ranurasNivel1: 2
  },
  {
    id: 'druida',
    nombre: 'Druida',
    descripcion: 'Guardianes de la naturaleza que controlan elementos salvajes y cambian a formas animales.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'SAB',
    salvaciones: ['INT', 'SAB'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Escudos'], // Sin metal en lore original
    proficienciasArmas: ['Armas simples', 'Cimitarra'],
    habilidadesDisponibles: ['Arcanos', 'Trato con animales', 'Perspicacia', 'Medicina', 'Naturaleza', 'Percepción', 'Religión', 'Supervivencia'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Bastón', armadura: 'Armadura de cuero', extras: 'Foco druídico, Paquete de explorador' },
    subclases: [
      { id: 'circulo_tierra', nombre: 'Círculo de la Tierra', descripcion: 'Magos de la naturaleza puros, más centrados en el lanzamiento de hechizos.' },
      { id: 'circulo_luna', nombre: 'Círculo de la Luna', descripcion: 'Maestros de la transformación animal, combatientes feroces.' }
    ],
    trucos: 2, hechizosConocidos: 2, ranurasNivel1: 2
  },
  {
    id: 'explorador',
    nombre: 'Explorador',
    descripcion: 'Maestros del terreno agreste y cazadores precisos que combinan marcialidad con magia natural.',
    dadoGolpe: 'd10',
    estadisticaPrincipal: 'DES',
    salvaciones: ['FUE', 'DES'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Escudos'],
    proficienciasArmas: ['Armas simples', 'Armas marciales'],
    habilidadesDisponibles: ['Trato con animales', 'Atletismo', 'Perspicacia', 'Investigación', 'Naturaleza', 'Percepción', 'Sigilo', 'Supervivencia'],
    numHabilidades: 3,
    equipoInicial: { arma: 'Arco largo', armadura: 'Armadura de cuero', extras: 'Flechas x20, Espada corta x2, Paquete de explorador' },
    subclases: [
      { id: 'cazador', nombre: 'Cazador', descripcion: 'Especialistas en enfrentar grandes amenazas y hordas enemigas.' },
      { id: 'senor_bestias', nombre: 'Señor de las Bestias', descripcion: 'Acompañados de un animal compañero con el que combaten.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0 // Magia a nivel 2
  },
  {
    id: 'guerrero',
    nombre: 'Guerrero',
    descripcion: 'Combatientes versátiles sin igual, maestros de todas las armas y armaduras.',
    dadoGolpe: 'd10',
    estadisticaPrincipal: 'FUE',
    salvaciones: ['FUE', 'CON'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Armaduras pesadas', 'Escudos'],
    proficienciasArmas: ['Armas simples', 'Armas marciales'],
    habilidadesDisponibles: ['Acrobacias', 'Trato con animales', 'Atletismo', 'Historia', 'Perspicacia', 'Intimidación', 'Percepción', 'Supervivencia'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Espada larga', armadura: 'Cota de malla', extras: 'Escudo, Ballesta ligera, Paquete de explorador' },
    subclases: [
      { id: 'campeon', nombre: 'Campeón', descripcion: 'Perfeccionamiento físico absoluto, más críticos y resistencia.' },
      { id: 'maestro_batalla', nombre: 'Maestro de Batalla', descripcion: 'Tácticos que usan maniobras especiales de combate.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0
  },
  {
    id: 'hechicero',
    nombre: 'Hechicero',
    descripcion: 'Lanzadores de conjuros innatos, la magia fluye por sus venas por algún linaje ancestral.',
    dadoGolpe: 'd6',
    estadisticaPrincipal: 'CAR',
    salvaciones: ['CON', 'CAR'],
    proficienciasArmadura: [],
    proficienciasArmas: ['Dagas', 'Dardos', 'Hondas', 'Bastones', 'Ballestas ligeras'],
    habilidadesDisponibles: ['Arcanos', 'Engaño', 'Perspicacia', 'Intimidación', 'Persuasión', 'Religión'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Ballesta ligera', armadura: 'Ropa común', extras: 'Daga x2, Paquete de erudito' },
    subclases: [
      { id: 'linaje_draconico', nombre: 'Linaje Dracónico', descripcion: 'Magia de dragones ancestrales, escamas protectoras y poder elemental.' },
      { id: 'magia_salvaje', nombre: 'Magia Salvaje', descripcion: 'Magia caótica que puede producir efectos impredecibles.' }
    ],
    trucos: 4, hechizosConocidos: 2, ranurasNivel1: 2
  },
  {
    id: 'mago',
    nombre: 'Mago',
    descripcion: 'Estudiosos supremos de las artes arcanas, manipulan la realidad con sus conjuros estudiados.',
    dadoGolpe: 'd6',
    estadisticaPrincipal: 'INT',
    salvaciones: ['INT', 'SAB'],
    proficienciasArmadura: [],
    proficienciasArmas: ['Dagas', 'Dardos', 'Hondas', 'Bastones', 'Ballestas ligeras'],
    habilidadesDisponibles: ['Arcanos', 'Historia', 'Perspicacia', 'Investigación', 'Medicina', 'Religión'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Bastón', armadura: 'Ropa común', extras: 'Libro de conjuros, Paquete de erudito' },
    subclases: [
      { id: 'evocacion', nombre: 'Escuela de Evocación', descripcion: 'Magia destructiva elemental y explosiones controladas.' },
      { id: 'abjuracion', nombre: 'Escuela de Abjuración', descripcion: 'Magia protectora, escudos arcanos y rechazo.' }
    ],
    trucos: 3, hechizosConocidos: 6, ranurasNivel1: 2
  },
  {
    id: 'monje',
    nombre: 'Monje',
    descripcion: 'Maestros de las artes marciales que utilizan la energía de su cuerpo (ki) para asestar golpes perfectos.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'DES',
    salvaciones: ['FUE', 'DES'],
    proficienciasArmadura: [],
    proficienciasArmas: ['Armas simples', 'Espadas cortas'],
    habilidadesDisponibles: ['Acrobacias', 'Atletismo', 'Historia', 'Perspicacia', 'Religión', 'Sigilo'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Espada corta', armadura: 'Ropa común', extras: 'Dardos x10, Paquete de explorador' },
    subclases: [
      { id: 'mano_abierta', nombre: 'Camino de la Mano Abierta', descripcion: 'Artes marciales perfectas para derribar y controlar al oponente.' },
      { id: 'sombra', nombre: 'Camino de la Sombra', descripcion: 'Maestros del sigilo y el asesinato mágico que se funden con la oscuridad.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0
  },
  {
    id: 'paladin',
    nombre: 'Paladín',
    descripcion: 'Caballeros sagrados ligados a un juramento, defensores de la luz contra la oscuridad.',
    dadoGolpe: 'd10',
    estadisticaPrincipal: 'FUE',
    salvaciones: ['SAB', 'CAR'],
    proficienciasArmadura: ['Armaduras ligeras', 'Armaduras medias', 'Armaduras pesadas', 'Escudos'],
    proficienciasArmas: ['Armas simples', 'Armas marciales'],
    habilidadesDisponibles: ['Atletismo', 'Perspicacia', 'Intimidación', 'Medicina', 'Persuasión', 'Religión'],
    numHabilidades: 2,
    equipoInicial: { arma: 'Espada larga', armadura: 'Cota de malla', extras: 'Escudo, Símbolo sagrado, Paquete de sacerdote' },
    subclases: [
      { id: 'devocion', nombre: 'Juramento de Devoción', descripcion: 'Caballeros blancos clásicos, protección sagrada e ideales de justicia.' },
      { id: 'venganza', nombre: 'Juramento de Venganza', descripcion: 'Castigadores implacables del mal, enfocados en destruir al enemigo.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0 // Magia a nivel 2
  },
  {
    id: 'picaro',
    nombre: 'Pícaro',
    descripcion: 'Oportunistas y maestros del sigilo que atacan desde las sombras buscando puntos débiles.',
    dadoGolpe: 'd8',
    estadisticaPrincipal: 'DES',
    salvaciones: ['DES', 'INT'],
    proficienciasArmadura: ['Armaduras ligeras'],
    proficienciasArmas: ['Armas simples', 'Ballestas de mano', 'Espadas largas', 'Espadas cortas', 'Estoques'],
    habilidadesDisponibles: ['Acrobacias', 'Atletismo', 'Engaño', 'Perspicacia', 'Intimidación', 'Investigación', 'Percepción', 'Interpretación', 'Persuasión', 'Juego de manos', 'Sigilo'],
    numHabilidades: 4,
    equipoInicial: { arma: 'Estoque', armadura: 'Armadura de cuero', extras: 'Arco corto, Flechas x20, Daga x2, Herramientas de ladrón' },
    subclases: [
      { id: 'ladron', nombre: 'Ladrón', descripcion: 'Ágiles e ingeniosos, expertos en infiltración y uso rápido de objetos.' },
      { id: 'asesino', nombre: 'Asesino', descripcion: 'Maestros de disfraces y venenos, mortales con el elemento sorpresa.' }
    ],
    trucos: 0, hechizosConocidos: 0, ranurasNivel1: 0
  }
];
