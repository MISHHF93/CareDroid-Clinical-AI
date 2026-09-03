import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  applyDemoRoleView,
  buildOpenAccessDemoUser,
  CURATED_DEMO_ROLE_VIEWS,
  DEMO_PERSONA,
  enrichDemoIdentityFallback,
  hydrateStoredDemoUser,
  isDemoPersonaUser,
  resolveDemoDefaultLandingRoute,
  resolveDemoRoleLandingRoute,
} from './demoPersonaModel';

describe('demoPersonaModel', () => {
  it('profiles Dr. Cara George as ED 18 clinical director', () => {
    const user = buildOpenAccessDemoUser();
    expect(user.fullName).toBe('Dr. Cara George');
    expect(user.role).toBe(EMERGENCY_ROLE_IDS.chargeNurse);
    expect((user.profile as { department?: string }).department).toBe('Emergency Department 18');
    expect((user.profile as { title?: string }).title).toBe('ED Clinical Director');
  });

  it('keeps persona identity when switching demo role views', () => {
    const switched = applyDemoRoleView(
      buildOpenAccessDemoUser(),
      EMERGENCY_ROLE_IDS.registrationClerk,
    );
    expect(switched.fullName).toBe('Dr. Cara George');
    expect(switched.role).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
    expect((switched.profile as { roleProfileId?: string }).roleProfileId).toBe(
      EMERGENCY_ROLE_IDS.registrationClerk,
    );
  });

  it('hydrates legacy open-access storage into the Cara persona', () => {
    const legacy = {
      id: 'open-access-user',
      authMode: 'open-access',
      name: 'CareDroid Reception',
      role: EMERGENCY_ROLE_IDS.triageNurse,
    };
    const hydrated = hydrateStoredDemoUser(legacy);
    expect(hydrated.fullName).toBe('Dr. Cara George');
    expect(hydrated.role).toBe(EMERGENCY_ROLE_IDS.triageNurse);
  });

  it('passes a real, backend-authenticated user through unchanged instead of discarding it as open-access (HEAL-347.12)', () => {
    // Before this fix, hydrateStoredDemoUser() unconditionally replaced anything
    // that failed isDemoPersonaUser() with buildOpenAccessDemoUser() -- meaning a
    // real logged-in user's stored profile was silently overwritten by the
    // anonymous demo identity on every single read of localStorage.
    const realUser = {
      id: 'a1b2c3d4-real-uuid',
      email: 'nurse@hospital.org',
      role: 'nurse',
      authMode: 'real',
    };
    const hydrated = hydrateStoredDemoUser(realUser);
    expect(hydrated).toBe(realUser);
    expect(hydrated.id).toBe('a1b2c3d4-real-uuid');
    expect(hydrated.fullName).not.toBe('Dr. Cara George');
  });

  it('passes a dev-session bypass identity through unchanged across a reload instead of downgrading it to the generic open-access persona (HEAL-347.14)', () => {
    // Pre-existing gap, independent of HEAL-347.12: devBackendAuth.ts's
    // persistDevSession() has always stamped authMode: 'local-dev-demo' on a
    // real backend dev-session user, but isDemoPersonaUser() never recognized
    // that marker (only 'open-access'/'platform-access') -- so the identity
    // was silently discarded back to Dr. Cara George on the very next read.
    const devSessionUser = {
      id: 'dev-user-uuid',
      email: 'dev@caredroid.local',
      role: 'physician',
      authMode: 'local-dev-demo',
      isDevAuthBypass: true,
    };
    const hydrated = hydrateStoredDemoUser(devSessionUser);
    expect(hydrated).toBe(devSessionUser);
    expect(hydrated.id).toBe('dev-user-uuid');
  });

  it('passes an explicit-dev-bypass identity through unchanged across a reload (HEAL-347.16)', () => {
    // AuthPage.tsx's "Bypass sign-in" button stamps this distinct marker
    // (not 'local-dev-demo', which the app's own ambient background
    // bootstrap ALSO sets on every dev-mode page load regardless of user
    // intent -- trusting that value for the gate's dev-bypass exception
    // would make it pass for every dev-mode visitor within seconds).
    const bypassUser = {
      id: 'dev-user-uuid',
      email: 'dev@caredroid.local',
      role: 'physician',
      authMode: 'explicit-dev-bypass',
      isDevAuthBypass: true,
    };
    const hydrated = hydrateStoredDemoUser(bypassUser);
    expect(hydrated).toBe(bypassUser);
    expect(hydrated.id).toBe('dev-user-uuid');
  });

  it('resolves landing routes for curated demo roles', () => {
    expect(resolveDemoDefaultLandingRoute()).toBeTruthy();
    expect(resolveDemoRoleLandingRoute(EMERGENCY_ROLE_IDS.registrationClerk)).toContain(
      CANONICAL_ROUTES.emergencyReception,
    );
  });

  it('detects demo persona users', () => {
    expect(isDemoPersonaUser(buildOpenAccessDemoUser())).toBe(true);
    expect(isDemoPersonaUser({ id: 'user-1', role: 'physician' })).toBe(false);
  });

  it('masks a raw backend-fetched profile back onto the Cara persona for demo sessions', () => {
    // Regression for the identity flip found live: GET /api/profile/me returns the real
    // dev-bypass DB account's own name ("Dev Clinician"), unaware of the frontend's demo
    // persona convention. Any profile merged into a demo-persona session must still mask
    // back to the curated identity, or the clinician name silently disagrees depending on
    // whether the async backend fetch has resolved yet.
    const demoUser = hydrateStoredDemoUser({ id: 'open-access-user', authMode: 'open-access' });
    const rawBackendProfile = {
      saasProfile: { displayName: 'Dev Clinician', email: 'dev@caredroid.local' },
      account: {
        displayName: 'Dev Clinician',
        email: 'dev@caredroid.local',
        role: 'physician',
        verified: true,
      },
    };
    const masked = enrichDemoIdentityFallback(demoUser, rawBackendProfile);
    expect((masked.saasProfile as { displayName?: string }).displayName).toBe('Dr. Cara George');
    expect((masked.account as { displayName?: string }).displayName).toBe('Dr. Cara George');
  });

  it('masks a raw backend-fetched profile back onto the Cara persona for an explicit-dev-bypass session too (HEAL-347.41)', () => {
    // Regression for the identity flip found live via the /start profile-role-switcher:
    // an 'explicit-dev-bypass' session (the actual session type "Bypass sign-in" +
    // the demo role-switcher chips produce) isn't isDemoPersonaUser(), so this masking
    // never applied to it -- UserIdentityContext's async GET /api/profile/me fetch
    // could then overwrite a freshly-switched persona/role with the raw backend
    // dev-session account's own name ("Dev Clinician") and role once it resolved,
    // ~1-2s after the switch, with no user action.
    const devBypassUser = {
      id: 'dev-user-uuid',
      email: 'dev@caredroid.local',
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      authMode: 'explicit-dev-bypass',
      isDevAuthBypass: true,
      // switchDemoRole() sets profile.saasRole directly on `user` as part of the
      // same synchronous update that changes `role` -- this is what should win.
      profile: {
        roleProfileId: EMERGENCY_ROLE_IDS.registrationClerk,
        saasRole: 'registration-clerk',
      },
    };
    // Simulates operationalProfile: a stale snapshot fetched BEFORE the switch,
    // still reflecting the backend dev-session account's original role/name.
    const staleOperationalProfile = {
      saasProfile: { displayName: 'Dev Clinician', role: 'emergency-physician' },
      account: { displayName: 'Dev Clinician', role: 'physician' },
    };
    const masked = enrichDemoIdentityFallback(devBypassUser, staleOperationalProfile);
    expect((masked.saasProfile as { displayName?: string }).displayName).toBe('Dr. Cara George');
    expect((masked.account as { displayName?: string }).displayName).toBe('Dr. Cara George');
    // The role must reflect the freshly-switched registration_clerk view, not the
    // stale emergency-physician role still sitting in operationalProfile.saasProfile.
    expect((masked.saasProfile as { role?: string }).role).toBe('registration-clerk');
    expect((masked.account as { role?: string }).role).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
  });

  it('keeps saasProfile.role in sync with the switched ED role view (HEAL-195)', () => {
    // Regression: saasProfile.role was hardcoded to DEMO_PERSONA.saasRole ('emergency-physician')
    // for every demo session regardless of which of the 8 ED role views was switched to, while
    // account.role (computed 2 lines below, in the same function) correctly tracked it -- so
    // useEffectiveUserProfile()'s profileCopy/accessSummary/personaTitle stayed frozen to
    // "physician" everywhere, producing visibly self-contradicting profile labels (e.g. Profile.tsx
    // showing "ED physician..." next to a "Reception job profile" card for the same session).
    const demoUser = hydrateStoredDemoUser({
      id: 'open-access-user',
      authMode: 'open-access',
      role: EMERGENCY_ROLE_IDS.registrationClerk,
    });
    const fallback = {
      saasProfile: { role: 'registration-clerk' },
      account: {},
    };

    const enriched = enrichDemoIdentityFallback(demoUser, fallback);

    expect((enriched.saasProfile as { role?: string }).role).toBe('registration-clerk');
    expect((enriched.account as { role?: string }).role).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
  });

  it('prefers the role the session itself declares over the shared singleton dev account persisted persona', () => {
    // Found live 2026-09-03 on all four TrackMind pages. POST /api/auth/dev-session
    // signs every developer, agent and Playwright probe into ONE backend user, and a
    // persona switch persists that user's roleProfileId (auth.service.ts,
    // createDevSession) -- so GET /api/profile/me reports whatever anyone switched
    // to last. This session declares executive-leadership with no `profile` block
    // (the shape scripts/contrast-audit.mjs seeds); the shared record says
    // registration-clerk. The page rendered, then flipped to ACCESS DENIED as
    // "registration-clerk" the moment the fetch resolved.
    const seededSession = {
      id: 'probe',
      email: 'audit@caredroid.local',
      role: 'executive-leadership',
      authMode: 'explicit-dev-bypass',
      isDevAuthBypass: true,
    };
    const sharedDevAccountSnapshot = {
      saasProfile: { displayName: 'Dev Clinician', role: 'registration-clerk' },
      account: { displayName: 'Dev Clinician', role: 'nurse', saasRole: 'registration-clerk' },
    };

    const merged = enrichDemoIdentityFallback(seededSession, sharedDevAccountSnapshot);

    expect((merged.saasProfile as { role?: string }).role).toBe('executive-leadership');
    expect((merged.account as { role?: string }).role).toBe('executive-leadership');
  });

  it('keeps the fallback role string when the session declares the same role in emergency-id form', () => {
    // registration_clerk (EMERGENCY_ROLE_IDS) and registration-clerk (SaaS) are one
    // role -- agreement must not rewrite the value buildFallbackProfile handed over.
    const demoUser = hydrateStoredDemoUser({
      id: 'open-access-user',
      authMode: 'open-access',
      role: EMERGENCY_ROLE_IDS.registrationClerk,
    });
    const merged = enrichDemoIdentityFallback(demoUser, {
      saasProfile: { role: 'registration-clerk' },
      account: {},
    });
    expect((merged.saasProfile as { role?: string }).role).toBe('registration-clerk');
  });

  it('never lets an unrecognised local role string downgrade a real fallback role', () => {
    const oddSession = { id: 'x', authMode: 'explicit-dev-bypass', role: 'not-a-role' };
    const merged = enrichDemoIdentityFallback(oddSession, {
      saasProfile: { role: 'hospital-administrator' },
      account: {},
    });
    expect((merged.saasProfile as { role?: string }).role).toBe('hospital-administrator');
  });

  it('falls back to the persona default saasRole when the caller has no role of its own yet', () => {
    // Un-hydrated on purpose: hydrateStoredDemoUser() assigns the persona's default
    // emergency role, and since 2026-09-03 user.role IS a role signal here.
    const demoUser = { id: 'open-access-user', authMode: 'open-access' };
    const fallback = { saasProfile: {}, account: {} };

    const enriched = enrichDemoIdentityFallback(demoUser, fallback);

    expect((enriched.saasProfile as { role?: string }).role).toBe(DEMO_PERSONA.saasRole);
  });

  it('still masks displayName/specialty/department to the static persona identity regardless of role', () => {
    const demoUser = hydrateStoredDemoUser({
      id: 'open-access-user',
      authMode: 'open-access',
      role: EMERGENCY_ROLE_IDS.registrationClerk,
    });
    const fallback = {
      saasProfile: { role: 'registration-clerk', specialty: 'Reception' },
      account: {},
    };

    const enriched = enrichDemoIdentityFallback(demoUser, fallback);

    expect((enriched.saasProfile as { displayName?: string }).displayName).toBe('Dr. Cara George');
    expect((enriched.saasProfile as { specialty?: string }).specialty).toBe(DEMO_PERSONA.specialty);
    expect((enriched.saasProfile as { department?: string }).department).toBe(
      DEMO_PERSONA.department,
    );
  });

  it('leaves a real, non-demo user profile untouched', () => {
    const realUser = { id: 'user-1', role: 'physician' };
    const realProfile = {
      saasProfile: { displayName: 'Dr. Real Clinician' },
      account: { displayName: 'Dr. Real Clinician' },
    };
    expect(enrichDemoIdentityFallback(realUser, realProfile)).toBe(realProfile);
  });

  it('curates frontline ED role views for the demo switcher', () => {
    expect(CURATED_DEMO_ROLE_VIEWS.length).toBeGreaterThanOrEqual(8);
    expect(
      CURATED_DEMO_ROLE_VIEWS.some(
        (view) => view.emergencyRoleId === DEMO_PERSONA.defaultEmergencyRole,
      ),
    ).toBe(true);
  });
});
