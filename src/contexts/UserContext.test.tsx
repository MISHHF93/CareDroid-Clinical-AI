import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';
import { useEmergencyStore } from '../store/emergencyStore';

vi.mock('../services/devBackendAuth', () => ({
  ensureDevBackendSession: vi.fn().mockResolvedValue({ token: 'dev-bypass-token', source: 'mock' }),
}));

const wrapper = ({ children }) => <UserProvider>{children}</UserProvider>;

describe('UserContext setUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // HEAL-347.39: setUser() used to hardcode authMode: 'open-access' on every
  // call regardless of what was passed in -- a leftover from the pre-login
  // "Auth UI removed" era. Once RequireRealSession started gating routes on
  // authMode (real login / explicit-dev-bypass), this silently downgraded
  // every profile switch back to open-access and bounced the session to
  // /login. Live-reproduced via the 8-profile demo switcher on
  // PlatformEntryHub -- every single chip click redirected to /login.
  it('preserves an explicit-dev-bypass authMode instead of forcing open-access', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.setUser({
        id: 'user-1',
        email: 'dev@example.com',
        role: 'physician',
        authMode: 'explicit-dev-bypass',
        isDevAuthBypass: true,
        profile: { roleProfileId: 'physician' },
      });
    });

    expect(result.current.user.authMode).toBe('explicit-dev-bypass');

    act(() => {
      result.current.setUser({
        ...result.current.user,
        role: 'registration_clerk',
        profile: { ...result.current.user.profile, roleProfileId: 'registration_clerk' },
      });
    });

    expect(result.current.user.authMode).toBe('explicit-dev-bypass');
    expect(result.current.user.role).toBe('registration_clerk');
  });

  it('preserves a real authMode across a setUser call', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.setUser({
        id: 'user-2',
        email: 'clinician@hospital.org',
        role: 'physician',
        authMode: 'real',
        profile: { roleProfileId: 'physician' },
      });
    });

    expect(result.current.user.authMode).toBe('real');
  });
});

// Item 37: PHI-adjacent state (the currently-selected patient, and anything
// else listening for a session change) must not survive a sign-out or a
// real role switch. A re-hydration of the SAME identity must NOT wipe it --
// only an actual identity change should trigger the clear.
describe('UserContext PHI-context clearing on sign-out / role switch (item 37)', () => {
  beforeEach(() => {
    localStorage.clear();
    useEmergencyStore.getState().selectPatient('patient-should-be-cleared');
  });

  it('clears the selected patient on signOut', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    expect(useEmergencyStore.getState().selectedPatientId).toBe('patient-should-be-cleared');

    act(() => {
      result.current.signOut();
    });

    expect(useEmergencyStore.getState().selectedPatientId).toBeNull();
  });

  it('dispatches close-all-panels and a dedicated session-context-clear event on signOut', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    const closeAllPanels = vi.fn();
    const clearSessionContext = vi.fn();
    window.addEventListener('close-all-panels', closeAllPanels);
    window.addEventListener('caredroid:clear-session-context', clearSessionContext);

    act(() => {
      result.current.signOut();
    });

    expect(closeAllPanels).toHaveBeenCalledTimes(1);
    expect(clearSessionContext).toHaveBeenCalledTimes(1);

    window.removeEventListener('close-all-panels', closeAllPanels);
    window.removeEventListener('caredroid:clear-session-context', clearSessionContext);
  });

  it('clears the selected patient when setUser switches to a genuinely different identity', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.setUser({
        id: 'user-a',
        email: 'a@hospital.org',
        role: 'physician',
        authMode: 'explicit-dev-bypass',
        profile: { roleProfileId: 'physician' },
      });
    });
    useEmergencyStore.getState().selectPatient('patient-should-be-cleared');

    act(() => {
      result.current.setUser({
        id: 'user-b',
        email: 'b@hospital.org',
        role: 'triage_nurse',
        authMode: 'explicit-dev-bypass',
        profile: { roleProfileId: 'triage_nurse' },
      });
    });

    expect(useEmergencyStore.getState().selectedPatientId).toBeNull();
  });

  it('does NOT clear the selected patient when setUser re-hydrates the SAME identity', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.setUser({
        id: 'user-a',
        email: 'a@hospital.org',
        role: 'physician',
        authMode: 'explicit-dev-bypass',
        profile: { roleProfileId: 'physician' },
      });
    });
    useEmergencyStore.getState().selectPatient('patient-should-survive');

    act(() => {
      // Same id + same role -- e.g. a background token refresh, not a real switch.
      result.current.setUser({
        ...result.current.user,
        email: 'a@hospital.org',
      });
    });

    expect(useEmergencyStore.getState().selectedPatientId).toBe('patient-should-survive');
  });
});

describe('UserContext bootstrap timeout race (HEAL-347.46)', () => {
  const TOKEN_KEY = 'caredroid_access_token';
  const PROFILE_KEY = 'caredroid_user_profile';
  const CLICK_JWT = 'header.click-payload.signature';
  const AMBIENT_JWT = 'header.ambient-payload.signature';

  beforeEach(() => {
    localStorage.clear();
  });

  // Regression for a live-reproduced bug (roughly 50% fail rate under a
  // slow/degraded backend, per a direct-localStorage-inspection sweep):
  // UserContext's ambient bootstrap effect runs on every mount -- including
  // the /login page itself, before the user does anything -- and calls
  // ensureDevBackendSession() (unforced). AuthPage.tsx's "Bypass sign-in"
  // click independently clears storage and calls the SAME function with
  // force:true. Even with HEAL-347.46's devBackendAuth.ts fix making a
  // forced call join an already-in-flight unforced one (so they resolve
  // from a single shared fetch in the common case), nothing guarantees
  // every call site is always joined -- e.g. a stray unforced caller that
  // starts its own separate fetch before the shared-promise window opens.
  // If the ambient effect's OWN resolution lands with a *different* (but
  // still validly JWT-shaped) token+user than what the click has ALREADY
  // written to storage, the old code trusted session.token directly
  // (`resolveSessionToken(session?.token)`) while only re-reading the user
  // from storage -- producing a self-inconsistent pair (one identity's
  // token, a different identity's profile) written back over the correct,
  // already-stored session.
  it('defers to an already-valid stored session instead of a mismatched concurrent resolution', async () => {
    const { ensureDevBackendSession } = await import('../services/devBackendAuth');
    let resolveAmbient: (value: unknown) => void = () => {};
    vi.mocked(ensureDevBackendSession).mockReturnValue(
      new Promise((resolve) => {
        resolveAmbient = resolve;
      }),
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    // Simulate AuthPage.tsx's handleDevBypass landing its own real session
    // in storage while the ambient effect's own call is still pending.
    localStorage.setItem(TOKEN_KEY, CLICK_JWT);
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        id: 'click-user-id',
        email: 'dev@example.com',
        role: 'physician',
        authMode: 'explicit-dev-bypass',
        isDevAuthBypass: true,
        profile: { roleProfileId: 'physician' },
      }),
    );

    // Now let the ambient effect's own (separate, stray) fetch resolve with
    // a DIFFERENT identity than what's already correctly stored.
    await act(async () => {
      resolveAmbient({
        token: AMBIENT_JWT,
        source: 'dev-session',
        user: { id: 'ambient-user-id', authMode: 'local-dev-demo' },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBe(CLICK_JWT);
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY) as string).id).toBe('click-user-id');
    expect(result.current.authToken).toBe(CLICK_JWT);
    expect(result.current.user.id).toBe('click-user-id');
  });
});
