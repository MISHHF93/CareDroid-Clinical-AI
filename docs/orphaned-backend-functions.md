# Orphaned backend functions

**Generated:** 2026-08-22T18:42:52.317Z

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
| `/api/v1/governance/registry` | AIGovernanceV1Controller | Compatibility alias; SPA uses canonical CareDroid governance route |
| `/api/v1/governance/safety-rules` | AIGovernanceV1Controller | Compatibility alias; SPA uses canonical CareDroid governance route |
| `/api/v1/governance/compliance` | AIGovernanceV1Controller | Compatibility alias; SPA uses canonical CareDroid governance route |
| `/api/v1/governance/violations` | AIGovernanceV1Controller | Compatibility alias; SPA uses canonical CareDroid governance route |
| `/api/v1/governance/validate-prompts` | AIGovernanceV1Controller | Compatibility alias; SPA uses canonical CareDroid governance route |
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
| `FHIRService / MPIService / OCRService / TextMiningService` | `services + api/smart-intake.routes` | Mounted only by the optional Mongoose CareDroid smart-intake workflow |
| `LiveTrackingService legacy adapters` | `modules/live-tracking` | Legacy source-compatibility adapters; active routes live on FleetController, HospitalMapController, and TelemetryController |
| `EdgeAIAmbulanceService` | `services + api/ems.socket` | CareDroid WebSocket support registered from backend startup |

## B. Expose through SPA (recommended)

| Route | Controller | Client hint |
|-------|------------|-------------|

## C. Deferred / admin / SSO

| Route | Controller | Reason |
|-------|------------|--------|
| `/api/emergency/public-waiting-snapshot` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/staff` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/escalate` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/workflow-logs` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/ems/arrivals/:arrivalId/status` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/staff` | EmergencyOsController | HEAL-282 (roadmap G1): real staff directory read, added alongside real email/onDuty columns. No admin UI to browse/assign on-duty status exists yet -- an operator sets it via the PATCH endpoint below directly. Deferred, not gated: the data model and route are real, only the UI is pending. |
| `/api/emergency/staff/:staffId/duty-status` | EmergencyOsController | HEAL-282 (roadmap G1): marks a staff member on/off duty so waiting-room-safety escalation can route to a real on-duty charge nurse instead of only a static distribution list. Same deferred-UI status as GET /api/emergency/staff above. |
| `/api/emergency/copilot/interactions` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/clinical-calculators/results` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/digital-twin/organizational/simulate` | OrganizationalDigitalTwinController | Research controller; active ED digital twin UI uses the core EmergencyOsController endpoints |
| `/api/emergency/digital-twin/organizational/synchronize` | OrganizationalDigitalTwinController | Research controller; no dedicated SPA workflow yet |
| `/api/ems/ai-call-interrogation` | AICallInterrogationController | Research EMS call interrogation endpoint; not exposed in active ED shell |
| `/api/ems/ai-call-interrogation/ecg` | AICallInterrogationController | Research ECG interrogation endpoint; not exposed in active ED shell |
| `/api/ems/federated` | FederatedEMSController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ems/federated/health` | FederatedEMSController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ems/federated/round` | FederatedEMSController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ems/federated/112-call` | FederatedEMSController | Research federated EMS endpoint; no frontend intake workflow is wired |
| `/api/federated/lmecs/predict` | LMECSController | Research severity-prediction endpoint; no SPA client is wired |
| `/api/federated/lmecs/select` | LMECSController | Research client-selection endpoint; no SPA client is wired |
| `/api/handover/er-pulse` | ERPulseHandoverController | Research handover endpoint; active ED handoff UI is not mounted |
| `/api/auth/oidc` | AuthController | SSO placeholder |
| `/api/auth/saml` | AuthController | SSO placeholder |
| `/api/auth/me` | AuthController | JWT introspection; SPA uses profile |
| `/api/profile/me/preferences` | UserProfileController | ProfilePreferences.tsx reads the combined GET /api/profile/me via UserIdentityContext instead; the dead fetchPreferences() client wrapper was removed from userIdentityApi.ts |
| `/api/profile/me/activity` | UserProfileController | ProfileActivity.tsx reads the combined GET /api/profile/me via UserIdentityContext instead; the dead fetchActivity() client wrapper was removed from userIdentityApi.ts |
| `/api/profile/me/security` | UserProfileController | ProfileSecurity.tsx reads the combined GET /api/profile/me via UserIdentityContext instead; the dead fetchSecurity() client wrapper was removed from userIdentityApi.ts |
| `/api/workspaces` | WorkspacesController | No frontend client function calls this route |
| `/api/workspaces` | WorkspacesController | The dead createWorkspace() client wrapper was removed from userIdentityApi.ts; no page ever called it |
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
| `/api/personalization/me` | PersonalizationController | The dead fetchPersonalization() client wrapper was removed from userIdentityApi.ts; no page ever called it |
| `/api/personalization/me` | PersonalizationController | The dead updatePersonalization() client wrapper was removed from userIdentityApi.ts; no page ever called it |
| `/api/personalization/me/recommendations` | PersonalizationController | Personalization recommendations UI pending |
| `/api/personalization/me/saved-prompts` | PersonalizationController | The dead savePrompt() client wrapper was removed from userIdentityApi.ts; no page ever called it |
| `/api/personalization/me/saved-prompts/:promptId` | PersonalizationController | Saved prompt deletion UI pending |
| `/api/artifacts` | ArtifactsController | Artifact authoring is not exposed in dashboard yet |
| `/api/artifacts/:id` | ArtifactsController | Artifact detail route is not linked yet |
| `/api/artifacts/:id` | ArtifactsController | Artifact editing is not exposed in dashboard yet |
| `/api/memory/short` | MemoryController | Memory dashboard uses aggregate route |
| `/api/memory/long` | MemoryController | Memory dashboard uses aggregate route |
| `/api/memory/clinical` | MemoryController | Memory dashboard uses aggregate route |
| `/api/subscriptions/config` | SubscriptionsController | Stripe config for checkout UI |
| `/api/chat/message-3d` | ChatController | 3D avatar experiment |
| `/api/ai-feedback` | AiFeedbackController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surface-views` | SurfaceViewsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
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
| `/api/audit/integrity/verify` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/incidents/:incidentId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/evaluate` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/model-access` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/model-access/:policyId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/rules` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/ai-security/rules/:ruleId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies/:policyId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/policies/:policyId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/release-gates` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/release-gates/:gateId/decision` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/safety-findings` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/clinical/safety-findings/:findingId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/cohorts` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/findings` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/findings/:findingId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/equity/reports` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/capabilities/:capabilityId/classification` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/regulatory/evidence/:capabilityId/artifacts` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/runs` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/runs/:runId/approve` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/scenarios` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validation/synthetic-patients` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/devices/:deviceId` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/rooms` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/hospital-map/search` | HospitalMapController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/integrations/hl7/messages/quarantine` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/integrations/hl7/messages/:messageId/replay-preview` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/medical-iot/snapshot` | TelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/health` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/incidents/:incidentId/review` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/ai-runs` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/integrations` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/operations/observability/orchestrator` | PlatformSystemsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
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
| `/api/profile/me/workspaces` | UserProfileController | ProfileWorkspaces.tsx reads the combined GET /api/profile/me via UserIdentityContext instead; the dead fetchWorkspaces() client wrapper was removed from userIdentityApi.ts |
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
| `/api/subscriptions/downgrade` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/subscriptions/trial/convert` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/subscriptions/upgrade` | SubscriptionsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/workspaces/:workspaceId/context` | WorkspacesController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/auth/magic-link/verify` | AuthController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/auth/forgot-password` | AuthController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/auth/reset-password` | AuthController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/unified` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/proposals/:proposalId/audit` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/providers/health` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/models` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/tools` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/ai/requests/:requestId` | AIController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/registry` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/safety-rules` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/compliance` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/violations` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/validate-prompts` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/governance/evaluate-priority-change` | NestAiGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/copilot/query` | EdCopilotNestParityController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/document-artifacts` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/document-artifacts/extract` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/patients/:patientId/document-artifacts/:artifactId/review` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/native-ai/triage-rules` | NativeAiController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/native-ai/triage-rules` | NativeAiController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/native-ai/triage-rules/evaluate` | NativeAiController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/native-ai/route` | NativeAiController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/native-ai/specialists/infer` | NativeAiController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/alerts` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/cameras/registry` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/health` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/incidents` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/integrations` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/iot/registry` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/nexus/snapshot` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/surveillance/zones` | SurveillanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/ai/recommendations` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/alarms` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/alarms/:id/events` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/analytics` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/command-snapshot` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/geofences` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/health` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/inbound` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/units` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/units/:unitId/positions` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/ai/recommendations/:id/review` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/alarms` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/alarms/:id/:action` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/inbound` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/inbound/:id/prep-recommendation` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/ingest/cad` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/sentinel/poll` | SentinelController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/workspaces/invitations/:token` | WorkspaceInvitationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/workspaces/invitations/:token/accept` | WorkspaceInvitationsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels/:channelId/archive` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/messages/:messageId` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/messages/:messageId/reactions/:emoji` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/messages/:messageId/pin` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/messages/:messageId/pin` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels/:channelId/pinned` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels/:channelId/membership` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/messages/:messageId/attachments` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels/:channelId/external-links` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/channels/:channelId/external-links/:provider` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/search` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/incidents` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/incidents/:channelId/resolve` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/collaboration/analytics/summary` | CollaborationHubController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-health` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-jobs` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-jobs/:jobId` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-jobs` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-jobs/:jobId/apply` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/intake/ocr-jobs/:jobId/fields/:field/review` | EmergencyOsController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/observability/diagnostics` | PlatformTelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/observability/health` | PlatformTelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/observability/performance` | PlatformTelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/observability/traces/:correlationId` | PlatformTelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/observability/events` | PlatformTelemetryController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/rag/health` | RAGController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/rag/stats` | RAGController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/governance/evaluate-priority-change` | EmergencyAIGovernanceController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/v1/governance/evaluate-priority-change` | AIGovernanceV1Controller | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/surge/activate` | SurgeController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/surge/batch-ems-intake` | SurgeController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/surge/bottlenecks` | SurgeController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/emergency/surge/deactivate` | SurgeController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/deterioration` | DeteriorationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/deterioration/health` | DeteriorationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/deterioration/predict` | DeteriorationController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/protocol` | ProtocolController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/protocol/health` | ProtocolController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/protocol/evaluate` | ProtocolController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/navigator/health` | AppNavigatorController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |
| `/api/navigator/catalog` | AppNavigatorController | Cataloged backend route; frontend exposure is tracked by platform wiring inventory. |

## D. Frontend calls without backend (gated)

| ID | Method | Path | Capability | Client |
|----|--------|------|------------|--------|
| chat-messages-sync | POST | `/api/chat/messages` | chatPersistence | syncService.js |
| chat-conversations-sync | POST | `/api/chat/conversations` | chatPersistence | syncService.js |
| tools-share-results | POST | `/api/tools/share-results` | toolsShareResults | ToolResultShare.jsx |
| notifications-stream | GET | `/api/notifications/stream` | notificationStream | NotificationService.js |
| notifications-send-channel | POST | `/api/notifications/send/:channel` | notificationSendChannel | src/test/fixtures/legacyNotificationService.ts |
| team-users | GET | `/api/team/users` | teamManagement | TeamManagement.jsx |
| team-user-update | PUT | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-user-delete | DELETE | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-invite | POST | `/api/team/invite` | teamManagement | TeamManagement.jsx |
| bulk-sync | POST | `/api/sync` | bulkSync | offline.js / OfflineSupport.jsx |
| clinical-alerts-stream | GET | `/api/clinical/alerts/stream` | clinicalAlertsStream | clinicalAlertsApi.js / ClinicalAlertsPage.jsx |
| emergency-capacity-history | GET | `/api/emergency/capacity/history` | emergencyCapacityHistory | emergencyAnalyticsApi.js |
| emergency-queue-analytics | GET | `/api/emergency/queues/analytics` | emergencyQueueAnalytics | emergencyAnalyticsApi.js |
| emergency-shift-report-export | GET | `/api/emergency/shift/report/export` | emergencyShiftReportExport | emergencyAnalyticsApi.js |
| emergency-referral-history | GET | `/api/emergency/patients/:patientId/referrals` | emergencyReferralHistory | emergencyTransportApi.js |
| emergency-diversion-status | GET | `/api/emergency/diversion/status` | emergencyDiversionStatus | emergencyTransportApi.js |
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## E. POST executors

Registered: `sofa-calculator`, `drug-interactions`, `lab-interpreter`, `heart-score`, `cha2ds2vasc-calculator`, `wells-pe`, `shock-index`, `apache2-calculator`, `anion-gap`, `aa-gradient`, `news2`, `abcd2`, `canadian-c-spine`, `nexus-cspine`, `gcs-calculator`, `chads2`, `duke-treadmill-score`, `reynolds-risk-score`, `has-bled`, `timi-ua-nstemi`, `framingham-risk`, `grace-acs`, `corrected-calcium`, `corrected-sodium`, `fena`, `feurea`, `osmolal-gap`, `serum-osmolality`, `pao2-fio2-ratio`, `rox-index`, `mews`, `revised-trauma-score`, `hunt-hess-scale`, `ich-score`, `four-score`, `modified-rankin-scale`, `pecarn-head`, `wells-dvt-calculator`, `abg-interpreter`

NLU profiles without POST executor (180): client-side / chat only.

## F. Exposure strategy summary

| Tier | Action |
|------|--------|
| P0 | Keep capability gates on phantom frontend paths until Nest implements or UI removed |
| P1 | Keep `clinicalToolsApi` coverage for validate, catalog/executors, statistics |
| P1 | Keep `complianceApi` coverage for consent, export, and delete-account |
| P2 | Keep protocol/drug GET clients covered in the reference inventory |
| P3 | Chat suggest-action / analyze-vitals on dashboard |

## Quick counts

| Category | Count |
|----------|------:|
| Backend HTTP routes (total inventory) | 656 |
| Wired frontend → backend | 378 |
| Backend-only / deferred (policy) | 280 |
| Gated frontend (no route) | 21 |
| POST executors | 39 |

_Cross-check: total inventory (656) should equal wired (378) + backend-only (280) + any remaining unlisted routes. See [backend-exposure-report.md](./backend-exposure-report.md) for the authoritative scan._

