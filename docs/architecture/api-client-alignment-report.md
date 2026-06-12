# API Client Alignment Report

Generated: 2026-06-12T03:27:29.433Z

## Summary

- Frontend API inventory entries parsed: 237
- Backend HTTP inventory entries parsed: 416
- Frontend calls without exact backend inventory match: 15
- Backend routes without exact frontend inventory match: 194
- Fixes applied: Emergency OS Express route files now import services from `backend/src/services/index.ts`; the active Emergency OS `PlatformSystemsController` routes are now represented in `src/data/backendHttpRouteInventory.js`.

## Frontend Calls With Missing Backend Inventory Match

| ID | Method | Path | Client |
| --- | --- | --- | --- |
| chat-messages-sync | POST | /api/chat/messages | syncService.js |
| chat-conversations-sync | POST | /api/chat/conversations | syncService.js |
| tools-share-results | POST | /api/tools/share-results | ToolResultShare.jsx |
| notifications-stream | GET | /api/notifications/stream | NotificationService.js |
| notifications-send-channel | POST | /api/notifications/send/:channel | notifications/NotificationService.js |
| team-users | GET | /api/team/users | TeamManagement.jsx |
| team-user-update | PUT | /api/team/users/:id | TeamManagement.jsx |
| team-user-delete | DELETE | /api/team/users/:id | TeamManagement.jsx |
| team-invite | POST | /api/team/invite | TeamManagement.jsx |
| bulk-sync | POST | /api/sync | offline.js / OfflineSupport.jsx |
| exports-pdf | POST | /api/exports/pdf | export/ExportService.js |
| exports-excel | POST | /api/exports/excel | export/ExportService.js |
| reports-generate | POST | /api/reports/generate | export/ExportService.js |
| reports-schedule-create | POST | /api/reports/schedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | /api/reports/schedule/:reportId | export/ExportService.js |

## Backend Routes Not Called By Frontend Inventory

| Method | Path | Controller |
| --- | --- | --- |
| GET | /api/auth/verify-email | AuthController |
| GET | /api/auth/google | AuthController |
| GET | /api/auth/google/callback | AuthController |
| GET | /api/auth/linkedin | AuthController |
| GET | /api/auth/linkedin/callback | AuthController |
| GET | /api/auth/oidc | AuthController |
| GET | /api/auth/saml | AuthController |
| GET | /api/auth/me | AuthController |
| DELETE | /api/auth/biometric/delete/:deviceId | BiometricController |
| GET | /api/auth/biometric/available | BiometricController |
| GET | /api/workspaces/:workspaceId | WorkspacesController |
| GET | /api/workspaces/:workspaceId/members | WorkspacesController |
| POST | /api/workspaces/:workspaceId/invitations | WorkspacesController |
| GET | /api/workspaces/:workspaceId/tools | WorkspacesController |
| PATCH | /api/workspaces/:workspaceId/tools | WorkspacesController |
| GET | /api/organizations | OrganizationsController |
| POST | /api/organizations | OrganizationsController |
| GET | /api/organizations/:organizationId | OrganizationsController |
| PATCH | /api/organizations/:organizationId | OrganizationsController |
| GET | /api/organizations/current | OrganizationsController |
| POST | /api/organizations/onboarding | OrganizationsController |
| GET | /api/products | ProductCatalogController |
| GET | /api/products/:slug | ProductCatalogController |
| GET | /api/specialties/:slug/assets | ProductCatalogController |
| GET | /api/maturity-assessments/questionnaire | ProductCatalogController |
| POST | /api/maturity-assessments | ProductCatalogController |
| POST | /api/platform/users/me/pinned-assets | PlatformAssetsController |
| POST | /api/platform/users/me/hidden-assets | PlatformAssetsController |
| GET | /api/platform/assets/:assetId | PlatformAssetsController |
| GET | /api/platform/packs/:packId | PlatformAssetsController |
| GET | /api/platform/role-profiles/:id | PlatformAssetsController |
| GET | /api/platform/organizations/:organizationId/entitlements | PlatformAssetsController |
| POST | /api/platform/organizations/:organizationId/packs/:packId/install | PlatformAssetsController |
| POST | /api/platform/organizations/:organizationId/packs/:packId/remove | PlatformAssetsController |
| GET | /api/activity/me | UserActivityController |
| GET | /api/activity/me/summary | UserActivityController |
| GET | /api/activity/workspaces/:workspaceId | UserActivityController |
| GET | /api/personalization/me/recommendations | PersonalizationController |
| DELETE | /api/personalization/me/saved-prompts/:promptId | PersonalizationController |
| POST | /api/artifacts | ArtifactsController |
| GET | /api/artifacts/:id | ArtifactsController |
| PATCH | /api/artifacts/:id | ArtifactsController |
| GET | /api/memory/short | MemoryController |
| GET | /api/memory/long | MemoryController |
| GET | /api/memory/clinical | MemoryController |
| POST | /api/two-factor/verify | TwoFactorController |
| GET | /api/subscriptions/config | SubscriptionsController |
| POST | /api/subscriptions/webhook | SubscriptionsController |
| POST | /api/chat/message-3d | ChatController |
| POST | /api/tools/execute | ToolOrchestratorController |
| POST | /api/tool-calling/execute | ToolCallingController |
| GET | /api/tool-calling/catalog | ToolCallingController |
| GET | /api/tool-calling/resolve | ToolCallingController |
| GET | /api/tool-calling/logs | ToolCallingController |
| POST | /api/cost-optimizer/route | CostOptimizerController |
| GET | /api/evaluation/metrics | EvaluationController |
| GET | /api/evaluation/runs | EvaluationController |
| GET | /api/drugs/categories | DrugController |
| GET | /api/drugs/:id | DrugController |
| POST | /api/drugs | DrugController |
| PUT | /api/drugs/:id | DrugController |
| DELETE | /api/drugs/:id | DrugController |
| GET | /api/protocols/:id | ProtocolController |
| POST | /api/protocols | ProtocolController |
| PUT | /api/protocols/:id | ProtocolController |
| DELETE | /api/protocols/:id | ProtocolController |
| GET | /api/audit/my-logs | AuditController |
| GET | /api/audit/phi-access | AuditController |
| POST | /api/compliance/export | ComplianceController |
| DELETE | /api/compliance/delete-account | ComplianceController |
| POST | /api/health | AnalyticsController |
| POST | /api/ai/query | AiController |
| POST | /api/ai/structured | AiController |
| GET | /api/ai/usage | AiController |
| GET | /api/audit/events | PlatformSystemsController |
| GET | /api/audit/events/:eventId | PlatformSystemsController |
| POST | /api/audit/export | PlatformSystemsController |
| GET | /api/audit/integrity/status | PlatformSystemsController |
| POST | /api/audit/integrity/verify | PlatformSystemsController |
| GET | /api/audit/patients/:patientId/access | PlatformSystemsController |
| GET | /api/audit/runs/:runId | PlatformSystemsController |
| GET | /api/fleet/alerts | FleetController |
| GET | /api/fleet/snapshot | FleetController |
| GET | /api/governance/ai-security/incidents | PlatformSystemsController |
| POST | /api/governance/ai-security/incidents/:incidentId/review | PlatformSystemsController |
| POST | /api/governance/ai-security/evaluate | PlatformSystemsController |
| GET | /api/governance/ai-security/model-access | PlatformSystemsController |
| PUT | /api/governance/ai-security/model-access/:policyId | PlatformSystemsController |
| GET | /api/governance/ai-security/rules | PlatformSystemsController |
| PUT | /api/governance/ai-security/rules/:ruleId | PlatformSystemsController |
| GET | /api/governance/ai-security/summary | PlatformSystemsController |
| GET | /api/governance/clinical/policies | PlatformSystemsController |
| POST | /api/governance/clinical/policies | PlatformSystemsController |
| POST | /api/governance/clinical/policies/:policyId/approve | PlatformSystemsController |
| PUT | /api/governance/clinical/policies/:policyId | PlatformSystemsController |
| GET | /api/governance/clinical/readiness | PlatformSystemsController |
| GET | /api/governance/clinical/release-gates | PlatformSystemsController |
| POST | /api/governance/clinical/release-gates/:gateId/decision | PlatformSystemsController |
| GET | /api/governance/clinical/safety-findings | PlatformSystemsController |
| POST | /api/governance/clinical/safety-findings/:findingId/review | PlatformSystemsController |
| GET | /api/governance/equity/cohorts | PlatformSystemsController |
| POST | /api/governance/equity/cohorts | PlatformSystemsController |
| GET | /api/governance/equity/findings | PlatformSystemsController |
| POST | /api/governance/equity/findings/:findingId/review | PlatformSystemsController |
| GET | /api/governance/equity/metrics | PlatformSystemsController |
| POST | /api/governance/equity/reports | PlatformSystemsController |
| GET | /api/governance/equity/summary | PlatformSystemsController |
| GET | /api/governance/regulatory/capabilities | PlatformSystemsController |
| GET | /api/governance/regulatory/capabilities/:capabilityId | PlatformSystemsController |
| POST | /api/governance/regulatory/capabilities/:capabilityId/approve | PlatformSystemsController |
| PUT | /api/governance/regulatory/capabilities/:capabilityId/classification | PlatformSystemsController |
| GET | /api/governance/regulatory/evidence/:capabilityId | PlatformSystemsController |
| POST | /api/governance/regulatory/evidence/:capabilityId/artifacts | PlatformSystemsController |
| GET | /api/governance/validation/release-gates/:capabilityId | PlatformSystemsController |
| GET | /api/governance/validation/runs/:runId | PlatformSystemsController |
| POST | /api/governance/validation/runs | PlatformSystemsController |
| POST | /api/governance/validation/runs/:runId/approve | PlatformSystemsController |
| GET | /api/governance/validation/scenarios | PlatformSystemsController |
| POST | /api/governance/validation/scenarios | PlatformSystemsController |
| GET | /api/governance/validation/synthetic-patients | PlatformSystemsController |
| GET | /api/hospital-map/devices/:deviceId | HospitalMapController |
| GET | /api/hospital-map/rooms | HospitalMapController |
| GET | /api/hospital-map/search | HospitalMapController |
| GET | /api/integrations/hl7/messages/quarantine | PlatformSystemsController |
| POST | /api/integrations/hl7/messages/:messageId/replay-preview | PlatformSystemsController |
| GET | /api/medical-iot/snapshot | TelemetryController |
| GET | /api/operations/deployments/current | PlatformSystemsController |
| GET | /api/operations/health | PlatformSystemsController |
| GET | /api/operations/incidents | PlatformSystemsController |
| POST | /api/operations/incidents/:incidentId/review | PlatformSystemsController |
| GET | /api/operations/observability/ai-runs | PlatformSystemsController |
| GET | /api/operations/observability/integrations | PlatformSystemsController |
| GET | /api/operations/observability/orchestrator | PlatformSystemsController |
| GET | /api/operations/observability/summary | PlatformSystemsController |
| GET | /api/operations/service-health | PlatformSystemsController |
| GET | /api/platform-governance/consent/:patientId | PlatformGovernanceController |
| POST | /api/platform-governance/consent/:patientId/:scope | PlatformGovernanceController |
| POST | /api/platform-governance/gate/evaluate | PlatformGovernanceController |
| GET | /api/platform-governance/observability | PlatformGovernanceController |
| POST | /api/platform-governance/privacy/:patientId/:requestType | PlatformGovernanceController |
| GET | /api/platform-governance/review/items | PlatformGovernanceController |
| POST | /api/platform-governance/review/items | PlatformGovernanceController |
| POST | /api/platform-governance/review/items/:itemId/decision | PlatformGovernanceController |
| GET | /api/platform-governance/security/events | PlatformGovernanceController |
| GET | /api/platform-governance/source-provenance/:sourceId | PlatformGovernanceController |
| GET | /api/platform-governance/summary | PlatformGovernanceController |
| GET | /api/platform-governance/synthetic/fhir | PlatformGovernanceController |
| GET | /api/platform-governance/synthetic/hl7 | PlatformGovernanceController |
| GET | /api/platform-governance/validation/scenarios | PlatformGovernanceController |
| POST | /api/platform-governance/validation/scenarios | PlatformGovernanceController |
| GET | /api/privacy/requests | PlatformSystemsController |
| POST | /api/privacy/requests/:requestId/review | PlatformSystemsController |
| GET | /api/profile/me/workspaces | UserProfileController |
| PATCH | /api/profile/me/workspaces/active | UserProfileController |
| GET | /api/review/items | PlatformSystemsController |
| POST | /api/review/items | PlatformSystemsController |
| GET | /api/review/items/:itemId | PlatformSystemsController |
| POST | /api/review/items/:itemId/assign | PlatformSystemsController |
| POST | /api/review/items/:itemId/comments | PlatformSystemsController |
| POST | /api/review/items/:itemId/decision | PlatformSystemsController |
| GET | /api/simulation/scenarios | SimulationController |
| GET | /api/simulation/scenarios/:id | SimulationController |
| POST | /api/simulation/runs | SimulationController |
| POST | /api/simulation/runs/:id/steps | SimulationController |
| POST | /api/simulation/runs/:id/complete | SimulationController |
| GET | /api/simulation/outcomes | SimulationController |
| GET | /api/simulation/recommendations | SimulationController |
| GET | /api/source-provenance/:sourceId | PlatformSystemsController |
| GET | /api/ai/organizations/:organizationId/usage | AIController |
| GET | /api/organizations/current/engine | OrganizationsController |
| GET | /api/organizations/:organizationId/engine | OrganizationsController |
| GET | /api/organizations/:organizationId/feature-flags | OrganizationsController |
| PATCH | /api/organizations/:organizationId/feature-flags | OrganizationsController |
| PATCH | /api/organizations/:organizationId/settings | OrganizationsController |
| GET | /api/organizations/:organizationId/tenant-admin | OrganizationsController |
| PATCH | /api/organizations/:organizationId/tenant-admin | OrganizationsController |
| PATCH | /api/organizations/:organizationId/commercial-plan | ProductCatalogController |
| GET | /api/platform/organizations/:organizationId/customer-success | PlatformAssetsController |
| POST | /api/subscriptions/downgrade | SubscriptionsController |
| POST | /api/subscriptions/trial/convert | SubscriptionsController |
| POST | /api/subscriptions/upgrade | SubscriptionsController |
| GET | /api/workspaces/context | WorkspacesController |
| GET | /api/workspaces/:workspaceId/context | WorkspacesController |
| GET | /api/metrics | MetricsController |

## Emergency OS Conditional Express Routes

| File | Mount | Service import |
| --- | --- | --- |
| backend/src/api/capacity.routes.ts | /api/capacity | from backend/src/services/index.ts |
| backend/src/api/copilot.routes.ts | /api/copilot | from backend/src/services/index.ts |
| backend/src/api/ems.routes.ts | /api/ems | from backend/src/services/index.ts |
| backend/src/api/ems.socket.ts | /api/ems.socket.ts | from backend/src/services/index.ts |
| backend/src/api/reassessment.routes.ts | /api/reassessment | from backend/src/services/index.ts |
| backend/src/api/smart-intake.routes.ts | /api/emergency/intake | from backend/src/services/index.ts |

## Recommended Safe Next Fixes

1. Promote conditional Emergency OS Express endpoints into default Nest modules or expose a runtime health indicator for `ENABLE_MONGOOSE_EMERGENCY_OS`.
2. Decide whether active UI should call `/api/capacity/dashboard`, `/api/ems/*`, `/api/reassessment/*`, and `/api/copilot/query` directly or keep using existing Nest chat/platform endpoints.
3. Remove or gate frontend inventory rows for future platform clients that are redirected away from the active Emergency OS surface.

