/**
 * Hoisted-safe emergency role mock for route integration tests.
 * Import via canonicalRouteTree.testShared.tsx (first line).
 */
import { vi } from 'vitest';

const mockEmergencyRole = vi.hoisted(() => {
  const compiledProfile = {
    user: {
      id: 'route-harness-user',
      role: 'physician',
      name: 'Route Harness Physician',
      email: 'route.harness@example.com',
    },
    routeAccess: ['/emergency/whiteboard', '/emergency/reception', '/emergency/ems', '/settings'],
    readOnly: false,
    role: { hospitalRole: 'physician' },
  };

  return {
    role: 'physician',
    roleLabel: 'Physician',
    roleDescription: 'Test physician',
    readOnly: false,
    landingRoute: '/emergency/whiteboard',
    defaultRoute: '/emergency/reception',
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
    nearestRoute: (path: string) => path || '/emergency/whiteboard',
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
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => mockEmergencyRole,
  default: () => mockEmergencyRole,
}));
