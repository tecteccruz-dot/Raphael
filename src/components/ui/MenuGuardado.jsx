import { useState } from 'react';
import { useGameStore } from '../../engine/state';
import { guardarEnSlot, cargarDeSlot, borrarSlot, obtenerInfoSlots, exportarPartida } from '../../engine/storage';

export default function MenuGuardado({ onClose, onNavigate }) {
  const gameState = useGameStore();
  const [slotsInfo, setSlotsInfo] = useState(obtenerInfoSlots());
  
  const handleGuardar = (index) => {
    guardarEnSlot(index, gameState);
    setSlotsInfo(obtenerInfoSlots());
    // Flash effect or toast could be added here
  };

  const handleCargar = (index) => {
    const data = cargarDeSlot(index);
    if (data) {
      if (confirm(`¿Cargar partida de ${data.personaje.nombre}? Perderás el progreso no guardado actual.`)) {
        gameState.loadGameState(data);
        onClose();
        onNavigate('juego');
      }
    }
  };

  const handleBorrar = (index) => {
    if (confirm('¿Eliminar esta partida permanentemente?')) {
      borrarSlot(index);
      setSlotsInfo(obtenerInfoSlots());
    }
  };

  const handleExportar = () => {
    exportarPartida(gameState);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm screen-enter">
      <div className="panel-medieval-solid w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-[var(--color-panel-border)] flex items-center justify-between bg-[rgba(0,0,0,0.3)]">
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-gold)]">💾 Guardar / Cargar Partida</h2>
          <button onClick={onClose} className="text-[var(--color-parchment-dark)] hover:text-white text-xl">✖</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {slotsInfo.map((slot, index) => (
            <div key={index} className="card-medieval p-3 flex items-center justify-between group">
              <div className="flex-1">
                <div className="font-[var(--font-display)] text-sm text-[var(--color-gold)] mb-1">
                  Ranura {index + 1}
                </div>
                {slot ? (
                  <div>
                    <div className="font-[var(--font-display)] text-lg text-[var(--color-parchment)]">
                      {slot.personaje.nombre} <span className="text-sm text-[var(--color-parchment-dark)]">(Nvl {slot.personaje.nivel})</span>
                    </div>
                    <div className="font-[var(--font-ui)] text-xs text-[var(--color-parchment-dark)] mt-1 flex items-center gap-3">
                      <span>HP: {slot.personaje.hp.actual}/{slot.personaje.hp.maximo}</span>
                      <span>📍 {slot.ubicacion}</span>
                      <span className="opacity-50 ml-auto">
                        {new Date(slot.fecha).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="font-[var(--font-narrative)] text-[var(--color-parchment-dark)] text-sm italic opacity-50">
                    Ranura vacía
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                {slot && (
                  <button onClick={() => handleCargar(index)} className="btn-medieval btn-medieval-sm btn-medieval-primary px-4">
                    Cargar
                  </button>
                )}
                <button 
                  onClick={() => handleGuardar(index)} 
                  className={`btn-medieval btn-medieval-sm ${slot ? '' : 'btn-medieval-primary'} px-4`}
                >
                  Guardar
                </button>
                {slot && (
                  <button onClick={() => handleBorrar(index)} className="btn-medieval btn-medieval-sm btn-medieval-danger px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--color-panel-border)] bg-[rgba(0,0,0,0.3)] flex justify-between">
          <button onClick={handleExportar} className="btn-medieval btn-medieval-sm" title="Descargar la partida actual como archivo JSON">
            ⬇ Exportar JSON de Partida Actual
          </button>
          <button onClick={onClose} className="btn-medieval">Cerrar</button>
        </div>

      </div>
    </div>
  );
}
