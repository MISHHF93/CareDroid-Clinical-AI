import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  getHomeRouteForRole,
  hasExplicitHomeRoute,
  HOSPITAL_ROLE_HOME_ROUTES,
} from './roleClusterNav.config';

describe('hasExplicitHomeRoute', () => {
  it('is true for every hospital role with a curated home route, matching getHomeRouteForRole', () => {
    for (const role of Object.keys(HOSPITAL_ROLE_HOME_ROUTES)) {
      expect(hasExplicitHomeRoute(role)).toBe(true);
      expect(getHomeRouteForRole(role)).toBe(HOSPITAL_ROLE_HOME_ROUTES[role]);
    }
  });

  it('is true for legacy emergency role IDs that alias to a curated hospital role', () => {
    expect(hasExplicitHomeRoute('triage_nurse')).toBe(true);
    expect(hasExplicitHomeRoute('physician')).toBe(true);
  });

  it('is false for a role absent from both the curated map and the legacy alias table', () => {
    // 'nurse' is a real top-level SaaS role string (see ED_WORKFLOW_LANES /
    // resolveEffectiveEmergencyRole) but is neither a hospital role ID nor a
    // legacy emergency role ID -- getHomeRouteForRole('nurse') only resolves
    // via its OWN generic ED-whiteboard fallback, not a curated entry.
    expect(hasExplicitHomeRoute('nurse')).toBe(false);
    expect(hasExplicitHomeRoute('totally-unknown-role')).toBe(false);
    expect(hasExplicitHomeRoute(null)).toBe(false);
    // getHomeRouteForRole still returns a usable route for these -- just not
    // one hasExplicitHomeRoute would call "curated".
    expect(getHomeRouteForRole('nurse')).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
  });
});
