import { useState } from 'react'
import { useGameStore } from '../../engine/state'
import { probarConexion } from '../../engine/ai'

const PROVEEDORES = [
  {
    id: 'gemini',
    nombre: 'Google Gemini',
    descripcion: 'Gemini 2.5 Flash — 1,500 req/día gratis',
    icono: '💎',
    recomendado: true,
  },
  {
    id: 'groq',
    nombre: 'Groq',
    descripcion: 'Llama 3, Mixtral — API Gratuita',
    icono: '⚡',
  },
  {
    id: 'azure',
    nombre: 'Azure OpenAI',
    descripcion: 'Copilot / Azure OpenAI Service',
    icono: '☁',
  },
  {
    id: 'openai',
    nombre: 'OpenAI',
    descripcion: 'GPT-4o, API directa de OpenAI',
    icono: '🤖',
  },
  {
    id: 'lmstudio',
    nombre: 'LM Studio',
    descripcion: 'Modelo local en tu máquina',
    icono: '💻',
  },
]

export default function ConfiguracionServidor({ onNavigate }) {
  const config = useGameStore(s => s.config)
  const setConfig = useGameStore(s => s.setConfig)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleProbarConexion = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await probarConexion(config)
      setTestResult(result)
    } catch (err) {
      setTestResult({ exito: false, mensaje: err.message })
    }
    setTesting(false)
  }

  const handleContinuar = () => {
    onNavigate('prompt')
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 screen-enter"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45,45,68,0.4) 0%, rgba(15,15,30,1) 70%)'
      }}>
      <div className="panel-medieval-solid w-full max-w-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-gold)] tracking-wider mb-2">
            ⚔ Raphael
          </h1>
          <p className="font-[var(--font-narrative)] text-[var(--color-parchment-dark)] text-lg italic">
            Configuración del Servidor de IA
          </p>
          <div className="w-24 h-px bg-[var(--color-gold)] mx-auto mt-3 opacity-50" />
        </div>

        {/* Provider Selection */}
        <div className="mb-6">
          <label className="block font-[var(--font-display)] text-sm text-[var(--color-gold)] mb-3 tracking-wider uppercase">
            Proveedor de IA
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PROVEEDORES.map(p => (
              <div
                key={p.id}
                onClick={() => setConfig({ proveedor: p.id })}
                className={`card-medieval text-center cursor-pointer p-3 ${config.proveedor === p.id ? 'selected' : ''}`}
              >
                <div className="text-2xl mb-1">{p.icono}</div>
                <div className="font-[var(--font-display)] text-xs text-[var(--color-parchment)] leading-tight">
                  {p.nombre}
                </div>
                {p.recomendado && (
                  <div className="text-[0.6rem] text-[var(--color-teal)] mt-1 font-[var(--font-ui)]">
                    Recomendado
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gemini Fields */}
        {config.proveedor === 'gemini' && (
          <div className="space-y-4 mb-6">
            <div className="p-3 rounded-lg bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-[0.75rem] font-[var(--font-ui)] text-[var(--color-parchment-dark)]">
              💎 Obtén tu API Key gratis en{' '}
              <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
                className="text-[var(--color-teal)] underline hover:text-[var(--color-gold)] transition-colors">
                aistudio.google.com
              </a>
              {' '}→ <strong>Get API Key</strong> — Sin tarjeta de crédito.
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                API Key
              </label>
              <input
                type="password"
                className="input-medieval"
                placeholder="AIza..."
                value={config.apiKey || ''}
                onChange={e => setConfig({ apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Modelo
              </label>
              <select
                className="input-medieval"
                value={config.deploymentId || 'gemini-2.5-flash'}
                onChange={e => setConfig({ deploymentId: e.target.value })}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash ⭐ (Recomendado — 1,500 req/día)</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Más rápido — 1,500 req/día)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Premium — 50 req/día gratis)</option>
              </select>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[0.6rem] text-center">
                <div className="bg-[rgba(0,0,0,0.2)] rounded p-1.5">
                  <div className="text-[var(--color-gold)] font-bold">15 req/min</div>
                  <div className="text-[var(--color-parchment-dark)]">Flash</div>
                </div>
                <div className="bg-[rgba(0,0,0,0.2)] rounded p-1.5">
                  <div className="text-[var(--color-teal)] font-bold">1,500/día</div>
                  <div className="text-[var(--color-parchment-dark)]">Peticiones</div>
                </div>
                <div className="bg-[rgba(0,0,0,0.2)] rounded p-1.5">
                  <div className="text-[var(--color-success)] font-bold">1M tokens</div>
                  <div className="text-[var(--color-parchment-dark)]">por minuto</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groq Fields */}
        {config.proveedor === 'groq' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                API Key
              </label>
              <input
                type="password"
                className="input-medieval"
                placeholder="gsk_..."
                value={config.apiKey || ''}
                onChange={e => setConfig({ apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Modelo
              </label>
              <select
                className="input-medieval"
                value={config.deploymentId || 'llama-3.3-70b-versatile'}
                onChange={e => setConfig({ deploymentId: e.target.value })}
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile ⭐ (Recomendado)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Más rápido)</option>
                <option value="llama-3.3-70b-specdec">llama-3.3-70b-specdec</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                <option value="gemma2-9b-it">gemma2-9b-it</option>
              </select>
              <p className="text-[0.65rem] text-[var(--color-parchment-dark)] mt-1.5">
                ✅ API gratuita en <strong>console.groq.com</strong> — sin tarjeta de crédito
              </p>
            </div>
          </div>
        )}

        {/* Azure Fields */}
        {config.proveedor === 'azure' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Resource Name
              </label>
              <input
                type="text"
                className="input-medieval"
                placeholder="mi-recurso-azure"
                value={config.resourceName || ''}
                onChange={e => setConfig({ resourceName: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Deployment ID
              </label>
              <input
                type="text"
                className="input-medieval"
                placeholder="gpt-4o"
                value={config.deploymentId || ''}
                onChange={e => setConfig({ deploymentId: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                API Key
              </label>
              <input
                type="password"
                className="input-medieval"
                placeholder="••••••••••••••••"
                value={config.apiKey || ''}
                onChange={e => setConfig({ apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                API Version
              </label>
              <input
                type="text"
                className="input-medieval"
                placeholder="2024-10-21"
                value={config.apiVersion || '2024-10-21'}
                onChange={e => setConfig({ apiVersion: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* OpenAI Fields */}
        {config.proveedor === 'openai' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                API Key
              </label>
              <input
                type="password"
                className="input-medieval"
                placeholder="sk-..."
                value={config.apiKey || ''}
                onChange={e => setConfig({ apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Modelo
              </label>
              <input
                type="text"
                className="input-medieval"
                placeholder="gpt-4o"
                value={config.deploymentId || ''}
                onChange={e => setConfig({ deploymentId: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* LM Studio Fields */}
        {config.proveedor === 'lmstudio' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mb-1.5 uppercase tracking-wider">
                Endpoint URL
              </label>
              <input
                type="text"
                className="input-medieval"
                placeholder="http://localhost:1234"
                value={config.endpointUrl || 'http://localhost:1234'}
                onChange={e => setConfig({ endpointUrl: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Test Connection */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleProbarConexion}
            disabled={testing || !config.apiKey && config.proveedor !== 'lmstudio'}
            className="btn-medieval flex-1"
          >
            {testing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="loading-quill"><span></span><span></span><span></span></span>
                Probando...
              </span>
            ) : (
              '🔮 Probar Conexión'
            )}
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded text-sm font-[var(--font-ui)] border ${
            testResult.exito
              ? 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)] text-[var(--color-success)]'
              : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[var(--color-error)]'
          }`}>
            {testResult.exito ? '✅' : '❌'} {testResult.mensaje}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinuar}
          disabled={!config.apiKey && config.proveedor !== 'lmstudio'}
          className="btn-medieval btn-medieval-primary w-full text-center"
        >
          Continuar →
        </button>

        <p className="text-center text-xs text-[rgba(244,232,193,0.3)] mt-4 font-[var(--font-ui)]">
          La configuración se guarda automáticamente en tu navegador
        </p>
      </div>
    </div>
  )
}
