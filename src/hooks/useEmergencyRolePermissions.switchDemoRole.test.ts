import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import { setTenantContext, getTenantContext, getTenantHeaders } from '../services/tenantContextStore';

const setUser = vi.fn();
let neverResolvingSessionSync: Promise<unknown>;

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: {
      id: 'demo-user',
      authMode: 'open-access',
      role: 'physician',
      profile: { roleProfileId: 'physician' },
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
  default: () => 'clinical_workstation',
}));

vi.mock('../services/devBackendAuth', () => ({
  // Never resolves -- proves the tenant-context clear happens synchronously,
  // independent of (and before) the backend session sync completing.
  ensureDevBackendSession: vi.fn(() => (neverResolvingSessionSync = new Promise(() => {}))),
  isDev: true,
}));

describe('useEmergencyRolePermissions switchDemoRole', () => {
  beforeEach(() => {
    setUser.mockClear();
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'demo-user',
      role: 'physician',
      subscriptionPlan: 'free',
    });
  });

  it('clears the cached tenant context synchronously, before the backend session sync resolves', () => {
    expect(getTenantContext()).not.toBeNull();
    expect(getTenantHeaders()['X-CareDroid-Role']).toBe('physician');

    const { result } = renderHook(() => useEmergencyRolePermissions());

    act(() => {
      // Fire-and-forget, matching ProfileRoleSwitcher's own `void switchDemoRole(...)`
      // call -- the backend sync (ensureDevBackendSession, mocked to never resolve
      // above) must not need to complete for the stale header to already be gone.
      void result.current.switchDemoRole('ed_manager');
    });

    expect(getTenantContext()).toBeNull();
    // No tenant-assertion headers at all once the cache is cleared -- this is what
    // stops a stale role from being sent to a page that mounts and fetches data
    // in the same tick as the switch (ProfileRoleSwitcher navigates immediately).
    expect(getTenantHeaders()).toEqual({});
  });
});
