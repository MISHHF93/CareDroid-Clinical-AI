import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';

const setUser = vi.fn();

// Shaped like the browser state after a dev-bypass reload following a demo
// role switch: devBackendAuth.ts's persistDevSession() overwrites the stored
// profile with the backend's dev-session response, which has no
// compiledAccessProfile/caredroidProfile and a stale top-level `role` that
// doesn't match `profile.roleProfileId` (the backend's own UserRole enum has
// no equivalent for most of these emergencyRoleIds). Only profile.roleProfileId
// is reliable. Mutated per-test via mockUser below rather than baked into the
// vi.mock factory, so the same fallback-reconstruction path can be exercised
// for more than one role.
const mockUser: any = {
  id: 'c610b6b5-4826-4190-aebe-97b433c62df8',
  authMode: 'explicit-dev-bypass',
  role: 'nurse',
  profile: { roleProfileId: 'registration_clerk' },
};

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: mockUser,
    setUser,
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({ operationalProfile: null }),
}));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: (selector: any) => selector({ emergencySettings: {} }),
}));

vi.mock('./useEmergencyDeviceContext', () => ({
  default: () => ({ deviceContextId: 'desktop', definition: { label: 'Desktop' }, isKiosk: false }),
}));

vi.mock('./useRouteScreenMode', () => ({
  default: () => 'reception',
}));

vi.mock('../services/devBackendAuth', () => ({
  ensureDevBackendSession: vi.fn(),
  isDev: true,
}));

describe('useEmergencyRolePermissions compiledProfile reconstruction', () => {
  // Each action below belongs to its role but NOT to ed_manager (the default
  // demo user this fallback used to leak emergencyRoleId from) -- so a test
  // passing here can only mean the role's OWN action list was actually used,
  // not that the assertion happens to overlap with ed_manager's grants too.
  it.each([
    ['registration_clerk', EMERGENCY_ACTIONS.createPatient],
    ['triage_nurse', EMERGENCY_ACTIONS.triage],
    ['physician', EMERGENCY_ACTIONS.dischargePatient],
  ])(
    "grants %s actions, not the default demo user's, when compiledAccessProfile/caredroidProfile are both missing",
    (roleProfileId, action) => {
      mockUser.profile = { roleProfileId };

      const { result } = renderHook(() => useEmergencyRolePermissions());

      expect(result.current.role).toBe(roleProfileId);
      expect(result.current.compiledProfile.role.emergencyRoleId).toBe(roleProfileId);
      expect(result.current.compiledProfile.emergencyAccess.allowedActions).toContain(action);
      expect(result.current.canMutate(action)).toBe(true);
    },
  );
});
