import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  PILOT_EXTENSION_ROUTE_REDIRECTS,
  resolvePilotExtensionRedirect,
} from './pilotExtensionRouteGuard';

describe('pilotExtensionRouteGuard', () => {
  it('defines guarded extension prefixes', () => {
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.length).toBeGreaterThan(10);
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.map((entry) => entry.prefix)).toContain('/fleet');
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.map((entry) => entry.prefix)).toContain('/cosmos');
  });

  it('redirects extension routes during pilot cleanup', () => {
    expect(resolvePilotExtensionRedirect('/fleet/command')).toBe(CANONICAL_ROUTES.emergencyEms);
    expect(resolvePilotExtensionRedirect('/cosmos')).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(resolvePilotExtensionRedirect('/workspace')).toBe(CANONICAL_ROUTES.emergencySettings);
    expect(resolvePilotExtensionRedirect('/emergency/intake')).toBe(
      CANONICAL_ROUTES.emergencyReception,
    );
    expect(resolvePilotExtensionRedirect('/tools/catalog')).toBe(CANONICAL_ROUTES.emergencyTools);
  });

  it('keeps core emergency routes reachable in pilot', () => {
    expect(resolvePilotExtensionRedirect('/emergency/whiteboard')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/patients')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/reception')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/copilot')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/analytics')).toBeNull();
  });
});