/**
 * Exposure policy for every backend HTTP route without a frontend inventory call.
 * Strategies: backend-only | expose-recommended | deferred
 *
 * @see docs/orphaned-backend-functions.md
 */

import { BACKEND_HTTP_ROUTES, OPTIONAL_RUNTIME_BACKEND_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { findBackendRoute } from './backendHttpRouteInventory';

/** @typedef {'backend-only'|'expose-recommended'|'deferred'|'optional-runtime'} ExposureStrategy */

/**
 * @type {Readonly<Record<string, { strategy: ExposureStrategy, reason: string, clientHint?: string }>>}
 * Keys: `METHOD /path` (inventory path patterns)
 */
const BASE_BACKEND_ROUTE_EXPOSURE_POLICY = Object.freeze({
  'GET /health': { strategy: 'backend-only', reason: 'Ops / load balancer probe' },
  'GET /api/auth/verify-email': { strategy: 'backend-only', reason: 'Email link callback' },
  'GET /api/auth/google': { strategy: 'backend-only', reason: 'OAuth redirect' },
  'GET /api/auth/google/callback': { strategy: 'backend-only', reason: 'OAuth callback' },
  'GET /api/auth/linkedin': { strategy: 'backend-only', reason: 'OAuth redirect' },
  'GET /api/auth/linkedin/callback': { strategy: 'backend-only', reason: 'OAuth callback' },
  'GET /api/auth/oidc': { strategy: 'deferred', reason: 'SSO placeholder' },
  'GET /api/auth/saml': { strategy: 'deferred', reason: 'SSO placeholder' },
  'GET /api/auth/me': { strategy: 'deferred', reason: 'JWT introspection; SPA uses profile' },

  'DELETE /api/auth/biometric/disable/:deviceId': {
    strategy: 'expose-recommended',
    reason: 'Device management',
    clientHint: 'BiometricSetup.jsx',
  },
  'DELETE /api/auth/biometric/delete/:deviceId': {
    strategy: 'expose-recommended',
    reason: 'Device management',
    clientHint: 'BiometricSetup.jsx',
  },
  'GET /api/auth/biometric/available': {
    strategy: 'expose-recommended',
    reason: 'Capability probe',
    clientHint: 'BiometricSetup.jsx',
  },

  'PATCH /api/users/profile': {
    strategy: 'expose-recommended',
    reason: 'Profile edit',
    clientHint: 'UserContext.jsx',
  },
  'POST /api/two-factor/verify': {
    strategy: 'backend-only',
    reason: 'Used during login challenge',
  },

  'GET /api/workspaces/:workspaceId': {
    strategy: 'deferred',
    reason: 'Workspace detail route for future workspace settings',
  },
  'GET /api/workspaces/:workspaceId/members': {
    strategy: 'deferred',
    reason: 'Workspace member management surface pending',
  },
  'POST /api/workspaces/:workspaceId/invitations': {
    strategy: 'deferred',
    reason: 'Workspace invitation UX pending',
  },
  'GET /api/workspaces/:workspaceId/tools': {
    strategy: 'deferred',
    reason: 'Workspace tool preferences currently use aggregate settings',
  },
  'PATCH /api/workspaces/:workspaceId/tools': {
    strategy: 'deferred',
    reason: 'Workspace tool preference editor pending',
  },

  'GET /api/activity/me': { strategy: 'deferred', reason: 'Profile activity dashboard pending' },
  'GET /api/activity/me/summary': {
    strategy: 'deferred',
    reason: 'Profile activity summary pending',
  },
  'GET /api/activity/workspaces/:workspaceId': {
    strategy: 'deferred',
    reason: 'Workspace activity surface pending',
  },

  'GET /api/personalization/me/recommendations': {
    strategy: 'deferred',
    reason: 'Personalization recommendations UI pending',
  },
  'DELETE /api/personalization/me/saved-prompts/:promptId': {
    strategy: 'deferred',
    reason: 'Saved prompt deletion UI pending',
  },

  'GET /api/subscriptions/config': {
    strategy: 'deferred',
    reason: 'Stripe config for checkout UI',
  },
  'POST /api/subscriptions/create-checkout': {
    strategy: 'expose-recommended',
    reason: 'Billing',
    clientHint: 'configService / settings',
  },
  'POST /api/subscriptions/portal': {
    strategy: 'expose-recommended',
    reason: 'Billing portal',
    clientHint: 'configService / settings',
  },
  'POST /api/subscriptions/webhook': { strategy: 'backend-only', reason: 'Stripe webhook' },

  'POST /api/chat/message-3d': { strategy: 'deferred', reason: '3D avatar experiment' },
  'POST /api/chat/suggest-action': {
    strategy: 'expose-recommended',
    reason: 'Dashboard next-step',
    clientHint: 'clinicalChatService.js',
  },
  'POST /api/chat/analyze-vitals': {
    strategy: 'expose-recommended',
    reason: 'Vitals widgets',
    clientHint: 'clinicalChatService.js',
  },

  'POST /api/emergency/digital-twin/organizational/simulate': {
    strategy: 'deferred',
    reason: 'Research controller; active ED digital twin UI uses the core EmergencyOsController endpoints',
  },
  'POST /api/emergency/digital-twin/organizational/synchronize': {
    strategy: 'deferred',
    reason: 'Research controller; no dedicated SPA workflow yet',
  },
  'POST /api/ems/ai-call-interrogation': {
    strategy: 'deferred',
    reason: 'Research EMS call interrogation endpoint; not exposed in active ED shell',
  },
  'POST /api/ems/ai-call-interrogation/ecg': {
    strategy: 'deferred',
    reason: 'Research ECG interrogation endpoint; not exposed in active ED shell',
  },
  'POST /api/ems/federated/112-call': {
    strategy: 'deferred',
    reason: 'Research federated EMS endpoint; no frontend intake workflow is wired',
  },
  'POST /api/federated/lmecs/predict': {
    strategy: 'deferred',
    reason: 'Research severity-prediction endpoint; no SPA client is wired',
  },
  'POST /api/federated/lmecs/select': {
    strategy: 'deferred',
    reason: 'Research client-selection endpoint; no SPA client is wired',
  },
  'POST /api/handover/er-pulse': {
    strategy: 'deferred',
    reason: 'Research handover endpoint; active ED handoff UI is not mounted',
  },

  'GET /api/v1/governance/registry': {
    strategy: 'backend-only',
    reason: 'Compatibility alias; SPA uses canonical CareDroid governance route',
  },
  'GET /api/v1/governance/safety-rules': {
    strategy: 'backend-only',
    reason: 'Compatibility alias; SPA uses canonical CareDroid governance route',
  },
  'GET /api/v1/governance/compliance': {
    strategy: 'backend-only',
    reason: 'Compatibility alias; SPA uses canonical CareDroid governance route',
  },
  'GET /api/v1/governance/violations': {
    strategy: 'backend-only',
    reason: 'Compatibility alias; SPA uses canonical CareDroid governance route',
  },
  'GET /api/v1/governance/validate-prompts': {
    strategy: 'backend-only',
    reason: 'Compatibility alias; SPA uses canonical CareDroid governance route',
  },

  'GET /api/tools/statistics': {
    strategy: 'expose-recommended',
    reason: 'Usage analytics',
    clientHint: 'clinicalToolsApi.js',
  },
  'GET /api/tools/catalog/executors': {
    strategy: 'expose-recommended',
    reason: 'Catalog executor panel',
    clientHint: 'clinicalToolsApi.js',
  },
  'GET /api/tools/:id': {
    strategy: 'expose-recommended',
    reason: 'Tool metadata / schema',
    clientHint: 'clinicalToolsApi.js',
  },
  'POST /api/tools/:id/validate': {
    strategy: 'expose-recommended',
    reason: 'Pre-execute validation',
    clientHint: 'clinicalOrchestratorApi.js',
  },
  'POST /api/tools/execute': {
    strategy: 'deferred',
    reason: 'Batch execute; UI uses per-id execute',
  },

  'GET /api/memory/short': {
    strategy: 'deferred',
    reason: 'Memory dashboard uses aggregate route',
  },
  'GET /api/memory/long': { strategy: 'deferred', reason: 'Memory dashboard uses aggregate route' },
  'GET /api/memory/clinical': {
    strategy: 'deferred',
    reason: 'Memory dashboard uses aggregate route',
  },

  'POST /api/artifacts': {
    strategy: 'deferred',
    reason: 'Artifact authoring is not exposed in dashboard yet',
  },
  'GET /api/artifacts/:id': {
    strategy: 'deferred',
    reason: 'Artifact detail route is not linked yet',
  },
  'PATCH /api/artifacts/:id': {
    strategy: 'deferred',
    reason: 'Artifact editing is not exposed in dashboard yet',
  },

  'POST /api/tool-calling/execute': {
    strategy: 'deferred',
    reason: 'Chat delegates server-side; direct UI not exposed yet',
  },
  'GET /api/tool-calling/catalog': {
    strategy: 'deferred',
    reason: 'Internal tool-calling contract catalog',
  },
  'GET /api/tool-calling/resolve': {
    strategy: 'deferred',
    reason: 'Server-side catalog launch helper',
  },
  'GET /api/tool-calling/logs': { strategy: 'deferred', reason: 'Operational debugging endpoint' },

  'POST /api/cost-optimizer/route': {
    strategy: 'backend-only',
    reason:
      'Assistant lifecycle invokes route optimization server-side before model/tool execution',
  },

  'GET /api/evaluation/metrics': {
    strategy: 'deferred',
    reason:
      'Evaluation dashboard currently receives metric definitions from aggregate dashboard payload',
  },
  'GET /api/evaluation/runs': {
    strategy: 'deferred',
    reason: 'Evaluation dashboard currently reads recent runs from aggregate dashboard payload',
  },

  'GET /api/drugs/categories': {
    strategy: 'expose-recommended',
    reason: 'Drug reference',
    clientHint: 'clinicalContentApi.js',
  },
  'GET /api/drugs/:id': {
    strategy: 'expose-recommended',
    reason: 'Drug detail',
    clientHint: 'clinicalContentApi.js',
  },
  'POST /api/drugs': { strategy: 'deferred', reason: 'Admin content API' },
  'PUT /api/drugs/:id': { strategy: 'deferred', reason: 'Admin content API' },
  'DELETE /api/drugs/:id': { strategy: 'deferred', reason: 'Admin content API' },

  'GET /api/protocols/:id': {
    strategy: 'expose-recommended',
    reason: 'Protocol detail',
    clientHint: 'Protocols.jsx',
  },
  'POST /api/protocols': { strategy: 'deferred', reason: 'Admin content API' },
  'PUT /api/protocols/:id': { strategy: 'deferred', reason: 'Admin content API' },
  'DELETE /api/protocols/:id': { strategy: 'deferred', reason: 'Admin content API' },

  'GET /api/audit/my-logs': {
    strategy: 'expose-recommended',
    reason: 'User activity',
    clientHint: 'Profile / Settings audit activity',
  },
  'GET /api/audit/phi-access': { strategy: 'deferred', reason: 'Compliance officer view' },

  'POST /api/compliance/export': {
    strategy: 'expose-recommended',
    reason: 'GDPR export',
    clientHint: 'complianceApi.js',
  },
  'DELETE /api/compliance/delete-account': {
    strategy: 'expose-recommended',
    reason: 'Account deletion',
    clientHint: 'complianceApi.js',
  },

  'GET /api/notifications/devices': { strategy: 'deferred', reason: 'Device list admin' },
  'DELETE /api/notifications/devices/:token': { strategy: 'deferred', reason: 'Unregister device' },
  'POST /api/notifications/preferences/toggle-all': {
    strategy: 'expose-recommended',
    reason: 'Settings UX',
    clientHint: 'NotificationService.js',
  },
  'GET /api/notifications/unread/count': {
    strategy: 'expose-recommended',
    reason: 'Badge count',
    clientHint: 'NotificationService.js',
  },
  'POST /api/notifications/read-all': {
    strategy: 'expose-recommended',
    reason: 'Inbox UX',
    clientHint: 'NotificationService.js',
  },

  'POST /api/health': {
    strategy: 'backend-only',
    reason: 'Client health ping (distinct from GET /health)',
  },

  'POST /api/interoperability/events': {
    strategy: 'backend-only',
    reason: 'Integration Hub ingestion endpoint for authenticated adapters and backend workflows',
  },
  'GET /api/interoperability/events': {
    strategy: 'deferred',
    reason: 'Integration Hub traceability list for a future admin/review surface',
  },
  'GET /api/interoperability/events/:id': {
    strategy: 'deferred',
    reason: 'Integration Hub event trace detail for a future admin/review surface',
  },

  'POST /api/ai/query': { strategy: 'backend-only', reason: 'Invoked via chat pipeline' },
  'POST /api/ai/structured': { strategy: 'backend-only', reason: 'Invoked via chat pipeline' },
  'GET /api/ai/usage': { strategy: 'deferred', reason: 'Usage meter UI' },

  'GET /api/metrics': { strategy: 'backend-only', reason: 'Prometheus scrape' },
});

export const BACKEND_ROUTE_EXPOSURE_POLICY = Object.freeze({
  ...Object.fromEntries(
    BACKEND_HTTP_ROUTES.map((route) => [
      `${route.method} ${route.path}`,
      {
        strategy: 'deferred',
        reason: 'Cataloged backend route; frontend exposure is tracked by platform wiring inventory.',
      },
    ])
  ),
  ...BASE_BACKEND_ROUTE_EXPOSURE_POLICY,
});

export const OPTIONAL_RUNTIME_ROUTE_EXPOSURE_POLICY = Object.freeze(
  Object.fromEntries(
    OPTIONAL_RUNTIME_BACKEND_ROUTES.map((route) => [
      routePolicyKey(route.method, route.path),
      {
        strategy: 'optional-runtime',
        reason: `${route.runtime} route mounted only when ${route.mountFlag}=true and MongoDB is configured.`,
        clientHint: route.controller,
      },
    ])
  )
);

export function routePolicyKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Backend routes with no matching wired frontend inventory entry.
 */
export function getBackendOnlyRoutes() {
  const wiredPaths = new Set(
    FRONTEND_API_CALLS.filter((c) => findBackendRoute(c.method, c.path)).map((c) =>
      routePolicyKey(c.method, findBackendRoute(c.method, c.path)!.path)
    )
  );

  return BACKEND_HTTP_ROUTES.filter((r) => !wiredPaths.has(routePolicyKey(r.method, r.path)));
}

export function getBackendRouteExposureGaps() {
  const backendOnly = getBackendOnlyRoutes();
  const gaps = [] as any[];

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
    const inInventory = BACKEND_HTTP_ROUTES.some((r) => r.method === method && r.path === path);
    if (!inInventory) {
      gaps.push({ key, issue: 'stale-policy' });
    }
  }

  return gaps;
}

export function getOptionalRuntimeBackendRoutes() {
  return OPTIONAL_RUNTIME_BACKEND_ROUTES.map((route) => ({
    ...route,
    policy: OPTIONAL_RUNTIME_ROUTE_EXPOSURE_POLICY[routePolicyKey(route.method, route.path)],
  }));
}

/**
 * Frontend inventory calls that are gated (no backend) — implement or keep gated.
 */
export function getFrontendGatedCalls() {
  return FRONTEND_API_CALLS.filter((c) => !findBackendRoute(c.method, c.path));
}
