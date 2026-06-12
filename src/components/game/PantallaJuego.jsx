import { useState, useRef, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useAI } from '../../hooks/useAI';
import { useGameStore } from '../../engine/state';
import ModalMapa from './ModalMapa';

// Importamos imágenes
import avatarGenerico from '../../assets/Imagenes/Avatars/Generico.png';
import fondoPlaza from '../../assets/Imagenes/Ubicaciones/Luminaerion/Tumbaflor/Plaza Mayor.png';
import fondoCementerio from '../../assets/Imagenes/Ubicaciones/Luminaerion/Tumbaflor/Cementerio.png';

const FONDOS = {
  'tumbaflor_plaza': fondoPlaza,
  'tumbaflor_cementerio': fondoCementerio,
};

function obtenerFondo(mundo) {
  const key = `${mundo.reino}_${mundo.ubicacion}`;
  return FONDOS[key] || fondoPlaza;
}

export default function PantallaJuego({ onOpenSave, onOpenNavigation }) {
  const { 
    personaje, inventario, oro, porcentajeHp, armaduraEquipada, armaEquipada, nombreRuta 
  } = useGameState();
  
  const { enviarAccion, procesando, errorIA } = useAI();
  const historial = useGameStore(s => s.historial);
  const mundo = useGameStore(s => s.mundo);
  
  const [input, setInput] = useState('');
  const [seccionInventario, setSeccionInventario] = useState(true);
  const [seccionHabilidades, setSeccionHabilidades] = useState(true);
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const narrativaRef = useRef(null);

  useEffect(() => {
    if (narrativaRef.current) {
      narrativaRef.current.scrollTop = narrativaRef.current.scrollHeight;
    }
  }, [historial, procesando]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || procesando) return;
    const texto = input;
    setInput('');
    await enviarAccion(texto);
  };

  const handleClickOpcion = async (opcion) => {
    if (procesando) return;
    await enviarAccion(opcion);
  };

  if (!personaje) return null;

  const ultimoAsistente = [...historial].reverse().find(m => m.role === 'assistant');
  const opciones = ultimoAsistente?.parseado?.opciones || [];
  
  const fondoActual = obtenerFondo(mundo);

  // Paleta de colores base del mockup
  const colors = {
    bgDeep: '#0c0b12',
    bgPanel: '#12101e',
    bgCard: '#1a1729',
    bgHover: '#221f35',
    border: '#2e2a48',
    borderHi: '#4a4278',
    gold: '#c9a84c',
    goldDim: '#7a5f28',
    purple: '#7c5cbf',
    purpleDim: '#3d2e6b',
    textMain: '#e8e0f0',
    textMuted: '#8a809a',
    textDim: '#5a5268',
    hpGreen: '#3dba6e',
    hpTrack: '#1a3328',
    danger: '#c0444a'
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden font-['Inter']" style={{ backgroundColor: colors.bgDeep, color: colors.textMain }}>
      
      {/* ── HEADER ── */}
      <header className="flex items-center gap-3 px-4 py-2 flex-shrink-0" style={{ backgroundColor: colors.bgPanel, borderBottom: `1px solid ${colors.border}` }}>
        <button onClick={onOpenNavigation} className="w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer" style={{ border: `1px solid ${colors.border}`, color: colors.textMuted }}>
          ☰
        </button>
        <button onClick={() => setMapaAbierto(true)} className="w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer" style={{ border: `1px solid ${colors.border}`, color: colors.textMuted }}>
          ◫
        </button>
        
        <div className="flex-1 flex items-center gap-1.5 font-['Cinzel'] text-[11px] uppercase tracking-widest" style={{ color: colors.textMuted }}>
          <span>Ubicación</span>
          <span style={{ color: colors.textDim }}>›</span>
          <span className="truncate">{mundo.continente || 'Luminaerion'}</span>
          <span style={{ color: colors.textDim }}>›</span>
          <span className="truncate">{mundo.reino || 'Tumbaflor'}</span>
          <span style={{ color: colors.textDim }}>›</span>
          <span style={{ color: colors.gold }}>{mundo.ubicacion || 'Plaza Mayor'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onOpenSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-['Cinzel'] text-xs tracking-wider transition-colors hover:bg-[rgba(201,168,76,0.08)] cursor-pointer" style={{ border: `1px solid ${colors.goldDim}`, color: colors.gold }}>
            <span className="text-[8px]">◆</span> Guardar
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[240px_1fr_260px]">
        
        {/* ══ LEFT PANEL ══ */}
        <aside className="hidden lg:flex flex-col overflow-hidden" style={{ backgroundColor: colors.bgPanel, borderRight: `1px solid ${colors.border}` }}>
          
          {/* Ficha del Personaje */}
          <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <div className="flex gap-3 items-start mb-3">
              <div className="relative flex-shrink-0">
                <img src={personaje.avatar || avatarGenerico} alt="Avatar" className="w-14 h-14 rounded-full object-cover" style={{ border: `2px solid ${colors.goldDim}` }} />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-px rounded-full font-['Cinzel'] text-[10px] whitespace-nowrap text-[#b89fe8]" style={{ backgroundColor: colors.purpleDim, border: `1px solid ${colors.purple}` }}>
                  Nv {personaje.nivel}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-['Cinzel'] text-[13px] font-semibold truncate mb-0.5" style={{ color: colors.gold, letterSpacing: '0.04em' }}>
                  {personaje.nombre}
                </div>
                <div className="text-[11px] mb-2 truncate" style={{ color: colors.textMuted }}>
                  {personaje.raza} · {personaje.clase}
                </div>
                <div className="flex items-center gap-1 text-[12px]" style={{ color: colors.gold }}>
                  <span className="text-[11px]">◈</span> {oro} PO
                </div>
              </div>
            </div>

            {/* HP Bar */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-['Cinzel'] text-[10px] tracking-wider w-5 flex-shrink-0" style={{ color: colors.textDim }}>HP</span>
              <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ backgroundColor: colors.hpTrack }}>
                <div className="h-full transition-all duration-300" style={{ width: `${porcentajeHp}%`, backgroundColor: colors.hpGreen }}></div>
              </div>
              <span className="text-[10px] w-7 text-right flex-shrink-0" style={{ color: colors.textMuted }}>{personaje.hp.actual}/{personaje.hp.maximo}</span>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-3 gap-1 mt-3">
              {['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'].map(stat => (
                <div key={stat} className="rounded-md p-1 text-center" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
                  <span className="font-['Cinzel'] text-sm font-semibold block" style={{ color: colors.textMain }}>{personaje.estadisticas[stat]}</span>
                  <span className="text-[9px] tracking-wider block mt-px" style={{ color: colors.textDim }}>{stat}</span>
                </div>
              ))}
            </div>
            
            {/* CA y Arma */}
            <div className="mt-3 flex gap-2 flex-wrap pt-2" style={{ borderTop: `1px dashed ${colors.border}` }}>
              <div className="flex items-center gap-1 text-[10px]">
                <span style={{ color: colors.textMuted }}>🛡 CA:</span>
                <span className="font-medium" style={{ color: colors.textMain }}>{personaje.claseArmadura}</span>
              </div>
              {armaEquipada && (
                <div className="flex items-center gap-1 text-[10px]">
                  <span style={{ color: colors.textMuted }}>⚔</span>
                  <span className="font-medium" style={{ color: colors.textMain }}>{armaEquipada.nombre}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1.5 p-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <button className="py-1.5 rounded-md text-[11px] font-['Cinzel'] tracking-wider text-center transition-colors cursor-pointer hover:bg-[#221f35]" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              Descanso Corto
            </button>
            <button className="py-1.5 rounded-md text-[11px] font-['Cinzel'] tracking-wider text-center transition-colors cursor-pointer hover:bg-[#221f35]" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              Descanso Largo
            </button>
          </div>

          {/* Scrollable Sections */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${colors.border} transparent` }}>
            {/* Habilidades */}
            {personaje.habilidades && (
              <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div 
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none transition-colors hover:bg-[#221f35]" 
                  onClick={() => setSeccionHabilidades(!seccionHabilidades)}
                >
                  <span className="font-['Cinzel'] text-[10px] tracking-widest uppercase" style={{ color: colors.textMuted }}>Habilidades</span>
                  <span className={`text-[10px] transition-transform ${seccionHabilidades ? 'rotate-180' : ''}`} style={{ color: colors.textDim }}>▼</span>
                </div>
                {seccionHabilidades && (
                  <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
                    {Object.entries(personaje.habilidades).map(([key, hab], i) => hab.nombre.trim() !== '' && (
                      <div key={i} className="flex gap-2 items-start group" title={hab.descripcion}>
                        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm transition-colors group-hover:border-[#7a5f28]" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
                          {hab.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-['Cinzel'] truncate leading-tight" style={{ color: colors.textMain }}>{hab.nombre}</div>
                          <div className="text-[9px] italic truncate leading-tight mt-0.5" style={{ color: colors.gold }}>{hab.limitacion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mochila */}
            <div style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none transition-colors hover:bg-[#221f35]" 
                onClick={() => setSeccionInventario(!seccionInventario)}
              >
                <span className="font-['Cinzel'] text-[10px] tracking-widest uppercase" style={{ color: colors.textMuted }}>Mochila</span>
                <span className={`text-[10px] transition-transform ${seccionInventario ? 'rotate-180' : ''}`} style={{ color: colors.textDim }}>▼</span>
              </div>
              {seccionInventario && (
                <div className="px-3 pb-3 pt-1">
                  <div className="grid grid-cols-4 gap-1">
                    {inventario.slice(0, 12).map((item, i) => (
                      <div key={i} className="aspect-square rounded-md flex items-center justify-center text-sm relative group cursor-pointer hover:border-[#7a5f28]" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} title={item.nombre}>
                        {item.tipo === 'arma' ? '⚔' : item.tipo === 'armadura' ? '🛡' : item.tipo === 'consumible' ? '🧪' : '📦'}
                        {item.cantidad > 1 && <span className="absolute bottom-0 right-1 text-[8px]" style={{ color: colors.gold }}>x{item.cantidad}</span>}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 12 - inventario.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square rounded-md flex items-center justify-center opacity-25" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ══ CENTER PANEL (Narrative) ══ */}
        <section className="flex flex-col relative overflow-hidden bg-black">
          
          {/* Background Image with Blur */}
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.25] pointer-events-none blur-[6px] transform scale-105" style={{ backgroundImage: `url(${fondoActual})` }}></div>
          
          {/* Vignette Overlay to darken edges and make text readable */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, #0c0b12 100%)' }}></div>
          
          {/* Narrative History */}
          <div ref={narrativaRef} className="flex-1 overflow-y-auto p-6 relative z-10" style={{ scrollbarWidth: 'thin', scrollbarColor: `${colors.border} transparent` }}>
            {historial.map((msg, idx) => (
              <div key={idx} className="mb-6">
                {msg.role === 'user' ? (
                  <div className="py-2 px-3 rounded-r-md rounded-l-sm text-[15px] italic mb-4 w-fit ml-auto max-w-[80%]" style={{ backgroundColor: 'rgba(124,92,191,0.1)', borderRight: `3px solid ${colors.purpleDim}`, color: '#b89fe8', fontFamily: "'Crimson Pro', serif" }}>
                    &gt; {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-1.5" style={{ color: colors.goldDim }}>
                      El Dungeon Master
                    </div>
                    <div className="font-['Crimson Pro'] text-[17px] font-light leading-relaxed whitespace-pre-wrap" style={{ color: '#e8e0f0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {msg.parseado?.narracion || msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {procesando && (
              <div className="mb-6">
                <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-1.5" style={{ color: colors.goldDim }}>
                  El Dungeon Master
                </div>
                <div className="font-['Crimson Pro'] text-[17px] font-light italic" style={{ color: colors.textMuted }}>
                  El oráculo medita su respuesta...
                </div>
              </div>
            )}
          </div>

          {/* Options & Input Area */}
          <div className="p-4 pt-3 relative z-20" style={{ borderTop: `1px solid ${colors.border}`, background: 'linear-gradient(to top, rgba(12,11,18,0.98) 0%, rgba(12,11,18,0.8) 100%)' }}>
            
            {errorIA && (
              <div className="mb-2 text-xs p-2 rounded" style={{ color: colors.danger, backgroundColor: 'rgba(192,68,74,0.1)' }}>
                ⚠ Error de conexión. Revisa tu API Key.
              </div>
            )}

            {/* IA Suggested Options */}
            {!procesando && opciones.length > 0 && (
              <div className="mb-3">
                <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-2" style={{ color: colors.textDim }}>Posibles Acciones</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {opciones.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleClickOpcion(opt)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all hover:translate-x-1 cursor-pointer"
                      style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.goldDim}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-['Cinzel']" style={{ backgroundColor: colors.purpleDim, border: `1px solid ${colors.purple}`, color: '#b89fe8' }}>
                        {i + 1}
                      </div>
                      <div className="font-['Crimson Pro'] text-[14px] italic" style={{ color: colors.textMain }}>{opt}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <span className="font-['Cinzel'] text-[10px] tracking-wider uppercase flex-shrink-0" style={{ color: colors.gold }}>Acción</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={procesando}
                placeholder="Escribe tu siguiente movimiento..."
                className="flex-1 rounded-lg px-4 py-2 font-['Crimson Pro'] text-[16px] outline-none transition-colors focus:bg-[rgba(0,0,0,0.5)]"
                style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textMain }}
                onFocus={(e) => e.target.style.borderColor = colors.goldDim}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
              <button 
                type="submit" 
                disabled={procesando || !input.trim()}
                className="px-4 py-2.5 rounded-lg font-['Cinzel'] text-[11px] tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.goldDim, border: `1px solid ${colors.gold}`, color: colors.bgDeep }}
              >
                <b>Enviar</b> <span className="text-[10px]">▶</span>
              </button>
            </form>
          </div>
        </section>

        {/* ══ RIGHT PANEL (Scene / Log) ══ */}
        <aside className="hidden lg:flex flex-col overflow-hidden" style={{ backgroundColor: colors.bgPanel, borderLeft: `1px solid ${colors.border}` }}>
          
          <div className="p-3 pb-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-1" style={{ color: colors.textDim }}>Escena Actual</div>
            <div className="font-['Cinzel'] text-[14px] font-semibold" style={{ color: colors.gold }}>
              {mundo.ubicacion || 'Plaza Mayor'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${colors.border} transparent` }}>
            {/* NPCs o Enemigos en escena */}
            <div className="p-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-2" style={{ color: colors.textDim }}>Entidades Presentes</div>
              <div className="text-[10px] italic" style={{ color: colors.textMuted }}>El área parece tranquila por ahora...</div>
            </div>

            {/* Log Técnico */}
            <div className="p-3">
              <div className="font-['Cinzel'] text-[9px] tracking-[0.1em] uppercase mb-2" style={{ color: colors.textDim }}>Registro Técnico</div>
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px]" style={{ color: colors.textMuted }}>
                  <span className="font-['Cinzel'] text-[8px]" style={{ color: colors.textDim }}>[SYS]</span> Conectado al Oráculo.
                </div>
                {ultimoAsistente?.parseado?.tirada && (
                  <div className="text-[10px] border-l border-[rgba(46,42,72,0.4)] pl-2" style={{ color: colors.textMuted }}>
                    <span className="font-['Cinzel'] text-[8px]" style={{ color: colors.textDim }}>[DICE]</span> Tirada solicitada: <strong style={{ color: colors.gold }}>{ultimoAsistente.parseado.tirada}</strong>
                  </div>
                )}
                {ultimoAsistente?.parseado?.mecanica && (
                  <div className="text-[10px] border-l border-[rgba(46,42,72,0.4)] pl-2" style={{ color: colors.textMuted }}>
                    <span className="font-['Cinzel'] text-[8px]" style={{ color: colors.textDim }}>[MECH]</span> <strong style={{ color: colors.purple }}>{ultimoAsistente.parseado.mecanica}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

      </main>

      {/* ── MODALS ── */}
      {mapaAbierto && (
        <ModalMapa 
          onClose={() => setMapaAbierto(false)} 
          ubicacionActual={mundo.ubicacion || 'Plaza Mayor'} 
          reinoActual={mundo.reino || 'Tumbaflor'} 
        />
      )}
    </div>
  );
}
