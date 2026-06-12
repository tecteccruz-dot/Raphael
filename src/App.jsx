import { useState, useEffect } from 'react'
import { useGameStore } from './engine/state'
import ConfiguracionServidor from './components/setup/ConfiguracionServidor'
import PromptMaestroScreen from './components/setup/PromptMaestro'
import Galeria from './components/gallery/Galeria'
import SeleccionInicio from './components/game/SeleccionInicio'
import PantallaJuego from './components/game/PantallaJuego'
import WizardPersonaje from './components/character/WizardPersonaje'
import MenuGuardado from './components/ui/MenuGuardado'

const PANTALLAS = {
  configuracion: ConfiguracionServidor,
  prompt: PromptMaestroScreen,
  galeria: Galeria,
  wizard: WizardPersonaje,
  inicio: SeleccionInicio,
  juego: PantallaJuego,
}

export default function App() {
  const pantallaActual = useGameStore(s => s.pantallaActual)
  const setPantalla = useGameStore(s => s.setPantalla)
  const config = useGameStore(s => s.config)
  const personaje = useGameStore(s => s.personaje)
  const historial = useGameStore(s => s.historial)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [menuGuardadoAbierto, setMenuGuardadoAbierto] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  // Auto-navigate based on saved state
  useEffect(() => {
    if (config.apiKey && historial.length > 0 && personaje) {
      setPantalla('juego')
    } else if (config.apiKey && personaje) {
      setPantalla('inicio')
    } else if (config.apiKey) {
      setPantalla('prompt')
    }
  }, [])

  const navegarA = (pantalla) => {
    setTransitioning(true)
    setMenuAbierto(false)
    setTimeout(() => {
      setPantalla(pantalla)
      setTransitioning(false)
    }, 200)
  }

  const PantallaComponente = PANTALLAS[pantallaActual] || ConfiguracionServidor

  const pantallasNav = [
    { id: 'configuracion', nombre: 'Configuración', icono: '⚙' },
    { id: 'prompt', nombre: 'Prompt Maestro', icono: '📜' },
    { id: 'galeria', nombre: 'Galería', icono: '⚔' },
    { id: 'inicio', nombre: 'Inicios', icono: '🗺' },
    { id: 'juego', nombre: 'Jugar', icono: '🎮', requiere: personaje },
  ]

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Navigation Menu Button - not shown during game */}
      {pantallaActual !== 'juego' && (
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="fixed top-4 left-4 z-50 btn-medieval btn-medieval-sm"
          style={{ padding: '0.4rem 0.6rem' }}
        >
          ☰
        </button>
      )}

      {/* Navigation Sidebar */}
      {menuAbierto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMenuAbierto(false)}
          />
          <nav className="fixed top-0 left-0 h-full w-64 z-50 panel-medieval-solid"
            style={{ borderRadius: '0 8px 8px 0' }}>
            <div className="p-4">
              <h1 className="text-xl font-[var(--font-display)] font-bold text-[var(--color-gold)] tracking-widest drop-shadow-md">
                ⚔ Raphael
              </h1>
              <div className="flex flex-col gap-1">
                {pantallasNav.map(p => (
                  <button
                    key={p.id}
                    onClick={() => p.requiere !== false && navegarA(p.id)}
                    disabled={p.requiere === false}
                    className={`text-left px-3 py-2.5 rounded transition-all duration-200 flex items-center gap-3
                      ${pantallaActual === p.id
                        ? 'bg-[rgba(212,168,83,0.15)] text-[var(--color-gold-light)] border-l-2 border-[var(--color-gold)]'
                        : 'text-[var(--color-parchment)] hover:bg-[rgba(212,168,83,0.08)] border-l-2 border-transparent'
                      }
                      ${p.requiere === false ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="text-lg">{p.icono}</span>
                    <span className="font-[var(--font-ui)] text-sm">{p.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </>
      )}

      {/* Main Content */}
      <div className={`w-full h-full min-h-0 overflow-hidden transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <PantallaComponente
          onNavigate={navegarA}
          onOpenSave={() => setMenuGuardadoAbierto(true)}
          onOpenNavigation={() => setMenuAbierto(true)}
        />
      </div>

      {/* Save Menu Modal */}
      {menuGuardadoAbierto && (
        <MenuGuardado onClose={() => setMenuGuardadoAbierto(false)} onNavigate={navegarA} />
      )}
    </div>
  )
}
