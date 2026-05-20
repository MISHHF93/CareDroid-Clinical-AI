/**
 * Exposure policy for every backend HTTP route without a frontend inventory call.
 * Strategies: backend-only | expose-recommended | deferred
 *
 * @see docs/orphaned-backend-functions.md
 */

import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { findBackendRoute } from './backendHttpRouteInventory';

/** @typedef {'backend-only'|'expose-recommended'|'deferred'} ExposureStrategy */

/**
 * @type {Readonly<Record<string, { strategy: ExposureStrategy, reason: string, clientHint?: string }>>}
 * Keys: `METHOD /path` (inventory path patterns)
 */
export const BACKEND_ROUTE_EXPOSURE_POLICY = Object.freeze({
  'GET /health': { strategy: 'backend-only', reason: 'Ops / load balancer probe' },
  'GET /api/auth/verify-email': { strategy: 'backend-only', reason: 'Email link callback' },
  'GET /api/auth/google': { strategy: 'backend-only', reason: 'OAuth redirect' },
  'GET /api/auth/google/callback': { strategy: 'backend-only', reason: 'OAuth callback' },
  'GET /api/auth/linkedin': { strategy: 'backend-only', reason: 'OAuth redirect' },
  'GET /api/auth/linkedin/callback': { strategy: 'backend-only', reason: 'OAuth callback' },
  'GET /api/auth/oidc': { strategy: 'deferred', reason: 'SSO placeholder' },
  'GET /api/auth/saml': { strategy: 'deferred', reason: 'SSO placeholder' },
  'GET /api/auth/me': { strategy: 'deferred', reason: 'JWT introspection; SPA uses profile' },

  'DELETE /api/auth/biometric/disable/:deviceId': { strategy: 'expose-recommended', reason: 'Device management', clientHint: 'BiometricSetup.jsx' },
  'DELETE /api/auth/biometric/delete/:deviceId': { strategy: 'expose-recommended', reason: 'Device management', clientHint: 'BiometricSetup.jsx' },
  'GET /api/auth/biometric/available': { strategy: 'expose-recommended', reason: 'Capability probe', clientHint: 'BiometricSetup.jsx' },

  'PATCH /api/users/profile': { strategy: 'expose-recommended', reason: 'Profile edit', clientHint: 'UserContext.jsx' },
  'POST /api/two-factor/verify': { strategy: 'backend-only', reason: 'Used during login challenge' },

  'GET /api/subscriptions/config': { strategy: 'deferred', reason: 'Stripe config for checkout UI' },
  'POST /api/subscriptions/create-checkout': { strategy: 'expose-recommended', reason: 'Billing', clientHint: 'configService / settings' },
  'POST /api/subscriptions/portal': { strategy: 'expose-recommended', reason: 'Billing portal', clientHint: 'configService / settings' },
  'POST /api/subscriptions/webhook': { strategy: 'backend-only', reason: 'Stripe webhook' },

  'POST /api/chat/message-3d': { strategy: 'deferred', reason: '3D avatar experiment' },
  'POST /api/chat/suggest-action': { strategy: 'expose-recommended', reason: 'Dashboard next-step', clientHint: 'clinicalChatService.js' },
  'POST /api/chat/analyze-vitals': { strategy: 'expose-recommended', reason: 'Vitals widgets', clientHint: 'clinicalChatService.js' },

  'GET /api/tools/statistics': { strategy: 'expose-recommended', reason: 'Usage analytics', clientHint: 'clinicalToolsApi.js' },
  'GET /api/tools/catalog/executors': { strategy: 'expose-recommended', reason: 'Catalog executor panel', clientHint: 'clinicalToolsApi.js' },
  'GET /api/tools/:id': { strategy: 'expose-recommended', reason: 'Tool metadata / schema', clientHint: 'clinicalToolsApi.js' },
  'POST /api/tools/:id/validate': { strategy: 'expose-recommended', reason: 'Pre-execute validation', clientHint: 'clinicalOrchestratorApi.js' },
  'POST /api/tools/execute': { strategy: 'deferred', reason: 'Batch execute; UI uses per-id execute' },

  'GET /api/drugs/categories': { strategy: 'expose-recommended', reason: 'Drug reference', clientHint: 'clinicalContentApi.js' },
  'GET /api/drugs/:id': { strategy: 'expose-recommended', reason: 'Drug detail', clientHint: 'clinicalContentApi.js' },
  'POST /api/drugs': { strategy: 'deferred', reason: 'Admin content API' },
  'PUT /api/drugs/:id': { strategy: 'deferred', reason: 'Admin content API' },
  'DELETE /api/drugs/:id': { strategy: 'deferred', reason: 'Admin content API' },

  'GET /api/protocols/:id': { strategy: 'expose-recommended', reason: 'Protocol detail', clientHint: 'Protocols.jsx' },
  'POST /api/protocols': { strategy: 'deferred', reason: 'Admin content API' },
  'PUT /api/protocols/:id': { strategy: 'deferred', reason: 'Admin content API' },
  'DELETE /api/protocols/:id': { strategy: 'deferred', reason: 'Admin content API' },

  'GET /api/audit/my-logs': { strategy: 'expose-recommended', reason: 'User activity', clientHint: 'profile / AuditLogs.jsx' },
  'GET /api/audit/phi-access': { strategy: 'deferred', reason: 'Compliance officer view' },

  'POST /api/compliance/export': { strategy: 'expose-recommended', reason: 'GDPR export', clientHint: 'complianceApi.js' },
  'DELETE /api/compliance/delete-account': { strategy: 'expose-recommended', reason: 'Account deletion', clientHint: 'complianceApi.js' },

  'GET /api/notifications/devices': { strategy: 'deferred', reason: 'Device list admin' },
  'DELETE /api/notifications/devices/:token': { strategy: 'deferred', reason: 'Unregister device' },
  'POST /api/notifications/preferences/toggle-all': { strategy: 'expose-recommended', reason: 'Settings UX', clientHint: 'NotificationService.js' },
  'GET /api/notifications/unread/count': { strategy: 'expose-recommended', reason: 'Badge count', clientHint: 'NotificationService.js' },
  'POST /api/notifications/read-all': { strategy: 'expose-recommended', reason: 'Inbox UX', clientHint: 'NotificationService.js' },

  'POST /api/health': { strategy: 'backend-only', reason: 'Client health ping (distinct from GET /health)' },

  'POST /api/ai/query': { strategy: 'backend-only', reason: 'Invoked via chat pipeline' },
  'POST /api/ai/structured': { strategy: 'backend-only', reason: 'Invoked via chat pipeline' },
  'GET /api/ai/usage': { strategy: 'deferred', reason: 'Usage meter UI' },

  'GET /api/metrics': { strategy: 'backend-only', reason: 'Prometheus scrape' },
});

export function routePolicyKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Backend routes with no matching wired frontend inventory entry.
 */
export function getBackendOnlyRoutes() {
  const wiredPaths = new Set(
    FRONTEND_API_CALLS.filter((c) => findBackendRoute(c.method, c.path)).map(
      (c) => routePolicyKey(c.method, findBackendRoute(c.method, c.path).path)
    )
  );

  return BACKEND_HTTP_ROUTES.filter((r) => !wiredPaths.has(routePolicyKey(r.method, r.path)));
}

export function getBackendRouteExposureGaps() {
  const backendOnly = getBackendOnlyRoutes();
  const gaps = [];

  for (const route of backendOnly) {
    const key = routePolicyKey(route.method, route.path);
    const policy = BACKEND_ROUTE_EXPOSURE_POLICY[key];
    if (!policy) {
      gaps.push({ key, issue: 'missing-policy', route });
    }
  }

  for (const key of Object.keys(BACKEND_ROUTE_EXPOSURE_POLICY)) {
    const [method, ...pathParts] = key.split(' ');
    const path = pathParts.join(' ');
    const inInventory = BACKEND_HTTP_ROUTES.some(
      (r) => r.method === method && r.path === path
    );
    if (!inInventory) {
      gaps.push({ key, issue: 'stale-policy' });
    }
  }

  return gaps;
}

/**
 * Frontend inventory calls that are gated (no backend) — implement or keep gated.
 */
export function getFrontendGatedCalls() {
  return FRONTEND_API_CALLS.filter((c) => !findBackendRoute(c.method, c.path));
}
