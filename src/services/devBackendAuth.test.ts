import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./backendReachability', () => ({
  ensureBackendReachabilityProbed: vi.fn(async () => true),
}));

vi.mock('./tenantContextStore', () => ({
  setTenantContext: vi.fn(),
}));

const TOKEN_KEY = 'caredroid_access_token';
const PROFILE_KEY = 'caredroid_user_profile';

function backendDevSessionResponse(overrides: Record<string, unknown> = {}) {
  // Real shape from backend/src/modules/auth/auth.service.ts's sanitizeUser --
  // no isDemoPersonaUser() markers (no authMode:'open-access', no demoPersona,
  // no profile.demoPersonaId).
  return {
    accessToken: 'header.payload.signature',
    refreshToken: 'header.payload.signature2',
    user: {
      id: 'backend-dev-user-id',
      email: 'dev@example.com',
      role: 'physician',
      isActive: true,
      emailVerified: true,
      profile: {},
    },
    tenantContext: null,
  };
}

function demoPersonaProfile(role: string) {
  return {
    id: 'open-access-user',
    authMode: 'open-access',
    demoPersona: 'cara-george-ed18',
    role,
    profile: { roleProfileId: role, demoPersonaId: 'cara-george-ed18' },
  };
}

describe('devBackendAuth persistDevSession (HEAL-319)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => backendDevSessionResponse(),
      })),
    );
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not overwrite an already-active demo persona role when the dev-session fetch resolves late', async () => {
    // Simulate: the clinician already switched to "physician" via
    // ProfileRoleSwitcher before this (possibly late-resolving,
    // un-cancellable) fetch settles.
    localStorage.setItem(PROFILE_KEY, JSON.stringify(demoPersonaProfile('physician')));

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    await ensureDevBackendSession({ force: true });

    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) as string);
    // Before HEAL-319, this fetch's raw backend user payload (no demo-persona
    // markers) unconditionally overwrote the profile, and the next read of
    // storage would fall through isDemoPersonaUser() to the hardcoded
    // charge_nurse default -- silently discarding the clinician's own role
    // selection.
    expect(stored.role).toBe('physician');
    expect(stored.profile.roleProfileId).toBe('physician');
  });

  it('still persists the backend session payload on a genuinely fresh session (no demo persona yet)', async () => {
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    await ensureDevBackendSession({ force: true });

    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) as string);
    expect(stored.id).toBe('backend-dev-user-id');
    expect(stored.authMode).toBe('local-dev-demo');
  });

  it('always persists the accessToken regardless of the existing profile', async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(demoPersonaProfile('registration_clerk')));

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    await ensureDevBackendSession({ force: true });

    expect(localStorage.getItem(TOKEN_KEY)).toBe('header.payload.signature');
  });
});
