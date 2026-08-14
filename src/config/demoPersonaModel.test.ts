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
    const switched = applyDemoRoleView(buildOpenAccessDemoUser(), EMERGENCY_ROLE_IDS.registrationClerk);
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
      account: { displayName: 'Dev Clinician', email: 'dev@caredroid.local', role: 'physician', verified: true },
    };
    const masked = enrichDemoIdentityFallback(demoUser, rawBackendProfile);
    expect((masked.saasProfile as { displayName?: string }).displayName).toBe('Dr. Cara George');
    expect((masked.account as { displayName?: string }).displayName).toBe('Dr. Cara George');
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

  it('falls back to the persona default saasRole when the caller has no role of its own yet', () => {
    const demoUser = hydrateStoredDemoUser({ id: 'open-access-user', authMode: 'open-access' });
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
    const fallback = { saasProfile: { role: 'registration-clerk', specialty: 'Reception' }, account: {} };

    const enriched = enrichDemoIdentityFallback(demoUser, fallback);

    expect((enriched.saasProfile as { displayName?: string }).displayName).toBe('Dr. Cara George');
    expect((enriched.saasProfile as { specialty?: string }).specialty).toBe(DEMO_PERSONA.specialty);
    expect((enriched.saasProfile as { department?: string }).department).toBe(DEMO_PERSONA.department);
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
    expect(CURATED_DEMO_ROLE_VIEWS.some((view) => view.emergencyRoleId === DEMO_PERSONA.defaultEmergencyRole)).toBe(
      true,
    );
  });
});
