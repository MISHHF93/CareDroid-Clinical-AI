# Backend Gap Report

Generated: 2026-06-11T20:33:06.394Z

Scope: read-only backend/frontend wiring sweep. No source code fixes were applied. This is the Phase 3 wiring hit list.

## Summary

- Frontend API inventory entries: 238.
- Backend route inventory entries: 406.
- Backend controller routes scanned: 407.
- Frontend calls with matching backend route: 222.
- Frontend calls without backend route: 16 (0 unguarded/missing, 16 gated or disabled).
- Backend endpoints without frontend consumers: 184.
- Demo-backed frontend calls: 10.
- Raw fetch/axios/SWR/query/trpc/supabase call sites found: 154.
- Env variables referenced: 173; missing or commented-only in env examples: 57.

## Critical Wiring Gaps

| Gap | Evidence | Impact | Recommended action |
| --- | --- | --- | --- |
| Frontend calls missing backend routes | none after parameter-name-insensitive route matching | No unguarded frontend API calls point at missing backend routes. | Keep the route inventory matcher parameter-name-insensitive so `:id`, `:alertId`, and `:artifactId` aliases do not become false positives. |
| Gated/disabled frontend stubs | POST /api/chat/messages [chatPersistence]; POST /api/chat/conversations [chatPersistence]; POST /api/tools/share-results [toolsShareResults]; GET /api/notifications/stream [notificationStream]; POST /api/notifications/send/:channel [notificationSendChannel]; GET /api/team/users [teamManagement]; PUT /api/team/users/:id [teamManagement]; DELETE /api/team/users/:id [teamManagement]; POST /api/team/invite [teamManagement]; POST /api/sync [bulkSync]; GET /api/clinical/alerts/stream [clinicalAlertsStream]; POST /api/exports/pdf [exportsPdf]; POST /api/exports/excel [exportsExcel]; POST /api/reports/generate [reportsGenerate]; POST /api/reports/schedule [reportsSchedule]; DELETE /api/reports/schedule/:reportId [reportsSchedule] | Features are present in frontend code but intentionally unavailable server-side. | Keep guards visible and prevent live UI from implying the feature works. |
| Backend-only endpoints | 184 routes | Backend contains routes with no declared frontend consumer. Some are internal/OAuth/webhooks; others are expose-recommended. | Use Backend Endpoints Without Consumers table to decide expose vs document internal. |
| Demo/sample-backed APIs | /api/fleet/vehicles/live (fleetLiveTracking); /api/fleet/routes/active (fleetActiveRoutes); /api/hospital-map/floors (hospitalMap); /api/hospital-map/devices (deviceFleet); /api/devices/live (medicalDeviceRegistry); /api/telemetry/live (telemetryLive); /api/alerts/devices (deviceAlerting); /api/clinical/alerts (clinicalAlerts); /api/clinical/alerts/:id/acknowledge (clinicalAlerts); /api/clinical/alerts/:id/dismiss (clinicalAlerts) | UI may show realistic data from demo contracts. | Label demo data clearly or wire real feeds before production use. |
| Env example gaps | ALIAS_SYNC_WRITE_MAP=missing; APP_ENV=missing; BACKEND_VERSION=missing; BUILD_TIME=missing; BUILD_TIMESTAMP=missing; CARE_ENV=missing; CAREDROID_API_URL=missing; CAREDROID_JWT=missing; CAREDROID_STRICT_SAAS_ENTITLEMENTS=missing; CAREDROID_TENANT_ISOLATION_DISABLED=missing; CI=missing; CONTRACT_WRITE_DOCS=missing; DATABASE_URL=documented/commented only; DEPLOYED_AT=missing; DEPLOYMENT_ID=missing; DEPLOYMENT_REGION=missing; DEV=missing; DUPLICATE_SYSTEM_AUDIT_WRITE_DOCS=missing; E2E_MATRIX_WRITE_DOCS=missing; ED_UX_PHASE=missing; ENVIRONMENT_BANNER_ENABLED=missing; EXPOSURE_WRITE_DOCS=missing; FEATURE_COVERAGE_WRITE_DOCS=missing; FRONTEND_VERSION=missing; GIT_BRANCH=missing; GIT_COMMIT=missing; JEST_WORKER_ID=missing; ORPHAN_DETECTION_WRITE_DOCS=missing; PRODUCT_PACKAGING_AUDIT_WRITE_DOCS=missing; QA_AUTH_PROFILE_JSON=missing; QA_AUTH_STATE=missing; QA_AUTH_TOKEN=missing; QA_BASE_URL=missing; QA_BROWSERS=missing; QA_JSON_REPORT=missing; QA_PRODUCTION_JSON=missing; QA_RETRIES=missing; QA_STRICT_API=missing; QA_WORKERS=missing; RENDER_GIT_COMMIT=missing; +17 more | Deploys can miss required configuration or rely on hidden defaults. | Add missing variables to the appropriate .env.example or remove stale references. |

## API Calls Inventory

| ID | Endpoint / Function | Method | Client | Request payload shape | Expected response shape | Backend exists | Response consumed | Error handling | Loading state | TS typing | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chat-message | /api/chat/message | POST | clinicalChatService.js | JSON object body; likely from body | JSON response; fallback shape present in client | yes (ChatController) | yes | not local to client | service wrapper; loading belongs to caller | JSDoc partial | capability=chatMessage:real |
| chat-intent-classify | /api/chat/intent-classify | POST | advancedRecommendationService.js | JSON object body; likely from { message } | JSON response via response.json() | yes (ChatController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=chatIntentClassify:real |
| chat-suggest-action | /api/chat/suggest-action | POST | clinicalChatService.js | JSON object body; likely from body | JSON response; fallback shape present in client | yes (ChatController) | yes | not local to client | service wrapper; loading belongs to caller | JSDoc partial | capability=chatMessage:real |
| chat-analyze-vitals | /api/chat/analyze-vitals | POST | clinicalChatService.js | JSON object body; likely from body | JSON response; fallback shape present in client | yes (ChatController) | yes | not local to client | service wrapper; loading belongs to caller | JSDoc partial | capability=chatMessage:real |
| chat-messages-sync | /api/chat/messages | POST | syncService.js | JSON object body; likely from {               conversationId: message.conversationId,               content: | JSON response via response.json() | no (gated stub noted) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | No route — gated off |
| chat-conversations-sync | /api/chat/conversations | POST | syncService.js | JSON object body; likely from {               conversationId: message.conversationId,               content: | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=chatPersistence:disabled |
| settings-features-get | /api/settings/features | GET | emergencySettingsApi.js / featureStore.ts | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (SettingsFeaturesController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| settings-features-patch | /api/settings/features | PATCH | emergencySettingsApi.js / featureStore.ts | JSON object body; likely from {       settings: {         emergencyOs: {           [section]: payload, | JSON response; fallback shape present in client | yes (SettingsFeaturesController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| protocols-list | /api/protocols | GET | clinicalContentApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (ProtocolController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial |  |
| protocols-categories | /api/protocols/categories | GET | clinicalContentApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (ProtocolController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial |  |
| drugs-list | /api/drugs | GET | clinicalContentApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (DrugController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial |  |
| tools-list | /api/tools | GET | clinicalToolsApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsList:real |
| tools-available | /api/tools/available | GET | clinicalToolsApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsList:real |
| tools-metadata | /api/tools/:id | GET | clinicalToolsApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsList:real |
| tools-validate | /api/tools/:id/validate | POST | clinicalToolsApi.js | JSON object body; likely from { parameters: parameters ?? {} } | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsExecute:real |
| tools-executor-catalog | /api/tools/catalog/executors | GET | clinicalToolsApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsList:real |
| tools-statistics | /api/tools/statistics | GET | clinicalToolsApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsList:real |
| tools-execute | /api/tools/:id/execute | POST | clinicalOrchestratorApi.js | JSON object body; likely from body | JSON response; fallback shape present in client | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=toolsExecute:real |
| tools-results | /api/tools/results | POST | syncService.js | JSON object body; likely from {               conversationId: message.conversationId,               content: | JSON response via response.json() | yes (ToolOrchestratorController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=toolsResultsSync:real |
| tools-share-results | /api/tools/share-results | POST | ToolResultShare.jsx | JSON object body; likely from exportData, null, 2 | JSON/DTO response inferred from backend route; exact shape not typed in inventory | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=toolsShareResults:disabled |
| compliance-consent-get | /api/compliance/consent | GET | complianceApi.js | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ComplianceController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=complianceConsent:real |
| compliance-consent-post | /api/compliance/consent | POST | complianceApi.js | JSON object body; likely from { consentType, granted } | JSON response; fallback shape present in client | yes (ComplianceController) | yes | yes | service wrapper; loading belongs to caller | JSDoc partial | capability=complianceConsent:real |
| audit-logs | /api/audit/logs | GET | AuditLogs.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (AuditController) | yes | yes | yes | no explicit TS response type |  |
| audit-verify | /api/audit/verify-integrity | GET | AuditLogs.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (AuditController) | yes | yes | yes | no explicit TS response type |  |
| audit-statistics | /api/audit/statistics | GET | AuditLogs.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (AuditController) | yes | yes | yes | no explicit TS response type |  |
| audit-sync | /api/audit/sync | POST | syncService.js | JSON object body; likely from {               conversationId: message.conversationId,               content: | JSON response via response.json() | yes (AuditController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=auditSync:real |
| notifications-list | /api/notifications | GET | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-unread-count | /api/notifications/unread/count | GET | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-read | /api/notifications/:id/read | PATCH | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-read-all | /api/notifications/read-all | POST | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-delete | /api/notifications/:id | DELETE | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-preferences-get | /api/notifications/preferences | GET | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-preferences-patch | /api/notifications/preferences | PATCH | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-preferences-toggle-all | /api/notifications/preferences/toggle-all | POST | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-devices-register | /api/notifications/devices/register | POST | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-devices-list | /api/notifications/devices | GET | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-devices-delete | /api/notifications/devices/:token | DELETE | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-test | /api/notifications/test | POST | NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | yes (NotificationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationsRest:real |
| notifications-stream | /api/notifications/stream | GET | NotificationService.js | none/bodyless; params in path/query | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationStream:disabled |
| notifications-send-channel | /api/notifications/send/:channel | POST | notifications/NotificationService.js | JSON object body; likely from payload | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=notificationSendChannel:disabled |
| team-users | /api/team/users | GET | TeamManagement.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=teamManagement:disabled |
| team-user-update | /api/team/users/:id | PUT | TeamManagement.jsx | JSON object body; likely from updatedUser | JSON response via apiFetchJson \`{ response, data }\` | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=teamManagement:disabled |
| team-user-delete | /api/team/users/:id | DELETE | TeamManagement.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=teamManagement:disabled |
| team-invite | /api/team/invite | POST | TeamManagement.jsx | JSON object body; likely from updatedUser | JSON response via apiFetchJson \`{ response, data }\` | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=teamManagement:disabled |
| bulk-sync | /api/sync | POST | offline.js / OfflineSupport.jsx | JSON object body; likely from data | JSON response via apiFetchJson \`{ response, data }\` | no (gated/disabled stub) | yes | yes | yes | no explicit TS response type | capability=bulkSync:disabled |
| fleet-live-vehicles | /api/fleet/vehicles/live | GET | fleetTelemetryService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (FleetController) | yes | not local to client | service wrapper; loading belongs to caller | JSDoc partial | capability=fleetLiveTracking:demo |
| fleet-active-routes | /api/fleet/routes/active | GET | fleetTelemetryService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (FleetController) | yes | not local to client | service wrapper; loading belongs to caller | JSDoc partial | capability=fleetActiveRoutes:demo |
| hospital-map-floors | /api/hospital-map/floors | GET | hospitalMapService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (HospitalMapController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=hospitalMap:demo |
| hospital-map-devices | /api/hospital-map/devices | GET | hospitalMapService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (HospitalMapController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=deviceFleet:demo |
| medical-devices-live | /api/devices/live | GET | medicalIotService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (TelemetryController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=medicalDeviceRegistry:demo |
| medical-telemetry-live | /api/telemetry/live | GET | medicalIotService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (TelemetryController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=telemetryLive:demo |
| medical-device-alerts | /api/alerts/devices | GET | medicalIotService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (TelemetryController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=deviceAlerting:demo |
| clinical-alerts-list | /api/clinical/alerts | GET | clinicalAlertsApi.js / ClinicalAlertsPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ClinicalAlertsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalAlerts:demo |
| clinical-alerts-ack | /api/clinical/alerts/:id/acknowledge | POST | clinicalAlertsApi.js / clinicalAlertNotifications.js | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalAlertsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalAlerts:demo |
| clinical-alerts-dismiss | /api/clinical/alerts/:id/dismiss | POST | clinicalAlertsApi.js / clinicalAlertNotifications.js | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalAlertsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalAlerts:demo |
| clinical-alerts-stream | /api/clinical/alerts/stream | GET | clinicalAlertNotifications.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | no (gated stub noted) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | WebSocket stream not implemented — gated off |
| ambient-scribe-generate | /api/clinical-intelligence/ambient-scribe/generate | POST | clinicalIntelligenceApi.js / AmbientScribe.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| guideline-rag-query | /api/clinical-intelligence/guideline-rag/query | POST | clinicalIntelligenceApi.js / GuidelineRag.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| differential-ai-generate | /api/clinical-intelligence/differential-ai/generate | POST | clinicalIntelligenceApi.js / DifferentialAi.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| timeline-ai-generate | /api/clinical-intelligence/timeline-ai/generate | POST | clinicalIntelligenceApi.js / TimelineAi.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| patient-summary-ai-generate | /api/clinical-intelligence/patient-summary-ai/generate | POST | clinicalIntelligenceApi.js / PatientSummaryAi.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| order-set-ai-generate | /api/clinical-intelligence/order-set-ai/generate | POST | clinicalIntelligenceApi.js / OrderSetAi.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| ai-explainability-trace | /api/clinical-intelligence/ai-explainability/trace | GET | clinicalIntelligenceApi.js / AiExplainability.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| clinical-audit-execution-logs | /api/clinical-intelligence/clinical-audit/execution-logs | GET | clinicalIntelligenceApi.js / ClinicalAudit.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ClinicalIntelligenceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=clinicalIntelligence:real |
| platform-capability-contract | /api/platform-systems/capabilities/:capabilityId | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-ai-governance-summary | /api/ai-governance/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (GovernanceController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-security-summary | /api/security/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (LlmSecurityController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-security-evaluate | /api/security/evaluate | POST | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (LlmSecurityController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-interoperability-summary | /api/interoperability/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (InteroperabilityController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-regulatory-summary | /api/regulatory/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (RegulatoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-equity-summary | /api/equity/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (EquityController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-human-review-items | /api/human-review/items | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (HumanReviewController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-human-review-decision | /api/human-review/items/:itemId/decision | POST | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (HumanReviewController) | yes | yes | yes | no explicit TS response type |  |
| platform-privacy-summary | /api/privacy/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (PrivacyCenterController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-privacy-request-create | /api/privacy/requests | POST | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (PrivacyCenterController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-ehr-audit-summary | /api/ehr-audit/summary | GET | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (EhrAuditController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| backend-health-probe | /health | GET | systemHealthService.js / SystemHealth.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (AppController) | yes | yes | yes | no explicit TS response type |  |
| platform-system-health | /api/system-health | GET | systemHealthService.js / SystemHealth.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (ObservabilityController) | yes | yes | yes | no explicit TS response type |  |
| saas-health-center | /api/saas-health | GET | saasHealthApi.js / SaasHealthCenter.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (SaasHealthController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-pack-contract | /api/platform-systems/packs/:pack | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| asset-dependency-graph | /api/dependency-graph | GET | productCatalogApi.js / DependencyGraph.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-fhir-connections | /api/integrations/fhir/connections | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-fhir-create | /api/integrations/fhir/connections | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-fhir-test | /api/integrations/fhir/:connectionId/test | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-fhir-sync | /api/integrations/fhir/:connectionId/sync | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-hl7-interfaces | /api/integrations/hl7/interfaces | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-hl7-test-message | /api/integrations/hl7/interfaces/:interfaceId/test-message | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-ehr-patient-import | /api/patients/import/ehr | POST | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-lab-import | /api/patients/:patientId/import/labs | POST | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-medication-import | /api/patients/:patientId/import/medications | POST | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-observation-import | /api/patients/:patientId/import/observations | POST | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-patient-workspace | /api/patients/:patientId/workspace | GET | platformSystemsApi.js / patientManagementApi.js / PatientCard.jsx / EmergencyWhiteboard.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-patient-summary-shell | /api/patients/:patientId/summary | GET | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-patient-timeline | /api/patients/:patientId/timeline | GET | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-patient-source-data | /api/patients/:patientId/source-data | GET | patientManagementApi.js / PatientDetailPanel / PatientCard.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-patient-review-items | /api/patients/:patientId/review-items | GET | patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-patient-privacy-access-log | /api/privacy/patient/:patientId/access-log | GET | patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-patient-event | /api/patients/:patientId/events | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-risk-scores | /api/patients/:patientId/risk-scores | GET | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-risk-score-add | /api/patients/:patientId/risk-scores | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-care-plan | /api/patients/:patientId/care-plan | GET | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-calculator-recommender | /api/clinical-intelligence/calculator-recommender/suggest | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-workflow-builder | /api/clinical-intelligence/workflow-builder/generate | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-reasoning | /api/clinical-intelligence/reasoning/analyze | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-why-engine | /api/clinical-intelligence/why-engine/explain | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-audit-trail | /api/clinical-intelligence/audit-trail/summarize | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-clinical-event-ai | /api/clinical-intelligence/clinical-event-ai/draft | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-soap-draft | /api/documentation/soap/draft | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-dictation-transcribe | /api/documentation/dictation/transcribe | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-discharge-draft | /api/documentation/discharge-summary/draft | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-referral-draft | /api/documentation/referral/draft | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-prior-auth-draft | /api/documentation/prior-auth/draft | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-document-approve | /api/documentation/:documentId/approve | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-document-export | /api/documentation/:documentId/export | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-ai-policies | /api/governance/ai/policies | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-ai-policy-update | /api/governance/ai/policies/:policyId | PUT | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-model-usage-summary | /api/governance/model-usage/summary | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-model-usage-events | /api/governance/model-usage/events | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-cost-summary | /api/governance/costs/summary | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-cost-budget-update | /api/governance/costs/budgets/:budgetId | PUT | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-safety-findings | /api/governance/clinical-safety/findings | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-safety-review | /api/governance/clinical-safety/findings/:findingId/review | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-consent-get | /api/consent/:patientId | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-consent-update | /api/consent/:patientId | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-consent-revoke | /api/consent/:patientId/revoke | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-privacy-access-log | /api/privacy/access-log | GET | platformSystemsApi.js / PlatformSystemPage.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-privacy-export | /api/privacy/export | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| platform-privacy-delete | /api/privacy/delete-request | POST | platformSystemsApi.js / PlatformSystemPage.jsx | JSON object body; likely from payload | JSON response; fallback shape present in client | yes (PlatformSystemsController) | yes | yes | yes | no explicit TS response type |  |
| exports-pdf | /api/exports/pdf | POST | export/ExportService.js | JSON object body; likely from data, null, 2 | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=exportsPdf:disabled |
| exports-excel | /api/exports/excel | POST | export/ExportService.js | JSON object body; likely from data, null, 2 | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=exportsExcel:disabled |
| reports-generate | /api/reports/generate | POST | export/ExportService.js | JSON object body; likely from data, null, 2 | JSON response via response.json() | no (gated/disabled stub) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=reportsGenerate:disabled |
| reports-schedule-create | /api/reports/schedule | POST | export/ExportService.js | JSON object body; likely from data, null, 2 | JSON response via response.json() | no (gated stub noted) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | No route — gated off |
| reports-schedule-cancel | /api/reports/schedule/:reportId | DELETE | export/ExportService.js | none/bodyless; params in path/query | JSON response via response.json() | no (gated stub noted) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | No route — gated off |
| analytics-metrics | /api/analytics/metrics | GET | AnalyticsDashboard.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (AnalyticsController) | yes | yes | yes | no explicit TS response type |  |
| auth-biometric-stats | /api/auth/biometric/stats | GET | BiometricSetup.jsx | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (BiometricController) | yes | yes | yes | no explicit TS response type |  |
| auth-biometric-verify | /api/auth/biometric/verify | POST | BiometricSetup.jsx | request body expected; shape not statically documented in inventory | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (BiometricController) | yes | yes | yes | no explicit TS response type |  |
| auth-biometric-disable | /api/auth/biometric/disable/:deviceId | DELETE | BiometricSetup.jsx | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (BiometricController) | yes | yes | yes | no explicit TS response type |  |
| config-system | /api/config/system | GET | configService.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (AppController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| tenant-context | /api/tenant/context | GET | TenantContext.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (TenantContextController) | yes | yes | yes | no explicit TS response type |  |
| tenant-isolation-audit | /api/tenant/isolation-audit | GET | tenantIsolationApi.js / Settings.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TenantContextController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| ai-remaining-queries | /api/ai/remaining-queries | GET | configService.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (AiController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| platform-assets-list | /api/platform/assets | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-governance-registry | /api/platform/governance-registry | GET | platformAssetsApi.js / GovernanceRegistry.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-assets-lifecycle-update | /api/platform/assets/:assetId/lifecycle | PATCH | platformAssetsApi.js / OrganizationPages.jsx | JSON object body; likely from { lifecycle } | JSON response via response.json() | yes (PlatformAssetsController) | yes | yes | yes | no explicit TS response type | capability=platformAssets:real |
| platform-context | /api/platform/context | GET | platformAssetsApi.js / UserIdentityContext.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-packs-list | /api/platform/packs | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-role-profiles-list | /api/platform/role-profiles | GET | platformAssetsApi.js / ProfileSettings.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-departments-list | /api/platform/departments | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-department-detail | /api/platform/departments/:departmentId | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-service-lines-list | /api/platform/service-lines | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-service-line-detail | /api/platform/service-lines/:serviceLineId | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-marketplace-packs-list | /api/platform/marketplace/packs | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-marketplace-pack-detail | /api/platform/marketplace/packs/:packId | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-current-user-assets | /api/platform/users/me/assets | GET | platformAssetsApi.js / ProfileToolPreferences.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-current-user-recommendations | /api/platform/users/me/recommendations | GET | platformAssetsApi.js / CommandDashboard.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-role-profile-update | /api/platform/me/role-profile | PATCH | platformAssetsApi.js / ProfileSettings.jsx | JSON object body; likely from { lifecycle } | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-digital-twin-summary | /api/platform/digital-twin | GET | platformAssetsApi.js / DigitalTwinIntelligence.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type | capability=platformAssets:real |
| platform-organization-analytics | /api/platform/organizations/:organizationId/analytics | GET | platformAssetsApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (PlatformAssetsController) | yes | yes | yes | no explicit TS response type | capability=platformAssets:real |
| users-profile | /api/users/profile | GET | UserContext.jsx / syncService.js | none/bodyless; params in path/query | JSON response via response.json() | yes (UsersController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=userProfile:real |
| users-profile-update | /api/users/profile | PATCH | profileApi.js / ProfileSettings.jsx | JSON object body; likely from payload | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (UsersController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=userProfile:real |
| profile-me | /api/profile/me | GET | userIdentityApi.js / UserIdentityContext.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| profile-me-update | /api/profile/me | PATCH | userIdentityApi.js / UserIdentityContext.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| profile-preferences | /api/profile/me/preferences | GET | userIdentityApi.js / ProfilePreferences.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| profile-preferences-update | /api/profile/me/preferences | PATCH | userIdentityApi.js / ProfilePreferences.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| profile-activity | /api/profile/me/activity | GET | userIdentityApi.js / ProfileActivity.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| profile-security | /api/profile/me/security | GET | userIdentityApi.js / ProfileSecurity.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (UserProfileController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=operationalProfile:real |
| workspaces-list | /api/workspaces | GET | userIdentityApi.js / UserIdentityContext.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (WorkspacesController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=workspaces:real |
| workspaces-create | /api/workspaces | POST | userIdentityApi.js / ProfileWorkspaces.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (WorkspacesController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=workspaces:real |
| workspaces-active | /api/workspaces/active | POST | userIdentityApi.js / Sidebar.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (WorkspacesController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=workspaces:real |
| activity-record | /api/activity | POST | userIdentityApi.js / UserIdentityContext.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (UserActivityController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=userActivity:real |
| personalization-me | /api/personalization/me | GET | userIdentityApi.js / UserIdentityContext.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (PersonalizationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=personalization:real |
| personalization-update | /api/personalization/me | PATCH | userIdentityApi.js / ProfilePreferences.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (PersonalizationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=personalization:real |
| personalization-save-prompt | /api/personalization/me/saved-prompts | POST | userIdentityApi.js / ProfilePreferences.jsx | JSON object body; likely from updates \|\| {} | JSON response; fallback shape present in client | yes (PersonalizationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=personalization:real |
| artifacts-list | /api/artifacts | GET | artifactsApi.js / Artifacts.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ArtifactsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| artifacts-graph | /api/artifacts/graph | GET | artifactsApi.js / Artifacts.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ArtifactsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| artifacts-versions | /api/artifacts/:artifactId/versions | GET | artifactsApi.js / Artifacts.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (ArtifactsController) | yes | yes | yes | no explicit TS response type | backend route uses equivalent `:id` parameter |
| memory-dashboard | /api/memory/dashboard | GET | memoryApi.js / MemoryDashboard.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| memory-short-save | /api/memory/short | POST | memoryApi.js / MemoryDashboard.jsx | JSON object body; likely from signal \|\| {} | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| memory-long-save | /api/memory/long | POST | memoryApi.js | JSON object body; likely from signal \|\| {} | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| memory-clinical-save | /api/memory/clinical | POST | memoryApi.js | JSON object body; likely from signal \|\| {} | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| memory-fabric-context | /api/memory/fabric/context | GET | memoryApi.js / UserIdentityContext.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| memory-fabric-signals | /api/memory/fabric/signals | POST | memoryApi.js / UserIdentityContext.jsx | JSON object body; likely from signal \|\| {} | JSON response; fallback shape present in client | yes (MemoryController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=memory:real |
| training-dashboard | /api/training/dashboard | GET | trainingApi.js / TrainingDashboard.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | yes | no explicit TS response type | capability=trainingPipeline:real |
| training-pipeline | /api/training/pipeline | GET | trainingApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=trainingPipeline:real |
| training-runs-list | /api/training/runs | GET | trainingApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=trainingPipeline:real |
| training-runs-create | /api/training/runs | POST | trainingApi.js / TrainingDashboard.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | yes | no explicit TS response type | capability=trainingPipeline:real |
| training-run-evaluate | /api/training/runs/:runId/evaluate | POST | trainingApi.js | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=trainingPipeline:real |
| training-moe-plan | /api/training/moe-plan | GET | trainingApi.js | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TrainingController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=trainingPipeline:real |
| evaluation-dashboard | /api/evaluation/dashboard | GET | evaluationApi.js / AiEvaluationDashboard.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (EvaluationController) | yes | yes | yes | no explicit TS response type | capability=evaluationFramework:real |
| evaluation-runs-create | /api/evaluation/runs | POST | evaluationApi.js | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (EvaluationController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=evaluationFramework:real |
| cost-optimizer-dashboard | /api/cost-optimizer/dashboard | GET | aiCommandCenterApi.js / AiCommandCenterDashboard.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (CostOptimizerController) | yes | yes | yes | no explicit TS response type | capability=costOptimization:real |
| subscriptions-current | /api/subscriptions/current | GET | configService.js / subscriptionApi.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-plans | /api/subscriptions/plans | GET | configService.js / subscriptionApi.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-lifecycle | /api/subscriptions/lifecycle | GET | subscriptionApi.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-entitlements-resolve | /api/subscriptions/entitlements/resolve | POST | subscriptionApi.js | JSON object body; likely from { requiredTier, featureId } | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-billing | /api/subscriptions/billing | GET | subscriptionApi.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-usage | /api/subscriptions/usage | GET | subscriptionApi.js / usageMeteringService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-usage-metering | /api/subscriptions/usage/metering | GET | subscriptionApi.js / usageMeteringService.js | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-usage-events | /api/subscriptions/usage/events | POST | subscriptionApi.js / usageMeteringService.js | JSON object body; likely from { requiredTier, featureId } | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-checkout | /api/subscriptions/create-checkout | POST | subscriptionApi.js | JSON object body; likely from { requiredTier, featureId } | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| subscriptions-portal | /api/subscriptions/portal | POST | subscriptionApi.js | JSON object body; likely from { requiredTier, featureId } | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (SubscriptionsController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| product-pack-map | /api/products/pack-map | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| product-builder | /api/products/builder | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| product-builder-detail | /api/products/:slug/builder | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| product-assets-list | /api/products/:slug/assets | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| asset-packs-list | /api/asset-packs | GET | productCatalogApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| commercial-plans-list | /api/commercial-plans | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| commercial-plan-detail | /api/commercial-plans/:id | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| specialties-list | /api/specialties | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| specialty-detail | /api/specialties/:slug | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| care-pathways-list | /api/care-pathways | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| care-pathway-detail | /api/care-pathways/:slug | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| agents-list | /api/agents | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| integrations-marketplace-list | /api/integrations-marketplace | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| integration-readiness | /api/integration-readiness | GET | productCatalogApi.js / CommercialPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| solution-builder-recommendations | /api/solution-builder/recommendations | POST | productCatalogApi.js / CommercialPages.jsx | JSON object body; likely from payload | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| solution-builder-apply | /api/solution-builder/apply | POST | productCatalogApi.js / CommercialPages.jsx | JSON object body; likely from payload | JSON response via response.json() | yes (ProductCatalogController) | yes | not local to client | service wrapper; loading belongs to caller | no explicit TS response type |  |
| organization-outcomes | /api/organizations/:organizationId/outcomes | GET | productCatalogApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| organization-value-tracking | /api/organizations/:organizationId/value-tracking | GET | productCatalogApi.js / OrganizationPages.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| organization-configuration-update | /api/organizations/:organizationId/configuration | PATCH | productCatalogApi.js / OrganizationPages.jsx | JSON object body; likely from payload | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| organization-integration-request | /api/organizations/:organizationId/integrations/request | POST | productCatalogApi.js / OrganizationPages.jsx | JSON object body; likely from payload | JSON response via response.json() | yes (ProductCatalogController) | yes | yes | yes | no explicit TS response type |  |
| automation-audit-list | /api/automation-audit | GET | automationAuditApi.js / AutomationAuditTrail.jsx | none/bodyless; params in path/query | JSON response; fallback shape present in client | yes (AutomationAuditController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=automationAudit:real |
| automation-audit-create | /api/automation-audit | POST | automationAuditApi.js / WorkflowAutomationBuilder.jsx | JSON object body; likely from toBackendPayload(event | JSON response; fallback shape present in client | yes (AutomationAuditController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type | capability=automationAudit:real |
| white-label-branding | /api/white-label/:tenantId | GET | whiteLabelApi.js / WhiteLabelContext.jsx | none/bodyless; params in path/query | JSON response via response.json() | yes (WhiteLabelController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| auth-login | /api/auth/login | POST | Auth.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (AuthController) | yes | yes | not found | no explicit TS response type |  |
| auth-register | /api/auth/register | POST | Auth.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (AuthController) | yes | yes | not found | no explicit TS response type |  |
| auth-verify-2fa | /api/auth/verify-2fa | POST | Auth.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (AuthController) | yes | yes | not found | no explicit TS response type |  |
| auth-magic-link | /api/auth/magic-link | POST | Auth.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (AuthController) | yes | yes | not found | no explicit TS response type |  |
| auth-dev-session | /api/auth/dev-session | POST | Auth.jsx | JSON object body; likely from payload | JSON response via apiFetchJson \`{ response, data }\` | yes (AuthController) | yes | yes | not found | no explicit TS response type |  |
| auth-identity-providers | /api/auth/identity-providers | GET | enterpriseIdentityApi.js / Settings.jsx | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (AuthController) | yes | yes | service wrapper; loading belongs to caller | no explicit TS response type |  |
| auth-biometric-config | /api/auth/biometric/config | GET | BiometricSetup.jsx | none/bodyless; params in path/query | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (BiometricController) | yes | yes | yes | no explicit TS response type |  |
| auth-biometric-enroll | /api/auth/biometric/enroll | POST | BiometricSetup.jsx | request body expected; shape not statically documented in inventory | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (BiometricController) | yes | yes | yes | no explicit TS response type |  |
| two-factor-generate | /api/two-factor/generate | GET | TwoFactorSetup.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TwoFactorController) | yes | yes | yes | no explicit TS response type |  |
| two-factor-enable | /api/two-factor/enable | POST | TwoFactorSetup.jsx | JSON object body; likely from { secret, token } | JSON response via apiFetchJson \`{ response, data }\` | yes (TwoFactorController) | yes | yes | yes | no explicit TS response type |  |
| two-factor-status | /api/two-factor/status | GET | TwoFactorSettings.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TwoFactorController) | yes | yes | yes | no explicit TS response type |  |
| two-factor-disable | /api/two-factor/disable | DELETE | TwoFactorSettings.jsx | none/bodyless; params in path/query | JSON response via apiFetchJson \`{ response, data }\` | yes (TwoFactorController) | yes | yes | yes | no explicit TS response type |  |
| crashes | /api/crashes | POST | ErrorBoundary.jsx | JSON object body; likely from payload | JSON/DTO response inferred from backend route; exact shape not typed in inventory | yes (AnalyticsController) | yes | yes | not found | no explicit TS response type |  |
| analytics-events | /api/analytics/events | POST | analyticsService.ts | JSON object body; likely from {           events: eventsToFlush,           sessionId: this.sessionId, | text response | yes (AnalyticsController) | yes | yes | not found | TypeScript file present |  |

## Raw Fetch/Axios/SWR/Query/TRPC/Supabase Call Sites

| File | Line | Call type | Method | Endpoint/function | Backend match |
| --- | ---: | --- | --- | --- | --- |
| src/components/ErrorBoundary.jsx | 31 | apiFetch | GET/default | /api/crashes | no |
| src/components/offline/OfflineSupport.jsx | 332 | apiFetch | GET/default | /api/sync | no |
| src/components/TwoFactorSettings.jsx | 60 | apiFetch | GET/default | /api/two-factor/disable | no |
| src/components/TwoFactorSettings.jsx | 30 | apiFetchJson | GET/default | /api/two-factor/status | TwoFactorController |
| src/contexts/TenantContext.jsx | 103 | apiFetch | GET/default | /api/tenant/context | TenantContextController |
| src/contexts/WorkspaceContext.jsx | 202 | apiFetch | GET/default | /api/workspaces/context | WorkspacesController |
| src/contexts/WorkspaceContext.jsx | 267 | apiFetch | GET/default | /api/workspaces/active | no |
| src/db/offline.js | 139 | apiFetchJson | GET/default | /api/sync | no |
| src/pages/AnalyticsDashboard.jsx | 41 | apiFetchJson | GET/default | /api/analytics/metrics | AnalyticsController |
| src/pages/AuditLogs.jsx | 66 | apiFetch | GET/default | /api/audit/logs?${params.toString()} | AuditController |
| src/pages/AuditLogs.jsx | 87 | apiFetch | GET/default | /api/audit/verify-integrity | AuditController |
| src/pages/AuditLogs.jsx | 105 | apiFetch | GET/default | /api/audit/statistics | AuditController |
| src/pages/Auth.jsx | 134 | apiFetch | GET/default | /api/auth/magic-link | no |
| src/pages/Auth.jsx | 101 | apiFetchJson | GET/default | /api/auth/verify-2fa | no |
| src/pages/BiometricSetup.jsx | 65 | apiAxios | GET | /api/auth/biometric/config | BiometricController |
| src/pages/BiometricSetup.jsx | 74 | apiAxios | GET | /api/auth/biometric/stats | BiometricController |
| src/pages/BiometricSetup.jsx | 99 | apiAxios | POST | /api/auth/biometric/enroll | BiometricController |
| src/pages/BiometricSetup.jsx | 160 | apiAxios | POST | /api/auth/biometric/verify | BiometricController |
| src/pages/BiometricSetup.jsx | 192 | apiAxios | DELETE | /api/auth/biometric/disable/${deviceId} | no |
| src/pages/team/TeamManagement.jsx | 102 | apiFetch | GET/default | /api/team/users/${selectedUser.id} | no |
| src/pages/team/TeamManagement.jsx | 133 | apiFetch | GET/default | /api/team/users/${userId} | no |
| src/pages/team/TeamManagement.jsx | 155 | apiFetch | GET/default | /api/team/invite | no |
| src/pages/team/TeamManagement.jsx | 49 | apiFetchJson | GET/default | /api/team/users | no |
| src/pages/TwoFactorSetup.jsx | 36 | apiFetchJson | GET/default | /api/two-factor/generate | TwoFactorController |
| src/pages/TwoFactorSetup.jsx | 65 | apiFetchJson | GET/default | /api/two-factor/enable | no |
| src/services/advancedRecommendationService.js | 85 | apiFetch | GET/default | /api/chat/intent-classify | no |
| src/services/aiCommandCenterApi.js | 81 | apiFetchJson | GET/default | /cost-optimizer/dashboard | external/dynamic |
| src/services/analyticsService.ts | 153 | apiFetch | GET/default | /api/analytics/events | no |
| src/services/auditApi.js | 6 | apiFetch | GET/default | /api/audit/my-logs?${params.toString()} | AuditController |
| src/services/auditApi.js | 33 | apiFetch | GET/default | /api/audit/phi-access${suffix} | no |
| src/services/clinicalChatService.js | 70 | apiFetch | GET/default | /api/chat/message | no |
| src/services/clinicalChatService.js | 86 | apiFetch | GET/default | /api/chat/suggest-action | no |
| src/services/clinicalChatService.js | 102 | apiFetch | GET/default | /api/chat/analyze-vitals | no |
| src/services/clinicalContentApi.js | 44 | apiFetchJson | GET/default | /api/protocols/categories | ProtocolController |
| src/services/clinicalIntelligenceApi.js | 15 | apiFetch | GET/default | /api/clinical-intelligence/ambient-scribe/generate | no |
| src/services/clinicalIntelligenceApi.js | 43 | apiFetch | GET/default | /api/clinical-intelligence/guideline-rag/query | no |
| src/services/clinicalIntelligenceApi.js | 71 | apiFetch | GET/default | /api/clinical-intelligence/differential-ai/generate | no |
| src/services/clinicalIntelligenceApi.js | 99 | apiFetch | GET/default | /api/clinical-intelligence/timeline-ai/generate | no |
| src/services/clinicalIntelligenceApi.js | 127 | apiFetch | GET/default | /api/clinical-intelligence/patient-summary-ai/generate | no |
| src/services/clinicalIntelligenceApi.js | 155 | apiFetch | GET/default | /api/clinical-intelligence/order-set-ai/generate | no |
| src/services/clinicalIntelligenceApi.js | 194 | apiFetch | GET/default | /api/clinical-intelligence/ai-explainability/trace${queryString(params)} | no |
| src/services/clinicalIntelligenceApi.js | 224 | apiFetch | GET/default | /api/clinical-intelligence/clinical-audit/execution-logs${queryString(params)} | no |
| src/services/clinicalToolsApi.js | 158 | apiFetch | GET/default | /api/tools/${encodeURIComponent(toolId)}/validate | no |
| src/services/complianceApi.js | 22 | apiFetch | GET/default | /api/compliance/consent | ComplianceController |
| src/services/complianceApi.js | 73 | apiFetch | GET/default | /api/compliance/consent | ComplianceController |
| src/services/complianceApi.js | 98 | apiFetch | GET/default | /api/compliance/export | no |
| src/services/complianceApi.js | 119 | apiFetch | GET/default | /api/compliance/delete-account | no |
| src/services/emergencyAnalyticsApi.js | 192 | apiFetch | GET/default | /api/emergency/shift/report/export | no |
| src/services/enterpriseIdentityApi.js | 9 | apiFetch | GET/default | /api/auth/identity-providers | AuthController |
| src/services/evaluationApi.js | 296 | apiFetchJson | GET/default | /evaluation/dashboard | external/dynamic |
| src/services/evaluationApi.js | 316 | apiFetchJson | GET/default | /evaluation/runs | external/dynamic |
| src/services/export/ExportService.js | 136 | fetch | GET/default | ${this.apiBaseUrl}/exports/pdf | external/dynamic |
| src/services/export/ExportService.js | 181 | fetch | GET/default | ${this.apiBaseUrl}/exports/excel | external/dynamic |
| src/services/export/ExportService.js | 234 | fetch | GET/default | ${this.apiBaseUrl}/reports/generate | external/dynamic |
| src/services/export/ExportService.js | 283 | fetch | GET/default | ${this.apiBaseUrl}/reports/schedule | external/dynamic |
| src/services/export/ExportService.js | 359 | fetch | GET/default | ${this.apiBaseUrl}/reports/schedule/${reportId} | external/dynamic |
| src/services/notifications/NotificationService.js | 38 | fetch | GET/default | ${this.apiBaseUrl}/notifications/preferences | external/dynamic |
| src/services/notifications/NotificationService.js | 223 | fetch | GET/default | ${this.apiBaseUrl}/notifications/send/${channel} | external/dynamic |
| src/services/notifications/NotificationService.js | 350 | fetch | GET/default | ${this.apiBaseUrl}/notifications/preferences | external/dynamic |
| src/services/NotificationService.js | 67 | apiFetch | GET/default | /api/notifications/devices/register | no |
| src/services/NotificationService.js | 101 | apiFetch | GET/default | /api/notifications?limit=${limit} | NotificationController |
| src/services/NotificationService.js | 123 | apiFetch | GET/default | /api/notifications/unread/count | NotificationController |
| src/services/NotificationService.js | 146 | apiFetch | GET/default | /api/notifications/read-all | no |
| src/services/NotificationService.js | 170 | apiFetch | GET/default | /api/notifications/devices | NotificationController |
| src/services/NotificationService.js | 197 | apiFetch | GET/default | /api/notifications/devices/${encodeURIComponent(deviceIdentifier)} | no |
| src/services/NotificationService.js | 221 | apiFetch | GET/default | /api/notifications/${notificationId}/read | no |
| src/services/NotificationService.js | 244 | apiFetch | GET/default | /api/notifications/${notificationId} | no |
| src/services/NotificationService.js | 267 | apiFetch | GET/default | /api/notifications/preferences | NotificationController |
| src/services/NotificationService.js | 289 | apiFetch | GET/default | /api/notifications/preferences | NotificationController |
| src/services/NotificationService.js | 314 | apiFetch | GET/default | /api/notifications/preferences/toggle-all | no |
| src/services/NotificationService.js | 393 | apiFetch | GET/default | /api/notifications/test | no |
| src/services/platformAssetsApi.js | 5 | apiFetch | GET/default | /api/platform/context | PlatformAssetsController |
| src/services/platformAssetsApi.js | 19 | apiFetch | GET/default | /api/platform/assets${qs ? | no |
| src/services/platformAssetsApi.js | 25 | apiFetch | GET/default | /api/platform/role-profiles | PlatformAssetsController |
| src/services/platformAssetsApi.js | 35 | apiFetch | GET/default | /api/platform/packs${qs ? | no |
| src/services/platformAssetsApi.js | 44 | apiFetch | GET/default | /api/platform/departments${qs ? | no |
| src/services/platformAssetsApi.js | 53 | apiFetch | GET/default | /api/platform/departments/${encodeURIComponent(departmentId)}${qs ? | no |
| src/services/platformAssetsApi.js | 64 | apiFetch | GET/default | /api/platform/service-lines${qs ? | no |
| src/services/platformAssetsApi.js | 73 | apiFetch | GET/default | /api/platform/service-lines/${encodeURIComponent(serviceLineId)}${qs ? | no |
| src/services/platformAssetsApi.js | 86 | apiFetch | GET/default | /api/platform/marketplace/packs${qs ? | no |
| src/services/platformAssetsApi.js | 95 | apiFetch | GET/default | /api/platform/marketplace/packs/${encodeURIComponent(packId)}${qs ? | no |
| src/services/platformAssetsApi.js | 103 | apiFetch | GET/default | /api/platform/organizations/${organizationId}/packs/${packId}/install | no |
| src/services/platformAssetsApi.js | 112 | apiFetch | GET/default | /api/platform/organizations/${organizationId}/packs/${packId}/remove | no |
| src/services/platformAssetsApi.js | 121 | apiFetch | GET/default | /api/platform/assets/${assetId}/lifecycle | no |
| src/services/platformAssetsApi.js | 137 | apiFetch | GET/default | /api/platform/governance-registry${qs ? | no |
| src/services/platformAssetsApi.js | 144 | apiFetch | GET/default | /api/platform/digital-twin${qs} | no |
| src/services/platformAssetsApi.js | 150 | apiFetch | GET/default | /api/platform/organizations/${organizationId}/analytics | no |
| src/services/platformAssetsApi.js | 157 | apiFetch | GET/default | /api/platform/organizations/${organizationId}/customer-success${qs} | no |
| src/services/platformAssetsApi.js | 165 | apiFetch | GET/default | /api/organizations | OrganizationsController |
| src/services/platformAssetsApi.js | 171 | apiFetch | GET/default | /api/organizations | OrganizationsController |
| src/services/platformAssetsApi.js | 181 | apiFetch | GET/default | /api/organizations/${organizationId} | no |
| src/services/platformAssetsApi.js | 191 | apiFetch | GET/default | /api/platform/users/me/assets | PlatformAssetsController |
| src/services/platformAssetsApi.js | 197 | apiFetch | GET/default | /api/platform/users/me/recommendations?limit=${limit} | PlatformAssetsController |
| src/services/platformAssetsApi.js | 203 | apiFetch | GET/default | /api/organizations/current | OrganizationsController |
| src/services/platformAssetsApi.js | 209 | apiFetch | GET/default | /api/organizations/current/engine | OrganizationsController |
| src/services/platformAssetsApi.js | 215 | apiFetch | GET/default | /api/organizations/${organizationId}/engine | no |
| src/services/platformAssetsApi.js | 221 | apiFetch | GET/default | /api/organizations/${organizationId}/settings | no |
| src/services/platformAssetsApi.js | 231 | apiFetch | GET/default | /api/organizations/${organizationId}/tenant-admin | no |
| src/services/platformAssetsApi.js | 237 | apiFetch | GET/default | /api/organizations/${organizationId}/tenant-admin | no |
| src/services/platformAssetsApi.js | 247 | apiFetch | GET/default | /api/organizations/${organizationId}/feature-flags | no |
| src/services/platformAssetsApi.js | 253 | apiFetch | GET/default | /api/organizations/${organizationId}/feature-flags | no |
| src/services/platformAssetsApi.js | 263 | apiFetch | GET/default | /api/platform/me/role-profile | no |
| src/services/platformGovernanceApi.js | 130 | apiFetchJson | GET/default | /api/security/evaluate | no |
| src/services/platformSystemsApi.js | 15 | apiFetch | GET/default | /api/platform-systems/capabilities/${capabilityId} | no |
| src/services/platformSystemsApi.js | 42 | apiFetch | GET/default | /api/platform-systems/packs/${encodeURIComponent(pack)} | no |
| src/services/productCatalogApi.js | 5 | apiFetch | GET/default | /api/products/pack-map | ProductCatalogController |
| src/services/productCatalogApi.js | 12 | apiFetch | GET/default | /api/products/builder${qs} | no |
| src/services/productCatalogApi.js | 19 | apiFetch | GET/default | /api/products/${encodeURIComponent(slug)}/builder${qs} | no |
| src/services/productCatalogApi.js | 26 | apiFetch | GET/default | /api/asset-packs${qs} | no |
| src/services/productCatalogApi.js | 32 | apiFetch | GET/default | /api/products | ProductCatalogController |
| src/services/productCatalogApi.js | 38 | apiFetch | GET/default | /api/products/${encodeURIComponent(slug)} | no |
| src/services/productCatalogApi.js | 45 | apiFetch | GET/default | /api/products/${encodeURIComponent(slug)}/assets${qs} | no |
| src/services/productCatalogApi.js | 51 | apiFetch | GET/default | /api/commercial-plans | ProductCatalogController |
| src/services/productCatalogApi.js | 57 | apiFetch | GET/default | /api/commercial-plans/${encodeURIComponent(id)} | no |
| src/services/productCatalogApi.js | 63 | apiFetch | GET/default | /api/specialties | ProductCatalogController |
| src/services/productCatalogApi.js | 69 | apiFetch | GET/default | /api/specialties/${encodeURIComponent(slug)} | no |
| src/services/productCatalogApi.js | 75 | apiFetch | GET/default | /api/care-pathways | ProductCatalogController |
| src/services/productCatalogApi.js | 81 | apiFetch | GET/default | /api/care-pathways/${encodeURIComponent(slug)} | no |
| src/services/productCatalogApi.js | 87 | apiFetch | GET/default | /api/agents | ProductCatalogController |
| src/services/productCatalogApi.js | 94 | apiFetch | GET/default | /api/integrations-marketplace${qs} | no |
| src/services/productCatalogApi.js | 100 | apiFetch | GET/default | /api/integration-readiness | ProductCatalogController |
| src/services/productCatalogApi.js | 107 | apiFetch | GET/default | /api/dependency-graph${qs} | no |
| src/services/productCatalogApi.js | 113 | apiFetch | GET/default | /api/solution-builder/recommendations | no |
| src/services/productCatalogApi.js | 123 | apiFetch | GET/default | /api/solution-builder/apply | no |
| src/services/productCatalogApi.js | 133 | apiFetch | GET/default | /api/maturity-assessments/questionnaire | ProductCatalogController |
| src/services/productCatalogApi.js | 139 | apiFetch | GET/default | /api/maturity-assessments | no |
| src/services/productCatalogApi.js | 149 | apiFetch | GET/default | /api/organizations/onboarding | no |
| src/services/productCatalogApi.js | 159 | apiFetch | GET/default | /api/organizations/${organizationId}/outcomes | no |
| src/services/productCatalogApi.js | 166 | apiFetch | GET/default | /api/organizations/${encodeURIComponent(organizationId)}/value-tracking${qs} | no |
| src/services/productCatalogApi.js | 174 | apiFetch | GET/default | /api/organizations/${organizationId}/configuration | no |
| src/services/productCatalogApi.js | 184 | apiFetch | GET/default | /api/organizations/${organizationId}/integrations/request | no |
| src/services/profileApi.js | 21 | apiFetch | GET/default | /api/users/profile | UsersController |
| src/services/saasHealthApi.js | 29 | apiFetchJson | GET/default | /api/saas-health | SaasHealthController |
| src/services/subscriptionApi.js | 17 | apiFetch | GET/default | /api/subscriptions/plans | SubscriptionsController |
| src/services/subscriptionApi.js | 30 | apiFetch | GET/default | /api/subscriptions/current | SubscriptionsController |
| src/services/subscriptionApi.js | 43 | apiFetch | GET/default | /api/subscriptions/lifecycle | SubscriptionsController |
| src/services/subscriptionApi.js | 58 | apiFetch | GET/default | /api/subscriptions/entitlements/resolve | no |
| src/services/subscriptionApi.js | 75 | apiFetch | GET/default | /api/subscriptions/billing | SubscriptionsController |
| src/services/subscriptionApi.js | 88 | apiFetch | GET/default | /api/subscriptions/usage?period=${encodeURIComponent(period)} | SubscriptionsController |
| src/services/subscriptionApi.js | 101 | apiFetch | GET/default | /api/subscriptions/usage/metering?period=${encodeURIComponent(period)} | SubscriptionsController |
| src/services/subscriptionApi.js | 118 | apiFetch | GET/default | /api/subscriptions/usage/events | no |
| src/services/subscriptionApi.js | 137 | apiFetch | GET/default | /api/subscriptions/create-checkout | no |
| src/services/subscriptionApi.js | 154 | apiFetch | GET/default | /api/subscriptions/portal | no |
| src/services/syncService.js | 167 | apiFetch | GET/default | /api/chat/messages | no |
| src/services/syncService.js | 234 | apiFetch | GET/default | /api/chat/conversations | no |
| src/services/syncService.js | 298 | apiFetch | GET/default | /api/tools/results | no |
| src/services/syncService.js | 347 | apiFetch | GET/default | /api/notifications/${notification.serverId}/read | no |
| src/services/syncService.js | 391 | apiFetch | GET/default | /api/audit/sync | no |
| src/services/syncService.js | 438 | apiFetch | GET/default | /api/users/profile | UsersController |
| src/services/syncService.js | 453 | apiFetch | GET/default | /api/notifications?limit=50 | NotificationController |
| src/services/tenantIsolationApi.js | 5 | apiFetchJson | GET/default | /api/tenant/isolation-audit | TenantContextController |
| src/services/trainingApi.js | 100 | apiFetchJson | GET/default | /training/dashboard | external/dynamic |
| src/services/trainingApi.js | 120 | apiFetchJson | GET/default | /training/runs | external/dynamic |
| src/services/whiteLabelApi.js | 8 | apiFetch | GET/default | /api/white-label/${encodeURIComponent(tenantId)} | no |
| scan note | N/A | useSWR | N/A | No useSWR call sites found. | N/A |
| scan note | N/A | useQuery | N/A | No useQuery call sites found. | N/A |
| scan note | N/A | trpc | N/A | No trpc call sites found. | N/A |
| scan note | N/A | supabase | N/A | No supabase call sites found. | N/A |

## Frontend Calls Without Backends

| ID | Method | Path | Client | Capability | Status | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| chat-messages-sync | POST | /api/chat/messages | syncService.js | chatPersistence:disabled | gated stub noted | Medium: disabled/gated, ensure UI guard remains |
| chat-conversations-sync | POST | /api/chat/conversations | syncService.js | chatPersistence:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| tools-share-results | POST | /api/tools/share-results | ToolResultShare.jsx | toolsShareResults:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| notifications-stream | GET | /api/notifications/stream | NotificationService.js | notificationStream:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| notifications-send-channel | POST | /api/notifications/send/:channel | notifications/NotificationService.js | notificationSendChannel:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| team-users | GET | /api/team/users | TeamManagement.jsx | teamManagement:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| team-user-update | PUT | /api/team/users/:id | TeamManagement.jsx | teamManagement:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| team-user-delete | DELETE | /api/team/users/:id | TeamManagement.jsx | teamManagement:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| team-invite | POST | /api/team/invite | TeamManagement.jsx | teamManagement:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| bulk-sync | POST | /api/sync | offline.js / OfflineSupport.jsx | bulkSync:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| clinical-alerts-stream | GET | /api/clinical/alerts/stream | clinicalAlertNotifications.js | clinicalAlertsStream:disabled | gated stub noted | Medium: disabled/gated, ensure UI guard remains |
| exports-pdf | POST | /api/exports/pdf | export/ExportService.js | exportsPdf:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| exports-excel | POST | /api/exports/excel | export/ExportService.js | exportsExcel:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| reports-generate | POST | /api/reports/generate | export/ExportService.js | reportsGenerate:disabled | gated/disabled stub | Medium: disabled/gated, ensure UI guard remains |
| reports-schedule-create | POST | /api/reports/schedule | export/ExportService.js | reportsSchedule:disabled | gated stub noted | Medium: disabled/gated, ensure UI guard remains |
| reports-schedule-cancel | DELETE | /api/reports/schedule/:reportId | export/ExportService.js | reportsSchedule:disabled | gated stub noted | Medium: disabled/gated, ensure UI guard remains |

## Backend Endpoints Without Frontend Consumers

| Method | Path | Controller | Purpose | Data it returns | Exposure policy |
| --- | --- | --- | --- | --- | --- |
| GET | /api/auth/verify-email | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/google | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/google/callback | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/linkedin | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/linkedin/callback | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/oidc | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/saml | AuthController | Auth endpoint | JSON DTO | unclassified |
| GET | /api/auth/me | AuthController | Auth endpoint | JSON DTO | unclassified |
| DELETE | /api/auth/biometric/delete/:deviceId | BiometricController | expose-recommended: Device management | mutation result / status DTO | expose-recommended -> BiometricSetup.jsx |
| GET | /api/auth/biometric/available | BiometricController | expose-recommended: Capability probe | JSON DTO | expose-recommended -> BiometricSetup.jsx |
| GET | /api/workspaces/:workspaceId | WorkspacesController | deferred: Workspace detail route for future workspace settings | JSON DTO | deferred |
| GET | /api/workspaces/:workspaceId/members | WorkspacesController | deferred: Workspace member management surface pending | JSON DTO | deferred |
| POST | /api/workspaces/:workspaceId/invitations | WorkspacesController | deferred: Workspace invitation UX pending | mutation result / status DTO | deferred |
| GET | /api/workspaces/:workspaceId/tools | WorkspacesController | deferred: Workspace tool preferences currently use aggregate settings | JSON DTO | deferred |
| PATCH | /api/workspaces/:workspaceId/tools | WorkspacesController | deferred: Workspace tool preference editor pending | mutation result / status DTO | deferred |
| GET | /api/organizations | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| POST | /api/organizations | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| GET | /api/organizations/:organizationId | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| PATCH | /api/organizations/:organizationId | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| GET | /api/organizations/current | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| POST | /api/organizations/onboarding | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| GET | /api/products | ProductCatalogController | ProductCatalog endpoint | JSON DTO | unclassified |
| GET | /api/products/:slug | ProductCatalogController | ProductCatalog endpoint | JSON DTO | unclassified |
| GET | /api/specialties/:slug/assets | ProductCatalogController | ProductCatalog endpoint | JSON DTO | unclassified |
| GET | /api/maturity-assessments/questionnaire | ProductCatalogController | ProductCatalog endpoint | JSON DTO | unclassified |
| POST | /api/maturity-assessments | ProductCatalogController | ProductCatalog endpoint | mutation result / status DTO | unclassified |
| POST | /api/platform/users/me/pinned-assets | PlatformAssetsController | PlatformAssets endpoint | mutation result / status DTO | unclassified |
| POST | /api/platform/users/me/hidden-assets | PlatformAssetsController | PlatformAssets endpoint | mutation result / status DTO | unclassified |
| GET | /api/platform/assets/:assetId | PlatformAssetsController | PlatformAssets endpoint | JSON DTO | unclassified |
| GET | /api/platform/packs/:packId | PlatformAssetsController | PlatformAssets endpoint | JSON DTO | unclassified |
| GET | /api/platform/role-profiles/:id | PlatformAssetsController | PlatformAssets endpoint | JSON DTO | unclassified |
| GET | /api/platform/organizations/:organizationId/entitlements | PlatformAssetsController | PlatformAssets endpoint | JSON DTO | unclassified |
| POST | /api/platform/organizations/:organizationId/packs/:packId/install | PlatformAssetsController | PlatformAssets endpoint | mutation result / status DTO | unclassified |
| POST | /api/platform/organizations/:organizationId/packs/:packId/remove | PlatformAssetsController | PlatformAssets endpoint | mutation result / status DTO | unclassified |
| GET | /api/activity/me | UserActivityController | deferred: Profile activity dashboard pending | JSON DTO | deferred |
| GET | /api/activity/me/summary | UserActivityController | UserActivity endpoint | aggregate dashboard/summary JSON | unclassified |
| GET | /api/activity/workspaces/:workspaceId | UserActivityController | deferred: Workspace activity surface pending | JSON DTO | deferred |
| GET | /api/personalization/me/recommendations | PersonalizationController | deferred: Personalization recommendations UI pending | JSON DTO | deferred |
| DELETE | /api/personalization/me/saved-prompts/:promptId | PersonalizationController | deferred: Saved prompt deletion UI pending | mutation result / status DTO | deferred |
| POST | /api/artifacts | ArtifactsController | deferred: Artifact authoring is not exposed in dashboard yet | mutation result / status DTO | deferred |
| GET | /api/artifacts/:id | ArtifactsController | deferred: Artifact detail route is not linked yet | JSON DTO | deferred |
| GET | /api/artifacts/:id/versions | ArtifactsController | Artifacts endpoint | JSON DTO | unclassified |
| PATCH | /api/artifacts/:id | ArtifactsController | deferred: Artifact editing is not exposed in dashboard yet | mutation result / status DTO | deferred |
| GET | /api/memory/short | MemoryController | deferred: Memory dashboard uses aggregate route | JSON DTO | deferred |
| GET | /api/memory/long | MemoryController | deferred: Memory dashboard uses aggregate route | JSON DTO | deferred |
| GET | /api/memory/clinical | MemoryController | Memory endpoint | JSON DTO | unclassified |
| POST | /api/two-factor/verify | TwoFactorController | backend-only: Used during login challenge | mutation result / status DTO | backend-only |
| GET | /api/subscriptions/config | SubscriptionsController | deferred: Stripe config for checkout UI | JSON DTO | deferred |
| POST | /api/subscriptions/webhook | SubscriptionsController | backend-only: Stripe webhook | mutation result / status DTO | backend-only -> clinicalChatService.js |
| POST | /api/chat/message-3d | ChatController | Chat endpoint | mutation result / status DTO | unclassified |
| POST | /api/tools/execute | ToolOrchestratorController | deferred: Batch execute; UI uses per-id execute | mutation result / status DTO | deferred |
| POST | /api/tool-calling/execute | ToolCallingController | deferred: Chat delegates server-side; direct UI not exposed yet | mutation result / status DTO | deferred |
| GET | /api/tool-calling/catalog | ToolCallingController | deferred: Internal tool-calling contract catalog | JSON DTO | deferred |
| GET | /api/tool-calling/resolve | ToolCallingController | deferred: Server-side catalog launch helper | JSON DTO | deferred |
| GET | /api/tool-calling/logs | ToolCallingController | deferred: Operational debugging endpoint | JSON DTO | deferred |
| POST | /api/cost-optimizer/route | CostOptimizerController | CostOptimizer endpoint | mutation result / status DTO | unclassified |
| GET | /api/evaluation/metrics | EvaluationController | deferred: Evaluation dashboard currently receives metric definitions from aggregate dashboard payload | JSON DTO | deferred |
| GET | /api/evaluation/runs | EvaluationController | deferred: Evaluation dashboard currently reads recent runs from aggregate dashboard payload | JSON DTO | deferred |
| GET | /api/drugs/categories | DrugController | expose-recommended: Drug reference | JSON DTO | expose-recommended -> clinicalContentApi.js |
| GET | /api/drugs/:id | DrugController | expose-recommended: Drug detail | JSON DTO | expose-recommended -> clinicalContentApi.js |
| POST | /api/drugs | DrugController | deferred: Admin content API | mutation result / status DTO | deferred -> Protocols.jsx |
| PUT | /api/drugs/:id | DrugController | Drug endpoint | mutation result / status DTO | unclassified |
| DELETE | /api/drugs/:id | DrugController | Drug endpoint | mutation result / status DTO | unclassified |
| GET | /api/protocols/:id | ProtocolController | Protocol endpoint | JSON DTO | unclassified |
| POST | /api/protocols | ProtocolController | deferred: Admin content API | mutation result / status DTO | deferred -> profile / AuditLogs.jsx |
| PUT | /api/protocols/:id | ProtocolController | Protocol endpoint | mutation result / status DTO | unclassified |
| DELETE | /api/protocols/:id | ProtocolController | Protocol endpoint | mutation result / status DTO | unclassified |
| POST | /api/clinical/alerts/:alertId/acknowledge | ClinicalAlertsController | ClinicalAlerts endpoint | mutation result / status DTO | unclassified |
| POST | /api/clinical/alerts/:alertId/dismiss | ClinicalAlertsController | ClinicalAlerts endpoint | mutation result / status DTO | unclassified |
| GET | /api/audit/my-logs | AuditController | Audit endpoint | JSON DTO | unclassified |
| GET | /api/audit/phi-access | AuditController | deferred: Compliance officer view | JSON DTO | deferred -> complianceApi.js |
| POST | /api/compliance/export | ComplianceController | Compliance endpoint | mutation result / status DTO | unclassified |
| DELETE | /api/compliance/delete-account | ComplianceController | expose-recommended: Account deletion | mutation result / status DTO | expose-recommended -> complianceApi.js |
| POST | /api/health | AnalyticsController | backend-only: Client health ping (distinct from GET /health) | mutation result / status DTO | backend-only |
| POST | /api/ai/query | AiController | backend-only: Invoked via chat pipeline | mutation result / status DTO | backend-only |
| POST | /api/ai/structured | AiController | Ai endpoint | mutation result / status DTO | unclassified |
| GET | /api/ai/usage | AiController | Ai endpoint | JSON DTO | unclassified |
| GET | /api/audit/events | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/audit/events/:eventId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/audit/export | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/audit/integrity/status | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/audit/integrity/verify | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/audit/patients/:patientId/access | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/audit/runs/:runId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/fleet/alerts | FleetController | Fleet endpoint | JSON DTO | unclassified |
| GET | /api/fleet/snapshot | FleetController | Fleet endpoint | JSON DTO | unclassified |
| GET | /api/governance/ai-security/incidents | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/ai-security/incidents/:incidentId/review | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| POST | /api/governance/ai-security/evaluate | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/ai-security/model-access | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| PUT | /api/governance/ai-security/model-access/:policyId | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/ai-security/rules | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| PUT | /api/governance/ai-security/rules/:ruleId | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/ai-security/summary | PlatformSystemsController | PlatformSystems endpoint | aggregate dashboard/summary JSON | unclassified |
| GET | /api/governance/clinical/policies | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/clinical/policies | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| POST | /api/governance/clinical/policies/:policyId/approve | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| PUT | /api/governance/clinical/policies/:policyId | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/clinical/readiness | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/governance/clinical/release-gates | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/clinical/release-gates/:gateId/decision | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/clinical/safety-findings | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/clinical/safety-findings/:findingId/review | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/equity/cohorts | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/equity/cohorts | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/equity/findings | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/equity/findings/:findingId/review | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/equity/metrics | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/equity/reports | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/equity/summary | PlatformSystemsController | PlatformSystems endpoint | aggregate dashboard/summary JSON | unclassified |
| GET | /api/governance/regulatory/capabilities | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/governance/regulatory/capabilities/:capabilityId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/regulatory/capabilities/:capabilityId/approve | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| PUT | /api/governance/regulatory/capabilities/:capabilityId/classification | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/regulatory/evidence/:capabilityId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/regulatory/evidence/:capabilityId/artifacts | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/validation/release-gates/:capabilityId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/governance/validation/runs/:runId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/validation/runs | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| POST | /api/governance/validation/runs/:runId/approve | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/validation/scenarios | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/governance/validation/scenarios | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/governance/validation/synthetic-patients | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/hospital-map/devices/:deviceId | HospitalMapController | HospitalMap endpoint | JSON DTO | unclassified |
| GET | /api/hospital-map/rooms | HospitalMapController | HospitalMap endpoint | JSON DTO | unclassified |
| GET | /api/hospital-map/search | HospitalMapController | HospitalMap endpoint | JSON DTO | unclassified |
| GET | /api/integrations/hl7/messages/quarantine | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/integrations/hl7/messages/:messageId/replay-preview | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/medical-iot/snapshot | TelemetryController | Telemetry endpoint | JSON DTO | unclassified |
| GET | /api/operations/deployments/current | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/operations/health | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/operations/incidents | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/operations/incidents/:incidentId/review | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/operations/observability/ai-runs | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/operations/observability/integrations | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/operations/observability/orchestrator | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/operations/observability/summary | PlatformSystemsController | PlatformSystems endpoint | aggregate dashboard/summary JSON | unclassified |
| GET | /api/operations/service-health | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/platform-governance/consent/:patientId | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| POST | /api/platform-governance/consent/:patientId/:scope | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| POST | /api/platform-governance/gate/evaluate | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| GET | /api/platform-governance/observability | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| POST | /api/platform-governance/privacy/:patientId/:requestType | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| GET | /api/platform-governance/review/items | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| POST | /api/platform-governance/review/items | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| POST | /api/platform-governance/review/items/:itemId/decision | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| GET | /api/platform-governance/security/events | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| GET | /api/platform-governance/source-provenance/:sourceId | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| GET | /api/platform-governance/summary | PlatformGovernanceController | PlatformGovernance endpoint | aggregate dashboard/summary JSON | unclassified |
| GET | /api/platform-governance/synthetic/fhir | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| GET | /api/platform-governance/synthetic/hl7 | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| GET | /api/platform-governance/validation/scenarios | PlatformGovernanceController | PlatformGovernance endpoint | JSON DTO | unclassified |
| POST | /api/platform-governance/validation/scenarios | PlatformGovernanceController | PlatformGovernance endpoint | mutation result / status DTO | unclassified |
| GET | /api/privacy/requests | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/privacy/requests/:requestId/review | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/profile/me/workspaces | UserProfileController | UserProfile endpoint | JSON DTO | unclassified |
| PATCH | /api/profile/me/workspaces/active | UserProfileController | UserProfile endpoint | mutation result / status DTO | unclassified |
| GET | /api/review/items | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/review/items | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/review/items/:itemId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| POST | /api/review/items/:itemId/assign | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| POST | /api/review/items/:itemId/comments | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| POST | /api/review/items/:itemId/decision | PlatformSystemsController | PlatformSystems endpoint | mutation result / status DTO | unclassified |
| GET | /api/simulation/scenarios | SimulationController | Simulation endpoint | JSON DTO | unclassified |
| GET | /api/simulation/scenarios/:id | SimulationController | Simulation endpoint | JSON DTO | unclassified |
| POST | /api/simulation/runs | SimulationController | Simulation endpoint | mutation result / status DTO | unclassified |
| POST | /api/simulation/runs/:id/steps | SimulationController | Simulation endpoint | mutation result / status DTO | unclassified |
| POST | /api/simulation/runs/:id/complete | SimulationController | Simulation endpoint | mutation result / status DTO | unclassified |
| GET | /api/simulation/outcomes | SimulationController | Simulation endpoint | JSON DTO | unclassified |
| GET | /api/simulation/recommendations | SimulationController | Simulation endpoint | JSON DTO | unclassified |
| GET | /api/source-provenance/:sourceId | PlatformSystemsController | PlatformSystems endpoint | JSON DTO | unclassified |
| GET | /api/ai/organizations/:organizationId/usage | AIController | AI endpoint | JSON DTO | unclassified |
| GET | /api/organizations/current/engine | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| GET | /api/organizations/:organizationId/engine | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| GET | /api/organizations/:organizationId/feature-flags | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| PATCH | /api/organizations/:organizationId/feature-flags | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| PATCH | /api/organizations/:organizationId/settings | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| GET | /api/organizations/:organizationId/tenant-admin | OrganizationsController | Organizations endpoint | JSON DTO | unclassified |
| PATCH | /api/organizations/:organizationId/tenant-admin | OrganizationsController | Organizations endpoint | mutation result / status DTO | unclassified |
| PATCH | /api/organizations/:organizationId/commercial-plan | ProductCatalogController | ProductCatalog endpoint | mutation result / status DTO | unclassified |
| GET | /api/platform/organizations/:organizationId/customer-success | PlatformAssetsController | PlatformAssets endpoint | JSON DTO | unclassified |
| POST | /api/subscriptions/downgrade | SubscriptionsController | Subscriptions endpoint | mutation result / status DTO | unclassified |
| POST | /api/subscriptions/trial/convert | SubscriptionsController | Subscriptions endpoint | mutation result / status DTO | unclassified |
| POST | /api/subscriptions/upgrade | SubscriptionsController | Subscriptions endpoint | mutation result / status DTO | unclassified |
| GET | /api/workspaces/context | WorkspacesController | Workspaces endpoint | JSON DTO | unclassified |
| GET | /api/workspaces/:workspaceId/context | WorkspacesController | Workspaces endpoint | JSON DTO | unclassified |
| GET | /api/metrics | MetricsController | Metrics endpoint | JSON DTO | unclassified |

## Controller Inventory Drift

| Drift type | Method | Path | Controller/file | Impact |
| --- | --- | --- | --- | --- |
| none | N/A | N/A | N/A | Controller scan and backend inventory agree. |

## Broken Data Flows

| File | Line | Issue | Evidence | Recommended action |
| --- | ---: | --- | --- | --- |
| src/App.jsx | 545 | Route exists but returns a future-release stub rather than backend data. | FutureReleaseStub | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/components/PermissionGate.jsx | 41 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/config/backendApiCapabilities.js | 27 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/contexts/TenantContext.jsx | 104 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/contexts/WorkspaceContext.jsx | 203 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/artifactIntelligence.js | 131 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/capabilityExposureMatrix.js | 12 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/duplicateSystemAudit.js | 621 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/e2eManualQaChecklist.js | 55 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/emergencyOperatingSystem.js | 642 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/emergencyPatternCatalog.js | 14 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/platformSystems.js | 39 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/productPackagingAudit.js | 438 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/segmentInventory.js | 17 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/sourceCodeToolDiscovery.js | 742 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/testHelpers/fleetToolsTestFixtures.js | 88 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/data/testHelpers/pr4aTestFixtures.js | 73 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/workflowAutomationBuilder.js | 17 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/data/workspaceArchitecture.js | 644 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/AiCommandCenterDashboard.jsx | 24 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/AiEvaluationDashboard.jsx | 17 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/AiEvaluationDashboard.jsx | 97 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/AnalyticsDashboard.jsx | 11 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/ClinicalAlertsPage.jsx | 60 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/CostAnalyticsDashboard.jsx | 8 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/DeviceFleetManagement.jsx | 15 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/fleet/FleetDashboard.jsx | 22 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/fleet/FleetDashboard.jsx | 126 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/fleet/FleetLiveMap.jsx | 12 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/fleet/FleetLiveMap.jsx | 83 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/GovernanceRegistry.jsx | 4 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/HospitalMapDashboard.jsx | 17 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/HospitalMapDashboard.jsx | 637 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/LaboratoryDashboard.jsx | 7 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/LiveTrackingMap.jsx | 11 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/LiveTrackingMap.jsx | 304 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/Medical3DViewer.jsx | 6 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/Medical3DViewer.jsx | 67 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/MedicalIotDashboard.jsx | 27 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/MedicalIotDashboard.jsx | 360 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/MedicalSimulationSuite.jsx | 19 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/platform/PlatformGovernanceWorkspace.jsx | 13 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/platform/PlatformSystemPage.jsx | 38 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/pages/PredictiveAnalyticsDashboard.jsx | 12 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/SimulationOutcomes.jsx | 10 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/SimulationScenarioPlayer.jsx | 17 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/tools/LabInterpreter.jsx | 10 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/pages/WorkspaceHome.jsx | 817 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/services/artifactsApi.js | 67 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/auditApi.js | 7 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/automationAuditApi.js | 66 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/clinicalAlertsApi.js | 34 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/clinicalChatService.js | 76 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/clinicalIntelligenceApi.js | 20 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/clinicalOrchestratorApi.js | 63 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/clinicalToolsApi.js | 83 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/complianceApi.js | 27 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/emergencyAnalyticsApi.js | 165 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/emergencyDemoEnvironmentService.js | 86 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/services/emergencyIntakeOperatingSystemService.js | 1106 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/services/emergencyOperatingSystemService.js | 136 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/services/emergencySettingsApi.js | 12 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/emergencyStaffingApi.js | 13 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/emergencyTransportApi.js | 35 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/enterpriseIdentityApi.js | 10 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/evaluationApi.js | 238 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/services/fleetTelemetryService.js | 271 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/memoryApi.js | 78 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/NotificationService.js | 128 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/platformSystemsApi.js | 19 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/saasHealthApi.js | 22 | Service returns fallback source evidence instead of live backend data. | source=fallback | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/userIdentityApi.js | 12 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/services/workspaceDataPipelineService.js | 306 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/test/setup.js | 17 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/test/testRenderUtils.jsx | 9 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/utils/demoLiveState.js | 1 | UI can present fallback/demo source state when backend is unavailable. | DEMO_LIVE_STATES | Replace demo route/feed with real integration or visibly label as demo. |
| src/utils/demoLiveState.js | 23 | Sample/demo rows appear in UI/data source. | sample | Replace demo route/feed with real integration or visibly label as demo. |
| src/utils/demoLiveState.js | 4 | Mock data reference in source; verify test-only or clearly labeled. | mock | Verify live backend wiring, UI labeling, and fallback behavior. |
| src/utils/toolRecommendations.js | 85 | Client supplies fallback response data; verify UI labels unavailable vs live. | fallback: | Verify live backend wiring, UI labeling, and fallback behavior. |
| syncService.js | 23 | Capability-gated call has no backend route and must stay guarded: POST /api/chat/messages | chatPersistence | Keep network guard and show unavailable state rather than attempting request. |
| syncService.js | 24 | Capability-gated call has no backend route and must stay guarded: POST /api/chat/conversations | chatPersistence | Keep network guard and show unavailable state rather than attempting request. |
| ToolResultShare.jsx | 40 | Capability-gated call has no backend route and must stay guarded: POST /api/tools/share-results | toolsShareResults | Keep network guard and show unavailable state rather than attempting request. |
| NotificationService.js | 62 | Capability-gated call has no backend route and must stay guarded: GET /api/notifications/stream | notificationStream | Keep network guard and show unavailable state rather than attempting request. |
| notifications/NotificationService.js | 63 | Capability-gated call has no backend route and must stay guarded: POST /api/notifications/send/:channel | notificationSendChannel | Keep network guard and show unavailable state rather than attempting request. |
| TeamManagement.jsx | 65 | Capability-gated call has no backend route and must stay guarded: GET /api/team/users | teamManagement | Keep network guard and show unavailable state rather than attempting request. |
| TeamManagement.jsx | 66 | Capability-gated call has no backend route and must stay guarded: PUT /api/team/users/:id | teamManagement | Keep network guard and show unavailable state rather than attempting request. |
| TeamManagement.jsx | 67 | Capability-gated call has no backend route and must stay guarded: DELETE /api/team/users/:id | teamManagement | Keep network guard and show unavailable state rather than attempting request. |
| TeamManagement.jsx | 68 | Capability-gated call has no backend route and must stay guarded: POST /api/team/invite | teamManagement | Keep network guard and show unavailable state rather than attempting request. |
| offline.js / OfflineSupport.jsx | 70 | Capability-gated call has no backend route and must stay guarded: POST /api/sync | bulkSync | Keep network guard and show unavailable state rather than attempting request. |
| clinicalAlertNotifications.js | 83 | Capability-gated call has no backend route and must stay guarded: GET /api/clinical/alerts/stream | clinicalAlertsStream | Keep network guard and show unavailable state rather than attempting request. |
| export/ExportService.js | 158 | Capability-gated call has no backend route and must stay guarded: POST /api/exports/pdf | exportsPdf | Keep network guard and show unavailable state rather than attempting request. |
| export/ExportService.js | 159 | Capability-gated call has no backend route and must stay guarded: POST /api/exports/excel | exportsExcel | Keep network guard and show unavailable state rather than attempting request. |
| export/ExportService.js | 160 | Capability-gated call has no backend route and must stay guarded: POST /api/reports/generate | reportsGenerate | Keep network guard and show unavailable state rather than attempting request. |
| export/ExportService.js | 161 | Capability-gated call has no backend route and must stay guarded: POST /api/reports/schedule | reportsSchedule | Keep network guard and show unavailable state rather than attempting request. |
| export/ExportService.js | 162 | Capability-gated call has no backend route and must stay guarded: DELETE /api/reports/schedule/:reportId | reportsSchedule | Keep network guard and show unavailable state rather than attempting request. |
| fleetTelemetryService.js | 72 | Backend route exists but capability is demo/sample-backed: GET /api/fleet/vehicles/live | fleetLiveTracking | Replace demo route/feed with real integration or visibly label as demo. |
| fleetTelemetryService.js | 73 | Backend route exists but capability is demo/sample-backed: GET /api/fleet/routes/active | fleetActiveRoutes | Replace demo route/feed with real integration or visibly label as demo. |
| hospitalMapService.js | 74 | Backend route exists but capability is demo/sample-backed: GET /api/hospital-map/floors | hospitalMap | Replace demo route/feed with real integration or visibly label as demo. |
| hospitalMapService.js | 75 | Backend route exists but capability is demo/sample-backed: GET /api/hospital-map/devices | deviceFleet | Replace demo route/feed with real integration or visibly label as demo. |
| medicalIotService.js | 76 | Backend route exists but capability is demo/sample-backed: GET /api/devices/live | medicalDeviceRegistry | Replace demo route/feed with real integration or visibly label as demo. |
| medicalIotService.js | 77 | Backend route exists but capability is demo/sample-backed: GET /api/telemetry/live | telemetryLive | Replace demo route/feed with real integration or visibly label as demo. |
| medicalIotService.js | 78 | Backend route exists but capability is demo/sample-backed: GET /api/alerts/devices | deviceAlerting | Replace demo route/feed with real integration or visibly label as demo. |
| clinicalAlertsApi.js / ClinicalAlertsPage.jsx | 80 | Backend route exists but capability is demo/sample-backed: GET /api/clinical/alerts | clinicalAlerts | Replace demo route/feed with real integration or visibly label as demo. |
| clinicalAlertsApi.js / clinicalAlertNotifications.js | 81 | Backend route exists but capability is demo/sample-backed: POST /api/clinical/alerts/:id/acknowledge | clinicalAlerts | Replace demo route/feed with real integration or visibly label as demo. |
| clinicalAlertsApi.js / clinicalAlertNotifications.js | 82 | Backend route exists but capability is demo/sample-backed: POST /api/clinical/alerts/:id/dismiss | clinicalAlerts | Replace demo route/feed with real integration or visibly label as demo. |

## Environment Variable Coverage

| Variable | Example status | References | Files |
| --- | --- | ---: | --- |
| AI_MAX_TOKENS | defined | 1 | backend/src/config/ai.config.ts:8 |
| AI_RATE_LIMIT_FREE | defined | 1 | backend/src/config/ai.config.ts:13 |
| AI_RATE_LIMIT_INSTITUTIONAL | defined | 1 | backend/src/config/ai.config.ts:21 |
| AI_RATE_LIMIT_PRO | defined | 1 | backend/src/config/ai.config.ts:17 |
| AI_TEMPERATURE | defined | 1 | backend/src/config/ai.config.ts:7 |
| ALIAS_SYNC_WRITE_MAP | missing | 2 | scripts/print-alias-sync-report.mjs:15; src/data/clinicalToolAliasSync.report.test.js:20 |
| ALLOW_DEMO_AUTH_IN_PRODUCTION | defined | 3 | backend/src/modules/auth/auth.service.spec.ts:119; backend/src/modules/auth/auth.service.spec.ts:146; backend/src/modules/auth/auth.service.ts:248 |
| ANOMALY_DETECTION_ENABLED | defined | 1 | backend/src/config/anomaly-detection.config.ts:9 |
| ANOMALY_DETECTION_RETRIES | defined | 1 | backend/src/config/anomaly-detection.config.ts:12 |
| ANOMALY_DETECTION_TIMEOUT | defined | 1 | backend/src/config/anomaly-detection.config.ts:11 |
| ANOMALY_DETECTION_URL | defined | 1 | backend/src/config/anomaly-detection.config.ts:10 |
| ANTHROPIC_API_KEY | defined | 3 | backend/src/config/ai.config.ts:5; backend/test/tool-calling.spec.ts:50; lib/ai/client.ts:207 |
| APP_ENV | missing | 2 | backend/src/config/environment.config.ts:19; backend/src/config/environment.config.ts:29 |
| APP_VERSION | defined | 2 | backend/src/config/environment.config.ts:36; backend/src/config/sentry.config.ts:11 |
| BACKEND_VERSION | missing | 2 | backend/src/modules/observability/observability.module.spec.ts:27; backend/src/modules/observability/observability.module.ts:16 |
| BUILD_TIME | missing | 1 | backend/src/config/environment.config.ts:43 |
| BUILD_TIMESTAMP | missing | 1 | backend/src/modules/observability/observability.module.ts:18 |
| CARE_ENV | missing | 3 | backend/src/config/environment.config.spec.ts:24; backend/src/config/environment.config.ts:19; backend/src/config/environment.config.ts:29 |
| CAREDROID_API_URL | missing | 1 | mcp/src/server.mjs:49 |
| CAREDROID_JWT | missing | 1 | mcp/src/server.mjs:50 |
| CAREDROID_STRICT_SAAS_ENTITLEMENTS | missing | 2 | backend/src/modules/observability/observability.module.ts:91; backend/src/modules/platform-assets/platform-assets.service.ts:119 |
| CAREDROID_TENANT_ISOLATION_DISABLED | missing | 3 | backend/src/modules/observability/observability.module.spec.ts:56; backend/src/modules/observability/observability.module.ts:85; backend/src/modules/observability/observability.module.ts:87 |
| CHUNK_OVERLAP | defined | 1 | backend/src/config/rag.config.ts:37 |
| CHUNK_RESPECT_BOUNDARIES | defined | 1 | backend/src/config/rag.config.ts:38 |
| CHUNK_SIZE | defined | 1 | backend/src/config/rag.config.ts:36 |
| CI | missing | 3 | playwright.config.mjs:12; playwright.config.mjs:36; playwright.production.config.mjs:21 |
| CONTRACT_WRITE_DOCS | missing | 1 | src/data/backendFrontendToolContract.report.test.js:54 |
| DATABASE_CLIENT | defined | 4 | backend/src/app.module.ts:85; backend/src/config/database.config.ts:5; backend/src/data-source.ts:9; backend/test/jest-e2e.setup.ts:2 |
| DATABASE_HOST | defined | 2 | backend/src/app.module.ts:90; backend/src/config/database-url.config.ts:35 |
| DATABASE_LOGGING | defined | 1 | backend/src/config/database-url.config.ts:18 |
| DATABASE_NAME | defined | 2 | backend/src/app.module.ts:93; backend/src/config/database-url.config.ts:39 |
| DATABASE_PASSWORD | defined | 2 | backend/src/app.module.ts:92; backend/src/config/database-url.config.ts:38 |
| DATABASE_POOL_SIZE | defined | 1 | backend/src/config/database-url.config.ts:22 |
| DATABASE_PORT | defined | 1 | backend/src/config/database-url.config.ts:36 |
| DATABASE_SSL | defined | 1 | backend/src/config/database-url.config.ts:19 |
| DATABASE_URL | documented/commented only | 3 | backend/src/app.module.ts:89; backend/src/config/database-url.config.ts:26; backend/src/config/database-url.config.ts:29 |
| DATABASE_USER | defined | 2 | backend/src/app.module.ts:91; backend/src/config/database-url.config.ts:37 |
| DATADOG_API_KEY | defined | 5 | backend/src/config/datadog.config.ts:4; backend/src/config/datadog.config.ts:5; backend/src/observability/datadog.ts:3 |
| DATADOG_APM_ENABLED | defined | 2 | backend/src/config/datadog.config.ts:11; backend/src/observability/datadog.ts:2 |
| DATADOG_APP_KEY | defined | 1 | backend/src/config/datadog.config.ts:6 |
| DATADOG_PROFILING_ENABLED | defined | 2 | backend/src/config/datadog.config.ts:27; backend/src/observability/datadog.ts:13 |
| DATADOG_SITE | defined | 2 | backend/src/config/datadog.config.ts:7; backend/src/observability/datadog.ts:11 |
| DEPLOYED_AT | missing | 1 | backend/src/config/environment.config.ts:43 |
| DEPLOYMENT_ID | missing | 2 | backend/src/config/environment.config.spec.ts:25; backend/src/config/environment.config.ts:34 |
| DEPLOYMENT_REGION | missing | 1 | backend/src/config/environment.config.ts:35 |
| DEV | missing | 2 | src/auth/devAuthBypass.js:11; src/main.jsx:98 |
| DEV_LOGIN_EMAIL | defined | 1 | backend/src/modules/auth/auth.service.ts:264 |
| DUPLICATE_SYSTEM_AUDIT_WRITE_DOCS | missing | 1 | src/data/duplicateSystemAudit.report.test.js:32 |
| E2E_MATRIX_WRITE_DOCS | missing | 1 | src/data/e2eToolValidationMatrix.report.test.js:45 |
| ED_UX_PHASE | missing | 1 | scripts/capture-emergency-os-ux.mjs:14 |
| EMAIL_VERIFICATION_EXPIRY | defined | 1 | backend/src/config/email.config.ts:20 |
| EMBEDDING_BATCH_SIZE | defined | 1 | backend/src/config/rag.config.ts:29 |
| EMBEDDING_DIMENSION | defined | 1 | backend/src/config/rag.config.ts:28 |
| EMBEDDING_MODEL | defined | 1 | backend/src/config/rag.config.ts:27 |
| ENABLE_DEV_AUTH_BYPASS | defined | 4 | backend/src/modules/auth/auth.service.spec.ts:117; backend/src/modules/auth/auth.service.spec.ts:144; backend/src/modules/auth/auth.service.spec.ts:207; backend/src/modules/auth/auth.service.ts:243 |
| ENCRYPTION_ALGORITHM | defined | 2 | backend/src/modules/encryption/encryption.service.spec.ts:11; backend/test/encryption.e2e-spec.ts:24 |
| ENCRYPTION_KEY | defined | 1 | backend/src/config/encryption.config.ts:6 |
| ENCRYPTION_KEY_VERSION | defined | 6 | backend/src/config/encryption.config.ts:10; backend/src/modules/encryption/encryption.service.spec.ts:12; backend/src/modules/encryption/encryption.service.ts:64; backend/test/encryption.e2e-spec.ts:25; backend/test/jest-e2e.setup.ts:11 |
| ENCRYPTION_MASTER_KEY | defined | 8 | backend/src/config/encryption.config.ts:5; backend/src/modules/encryption/encryption.service.spec.ts:10; backend/src/modules/encryption/encryption.service.ts:38; backend/test/encryption.e2e-spec.ts:23; backend/test/encryption.e2e-spec.ts:232; backend/test/encryption.e2e-spec.ts:248; backend/test/jest-e2e.setup.ts:10 |
| ENVIRONMENT_BANNER_ENABLED | missing | 1 | backend/src/config/environment.config.ts:26 |
| EXPOSURE_WRITE_DOCS | missing | 1 | src/data/backendFrontendExposure.report.test.js:30 |
| FEATURE_COVERAGE_WRITE_DOCS | missing | 1 | src/data/featureCoverageMatrix.report.test.js:23 |
| FIREBASE_COLLAPSE_KEY | defined | 1 | backend/src/config/firebase.config.ts:29 |
| FIREBASE_MESSAGING_SENDER_ID | defined | 1 | backend/src/config/firebase.config.ts:20 |
| FIREBASE_NOTIFICATION_PRIORITY | defined | 1 | backend/src/config/firebase.config.ts:28 |
| FIREBASE_NOTIFICATION_TTL | defined | 1 | backend/src/config/firebase.config.ts:27 |
| FIREBASE_PROJECT_ID | defined | 1 | backend/src/config/firebase.config.ts:18 |
| FIREBASE_PUSH_ENABLED | defined | 1 | backend/src/config/firebase.config.ts:23 |
| FIREBASE_SERVICE_ACCOUNT | defined | 2 | backend/src/config/firebase.config.ts:10; backend/src/config/firebase.config.ts:11 |
| FIREBASE_STORAGE_BUCKET | defined | 1 | backend/src/config/firebase.config.ts:19 |
| FRONTEND_URL | defined | 3 | backend/src/config/email.config.ts:30; backend/src/main.ts:115; backend/src/modules/auth/auth.controller.ts:48 |
| FRONTEND_VERSION | missing | 2 | backend/src/modules/observability/observability.module.spec.ts:26; backend/src/modules/observability/observability.module.ts:15 |
| GIT_BRANCH | missing | 1 | backend/src/config/environment.config.ts:42 |
| GIT_COMMIT | missing | 3 | backend/src/config/environment.config.spec.ts:26; backend/src/config/environment.config.ts:38; backend/src/modules/observability/observability.module.ts:17 |
| GOOGLE_APPLICATION_CREDENTIALS | defined | 1 | backend/src/config/firebase.config.ts:15 |
| GOOGLE_CALLBACK_URL | defined | 1 | backend/src/config/auth.config.ts:16 |
| GOOGLE_CLIENT_ID | defined | 2 | backend/src/config/auth.config.ts:13; backend/src/modules/auth/identity-provider-registry.service.ts:25 |
| GOOGLE_CLIENT_SECRET | defined | 1 | backend/src/config/auth.config.ts:14 |
| JEST_WORKER_ID | missing | 1 | backend/src/main.ts:19 |
| JWT_ACCESS_EXPIRY | defined | 3 | backend/src/config/auth.config.ts:5; backend/test/jest-e2e.setup.ts:8 |
| JWT_REFRESH_EXPIRY | defined | 3 | backend/src/config/auth.config.ts:6; backend/test/jest-e2e.setup.ts:9 |
| JWT_SECRET | defined | 3 | backend/src/config/auth.config.ts:4; backend/test/jest-e2e.setup.ts:7 |
| LINKEDIN_CALLBACK_URL | defined | 1 | backend/src/config/auth.config.ts:22 |
| LINKEDIN_CLIENT_ID | defined | 1 | backend/src/config/auth.config.ts:19 |
| LINKEDIN_CLIENT_SECRET | defined | 1 | backend/src/config/auth.config.ts:20 |
| LOG_DIR | defined | 1 | backend/src/config/logger.config.ts:32 |
| LOG_LEVEL | defined | 2 | backend/src/config/datadog.config.ts:22; backend/src/config/logger.config.ts:31 |
| LOG_MAX_DAYS_COMBINED | defined | 1 | backend/src/config/logger.config.ts:36 |
| LOG_MAX_DAYS_ERRORS | defined | 1 | backend/src/config/logger.config.ts:39 |
| LOG_MAX_DAYS_PROD_COMBINED | defined | 1 | backend/src/config/logger.config.ts:35 |
| LOG_MAX_DAYS_PROD_ERRORS | defined | 1 | backend/src/config/logger.config.ts:38 |
| LOG_MAX_SIZE | defined | 1 | backend/src/config/logger.config.ts:33 |
| NLU_CONFIDENCE_THRESHOLD | defined | 1 | backend/src/config/nlu.config.ts:13 |
| NLU_SERVICE_ENABLED | defined | 1 | backend/src/config/nlu.config.ts:9 |
| NLU_SERVICE_RETRIES | defined | 1 | backend/src/config/nlu.config.ts:12 |
| NLU_SERVICE_TIMEOUT | defined | 1 | backend/src/config/nlu.config.ts:11 |
| NLU_SERVICE_URL | defined | 1 | backend/src/config/nlu.config.ts:10 |
| NODE_ENV | defined | 19 | backend/src/app.module.ts:96; backend/src/config/database.config.ts:21; backend/src/config/datadog.config.ts:13; backend/src/config/environment.config.ts:19; backend/src/config/logger.config.ts:30; backend/src/config/logger.config.ts:80; backend/src/config/sentry.config.ts:10; backend/src/main.ts:19; +10 more |
| ORPHAN_DETECTION_WRITE_DOCS | missing | 1 | src/data/orphanDetectionAudit.report.test.js:24 |
| PASSWORD_RESET_EXPIRY | defined | 1 | backend/src/config/email.config.ts:24 |
| PINECONE_API_KEY | defined | 2 | backend/src/config/rag.config.ts:16; backend/test/rag.e2e-spec.ts:25 |
| PINECONE_DIMENSION | defined | 1 | backend/src/config/rag.config.ts:18 |
| PINECONE_ENVIRONMENT | defined | 1 | backend/src/config/rag.config.ts:19 |
| PINECONE_INDEX_NAME | defined | 1 | backend/src/config/rag.config.ts:17 |
| PINECONE_NAMESPACE | defined | 1 | backend/src/config/rag.config.ts:20 |
| PORT | defined | 1 | backend/src/main.ts:174 |
| PRODUCT_PACKAGING_AUDIT_WRITE_DOCS | missing | 1 | src/data/productPackagingAudit.report.test.js:24 |
| QA_AUTH_PROFILE_JSON | missing | 1 | e2e/production-smoke.spec.mjs:35 |
| QA_AUTH_STATE | missing | 1 | playwright.production.config.mjs:13 |
| QA_AUTH_TOKEN | missing | 2 | e2e/production-smoke.spec.mjs:34; e2e/production-smoke.spec.mjs:37 |
| QA_BASE_URL | missing | 4 | e2e/global-setup.mjs:8; playwright.config.mjs:3; playwright.production.config.mjs:4; scripts/capture-emergency-os-ux.mjs:15 |
| QA_BROWSERS | missing | 2 | scripts/run-responsive-qa.mjs:29; scripts/run-responsive-qa.mjs:30 |
| QA_JSON_REPORT | missing | 1 | playwright.config.mjs:21 |
| QA_PRODUCTION_JSON | missing | 1 | playwright.production.config.mjs:26 |
| QA_RETRIES | missing | 5 | playwright.config.mjs:13; playwright.production.config.mjs:22; scripts/run-responsive-qa.mjs:96 |
| QA_STRICT_API | missing | 1 | e2e/production-smoke.spec.mjs:36 |
| QA_WORKERS | missing | 3 | playwright.config.mjs:14; playwright.production.config.mjs:23; scripts/run-responsive-qa.mjs:95 |
| RAG_ENABLED | defined | 2 | backend/src/config/rag.config.ts:11; backend/test/jest-e2e.setup.ts:5 |
| RAG_MAX_TOKENS | defined | 1 | backend/src/config/rag.config.ts:47 |
| RAG_MIN_SCORE | defined | 1 | backend/src/config/rag.config.ts:46 |
| RAG_MODEL | defined | 1 | backend/src/config/rag.config.ts:27 |
| RAG_TOP_K | defined | 1 | backend/src/config/rag.config.ts:45 |
| REDIS_DB | defined | 1 | backend/src/config/redis.config.ts:7 |
| REDIS_HOST | defined | 4 | backend/src/config/redis.config.ts:4; backend/src/modules/cache/cache.service.ts:19; backend/test/jest-e2e.setup.ts:4 |
| REDIS_PASSWORD | defined | 1 | backend/src/config/redis.config.ts:6 |
| REDIS_PORT | defined | 1 | backend/src/config/redis.config.ts:5 |
| RENDER_GIT_COMMIT | missing | 1 | backend/src/config/environment.config.ts:40 |
| RERANK_ENABLED | defined | 2 | backend/src/config/rag.config.ts:54; backend/test/jest-e2e.setup.ts:6 |
| RERANK_MODEL | defined | 1 | backend/src/config/rag.config.ts:56 |
| RERANK_PROVIDER | missing | 1 | backend/src/config/rag.config.ts:55 |
| SAAS_BOTTLENECK_AUDIT_WRITE_DOCS | missing | 1 | src/data/saasBottleneckImplementationAudit.report.test.js:36 |
| SAAS_COMPLIANCE_WRITE_DOCS | missing | 1 | src/data/saasComplianceAudit.report.test.js:28 |
| SENTRY_DSN | defined | 1 | backend/src/config/sentry.config.ts:9 |
| SESSION_ABSOLUTE_TIMEOUT | defined | 1 | backend/src/config/auth.config.ts:29 |
| SESSION_IDLE_TIMEOUT | defined | 1 | backend/src/config/auth.config.ts:28 |
| SIMULATION_HEALTH_STATUS | missing | 2 | backend/src/modules/observability/observability.module.ts:108; backend/src/modules/observability/observability.module.ts:110 |
| SMTP_FROM_EMAIL | defined | 1 | backend/src/config/email.config.ts:15 |
| SMTP_HOST | defined | 1 | backend/src/config/email.config.ts:5 |
| SMTP_PASSWORD | defined | 1 | backend/src/config/email.config.ts:10 |
| SMTP_PORT | defined | 1 | backend/src/config/email.config.ts:6 |
| SMTP_SECURE | defined | 1 | backend/src/config/email.config.ts:7 |
| SMTP_USER | defined | 1 | backend/src/config/email.config.ts:9 |
| SQLITE_PATH | defined | 4 | backend/src/app.module.ts:138; backend/src/config/database.config.ts:12; backend/src/data-source.ts:14; backend/test/jest-e2e.setup.ts:3 |
| STRIPE_CANCEL_URL | defined | 1 | backend/src/config/stripe.config.ts:45 |
| STRIPE_PRICE_FREE | defined | 1 | backend/src/config/stripe.config.ts:10 |
| STRIPE_PRICE_INSTITUTIONAL | defined | 1 | backend/src/config/stripe.config.ts:29 |
| STRIPE_PRICE_PRO | defined | 1 | backend/src/config/stripe.config.ts:16 |
| STRIPE_PUBLISHABLE_KEY | defined | 1 | backend/src/config/stripe.config.ts:6 |
| STRIPE_SECRET_KEY | defined | 1 | backend/src/config/stripe.config.ts:4 |
| STRIPE_SUCCESS_URL | defined | 1 | backend/src/config/stripe.config.ts:44 |
| STRIPE_WEBHOOK_SECRET | defined | 1 | backend/src/config/stripe.config.ts:5 |
| TOOL_AUDIT_WRITE | missing | 1 | src/data/toolAuditReport.test.js:27 |
| TOOL_MATRIX_WRITE_DOCS | missing | 1 | src/data/toolRenderExecuteMatrix.report.test.js:27 |
| VERCEL | missing | 2 | scripts/validate-vercel-env.mjs:4; vite.config.js:32 |
| VERCEL_DEPLOYMENT_ID | missing | 2 | backend/src/config/environment.config.ts:34; vite.config.js:31 |
| VERCEL_ENV | missing | 5 | backend/src/modules/observability/observability.module.ts:20; scripts/validate-vercel-env.mjs:5; vite.config.js:29; vite.config.js:32; vite.config.js:33 |
| VERCEL_GIT_COMMIT_REF | missing | 2 | backend/src/config/environment.config.ts:42; vite.config.js:25 |
| VERCEL_GIT_COMMIT_SHA | missing | 4 | backend/src/config/environment.config.ts:39; backend/src/modules/observability/observability.module.ts:17; vite.config.js:20; vite.config.js:34 |
| VERCEL_GIT_REPO_OWNER | missing | 2 | vite.config.js:36; vite.config.js:37 |
| VERCEL_GIT_REPO_SLUG | missing | 2 | vite.config.js:36; vite.config.js:37 |
| VERCEL_REGION | missing | 1 | backend/src/config/environment.config.ts:35 |
| VERCEL_URL | missing | 3 | vite.config.js:30; vite.config.js:32 |
| VISIBILITY_MATRIX_WRITE_DOCS | missing | 1 | src/data/toolVisibilityMatrix.report.test.js:30 |
| VITE_ALLOW_SAME_ORIGIN_API | defined | 1 | scripts/validate-vercel-env.mjs:9 |
| VITE_API_URL | defined | 1 | scripts/validate-vercel-env.mjs:8 |
| VITE_BUILD_TIME | defined | 1 | vite.config.js:18 |
| VITE_DEMO_MODE | defined | 1 | scripts/validate-vercel-env.mjs:12 |
| VITE_ENABLE_DEV_AUTH_BYPASS | defined | 3 | backend/src/modules/auth/auth.service.spec.ts:118; backend/src/modules/auth/auth.service.spec.ts:145; backend/src/modules/auth/auth.service.ts:244 |
| VITE_GIT_BRANCH | defined | 1 | vite.config.js:27 |
| VITE_GIT_COMMIT_SHA | defined | 1 | vite.config.js:22 |
| VITE_HIDE_DIVISION_MODE | defined | 1 | scripts/validate-vercel-env.mjs:11 |
| VITE_SAME_ORIGIN_API_PROXY_VERIFIED | defined | 1 | scripts/validate-vercel-env.mjs:10 |
| VITEST_MAX_WORKERS | missing | 1 | vitest.config.js:5 |

## Notes

- The primary source of truth for frontend calls is `src/data/frontendApiCallsInventory.js`; raw `fetch`/`axios` call sites are listed separately because most business calls go through `apiFetch`, `apiFetchJson`, or `apiAxios`.
- `Backend exists` is checked against `src/data/backendHttpRouteInventory.js`; controller drift is shown separately because some dynamic Nest decorators can evade static parsing.
- Request/response shapes are inferred statically from method, service wrapper usage, `parseApiResponse` fallbacks, and available JS/JSDoc/TS hints. Many clients are JavaScript and do not provide explicit response types.
- External clinical reference fetches, analytics/CDN loads, and auth redirects are listed as external/dynamic rather than backend gaps.
- Disabled capabilities in `backendApiCapabilities.js` are intentional gaps only if the UI keeps them guarded and clearly unavailable.
