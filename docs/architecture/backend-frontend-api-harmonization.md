# Backend-Frontend API Harmonization

Generated: 2026-06-14

## Scope

This pass validates the active CareDroid Emergency OS wiring against the existing Nest `/api/emergency/*` API surface. It keeps the current `src/` SPA and existing API facade in place, documents legacy and optional surfaces, and avoids promoting optional Mongoose runtime routes to always-mounted Nest routes.

## Active Endpoint Matrix

| Workflow | Route/Page | Component | Hook/Store | Frontend API client | Backend endpoint | Controller/Service | Response envelope | UI state/render |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Whiteboard | `/emergency` / Emergency OS overview | `src/pages/emergency/index.tsx`, active shell routes | `useEmergencyWhiteboard`, `useEmergencyStore.hydrateFromApi` | `fetchEmergencyWhiteboard` | `GET /api/emergency/whiteboard` | `EmergencyOsController.getWhiteboard` -> `EmergencyWhiteboardService.getWhiteboard` | `{ module, generatedAt, source, status, data: { patients, rooms, staff, alerts, capacity } }` | Hydrates patients, rooms, staff, alerts, capacity; renders board and command metrics. |
| Patient journey / patients | `/emergency/patients` | `src/App.jsx` patient route | `useEmergencyPatients`, `usePatientJourney` | `fetchEmergencyPatients`, `fetchPatientJourney`, `createEmergencyPatient` | `GET/POST /api/emergency/patients`, `GET /api/emergency/journey` | `EmergencyPatientService`, `SmartIntakeService`, `PatientJourneyService` | Patient and journey module envelopes | Hydrates canonical patients/staff/alerts; journey data renders state counts and timeline/status sections. |
| EMS | `/emergency/ems` | `src/components/EMSPipeline.jsx` | `useEMSIntake`, local fleet/diversion state | `fetchEMSIntake`, `fetchEmsFleetSnapshot`, `fetchEmergencyDiversionStatus` | `GET /api/emergency/ems`, optional/gated `GET /api/fleet/snapshot`, gated `GET /api/emergency/diversion/status` | `EMSIntakeService`; `FleetController` for demo fleet | EMS module envelope with `data.arrivals`; fleet returns guarded demo snapshot | Hydrates EMS arrivals; diversion remains unavailable when capability is disabled. |
| Smart intake | Quick intake / new intake surfaces | `src/App.jsx`, intake components using `SmartIntakeApi` | `useSmartIntake`, action handlers | `fetchSmartIntake`, `createSmartIntakePatient`, `runSmartIntakeVerticalSlice`, `SmartIntakeApi` | `GET/POST /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice`; optional `/api/emergency/intake/:sessionId/*` | `SmartIntakeService`; optional Express runtime routes when mounted | Canonical Smart Intake envelopes; optional identity-session routes are capability-gated | Hydrates new patient where canonical envelope includes `data.patient`; optional identity flow skips network while disabled. |
| Queues | `/emergency/queues` | `src/App.jsx` queue route | `useEmergencyQueues` | `fetchEmergencyQueues` | `GET /api/emergency/queues` | `QueueIntelligenceService.getQueues` | Queue module envelope with `data.queues` | Hydrates queue summaries through store startup hydration and route hook render. |
| Reassessment | `/emergency/reassessment` | `src/App.jsx` reassessment route | `useReassessmentQueue` | `fetchReassessmentQueue` | `GET /api/emergency/reassessment` | `ReassessmentService.getReassessmentQueue` | Reassessment module envelope with `data.patients`, `overdueCount`, `nextAction` | Hydrates reassessment patients into canonical patients when present; renders loading/error/empty from hook state. |
| Capacity | `/emergency/capacity` | `src/App.jsx` capacity route | `useCapacityStatus`, store analytics loader | `fetchCapacityStatus`, `fetchEmergencyAnalytics` | `GET /api/emergency/capacity`, `GET /api/emergency/analytics` | `CapacityService`, `EmergencyAnalyticsService` | Capacity and analytics module envelopes | Hydrates capacity/rooms; detailed history/dashboard/export routes remain gated until mounted. |
| Boarding | `/emergency/boarding` | `src/App.jsx` boarding route | `useBoardingStatus` | `fetchBoardingStatus` | `GET /api/emergency/boarding` | `BoardingService.getBoarding` | Boarding module envelope with `data.patients`, `longestBoardingMinutes`, `escalation` | Hydrates boarding patients through canonical patient list and renders escalation state. |
| Referrals | `/emergency/referrals` | `src/components/ReferralPanel.jsx` | `useReferrals`, store referral actions | `fetchReferrals`, `persistEmergencyReferral`, gated transfer/history helpers | `GET/POST /api/emergency/referrals`; gated history/transfer routes | `ReferralService` | Referral module envelopes with `data.referrals`; create returns created referral plus refreshed list | Hydrates referrals; transfer workflow remains local plus pending sync while disabled. |
| Analytics | `/emergency/analytics` | `src/pages/emergency/EmergencyAnalytics.jsx` and store loader | `useEmergencyAnalytics`, `useEmergencyStore.loadEmergencyAnalytics` | `fetchEmergencyAnalytics`, guarded analytics helpers | `GET /api/emergency/analytics`; gated detail/export helpers | `EmergencyAnalyticsService` | Analytics module envelope with census, wait, capacity fields | Store maps backend analytics into analytics state and falls back locally on error. |
| Copilot / AI messages | `/emergency/copilot` and chat surfaces | `src/components/CopilotPanel.tsx`, `src/App.jsx` copilot route | `useEDCopilot`, `useCareDroidCentralNode` | `fetchEDCopilot`, AI message clients | `GET /api/emergency/copilot`, `POST /api/emergency/*/ai/message` | `EDCopilotService`, `EmergencyAIController` | Copilot context envelope plus AI message responses | Renders prompt context, quick actions, central-node summary, and message responses. |
| Settings | `/emergency/settings` | `src/pages/emergency/EmergencySettings.jsx`, settings pages | `useEmergencySettings`, settings store actions | `fetchEmergencySettings`, `updateEmergencySettings`, `emergencySettingsApi.js` facade | `GET/PATCH /api/emergency/settings` | `EmergencySettingsService` | Settings module envelope with nested settings contract | Hydrates `emergencySettings` and thresholds; saves through canonical facade. |
| Central node | Header, command display, copilot awareness | `src/components/Header.tsx`, `src/components/CopilotPanel.tsx`, `src/pages/emergency/EmergencyAnalytics.jsx` | `useCareDroidCentralNode`, `dispatchWebSocketEvent` | `fetchCareDroidCentralNodeSnapshot` | `GET /api/emergency/central-node/snapshot` | `CareDroidCentralNodeService.getSnapshot` | Central-node module envelope with command metrics, queue metrics, settings, recent events | Builds screen-specific central-node snapshot and updates websocket/polling status. |
| Workflow logs / alerts / notifications | Settings audit view, store startup hydration, notification services | `EmergencySettings.jsx`, store, notification services | `useEmergencyWorkflowLogs`, `useNotificationActions` | `fetchEmergencyWorkflowLogs`, `fetchPatientWorkflowLogs`, notification REST service | `GET /api/emergency/workflow-logs`, `GET /api/emergency/patients/:patientId/workflow-logs`, `/api/notifications/*` | `WorkflowActionLogService`, `NotificationController` | Workflow log module envelope; notification REST contracts | Hydrates workflow logs; notifications remain separate platform REST surface. |
| Integrations / provincial data | Settings runtime cards and integration views | `EmergencySettings.jsx` and integration surfaces | `useIntegrationHub`, `useProvincialHealth` | `fetchIntegrationHub`, `fetchProvincialHealth`, guarded platform integration clients | `GET /api/emergency/integrations`, `GET /api/emergency/provincial-health`; platform `/api/integrations/*` | `IntegrationHubService`, `ProvincialHealthService`, platform controllers | Explicit placeholder/demo envelopes with `remainingGaps` | Renders connector/demo status and review messaging without claiming live feeds. |

## Gaps Fixed

- Added missing `src/data/frontendApiCallsInventory.js` rows for optional Smart Intake routes already called by `src/services/smartIntakeApi.js`: EMS evidence, unknown reconciliation, biometric consent, biometric consent withdrawal, and audit log.
- Updated `src/data/backendFrontendExposure.test.js` so every optional Smart Intake client route must stay inventoried and capability-gated while the optional runtime is disabled.
- Added `src/services/emergencyOsApi.test.js` coverage for the active canonical Emergency OS GET facade endpoints.
- Corrected `src/pages/settings/FeatureManagement.jsx` checklist claims for disabled/unmounted routes: diversion status, transfer status, ICD-10 lookup, and shift report export are now shown as pending backend endpoints instead of available ones.

## Backend Endpoints Without Active Frontend Consumers

- Research/advanced compatibility routes remain intentionally documented rather than removed: organizational digital twin, EMS AI call interrogation, federated EMS/LMECS, and handover research endpoints.
- `/api/v1/governance/*` remains a compatibility alias family; active Emergency OS governance clients prefer `/api/emergency/governance/*`.
- Many platform/admin/backend routes are tracked through `src/data/backendRouteExposurePolicy.js` as `backend-only`, `deferred`, or `expose-recommended`.

## Frontend Calls Without Always-Mounted Backend Routes

- Optional Smart Intake identity-session calls under `/api/emergency/intake/:sessionId/*` are capability-gated by `emergencySmartIntakeIdentitySession` and documented as optional Mongoose Emergency OS runtime routes.
- Diversion, transfer workflow, referral history, capacity history/dashboard, queue analytics, and shift report export remain guarded behind disabled capabilities until a mounted backend route exists.
- Notification streams, clinical-alert streams, exports, report scheduling, team management, and chat persistence remain gated stubs outside the active Emergency OS harmonization scope.

## Envelope And Hydration Notes

- Active Nest Emergency OS module responses use the shared `{ module, generatedAt, source, status, data, remainingGaps? }` envelope.
- `src/hooks/useEmergencyOs.js` hydrates patients, rooms, staff, alerts, capacity, EMS arrivals, referrals, workflow logs, and settings when those fields appear in `data`.
- Store startup hydration also loads whiteboard, capacity, boarding, EMS, queues, reassessment, referrals, and workflow logs in parallel, then falls back to local state if backend modules fail.
- Detailed analytics helper routes are intentionally separate from the canonical `GET /api/emergency/analytics` module and currently remain disabled.

## Manual Review Risks Left

- Optional Mongoose Emergency OS routes must not be treated as always-mounted until `ENABLE_MONGOOSE_EMERGENCY_OS` and MongoDB runtime configuration are part of the target environment.
- Several active services are fixture/demo backed. The UI should keep source labels and `remainingGaps` visible before production claims.
- The backend route inventory is manual; any controller changes still require updating `src/data/backendHttpRouteInventory.js` and focused exposure tests.
- Central-node refresh stores the backend envelope for screen synthesis and websocket status, but deeper canonical store hydration still relies on module hooks/startup hydration.

## Validation Results

Validation commands for this pass:

- Passed: `npm run typecheck:frontend`
- Passed: `npm run lint`
- Passed: `npm test -- src/data/backendFrontendExposure.test.js src/services/emergencyOsApi.test.js` (2 files, 29 tests)
- Not run: backend controller spec/build, because no backend files were changed.

