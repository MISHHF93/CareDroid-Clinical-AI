import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';

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
