import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
 *
 * HEAL-185: unlike useRouteChrome() (which intentionally throws for callers like
 * ShellRouteTab, where a missing provider is a real AppShell wiring bug worth catching hard),
 * this hook uses useContext directly and no-ops without a provider. It's now called from
 * CareDroidPage -- a leaf component rendered standalone across ~355 existing unit tests that
 * predate this hook's use here and don't wrap in RouteChromeProvider. The real app always
 * mounts the provider once at AppShell's root, so production registration is unaffected; this
 * only changes behavior for isolated test renders, which correctly get the pre-HEAL-185
 * (registration-free) behavior instead of crashing.
 *
 * Deliberately depends on the individual `setChrome`/`clearChrome` callbacks (stable --
 * RouteChromeProvider wraps them in useCallback with empty deps), NOT the whole `context`
 * object -- `context` itself gets a new reference every time setChrome runs (RouteChromeProvider
 * memoizes it on its own `chrome` state), and this effect calls setChrome, so depending on
 * `context` directly created a genuine infinite render loop (setChrome -> new context ->
 * effect deps changed -> effect reruns -> setChrome -> ...), caught via a real
 * "JavaScript heap out of memory" crash while writing this hook's own test.
 */
function shallowEqualChrome(
  a: RouteChromeState | null | undefined,
  b: RouteChromeState | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.eyebrow === b.eyebrow && a.title === b.title && a.subtitle === b.subtitle && a.actions === b.actions;
}

export function useRouteChromeRegistration(chrome: RouteChromeState | null | undefined): boolean {
  const context = useContext(RouteChromeContext);
  const setChrome = context?.setChrome;
  const clearChrome = context?.clearChrome;

  // Callers are expected to pass a stable/memoized object (this hook's own
  // test file's Registrant does), but an inline object literal is an easy
  // mistake to make at a call site -- and it's a real infinite render loop,
  // not just a missed optimization: this hook calls useContext above, so
  // setChrome's resulting context-value change re-renders THIS hook's own
  // caller; a fresh `{ title: '...' }` literal every render means the effect
  // below never stops re-firing (recreate object -> effect fires -> setChrome
  // -> context changes -> caller re-renders -> recreate object -> ...).
  // Found live: ~45 page components across a single batch passed an inline
  // literal instead of the module-constant/useMemo pattern the established
  // call sites already use, hanging any render (e.g. the route smoke test)
  // that mounted one inside a real RouteChromeProvider. Stabilizing by VALUE
  // here makes the footgun impossible regardless of how `chrome` was built,
  // without requiring every caller to remember to memoize it themselves.
  const stableChromeRef = useRef(chrome);
  if (!shallowEqualChrome(stableChromeRef.current, chrome)) {
    stableChromeRef.current = chrome;
  }
  const stableChrome = stableChromeRef.current;

  useEffect(() => {
    if (!setChrome || !clearChrome) return undefined;
    if (!stableChrome) {
      clearChrome();
      return undefined;
    }
    setChrome(stableChrome);
    return () => clearChrome();
  }, [stableChrome, setChrome, clearChrome]);

  return Boolean(context);
}
