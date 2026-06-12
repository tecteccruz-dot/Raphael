import { useState } from 'react';

const UBICACIONES = {
  continente: 'Luminaerion',
  reinos: [
    {
      id: 'tumbaflor',
      nombre: 'Tumbaflor',
      tipo: 'Reino Inicial',
      zonas: [
        {
          id: 'plaza',
          nombre: 'Plaza Mayor',
          tipo: 'Zona Segura',
          costo: 0
        },
        {
          id: 'taberna',
          nombre: 'Taberna del Cardo',
          tipo: 'Zona Segura',
          costo: 5
        },
        {
          id: 'herreria',
          nombre: 'Herrería',
          tipo: 'Zona Segura',
          costo: 5
        },
        {
          id: 'cementerio',
          nombre: 'Cementerio Antiguo',
          tipo: 'Peligro',
          costo: 10
        },
        {
          id: 'bosque',
          nombre: 'Bosque Susurrante',
          tipo: 'Peligro',
          costo: 15
        }
      ]
    },
    {
      id: 'elixiria',
      nombre: 'Elixiria',
      tipo: 'Ciudad Sagrada',
      zonas: [
        {
          id: 'calles',
          nombre: 'Calles Blancas',
          tipo: 'Zona Segura',
          costo: 50
        },
        {
          id: 'templo',
          nombre: 'Templo Mayor',
          tipo: 'Zona Segura',
          costo: 55
        },
        {
          id: 'celdas',
          nombre: 'Celdas de Purificación',
          tipo: 'Peligro',
          costo: 60
        }
      ]
    },
    {
      id: 'tierras_salvajes',
      nombre: 'Tierras Salvajes',
      tipo: 'Inexplorado',
      zonas: [
        {
          id: 'mazmorra',
          nombre: 'La Mazmorra del Goblin',
          tipo: 'Peligro Extremo',
          costo: 100
        }
      ]
    }
  ]
};

export default function ModalMapa({ onClose, ubicacionActual, reinoActual }) {
  const [seleccionado, setSeleccionado] = useState(null);

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
    danger: '#c0444a'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-3xl h-[80vh] flex flex-col rounded-lg overflow-hidden shadow-2xl"
        style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.goldDim}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <h2 className="font-['Cinzel'] text-xl tracking-widest" style={{ color: colors.gold }}>Mapa del Mundo</h2>
            <div className="font-['Cinzel'] text-xs tracking-wider uppercase mt-1" style={{ color: colors.textMuted }}>Continente de {UBICACIONES.continente}</div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#221f35] transition-colors cursor-pointer"
            style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          
          {/* Tree View (Left) */}
          <div className="w-1/2 overflow-y-auto p-4" style={{ borderRight: `1px solid ${colors.border}` }}>
            {UBICACIONES.reinos.map(reino => (
              <div key={reino.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: colors.gold }}>▼</span>
                  <span className="font-['Cinzel'] text-lg tracking-wider" style={{ color: colors.textMain }}>{reino.nombre}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ border: `1px solid ${colors.borderHi}`, color: colors.textMuted, backgroundColor: colors.bgCard }}>
                    {reino.tipo}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 ml-6 pl-4" style={{ borderLeft: `1px solid ${colors.border}` }}>
                  {reino.zonas.map(zona => {
                    const isCurrent = zona.nombre === ubicacionActual && reino.nombre === reinoActual;
                    const isSelected = seleccionado?.id === zona.id;
                    
                    return (
                      <button
                        key={zona.id}
                        onClick={() => setSeleccionado({ ...zona, reino: reino.nombre })}
                        className={`flex items-center justify-between w-full p-2 rounded-md transition-all text-left group cursor-pointer
                          ${isSelected ? 'bg-[#221f35]' : 'hover:bg-[#1a1729]'}
                        `}
                        style={{ border: `1px solid ${isSelected ? colors.goldDim : 'transparent'}` }}
                      >
                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <span className="text-xs animate-pulse" style={{ color: colors.gold }}>◆</span>
                          ) : (
                            <span className="text-[10px] group-hover:text-[#c9a84c]" style={{ color: colors.textDim }}>○</span>
                          )}
                          <span className={`font-['Inter'] text-sm ${isCurrent ? 'font-medium' : ''}`} style={{ color: isCurrent ? colors.gold : colors.textMuted }}>
                            {zona.nombre}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] uppercase tracking-widest font-['Cinzel']" style={{ color: colors.gold }}>Actual</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Details View (Right) */}
          <div className="w-1/2 p-6 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: colors.bgDeep }}>
            {/* Ambient Map Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at center, ${colors.gold} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
            
            {seleccionado ? (
              <div className="relative z-10 w-full max-w-sm text-center">
                <div className="inline-block px-3 py-1 mb-4 rounded-full text-[10px] uppercase tracking-widest" style={{ border: `1px solid ${colors.borderHi}`, color: '#b89fe8', backgroundColor: 'rgba(61,46,107,0.3)' }}>
                  {seleccionado.tipo}
                </div>
                
                <h3 className="font-['Cinzel'] text-2xl mb-2" style={{ color: colors.gold }}>{seleccionado.nombre}</h3>
                <div className="font-['Cinzel'] text-sm tracking-wider mb-8" style={{ color: colors.textMuted }}>
                  Reino de {seleccionado.reino}
                </div>

                <div className="rounded-lg p-4 mb-8" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
                  <div className="font-['Cinzel'] text-[10px] uppercase tracking-widest mb-2" style={{ color: colors.textDim }}>Costo de Viaje</div>
                  <div className="flex items-center justify-center gap-2 text-xl" style={{ color: colors.gold }}>
                    <span>⚡</span>
                    <span className="font-medium">{seleccionado.costo} Energía</span>
                  </div>
                </div>

                <button 
                  disabled={seleccionado.costo === 0}
                  className="w-full py-3 px-4 rounded-lg font-['Cinzel'] tracking-widest text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ 
                    backgroundColor: seleccionado.costo === 0 ? colors.bgHover : colors.goldDim,
                    color: seleccionado.costo === 0 ? colors.textMuted : colors.bgDeep,
                    border: `1px solid ${seleccionado.costo === 0 ? colors.border : colors.gold}`
                  }}
                >
                  {seleccionado.costo === 0 ? 'Ya estás aquí' : 'Viajar a esta ubicación'}
                </button>
              </div>
            ) : (
              <div className="text-center relative z-10" style={{ color: colors.textDim }}>
                <div className="text-4xl mb-4">🗺️</div>
                <div className="font-['Cinzel'] tracking-widest text-sm uppercase">Selecciona una ubicación</div>
                <div className="text-xs mt-2 font-['Inter']">para ver los detalles de viaje</div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
