import { useState, useMemo, useRef } from 'react'
import { useGameStore } from '../../engine/state'
import { razas } from '../../data/razas'
import { clases } from '../../data/clases'
import { trasfondos } from '../../data/trasfondos'
import {
  calcularModificadores, calcularHPMaximo, tirar4d6,
  arrayEstandar, costosCompraPuntos, generarInventarioInicial
} from '../../engine/dnd5e'

const PASOS = [
  'Nombre y Sexo',
  'Raza',
  'Clase',
  'Trasfondo',
  'Estadísticas',
  'Inventario',
  'Habilidades',
  'Confirmar',
]

const STATS_NOMBRES = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']
const STATS_FULL = {
  FUE: 'Fuerza', DES: 'Destreza', CON: 'Constitución',
  INT: 'Inteligencia', SAB: 'Sabiduría', CAR: 'Carisma'
}

const localAvatarsContext = import.meta.glob('../../assets/Imagenes/Avatars/*.{png,jpg,jpeg}', { eager: true, import: 'default' });
const localAvatars = Object.values(localAvatarsContext);

export default function WizardPersonaje({ onNavigate }) {
  const addToGaleria = useGameStore(s => s.addToGaleria)
  const setPersonajeActivo = useGameStore(s => s.setPersonajeActivo)

  const [paso, setPaso] = useState(0)
  const [pj, setPj] = useState({
    nombre: '',
    sexo: 'Masculino',
    avatar: null,
    raza: null,
    subraza: null,
    clase: null,
    subclase: null,
    trasfondo: null,
    estadisticas: { FUE: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
    metodoStats: null,
    habilidades: {
      pasiva: { nombre: '', emoji: '✨', descripcion: '', limitacion: 'Siempre activa' },
      activa1: { nombre: '', emoji: '⚔️', descripcion: '', limitacion: '' },
      activa2: { nombre: '', emoji: '🛡️', descripcion: '', limitacion: '' },
      activa3: { nombre: '', emoji: '🔮', descripcion: '', limitacion: '' },
      unica: { nombre: '', emoji: '🔥', descripcion: '', limitacion: '' }
    }
  })

  // Stats methods
  const [diceResults, setDiceResults] = useState([])
  const [diceAssigned, setDiceAssigned] = useState({})
  const [pointBuy, setPointBuy] = useState({ FUE: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 })
  const [standardAssigned, setStandardAssigned] = useState({})

  const razaData = useMemo(() => razas.find(r => r.id === pj.raza), [pj.raza])
  const subrazaData = useMemo(() => razaData?.subrazas?.find(s => s.id === pj.subraza), [razaData, pj.subraza])
  const claseData = useMemo(() => clases.find(c => c.id === pj.clase), [pj.clase])
  const trasfondoData = useMemo(() => trasfondos.find(t => t.id === pj.trasfondo), [pj.trasfondo])

  // Calculate final stats with racial bonuses
  const finalStats = useMemo(() => {
    const base = { ...pj.estadisticas }
    if (razaData?.bonificaciones) {
      Object.entries(razaData.bonificaciones).forEach(([stat, bonus]) => {
        if (base[stat] !== undefined) base[stat] += bonus
      })
    }
    if (subrazaData?.bonificaciones) {
      Object.entries(subrazaData.bonificaciones).forEach(([stat, bonus]) => {
        if (base[stat] !== undefined) base[stat] += bonus
      })
    }
    return base
  }, [pj.estadisticas, razaData, subrazaData])

  const finalMods = useMemo(() => calcularModificadores(finalStats), [finalStats])

  const pointBuyTotal = useMemo(() => {
    return Object.values(pointBuy).reduce((sum, v) => sum + (costosCompraPuntos[v] || 0), 0)
  }, [pointBuy])

  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    const template = {
      nombre: "[Nombre]",
      sexo: "Masculino/Femenino/Otro",
      avatar: null,
      raza: "humano",
      subraza: null,
      clase: "guerrero",
      subclase: null,
      trasfondo: "heroe_del_pueblo",
      estadisticas: { FUE: 15, DES: 14, CON: 13, INT: 12, SAB: 10, CAR: 8 },
      metodoStats: "estandar",
      habilidades: {
        pasiva: { nombre: "[Nombre]", emoji: "✨", descripcion: "[Efecto constante]", limitacion: "Siempre activa" },
        activa1: { nombre: "[Ataque 1]", emoji: "⚔️", descripcion: "[Daño y efecto]", limitacion: "1 vez por turno" },
        activa2: { nombre: "[Defensa 1]", emoji: "🛡️", descripcion: "[Efecto defensivo]", limitacion: "Cuesta 1 KI" },
        activa3: { nombre: "[Hechizo]", emoji: "🔮", descripcion: "[Magia]", limitacion: "Cuesta 10 de Maná" },
        unica: { nombre: "[Definitiva]", emoji: "🔥", descripcion: "[Efecto poderoso]", limitacion: "1 vez por descanso" }
      }
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_maestra.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.nombre && data.estadisticas) {
          setPj({ ...pj, ...data });
          setPaso(7); // Saltar al final
        } else {
          alert('Formato de personaje inválido.');
        }
      } catch (err) {
        alert('Error al leer el JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(pj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pj.nombre.replace(/\s+/g, '_')}_ficha.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRollDice = () => {
    const rolls = Array.from({ length: 6 }, () => tirar4d6())
    setDiceResults(rolls)
    setDiceAssigned({})
  }

  const handleAssignDice = (statKey, rollIndex) => {
    const newAssigned = { ...diceAssigned }
    // Remove any existing assignment for this stat
    Object.keys(newAssigned).forEach(k => {
      if (newAssigned[k] === rollIndex) delete newAssigned[k]
    })
    newAssigned[statKey] = rollIndex
    setDiceAssigned(newAssigned)

    // Update stats
    const newStats = { ...pj.estadisticas }
    STATS_NOMBRES.forEach(s => {
      if (newAssigned[s] !== undefined) {
        newStats[s] = diceResults[newAssigned[s]]
      }
    })
    setPj({ ...pj, estadisticas: newStats })
  }

  const handlePointBuyChange = (stat, delta) => {
    const newVal = pointBuy[stat] + delta
    if (newVal < 8 || newVal > 15) return
    const newPB = { ...pointBuy, [stat]: newVal }
    const newTotal = Object.values(newPB).reduce((sum, v) => sum + (costosCompraPuntos[v] || 0), 0)
    if (newTotal > 27) return
    setPointBuy(newPB)
    setPj({ ...pj, estadisticas: { ...newPB } })
  }

  const handleStandardAssign = (statKey, value) => {
    const newAssigned = { ...standardAssigned }
    // Remove existing assignment of this value
    Object.keys(newAssigned).forEach(k => {
      if (newAssigned[k] === value) delete newAssigned[k]
    })
    newAssigned[statKey] = value
    setStandardAssigned(newAssigned)

    const newStats = { ...pj.estadisticas }
    STATS_NOMBRES.forEach(s => {
      newStats[s] = newAssigned[s] || 8
    })
    setPj({ ...pj, estadisticas: newStats })
  }

  const inventarioGenerado = useMemo(() => {
    if (!pj.clase || !pj.trasfondo) return []
    return generarInventarioInicial(pj.clase, pj.trasfondo, clases, trasfondos)
  }, [pj.clase, pj.trasfondo])

  const handleConfirmar = () => {
    const hpMax = calcularHPMaximo(pj.clase, 1, finalMods.CON)
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

    const personajeCompleto = {
      id,
      nombre: pj.nombre,
      sexo: pj.sexo,
      avatar: pj.avatar,
      raza: razaData?.nombre || pj.raza,
      subraza: subrazaData?.nombre || pj.subraza || null,
      clase: claseData?.nombre || pj.clase,
      subclase: pj.subclase ? claseData?.subclases?.find(s => s.id === pj.subclase)?.nombre : null,
      trasfondo: trasfondoData?.nombre || pj.trasfondo,
      nivel: 1,
      experiencia: 0,
      hp: { actual: hpMax, maximo: hpMax },
      estadisticas: finalStats,
      modificadores: finalMods,
      claseArmadura: 10 + finalMods.DES,
      velocidad: razaData?.velocidad || 30,
      condiciones: [],
      proficiencias: [
        ...(claseData?.proficienciasArmas || []),
        ...(claseData?.proficienciasArmadura || []),
        ...(trasfondoData?.proficiencias || []),
      ],
      hechizos: [],
      trucos: [],
      dotes: [],
      ranuras: {},
      energia: { actual: 0, maximo: 0 },
      rasgos: [
        ...(razaData?.rasgos || []),
        ...(subrazaData?.rasgos || []),
      ],
      habilidades: pj.habilidades,
    }

    addToGaleria(personajeCompleto)
    setPersonajeActivo(id)
    onNavigate('galeria')
  }

  const canAdvance = () => {
    switch (paso) {
      case 0: return pj.nombre.trim().length > 0
      case 1: return pj.raza !== null
      case 2: return pj.clase !== null
      case 3: return pj.trasfondo !== null
      case 4: return pj.metodoStats !== null
      case 5: return true
      case 6: 
        return Object.values(pj.habilidades).every(h => h.nombre.trim() !== '' && h.descripcion.trim() !== '')
      case 7: return true
      default: return false
    }
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col p-4 pt-14 screen-enter overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45,45,68,0.4) 0%, rgba(15,15,30,1) 70%)'
      }}>

      {/* Header */}
      <div className="text-center mb-3 flex-shrink-0 relative">
        <h1 className="font-[var(--font-display)] text-xl text-[var(--color-gold)] tracking-wider mb-2">
          ✦ Crear Personaje
        </h1>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <button onClick={handleDownloadTemplate} className="btn-medieval px-2 py-1 text-[10px]">
            📄 Plantilla
          </button>
          <input type="file" accept=".json" ref={importInputRef} className="hidden" onChange={handleImportJSON} />
          <button onClick={() => importInputRef.current.click()} className="btn-medieval px-2 py-1 text-[10px]">
            📥 Importar
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="wizard-step-indicator max-w-2xl mx-auto w-full mb-4 flex-shrink-0 px-4">
        {PASOS.map((nombre, i) => (
          <div key={i} className="flex items-center" style={{ flex: i < PASOS.length - 1 ? 1 : 'none' }}>
            <div
              className={`wizard-step-dot ${i === paso ? 'active' : i < paso ? 'completed' : ''}`}
              title={nombre}
            >
              {i < paso ? '✓' : i + 1}
            </div>
            {i < PASOS.length - 1 && (
              <div className={`wizard-step-line ${i < paso ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0 overflow-y-auto max-w-3xl w-full mx-auto pb-4">
        <div className="panel-medieval-solid p-6">
          <h2 className="font-[var(--font-display)] text-lg text-[var(--color-gold)] mb-4">
            {PASOS[paso]}
          </h2>

          {/* PASO 0: Nombre y Sexo */}
          {paso === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                  Nombre del Personaje
                </label>
                <input
                  type="text"
                  className="input-medieval text-lg"
                  placeholder="Escribe un nombre épico..."
                  value={pj.nombre}
                  onChange={e => setPj({ ...pj, nombre: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-2 uppercase tracking-wider">
                  Sexo
                </label>
                <div className="flex gap-3 mb-6">
                  {['Masculino', 'Femenino', 'Otro'].map(s => (
                    <button
                      key={s}
                      onClick={() => setPj({ ...pj, sexo: s })}
                      className={`card-medieval flex-1 text-center py-3 ${pj.sexo === s ? 'selected' : ''}`}
                    >
                      <div className="text-2xl mb-1">
                        {s === 'Masculino' ? '🧑' : s === 'Femenino' ? '👩' : '🧝'}
                      </div>
                      <div className="font-[var(--font-ui)] text-sm">{s}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-2 uppercase tracking-wider">
                  Avatar del Personaje
                </label>
                <div className="flex flex-col gap-4">
                  {/* Current Avatar / Upload */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--color-gold)] overflow-hidden bg-[#1a1729] flex-shrink-0 flex items-center justify-center">
                      {pj.avatar ? (
                        <img src={pj.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[var(--color-parchment-dark)] text-2xl">👤</span>
                      )}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const size = 256;
                                canvas.width = size;
                                canvas.height = size;
                                const ctx = canvas.getContext('2d');
                                
                                const sizeMin = Math.min(img.width, img.height);
                                const startX = (img.width - sizeMin) / 2;
                                const startY = (img.height - sizeMin) / 2;
                                
                                ctx.drawImage(img, startX, startY, sizeMin, sizeMin, 0, 0, size, size);
                                const resizedDataUrl = canvas.toDataURL('image/webp', 0.8);
                                setPj({ ...pj, avatar: resizedDataUrl });
                              };
                              img.src = event.target.result;
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                      <button 
                        onClick={() => fileInputRef.current.click()} 
                        className="btn-medieval px-3 py-1.5 text-xs"
                      >
                        Subir Imagen (1:1)
                      </button>
                      <p className="text-[10px] text-[var(--color-parchment-dark)] mt-1 italic max-w-[200px]">
                        La imagen se guardará dentro de la ficha (Base64) para portabilidad.
                      </p>
                    </div>
                  </div>
                  
                  {/* Local Avatars Grid */}
                  <div>
                    <div className="text-[10px] uppercase text-[var(--color-parchment-dark)] mb-2 mt-2">O elige uno de la galería:</div>
                    <div className="flex flex-wrap gap-2">
                      {localAvatars.map((url, i) => (
                        <button 
                          key={i} 
                          onClick={() => setPj({ ...pj, avatar: url })}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${pj.avatar === url ? 'border-[var(--color-gold)] scale-110' : 'border-transparent hover:border-[var(--color-panel-border)]'}`}
                        >
                          <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 1: Raza */}
          {paso === 1 && (
            <div className="space-y-6">
              {/* Grid de razas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {razas.map(raza => {
                  const isSelected = pj.raza === raza.id
                  return (
                    <button
                      key={raza.id}
                      onClick={() => setPj({ ...pj, raza: raza.id, subraza: null })}
                      className={`text-left rounded-lg border-2 p-3 transition-all duration-200 relative
                        ${ isSelected
                          ? 'border-[var(--color-gold)] bg-[rgba(212,168,83,0.12)] shadow-[0_0_16px_rgba(212,168,83,0.25)]'
                          : 'border-[var(--color-panel-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(212,168,83,0.5)] hover:bg-[rgba(212,168,83,0.05)]'
                        }`}
                    >
                      {isSelected && <span className="absolute top-2 right-2 text-[var(--color-gold)] text-xs">✦</span>}
                      <div className="font-[var(--font-display)] text-sm text-[var(--color-parchment)] mb-1">{raza.nombre}</div>
                      <div className="text-[0.65rem] text-[var(--color-parchment-dark)] leading-snug mb-2">{raza.descripcion.substring(0, 65)}...</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(raza.bonificaciones).map(([stat, val]) => (
                          <span key={stat} className="text-[0.6rem] text-[var(--color-teal)] bg-[rgba(45,212,191,0.12)] border border-[rgba(45,212,191,0.2)] px-1.5 py-0.5 rounded-full font-bold">
                            {stat} +{val}
                          </span>
                        ))}
                        <span className="text-[0.6rem] text-[var(--color-parchment-dark)] border border-[var(--color-panel-border)] px-1.5 py-0.5 rounded-full">
                          🏃 {raza.velocidad}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Panel de detalle de la raza seleccionada */}
              {razaData && (
                <div className="border border-[var(--color-gold)] rounded-lg bg-[rgba(212,168,83,0.05)] p-4 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-[var(--font-display)] text-base text-[var(--color-gold)] mb-1">{razaData.nombre}</h3>
                      <p className="font-[var(--font-narrative)] text-sm text-[var(--color-parchment-dark)] italic mb-3">{razaData.descripcion}</p>
                      <div className="flex flex-wrap gap-2 text-xs font-[var(--font-ui)]">
                        {razaData.rasgos?.map(r => (
                          <span key={r} className="bg-[rgba(0,0,0,0.3)] border border-[var(--color-panel-border)] px-2 py-1 rounded text-[var(--color-parchment-dark)]">✦ {r}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Subrazas dentro del panel de detalle */}
                  {razaData.subrazas?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-[var(--font-display)] text-xs text-[var(--color-gold)] uppercase tracking-wider mb-2">Elige tu subraza</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {razaData.subrazas.map(sub => {
                          const isSubSel = pj.subraza === sub.id
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setPj({ ...pj, subraza: sub.id })}
                              className={`text-left rounded-lg p-3 border-2 transition-all duration-150
                                ${ isSubSel
                                  ? 'border-[var(--color-teal)] bg-[rgba(45,212,191,0.1)]'
                                  : 'border-[var(--color-panel-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(45,212,191,0.4)]'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-[var(--font-display)] text-sm text-[var(--color-parchment)]">{sub.nombre}</span>
                                {isSubSel && <span className="text-[var(--color-teal)] text-xs">✓</span>}
                              </div>
                              <p className="text-[0.65rem] text-[var(--color-parchment-dark)] mt-1">{sub.descripcion}</p>
                              {sub.bonificaciones && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(sub.bonificaciones).map(([stat, val]) => (
                                    <span key={stat} className="text-[0.6rem] text-[var(--color-teal)] bg-[rgba(45,212,191,0.1)] px-1.5 py-0.5 rounded-full border border-[rgba(45,212,191,0.2)] font-bold">
                                      {stat} +{val}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Clase */}
          {paso === 2 && (
            <div className="space-y-6">
              {/* Grid de clases */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {clases.map(cls => {
                  const isSelected = pj.clase === cls.id
                  const iconos = { barbaro:'🪓', bardo:'🎵', brujo:'🌑', clerigo:'✝', druida:'🌿', explorador:'🏹', guerrero:'⚔', hechicero:'🔥', mago:'📚', monje:'🥋', paladin:'🛡', picaro:'🗡' }
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setPj({ ...pj, clase: cls.id, subclase: null })}
                      className={`text-left rounded-lg border-2 p-3 transition-all duration-200 relative
                        ${ isSelected
                          ? 'border-[var(--color-gold)] bg-[rgba(212,168,83,0.12)] shadow-[0_0_16px_rgba(212,168,83,0.25)]'
                          : 'border-[var(--color-panel-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(212,168,83,0.5)] hover:bg-[rgba(212,168,83,0.05)]'
                        }`}
                    >
                      {isSelected && <span className="absolute top-2 right-2 text-[var(--color-gold)] text-xs">✦</span>}
                      <div className="text-xl mb-1">{iconos[cls.id] || '⚡'}</div>
                      <div className="font-[var(--font-display)] text-sm text-[var(--color-parchment)] mb-1">{cls.nombre}</div>
                      <div className="flex gap-2 mb-1">
                        <span className="text-[0.6rem] text-[var(--color-gold)] bg-[rgba(212,168,83,0.1)] px-1.5 py-0.5 rounded font-bold">{cls.dadoGolpe}</span>
                        <span className="text-[0.6rem] text-[var(--color-mana-light)] bg-[rgba(99,102,241,0.1)] px-1.5 py-0.5 rounded">{cls.estadisticaPrincipal}</span>
                      </div>
                      <div className="text-[0.6rem] text-[var(--color-parchment-dark)] leading-snug">{cls.descripcion?.substring(0, 55)}...</div>
                    </button>
                  )
                })}
              </div>

              {/* Panel de detalle de la clase seleccionada */}
              {claseData && (
                <div className="border border-[var(--color-gold)] rounded-lg bg-[rgba(212,168,83,0.05)] p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-[var(--font-display)] text-base text-[var(--color-gold)] mb-1">{claseData.nombre}</h3>
                      <p className="font-[var(--font-narrative)] text-sm text-[var(--color-parchment-dark)] italic mb-3">{claseData.descripcion}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                          <div className="text-[var(--color-gold)] font-bold mb-0.5">Dados de golpe</div>
                          <div className="text-[var(--color-parchment)]">{claseData.dadoGolpe}</div>
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                          <div className="text-[var(--color-gold)] font-bold mb-0.5">Estadística clave</div>
                          <div className="text-[var(--color-parchment)]">{claseData.estadisticaPrincipal}</div>
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                          <div className="text-[var(--color-gold)] font-bold mb-0.5">Armaduras</div>
                          <div className="text-[var(--color-parchment)] text-[0.65rem]">{claseData.proficienciasArmadura?.join(', ') || 'Ninguna'}</div>
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                          <div className="text-[var(--color-gold)] font-bold mb-0.5">Salvaciones</div>
                          <div className="text-[var(--color-parchment)]">{claseData.salvaciones?.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subclases dentro del panel de detalle */}
                  {claseData.subclases?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-[var(--font-display)] text-xs text-[var(--color-gold)] uppercase tracking-wider mb-2">Elige tu especialización <span className="text-[var(--color-parchment-dark)] normal-case">(opcional)</span></p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {claseData.subclases.map(sub => {
                          const isSubSel = pj.subclase === sub.id
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setPj({ ...pj, subclase: isSubSel ? null : sub.id })}
                              className={`text-left rounded-lg p-3 border-2 transition-all duration-150
                                ${ isSubSel
                                  ? 'border-[var(--color-mana-light)] bg-[rgba(99,102,241,0.1)]'
                                  : 'border-[var(--color-panel-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(99,102,241,0.4)]'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-[var(--font-display)] text-sm text-[var(--color-parchment)]">{sub.nombre}</span>
                                {isSubSel && <span className="text-[var(--color-mana-light)] text-xs">✓</span>}
                              </div>
                              <p className="text-[0.65rem] text-[var(--color-parchment-dark)] mt-1">{sub.descripcion}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Trasfondo */}
          {paso === 3 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {trasfondos.map(tf => (
                <div
                  key={tf.id}
                  onClick={() => setPj({ ...pj, trasfondo: tf.id })}
                  className={`card-medieval ${pj.trasfondo === tf.id ? 'selected' : ''}`}
                >
                  <h3 className="font-[var(--font-display)] text-sm text-[var(--color-parchment)]">{tf.nombre}</h3>
                  <p className="font-[var(--font-ui)] text-[0.6rem] text-[var(--color-parchment-dark)] mt-1">
                    {tf.descripcion?.substring(0, 80)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tf.proficiencias.map(p => (
                      <span key={p} className="text-[0.55rem] text-[var(--color-mana-light)] bg-[rgba(99,102,241,0.1)] px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-[0.55rem] text-[var(--color-gold)]">
                    💰 {tf.oroInicial} po
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASO 4: Estadísticas */}
          {paso === 4 && (
            <div className="space-y-4">

              {/* Method Selection */}
              {!pj.metodoStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={() => { setPj({ ...pj, metodoStats: 'dados' }); handleRollDice() }}
                    className="border-2 border-[var(--color-panel-border)] rounded-xl p-5 text-center hover:border-[var(--color-gold)] hover:bg-[rgba(212,168,83,0.06)] transition-all group">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎲</div>
                    <div className="font-[var(--font-display)] text-base text-[var(--color-parchment)] mb-1">Lanzar Dados</div>
                    <div className="text-xs text-[var(--color-parchment-dark)]">4d6, descarta el dado más bajo. ¡Resultados únicos!</div>
                    <div className="mt-2 text-[var(--color-gold)] text-xs font-bold">Alta varianza · Para los valientes</div>
                  </button>
                  <button onClick={() => setPj({ ...pj, metodoStats: 'compra' })}
                    className="border-2 border-[var(--color-panel-border)] rounded-xl p-5 text-center hover:border-[var(--color-gold)] hover:bg-[rgba(212,168,83,0.06)] transition-all group">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🪙</div>
                    <div className="font-[var(--font-display)] text-base text-[var(--color-parchment)] mb-1">Compra de Puntos</div>
                    <div className="text-xs text-[var(--color-parchment-dark)]">27 puntos para distribuir. Stats de 8 a 15.</div>
                    <div className="mt-2 text-[var(--color-teal)] text-xs font-bold">Equilibrado · Para los tácticos</div>
                  </button>
                  <button onClick={() => setPj({ ...pj, metodoStats: 'estandar' })}
                    className="border-2 border-[var(--color-panel-border)] rounded-xl p-5 text-center hover:border-[var(--color-gold)] hover:bg-[rgba(212,168,83,0.06)] transition-all group">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📊</div>
                    <div className="font-[var(--font-display)] text-base text-[var(--color-parchment)] mb-1">Array Estándar</div>
                    <div className="text-xs text-[var(--color-parchment-dark)]">Asigna 15, 14, 13, 12, 10, 8 a tus stats.</div>
                    <div className="mt-2 text-[var(--color-mana-light)] text-xs font-bold">Predecible · Para los planificadores</div>
                  </button>
                </div>
              )}

              {/* TABLA UNIFICADA DE STATS — se muestra para todos los métodos activos */}
              {pj.metodoStats && (() => {
                // Calculamos los bonos de raza+subraza para mostrarlos al lado
                const raceBonuses = {
                  ...( razaData?.bonificaciones || {} ),
                  ...( subrazaData?.bonificaciones || {} ),
                }
                return (
                  <div className="space-y-3">
                    {/* Header del método activo */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{pj.metodoStats === 'dados' ? '🎲' : pj.metodoStats === 'compra' ? '🪙' : '📊'}</span>
                        <span className="font-[var(--font-display)] text-sm text-[var(--color-gold)]">
                          {pj.metodoStats === 'dados' ? 'Lanzar Dados' : pj.metodoStats === 'compra' ? `Compra de Puntos (${pointBuyTotal}/27)` : 'Array Estándar'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {pj.metodoStats === 'dados' && (
                          <button onClick={handleRollDice} className="btn-medieval btn-medieval-sm">🎲 Volver a tirar</button>
                        )}
                        <button onClick={() => setPj({ ...pj, metodoStats: null })} className="btn-medieval btn-medieval-sm btn-medieval-danger">
                          Cambiar método
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso para compra de puntos */}
                    {pj.metodoStats === 'compra' && (
                      <div className="h-2 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-teal)] rounded-full transition-all"
                          style={{ width: `${Math.min(100,(pointBuyTotal / 27) * 100)}%` }} />
                      </div>
                    )}

                    {/* Dados disponibles */}
                    {pj.metodoStats === 'dados' && diceResults.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {diceResults.map((val, i) => (
                          <div key={i} className={`px-3 py-1.5 rounded-lg border-2 font-[var(--font-display)] text-base font-bold transition-all
                            ${Object.values(diceAssigned).includes(i)
                              ? 'border-[var(--color-teal)] bg-[rgba(45,212,191,0.1)] text-[var(--color-teal)] opacity-50'
                              : 'border-[var(--color-gold)] bg-[rgba(212,168,83,0.1)] text-[var(--color-gold)]'}`}>
                            {val}
                          </div>
                        ))}
                        <span className="text-xs text-[var(--color-parchment-dark)] self-center ml-1">← Asigna usando los menús de abajo</span>
                      </div>
                    )}

                    {/* Tabla de stats */}
                    <div className="space-y-2">
                      {STATS_NOMBRES.map(stat => {
                        const raceBonus = raceBonuses[stat] || 0
                        let baseVal = 10
                        if (pj.metodoStats === 'compra') baseVal = pointBuy[stat]
                        else if (pj.metodoStats === 'dados' && diceAssigned[stat] !== undefined) baseVal = diceResults[diceAssigned[stat]]
                        else if (pj.metodoStats === 'estandar' && standardAssigned[stat] !== undefined) baseVal = standardAssigned[stat]
                        const totalVal = baseVal + raceBonus
                        const mod = Math.floor((totalVal - 10) / 2)
                        return (
                          <div key={stat} className="flex items-center gap-3 bg-[rgba(0,0,0,0.2)] rounded-lg px-3 py-2">
                            {/* Nombre y descripción */}
                            <div className="w-24 flex-shrink-0">
                              <div className="font-[var(--font-display)] text-sm text-[var(--color-gold)]">{stat}</div>
                              <div className="text-[0.6rem] text-[var(--color-parchment-dark)]">{STATS_FULL[stat]}</div>
                            </div>

                            {/* Control del método */}
                            <div className="flex-1">
                              {pj.metodoStats === 'compra' && (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handlePointBuyChange(stat, -1)}
                                    className="w-7 h-7 rounded border border-[var(--color-panel-border)] text-[var(--color-parchment)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors font-bold text-lg flex items-center justify-center">
                                    −
                                  </button>
                                  <div className="font-[var(--font-display)] text-xl text-[var(--color-parchment)] w-8 text-center">{pointBuy[stat]}</div>
                                  <button onClick={() => handlePointBuyChange(stat, 1)}
                                    className="w-7 h-7 rounded border border-[var(--color-panel-border)] text-[var(--color-parchment)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors font-bold text-lg flex items-center justify-center">
                                    +
                                  </button>
                                  <div className="h-1.5 flex-1 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--color-teal)] rounded-full transition-all" style={{ width: `${((pointBuy[stat] - 8) / 7) * 100}%` }} />
                                  </div>
                                  <span className="text-[0.6rem] text-[var(--color-parchment-dark)] w-12 text-right">{costosCompraPuntos[pointBuy[stat]]} pts</span>
                                </div>
                              )}
                              {pj.metodoStats === 'dados' && (
                                <select className="input-medieval text-sm py-1" value={diceAssigned[stat] ?? ''}
                                  onChange={e => handleAssignDice(stat, parseInt(e.target.value))}>
                                  <option value="">— Selecciona —</option>
                                  {diceResults.map((val, i) => (
                                    <option key={i} value={i} disabled={Object.values(diceAssigned).includes(i) && diceAssigned[stat] !== i}>
                                      {val} {Object.values(diceAssigned).includes(i) && diceAssigned[stat] !== i ? '(asignado)' : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {pj.metodoStats === 'estandar' && (
                                <select className="input-medieval text-sm py-1" value={standardAssigned[stat] ?? ''}
                                  onChange={e => handleStandardAssign(stat, parseInt(e.target.value))}>
                                  <option value="">— Selecciona —</option>
                                  {arrayEstandar.map(val => (
                                    <option key={val} value={val}
                                      disabled={Object.values(standardAssigned).includes(val) && standardAssigned[stat] !== val}>
                                      {val} {Object.values(standardAssigned).includes(val) && standardAssigned[stat] !== val ? '(asignado)' : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Bono de raza */}
                            {raceBonus > 0 && (
                              <div className="text-[var(--color-teal)] text-sm font-bold w-10 text-center flex-shrink-0">+{raceBonus}</div>
                            )}
                            {raceBonus === 0 && <div className="w-10 flex-shrink-0" />}

                            {/* Total y modificador */}
                            <div className="text-right flex-shrink-0 w-16">
                              <div className="font-[var(--font-display)] text-xl text-[var(--color-parchment)] font-bold">{totalVal}</div>
                              <div className={`text-sm font-bold ${mod >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                                {mod >= 0 ? '+' : ''}{mod}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Leyenda */}
                    {Object.keys(raceBonuses).length > 0 && (
                      <p className="text-[0.65rem] text-[var(--color-teal)] text-center">
                        ✦ Los bonos en verde son la bonificación de tu raza ({razaData?.nombre}{subrazaData ? ` / ${subrazaData.nombre}` : ''})
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* PASO 5: Inventario */}
          {paso === 5 && (
            <div>
              <p className="font-[var(--font-narrative)] text-sm text-[var(--color-parchment-dark)] mb-4 italic">
                Inventario generado automáticamente según tu clase ({claseData?.nombre}) y trasfondo ({trasfondoData?.nombre})
              </p>
              <div className="space-y-2">
                {inventarioGenerado.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[rgba(0,0,0,0.2)] border border-[var(--color-panel-border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {item.tipo === 'arma' ? '⚔' : item.tipo === 'armadura' ? '🛡' : item.tipo === 'consumible' ? '🧪' : '📦'}
                      </span>
                      <span className="font-[var(--font-narrative)] text-sm text-[var(--color-parchment)]">{item.nombre}</span>
                    </div>
                    <span className="font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)]">
                      x{item.cantidad}
                    </span>
                  </div>
                ))}
              </div>
              {trasfondoData && (
                <div className="mt-3 text-sm text-[var(--color-gold)] font-[var(--font-ui)]">
                  💰 Oro inicial: {trasfondoData.oroInicial} po
                </div>
              )}
            </div>
          )}

          {/* PASO 6: Habilidades */}
          {paso === 6 && (
            <div className="space-y-6 overflow-y-auto pr-2" style={{ maxHeight: '60vh' }}>
              <p className="font-[var(--font-narrative)] text-sm text-[var(--color-parchment-dark)] mb-4 italic">
                Crea tu propio set de habilidades. El Dungeon Master interpretará sus efectos y respetará las limitaciones que impongas.
              </p>

              {['pasiva', 'activa1', 'activa2', 'activa3', 'unica'].map((key) => {
                const hab = pj.habilidades[key];
                const typeLabel = key === 'pasiva' ? 'Habilidad Pasiva' : key === 'unica' ? 'Habilidad Única (Definitiva)' : `Habilidad Activa ${key.slice(-1)}`;
                const emojiOptions = ['✨', '⚔️', '🛡️', '🔮', '🔥', '💨', '💧', '⚡', '🌙', '☀️', '🩸', '🏹'];

                return (
                  <div key={key} className="bg-[rgba(0,0,0,0.3)] border border-[var(--color-panel-border)] rounded-md p-4">
                    <h4 className="font-[var(--font-display)] text-[var(--color-gold)] mb-3">{typeLabel}</h4>
                    
                    <div className="flex gap-3 mb-3">
                      <select 
                        value={hab.emoji}
                        onChange={e => setPj({ ...pj, habilidades: { ...pj.habilidades, [key]: { ...hab, emoji: e.target.value } } })}
                        className="input-medieval text-xl w-14 text-center cursor-pointer"
                      >
                        {emojiOptions.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                      
                      <input 
                        type="text" 
                        placeholder="Nombre de la Habilidad" 
                        value={hab.nombre}
                        onChange={e => setPj({ ...pj, habilidades: { ...pj.habilidades, [key]: { ...hab, nombre: e.target.value } } })}
                        className="input-medieval flex-1 font-[var(--font-display)] text-lg"
                      />
                    </div>

                    <textarea 
                      placeholder="Descripción y Efecto (¿Qué hace? ¿Cómo se ve?)"
                      value={hab.descripcion}
                      onChange={e => setPj({ ...pj, habilidades: { ...pj.habilidades, [key]: { ...hab, descripcion: e.target.value } } })}
                      className="input-medieval w-full mb-3 h-20 resize-none text-sm"
                    />

                    <input 
                      type="text" 
                      placeholder={key === 'pasiva' ? "Limitación (Ej: Siempre activa)" : "Limitación (Ej: Cuesta 1 KI, 1 vez por combate)"}
                      value={hab.limitacion}
                      onChange={e => setPj({ ...pj, habilidades: { ...pj.habilidades, [key]: { ...hab, limitacion: e.target.value } } })}
                      className="input-medieval w-full text-xs text-[var(--color-parchment-dark)] italic"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* PASO 7: Confirmar */}
          {paso === 7 && (
            <div className="space-y-4">
              <div className="text-center mb-4 relative">
                <button onClick={handleExportJSON} className="absolute right-0 top-0 btn-medieval px-2 py-1 text-[10px]" title="Exportar ficha JSON">
                  💾 Exportar JSON
                </button>
                <div 
                  className="w-20 h-20 mx-auto rounded-full border-2 border-[var(--color-gold)] overflow-hidden bg-[#1a1729] mb-3 flex items-center justify-center cursor-pointer relative group"
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar Avatar"
                >
                  {pj.avatar ? (
                    <img src={pj.avatar} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-40" />
                  ) : (
                    <div className="text-4xl transition-opacity group-hover:opacity-40">{pj.sexo === 'Femenino' ? '👩' : pj.sexo === 'Masculino' ? '🧑' : '🧝'}</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <span className="text-[10px] text-white font-bold text-center leading-tight">CAMBIAR<br/>AVATAR</span>
                  </div>
                </div>
                <h3 className="font-[var(--font-display)] text-xl text-[var(--color-gold)]">{pj.nombre}</h3>
                <p className="font-[var(--font-ui)] text-sm text-[var(--color-parchment-dark)]">
                  {razaData?.nombre} {subrazaData ? `(${subrazaData.nombre})` : ''} · {claseData?.nombre} · {trasfondoData?.nombre}
                </p>
              </div>

              {/* Final Stats */}
              <div className="grid grid-cols-6 gap-2">
                {STATS_NOMBRES.map(stat => (
                  <div key={stat} className="stat-block bg-[rgba(0,0,0,0.2)] rounded p-2 text-center">
                    <span className="stat-label block text-[10px] text-[var(--color-parchment-dark)]">{stat}</span>
                    <span className="stat-value block font-bold text-lg">{finalStats[stat]}</span>
                    <span className="stat-mod block text-[10px] text-[var(--color-gold)]">{finalMods[stat] >= 0 ? '+' : ''}{finalMods[stat]}</span>
                  </div>
                ))}
              </div>

              {/* Habilidades Resumen */}
              <div className="mt-4">
                <h4 className="font-[var(--font-display)] text-sm text-[var(--color-gold)] mb-2">Habilidades Personalizadas</h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(pj.habilidades).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-[rgba(0,0,0,0.2)] border border-[var(--color-panel-border)] px-3 py-2 rounded">
                      <span className="text-base">{h.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[var(--color-parchment)] font-bold truncate">{h.nombre}</div>
                        <div className="text-[var(--color-parchment-dark)] truncate italic">{h.limitacion}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="screen-bottom-actions flex items-center justify-between max-w-3xl w-full mx-auto mt-4 flex-shrink-0">
        <button
          onClick={() => paso === 0 ? onNavigate('galeria') : setPaso(paso - 1)}
          className="btn-medieval"
        >
          ← {paso === 0 ? 'Galería' : 'Anterior'}
        </button>

        {paso < 7 ? (
          <button
            onClick={() => setPaso(paso + 1)}
            disabled={!canAdvance()}
            className="btn-medieval btn-medieval-primary"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleConfirmar}
            className="btn-medieval btn-medieval-primary text-lg px-8"
          >
            ✦ Crear Personaje
          </button>
        )}
      </div>
    </div>
  )
}
