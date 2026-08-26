import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./backendReachability', () => ({
  ensureBackendReachabilityProbed: vi.fn(async () => true),
}));

vi.mock('./tenantContextStore', () => ({
  setTenantContext: vi.fn(),
}));

const TOKEN_KEY = 'caredroid_access_token';
const PROFILE_KEY = 'caredroid_user_profile';

function backendDevSessionResponse() {
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

function explicitDevBypassProfile(role: string) {
  // Real shape from AuthPage.tsx's "Bypass sign-in" button + a subsequent
  // switchDemoRole() -- authMode 'explicit-dev-bypass' is a real backend
  // dev-session user (a UUID id, no OPEN_ACCESS_USER_ID/demoPersona
  // markers), so isDemoPersonaUser() returns false for it. compiledAccessProfile/
  // caredroidProfile are the frontend-only fields switchDemoRole() attaches.
  return {
    id: 'c610b6b5-4826-4190-aebe-97b433c62df8',
    authMode: 'explicit-dev-bypass',
    role,
    profile: { roleProfileId: role, hospitalRole: role },
    compiledAccessProfile: { user: { role } },
    caredroidProfile: { role },
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

  it('does not overwrite an already-active explicit-dev-bypass session either, not just the open-access demo persona shape', async () => {
    // The actual session type this app's own "Bypass sign-in" button + demo
    // role switcher produce -- isDemoPersonaUser() alone doesn't recognize
    // it (no OPEN_ACCESS_USER_ID, no demoPersona marker), so this write used
    // to clobber it exactly like the pre-HEAL-319 open-access case above.
    // Confirmed live: a switched-to registration_clerk session lost its own
    // action grants after a reload (the top-level `role` field this test
    // checks got overwritten with the backend's generic UserRole, unrelated
    // to the Emergency-OS role actually switched to), and a switched-to
    // public_display session's compiledAccessProfile/caredroidProfile
    // (frontend-only fields, absent from any backend response) were lost
    // outright.
    localStorage.setItem(PROFILE_KEY, JSON.stringify(explicitDevBypassProfile('ems_user')));

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    await ensureDevBackendSession({ force: true, roleProfileId: 'ems_user' });

    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) as string);
    expect(stored.role).toBe('ems_user');
    expect(stored.profile.roleProfileId).toBe('ems_user');
    expect(stored.compiledAccessProfile).toBeTruthy();
    expect(stored.caredroidProfile).toBeTruthy();
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

describe('devBackendAuth ensureDevBackendSession concurrency (HEAL-347.42)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares one real fetch across several concurrent force:true callers instead of firing one each', async () => {
    // Regression for a live-observed storm: several components each hitting a
    // protected route with the stale bypass token on mount independently call
    // apiClient.ts's 401-retry, which calls ensureDevBackendSession({force:
    // true}). Before this fix, `if (force) inFlightDevSession = null` meant
    // each concurrent forced call reset the guard the previous one had just
    // set, so every one fired its own POST /api/auth/dev-session -- confirmed
    // live via network trace: 15+ concurrent POSTs to that route on a single
    // login. That route is also known to degrade under concurrent load (see
    // resolveDevBackendSession's own HEAL-347.27 comment), so this was making
    // its own problem worse, not just wasteful.
    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetchCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true, json: async () => backendDevSessionResponse() };
      }),
    );

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    const results = await Promise.all([
      ensureDevBackendSession({ force: true }),
      ensureDevBackendSession({ force: true }),
      ensureDevBackendSession({ force: true }),
    ]);

    expect(fetchCallCount).toBe(1);
    results.forEach((result) => expect(result.token).toBe('header.payload.signature'));
  });

  it('joins an in-progress forced fetch instead of starting a separate unforced one', async () => {
    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetchCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true, json: async () => backendDevSessionResponse() };
      }),
    );

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    const [forced, unforced] = await Promise.all([
      ensureDevBackendSession({ force: true }),
      ensureDevBackendSession(),
    ]);

    expect(fetchCallCount).toBe(1);
    expect(forced.token).toBe('header.payload.signature');
    expect(unforced.token).toBe('header.payload.signature');
  });

  it('joins an in-progress UNFORCED fetch instead of starting a separate forced one (HEAL-347.46)', async () => {
    // Regression for the reverse ordering of the case above: UserContext.tsx's
    // ambient bootstrap effect calls ensureDevBackendSession() (unforced) on
    // every mount, including the /login page itself, before the user has
    // done anything. If the user then clicks "Bypass sign-in"
    // (AuthPage.tsx's handleDevBypass, which always calls
    // ensureDevBackendSession({ force: true })) while that ambient fetch is
    // still in flight, the old code only ever checked
    // `inFlightForcedSession` on the forced path -- finding it null (only
    // `inFlightDevSession` was set, by the unforced caller), it started a
    // SECOND, fully independent POST /api/auth/dev-session rather than
    // joining the one already running. Live-observed as 2-3 concurrent
    // dev-session POSTs surviving HEAL-347.42's fix, which in turn kept
    // triggering the backend's known DB-pool exhaustion under concurrent
    // load on this route (see resolveDevBackendSession's HEAL-347.27
    // comment) -- confirmed live: the backend went completely unresponsive
    // to health checks after a run of dev-bypass login attempts.
    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetchCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true, json: async () => backendDevSessionResponse() };
      }),
    );

    const { ensureDevBackendSession } = await import('./devBackendAuth');
    const unforcedPromise = ensureDevBackendSession();
    const forcedPromise = ensureDevBackendSession({ force: true });
    const [unforced, forced] = await Promise.all([unforcedPromise, forcedPromise]);

    expect(fetchCallCount).toBe(1);
    expect(unforced.token).toBe('header.payload.signature');
    expect(forced.token).toBe('header.payload.signature');
  });
});
