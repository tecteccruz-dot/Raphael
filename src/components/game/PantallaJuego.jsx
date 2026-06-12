import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useAI } from '../../hooks/useAI';
import { useGameStore } from '../../engine/state';

import avatarGenerico from '../../assets/Imagenes/Avatars/Generico.png';
import fondoPlaza from '../../assets/Imagenes/Ubicaciones/Luminaerion/Tumbaflor/Plaza Mayor.png';
import fondoCementerio from '../../assets/Imagenes/Ubicaciones/Luminaerion/Tumbaflor/Cementerio.png';

const FONDOS = {
  tumbaflor_plaza: fondoPlaza,
  tumbaflor_cementerio: fondoCementerio,
};

const STATS_FULL = {
  FUE: 'Fuerza',
  DES: 'Destreza',
  CON: 'Constitución',
  INT: 'Inteligencia',
  SAB: 'Sabiduría',
  CAR: 'Carisma',
};

function obtenerFondo(mundo) {
  return FONDOS[`${mundo.reino}_${mundo.ubicacion}`] || fondoPlaza;
}

function iconoItem(tipo) {
  if (tipo === 'arma') return '⚔';
  if (tipo === 'armadura') return '🛡';
  if (tipo === 'consumible') return '✦';
  return '◆';
}

export default function PantallaJuego({ onOpenSave, onOpenNavigation }) {
  const {
    personaje,
    inventario,
    oro,
    porcentajeHp,
    armaEquipada,
    nombreRuta,
  } = useGameState();
  const { enviarAccion, procesando, errorIA } = useAI();
  const historial = useGameStore(s => s.historial);
  const mundo = useGameStore(s => s.mundo);

  const [input, setInput] = useState('');
  const [panelAbierto, setPanelAbierto] = useState(null);
  const [historialVisible, setHistorialVisible] = useState(false);
  const narrativaRef = useRef(null);

  useEffect(() => {
    if (narrativaRef.current) {
      narrativaRef.current.scrollTop = narrativaRef.current.scrollHeight;
    }
  }, [historial, procesando]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const escribiendo = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;

      if (event.key === 'Escape') {
        setPanelAbierto(null);
        setHistorialVisible(false);
        return;
      }

      if (escribiendo || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        setPanelAbierto(actual => actual === 'inventario' ? null : 'inventario');
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPanelAbierto(actual => actual === 'stats' ? null : 'stats');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim() || procesando) return;
    const texto = input.trim();
    setInput('');
    await enviarAccion(texto);
  };

  const handleClickOpcion = async (opcion) => {
    if (!procesando) await enviarAccion(opcion);
  };

  const togglePanel = (panel) => {
    setPanelAbierto(actual => actual === panel ? null : panel);
  };

  if (!personaje) return null;

  const ultimoAsistente = [...historial].reverse().find(m => m.role === 'assistant');
  const opciones = ultimoAsistente?.parseado?.opciones || [];
  const narracionActual = ultimoAsistente?.parseado?.narracion || ultimoAsistente?.content || '';
  const tiradaActual = ultimoAsistente?.parseado?.tirada || '';
  const mecanicaActual = ultimoAsistente?.parseado?.mecanica || '';
  const estadoEscena = ultimoAsistente?.parseado?.estadoEscena || '';
  const modificadores = personaje.modificadores || {};
  const estadisticas = personaje.estadisticas || {};
  const condiciones = personaje.condiciones || [];

  return (
    <main
      className="vn-game"
      style={{ '--vn-scene-image': `url("${obtenerFondo(mundo)}")` }}
    >
      <div className="vn-scene" aria-hidden="true" />
      <div className="vn-scene-shade" aria-hidden="true" />

      <header className="vn-topbar">
        <div className="vn-topbar-group">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="vn-icon-button"
            aria-label="Abrir menú principal"
            title="Menú principal"
          >
            ☰
          </button>
          <button
            type="button"
            onClick={() => setHistorialVisible(true)}
            className="vn-icon-button"
            aria-label="Abrir historial"
            title="Historial"
          >
            ▤
          </button>
          <div className="vn-location">
            <span className="vn-location-label">Ubicación</span>
            <span className="vn-location-name">{nombreRuta}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSave}
          className="vn-save-button"
        >
          <span aria-hidden="true">◆</span>
          Guardar
        </button>
      </header>

      <section className="vn-playfield">
        <div className="vn-player-card">
          <div className="vn-avatar-frame">
            <img src={personaje.avatar || avatarGenerico} alt={`Retrato de ${personaje.nombre}`} />
            <span className="vn-level-badge">NV {personaje.nivel}</span>
          </div>

          <div className="vn-player-data">
            <div className="vn-player-heading">
              <div>
                <h1>{personaje.nombre}</h1>
                <p>{personaje.raza} · {personaje.clase}</p>
              </div>
              <div className="vn-wealth" title="Piezas de oro">
                <span aria-hidden="true">●</span>
                {oro} po
              </div>
            </div>

            <div className="vn-health-row">
              <span>HP</span>
              <div
                className="vn-health-track"
                role="progressbar"
                aria-label="Puntos de vida"
                aria-valuemin="0"
                aria-valuemax={personaje.hp.maximo}
                aria-valuenow={personaje.hp.actual}
              >
                <div
                  className={`vn-health-fill ${porcentajeHp <= 25 ? 'is-critical' : porcentajeHp <= 50 ? 'is-warning' : ''}`}
                  style={{ width: `${Math.max(0, Math.min(100, porcentajeHp))}%` }}
                />
              </div>
              <strong>{personaje.hp.actual}/{personaje.hp.maximo}</strong>
            </div>

            <div className="vn-player-meta">
              <span>CA {personaje.claseArmadura}</span>
              <span>{armaEquipada ? armaEquipada.nombre : 'Sin arma equipada'}</span>
            </div>

            <div className="vn-player-actions">
              <button
                type="button"
                onClick={() => togglePanel('inventario')}
                className={panelAbierto === 'inventario' ? 'is-active' : ''}
                aria-expanded={panelAbierto === 'inventario'}
              >
                <kbd>I</kbd>
                Inventario
              </button>
              <button
                type="button"
                onClick={() => togglePanel('stats')}
                className={panelAbierto === 'stats' ? 'is-active' : ''}
                aria-expanded={panelAbierto === 'stats'}
              >
                <kbd>P</kbd>
                Información
              </button>
            </div>
          </div>
        </div>

        {panelAbierto && (
          <aside className="vn-side-panel" aria-label={panelAbierto === 'inventario' ? 'Inventario' : 'Información del personaje'}>
            <div className="vn-panel-header">
              <div>
                <span className="vn-panel-eyebrow">Personaje</span>
                <h2>{panelAbierto === 'inventario' ? 'Inventario' : 'Información'}</h2>
              </div>
              <button type="button" onClick={() => setPanelAbierto(null)} aria-label="Cerrar panel">×</button>
            </div>

            {panelAbierto === 'inventario' ? (
              <div className="vn-panel-content">
                <div className="vn-gold-summary">
                  <span>Fondos disponibles</span>
                  <strong>● {oro} piezas de oro</strong>
                </div>
                <div className="vn-item-list">
                  {inventario.length === 0 ? (
                    <p className="vn-empty-state">La mochila está vacía.</p>
                  ) : inventario.map((item, index) => (
                    <div className="vn-item-row" key={item.id || `${item.nombre}-${index}`}>
                      <span className="vn-item-icon" aria-hidden="true">{iconoItem(item.tipo)}</span>
                      <div>
                        <strong>{item.nombre}</strong>
                        <small>{item.tipo || 'objeto'}</small>
                      </div>
                      <div className="vn-item-count">
                        {item.equipado && <span>Equipado</span>}
                        <strong>×{item.cantidad || 1}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="vn-panel-content">
                <div className="vn-character-summary">
                  <div><span>Nivel</span><strong>{personaje.nivel}</strong></div>
                  <div><span>Experiencia</span><strong>{personaje.experiencia || 0}</strong></div>
                  <div><span>Armadura</span><strong>{personaje.claseArmadura}</strong></div>
                  <div><span>Vida</span><strong>{personaje.hp.actual}/{personaje.hp.maximo}</strong></div>
                </div>

                <div className="vn-stat-grid">
                  {Object.entries(estadisticas).map(([stat, valor]) => {
                    const mod = modificadores[stat] ?? 0;
                    return (
                      <div className="vn-stat-card" key={stat}>
                        <span title={STATS_FULL[stat]}>{stat}</span>
                        <strong>{valor}</strong>
                        <small>{mod >= 0 ? '+' : ''}{mod}</small>
                      </div>
                    );
                  })}
                </div>

                <div className="vn-info-list">
                  <p><span>Linaje</span><strong>{personaje.raza}</strong></p>
                  <p><span>Clase</span><strong>{personaje.clase}</strong></p>
                  <p><span>Trasfondo</span><strong>{personaje.trasfondo || 'Sin definir'}</strong></p>
                  <p><span>Condiciones</span><strong>{condiciones.length ? condiciones.join(', ') : 'Ninguna'}</strong></p>
                </div>
              </div>
            )}

            <div className="vn-panel-shortcut">Pulsa <kbd>{panelAbierto === 'inventario' ? 'I' : 'P'}</kbd> o <kbd>Esc</kbd> para cerrar</div>
          </aside>
        )}
      </section>

      <section className="vn-dialogue-shell" aria-label="Narración y acciones">
        <div className="vn-dialogue-meta">
          <div>
            {(tiradaActual || mecanicaActual) && (
              <span className="vn-dice-badge">
                {tiradaActual && `Tirada: ${tiradaActual}`}
                {mecanicaActual && ` · ${mecanicaActual}`}
              </span>
            )}
          </div>
          {estadoEscena && <span className="vn-scene-state">{estadoEscena}</span>}
        </div>

        <div className="vn-dialogue-box">
          {errorIA && (
            <div className="vn-error-message">
              No se pudo contactar con el Dungeon Master. Revisa la configuración del servidor.
            </div>
          )}

          <div ref={narrativaRef} className="vn-narration" aria-live="polite">
            {procesando ? (
              <div className="vn-thinking">
                <span /><span /><span />
                <em>El Dungeon Master medita...</em>
              </div>
            ) : narracionActual ? (
              narracionActual.split(/\n{2,}/).map((parrafo, index) => (
                <p key={index}>{parrafo}</p>
              ))
            ) : (
              <p className="vn-placeholder">La aventura comienza...</p>
            )}
          </div>

          {!procesando && opciones.length > 0 && (
            <div className="vn-options">
              {opciones.map((opcion, index) => (
                <button
                  type="button"
                  key={`${opcion}-${index}`}
                  onClick={() => handleClickOpcion(opcion)}
                  className="vn-option-button"
                >
                  <span>{index + 1}</span>
                  {opcion}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="vn-command-bar">
            <label htmlFor="player-action">Tu acción</label>
            <input
              id="player-action"
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              disabled={procesando}
              placeholder="Describe qué hace tu personaje..."
              autoComplete="off"
            />
            <button type="submit" disabled={procesando || !input.trim()}>
              Enviar
              <span aria-hidden="true">↵</span>
            </button>
          </form>
        </div>
      </section>

      {historialVisible && (
        <div className="vn-history-overlay" onMouseDown={() => setHistorialVisible(false)}>
          <section className="vn-history-panel" onMouseDown={event => event.stopPropagation()}>
            <div className="vn-panel-header">
              <div>
                <span className="vn-panel-eyebrow">Crónica</span>
                <h2>Historial de la aventura</h2>
              </div>
              <button type="button" onClick={() => setHistorialVisible(false)} aria-label="Cerrar historial">×</button>
            </div>
            <div className="vn-history-content">
              {historial.length === 0 ? (
                <p className="vn-empty-state">Todavía no hay acontecimientos registrados.</p>
              ) : historial.map((mensaje, index) => (
                <article className={mensaje.role === 'user' ? 'is-player' : 'is-narrator'} key={mensaje.timestamp || index}>
                  <span>{mensaje.role === 'user' ? personaje.nombre : 'Dungeon Master'}</span>
                  <p>{mensaje.parseado?.narracion || mensaje.content}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
