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
  {
    method: 'DELETE',
    path: '/api/auth/biometric/disable/:deviceId',
    controller: 'BiometricController',
  },
  {
    method: 'DELETE',
    path: '/api/auth/biometric/delete/:deviceId',
    controller: 'BiometricController',
  },
  { method: 'GET', path: '/api/auth/biometric/available', controller: 'BiometricController' },

  { method: 'GET', path: '/api/users/profile', controller: 'UsersController' },
  { method: 'PATCH', path: '/api/users/profile', controller: 'UsersController' },

  { method: 'GET', path: '/api/profile/me', controller: 'UserProfileController' },
  { method: 'PATCH', path: '/api/profile/me', controller: 'UserProfileController' },
  { method: 'GET', path: '/api/profile/me/preferences', controller: 'UserProfileController' },
  { method: 'PATCH', path: '/api/profile/me/preferences', controller: 'UserProfileController' },
  { method: 'GET', path: '/api/profile/me/activity', controller: 'UserProfileController' },
  { method: 'GET', path: '/api/profile/me/security', controller: 'UserProfileController' },

  { method: 'GET', path: '/api/workspaces', controller: 'WorkspacesController' },
  { method: 'POST', path: '/api/workspaces', controller: 'WorkspacesController' },
  { method: 'POST', path: '/api/workspaces/active', controller: 'WorkspacesController' },
  { method: 'GET', path: '/api/workspaces/:workspaceId', controller: 'WorkspacesController' },
  {
    method: 'GET',
    path: '/api/workspaces/:workspaceId/members',
    controller: 'WorkspacesController',
  },
  {
    method: 'POST',
    path: '/api/workspaces/:workspaceId/invitations',
    controller: 'WorkspacesController',
  },
  { method: 'GET', path: '/api/workspaces/:workspaceId/tools', controller: 'WorkspacesController' },
  {
    method: 'PATCH',
    path: '/api/workspaces/:workspaceId/tools',
    controller: 'WorkspacesController',
  },

  { method: 'POST', path: '/api/activity', controller: 'UserActivityController' },
  { method: 'GET', path: '/api/activity/me', controller: 'UserActivityController' },
  { method: 'GET', path: '/api/activity/me/summary', controller: 'UserActivityController' },
  {
    method: 'GET',
    path: '/api/activity/workspaces/:workspaceId',
    controller: 'UserActivityController',
  },

  { method: 'GET', path: '/api/personalization/me', controller: 'PersonalizationController' },
  { method: 'PATCH', path: '/api/personalization/me', controller: 'PersonalizationController' },
  {
    method: 'GET',
    path: '/api/personalization/me/recommendations',
    controller: 'PersonalizationController',
  },
  {
    method: 'POST',
    path: '/api/personalization/me/saved-prompts',
    controller: 'PersonalizationController',
  },
  {
    method: 'DELETE',
    path: '/api/personalization/me/saved-prompts/:promptId',
    controller: 'PersonalizationController',
  },

  { method: 'GET', path: '/api/artifacts', controller: 'ArtifactsController' },
  { method: 'GET', path: '/api/artifacts/graph', controller: 'ArtifactsController' },
  { method: 'POST', path: '/api/artifacts', controller: 'ArtifactsController' },
  { method: 'GET', path: '/api/artifacts/:id', controller: 'ArtifactsController' },
  { method: 'GET', path: '/api/artifacts/:id/versions', controller: 'ArtifactsController' },
  { method: 'PATCH', path: '/api/artifacts/:id', controller: 'ArtifactsController' },

  { method: 'GET', path: '/api/memory/dashboard', controller: 'MemoryController' },
  { method: 'POST', path: '/api/memory/short', controller: 'MemoryController' },
  { method: 'GET', path: '/api/memory/short', controller: 'MemoryController' },
  { method: 'POST', path: '/api/memory/long', controller: 'MemoryController' },
  { method: 'GET', path: '/api/memory/long', controller: 'MemoryController' },
  { method: 'POST', path: '/api/memory/clinical', controller: 'MemoryController' },
  { method: 'GET', path: '/api/memory/clinical', controller: 'MemoryController' },

  { method: 'GET', path: '/api/two-factor/generate', controller: 'TwoFactorController' },
  { method: 'POST', path: '/api/two-factor/enable', controller: 'TwoFactorController' },
  { method: 'DELETE', path: '/api/two-factor/disable', controller: 'TwoFactorController' },
  { method: 'POST', path: '/api/two-factor/verify', controller: 'TwoFactorController' },
  { method: 'GET', path: '/api/two-factor/status', controller: 'TwoFactorController' },

  { method: 'GET', path: '/api/subscriptions/plans', controller: 'SubscriptionsController' },
  { method: 'GET', path: '/api/subscriptions/config', controller: 'SubscriptionsController' },
  {
    method: 'POST',
    path: '/api/subscriptions/create-checkout',
    controller: 'SubscriptionsController',
  },
  { method: 'POST', path: '/api/subscriptions/portal', controller: 'SubscriptionsController' },
  { method: 'GET', path: '/api/subscriptions/current', controller: 'SubscriptionsController' },
  { method: 'POST', path: '/api/subscriptions/webhook', controller: 'SubscriptionsController' },

  { method: 'POST', path: '/api/chat/message', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/intent-classify', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/message-3d', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/suggest-action', controller: 'ChatController' },
  { method: 'POST', path: '/api/chat/analyze-vitals', controller: 'ChatController' },

  {
    method: 'POST',
    path: '/api/clinical-intelligence/ambient-scribe/generate',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/guideline-rag/query',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/differential-ai/generate',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/timeline-ai/generate',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/patient-summary-ai/generate',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/order-set-ai/generate',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'GET',
    path: '/api/clinical-intelligence/ai-explainability/trace',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'GET',
    path: '/api/clinical-intelligence/clinical-audit/execution-logs',
    controller: 'ClinicalIntelligenceController',
  },
  {
    method: 'GET',
    path: '/api/platform-systems/capabilities/:capabilityId',
    controller: 'PlatformSystemsController',
  },
  { method: 'GET', path: '/api/ai-governance/summary', controller: 'GovernanceController' },
  { method: 'GET', path: '/api/security/summary', controller: 'LlmSecurityController' },
  { method: 'POST', path: '/api/security/evaluate', controller: 'LlmSecurityController' },
  { method: 'GET', path: '/api/interoperability/summary', controller: 'InteroperabilityController' },
  { method: 'GET', path: '/api/regulatory/summary', controller: 'RegulatoryController' },
  { method: 'GET', path: '/api/equity/summary', controller: 'EquityController' },
  { method: 'GET', path: '/api/human-review/items', controller: 'HumanReviewController' },
  {
    method: 'POST',
    path: '/api/human-review/items/:itemId/decision',
    controller: 'HumanReviewController',
  },
  { method: 'GET', path: '/api/privacy/summary', controller: 'PrivacyCenterController' },
  { method: 'POST', path: '/api/privacy/requests', controller: 'PrivacyCenterController' },
  { method: 'GET', path: '/api/ehr-audit/summary', controller: 'EhrAuditController' },
  { method: 'GET', path: '/api/system-health', controller: 'ObservabilityController' },
  {
    method: 'GET',
    path: '/api/platform-systems/packs/:pack',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/integrations/fhir/connections',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/integrations/fhir/connections',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/integrations/fhir/:connectionId/test',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/integrations/fhir/:connectionId/sync',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/integrations/hl7/interfaces',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/integrations/hl7/interfaces/:interfaceId/test-message',
    controller: 'PlatformSystemsController',
  },
  { method: 'POST', path: '/api/patients/import/ehr', controller: 'PlatformSystemsController' },
  {
    method: 'POST',
    path: '/api/patients/:patientId/import/labs',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/patients/:patientId/import/medications',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/patients/:patientId/import/observations',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/patients/:patientId/workspace',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/patients/:patientId/summary',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/patients/:patientId/timeline',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/patients/:patientId/events',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/patients/:patientId/risk-scores',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/patients/:patientId/risk-scores',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/patients/:patientId/care-plan',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/calculator-recommender/suggest',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/workflow-builder/generate',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/reasoning/analyze',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/why-engine/explain',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/audit-trail/summarize',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/clinical-intelligence/clinical-event-ai/draft',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/soap/draft',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/dictation/transcribe',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/discharge-summary/draft',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/referral/draft',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/prior-auth/draft',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/:documentId/approve',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/documentation/:documentId/export',
    controller: 'PlatformSystemsController',
  },
  { method: 'GET', path: '/api/governance/ai/policies', controller: 'PlatformSystemsController' },
  {
    method: 'PUT',
    path: '/api/governance/ai/policies/:policyId',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/governance/model-usage/summary',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/governance/model-usage/events',
    controller: 'PlatformSystemsController',
  },
  { method: 'GET', path: '/api/governance/costs/summary', controller: 'PlatformSystemsController' },
  {
    method: 'PUT',
    path: '/api/governance/costs/budgets/:budgetId',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'GET',
    path: '/api/governance/clinical-safety/findings',
    controller: 'PlatformSystemsController',
  },
  {
    method: 'POST',
    path: '/api/governance/clinical-safety/findings/:findingId/review',
    controller: 'PlatformSystemsController',
  },
  { method: 'GET', path: '/api/consent/:patientId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/consent/:patientId', controller: 'PlatformSystemsController' },
  {
    method: 'POST',
    path: '/api/consent/:patientId/revoke',
    controller: 'PlatformSystemsController',
  },
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

  { method: 'POST', path: '/api/tool-calling/execute', controller: 'ToolCallingController' },
  { method: 'GET', path: '/api/tool-calling/catalog', controller: 'ToolCallingController' },
  { method: 'GET', path: '/api/tool-calling/resolve', controller: 'ToolCallingController' },
  { method: 'GET', path: '/api/tool-calling/logs', controller: 'ToolCallingController' },

  { method: 'GET', path: '/api/cost-optimizer/dashboard', controller: 'CostOptimizerController' },
  { method: 'POST', path: '/api/cost-optimizer/route', controller: 'CostOptimizerController' },

  { method: 'GET', path: '/api/training/pipeline', controller: 'TrainingController' },
  { method: 'GET', path: '/api/training/dashboard', controller: 'TrainingController' },
  { method: 'GET', path: '/api/training/runs', controller: 'TrainingController' },
  { method: 'POST', path: '/api/training/runs', controller: 'TrainingController' },
  { method: 'POST', path: '/api/training/runs/:runId/evaluate', controller: 'TrainingController' },
  { method: 'GET', path: '/api/training/moe-plan', controller: 'TrainingController' },

  { method: 'GET', path: '/api/evaluation/dashboard', controller: 'EvaluationController' },
  { method: 'GET', path: '/api/evaluation/metrics', controller: 'EvaluationController' },
  { method: 'GET', path: '/api/evaluation/runs', controller: 'EvaluationController' },
  { method: 'POST', path: '/api/evaluation/runs', controller: 'EvaluationController' },

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

  { method: 'GET', path: '/api/fleet/vehicles/live', controller: 'FleetController' },
  { method: 'GET', path: '/api/fleet/routes/active', controller: 'FleetController' },
  { method: 'GET', path: '/api/hospital-map/floors', controller: 'HospitalMapController' },
  {
    method: 'GET',
    path: '/api/hospital-map/devices',
    controller: 'HospitalMapController',
  },
  { method: 'GET', path: '/api/devices/live', controller: 'TelemetryController' },
  { method: 'GET', path: '/api/telemetry/live', controller: 'TelemetryController' },
  { method: 'GET', path: '/api/alerts/devices', controller: 'TelemetryController' },

  { method: 'GET', path: '/api/clinical/alerts', controller: 'ClinicalAlertsController' },
  {
    method: 'POST',
    path: '/api/clinical/alerts/:alertId/acknowledge',
    controller: 'ClinicalAlertsController',
  },
  {
    method: 'POST',
    path: '/api/clinical/alerts/:alertId/dismiss',
    controller: 'ClinicalAlertsController',
  },

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

  {
    method: 'POST',
    path: '/api/notifications/devices/register',
    controller: 'NotificationController',
  },
  { method: 'GET', path: '/api/notifications/devices', controller: 'NotificationController' },
  {
    method: 'DELETE',
    path: '/api/notifications/devices/:token',
    controller: 'NotificationController',
  },
  { method: 'GET', path: '/api/notifications/preferences', controller: 'NotificationController' },
  { method: 'PATCH', path: '/api/notifications/preferences', controller: 'NotificationController' },
  {
    method: 'POST',
    path: '/api/notifications/preferences/toggle-all',
    controller: 'NotificationController',
  },
  { method: 'GET', path: '/api/notifications', controller: 'NotificationController' },
  { method: 'GET', path: '/api/notifications/unread/count', controller: 'NotificationController' },
  { method: 'PATCH', path: '/api/notifications/:id/read', controller: 'NotificationController' },
  { method: 'POST', path: '/api/notifications/read-all', controller: 'NotificationController' },
  { method: 'DELETE', path: '/api/notifications/:id', controller: 'NotificationController' },
  { method: 'POST', path: '/api/notifications/test', controller: 'NotificationController' },

  { method: 'POST', path: '/api/analytics/events', controller: 'AnalyticsController' },
  { method: 'GET', path: '/api/analytics/metrics', controller: 'AnalyticsController' },
  { method: 'POST', path: '/api/crashes', controller: 'AnalyticsController' },
  {
    method: 'POST',
    path: '/api/health',
    controller: 'AnalyticsController',
    notes: 'client health ping under /api',
  },

  { method: 'POST', path: '/api/ai/query', controller: 'AiController' },
  { method: 'POST', path: '/api/ai/structured', controller: 'AiController' },
  { method: 'GET', path: '/api/ai/usage', controller: 'AiController' },
  { method: 'GET', path: '/api/ai/remaining-queries', controller: 'AiController' },

  { method: 'GET', path: '/api/audit/events', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/audit/events/:eventId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/audit/export', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/audit/integrity/status', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/audit/integrity/verify', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/audit/patients/:patientId/access', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/audit/runs/:runId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/fleet/alerts', controller: 'FleetController' },
  { method: 'GET', path: '/api/fleet/snapshot', controller: 'FleetController' },
  { method: 'GET', path: '/api/governance/ai-security/incidents', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/ai-security/incidents/:incidentId/review', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/ai-security/evaluate', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/ai-security/model-access', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/ai-security/model-access/:policyId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/ai-security/rules', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/ai-security/rules/:ruleId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/ai-security/summary', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/clinical/policies', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/clinical/policies', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/clinical/policies/:policyId/approve', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/clinical/policies/:policyId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/clinical/readiness', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/clinical/release-gates', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/clinical/release-gates/:gateId/decision', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/clinical/safety-findings', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/clinical/safety-findings/:findingId/review', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/equity/cohorts', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/equity/cohorts', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/equity/findings', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/equity/findings/:findingId/review', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/equity/metrics', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/equity/reports', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/equity/summary', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/regulatory/capabilities', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/regulatory/capabilities/:capabilityId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/regulatory/capabilities/:capabilityId/approve', controller: 'PlatformSystemsController' },
  { method: 'PUT', path: '/api/governance/regulatory/capabilities/:capabilityId/classification', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/regulatory/evidence/:capabilityId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/regulatory/evidence/:capabilityId/artifacts', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/validation/release-gates/:capabilityId', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/validation/runs/:runId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/validation/runs', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/validation/runs/:runId/approve', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/validation/scenarios', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/governance/validation/scenarios', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/governance/validation/synthetic-patients', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/hospital-map/devices/:deviceId', controller: 'HospitalMapController' },
  { method: 'GET', path: '/api/hospital-map/rooms', controller: 'HospitalMapController' },
  { method: 'GET', path: '/api/hospital-map/search', controller: 'HospitalMapController' },
  { method: 'GET', path: '/api/integrations/hl7/messages/quarantine', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/integrations/hl7/messages/:messageId/replay-preview', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/medical-iot/snapshot', controller: 'TelemetryController' },
  { method: 'GET', path: '/api/operations/deployments/current', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/health', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/incidents', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/operations/incidents/:incidentId/review', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/observability/ai-runs', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/observability/integrations', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/observability/orchestrator', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/observability/summary', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/operations/service-health', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/review-items', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/patients/:patientId/source-data', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/platform-governance/consent/:patientId', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/consent/:patientId/:scope', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/gate/evaluate', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/observability', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/privacy/:patientId/:requestType', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/review/items', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/review/items', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/review/items/:itemId/decision', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/security/events', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/source-provenance/:sourceId', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/summary', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/synthetic/fhir', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/synthetic/hl7', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/platform-governance/validation/scenarios', controller: 'PlatformGovernanceController' },
  { method: 'POST', path: '/api/platform-governance/validation/scenarios', controller: 'PlatformGovernanceController' },
  { method: 'GET', path: '/api/privacy/patient/:patientId/access-log', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/privacy/requests', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/privacy/requests/:requestId/review', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/profile/me/workspaces', controller: 'UserProfileController' },
  { method: 'PATCH', path: '/api/profile/me/workspaces/active', controller: 'UserProfileController' },
  { method: 'GET', path: '/api/review/items', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/review/items', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/review/items/:itemId', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/review/items/:itemId/assign', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/review/items/:itemId/comments', controller: 'PlatformSystemsController' },
  { method: 'POST', path: '/api/review/items/:itemId/decision', controller: 'PlatformSystemsController' },
  { method: 'GET', path: '/api/simulation/scenarios', controller: 'SimulationController' },
  { method: 'GET', path: '/api/simulation/scenarios/:id', controller: 'SimulationController' },
  { method: 'POST', path: '/api/simulation/runs', controller: 'SimulationController' },
  { method: 'POST', path: '/api/simulation/runs/:id/steps', controller: 'SimulationController' },
  { method: 'POST', path: '/api/simulation/runs/:id/complete', controller: 'SimulationController' },
  { method: 'GET', path: '/api/simulation/outcomes', controller: 'SimulationController' },
  { method: 'GET', path: '/api/simulation/recommendations', controller: 'SimulationController' },
  { method: 'GET', path: '/api/source-provenance/:sourceId', controller: 'PlatformSystemsController' },

  { method: 'GET', path: '/api/metrics', controller: 'MetricsController' },
]);

/**
 * @param {string} path
 */
export function normalizeRoutePattern(path) {
  return path.replace(/\$\{[^}]+\}/g, ':param').replace(/:[a-zA-Z0-9_]+/g, ':param');
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
  return BACKEND_HTTP_ROUTES.find((r) => r.method === m && routePatternMatches(path, r.path));
}

export function listBackendRoutePaths() {
  return BACKEND_HTTP_ROUTES.map((r) => `${r.method} ${r.path}`);
}
