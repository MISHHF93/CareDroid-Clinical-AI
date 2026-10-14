import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DensityMode = 'comfortable' | 'compact' | 'auto';
export type ResolvedDensity = 'comfortable' | 'compact';

interface DensityContextValue {
  densityMode: DensityMode;
  resolvedDensity: ResolvedDensity;
  setDensityMode: (mode: DensityMode) => void;
  toggleDensity: () => void;
  isCompact: boolean;
}

const DENSITY_STORAGE_KEY = 'caredroid-density-mode';

const DensityContext = createContext<DensityContextValue | null>(null);

function detectAutoDensity(): ResolvedDensity {
  if (typeof window === 'undefined') {
    return 'compact';
  }
  // If user has coarse pointer (touch device) or screen is under 1024px, default to comfortable
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isNarrow = window.innerWidth < 1024;
  if (isTouch || isNarrow) {
    return 'comfortable';
  }
  return 'compact';
}

function readStoredDensityMode(): DensityMode {
  if (typeof window === 'undefined') {
    return 'auto';
  }
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === 'comfortable' || stored === 'compact' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Ignore localStorage access failures
  }
  return 'auto';
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [densityMode, setDensityModeState] = useState<DensityMode>(readStoredDensityMode);
  const [systemDensity, setSystemDensity] = useState<ResolvedDensity>(detectAutoDensity);

  useEffect(() => {
    const handleResize = () => {
      setSystemDensity(detectAutoDensity());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resolvedDensity: ResolvedDensity = useMemo(() => {
    if (densityMode === 'auto') {
      return systemDensity;
    }
    return densityMode;
  }, [densityMode, systemDensity]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', resolvedDensity);
      document.documentElement.dataset.density = resolvedDensity;
    }
  }, [resolvedDensity]);

  const setDensityMode = useCallback((mode: DensityMode) => {
    setDensityModeState(mode);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const toggleDensity = useCallback(() => {
    const next: ResolvedDensity = resolvedDensity === 'compact' ? 'comfortable' : 'compact';
    setDensityMode(next);
  }, [resolvedDensity, setDensityMode]);

  const value = useMemo<DensityContextValue>(
    () => ({
      densityMode,
      resolvedDensity,
      setDensityMode,
      toggleDensity,
      isCompact: resolvedDensity === 'compact',
    }),
    [densityMode, resolvedDensity, setDensityMode, toggleDensity],
  );

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    // Provide a safe fallback if accessed outside the provider
    const resolved = detectAutoDensity();
    return {
      densityMode: 'auto',
      resolvedDensity: resolved,
      setDensityMode: () => {},
      toggleDensity: () => {},
      isCompact: resolved === 'compact',
    };
  }
  return context;
}
