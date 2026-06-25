import { CANONICAL_ROUTES } from '../config/routes.config';
import { isPractitionerCleanupEnabled } from '../config/practitionerCleanup.config';

/**
 * Extension/platform routes that remain reachable by URL but are hidden from pilot nav.
 * Longest-prefix wins — keep more specific paths above broader prefixes.
 */
export const PILOT_EXTENSION_ROUTE_REDIRECTS = Object.freeze([
  Object.freeze({
    prefix: '/integrations/hub',
    to: `${CANONICAL_ROUTES.emergencySettings}#integrations`,
  }),
  Object.freeze({ prefix: '/tools/catalog', to: CANONICAL_ROUTES.emergencyTools }),
  Object.freeze({ prefix: '/emergency/intake', to: CANONICAL_ROUTES.emergencyReception }),
  Object.freeze({ prefix: '/fleet', to: CANONICAL_ROUTES.emergencyEms }),
  Object.freeze({ prefix: '/vehicle', to: CANONICAL_ROUTES.emergencyEms }),
  Object.freeze({ prefix: '/surveillance', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/simulation', to: CANONICAL_ROUTES.emergencyWhiteboard }),
  Object.freeze({ prefix: '/cosmos', to: CANONICAL_ROUTES.emergencyWhiteboard }),
  Object.freeze({ prefix: '/workspaces', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/workspace', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/discover', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/executive', to: CANONICAL_ROUTES.emergencyAnalytics }),
  Object.freeze({ prefix: '/ai-command-center', to: CANONICAL_ROUTES.emergencyCopilot }),
  Object.freeze({ prefix: '/laboratory', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/knowledge-graph', to: CANONICAL_ROUTES.emergencyTools }),
  Object.freeze({ prefix: '/knowledge-hub', to: CANONICAL_ROUTES.emergencyTools }),
  Object.freeze({ prefix: '/knowledge-base', to: CANONICAL_ROUTES.emergencyTools }),
  Object.freeze({ prefix: '/digital-twin-intelligence', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/digital-twin', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/hospital-map', to: CANONICAL_ROUTES.emergencyWhiteboard }),
  Object.freeze({ prefix: '/medical-iot', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/devices', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/live-map', to: CANONICAL_ROUTES.emergencyEms }),
  Object.freeze({ prefix: '/operations-center', to: CANONICAL_ROUTES.emergencyAnalytics }),
  Object.freeze({ prefix: '/operations', to: CANONICAL_ROUTES.emergencyAnalytics }),
  Object.freeze({ prefix: '/platform-intelligence', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/platform-admin', to: CANONICAL_ROUTES.emergencySettings }),
  Object.freeze({ prefix: '/enterprise-platform', to: CANONICAL_ROUTES.emergencySettings }),
]);

export function resolvePilotExtensionRedirect(pathname = '') {
  if (!isPractitionerCleanupEnabled()) {
    return null;
  }

  const normalized = pathname.split('?')[0].split('#')[0];
  for (const entry of PILOT_EXTENSION_ROUTE_REDIRECTS) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return entry.to;
    }
  }

  return null;
}