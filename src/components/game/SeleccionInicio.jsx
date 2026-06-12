import { useState } from 'react';
import { useGameStore } from '../../engine/state';
import { inicios } from '../../data/inicios';
import { useAI } from '../../hooks/useAI';
import { obtenerFondoUbicacion } from '../../engine/travel';

export default function SeleccionInicio({ onNavigate }) {
  const personaje = useGameStore(s => s.personaje);
  const setInicioSeleccionado = useGameStore(s => s.setInicioSeleccionado);
  const clearHistorial = useGameStore(s => s.clearHistorial);
  const setLocation = useGameStore(s => s.setLocation);
  
  const { enviarAccion, procesando, errorIA } = useAI();
  const [inicioLocal, setInicioLocal] = useState(inicios[0].id);

  const handleComenzar = async () => {
    const inicioData = inicios.find(i => i.id === inicioLocal);
    if (!inicioData) return;

    setInicioSeleccionado(inicioData.id);
    clearHistorial();
    setLocation(inicioData.ubicacionInicial.continente, inicioData.ubicacionInicial.reino, inicioData.ubicacionInicial.ubicacion);
    
    // Navegamos a la pantalla de juego inmediatamente para ver el estado de carga
    onNavigate('juego');
    
    // Disparamos el primer prompt (oculto para el usuario como comando, pero visible en su efecto)
    await enviarAccion(inicioData.prompt, true);
  };

  if (!personaje) {
    return (
      <div className="w-full h-full flex items-center justify-center panel-medieval-solid">
        <p className="text-[var(--color-parchment-dark)]">Debes seleccionar un personaje primero.</p>
        <button onClick={() => onNavigate('galeria')} className="btn-medieval ml-4">Ir a Galería</button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center p-4 pt-14 screen-enter overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45,45,68,0.4) 0%, rgba(15,15,30,1) 70%)'
      }}>

      <div className="text-center mb-8">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-gold)] tracking-wider mb-1">
          🗺 Selecciona tu Aventura
        </h1>
        <p className="font-[var(--font-narrative)] text-[var(--color-parchment-dark)] text-sm italic">
          ¿Dónde comienza tu historia, {personaje.nombre}?
        </p>
        <div className="w-24 h-px bg-[var(--color-gold)] mx-auto mt-2 opacity-50" />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {inicios.map(ini => {
          const isSelected = inicioLocal === ini.id;
          const bgImage = obtenerFondoUbicacion(
            ini.ubicacionInicial.continente, 
            ini.ubicacionInicial.reino, 
            ini.ubicacionInicial.ubicacion
          );
          
          return (
            <div
              key={ini.id}
              onClick={() => setInicioLocal(ini.id)}
              className={`card-medieval flex flex-col cursor-pointer overflow-hidden relative p-0 border-2 transition-all duration-300
                ${isSelected ? 'border-[var(--color-gold)] transform scale-105 shadow-[0_0_20px_rgba(212,168,83,0.3)]' : 'border-transparent opacity-80 hover:opacity-100'}
              `}
            >
              {/* Imagen de fondo (simulada con color si no hay imagen real) */}
              <div 
                className="h-32 w-full bg-cover bg-center border-b border-[var(--color-panel-border)]"
                style={{ 
                  backgroundImage: `url(${bgImage})`,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  backgroundBlendMode: 'overlay'
                }}
              />
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{ini.icono}</span>
                  <h3 className="font-[var(--font-display)] text-sm text-[var(--color-parchment)] leading-tight">
                    {ini.nombre}
                  </h3>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-[var(--font-ui)] tracking-wider uppercase
                    ${ini.dificultad === 'Principiante' ? 'bg-[rgba(34,197,94,0.1)] text-[var(--color-success)]' : 
                      ini.dificultad === 'Intermedio' ? 'bg-[rgba(234,179,8,0.1)] text-[var(--color-gold)]' : 
                      'bg-[rgba(239,68,68,0.1)] text-[var(--color-error)]'}`}>
                    {ini.dificultad}
                  </span>
                </div>
                
                <p className="font-[var(--font-narrative)] text-[0.8rem] text-[var(--color-parchment-dark)] flex-1">
                  {ini.descripcion}
                </p>
                
                <div className="mt-3 text-[0.6rem] text-[var(--color-gold)] font-[var(--font-ui)] uppercase tracking-wider opacity-60">
                  Tonos: {ini.tono}
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2 text-[var(--color-gold)] text-xl drop-shadow-md">
                  ✦
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errorIA && (
        <div className="mb-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--color-error)] rounded max-w-xl text-center text-sm font-[var(--font-ui)]">
          {errorIA}
        </div>
      )}

      <div className="screen-bottom-actions sticky bottom-0 flex items-center justify-between w-full max-w-4xl mt-auto">
        <button onClick={() => onNavigate('galeria')} className="btn-medieval" disabled={procesando}>
          ← Volver
        </button>
        <button 
          onClick={handleComenzar} 
          disabled={!inicioLocal || procesando}
          className="btn-medieval btn-medieval-primary text-lg px-8 flex items-center gap-2"
        >
          {procesando ? (
            <>
              <span className="loading-quill"><span></span><span></span><span></span></span>
              Iniciando...
            </>
          ) : (
            'Comenzar Aventura →'
          )}
        </button>
      </div>
    </div>
  );
}
