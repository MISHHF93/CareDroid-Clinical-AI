import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  PILOT_EXTENSION_ROUTE_REDIRECTS,
  resolvePilotExtensionRedirect,
} from './pilotExtensionRouteGuard';

describe('pilotExtensionRouteGuard', () => {
  it('defines guarded extension prefixes', () => {
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.length).toBeGreaterThan(5);
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.map((entry) => entry.prefix)).toContain('/cosmos');
    expect(PILOT_EXTENSION_ROUTE_REDIRECTS.map((entry) => entry.prefix)).not.toContain('/fleet');
  });

  it('redirects retired extension routes during pilot cleanup', () => {
    expect(resolvePilotExtensionRedirect('/fleet/command')).toBeNull();
    expect(resolvePilotExtensionRedirect('/cosmos')).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(resolvePilotExtensionRedirect('/workspace')).toBeNull();
    expect(resolvePilotExtensionRedirect('/tools/catalog')).toBeNull();
  });

  it('keeps core emergency routes reachable in pilot', () => {
    expect(resolvePilotExtensionRedirect('/emergency/whiteboard')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/patients')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/reception')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/copilot')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/analytics')).toBeNull();
    expect(resolvePilotExtensionRedirect('/emergency/command-center')).toBeNull();
    expect(resolvePilotExtensionRedirect('/executive')).toBeNull();
    expect(resolvePilotExtensionRedirect('/ai-command-center')).toBeNull();
    expect(resolvePilotExtensionRedirect('/predictive-analytics')).toBeNull();
    // /emergency/intake is a core ED route (SmartIntake page), not an extension redirect
    expect(resolvePilotExtensionRedirect('/emergency/intake')).toBeNull();
  });
});
