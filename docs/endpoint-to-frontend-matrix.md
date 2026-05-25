# Endpoint-to-frontend matrix

**Generated:** 2026-05-25T04:54:39.024Z

| Method | Path | Backend | Frontend client | Exposure |
|--------|------|---------|-----------------|----------|
| POST | `/api/chat/message` | ChatController | clinicalChatService.js | ✅ |
| POST | `/api/chat/intent-classify` | ChatController | advancedRecommendationService.js | ✅ |
| POST | `/api/chat/suggest-action` | ChatController | clinicalChatService.js | ✅ |
| POST | `/api/chat/analyze-vitals` | ChatController | clinicalChatService.js | ✅ |
| POST | `/api/chat/messages` | — | syncService.js | ⚠️ gated |
| POST | `/api/chat/conversations` | — | syncService.js | ⚠️ gated |
| GET | `/api/protocols` | ProtocolController | clinicalContentApi.js | ✅ |
| GET | `/api/protocols/categories` | ProtocolController | clinicalContentApi.js | ✅ |
| GET | `/api/drugs` | DrugController | clinicalContentApi.js | ✅ |
| GET | `/api/tools` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| GET | `/api/tools/available` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| GET | `/api/tools/:id` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| POST | `/api/tools/:id/validate` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| GET | `/api/tools/catalog/executors` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| GET | `/api/tools/statistics` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| POST | `/api/tools/:id/execute` | ToolOrchestratorController | clinicalOrchestratorApi.js | ✅ |
| POST | `/api/tools/results` | ToolOrchestratorController | syncService.js | ✅ |
| POST | `/api/tools/share-results` | — | ToolResultShare.jsx | ⚠️ gated |
| GET | `/api/compliance/consent` | ComplianceController | complianceApi.js | ✅ |
| POST | `/api/compliance/consent` | ComplianceController | complianceApi.js | ✅ |
| GET | `/api/audit/logs` | AuditController | AuditLogs.jsx | ✅ |
| GET | `/api/audit/verify-integrity` | AuditController | AuditLogs.jsx | ✅ |
| GET | `/api/audit/statistics` | AuditController | AuditLogs.jsx | ✅ |
| POST | `/api/audit/sync` | AuditController | syncService.js | ✅ |
| GET | `/api/notifications` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/unread/count` | NotificationController | NotificationService.js | ✅ |
| PATCH | `/api/notifications/:id/read` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/read-all` | NotificationController | NotificationService.js | ✅ |
| DELETE | `/api/notifications/:id` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/preferences` | NotificationController | NotificationService.js | ✅ |
| PATCH | `/api/notifications/preferences` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/preferences/toggle-all` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/devices/register` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/devices` | NotificationController | NotificationService.js | ✅ |
| DELETE | `/api/notifications/devices/:token` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/test` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/stream` | — | NotificationService.js | ⚠️ gated |
| POST | `/api/notifications/send/:channel` | — | notifications/NotificationService.js | ⚠️ gated |
| GET | `/api/team/users` | — | TeamManagement.jsx | ⚠️ gated |
| PUT | `/api/team/users/:id` | — | TeamManagement.jsx | ⚠️ gated |
| DELETE | `/api/team/users/:id` | — | TeamManagement.jsx | ⚠️ gated |
| POST | `/api/team/invite` | — | TeamManagement.jsx | ⚠️ gated |
| POST | `/api/sync` | — | offline.js / OfflineSupport.jsx | ⚠️ gated |
| GET | `/api/fleet/vehicles/live` | FleetLiveTrackingController | fleetTelemetryService.js | ✅ |
| GET | `/api/fleet/routes/active` | FleetLiveTrackingController | fleetTelemetryService.js | ✅ |
| GET | `/api/hospital-map/floors` | HospitalLiveTrackingController | hospitalMapService.js | ✅ |
| GET | `/api/hospital-map/devices` | HospitalLiveTrackingController | hospitalMapService.js | ✅ |
| GET | `/api/devices/live` | DeviceLiveTrackingController | medicalIotService.js | ✅ |
| GET | `/api/telemetry/live` | DeviceLiveTrackingController | medicalIotService.js | ✅ |
| GET | `/api/alerts/devices` | DeviceLiveTrackingController | medicalIotService.js | ✅ |
| POST | `/api/clinical/alerts/:id/acknowledge` | — | clinicalAlertNotifications.js | ⚠️ gated |
| POST | `/api/clinical/alerts/:id/dismiss` | — | clinicalAlertNotifications.js | ⚠️ gated |
| GET | `/api/clinical/alerts/stream` | — | clinicalAlertNotifications.js | ⚠️ gated |
| POST | `/api/clinical-intelligence/ambient-scribe/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / AmbientScribe.jsx | ✅ |
| POST | `/api/clinical-intelligence/guideline-rag/query` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / GuidelineRag.jsx | ✅ |
| POST | `/api/clinical-intelligence/differential-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / DifferentialAi.jsx | ✅ |
| POST | `/api/clinical-intelligence/timeline-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / TimelineAi.jsx | ✅ |
| POST | `/api/clinical-intelligence/patient-summary-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / PatientSummaryAi.jsx | ✅ |
| POST | `/api/clinical-intelligence/order-set-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / OrderSetAi.jsx | ✅ |
| GET | `/api/clinical-intelligence/ai-explainability/trace` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / AiExplainability.jsx | ✅ |
| GET | `/api/clinical-intelligence/clinical-audit/execution-logs` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / ClinicalAudit.jsx | ✅ |
| GET | `/api/platform-systems/capabilities/:capabilityId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/platform-systems/packs/:pack` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/integrations/fhir/connections` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/integrations/fhir/connections` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/integrations/fhir/:connectionId/test` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/integrations/fhir/:connectionId/sync` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/integrations/hl7/interfaces` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/integrations/hl7/interfaces/:interfaceId/test-message` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/import/ehr` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/:patientId/import/labs` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/:patientId/import/medications` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/:patientId/import/observations` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/patients/:patientId/workspace` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/patients/:patientId/summary` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/patients/:patientId/timeline` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/:patientId/events` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/patients/:patientId/risk-scores` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/patients/:patientId/risk-scores` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/patients/:patientId/care-plan` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/calculator-recommender/suggest` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/workflow-builder/generate` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/reasoning/analyze` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/why-engine/explain` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/audit-trail/summarize` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/clinical-intelligence/clinical-event-ai/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/soap/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/dictation/transcribe` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/discharge-summary/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/referral/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/prior-auth/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/:documentId/approve` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/documentation/:documentId/export` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/governance/ai/policies` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| PUT | `/api/governance/ai/policies/:policyId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/governance/model-usage/summary` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/governance/model-usage/events` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/governance/costs/summary` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| PUT | `/api/governance/costs/budgets/:budgetId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/governance/clinical-safety/findings` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/governance/clinical-safety/findings/:findingId/review` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/consent/:patientId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/consent/:patientId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/consent/:patientId/revoke` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| GET | `/api/privacy/access-log` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/privacy/export` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/privacy/delete-request` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ✅ |
| POST | `/api/exports/pdf` | — | export/ExportService.js | ⚠️ gated |
| POST | `/api/exports/excel` | — | export/ExportService.js | ⚠️ gated |
| POST | `/api/reports/generate` | — | export/ExportService.js | ⚠️ gated |
| POST | `/api/reports/schedule` | — | export/ExportService.js | ⚠️ gated |
| DELETE | `/api/reports/schedule/:reportId` | — | export/ExportService.js | ⚠️ gated |
| GET | `/api/analytics/metrics` | AnalyticsController | AnalyticsDashboard.jsx | ✅ |
| GET | `/api/auth/biometric/stats` | BiometricController | BiometricSetup.jsx | ✅ |
| POST | `/api/auth/biometric/verify` | BiometricController | BiometricSetup.jsx | ✅ |
| DELETE | `/api/auth/biometric/disable/:deviceId` | BiometricController | BiometricSetup.jsx | ✅ |
| GET | `/api/config/system` | AppController | configService.js | ✅ |
| GET | `/api/ai/remaining-queries` | AiController | configService.js | ✅ |
| GET | `/api/users/profile` | UsersController | UserContext.jsx / syncService.js | ✅ |
| PATCH | `/api/users/profile` | UsersController | profileApi.js / ProfileSettings.jsx | ✅ |
| GET | `/api/subscriptions/current` | SubscriptionsController | configService.js / subscriptionApi.js | ✅ |
| GET | `/api/subscriptions/plans` | SubscriptionsController | configService.js / subscriptionApi.js | ✅ |
| POST | `/api/subscriptions/create-checkout` | SubscriptionsController | subscriptionApi.js | ✅ |
| POST | `/api/subscriptions/portal` | SubscriptionsController | subscriptionApi.js | ✅ |
| POST | `/api/auth/login` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/register` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/verify-2fa` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/magic-link` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/dev-session` | AuthController | Auth.jsx | ✅ |
| GET | `/api/auth/biometric/config` | BiometricController | BiometricSetup.jsx | ✅ |
| POST | `/api/auth/biometric/enroll` | BiometricController | BiometricSetup.jsx | ✅ |
| GET | `/api/two-factor/generate` | TwoFactorController | TwoFactorSetup.jsx | ✅ |
| POST | `/api/two-factor/enable` | TwoFactorController | TwoFactorSetup.jsx | ✅ |
| GET | `/api/two-factor/status` | TwoFactorController | TwoFactorSettings.jsx | ✅ |
| DELETE | `/api/two-factor/disable` | TwoFactorController | TwoFactorSettings.jsx | ✅ |
| POST | `/api/crashes` | AnalyticsController | ErrorBoundary.jsx | ✅ |
| POST | `/api/analytics/events` | AnalyticsController | analyticsService.ts | ✅ |

## Backend route inventory (reference)

- `GET /health`
- `GET /api/config/system`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/dev-session`
- `POST /api/auth/verify-2fa`
- `GET /api/auth/verify-email`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/linkedin`
- `GET /api/auth/linkedin/callback`
- `POST /api/auth/magic-link`
- `GET /api/auth/oidc`
- `GET /api/auth/saml`
- `GET /api/auth/me`
- `POST /api/auth/biometric/enroll`
- `POST /api/auth/biometric/verify`
- `GET /api/auth/biometric/config`
- `GET /api/auth/biometric/stats`
- `DELETE /api/auth/biometric/disable/:deviceId`

_…and 133 more in src/data/backendHttpRouteInventory.js_

