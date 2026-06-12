import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set, get) => ({
      // --- PANTALLA ACTUAL ---
      pantallaActual: 'configuracion',
      setPantalla: (p) => set({ pantallaActual: p }),

      // --- CONFIGURACIÓN API ---
      config: {
        proveedor: 'azure',
        resourceName: '',
        deploymentId: '',
        apiKey: '',
        apiVersion: '2024-10-21',
        endpointUrl: 'http://localhost:1234',
      },
      setConfig: (c) => set({ config: { ...get().config, ...c } }),

      // --- PROMPT MAESTRO ---
      promptMaestro: '',
      setPromptMaestro: (p) => set({ promptMaestro: p }),

      // --- PERSONAJE ACTIVO ---
      personaje: null,
      setPersonaje: (p) => set({ personaje: p }),

      // --- INVENTARIO ---
      inventario: [],
      oro: 0,
      
      // Acciones de inventario
      addItem: (item) => set((state) => {
        const existe = state.inventario.find(i => i.id === item.id);
        if (existe) {
          return { inventario: state.inventario.map(i => i.id === item.id ? { ...i, cantidad: i.cantidad + (item.cantidad || 1) } : i) };
        }
        return { inventario: [...state.inventario, { ...item, cantidad: item.cantidad || 1 }] };
      }),
      removeItem: (id) => set((state) => ({
        inventario: state.inventario.filter(i => i.id !== id)
      })),
      addGold: (n) => set((state) => ({ oro: state.oro + n })),
      removeGold: (n) => set((state) => ({ oro: Math.max(0, state.oro - n) })),

      // Acciones de daño y vida
      damagePlayer: (n) => set((state) => {
        if (!state.personaje) return state;
        const newHp = Math.max(0, state.personaje.hp.actual - n);
        return { personaje: { ...state.personaje, hp: { ...state.personaje.hp, actual: newHp } } };
      }),
      healPlayer: (n) => set((state) => {
        if (!state.personaje) return state;
        const maxHp = state.personaje.hp.maximo;
        const newHp = Math.min(maxHp, state.personaje.hp.actual + n);
        return { personaje: { ...state.personaje, hp: { ...state.personaje.hp, actual: newHp } } };
      }),
      addXp: (n) => set((state) => {
        if (!state.personaje) return state;
        return { personaje: { ...state.personaje, experiencia: state.personaje.experiencia + n } };
      }),
      setCondition: (cond) => set((state) => {
        if (!state.personaje) return state;
        if (state.personaje.condiciones.includes(cond)) return state;
        return { personaje: { ...state.personaje, condiciones: [...state.personaje.condiciones, cond] } };
      }),
      removeCondition: (cond) => set((state) => {
        if (!state.personaje) return state;
        return { personaje: { ...state.personaje, condiciones: state.personaje.condiciones.filter(c => c !== cond) } };
      }),

      // --- MUNDO ---
      mundo: {
        continente: 'luminaerion',
        reino: 'tumbaflor',
        ubicacion: 'plaza',
        lugar: null,
        horaDia: 'tarde',
        clima: 'despejado',
        diaActual: 1,
        npcs: [],
        enemigos: [],
        flags: {},
      },
      
      // Acciones de mundo
      setLocation: (continente, reino, ubicacion) => set((state) => ({
        mundo: { ...state.mundo, continente, reino, ubicacion, lugar: null }
      })),
      setTime: (hora) => set((state) => ({ mundo: { ...state.mundo, horaDia: hora } })),
      advanceDay: () => set((state) => ({ mundo: { ...state.mundo, diaActual: state.mundo.diaActual + 1 } })),
      setFlag: (flag, value) => set((state) => ({
        mundo: { ...state.mundo, flags: { ...state.mundo.flags, [flag]: value } }
      })),
      
      // Acciones NPC
      spawnNpc: (npc) => set((state) => {
        const existe = state.mundo.npcs.find(n => n.id === npc.id);
        if (existe) return state;
        return { mundo: { ...state.mundo, npcs: [...state.mundo.npcs, { ...npc, vivo: true, relacion: 'neutral' }] } };
      }),
      killNpc: (id) => set((state) => ({
        mundo: { ...state.mundo, npcs: state.mundo.npcs.map(n => n.id === id ? { ...n, vivo: false } : n) }
      })),

      // --- HISTORIAL ---
      historial: [],
      resumenComprimido: '',
      addMessage: (msg) => set((state) => ({ 
        historial: [...state.historial, { ...msg, timestamp: Date.now() }] 
      })),
      setResumenComprimido: (r) => set({ resumenComprimido: r }),
      clearHistorial: () => set({ historial: [], resumenComprimido: '' }),

      // --- GALERÍA ---
      galeria: [],
      personajeActivoId: null,
      addToGaleria: (pj) => set((state) => {
        const filtrada = state.galeria.filter(p => p.id !== pj.id);
        return { galeria: [...filtrada, pj] };
      }),
      removeFromGaleria: (id) => set((state) => ({
        galeria: state.galeria.filter(p => p.id !== id),
        personajeActivoId: state.personajeActivoId === id ? null : state.personajeActivoId
      })),
      setPersonajeActivo: (id) => set((state) => {
        const pj = state.galeria.find(p => p.id === id);
        if (pj) {
          return { 
            personajeActivoId: id,
            personaje: { ...pj }, // Cargar copia del personaje
            // Reiniciar historial al cambiar de personaje para no mezclar partidas
            historial: [],
            resumenComprimido: '',
            mundo: { ...get().mundo, diaActual: 1 } 
          };
        }
        return state;
      }),

      // --- DESCANSOS ---
      descansoCorto: () => set((state) => {
        // En una implementación completa esto gastaría dados de golpe
        // Por ahora curamos un 25% de la vida máxima como base
        if (!state.personaje) return state;
        const cura = Math.floor(state.personaje.hp.maximo * 0.25);
        const newHp = Math.min(state.personaje.hp.maximo, state.personaje.hp.actual + Math.max(1, cura));
        return { 
          personaje: { ...state.personaje, hp: { ...state.personaje.hp, actual: newHp } },
          mundo: { ...state.mundo, horaDia: state.mundo.horaDia === 'mañana' ? 'tarde' : state.mundo.horaDia === 'tarde' ? 'noche' : state.mundo.horaDia }
        };
      }),
      descansoLargo: () => set((state) => {
        if (!state.personaje) return state;
        return { 
          personaje: { 
            ...state.personaje, 
            hp: { ...state.personaje.hp, actual: state.personaje.hp.maximo },
            condiciones: [] // Limpiar condiciones negativas en descanso largo
          },
          mundo: { ...state.mundo, horaDia: 'mañana', diaActual: state.mundo.diaActual + 1 }
        };
      }),

      // --- COMBATE ---
      combateActivo: false,
      ordenIniciativa: [],
      iniciarCombate: (enemigos) => set({ combateActivo: true, ordenIniciativa: enemigos }),
      finalizarCombate: () => set({ combateActivo: false, ordenIniciativa: [] }),

      // --- INICIO ---
      inicioSeleccionado: null,
      setInicioSeleccionado: (i) => set({ inicioSeleccionado: i }),

      // --- OPCIONES RÁPIDAS ---
      opcionesRapidas: [],
      setOpcionesRapidas: (o) => set({ opcionesRapidas: o }),

      // --- CARGANDO ---
      cargando: false,
      setCargando: (c) => set({ cargando: c }),

      // --- UI AUXILIAR ---
      logComandosTécnicos: [],
      addLogTecnico: (log) => set((state) => ({ 
        logComandosTécnicos: [...state.logComandosTécnicos, log].slice(-50) // Mantener últimos 50
      })),

      // Cargar estado completo (para Load Game)
      loadGameState: (savedState) => set((state) => ({
        personaje: savedState.personaje || state.personaje,
        inventario: savedState.inventario || state.inventario,
        oro: savedState.oro || state.oro,
        mundo: savedState.mundo || state.mundo,
        historial: savedState.historial || state.historial,
        resumenComprimido: savedState.resumenComprimido || state.resumenComprimido,
        combateActivo: savedState.combateActivo || false,
        ordenIniciativa: savedState.ordenIniciativa || [],
        pantallaActual: 'juego'
      }))
    }),
    {
      name: 'rpg_estado',
      partialize: (state) => ({
        config: state.config,
        promptMaestro: state.promptMaestro,
        galeria: state.galeria,
        personajeActivoId: state.personajeActivoId,
        personaje: state.personaje,
        inventario: state.inventario,
        oro: state.oro,
        mundo: state.mundo,
        historial: state.historial,
        resumenComprimido: state.resumenComprimido,
        combateActivo: state.combateActivo,
        inicioSeleccionado: state.inicioSeleccionado,
      }),
    }
  )
);
