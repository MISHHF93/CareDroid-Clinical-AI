import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  navigateProfileAware,
  navigateWithProfileAccess,
  resolveProfileAwareDestination,
  resolveProfileRouteLaunchAccess,
} from './profileRouteLaunch';

describe('profileRouteLaunch', () => {
  it('allows registration clerk to access reception but not whiteboard', () => {
    const reception = resolveProfileRouteLaunchAccess(CANONICAL_ROUTES.emergencyReception, {
      saasRole: 'registration-clerk',
    });
    const whiteboard = resolveProfileRouteLaunchAccess(CANONICAL_ROUTES.emergencyWhiteboard, {
      saasRole: 'registration-clerk',
    });
    expect(reception.allowed).toBe(true);
    expect(whiteboard.allowed).toBe(false);
    expect(whiteboard.reason).toBe('profile-route-denied');
  });

  it('redirects denied launches through navigateWithProfileAccess', () => {
    const calls = [];
    const navigate = (to) => calls.push(to);
    const result = navigateWithProfileAccess(navigate, CANONICAL_ROUTES.emergencyWhiteboard, {
      saasRole: 'registration-clerk',
    });
    expect(result.allowed).toBe(false);
    expect(calls[0]?.pathname || calls[0]).toContain('/emergency/reception');
  });

  it('combines emergency role guard with profile bottleneck in navigateProfileAware', () => {
    const calls = [];
    const navigate = (to) => calls.push(to);
    const emergencyRole = {
      canAccessRoute: (path) => path !== CANONICAL_ROUTES.emergencyWhiteboard,
      nearestRoute: () => CANONICAL_ROUTES.emergencyReception,
    };
    navigateProfileAware(navigate, CANONICAL_ROUTES.emergencyWhiteboard, {
      saasRole: 'registration-clerk',
      emergencyRole,
    });
    expect(calls[0]?.pathname || calls[0]).toContain('/emergency/reception');
  });

  it('resolveProfileAwareDestination returns profile home when route denied', () => {
    const resolved = resolveProfileAwareDestination(CANONICAL_ROUTES.emergencyWhiteboard, {
      saasRole: 'registration-clerk',
    });
    expect(resolved.allowed).toBe(false);
    expect(resolved.destination).toContain('/emergency/reception');
  });
});
