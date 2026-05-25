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
  { method: 'GET', path: '/api/platform-systems/capabilities/:capabilityId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/platform-systems/packs/:pack', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/integrations/fhir/connections', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/integrations/fhir/connections', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/integrations/fhir/:connectionId/test', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/integrations/fhir/:connectionId/sync', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/integrations/hl7/interfaces', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/integrations/hl7/interfaces/:interfaceId/test-message', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/import/ehr', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/:patientId/import/labs', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/:patientId/import/medications', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/:patientId/import/observations', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/workspace', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/summary', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/timeline', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/:patientId/events', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/risk-scores', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/patients/:patientId/risk-scores', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/care-plan', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/calculator-recommender/suggest', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/workflow-builder/generate', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/reasoning/analyze', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/why-engine/explain', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/audit-trail/summarize', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/clinical-intelligence/clinical-event-ai/draft', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/soap/draft', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/dictation/transcribe', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/discharge-summary/draft', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/referral/draft', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/prior-auth/draft', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/:documentId/approve', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/documentation/:documentId/export', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/ai/policies', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/ai/policies/:policyId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/model-usage/summary', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/model-usage/events', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/costs/summary', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/costs/budgets/:budgetId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/clinical-safety/findings', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/clinical-safety/findings/:findingId/review', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/consent/:patientId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/consent/:patientId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/consent/:patientId/revoke', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/privacy/access-log', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/privacy/export', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/privacy/delete-request', controller: 'PlatformSystemsController' },

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

  { method: 'GET', path: '/api/fleet/vehicles/live', controller: 'FleetLiveTrackingController' },
  { method: 'GET', path: '/api/fleet/routes/active', controller: 'FleetLiveTrackingController' },
  { method: 'GET', path: '/api/hospital-map/floors', controller: 'HospitalLiveTrackingController' },
  { method: 'GET', path: '/api/hospital-map/devices', controller: 'HospitalLiveTrackingController' },
  { method: 'GET', path: '/api/devices/live', controller: 'DeviceLiveTrackingController' },
  { method: 'GET', path: '/api/telemetry/live', controller: 'DeviceLiveTrackingController' },
  { method: 'GET', path: '/api/alerts/devices', controller: 'DeviceLiveTrackingController' },

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
