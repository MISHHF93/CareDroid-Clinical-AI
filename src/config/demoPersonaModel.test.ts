import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  applyDemoRoleView,
  buildOpenAccessDemoUser,
  CURATED_DEMO_ROLE_VIEWS,
  DEMO_PERSONA,
  hydrateStoredDemoUser,
  isDemoPersonaUser,
  resolveDemoDefaultLandingRoute,
  resolveDemoRoleLandingRoute,
} from './demoPersonaModel';

describe('demoPersonaModel', () => {
  it('profiles Dr. Cara George as ED 18 clinical director', () => {
    const user = buildOpenAccessDemoUser();
    expect(user.fullName).toBe('Dr. Cara George');
    expect(user.role).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
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

  it('curates frontline ED role views for the demo switcher', () => {
    expect(CURATED_DEMO_ROLE_VIEWS.length).toBeGreaterThanOrEqual(8);
    expect(CURATED_DEMO_ROLE_VIEWS.some((view) => view.emergencyRoleId === DEMO_PERSONA.defaultEmergencyRole)).toBe(
      true,
    );
  });
});
