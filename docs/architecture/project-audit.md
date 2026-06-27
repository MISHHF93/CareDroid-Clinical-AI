# CareDroid Emergency OS Project Audit

Audit date: 2026-06-11

## Executive Summary

The active frontend product is already being refocused around `CareDroid Emergency OS`, with `/emergency` as the landing route and `src/layout/AppShell.jsx` as the single active app chrome. The richest Emergency OS behavior currently lives in the frontend `store/emergencyStore.ts`, shared `types/emergency.ts`, `engine/alertEngine.ts`, and emergency-specific components under `src/components` plus a few pages under `src/pages/emergency`.

The backend is still a broad CareDroid platform backend. Emergency OS data is exposed through `backend/src/modules/platform-systems/platform-systems.controller.ts` using in-memory arrays for patients, staff, rooms, shift, EMS, and referrals. There is not yet a dedicated persisted Emergency OS backend module, whiteboard endpoint, journey event bus, queue endpoint, reassessment task table, capacity table, boarding table, or Smart Intake/OCR domain.

The repository contains extensive future-module work for governance, platform assets, fleet, IoT, digital twin, research, education, simulation, tools, commercial packaging, and enterprise administration. Most of that is hidden behind `FUTURE_RELEASE_ROUTES`, compatibility navigation exports, or feature flags, but the files remain in the same top-level `src/pages`, `src/services`, and `backend/src/modules` namespaces. This is why a direct move to `src/features/emergency` and `src/features/future-modules` should be performed after domain/API boundaries are created and verified, not as a blind filesystem move.

## Current Product Entry Points

Primary active routes in `src/App.jsx`:

- `/` and `/emergency` redirect to `/emergency/whiteboard`.
- `/emergency/whiteboard` renders `EmergencyWhiteboard`.
- `/emergency/patients` renders the Emergency OS patient list/search support route.
- `/emergency/ems` renders `EMSPipeline`.
- `/emergency/intake` renders `SmartIntake`.
- `/emergency/queues` renders the queue support route.
- `/emergency/reassessment` renders the reassessment support route/drawer entry.
- `/emergency/capacity` renders capacity detail.
- `/emergency/boarding` renders boarding detail.
- `/emergency/referrals` renders `ReferralPanel`.
- `/emergency/copilot` renders the ED Copilot support route.
- `/emergency/tools` renders `ToolsOverview`; calculator intent embeds `ClinicalCalculatorHub` with `source=calculators&filter=calculator`.
- `/emergency/pulse` renders `EmergencyDepartmentPulse`.
- `/emergency/shift` renders `EmergencyShiftSummary`.
- `/emergency/analytics` renders `EmergencyAnalytics`.
- `/emergency/settings` renders `EmergencySettingsRoute`.
- `*` redirects to `/emergency/whiteboard`.

Emergency compatibility redirects and aliases in `src/App.jsx`:

- `/dashboard`, `/home`, `/workspace`, `/app`, and broad workspace aliases redirect to `/emergency/whiteboard`.
- `/assistant`, `/chat`, `/ai`, and `/copilot` redirect to `/emergency/copilot`.
- `/tools`, `/tools/*`, `/calculators`, `/calculators/*`, `/scores/*`, `/all-tools`, `/clinical-tools`, `/catalog`, and `/protocols/*` redirect into `/emergency/tools`.
- Operational legacy roots such as `/operations/*`, `/fleet/*`, `/hospital-map`, `/medical-iot`, `/devices`, and live-map aliases redirect into `/emergency/tools` with operations/map context.
- Retired Emergency OS feature paths such as provincial health, integrations, simulation, federated learning, digital twin, and AI governance redirect to `/emergency/whiteboard` unless promoted by a later product decision.

Future-release route families in `src/App.jsx`:

- Platform and admin: `/executive`, `/discover`, `/recommendations`, `/workspaces`, `/search`, `/assets`, `/artifacts`, `/ai-models`, `/platform-learning-engine`, `/platform-admin`, `/billing`, `/usage`, `/organization`, `/tenant-admin`, `/settings/organization`, `/platform-analytics`, `/customer-success`, `/organization-intelligence`, `/success-center`, `/departments`, `/service-lines`, `/feature-flags`, `/plugins`, `/dependency-map`, `/dependency-graph`, `/data-lineage`, `/self-diagnostics`, `/system-health`, `/saas-health`.
- Workflow and automation: `/automation-audit`, `/automation-analytics`, `/workflows`, `/workflow-mining`, `/workspace-dependency-graph`.
- AI and memory: `/brain`, `/business-brain`, `/memory`, `/ai-memory`, `/training`, `/ai-evaluation`, `/ai-command-center`.
- Future clinical/education/research modules: `/documentation`, `/knowledge-graph`, `/predictive-analytics`, `/clinical-decision-support`, `/competencies`, `/credentials`, `/simulation`, `/simulation/outcomes`, `/simulation/*`, `/laboratory`, `/3d-viewer`, `/protocols`, `/research`, `/clinical/alerts`.
- Fleet, IoT, and maps: `/digital-twin`, `/operations`, `/digital-twin-intelligence`, `/live-map`, `/medical-iot`, `/hospital-map`, `/devices`, `/fleet/command`, `/fleet/map`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer`, `/fleet/*`.
- Commercial packaging: `/customer-portal`, `/knowledge-base`, `/marketplace`, `/enterprise-readiness`, `/products`, `/asset-packs`, `/plans`, `/specialties`, `/care-pathways`, `/agents`, `/maturity-assessment`, `/outcomes`, `/value-tracking`, `/product-intelligence`, `/expansion-opportunities`, `/integrations-marketplace`, `/integration-readiness`, `/configuration-studio`, `/solution-builder`.
- Governance and compliance: `/ai-governance`, `/security`, `/regulatory`, `/equity`, `/human-review`, `/review`, `/audit`, `/analytics`, `/costs`, `/governance`.
- Legal/account/support: `/profile`, `/notifications`, `/notification-preferences`, `/two-factor-setup`, `/biometric-setup`, `/welcome`, `/onboarding`, `/consent`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/version`, `/shared/tools/:shareId`, `/team`.

## Navigation and Layout

Canonical active app chrome:

- `src/layout/AppShell.jsx` owns the header, sidebar rail, capacity badge, shift controls, alerts, command palette, Copilot panel, reassessment drawer, staff/workload panel, pediatric drug calculator launcher, EMS critical broadcast, and global keyboard shortcuts.
- `src/layout/AppShell.css` owns the app shell layout and responsive rail.
- `src/config/navigation.config.js` exports `APP_SHELL_NAV_ITEMS`, which is the active rail source.
- `src/navigation/primaryNavigation.js` is a compatibility re-export only.

Active pilot-visible rail items in `NAVIGATION_ITEMS` / `APP_SHELL_NAV_ITEMS`:

- `whiteboard` -> `/emergency/whiteboard`
- `patients` -> `/emergency/patients`
- `ems` -> `/emergency/ems`
- `intake` -> `/emergency/intake`
- `queues` -> `/emergency/queues`
- `reassessment` -> `/emergency/reassessment`
- `capacity` -> `/emergency/capacity`
- `boarding` -> `/emergency/boarding`
- `referrals` -> `/emergency/referrals`
- `copilot` -> `/emergency/copilot`
- `tools` -> `/emergency/tools`
- `analytics` -> `/emergency/analytics`
- `settings` -> `/emergency/settings`

Remaining navigation duplication:

- `PRIMARY_NAV_ITEMS`, `PRIMARY_SIDEBAR_NAV_ITEMS`, `ACCOUNT_UTILITY_NAV_ITEMS`, `SOLUTIONS_SIDEBAR_NAV_ITEMS`, `OPERATIONS_SIDEBAR_NAV_ITEMS`, and `ADVANCED_SIDEBAR_NAV_ITEMS` still exist for compatibility, tests, search, command destinations, and audits.
- Some compatibility tests still assert old workspace path ownership such as `/workspace/emergency/referrals` under `operations`.
- `src/data/duplicateSystemAudit.js` already identifies route, navigation, inventory, and workspace-model duplication.

Removed or inactive duplicate layout references:

- Deleted legacy shell files are not currently imported by production source according to the import scan: `Sidebar`, `AuthShell`, `PublicShell`, `PageContainer`, `WorkspaceSwitcher`, `Toast`, `useToast`, `useDrawerFocus`, `medicalDataService`, and `openaiService` did not appear as active imports.
- `src/layout/AppShell.layout.test.js` explicitly guards against reintroducing `AuthShell` and `PublicShell`.

## Frontend Emergency OS Inventory

Core Emergency OS components:

- `src/components/EmergencyWhiteboard.jsx`
- `src/components/PatientCard.jsx`
- `src/components/NewPatientIntake.jsx`
- `src/components/QueueIntelligencePanel.jsx`
- `src/components/ReassessmentDrawer.jsx`
- `src/components/ChatInterface.jsx`
- `src/components/CommandPalette.jsx`
- `src/components/ClinicalScoreCalculator.jsx`
- `src/components/PediatricDrugCalculator.jsx`
- `src/components/WhoNextPanel.jsx`
- `src/components/EscalateButton.jsx`
- `src/components/CrisisMode.jsx`
- `src/components/EMSCriticalBroadcast.jsx`
- `src/components/EMSPipeline.jsx`
- `src/components/EMSPressureScore.jsx`
- `src/components/ReferralPanel.jsx`
- `src/components/ShiftSummary.jsx`
- `src/components/WorkloadBalancePanel.jsx`
- `src/components/JourneyTimeline.jsx`
- `src/components/ProtocolSuggestion.jsx`

Emergency pages:

- `src/pages/emergency/ClinicalCalculatorHub.jsx`
- `src/pages/emergency/DepartmentPulse.jsx`
- `src/pages/emergency/EmergencyAnalytics.jsx`
- `src/pages/emergency/EmergencySettings.jsx`

Primary Emergency OS state and engines:

- `store/emergencyStore.ts`
- `types/emergency.ts`
- `engine/alertEngine.ts`
- `engine/triageEngine.ts`
- `src/utils/longWaitRescue.js`
- `src/utils/vitalsAlertPipeline.js`
- `src/utils/reassessmentScheduler.js`
- `src/utils/staffManagement.js`
- `src/utils/crisisMode.js`
- `src/utils/autoScorePopulator.js`
- `src/utils/whoNext.js`
- `config/criticalChecklists.ts`

Older or parallel Emergency OS service layer:

- `src/services/emergencyWhiteboardService.js`
- `src/services/queueIntelligenceService.js`
- `src/services/PatientJourneyEngine.js`
- `src/services/ReassessmentEngine.js`
- `src/services/CapacityIntelligence.js`
- `src/services/emergencyOperatingSystemService.js`
- `src/services/emergencyFlowEngineService.js`
- `src/services/emergencyCapacityIntelligenceService.js`
- `src/services/emergencyDemoEnvironmentService.js`
- `src/services/emsPreArrivalPipelineService.js`
- `src/services/emsOffloadCommandCenterService.js`
- `src/services/emergencyTransportApi.js`
- `src/services/emergencyAnalyticsApi.js`
- `src/services/emergencySettingsApi.js`
- `src/services/emergencyRealtimeService.js`
- `src/services/emergencyStaffingApi.js`
- `src/services/patientManagementApi.js`
- `src/services/referralHub.js`
- `src/services/boardingIntelligenceEngine.js`
- `src/services/emergencyIntakeOperatingSystemService.js`
- `src/services/emergencyEscalationEngineService.js`
- `src/services/emergencyPatientPathService.js`
- `src/services/emergencyKpiLayerService.js`
- `src/services/emergencyResourceBoardService.js`
- `src/services/waitingRoomIntelligenceService.js`
- `src/services/doorToDoctorIntelligenceService.js`

Important frontend gap:

- `src/components/EmergencyWhiteboard.jsx` reads from `useEmergencyStore`, not a real whiteboard API.
- `src/services/emergencyWhiteboardService.js` builds a demo whiteboard from demo services and returns `sourceState: 'Demo data · No live integration'` for card data.
- Queue, capacity, reassessment, EMS, and boarding services have substantial demo/local intelligence logic, but primary pages are not consistently wired to persisted backend APIs.

## Shared Domain Types

Current shared Emergency OS domain file:

- `types/emergency.ts`

Already present:

- `PatientState`
- `Priority`
- `PatientFlag`
- `Vitals`
- `JourneyEvent`
- `Referral`
- `EMSArrival`
- `CriticalChecklistRecord`
- `Patient`
- `Queue`
- `Alert`
- `ReassessmentReminder`
- `VitalsAlert`
- `Staff`
- `StaffWorkload`
- `Room`
- `Shift`
- `EMSUnit`
- `CapacitySnapshot`
- `ReassessmentQueueItem`
- `WhiteboardFilter`
- `PatientJourneyAuditEvent`

Still missing or only partially represented against the requested shared-domain contract:

- `Encounter`
- `JourneyState` as an uppercase API enum contract distinct from UI `PatientState`
- `JourneyTransition`
- `VitalSigns` as a backend/API DTO name
- `ReassessmentTask`
- `CapacityStatus`
- `BoardingRecord`
- `ReferralRequest`
- `OperationalAlert`
- `CopilotContext`

## Patient Journey Engine

Implemented:

- `types/emergency.ts` defines `PatientState` with `Arrival`, `Registration`, `Triage`, `Waiting`, `Assessment`, `Orders`, `Results`, `Disposition`, `Admission`, `Discharge`, and `Deceased`.
- `src/services/PatientJourneyEngine.js` defines `PATIENT_STATE_SEQUENCE`, validates one-step forward transitions, and emits a local audit event object.
- `store/emergencyStore.ts` contains `movePatientState`, patient timeline updates, derived queues, reassessment logic, capacity recalculation, alerts, EMS conversion, referral updates, escalation, and reminders.

Gaps:

- No centralized `JourneyTransition` type with valid transition matrix, role authorization, or override reason.
- No backend persistence for `currentState`, `stateHistory`, `stateStartedAt`, or encounter-scoped journey transitions.
- No event layer publishing domain events like `PatientQueued`, `OrdersPlaced`, or `CapacityChanged`.
- Existing state enum uses title-case strings; requested event/API contract uses uppercase constants such as `ARRIVAL` and `REGISTRATION`.

## Event Layer

Implemented locally:

- `JourneyEventType` in `types/emergency.ts` includes arrival, registration, triage, state changes, staff/room assignment, vitals updates, orders/results, referrals, disposition, notes, flags, protocol launches, scores, reassessment reminders, vitals alerts, EMS critical broadcasts, escalation, and escalation cancellation.
- `engine/alertEngine.ts` derives alerts from patients, capacity, EMS arrivals, referrals, queues, reminders, vitals, and long waits.

Missing:

- No explicit publish/subscribe event bus.
- No persisted event log for the requested events: `PatientArrived`, `PatientRegistered`, `PatientTriaged`, `PatientQueued`, `PatientAssigned`, `OrdersPlaced`, `ResultsReceived`, `DispositionStarted`, `PatientAdmitted`, `PatientDischarged`, `EMSCreated`, `EMSArrived`, `OffloadCompleted`, `ReassessmentDue`, `ReassessmentCompleted`, `BoardingStarted`, `BoardingEnded`, `ReferralCreated`, `ReferralClosed`, `CapacityChanged`, and `OperationalAlertCreated`.
- No backend subscribers for queue, whiteboard, capacity, reassessment, analytics, alerts, and Copilot context.

## Backend Endpoint Inventory

Canonical route inventory source:

- `src/data/backendHttpRouteInventory.js`

Backend module registry:

- `backend/src/app.module.ts` imports a large platform module set: auth, users, subscriptions, two-factor, AI, clinical, audit, compliance, chat, clinical intelligence, analytics, notifications, permissions, workspaces, user activity, personalization, artifacts, memory, tool calling, training, cost optimizer, evaluation, platform governance, governance, LLM security, interoperability, regulatory, equity, human review, privacy center, EHR audit, observability, user profile, live tracking, hospital map, telemetry, fleet, workspace intelligence, simulation, clinical alerts, platform systems, platform assets, organizations, product catalog, tenant context, automation audit, medical control plane, and encryption.

Backend controllers present:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/biometric.controller.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/user-profile/user-profile.controller.ts`
- `backend/src/modules/workspaces/workspaces.controller.ts`
- `backend/src/modules/organizations/organizations.controller.ts`
- `backend/src/modules/organizations/settings-features.controller.ts`
- `backend/src/modules/organizations/white-label.controller.ts`
- `backend/src/modules/platform-systems/platform-systems.controller.ts`
- `backend/src/modules/platform-assets/platform-assets.controller.ts`
- `backend/src/modules/platform-governance/platform-governance.controller.ts`
- `backend/src/modules/product-catalog/product-catalog.controller.ts`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/ai/ai.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`
- `backend/src/modules/tool-calling/tool-calling.controller.ts`
- `backend/src/modules/clinical/drug.controller.ts`
- `backend/src/modules/clinical/protocol.controller.ts`
- `backend/src/modules/clinical-alerts/clinical-alerts.controller.ts`
- `backend/src/modules/audit/audit.controller.ts`
- `backend/src/modules/compliance/compliance.controller.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/notifications/notification.controller.ts`
- `backend/src/modules/subscriptions/subscriptions.controller.ts`
- `backend/src/modules/personalization/personalization.controller.ts`
- `backend/src/modules/user-activity/user-activity.controller.ts`
- `backend/src/modules/artifacts/artifacts.controller.ts`
- `backend/src/modules/memory/memory.controller.ts`
- `backend/src/modules/training/training.controller.ts`
- `backend/src/modules/evaluation/evaluation.controller.ts`
- `backend/src/modules/cost-optimizer/cost-optimizer.controller.ts`
- `backend/src/modules/fleet/fleet.controller.ts`
- `backend/src/modules/live-tracking/live-tracking.controller.ts`
- `backend/src/modules/live-tracking/hospital-live-tracking.controller.ts`
- `backend/src/modules/live-tracking/device-live-tracking.controller.ts`
- `backend/src/modules/hospital-map/hospital-map.controller.ts`
- `backend/src/modules/telemetry/telemetry.controller.ts`
- `backend/src/modules/simulation/simulation.controller.ts`
- `backend/src/modules/tenant-context/tenant-context.controller.ts`
- `backend/src/modules/metrics/metrics.controller.ts`
- `backend/src/modules/automation-audit/automation-audit.controller.ts`

Emergency OS backend endpoints currently exposed by `PlatformSystemsController`:

- `GET /api/patients`
- `GET /api/patients/:patientId`
- `POST /api/patients`
- `PATCH /api/patients/:patientId`
- `GET /api/staff`
- `GET /api/rooms`
- `GET /api/shift`
- `GET /api/ems`
- `GET /api/referrals`
- `POST /api/referrals`

Emergency OS backend gaps:

- No `GET /api/emergency/whiteboard`.
- No `GET /api/emergency/queues/analytics` route currently backed by an Emergency OS module.
- No `GET /api/emergency/analytics` route currently backed by an Emergency OS module.
- No `GET /api/emergency/capacity/history` route currently backed by an Emergency OS module.
- No `GET /api/emergency/diversion/status` route currently backed by an Emergency OS module.
- No `PATCH /api/emergency/transfers/:referralId/status` route currently backed by an Emergency OS module.
- No `GET /api/emergency/shift/report/export` route currently backed by an Emergency OS module.
- No persisted API for Smart Intake, OCR ingestion, reassessment tasks, boarding records, EMS offload, event streams, or Copilot operational context snapshots.

## Database Model Inventory

TypeORM is configured in `backend/src/app.module.ts` with `entities: [__dirname + '/**/*.entity{.ts,.js}']`. In local development without Postgres config it uses SQLite at `caredroid.dev.sqlite`; `synchronize: true` is enabled.

Entity files present:

- `backend/src/modules/ai/entities/ai-query.entity.ts`
- `backend/src/modules/analytics/entities/analytics-event.entity.ts`
- `backend/src/modules/artifacts/entities/artifact.entity.ts`
- `backend/src/modules/artifacts/entities/artifact-version.entity.ts`
- `backend/src/modules/audit/entities/audit-log.entity.ts`
- `backend/src/modules/auth/entities/biometric-config.entity.ts`
- `backend/src/modules/auth/entities/refresh-token.entity.ts`
- `backend/src/modules/automation-audit/entities/automation-audit-event.entity.ts`
- `backend/src/modules/clinical/entities/drug.entity.ts`
- `backend/src/modules/clinical/entities/protocol.entity.ts`
- `backend/src/modules/encryption/entities/encryption-key.entity.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/entities/tool-result.entity.ts`
- `backend/src/modules/memory/entities/clinical-memory-entry.entity.ts`
- `backend/src/modules/memory/entities/long-memory-entry.entity.ts`
- `backend/src/modules/memory/entities/short-memory-entry.entity.ts`
- `backend/src/modules/notifications/entities/device-token.entity.ts`
- `backend/src/modules/notifications/entities/notification-preference.entity.ts`
- `backend/src/modules/notifications/entities/notification.entity.ts`
- `backend/src/modules/organizations/entities/organization-membership.entity.ts`
- `backend/src/modules/personalization/entities/saved-prompt.entity.ts`
- `backend/src/modules/personalization/entities/user-ai-preference.entity.ts`
- `backend/src/modules/platform-assets/entities/asset-pack.entity.ts`
- `backend/src/modules/platform-assets/entities/organization-entitlement.entity.ts`
- `backend/src/modules/platform-assets/entities/platform-asset.entity.ts`
- `backend/src/modules/platform-assets/entities/role-profile.entity.ts`
- `backend/src/modules/platform-governance/entities/platform-governance.entity.ts`
- `backend/src/modules/product-catalog/entities/care-pathway.entity.ts`
- `backend/src/modules/product-catalog/entities/commercial-plan.entity.ts`
- `backend/src/modules/product-catalog/entities/integration-offering.entity.ts`
- `backend/src/modules/product-catalog/entities/product.entity.ts`
- `backend/src/modules/product-catalog/entities/specialty-catalog.entity.ts`
- `backend/src/modules/subscriptions/entities/subscription.entity.ts`
- `backend/src/modules/subscriptions/entities/usage-event.entity.ts`
- `backend/src/modules/two-factor/entities/two-factor.entity.ts`
- `backend/src/modules/user-activity/entities/user-activity.entity.ts`
- `backend/src/modules/user-profile/entities/professional-profile.entity.ts`
- `backend/src/modules/user-profile/entities/user-preference.entity.ts`
- `backend/src/modules/users/entities/oauth-account.entity.ts`
- `backend/src/modules/users/entities/user-profile.entity.ts`
- `backend/src/modules/users/entities/user.entity.ts`
- `backend/src/modules/workspaces/entities/organization.entity.ts`
- `backend/src/modules/workspaces/entities/user-workspace-state.entity.ts`
- `backend/src/modules/workspaces/entities/workspace-invitation.entity.ts`
- `backend/src/modules/workspaces/entities/workspace-membership.entity.ts`
- `backend/src/modules/workspaces/entities/workspace.entity.ts`

Missing Emergency OS database models:

- `Patient`
- `Encounter`
- `JourneyTransition`
- `JourneyEvent`
- `EMSArrival`
- `EMSOffload`
- `ReassessmentTask`
- `CapacitySnapshot`
- `BoardingRecord`
- `ReferralRequest`
- `OperationalAlert`
- `CopilotContextSnapshot`
- `SmartIntakeDocument`
- `SmartIntakeExtraction`
- `StaffVerification`

Migration files:

- `backend/src/database/migrations/1706609000000-EncryptPhiColumns.ts`

Local database files detected in working tree:

- `caredroid.sqlite`
- Earlier git status snapshots also showed `backend/caredroid.dev.sqlite`; current status shows `caredroid.sqlite`.

These should not be committed unless intentionally converted into seed fixtures.

## Frontend and Backend Path Mismatches

Feature registry endpoints without confirmed backend routes:

- `ems_pipeline` and `ems_pressure_score` point to `/api/fleet/snapshot`, but the active Emergency OS EMS route is `/emergency/ems` and current Emergency OS EMS backend data is exposed at `/api/ems`.
- `referral_intelligence` points to `/api/emergency/referrals`, but current backend exposes `GET /api/referrals` and `POST /api/referrals`.
- `capacity_intelligence` points to `/api/emergency/capacity/history`, but no matching backend route was found in the route inventory.
- `boarding_intelligence` and `shift_analytics` point to `/api/emergency/analytics`, but no matching backend route was found.
- `queue_intelligence` points to `/api/emergency/queues/analytics`, but no matching backend route was found.
- `diversion_manager` points to `/api/emergency/diversion/status`, but no matching backend route was found.
- `transfer_center` points to `/api/emergency/transfers/:referralId/status`, but no matching backend route was found.
- `shift_quality_export` points to `/api/emergency/shift/report/export`, but no matching backend route was found.
- `emergency_settings` points to `/api/organizations/:organizationId/feature-flags`, while active settings feature toggles use `/api/settings/features`.

Frontend service endpoints that need Emergency OS backend alignment:

- `src/services/emergencyAnalyticsApi.js` calls `/api/emergency/analytics`, `/api/emergency/capacity/history`, `/api/emergency/queues/analytics`, and `/api/emergency/shift/report/export`.
- `src/pages/settings/FeatureManagement.jsx` advertises `/api/emergency/diversion/status`, `/api/emergency/transfers/:referralId/status`, and `/api/emergency/shift/report/export`.
- `src/services/patientManagementApi.js` calls `/api/patients/:patientId/*`; these are implemented in `PlatformSystemsController`, but they are patient-shell endpoints, not an encounter/whiteboard API.
- `src/services/emergencyWhiteboardService.js` references `/workspace/emergency/*` workspace routes, while active routes are `/emergency/*` plus redirects.

## Fixtures, Mock Data, and Demo Sources

Primary demo/local data sources:

- `store/emergencyStore.ts` contains seeded patients, staff, rooms, EMS units/arrivals, referrals, queues, shift, and capacity state.
- `backend/src/modules/platform-systems/platform-systems.controller.ts` contains in-memory `emergencyPatients`, `emergencyStaff`, `emergencyRooms`, `emergencyEmsUnits`, `emergencyEmsArrivals`, and `emergencyReferrals`.
- `src/services/emergencyDemoEnvironmentService.js` is a demo environment source used by older Emergency OS services.
- `src/services/emergencyWhiteboardService.js` builds demo whiteboard cards from demo services.
- `src/services/queueIntelligenceService.js` contains `DEFAULT_EMERGENCY_QUEUE_STATE`.
- `src/services/emsPreArrivalPipelineService.js`, `src/services/emsOffloadCommandCenterService.js`, `src/services/boardingIntelligenceEngine.js`, and related service files contain local/demo operational datasets.

Backend seed services:

- `backend/src/modules/product-catalog/product-catalog.seed.service.ts`
- `backend/src/modules/platform-assets/platform-assets.seed.service.ts`
- `backend/src/modules/artifacts/artifact.seed.ts`

Requested 24-hour, 7-day, and 30-day Emergency OS fixtures do not yet exist as a canonical seed package.

## Duplicate Files and Duplicate Systems

Duplicate system audit source:

- `src/data/duplicateSystemAudit.js`

Known duplicate or competing systems:

- Routes are defined in both `src/config/routes.config.js` and the inline route table in `src/App.jsx`.
- Navigation has multiple projections: `APP_SHELL_NAV_ITEMS`, `PRIMARY_NAV_ITEMS`, `PRIMARY_SIDEBAR_NAV_ITEMS`, `QUICK_COMMAND_DESTINATION_ITEMS`, and account/solutions/operations/advanced arrays.
- Tool metadata has multiple layers: `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `toolInventory.js`, `segmentInventory.js`, and `toolVisibilityMatrix.js`.
- Notification services exist at both `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js`.
- Emergency OS logic exists in both newer store/component code and older service demos such as `emergencyWhiteboardService.js`, `emergencyOperatingSystemService.js`, `emergencyFlowEngineService.js`, `PatientJourneyEngine.js`, `ReassessmentEngine.js`, and `CapacityIntelligence.js`.
- There are route families for both current Emergency OS `/emergency/*` routes and older `/workspace/emergency/*` routes.
- There are future-module platform pages in `src/pages` and emergency pages in both `src/components` and `src/pages/emergency`, not yet grouped under `src/features`.

Path-shape note:

- Some tool outputs on Windows report both slash and backslash variants, for example `src/layout/AppShell.jsx` and `src\layout\AppShell.jsx`. These are path-rendering variants on Windows, not necessarily separate files. Actual duplicate detection should use git-index and filesystem checks before deletion.

## Broken Imports and Stale References

Current lint state before this audit was clean for recently touched files. A targeted scan found no active imports of the deleted legacy layout/sidebar/toast files.

Stale references still present:

- `src/config/routes.config.js` still marks `/dashboard` and `/assistant` route records as `status: 'active'`, while `src/App.jsx` redirects those paths to `/emergency`.
- `src/navigation/primaryNavigation.test.js` still validates older `/workspace/emergency/*` ownership even though the active route tree redirects most of those paths.
- `src/data/workspaceArchitecture.js`, `src/pages/WorkspaceHome.jsx`, and `src/data/emergencyOperatingSystem.js` still describe older `/workspace/emergency/*` routes and demo workspaces.
- `src/services/emergencyWhiteboardService.js` still returns workspace route metadata under `/workspace/emergency/*`.
- `package.json` still describes the app as `CareDroid-Clinical-AI - Medical AI clinical co-pilot with emergency escalation and RBAC`, not the finalized pilot product statement.

## Orphaned Frontend Candidates

Orphan detection source:

- `src/data/orphanDetectionAudit.js`

Future-module pages should be quarantined under `src/features/future-modules` after route tests are updated:

- Fleet and IoT: `src/pages/fleet/*`, `src/pages/DeviceFleetManagement.jsx`, `src/pages/MedicalIotDashboard.jsx`, `src/pages/LiveTrackingMap.jsx`, `src/pages/HospitalMapDashboard.jsx`, `src/pages/DigitalTwinIntelligence.jsx`.
- Research and education: `src/pages/ResearchEvidenceHub.jsx`, `src/pages/ClinicalKnowledgeGraph.jsx`, `src/pages/ClinicalDocumentationAssistant.jsx`, `src/pages/Competencies.jsx`, `src/pages/Credentials.jsx`, `src/pages/MedicalSimulationSuite.jsx`, `src/pages/SimulationOutcomes.jsx`, `src/pages/LaboratoryDashboard.jsx`, `src/pages/SimulationLaboratoryViewer.jsx`.
- Governance and platform: `src/pages/GovernanceRegistry.jsx`, `src/pages/platform/PlatformGovernanceWorkspace.jsx`, `src/pages/PlatformSelfDiagnostics.jsx`, `src/pages/DependencyMap.jsx`, `src/pages/DependencyGraph.jsx`, `src/pages/DataLineageExplorer.jsx`, `src/pages/AiModelsPage.jsx`, `src/pages/PlatformLearningEngine.jsx`.
- Commercial and enterprise: `src/pages/commercial/CommercialPages.jsx`, `src/pages/organization/OrganizationPages.jsx`, `src/pages/PlatformAdminPage.jsx`, `src/pages/BillingPage.jsx`, `src/pages/UsagePage.jsx`, `src/pages/EnterpriseReadinessPage.jsx`, `src/pages/MarketplacePage.jsx`, `src/pages/KnowledgeBasePage.jsx`, `src/pages/customer-portal/CustomerPortalPage.jsx`, `src/pages/success-center/SuccessCenterPage.jsx`.

These are not necessarily dead code. They are future modules that should be hidden from primary UX and physically grouped once imports are rewritten.

## Orphaned Backend Module Candidates

Backend modules that are future-module candidates for the Emergency OS pilot:

- Fleet: `backend/src/modules/fleet`
- Telemetry/IoT: `backend/src/modules/telemetry`
- Hospital map/live tracking: `backend/src/modules/hospital-map`, `backend/src/modules/live-tracking`
- Simulation: `backend/src/modules/simulation`
- Governance/compliance platform: `backend/src/modules/platform-governance`, `backend/src/modules/governance`, `backend/src/modules/llm-security`, `backend/src/modules/interoperability`, `backend/src/modules/regulatory`, `backend/src/modules/equity`, `backend/src/modules/human-review`, `backend/src/modules/privacy-center`, `backend/src/modules/ehr-audit`
- Platform assets/product catalog/commercial packaging: `backend/src/modules/platform-assets`, `backend/src/modules/product-catalog`
- Training/evaluation/cost optimizer/memory/artifacts/tool calling: `backend/src/modules/training`, `backend/src/modules/evaluation`, `backend/src/modules/cost-optimizer`, `backend/src/modules/memory`, `backend/src/modules/artifacts`, `backend/src/modules/tool-calling`

These modules are imported by `backend/src/app.module.ts`, so they are not orphaned at runtime. They are orphaned relative to the requested first-pilot Emergency OS scope.

## Prompt Readiness Assessment

Already partially implemented:

- Prompt 3: One active `AppShell` exists and route tests guard it.
- Prompt 4: The active rail is Emergency OS-focused, though requested areas like Smart Intake, Queues, Reassessment, Boarding, Analytics, and Patients are mostly represented as panels/redirects rather than first-class routes.
- Prompt 5: `types/emergency.ts` contains many shared types, but not the complete requested API contract.
- Prompt 6: Journey states and local transitions exist, but no authorized override matrix or persisted encounter history exists.
- Prompt 9: Whiteboard is the default landing page and renders compact cards, alerts, queue intelligence, intake, and patient detail, but it does not consume a real whiteboard backend API.
- Prompt 10: Queue intelligence exists in UI/store/services, but backend queue metrics are missing.
- Prompt 11: EMS intake/pre-arrival and offload intelligence exist partially in UI/store/services, but backend persistence is missing.
- Prompt 12: Reassessment logic exists through flags, reminders, long waits, vitals, and drawer UI, but no persisted `ReassessmentTask` model exists.
- Prompt 13: Capacity and boarding signals exist locally, but no persisted capacity/boarding models or backend APIs exist.
- Prompt 14: ED Copilot context is injected from live store data, but no backend `CopilotContext` service exists.
- Prompt 20: Primary header/navigation branding has been refocused, but package metadata and future-module copy still contain generic platform language.

Not yet safe to implement as direct moves:

- Prompt 2 requires a broad import rewrite into `src/features/emergency` and `src/features/future-modules`. This should follow a dedicated path-move PR with tests because active Emergency OS code spans `src/components`, `src/pages/emergency`, `src/services`, `src/utils`, `engine`, `store`, `types`, `config`, and `lib/features`.
- Prompt 7 requires a backend and frontend event layer before services can subscribe safely.
- Prompt 8 requires new backend entities/services/controllers before the frontend can consume real grouped whiteboard data.
- Prompt 15 requires new Smart Intake document/extraction/verification domain models.
- Prompt 16 requires canonical fixture generation scripts and seed loading strategy.
- Prompt 17 requires backend API coverage first, otherwise removing static mocks would break the primary Emergency OS pages.
- Prompt 18 requires a working backend, seed strategy, and new endpoints.
- Prompt 19 should follow API alignment to avoid polishing demo-only states.

## Recommended Refactor Order

1. Create `src/features/emergency` as an export-barrel layer first; move only Emergency OS files once imports pass.
2. Create `src/features/future-modules` and move future UI pages in batches by route family.
3. Add backend `EmergencyModule` with entities for patient, encounter, journey event, EMS arrival/offload, reassessment task, capacity snapshot, boarding record, referral request, operational alert, and Copilot context.
4. Add `/api/emergency/whiteboard`, `/api/emergency/queues`, `/api/emergency/capacity`, `/api/emergency/boarding`, `/api/emergency/reassessments`, `/api/emergency/ems`, `/api/emergency/referrals`, `/api/emergency/copilot/context`, and `/api/emergency/smart-intake` endpoints.
5. Add an event bus and publish events from journey transitions before wiring downstream services.
6. Update `types/emergency.ts` or create a shared `types/emergency-os.ts` that matches backend DTOs.
7. Replace demo services with real API clients one page at a time.
8. Add fixture/seed generation for 24-hour, 7-day, and 30-day Emergency OS datasets.
9. Run full route, lint, typecheck, backend build, backend tests, and seeded API validation.
10. Final UX polish and metadata language cleanup.

## Validation Performed During Audit

- Read `src/App.jsx`, `src/config/routes.config.js`, `src/config/navigation.config.js`, `src/layout/AppShell.jsx`, `store/emergencyStore.ts`, `types/emergency.ts`, `engine/alertEngine.ts`, Emergency OS components, Emergency OS services, and backend module/controller/entity inventories.
- Ran `git status --short` to record dirty-tree context.
- Confirmed `docs/architecture` did not exist, then created it for this audit.
- Did not run full validation for prompts 2-20 because the requested backend/domain work is not yet implemented.

