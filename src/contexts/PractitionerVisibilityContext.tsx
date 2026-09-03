import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getPractitionerSurfaceVisibility } from '../config/practitionerSurfaceVisibility';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useRouteScreenMode from '../hooks/useRouteScreenMode';

export type PractitionerVisibilityContextValue = {
  role: string;
  screenMode: string;
};

const DEFAULT_CONTEXT: PractitionerVisibilityContextValue = Object.freeze({
  role: '',
  screenMode: '',
});

/** Sentinel — hook resolves live surfaces when no provider is mounted (tests, HMR). */
const UNRESOLVED_SURFACES = Symbol('practitioner-surfaces-unresolved');

const VisibilityContext = createContext<
  ReturnType<typeof getPractitionerSurfaceVisibility> | typeof UNRESOLVED_SURFACES
>(UNRESOLVED_SURFACES);

const VisibilityMetaContext = createContext<PractitionerVisibilityContextValue>(DEFAULT_CONTEXT);

export function PractitionerVisibilityProvider({ children }: { children: ReactNode }) {
  const emergencyRole = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  const context = useMemo(
    (): PractitionerVisibilityContextValue => ({
      role: emergencyRole.role,
      screenMode,
    }),
    [emergencyRole.role, screenMode],
  );
  const surfaces = useMemo(() => getPractitionerSurfaceVisibility(context), [context]);

  return (
    <VisibilityMetaContext.Provider value={context}>
      <VisibilityContext.Provider value={surfaces}>{children}</VisibilityContext.Provider>
    </VisibilityMetaContext.Provider>
  );
}

export function usePractitionerSurfaceVisibility() {
  const surfaces = useContext(VisibilityContext);
  const meta = useContext(VisibilityMetaContext);
  if (surfaces !== UNRESOLVED_SURFACES) {
    return surfaces;
  }
  return getPractitionerSurfaceVisibility(meta);
}

export function usePractitionerVisibilityContext() {
  return useContext(VisibilityMetaContext);
}
