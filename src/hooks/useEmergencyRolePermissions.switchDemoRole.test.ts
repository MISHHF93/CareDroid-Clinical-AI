import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import {
  setTenantContext,
  getTenantContext,
  getTenantHeaders,
} from '../services/tenantContextStore';
import * as tenantContextStore from '../services/tenantContextStore';

const setUser = vi.fn();
const ensureDevBackendSession = vi.fn();

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
  ensureDevBackendSession: (...args: unknown[]) => ensureDevBackendSession(...args),
  isDev: true,
}));

describe('useEmergencyRolePermissions switchDemoRole', () => {
  beforeEach(() => {
    setUser.mockClear();
    ensureDevBackendSession.mockReset();
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'demo-user',
      role: 'physician',
      subscriptionPlan: 'free',
    });
  });

  it('clears the cached tenant context synchronously, before the backend session sync resolves', () => {
    // Never resolves -- proves the clear happens independent of, and before,
    // the backend session sync completing (matching ProfileRoleSwitcher's
    // fire-and-forget `void switchDemoRole(...)` call).
    ensureDevBackendSession.mockReturnValue(new Promise(() => {}));

    expect(getTenantContext()).not.toBeNull();
    expect(getTenantHeaders()['X-CareDroid-Role']).toBe('physician');

    const { result } = renderHook(() => useEmergencyRolePermissions());

    act(() => {
      void result.current.switchDemoRole('ed_manager');
    });

    expect(getTenantContext()).toBeNull();
    // No tenant-assertion headers at all once the cache is cleared -- this is what
    // stops a stale role from being sent to a page that mounts and fetches data
    // in the same tick as the switch (ProfileRoleSwitcher navigates immediately).
    expect(getTenantHeaders()).toEqual({});
  });

  it('applies the fresh tenantContext from the resolved session sync, not a guessed value', async () => {
    // Shaped exactly like auth.service.ts's ensureDevTenantForUser response --
    // built from user.role strictly *after* the dev-session sync wrote it, so
    // this is guaranteed current, unlike TenantContext.tsx's own independent
    // /api/tenant/context refetch which can race ahead of that write and
    // resolve with the pre-switch role instead (the bug this test guards).
    const freshTenantContext = {
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'demo-user',
      role: 'ed_manager',
      subscriptionPlan: 'free',
    };
    ensureDevBackendSession.mockResolvedValue({
      token: 'new-jwt',
      source: 'dev-session',
      tenantContext: freshTenantContext,
    });

    const { result } = renderHook(() => useEmergencyRolePermissions());

    await act(async () => {
      await result.current.switchDemoRole('ed_manager');
    });

    expect(getTenantContext()).toEqual(freshTenantContext);
    expect(getTenantHeaders()['X-CareDroid-Role']).toBe('ed_manager');
  });

  it('ignores a concurrent setTenantContext call racing the switch (TenantContext.tsx losing the race by design)', async () => {
    // Simulates the actual live bug: TenantContext.tsx's own effect-driven
    // GET /api/tenant/context resolves *faster* than the dev-session POST
    // switchDemoRole is awaiting, and tries to repopulate the cache with the
    // pre-switch role in between. Without the transition lock this call
    // would win and the header would go out wrong; with it, it's a no-op.
    let resolveSession: (value: unknown) => void;
    ensureDevBackendSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );

    const { result } = renderHook(() => useEmergencyRolePermissions());

    let switchPromise: Promise<unknown>;
    act(() => {
      switchPromise = result.current.switchDemoRole('ed_manager');
    });

    // The racing caller: same shape TenantContext.tsx's applyTenantContext
    // would produce, but carrying the STALE pre-switch role.
    tenantContextStore.setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'demo-user',
      role: 'physician',
      subscriptionPlan: 'free',
    });
    expect(getTenantContext()).toBeNull(); // still locked out, not the stale value

    await act(async () => {
      resolveSession({
        token: 'new-jwt',
        source: 'dev-session',
        tenantContext: {
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          userId: 'demo-user',
          role: 'ed_manager',
          subscriptionPlan: 'free',
        },
      });
      await switchPromise;
    });

    // The switch's own fresh result wins, not the racing stale one.
    expect(getTenantHeaders()['X-CareDroid-Role']).toBe('ed_manager');

    // The lock is released afterward -- a normal, non-racing setTenantContext
    // call works again.
    tenantContextStore.setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'demo-user',
      role: 'triage_nurse',
      subscriptionPlan: 'free',
    });
    expect(getTenantHeaders()['X-CareDroid-Role']).toBe('triage_nurse');
  });

  it('leaves the tenant context cleared when the session sync resolves without one (fallback-bypass)', async () => {
    ensureDevBackendSession.mockResolvedValue({ token: 'bypass-token', source: 'fallback-bypass' });

    const { result } = renderHook(() => useEmergencyRolePermissions());

    await act(async () => {
      await result.current.switchDemoRole('ed_manager');
    });

    // Fails closed rather than leaving (or guessing) a possibly-wrong role.
    expect(getTenantContext()).toBeNull();
    expect(getTenantHeaders()).toEqual({});
  });
});
