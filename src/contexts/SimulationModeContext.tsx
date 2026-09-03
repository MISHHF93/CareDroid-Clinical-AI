import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  SIMULATION_MODE_CHANGED_EVENT,
  applySimulationModeDocumentState,
  isSimulationModeActive,
  isSimulationModeEnabled,
  readSimulationModeActive,
  setSimulationModeActive,
  toggleSimulationModeActive,
  type SimulationModeChangedDetail,
} from '../services/simulationModeService';

type SimulationModeContextValue = Readonly<{
  enabled: boolean;
  active: boolean;
  setActive: (active: boolean) => void;
  toggle: () => void;
}>;

const SimulationModeContext = createContext<SimulationModeContextValue | undefined>(undefined);

export function SimulationModeProvider({ children }: { children: ReactNode }) {
  const enabled = isSimulationModeEnabled();
  const [active, setActiveState] = useState(() => readSimulationModeActive());

  const syncFromStorage = useCallback(() => {
    setActiveState(readSimulationModeActive());
  }, []);

  useEffect(() => {
    applySimulationModeDocumentState(active);
  }, [active]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<SimulationModeChangedDetail>).detail;
      if (detail && typeof detail.active === 'boolean') {
        setActiveState(detail.active);
        return;
      }
      syncFromStorage();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'caredroid.simulationMode.active') {
        syncFromStorage();
      }
    };

    window.addEventListener(SIMULATION_MODE_CHANGED_EVENT, onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SIMULATION_MODE_CHANGED_EVENT, onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncFromStorage]);

  const setActive = useCallback(
    (next: boolean) => {
      if (!enabled) return;
      if (setSimulationModeActive(next)) {
        setActiveState(next);
      }
    },
    [enabled],
  );

  const toggle = useCallback(() => {
    if (!enabled) return;
    if (toggleSimulationModeActive()) {
      setActiveState(isSimulationModeActive());
    }
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      active: enabled && active,
      setActive,
      toggle,
    }),
    [active, enabled, setActive, toggle],
  );

  return <SimulationModeContext.Provider value={value}>{children}</SimulationModeContext.Provider>;
}

export function useSimulationMode(): SimulationModeContextValue {
  const context = useContext(SimulationModeContext);
  if (!context) {
    return {
      enabled: false,
      active: false,
      setActive: () => undefined,
      toggle: () => undefined,
    };
  }
  return context;
}
