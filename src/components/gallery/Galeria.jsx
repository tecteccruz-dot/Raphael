import { useGameStore } from '../../engine/state'
import { calcularModificador } from '../../engine/dnd5e'

export default function Galeria({ onNavigate }) {
  const galeria = useGameStore(s => s.galeria)
  const personajeActivoId = useGameStore(s => s.personajeActivoId)
  const setPersonajeActivo = useGameStore(s => s.setPersonajeActivo)
  const removeFromGaleria = useGameStore(s => s.removeFromGaleria)

  const handleActivar = (id) => {
    setPersonajeActivo(id)
  }

  const handleEliminar = (id, nombre) => {
    if (confirm(`¿Eliminar a ${nombre} permanentemente?`)) {
      removeFromGaleria(id)
    }
  }

  const handleJugar = () => {
    if (personajeActivoId) {
      onNavigate('inicio')
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center p-4 pt-14 screen-enter overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45,45,68,0.4) 0%, rgba(15,15,30,1) 70%)'
      }}>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-gold)] tracking-wider mb-1">
          ⚔ Galería de Personajes
        </h1>
        <p className="font-[var(--font-narrative)] text-[var(--color-parchment-dark)] text-sm italic">
          Elige tu héroe o crea uno nuevo
        </p>
        <div className="w-24 h-px bg-[var(--color-gold)] mx-auto mt-2 opacity-50" />
      </div>

      {/* Character Grid */}
      <div className="w-full max-w-4xl">
        {galeria.length === 0 ? (
          <div className="panel-medieval-solid p-12 text-center">
            <div className="text-5xl mb-4 opacity-40">🗡</div>
            <p className="font-[var(--font-narrative)] text-[var(--color-parchment-dark)] text-lg mb-2">
              No hay personajes todavía
            </p>
            <p className="font-[var(--font-ui)] text-xs text-[rgba(244,232,193,0.3)] mb-6">
              Crea tu primer personaje para comenzar la aventura
            </p>
            <button onClick={() => onNavigate('wizard')} className="btn-medieval btn-medieval-primary">
              ✦ Crear Personaje
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {galeria.map(pj => {
                const isActive = personajeActivoId === pj.id
                return (
                  <div
                    key={pj.id}
                    onClick={() => handleActivar(pj.id)}
                    className={`card-medieval relative ${isActive ? 'selected' : ''}`}
                  >
                    {isActive && (
                      <div className="absolute top-2 left-2 text-[0.6rem] font-[var(--font-ui)] text-[var(--color-teal)] uppercase tracking-wider bg-[rgba(45,212,191,0.1)] px-2 py-0.5 rounded">
                        Activo
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <div className="text-3xl mb-2">
                        {pj.sexo === 'Femenino' ? '👩' : pj.sexo === 'Masculino' ? '🧑' : '🧝'}
                      </div>
                      <h3 className="font-[var(--font-display)] text-lg text-[var(--color-parchment)]">
                        {pj.nombre}
                      </h3>
                      <p className="font-[var(--font-ui)] text-xs text-[var(--color-gold)] mt-0.5">
                        {pj.raza} {pj.subraza ? `(${pj.subraza})` : ''} · {pj.clase}
                      </p>
                      <p className="font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mt-0.5">
                        Nivel {pj.nivel} · {pj.trasfondo}
                      </p>
                    </div>

                    {/* Stats Mini */}
                    <div className="flex justify-center gap-2 mt-3 flex-wrap">
                      {pj.estadisticas && Object.entries(pj.estadisticas).map(([stat, val]) => (
                        <div key={stat} className="text-center">
                          <div className="font-[var(--font-display)] text-[0.55rem] text-[var(--color-gold)] uppercase">
                            {stat}
                          </div>
                          <div className="font-[var(--font-display)] text-sm text-[var(--color-parchment)]">
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* HP */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[0.65rem] font-[var(--font-ui)] mb-1">
                        <span className="text-[var(--color-health)]">HP</span>
                        <span className="text-[var(--color-parchment-dark)]">
                          {pj.hp?.actual ?? pj.hp?.maximo ?? '?'}/{pj.hp?.maximo ?? '?'}
                        </span>
                      </div>
                      <div className="hp-bar-container">
                        <div
                          className={`hp-bar-fill ${
                            (pj.hp?.actual / pj.hp?.maximo) > 0.5 ? 'hp-high' :
                            (pj.hp?.actual / pj.hp?.maximo) > 0.25 ? 'hp-mid' : 'hp-low'
                          }`}
                          style={{ width: `${((pj.hp?.actual ?? pj.hp?.maximo ?? 1) / (pj.hp?.maximo ?? 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEliminar(pj.id, pj.nombre) }}
                        className="btn-medieval btn-medieval-sm btn-medieval-danger flex-1 text-center"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Create New Card */}
              <div
                onClick={() => onNavigate('wizard')}
                className="card-medieval flex flex-col items-center justify-center min-h-[200px] cursor-pointer border-dashed"
              >
                <div className="text-4xl mb-2 opacity-40">✦</div>
                <p className="font-[var(--font-display)] text-sm text-[var(--color-gold)] opacity-60">
                  Crear Nuevo
                </p>
              </div>
            </div>

            {/* Play Button */}
            <div className="screen-bottom-actions sticky bottom-0 flex items-center justify-between">
              <button onClick={() => onNavigate('prompt')} className="btn-medieval">
                ← Prompt Maestro
              </button>
              <button
                onClick={handleJugar}
                disabled={!personajeActivoId}
                className="btn-medieval btn-medieval-primary text-lg px-8"
              >
                ⚔ Jugar →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
