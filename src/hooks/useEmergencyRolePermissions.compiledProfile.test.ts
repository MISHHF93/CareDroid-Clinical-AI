import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';

const setUser = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

// Shaped like the browser state after a dev-bypass reload following a demo
// role switch: devBackendAuth.ts's persistDevSession() overwrites the stored
// profile with the backend's dev-session response, which has no
// compiledAccessProfile/caredroidProfile and a stale top-level `role` that
// doesn't match `profile.roleProfileId` (the backend's own UserRole enum has
// no registration_clerk equivalent). Only profile.roleProfileId is reliable.
vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: {
      id: 'c610b6b5-4826-4190-aebe-97b433c62df8',
      authMode: 'explicit-dev-bypass',
      role: 'nurse',
      profile: { roleProfileId: 'registration_clerk' },
    },
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
  it('grants registration_clerk actions, not the default demo user\'s, when compiledAccessProfile/caredroidProfile are both missing', () => {
    const { result } = renderHook(() => useEmergencyRolePermissions());

    expect(result.current.role).toBe('registration_clerk');
    expect(result.current.compiledProfile.role.emergencyRoleId).toBe('registration_clerk');
    expect(result.current.compiledProfile.emergencyAccess.allowedActions).toContain(
      EMERGENCY_ACTIONS.createPatient,
    );
    expect(result.current.canMutate(EMERGENCY_ACTIONS.createPatient)).toBe(true);
  });
});
