import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import {
  resolveRoleHomeNavItemId,
  resolveRoleLandingRoute,
  resolveRoleLandingScreenMode,
  ROLE_LANDING_ROUTE_EXPECTATIONS,
} from './emergencyRoleNavigationModel';

describe('emergencyRoleNavigationModel', () => {
  it('lands each operational role on the expected screen surface', () => {
    expect(resolveRoleLandingRoute({ role: EMERGENCY_ROLE_ID.registrationClerk })).toBe(
      CANONICAL_ROUTES.emergencyReception,
    );
    expect(resolveRoleLandingRoute({ role: EMERGENCY_ROLE_ID.triageNurse })).toContain(
      'queue=pretriage',
    );
    expect(resolveRoleLandingRoute({ role: EMERGENCY_ROLE_ID.chargeNurse })).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
    expect(resolveRoleLandingRoute({ role: EMERGENCY_ROLE_ID.physician })).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
  });

  it('lands wall displays on query-param whiteboard surfaces', () => {
    expect(resolveRoleLandingRoute({ role: 'public display' })).toContain('display=waiting-room');
    expect(resolveRoleLandingRoute({ role: EMERGENCY_ROLE_ID.readOnlyViewer })).toContain(
      'display=readonly',
    );
    expect(
      resolveRoleLandingRoute({
        role: EMERGENCY_ROLE_ID.readOnlyViewer,
        emergencySettings: { readOnlyDisplayMode: true },
      }),
    ).toContain('display=readonly');
  });

  it('respects explicit display query params', () => {
    expect(
      resolveRoleLandingScreenMode({
        role: EMERGENCY_ROLE_ID.chargeNurse,
        displayParam: 'waiting-room',
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.publicWaiting);
    expect(
      resolveRoleLandingRoute({
        role: EMERGENCY_ROLE_ID.chargeNurse,
        displayParam: 'readonly',
      }),
    ).toContain('display=readonly');
  });

  it('maps landing screen modes to primary nav anchors', () => {
    expect(resolveRoleHomeNavItemId({ role: EMERGENCY_ROLE_ID.registrationClerk })).toBe(
      'reception',
    );
    expect(resolveRoleHomeNavItemId({ role: EMERGENCY_ROLE_ID.triageNurse })).toBe('queues');
    expect(resolveRoleHomeNavItemId({ role: EMERGENCY_ROLE_ID.chargeNurse })).toBe('whiteboard');
    expect(resolveRoleHomeNavItemId({ role: 'public display' })).toBe('whiteboard');
  });

  it('documents canonical landing expectations', () => {
    for (const [roleKey, expectation] of Object.entries(ROLE_LANDING_ROUTE_EXPECTATIONS)) {
      const route = resolveRoleLandingRoute({
        role: roleKey === 'publicDisplay' ? 'public display' : roleKey,
      });
      expect(route).toContain(expectation.routeIncludes);
      expect(
        resolveRoleLandingScreenMode({
          role: roleKey === 'publicDisplay' ? 'public display' : roleKey,
        }),
      ).toBe(expectation.screenMode);
    }
  });
});
