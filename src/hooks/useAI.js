import { useState } from 'react';
import { useGameStore } from '../engine/state';
import { llamarIA } from '../engine/ai';
import { parsearRespuesta, ejecutarComandos } from '../engine/commands';
import { useGameState } from './useGameState';

export function useAI() {
  const [procesando, setProcesando] = useState(false);
  const [errorIA, setErrorIA] = useState(null);
  
  const config = useGameStore(s => s.config);
  const promptMaestro = useGameStore(s => s.promptMaestro);
  const historial = useGameStore(s => s.historial);
  const addMessage = useGameStore(s => s.addMessage);
  
  const { construirContextoSistema } = useGameState();

  const enviarAccion = async (textoAccion, isSistema = false) => {
    if (!textoAccion.trim()) return null;
    
    setProcesando(true);
    setErrorIA(null);

    try {
      // 1. Guardar mensaje del usuario (si no es un mensaje del sistema oculto)
      if (!isSistema) {
        addMessage({ role: 'user', content: textoAccion });
      }

      // 2. Construir el arreglo de mensajes para la API
      const mensajesParaAPI = [
        { role: 'system', content: promptMaestro },
        { role: 'system', content: construirContextoSistema() }
      ];

      // Añadir historial reciente (últimos 10 mensajes para no saturar tokens)
      const historialReciente = historial.slice(-10);
      historialReciente.forEach(msg => {
        mensajesParaAPI.push({ role: msg.role, content: msg.content });
      });

      // Añadir la nueva acción
      mensajesParaAPI.push({ role: 'user', content: textoAccion });

      // 3. Llamar a la API
      const respuestaRaw = await llamarIA(config, mensajesParaAPI);

      // 4. Parsear la respuesta y ejecutar comandos
      const resultadoParseado = parsearRespuesta(respuestaRaw);
      
      // Ejecutamos los comandos mutando el store de Zustand
      if (resultadoParseado.comandos.length > 0) {
        ejecutarComandos(resultadoParseado.comandos, useGameStore.getState());
      }

      // 5. Guardar la respuesta del asistente en el historial
      addMessage({ role: 'assistant', content: respuestaRaw, parseado: resultadoParseado });

      setProcesando(false);
      return resultadoParseado;

    } catch (err) {
      console.error("Error en useAI:", err);
      setErrorIA(err.message);
      setProcesando(false);
      return null;
    }
  };

  return {
    procesando,
    errorIA,
    enviarAccion
  };
}
