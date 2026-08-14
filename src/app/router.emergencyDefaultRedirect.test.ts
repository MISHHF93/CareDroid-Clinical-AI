import { describe, expect, it } from 'vitest';
import { resolveEmergencyDefaultRedirectDestination } from './router';
import { CANONICAL_ROUTES } from '../config/routes.config';

// HEAL-207: RECEPTION_FIRST_UX used to send every fresh session to
// /emergency/reception unconditionally, including roles whose own
// permission model (EMERGENCY_ROLE_DEFINITIONS) excludes Reception
// entirely -- e.g. it_admin, whose routes are [settings, integrations,
// audit, adminOperations, collaboration, help] and whose description is
// explicitly "no patient clinical data". Confirmed live: an it_admin
// session landed on and rendered /emergency/reception with no correction.

describe('resolveEmergencyDefaultRedirectDestination (HEAL-207)', () => {
  it('honors the reception-first default for a role that can access Reception', () => {
    const destination = resolveEmergencyDefaultRedirectDestination({
      receptionFirstDestination: CANONICAL_ROUTES.emergencyReception,
      canAccessReception: true,
      landingRoute: CANONICAL_ROUTES.emergencySettings, // should NOT be used
    });
    expect(destination).toBe(CANONICAL_ROUTES.emergencyReception);
  });

  it('falls through to the role landing route when the role cannot access Reception (it_admin)', () => {
    const destination = resolveEmergencyDefaultRedirectDestination({
      receptionFirstDestination: CANONICAL_ROUTES.emergencyReception,
      canAccessReception: false,
      landingRoute: CANONICAL_ROUTES.emergencySettings,
    });
    expect(destination).toBe(CANONICAL_ROUTES.emergencySettings);
  });

  it('always honors an explicit non-Reception returnUrl destination regardless of Reception access', () => {
    const destination = resolveEmergencyDefaultRedirectDestination({
      receptionFirstDestination: '/emergency/whiteboard',
      canAccessReception: false,
      landingRoute: CANONICAL_ROUTES.emergencySettings,
    });
    expect(destination).toBe('/emergency/whiteboard');
  });

  it('falls through defaultRoute -> demoDefaultLandingRoute -> edApplicationHomeRoute in order when landingRoute is missing', () => {
    expect(
      resolveEmergencyDefaultRedirectDestination({
        receptionFirstDestination: CANONICAL_ROUTES.emergencyReception,
        canAccessReception: false,
        landingRoute: null,
        defaultRoute: '/emergency/analytics',
      }),
    ).toBe('/emergency/analytics');

    expect(
      resolveEmergencyDefaultRedirectDestination({
        receptionFirstDestination: CANONICAL_ROUTES.emergencyReception,
        canAccessReception: false,
        landingRoute: null,
        defaultRoute: null,
        demoDefaultLandingRoute: '/emergency/audit',
      }),
    ).toBe('/emergency/audit');

    expect(
      resolveEmergencyDefaultRedirectDestination({
        receptionFirstDestination: CANONICAL_ROUTES.emergencyReception,
        canAccessReception: false,
        landingRoute: null,
        defaultRoute: null,
        demoDefaultLandingRoute: null,
        edApplicationHomeRoute: '/emergency/help',
      }),
    ).toBe('/emergency/help');
  });
});
