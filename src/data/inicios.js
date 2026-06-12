export const inicios = [
  {
    id: 'tumbaflor',
    nombre: 'Tumbaflor — La Plaza del Pueblo',
    dificultad: 'Principiante',
    tono: 'Exploración, Rol social',
    icono: '☀',
    descripcion: 'Llega al pueblo mercantil de Tumbaflor al atardecer. Ideal para conocer las mecánicas básicas y aceptar misiones sencillas.',
    prompt: `[INICIO DE PARTIDA: TUMBAFLOR]
El personaje llega a Tumbaflor al atardecer, en el continente de Luminaerion. La plaza huele a flores raras y especias de tierras lejanas. El mercado está cerrando, y los mercaderes guardan sus productos. Un tablón de misiones lleno de papeles está clavado junto a la fuente central. A pocos metros, la taberna El Cardo irradia luz cálida y música alegre. Un niño persigue a un gato callejero por los adoquines. 

Como DM, narra esta escena introductoria. Menciona explícitamente el tablón de misiones, la taberna y el nombre del tabernero local, Gordo Wren, como un lugar donde podría encontrar trabajo o rumores.`,
    ubicacionInicial: { continente: 'luminaerion', reino: 'tumbaflor', ubicacion: 'plaza', lugar: null }
  },
  {
    id: 'elixiria',
    nombre: 'Elixiria — El Prisionero',
    dificultad: 'Intermedio',
    tono: 'Drama político, Sigilo, Tensión',
    icono: '⛓',
    descripcion: 'Despiertas en una celda bajo el Templo Mayor. Debes escapar o negociar tu libertad con los fervorosos seguidores de Lulú.',
    prompt: `[INICIO DE PARTIDA: ELIXIRIA]
El personaje despierta en una fría celda de piedra bajo el Templo Mayor de Elixiria, en el continente de Luminaerion. La razón de su encierro puede ser: llevar símbolos de otra fe, ser forastero en día sagrado, o hablar mal del Lulismo. Un guardia Sanguine pasa frente a la celda cada 10 minutos. La celda tiene una reja oxidada y una ventana diminuta al nivel del suelo por donde apenas se ve la bota de los transeúntes en la calle.

Complicación: Los objetos del jugador han sido confiscados. 
Como DM, narra la frialdad de la piedra, los rezos lejanos y monótonos que se escuchan desde los pisos superiores, y menciona al guardia que vigila. Da al jugador opciones para intentar escapar, usar el sigilo o intentar hablar con el guardia.`,
    ubicacionInicial: { continente: 'luminaerion', reino: 'elixiria', ubicacion: 'celdas', lugar: null }
  },
  {
    id: 'mazmorra',
    nombre: 'Mazmorra de Myuri — El Último Goblin',
    dificultad: 'Combate',
    tono: 'Supervivencia, Decisiones rápidas',
    icono: '⚔',
    descripcion: 'Tu grupo ha derrotado al jefe de la mazmorra, pero eres el único sobreviviente. Te enfrentas a un último enemigo.',
    prompt: `[INICIO DE PARTIDA: MAZMORRA MYURI]
El personaje está en una antigua Sala de las Quimeras en las ruinas del continente de Myuri. Su grupo acaba de derrotar al jefe de la mazmorra (una quimera de carne), pero todos sus compañeros han caído en combate excepto él. El jefe yace muerto en el centro de la sala ensangrentada. Queda un único goblin con vida, herido y acorralado, escondido detrás de un pilar de piedra rota.

El jugador empieza con su HP reducido al 60% (asume esto mecánicamente y aplícalo en tu primer bloque de comandos). 
Compañeros muertos a su alrededor: 
- Torva, la guerrera que cubrió la retirada.
- Nym, el pícaro que desactivó las trampas previas.
- El'rin, el clérigo que usó su última curación.

Como DM, narra la tensión del combate recién finalizado, el silencio que ahora reina solo roto por la respiración agitada del goblin herido. El goblin puede hablar. Pregunta al jugador qué hará con el enemigo acorralado y los cuerpos de sus amigos.`,
    ubicacionInicial: { continente: 'myuri', reino: 'laboratorios', ubicacion: 'sala_quimera', lugar: null }
  }
];
