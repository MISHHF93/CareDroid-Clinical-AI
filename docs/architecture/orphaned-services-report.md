# Orphaned Services Report

Generated: 2026-06-12T02:34:02.555Z

Scanned 2209 text/code files. Resolved 5609 relative import edges. Found 282 backend endpoint declarations and 1239 frontend API references.

## Frontend API Clients and Consumers

| File |API References |
| --- | --- |
| src/components/ErrorBoundary.jsx | /api/crashes |
| src/components/offline/OfflineSupport.jsx | /api/sync |
| src/components/tools/ToolResultShare.jsx | /api/tools/share-results |
| src/components/TwoFactorSettings.jsx | /api/two-factor/disable, /api/two-factor/status |
| src/pages/AnalyticsDashboard.jsx | /api/analytics/metrics |
| src/pages/AnalyticsDashboard.test.jsx | /api/analytics/metrics |
| src/pages/Auth.jsx | /api/auth/google, /api/auth/linkedin, /api/auth/login, /api/auth/magic-link, /api/auth/oidc, /api/auth/register, /api/auth/saml, /api/auth/verify-2fa |
| src/pages/BiometricSetup.jsx | /api/auth/biometric/available, /api/auth/biometric/config, /api/auth/biometric/delete/${deviceId}, /api/auth/biometric/delete/:deviceId, /api/auth/biometric/enroll, /api/auth/biometric/stats, /api/auth/biometric/verify |
| src/pages/HospitalMapDashboard.test.jsx | /api/hospital-map/floors |
| src/pages/LiveTrackingMaps.test.jsx | /api/fleet/routes/active, /api/fleet/vehicles/live |
| src/pages/platform/PlatformSystemPage.jsx | /api/platform-systems/packs/:pack, /api/tools/:id/execute |
| src/pages/settings/FeatureManagement.jsx | /api/audit/my-logs, /api/emergency/diversion/status, /api/emergency/shift/report/export, /api/emergency/transfers/:referralId/status, /api/patients/:patientId/import/labs, /api/patients/:patientId/import/medications, /api/patients/:patientId/source-data, /api/patients/:patientId/timeline, /api/tools/icd10/lookup |
| src/pages/Settings.billing.test.jsx | /api/auth/google |
| src/pages/team/TeamManagement.jsx | /api/team/invite, /api/team/users, /api/team/users/${selectedUser.id}, /api/team/users/${userId} |
| src/pages/TwoFactorSetup.jsx | /api/two-factor/enable, /api/two-factor/generate |
| src/services/advancedRecommendationService.js | /api/chat/intent-classify |
| src/services/analyticsService.ts | /api/analytics/events |
| src/services/apiClient.auth.test.js | /api/config/system, /api/notifications/stream |
| src/services/apiClient.test.js | /api/audit/logs, /api/config/system, /api/health, /api/tools/available |
| src/services/auditApi.js | /api/audit/phi-access${suffix} |
| src/services/automationAuditApi.js | /api/automation-audit, /api/automation-audit${query} |
| src/services/automationAuditApi.test.js | /api/automation-audit, /api/automation-audit?tenantId=tenant-demo-hospital, /api/clinical/alerts |
| src/services/automationAuditLogger.test.js | /api/notifications/stream, /api/tools/results |
| src/services/automationEngine.js | /api/automation-audit/events |
| src/services/clinicalAlertsApi.js | /api/clinical/alerts |
| src/services/clinicalAlertsApi.test.js | /api/clinical/alerts, /api/clinical/alerts/alert-1/acknowledge, /api/clinical/alerts/alert-1/dismiss |
| src/services/clinicalChatService.js | /api/chat/analyze-vitals, /api/chat/message, /api/chat/suggest-action |
| src/services/clinicalChatService.test.js | /api/chat/analyze-vitals, /api/chat/message, /api/chat/suggest-action |
| src/services/clinicalContentApi.js | /api/drugs, /api/drugs/categories, /api/drugs?${qs}, /api/protocols, /api/protocols/categories, /api/protocols?${qs} |
| src/services/clinicalContentApi.test.js | /api/drugs?search=war, /api/protocols?limit=10 |
| src/services/clinicalIntelligenceApi.js | /api/clinical-intelligence/ambient-scribe/generate, /api/clinical-intelligence/differential-ai/generate, /api/clinical-intelligence/guideline-rag/query, /api/clinical-intelligence/order-set-ai/generate, /api/clinical-intelligence/patient-summary-ai/generate, /api/clinical-intelligence/timeline-ai/generate |
| src/services/clinicalOrchestratorApi.registry.test.js | /api/tools/${nluToolId}/execute |
| src/services/clinicalOrchestratorApi.test.js | /api/tools/drug-interactions/execute |
| src/services/clinicalToolsApi.js | /api/tools, /api/tools/available, /api/tools/catalog/executors, /api/tools/statistics |
| src/services/clinicalToolsApi.test.js | /api/tools, /api/tools/catalog/executors, /api/tools/lab-interpreter/validate, /api/tools/sofa-calculator, /api/tools/statistics |
| src/services/complianceApi.js | /api/compliance/consent, /api/compliance/delete-account, /api/compliance/export |
| src/services/complianceApi.test.js | /api/compliance/consent |
| src/services/disabledBackendMocks.js | /api/notifications/stream |
| src/services/emergencyAnalyticsApi.js | /api/emergency/analytics, /api/emergency/capacity/history, /api/emergency/queues/analytics, /api/emergency/shift/report/export |
| src/services/emergencySettingsApi.js | /api/integrations/fhir/connections, /api/integrations/hl7/interfaces, /api/protocols, /api/settings/features |
| src/services/emergencyStaffingApi.js | /api/activity, /api/audit/sync, /api/auth/me, /api/notifications/preferences, /api/profile/me |
| src/services/emergencyTransportApi.js | /api/emergency/diversion/status, /api/emergency/referrals, /api/fleet/snapshot |
| src/services/enterpriseIdentityApi.js | /api/auth/identity-providers |
| src/services/enterpriseIdentityApi.test.js | /api/auth/identity-providers |
| src/services/export/ExportService.js | /api/exports/excel, /api/exports/pdf, /api/reports/generate, /api/reports/schedule, /api/reports/schedule/${reportId} |
| src/services/fleetTelemetryService.js | /api/fleet/alerts, /api/fleet/dispatch/events, /api/fleet/routes/active, /api/fleet/vehicles/live |
| src/services/hospitalMapService.js | /api/alerts/devices, /api/devices, /api/devices/:id/location-history, /api/devices/:id/maintenance, /api/devices/:id/telemetry, /api/hospital-map/devices, /api/hospital-map/floors, /api/hospital-map/rooms, /api/hospital-map/units, /api/telemetry/live |
| src/services/liveTrackingApi.test.js | /api/devices/live, /api/hospital-map/floors, /api/telemetry/live |
| src/services/medicalIotService.js | /api/alerts/devices, /api/devices/live, /api/medical-iot/snapshot, /api/telemetry/live |
| src/services/memoryApi.js | /api/memory/clinical, /api/memory/dashboard, /api/memory/fabric/context, /api/memory/fabric/signals, /api/memory/long, /api/memory/short |
| src/services/memoryApi.test.js | /api/memory/fabric/context, /api/memory/fabric/signals |
| src/services/notifications/NotificationService.js | /api/notifications/preferences, /api/notifications/send/${channel} |
| src/services/NotificationService.js | /api/notifications/${notificationId}, /api/notifications/${notificationId}/read, /api/notifications/devices, /api/notifications/devices/register, /api/notifications/preferences, /api/notifications/preferences/toggle-all, /api/notifications/read-all, /api/notifications/stream, /api/notifications/stream?token=${token}, /api/notifications/test, /api/notifications/unread/count, /api/notifications?limit=${limit} |
| src/services/patientManagementApi.js | /api/patients/import/ehr |
| src/services/platformAssetsApi.js | /api/organizations, /api/organizations/${organizationId}, /api/organizations/${organizationId}/engine, /api/organizations/${organizationId}/feature-flags, /api/organizations/${organizationId}/settings, /api/organizations/${organizationId}/tenant-admin, /api/organizations/current, /api/organizations/current/engine, /api/platform/assets/${assetId}/lifecycle, /api/platform/context, /api/platform/digital-twin${qs}, /api/platform/me/role-profile, /api/platform/organizations/${organizationId}/analytics, /api/platform/organizations/${organizationId}/customer-success${qs}, /api/platform/organizations/${organizationId}/packs/${packId}/install, /api/platform/organizations/${organizationId}/packs/${packId}/remove, /api/platform/role-profiles, /api/platform/users/me/assets, /api/platform/users/me/recommendations?limit=${limit} |
| src/services/platformAssetsApi.test.js | /api/organizations/org-1/tenant-admin, /api/platform/assets/agent-clinical/lifecycle, /api/platform/assets?assetType=workflow&lifecycle=beta, /api/platform/departments/emergency?organizationId=org-1, /api/platform/departments?organizationId=org-1, /api/platform/governance-registry?query=qsofa&riskLevel=clinical-decision-support&assetType=calculator, /api/platform/marketplace/packs/icu-pack?organizationId=org-1, /api/platform/marketplace/packs?organizationId=org-1&organizationType=hospital, /api/platform/organizations/org-1/customer-success?period=week, /api/platform/service-lines/emergency-medicine?organizationId=org-1, /api/platform/service-lines?organizationId=org-1 |
| src/services/platformGovernanceApi.js | /api/ai-governance/summary, /api/audit/integrity/status, /api/audit/patients/${patientId}/access, /api/audit/runs/demo-run, /api/consent/${patientId}, /api/consent/demo-patient, /api/ehr-audit/summary, /api/equity/summary, /api/governance/ai-security/incidents, /api/governance/ai-security/summary, /api/governance/clinical/policies, /api/governance/clinical/readiness, /api/governance/equity/cohorts, /api/governance/equity/metrics, /api/governance/equity/summary, /api/governance/regulatory/capabilities, /api/governance/regulatory/evidence/clinical-governance, /api/governance/validation/release-gates/clinical-governance, /api/governance/validation/runs/demo-run, /api/governance/validation/scenarios, /api/human-review/items, /api/interoperability/summary, /api/operations/deployments/current, /api/operations/incidents, /api/operations/observability/summary, /api/operations/service-health, /api/patients/${patientId}/review-items, /api/patients/${patientId}/source-data, /api/privacy/access-log, /api/privacy/patient/${patientId}/access-log, /api/privacy/requests, /api/privacy/summary, /api/regulatory/summary, /api/review/items, /api/security/evaluate, /api/security/summary, /api/source-provenance/synthetic-source, /api/system-health |
| src/services/platformGovernanceApi.test.js | /api/ai-governance/summary, /api/audit/runs/demo-run, /api/equity/summary, /api/governance/clinical/policies, /api/human-review/items, /api/interoperability/summary, /api/operations/service-health, /api/patients/patient-1/review-items, /api/privacy/requests, /api/privacy/summary, /api/regulatory/summary, /api/security/evaluate, /api/security/summary, /api/system-health |
| src/services/platformSystemsApi.js | /api/platform-systems/capabilities/${capabilityId} |
| src/services/productCatalogApi.js | /api/agents, /api/asset-packs${qs}, /api/care-pathways, /api/commercial-plans, /api/dependency-graph${qs}, /api/integration-readiness, /api/integrations-marketplace${qs}, /api/maturity-assessments, /api/maturity-assessments/questionnaire, /api/organizations/${organizationId}/configuration, /api/organizations/${organizationId}/integrations/request, /api/organizations/${organizationId}/outcomes, /api/organizations/onboarding, /api/products, /api/products/builder${qs}, /api/products/pack-map, /api/solution-builder/apply, /api/solution-builder/recommendations, /api/specialties |
| src/services/productCatalogApi.test.js | /api/asset-packs?organizationId=org-1, /api/care-pathways, /api/care-pathways/sepsis, /api/dependency-graph, /api/dependency-graph?organizationId=org-1, /api/integration-readiness, /api/organizations/onboarding, /api/organizations/org-1/value-tracking?period=week, /api/products/builder?organizationId=org-1, /api/products/icu-suite/builder?organizationId=org-1, /api/solution-builder/apply, /api/solution-builder/recommendations, /api/specialties |
| src/services/saasHealthApi.js | /api/saas-health |
| src/services/smartIntakeApi.js | /api/emergency/intake/${sessionId}/continue-unknown, /api/emergency/intake/${sessionId}/create-patient, /api/emergency/intake/${sessionId}/documents, /api/emergency/intake/${sessionId}/link-patient, /api/emergency/intake/${sessionId}/manual-entry, /api/emergency/intake/${sessionId}/match, /api/emergency/intake/${sessionId}/ocr-results, /api/emergency/intake/${sessionId}/verify-field, /api/emergency/intake/sessions |
| src/services/subscriptionApi.js | /api/subscriptions/billing, /api/subscriptions/create-checkout, /api/subscriptions/current, /api/subscriptions/downgrade, /api/subscriptions/entitlements/resolve, /api/subscriptions/lifecycle, /api/subscriptions/plans, /api/subscriptions/portal, /api/subscriptions/trial/convert, /api/subscriptions/upgrade, /api/subscriptions/usage/events |
| src/services/subscriptionApi.test.js | /api/subscriptions/billing, /api/subscriptions/usage/events, /api/subscriptions/usage/metering?period=week, /api/subscriptions/usage?period=week |
| src/services/syncService.js | /api/audit/sync, /api/chat/conversations, /api/chat/messages, /api/notifications/${notification.serverId}/read, /api/notifications/:id/read, /api/notifications?limit=50, /api/tools/results, /api/users/profile |
| src/services/systemHealthService.js | /api/system-health |
| src/services/tenantIsolationApi.js | /api/tenant/isolation-audit |
| src/services/tenantIsolationApi.test.js | /api/tenant/isolation-audit |
| src/services/userIdentityApi.js | /api/activity, /api/personalization/me, /api/personalization/me/saved-prompts, /api/profile/me, /api/profile/me/activity, /api/profile/me/preferences, /api/profile/me/security, /api/profile/me/workspaces, /api/profile/me/workspaces/active, /api/workspaces |
| src/services/whiteLabelApi.test.js | /api/white-label/demo-care |

## Backend Emergency OS Endpoint Consumption

| Method |Endpoint |Backend File |Consumer Status |
| --- | --- | --- | --- |
| GET | /api/capacity/dashboard | backend/src/api/capacity.routes.ts | No active frontend consumer found |
| POST | /api/copilot/query | backend/src/api/copilot.routes.ts | No active frontend consumer found |
| POST | /api/ems/alert | backend/src/api/ems.routes.ts | No active frontend consumer found |
| PATCH | /api/ems/status/:emsUnitId | backend/src/api/ems.routes.ts | No active frontend consumer found |
| POST | /api/ems/arrive/:emsUnitId | backend/src/api/ems.routes.ts | No active frontend consumer found |
| GET | /api/ems/incoming | backend/src/api/ems.routes.ts | No active frontend consumer found |
| GET | /api/reassessment/due | backend/src/api/reassessment.routes.ts | No active frontend consumer found |
| POST | /api/reassessment/:patientId/reassess | backend/src/api/reassessment.routes.ts | No active frontend consumer found |
| POST | /api/reassessment/:patientId/dismiss | backend/src/api/reassessment.routes.ts | No active frontend consumer found |
| POST | /api/emergency/intake/sessions | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/manual-entry | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/documents | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/ocr-results | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/ems-evidence | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/match | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/verify-field | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/link-patient | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/create-patient | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/continue-unknown | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/reconcile-unknown | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/biometric-consent | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/emergency/intake/:id/biometric-consent/withdraw | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| GET | /api/emergency/intake/:id/audit-log | backend/src/api/smart-intake.routes.ts | Consumed or partially matched |
| POST | /api/chat/message-3d | backend/src/modules/chat/chat.controller.ts | Consumed or partially matched |
| POST | /api/chat/intent-classify | backend/src/modules/chat/chat.controller.ts | Consumed or partially matched |
| POST | /api/chat/message | backend/src/modules/chat/chat.controller.ts | Consumed or partially matched |
| POST | /api/chat/suggest-action | backend/src/modules/chat/chat.controller.ts | Consumed or partially matched |
| POST | /api/chat/analyze-vitals | backend/src/modules/chat/chat.controller.ts | Consumed or partially matched |

## Key Breaks

- `/api/ems/*`, `/api/reassessment/*`, `/api/capacity/dashboard`, and `/api/copilot/query` exist in the conditional Mongoose runtime but are not consistently consumed by active frontend workflows.
- Queue, boarding, referrals, and much of analytics are currently derived from `store/emergencyStore.ts` client state rather than persisted backend services.
- The main NestJS backend still exposes many legacy platform modules that are redirected out of the active UX.
