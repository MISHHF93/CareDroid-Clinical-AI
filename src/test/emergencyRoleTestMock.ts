import { vi } from 'vitest';
import { compileCareDroidAccessProfile } from '../lib/users/canonicalAccess';
import { getDefaultDemoUser } from '../lib/users/demoUsers';

/** Route/integration harness mock with compiledProfile for permission shims. */
export function createEmergencyRoleTestMock(
  overrides: {
    role?: string;
    roleLabel?: string;
    landingRoute?: string;
    defaultRoute?: string;
    readOnly?: boolean;
  } = {},
) {
  const compiledProfile = compileCareDroidAccessProfile(getDefaultDemoUser());

  return {
    role: overrides.role ?? 'physician',
    roleLabel: overrides.roleLabel ?? 'Physician',
    roleDescription: 'Test physician',
    readOnly: overrides.readOnly ?? false,
    landingRoute: overrides.landingRoute ?? '/emergency/whiteboard',
    defaultRoute: overrides.defaultRoute ?? '/emergency/whiteboard',
    allowedRoutes: compiledProfile.routeAccess,
    allowedActions: [],
    demoRoles: [],
    compiledProfile,
    permissionContext: {
      screenMode: 'clinical_workstation',
      displayParam: null,
      readOnlyDisplayMode: false,
      roleReadOnly: false,
    },
    canAccessRoute: () => true,
    nearestRoute: (path: string) => path || overrides.landingRoute || '/emergency/whiteboard',
    can: () => true,
    canDisplay: () => true,
    canMutate: () => true,
    canMutateSurface: () => true,
    presentAction: () => ({ visible: true, enabled: true, state: 'enabled', readOnly: false }),
    actionState: () => 'enabled',
    actionVisible: () => true,
    actionEnabled: () => true,
    actionReadOnly: () => false,
    switchDemoRole: vi.fn(),
  };
}