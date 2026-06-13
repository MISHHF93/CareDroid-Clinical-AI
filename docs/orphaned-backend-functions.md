# Orphaned backend functions

**Generated:** 2026-06-13T00:33:02.592Z

> Regenerate: `npm run exposure:write-docs`

Every backend HTTP route is either **wired** to a frontend client or listed below with an exposure strategy. Gated frontend calls (no Nest route) are tracked in section D.

## A. Backend-only (correct)

| Route | Controller | Reason |
|-------|------------|--------|
| `/api/auth/verify-email` | AuthController | Email link callback |
| `/api/auth/google` | AuthController | OAuth redirect |
| `/api/auth/google/callback` | AuthController | OAuth callback |
| `/api/auth/linkedin` | AuthController | OAuth redirect |
| `/api/auth/linkedin/callback` | AuthController | OAuth callback |
| `/api/two-factor/verify` | TwoFactorController | Used during login challenge |
| `/api/subscriptions/webhook` | SubscriptionsController | Stripe webhook |
| `/api/interoperability/events` | InteroperabilityController | Integration Hub ingestion endpoint for authenticated adapters and backend workflows |
| `/api/cost-optimizer/route` | CostOptimizerController | Assistant lifecycle invokes route optimization server-side before model/tool execution |
| `/api/health` | AnalyticsController | Client health ping (distinct from GET /health) |
| `/api/ai/query` | AiController | Invoked via chat pipeline |
| `/api/ai/structured` | AiController | Invoked via chat pipeline |
| `/api/metrics` | MetricsController | Prometheus scrape |

### Internal services (no HTTP)

| Symbol | Module | Reason |
|--------|--------|--------|
| `RagService` | `modules/rag` | Chat retrieval |
| `EncryptionService` | `modules/encryption` | At-rest crypto |
| `CacheService` | `modules/cache` | Redis layer |
| `EmailService` | `modules/email` | Transactional mail |
| `EmergencyEscalationService` | `emergency-escalation` | Chat pipeline |
| `IntentClassifierService` | `intent-classifier` | Via POST /api/chat/* |
| `ToolOrchestratorService.executeInChat` | `tool-orchestrator` | ChatService internal |

## B. Expose through SPA (recommended)

| Route | Controller | Client hint |
|-------|------------|-------------|
| `/api/protocols/:id` | ProtocolController | Protocols.jsx |
| `/api/compliance/export` | ComplianceController | complianceApi.js |

## C. Deferred / admin / SSO

| Route | Controller | Reason |
|-------|------------|--------|
| `/api/auth/oidc` | AuthController | SSO placeholder |
| `/api/auth/saml` | AuthController | SSO placeholder |
| `/api/auth/me` | AuthController | JWT introspection; SPA uses profile |
| `/api/workspaces/:workspaceId` | WorkspacesController | Workspace detail route for future workspace settings |
| `/api/workspaces/:workspaceId/members` | WorkspacesController | Workspace member management surface pending |
| `/api/workspaces/:workspaceId/invitations` | WorkspacesController | Workspace invitation UX pending |
| `/api/workspaces/:workspaceId/tools` | WorkspacesController | Workspace tool preferences currently use aggregate settings |
| `/api/workspaces/:workspaceId/tools` | WorkspacesController | Workspace tool preference editor pending |
| `/api/organizations` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/current` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/onboarding` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/specialties/:slug/assets` | ProductCatalogController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/maturity-assessments/questionnaire` | ProductCatalogController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/maturity-assessments` | ProductCatalogController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/users/me/pinned-assets` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/users/me/hidden-assets` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/assets/:assetId` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/packs/:packId` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/role-profiles/:id` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/organizations/:organizationId/entitlements` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/organizations/:organizationId/packs/:packId/install` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/organizations/:organizationId/packs/:packId/remove` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/activity/me` | UserActivityController | Profile activity dashboard pending |
| `/api/activity/me/summary` | UserActivityController | Profile activity summary pending |
| `/api/activity/workspaces/:workspaceId` | UserActivityController | Workspace activity surface pending |
| `/api/personalization/me/recommendations` | PersonalizationController | Personalization recommendations UI pending |
| `/api/personalization/me/saved-prompts/:promptId` | PersonalizationController | Saved prompt deletion UI pending |
| `/api/artifacts` | ArtifactsController | Artifact authoring is not exposed in dashboard yet |
| `/api/artifacts/:id` | ArtifactsController | Artifact detail route is not linked yet |
| `/api/artifacts/:id` | ArtifactsController | Artifact editing is not exposed in dashboard yet |
| `/api/memory/short` | MemoryController | Memory dashboard uses aggregate route |
| `/api/memory/long` | MemoryController | Memory dashboard uses aggregate route |
| `/api/memory/clinical` | MemoryController | Memory dashboard uses aggregate route |
| `/api/subscriptions/config` | SubscriptionsController | Stripe config for checkout UI |
| `/api/chat/message-3d` | ChatController | 3D avatar experiment |
| `/api/patients` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/patients/:patientId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/patients` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/patients/:patientId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/staff` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/rooms` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/shift` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ems` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/referrals` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/interoperability/events` | InteroperabilityController | Integration Hub traceability list for a future admin/review surface |
| `/api/interoperability/events/:id` | InteroperabilityController | Integration Hub event trace detail for a future admin/review surface |
| `/api/tools/execute` | ToolOrchestratorController | Batch execute; UI uses per-id execute |
| `/api/tool-calling/execute` | ToolCallingController | Chat delegates server-side; direct UI not exposed yet |
| `/api/tool-calling/catalog` | ToolCallingController | Internal tool-calling contract catalog |
| `/api/tool-calling/resolve` | ToolCallingController | Server-side catalog launch helper |
| `/api/tool-calling/logs` | ToolCallingController | Operational debugging endpoint |
| `/api/evaluation/metrics` | EvaluationController | Evaluation dashboard currently receives metric definitions from aggregate dashboard payload |
| `/api/evaluation/runs` | EvaluationController | Evaluation dashboard currently reads recent runs from aggregate dashboard payload |
| `/api/drugs` | DrugController | Admin content API |
| `/api/drugs/:id` | DrugController | Admin content API |
| `/api/drugs/:id` | DrugController | Admin content API |
| `/api/protocols` | ProtocolController | Admin content API |
| `/api/protocols/:id` | ProtocolController | Admin content API |
| `/api/protocols/:id` | ProtocolController | Admin content API |
| `/api/ai/usage` | AiController | Usage meter UI |
| `/api/audit/events` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/events/:eventId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/export` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/integrity/status` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/integrity/verify` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/patients/:patientId/access` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/audit/runs/:runId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/incidents` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/incidents/:incidentId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/evaluate` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/model-access` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/model-access/:policyId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/rules` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/rules/:ruleId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/summary` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies/:policyId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies/:policyId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/readiness` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/release-gates` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/release-gates/:gateId/decision` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/safety-findings` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/safety-findings/:findingId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/cohorts` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/cohorts` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/findings` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/findings/:findingId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/metrics` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/reports` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/summary` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId/classification` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/evidence/:capabilityId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/evidence/:capabilityId/artifacts` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/release-gates/:capabilityId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/runs/:runId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/runs` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/runs/:runId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/scenarios` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/scenarios` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/synthetic-patients` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/devices/:deviceId` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/rooms` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/search` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/integrations/hl7/messages/quarantine` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/integrations/hl7/messages/:messageId/replay-preview` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/medical-iot/snapshot` | TelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/deployments/current` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/health` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/incidents` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/incidents/:incidentId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/ai-runs` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/integrations` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/orchestrator` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/summary` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/service-health` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/consent/:patientId` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/consent/:patientId/:scope` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/gate/evaluate` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/observability` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/privacy/:patientId/:requestType` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/review/items` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/review/items` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/review/items/:itemId/decision` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/security/events` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/source-provenance/:sourceId` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/summary` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/synthetic/fhir` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/synthetic/hl7` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/validation/scenarios` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform-governance/validation/scenarios` | PlatformGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/privacy/requests` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/privacy/requests/:requestId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items/:itemId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items/:itemId/assign` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items/:itemId/comments` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/review/items/:itemId/decision` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/scenarios` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/scenarios/:id` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/runs` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/runs/:id/steps` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/runs/:id/complete` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/outcomes` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/simulation/recommendations` | SimulationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/source-provenance/:sourceId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/organizations/:organizationId/usage` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/current/engine` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/engine` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/feature-flags` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/feature-flags` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/settings` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/tenant-admin` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/tenant-admin` | OrganizationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/organizations/:organizationId/commercial-plan` | ProductCatalogController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/platform/organizations/:organizationId/customer-success` | PlatformAssetsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/products/builder` | ProductCatalogController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/subscriptions/downgrade` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/subscriptions/trial/convert` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/subscriptions/upgrade` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/workspaces/context` | WorkspacesController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/workspaces/:workspaceId/context` | WorkspacesController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |

## D. Frontend calls without backend (gated)

| ID | Method | Path | Capability | Client |
|----|--------|------|------------|--------|
| chat-messages-sync | POST | `/api/chat/messages` | chatPersistence | syncService.js |
| chat-conversations-sync | POST | `/api/chat/conversations` | chatPersistence | syncService.js |
| tools-share-results | POST | `/api/tools/share-results` | toolsShareResults | ToolResultShare.jsx |
| notifications-stream | GET | `/api/notifications/stream` | notificationStream | NotificationService.js |
| notifications-send-channel | POST | `/api/notifications/send/:channel` | notificationSendChannel | notifications/NotificationService.js |
| team-users | GET | `/api/team/users` | teamManagement | TeamManagement.jsx |
| team-user-update | PUT | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-user-delete | DELETE | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-invite | POST | `/api/team/invite` | teamManagement | TeamManagement.jsx |
| bulk-sync | POST | `/api/sync` | bulkSync | offline.js / OfflineSupport.jsx |
| clinical-alerts-stream | GET | `/api/clinical/alerts/stream` | clinicalAlertsStream | clinicalAlertsApi.js / ClinicalAlertsPage.jsx |
| emergency-analytics | GET | `/api/emergency/analytics` | emergencyOperationalAnalytics | emergencyAnalyticsApi.js |
| emergency-capacity-history | GET | `/api/emergency/capacity/history` | emergencyCapacityHistory | emergencyAnalyticsApi.js |
| emergency-queue-analytics | GET | `/api/emergency/queues/analytics` | emergencyQueueAnalytics | emergencyAnalyticsApi.js |
| emergency-shift-report-export | GET | `/api/emergency/shift/report/export` | emergencyShiftReportExport | emergencyAnalyticsApi.js |
| emergency-referral-history | GET | `/api/emergency/patients/:patientId/referrals` | emergencyReferralHistory | emergencyTransportApi.js |
| emergency-transfer-status | PATCH | `/api/emergency/transfers/:referralId/status` | emergencyTransferWorkflow | emergencyTransportApi.js |
| emergency-diversion-status | GET | `/api/emergency/diversion/status` | emergencyDiversionStatus | emergencyTransportApi.js |
| emergency-smart-intake-session-create | POST | `/api/emergency/intake/sessions` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-manual-entry | POST | `/api/emergency/intake/:sessionId/manual-entry` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-document | POST | `/api/emergency/intake/:sessionId/documents` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-ocr | POST | `/api/emergency/intake/:sessionId/ocr-results` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-match | POST | `/api/emergency/intake/:sessionId/match` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-verify-field | POST | `/api/emergency/intake/:sessionId/verify-field` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-link-patient | POST | `/api/emergency/intake/:sessionId/link-patient` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-create-patient | POST | `/api/emergency/intake/:sessionId/create-patient` | emergencySmartIntake | smartIntakeApi.js |
| emergency-smart-intake-continue-unknown | POST | `/api/emergency/intake/:sessionId/continue-unknown` | emergencySmartIntake | smartIntakeApi.js |
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## E. POST executors

Registered: `sofa-calculator`, `drug-interactions`, `lab-interpreter`

NLU profiles without POST executor (216): client-side / chat only.

## F. Exposure strategy summary

| Tier | Action |
|------|--------|
| P0 | Keep capability gates on phantom frontend paths until Nest implements or UI removed |
| P1 | Wire `clinicalToolsApi` → validate, catalog/executors, statistics |
| P1 | Wire `complianceApi` → export + delete-account |
| P2 | Protocol/drug GET clients for reference pages |
| P3 | Chat suggest-action / analyze-vitals on dashboard |

## Quick counts

| Category | Count |
|----------|------:|
| Backend HTTP routes | 216 |
| Wired frontend → backend | see exposure report |
| Backend-only / deferred (policy) | 184 |
| Gated frontend (no route) | 32 |
| POST executors | 3 |

