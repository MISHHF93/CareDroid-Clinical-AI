import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type RouteChromeState = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

type RouteChromeContextValue = {
  chrome: RouteChromeState;
  setChrome: (patch: RouteChromeState) => void;
  clearChrome: () => void;
};

const RouteChromeContext = createContext<RouteChromeContextValue | null>(null);

export function RouteChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<RouteChromeState>({});

  const setChrome = useCallback((patch: RouteChromeState) => {
    setChromeState((current) => ({ ...current, ...patch }));
  }, []);

  const clearChrome = useCallback(() => {
    setChromeState({});
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
      clearChrome,
    }),
    [chrome, clearChrome, setChrome],
  );

  return <RouteChromeContext.Provider value={value}>{children}</RouteChromeContext.Provider>;
}

export function useRouteChrome() {
  const context = useContext(RouteChromeContext);
  if (!context) {
    throw new Error('useRouteChrome must be used within RouteChromeProvider');
  }
  return context;
}

/**
 * Register route-specific chrome for the permanent shell tab strip; clears on unmount.
 *
 * ORDERING CONTRACT (the fix for the intermittently-vanishing route header
 * actions, e.g. Referrals' "New Referral"): this registration runs as a
 * PASSIVE effect, and AppShell's navigation-scoped reset (RouteChromeReset)
 * must clear in the LAYOUT phase. Layout effects always run before passive
 * effects in the same commit, so a navigation clear can never land after the
 * incoming route's registration and silently erase it — which is exactly what
 * happened (timing-dependent) when both ran as passive effects.
 */
export function useRouteChromeRegistration(chrome: RouteChromeState | null | undefined) {
  const { setChrome, clearChrome } = useRouteChrome();

  useEffect(() => {
    if (!chrome) {
      clearChrome();
      return undefined;
    }
    setChrome(chrome);
    return () => clearChrome();
  }, [chrome, clearChrome, setChrome]);
}
