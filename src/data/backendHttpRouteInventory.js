/**
 * Canonical Nest HTTP routes (global prefix `api`, except `/health`).
 * Update when controllers change; validated by backendFrontendExposure tests.
 *
 * @see docs/backend-api-inventory.md
 */

/** @typedef {{ method: string, path: string, controller: string, notes?: string }} BackendHttpRoute */

/** @type {readonly BackendHttpRoute[]} */
export const BACKEND_HTTP_ROUTES = Object.freeze([
  { method: 'GET', path: '/health', controller: 'AppController' },
  { method: 'GET', path: '/api/config/system', controller: 'AppController' },

  { method: 'POST', path: '/api/auth/register', controller: 'AuthController' },
  { method: 'POST', path: '/api/auth/login', controller: 'AuthController' },
  { method: 'POST', path: '/api/auth/dev-session', controller: 'AuthController' },
  { method: 'POST', path: '/api/auth/verify-2fa', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/verify-email', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/google', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/google/callback', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/linkedin', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/linkedin/callback', controller: 'AuthController' },
  { method: 'POST', path: '/api/auth/magic-link', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/oidc', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/saml', controller: 'AuthController' },
  { method: 'GET', path: '/api/auth/me', controller: 'AuthController' },

  { method: 'POST', path: '/api/auth/biometric/enroll', controller: 'BiometricController' },
  { method: 'POST', path: '/api/auth/biometric/verify', controller: 'BiometricController' },
  { method: 'GET', path: '/api/auth/biometric/config', controller: 'BiometricController' },
  { method: 'GET', path: '/api/auth/biometric/stats', controller: 'BiometricController' },
  { method: 'DELETE', path: '/api/auth/biometric/disable/:deviceId', controller: 'BiometricController' },
  { method: 'DELETE', path: '/api/auth/biometric/delete/:deviceId', controller: 'BiometricController' },
  { method: 'GET', path: '/api/auth/biometric/available', controller: 'BiometricController' },

  { method: 'GET', path: '/api/users/profile', controller: 'UsersController' },
  { method: 'PATCH', path: '/api/users/profile', controller: 'UsersController' },

  { method: 'GET', path: '/api/two-factor/generate', controller: 'TwoFactorController' },
  { method: 'POST', path: '/api/two-factor/enable', controller: 'TwoFactorController' },
  { method: 'DELETE', path: '/api/two-factor/disable', controller: 'TwoFactorController' },
  { method: 'POST', path: '/api/two-factor/verify', controller: 'TwoFactorController' },
  { method: 'GET', path: '/api/two-factor/status', controller: 'TwoFactorController' },

  { method: 'GET', path: '/api/subscriptions/plans', controller: 'SubscriptionsController' },
  { method: 'GET', path: '/api/subscriptions/config', controller: 'SubscriptionsController' },
  { method: 'POST', path: '/api/subscriptions/create-checkout', controller: 'SubscriptionsController' },
  { method: 'POST', path: '/api/subscriptions/portal', controller: 'SubscriptionsController' },
  { method: 'GET', path: '/api/subscriptions/current', controller: 'SubscriptionsController' },
  { method: 'POST', path: '/api/subscriptions/webhook', controller: 'SubscriptionsController' },

  { method: 'POST', path: '/api/chat/message', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/intent-classify', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/message-3d', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/suggest-action', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/analyze-vitals', controller: 'ChatController' },

  { method: 'POST', path: '/api/clinical-intelligence/ambient-scribe/generate', controller: 'ClinicalIntelligenceController' },
  { method: 'POST', path: '/api/clinical-intelligence/guideline-rag/query', controller: 'ClinicalIntelligenceController' },
  { method: 'POST', path: '/api/clinical-intelligence/differential-ai/generate', controller: 'ClinicalIntelligenceController' },
  { method: 'POST', path: '/api/clinical-intelligence/timeline-ai/generate', controller: 'ClinicalIntelligenceController' },
  { method: 'POST', path: '/api/clinical-intelligence/patient-summary-ai/generate', controller: 'ClinicalIntelligenceController' },
  { method: 'POST', path: '/api/clinical-intelligence/order-set-ai/generate', controller: 'ClinicalIntelligenceController' },
  { method: 'GET', path: '/api/clinical-intelligence/ai-explainability/trace', controller: 'ClinicalIntelligenceController' },
  { method: 'GET', path: '/api/clinical-intelligence/clinical-audit/execution-logs', controller: 'ClinicalIntelligenceController' },

  { method: 'GET', path: '/api/tools', controller: 'ToolOrchestratorController' },
  { method: 'GET', path: '/api/tools/available', controller: 'ToolOrchestratorController' },
  { method: 'GET', path: '/api/tools/statistics', controller: 'ToolOrchestratorController' },
  { method: 'GET', path: '/api/tools/catalog/executors', controller: 'ToolOrchestratorController' },
  { method: 'GET', path: '/api/tools/:id', controller: 'ToolOrchestratorController' },
  { method: 'POST', path: '/api/tools/:id/validate', controller: 'ToolOrchestratorController' },
  { method: 'POST', path: '/api/tools/:id/execute', controller: 'ToolOrchestratorController' },
  { method: 'POST', path: '/api/tools/execute', controller: 'ToolOrchestratorController' },
  { method: 'POST', path: '/api/tools/results', controller: 'ToolOrchestratorController' },

  { method: 'GET', path: '/api/drugs', controller: 'DrugController' },
  { method: 'GET', path: '/api/drugs/categories', controller: 'DrugController' },
  { method: 'GET', path: '/api/drugs/:id', controller: 'DrugController' },
  { method: 'POST', path: '/api/drugs', controller: 'DrugController' },
  { method: 'PUT', path: '/api/drugs/:id', controller: 'DrugController' },
  { method: 'DELETE', path: '/api/drugs/:id', controller: 'DrugController' },

  { method: 'GET', path: '/api/protocols', controller: 'ProtocolController' },
  { method: 'GET', path: '/api/protocols/categories', controller: 'ProtocolController' },
  { method: 'GET', path: '/api/protocols/:id', controller: 'ProtocolController' },
  { method: 'POST', path: '/api/protocols', controller: 'ProtocolController' },
  { method: 'PUT', path: '/api/protocols/:id', controller: 'ProtocolController' },
  { method: 'DELETE', path: '/api/protocols/:id', controller: 'ProtocolController' },

  { method: 'GET', path: '/api/audit/logs', controller: 'AuditController' },
  { method: 'GET', path: '/api/audit/my-logs', controller: 'AuditController' },
  { method: 'GET', path: '/api/audit/phi-access', controller: 'AuditController' },
  { method: 'GET', path: '/api/audit/verify-integrity', controller: 'AuditController' },
  { method: 'GET', path: '/api/audit/statistics', controller: 'AuditController' },
  { method: 'POST', path: '/api/audit/sync', controller: 'AuditController' },

  { method: 'POST', path: '/api/compliance/export', controller: 'ComplianceController' },
  { method: 'DELETE', path: '/api/compliance/delete-account', controller: 'ComplianceController' },
  { method: 'GET', path: '/api/compliance/consent', controller: 'ComplianceController' },
  { method: 'POST', path: '/api/compliance/consent', controller: 'ComplianceController' },

  { method: 'POST', path: '/api/notifications/devices/register', controller: 'NotificationController' },
  { method: 'GET', path: '/api/notifications/devices', controller: 'NotificationController' },
  { method: 'DELETE', path: '/api/notifications/devices/:token', controller: 'NotificationController' },
  { method: 'GET', path: '/api/notifications/preferences', controller: 'NotificationController' },
  { method: 'PATCH', path: '/api/notifications/preferences', controller: 'NotificationController' },
  { method: 'POST', path: '/api/notifications/preferences/toggle-all', controller: 'NotificationController' },
  { method: 'GET', path: '/api/notifications', controller: 'NotificationController' },
  { method: 'GET', path: '/api/notifications/unread/count', controller: 'NotificationController' },
  { method: 'PATCH', path: '/api/notifications/:id/read', controller: 'NotificationController' },
  { method: 'POST', path: '/api/notifications/read-all', controller: 'NotificationController' },
  { method: 'DELETE', path: '/api/notifications/:id', controller: 'NotificationController' },
  { method: 'POST', path: '/api/notifications/test', controller: 'NotificationController' },

  { method: 'POST', path: '/api/analytics/events', controller: 'AnalyticsController' },
  { method: 'GET', path: '/api/analytics/metrics', controller: 'AnalyticsController' },
  { method: 'POST', path: '/api/crashes', controller: 'AnalyticsController' },
  { method: 'POST', path: '/api/health', controller: 'AnalyticsController', notes: 'client health ping under /api' },

  { method: 'POST', path: '/api/ai/query', controller: 'AiController' },
  { method: 'POST', path: '/api/ai/structured', controller: 'AiController' },
  { method: 'GET', path: '/api/ai/usage', controller: 'AiController' },
  { method: 'GET', path: '/api/ai/remaining-queries', controller: 'AiController' },

  { method: 'GET', path: '/api/metrics', controller: 'MetricsController' },
]);

/**
 * @param {string} path
 */
export function normalizeRoutePattern(path) {
  return path
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:[a-zA-Z0-9_]+/g, ':param');
}

/**
 * @param {string} callPath
 * @param {string} routePath
 */
export function routePatternMatches(callPath, routePath) {
  const callParts = normalizeRoutePattern(callPath).split('/').filter(Boolean);
  const routeParts = normalizeRoutePattern(routePath).split('/').filter(Boolean);
  if (callParts.length !== routeParts.length) return false;
  return callParts.every((part, i) => part === routeParts[i] || routeParts[i] === ':param');
}

/**
 * @param {string} method
 * @param {string} path
 */
export function findBackendRoute(method, path) {
  const m = method.toUpperCase();
  return BACKEND_HTTP_ROUTES.find(
    (r) => r.method === m && routePatternMatches(path, r.path)
  );
}

export function listBackendRoutePaths() {
  return BACKEND_HTTP_ROUTES.map((r) => `${r.method} ${r.path}`);
}
