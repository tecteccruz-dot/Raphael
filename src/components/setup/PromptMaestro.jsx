import { useState, useEffect } from 'react'
import { useGameStore } from '../../engine/state'
import { promptMaestroPredeterminado } from '../../data/lore'

export default function PromptMaestroScreen({ onNavigate }) {
  const promptMaestro = useGameStore(s => s.promptMaestro)
  const setPromptMaestro = useGameStore(s => s.setPromptMaestro)
  const [texto, setTexto] = useState('')
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (promptMaestro) {
      setTexto(promptMaestro)
    } else {
      setTexto(promptMaestroPredeterminado)
      setPromptMaestro(promptMaestroPredeterminado)
    }
  }, [])

  const handleGuardar = () => {
    setPromptMaestro(texto)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const handleRestaurar = () => {
    if (confirm('¿Restaurar el prompt maestro a su versión predeterminada? Se perderán tus cambios.')) {
      setTexto(promptMaestroPredeterminado)
      setPromptMaestro(promptMaestroPredeterminado)
    }
  }

  const handleContinuar = () => {
    setPromptMaestro(texto)
    onNavigate('galeria')
  }

  const lineCount = texto.split('\n').length
  const charCount = texto.length

  return (
    <div className="w-full h-full min-h-0 flex flex-col items-center p-4 md:p-6 pt-16 screen-enter overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45,45,68,0.4) 0%, rgba(15,15,30,1) 70%)'
      }}>

      {/* Header */}
      <div className="text-center mb-4 md:mb-6 flex-shrink-0 w-full max-w-4xl">
        <h1 className="font-[var(--font-display)] text-2xl md:text-3xl text-[var(--color-gold)] tracking-wider mb-2 drop-shadow-md">
          📜 Prompt Maestro
        </h1>
        <p className="font-[var(--font-narrative)] text-[var(--color-parchment-light)] text-sm italic drop-shadow-md">
          El documento sagrado que convierte a la IA en tu Dungeon Master
        </p>
      </div>

      {/* Editor Container (Parchment Style) */}
      <div className="flex-1 w-full max-w-4xl flex flex-col min-h-0 bg-[#f4e8c1] rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-[#d4c49a] relative"
           style={{
             backgroundImage: 'linear-gradient(to right, rgba(212,196,154,0.4) 0%, transparent 3%, transparent 97%, rgba(212,196,154,0.4) 100%)'
           }}>
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 md:p-3 border-b border-[#d4c49a] bg-[rgba(212,196,154,0.3)] flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-4 pl-2">
            <span className="font-[var(--font-ui)] text-xs text-[#5a4a3a] font-bold">
              {lineCount} líneas
            </span>
            {guardado && (
              <span className="text-xs text-green-700 font-[var(--font-ui)] font-bold animate-pulse">
                ✅ Guardado
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleRestaurar} 
              className="font-[var(--font-display)] text-[0.65rem] md:text-xs font-bold tracking-wider uppercase px-2 md:px-4 py-1.5 border border-[#8b1a1a] text-[#8b1a1a] rounded hover:bg-[#8b1a1a] hover:text-[#f4e8c1] transition-colors">
              Restaurar
            </button>
            <button onClick={handleGuardar} 
              className="font-[var(--font-display)] text-[0.65rem] md:text-xs font-bold tracking-wider uppercase px-2 md:px-4 py-1.5 border border-[#1a1a2e] text-[#1a1a2e] rounded hover:bg-[#1a1a2e] hover:text-[#f4e8c1] transition-colors">
              💾 Guardar
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          className="flex-1 w-full min-h-0 resize-none p-4 md:p-8 outline-none bg-transparent text-[#1a1a2e] overflow-y-auto"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          spellCheck={false}
          style={{ 
            fontFamily: 'var(--font-narrative)', 
            fontSize: '1.1rem', 
            lineHeight: '1.7' 
          }}
        />
      </div>

      {/* Bottom Bar */}
      <div className="screen-bottom-actions w-full max-w-4xl flex items-center justify-between mt-4 md:mt-6 flex-shrink-0">
        <button onClick={() => onNavigate('configuracion')} className="btn-medieval">
          ← Configuración
        </button>
        <button onClick={handleContinuar} className="btn-medieval btn-medieval-primary text-lg px-8 py-3">
          Galería de Personajes →
        </button>
      </div>
    </div>
  )
}
