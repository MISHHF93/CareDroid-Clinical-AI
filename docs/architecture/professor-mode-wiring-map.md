# Professor Mode Wiring Map

Date: 2026-06-14

## Active Product Spine

`src/main.jsx` -> `src/App.jsx` -> `BrowserRouter` -> `RootLayout` -> `src/components/AppShell.tsx` -> active `/emergency/*` route -> hook/store/API facade -> `backend/src/modules/emergency-os/emergency-os.controller.ts`

## Frontend Active Capability Trace

| Capability | Route/Page | Hook/Store/API | Backend Endpoint | Visible UI |
| --- | --- | --- | --- | --- |
| Whiteboard | `src/pages/emergency/index.tsx` at `/emergency/whiteboard` | `useEmergencyWhiteboard`, `useEmergencyStore`, `fetchEmergencyWhiteboard` | `GET /api/emergency/whiteboard` | Command center board, mission controls, patient cards, status strip |
| Patients | inline `PatientsRoute` in `src/App.jsx` at `/emergency/patients` | `useEmergencyPatients`, `usePatientJourney`, `fetchEmergencyPatients`, `fetchPatientJourney` | `GET /api/emergency/patients`, `GET /api/emergency/journey` | Patient census, search, journey state counts |
| Patient Timeline | `PatientDetailPanel` and Patients route | `fetchPatientWorkflowLogs`, store timeline data | `GET /api/emergency/patients/:patientId/workflow-logs` | Patient detail timeline and workflow logs |
| EMS | `EMSPipeline` at `/emergency/ems` | `useEMSIntake`, `fetchEMSIntake` | `GET /api/emergency/ems` | EMS ETA/offload/handoff cards |
| Smart Intake | `SmartIntake` at `/emergency/intake` | `useSmartIntake`, intake API actions | `GET/POST /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice` | Identity review and patient creation workflow |
| Queues | inline `QueueRoute` at `/emergency/queues` | `useEmergencyQueues`, store fallback | `GET /api/emergency/queues` | Queue counts, oldest waits, breached queues |
| Reassessment | inline `ReassessmentRoute` and `ReassessmentDrawer` | `useReassessmentQueue`, store flags | `GET /api/emergency/reassessment` | Due/overdue reassessment queue |
| Capacity | inline `CapacityRoute` and central status | `useCapacityStatus`, `useUpgradeHarnessCapacity`, store capacity | `GET /api/emergency/capacity`, review harness endpoints | Capacity score, rooms, boarders, review cards |
| Boarding | inline `BoardingRoute` | `useBoardingStatus`, store fallback | `GET /api/emergency/boarding` | Boarding patients and escalation |
| Referrals | `ReferralPanel` at `/emergency/referrals` | `useReferrals`, `fetchReferrals` | `GET /api/emergency/referrals` | Referral/transfer queue |
| Copilot | inline `CopilotRoute` and docked `CopilotPanel` | `useEDCopilot`, upgrade harness review hooks, store alerts/capacity | `GET /api/emergency/copilot`, review harness endpoints | Copilot context, quick actions, human-review signals |
| Tools | `ToolsOverview` at `/emergency/tools` | tool catalog/search services | existing clinical tool/catalog services | Medical tools launcher inside Emergency OS shell |
| Analytics | `EmergencyAnalytics` at `/emergency/analytics` | analytics client/store fallback | `GET /api/emergency/analytics` | Operational KPIs and charts |
| Settings | `EmergencySettings` at `/emergency/settings` | settings, governance, integration, provincial clients | `GET/PATCH /api/emergency/settings`, governance, integrations, provincial endpoints | Thresholds, runtime connector status, audit/governance cards |
| Central Node | `Header`, store startup, central-node hook | `useCareDroidCentralNode`, `fetchCareDroidCentralNodeSnapshot` | `GET /api/emergency/central-node/snapshot` | Header operational status and central metrics |

## Command/Search Trace

| Surface | Registry/Source | Runtime Consumer | Policy |
| --- | --- | --- | --- |
| Navigation commands | `src/config/commandPalette.config.js` | `src/components/CommandPalette.tsx` | Pilot Customer Mode and Emergency OS role permissions |
| Sidebar navigation | `src/config/unified-navigation.config.ts` | `src/components/Sidebar.tsx`, `AppShell.tsx` | Pilot Customer Mode and role route permissions |
| Patient command search | `useEmergencyStore().patients` | `CommandPalette.tsx` | Selects active patient in existing detail panel |
| Patient page search | URL query in `PatientsRoute` | `PatientGrid` | Filters active patient census |
| Medical tools search | `ToolsOverview` | `/emergency/tools` | Route redirects keep tools inside active Emergency OS shell |

## Backend Active Endpoint Trace

`EmergencyOsController` remains the active backend endpoint owner for Emergency OS. Active frontend consumers map to mounted controller methods for central node, whiteboard, patients, journey, workflow logs, EMS, intake, queues, reassessment, capacity, boarding, referrals, provincial health, integrations, copilot, analytics, and settings.

Review-scoped advanced endpoints remain mounted backend facades but are not promoted as primary product routes by this pass.

## Change Trace For This Pass

`CommandPalette` now follows this command execution path:

`EMERGENCY_OS_ROUTE_COMMANDS` or local command definition -> command visibility metadata -> `useEmergencyRolePermissions` -> `isCommandVisibleForEmergencyRole` -> visible result list -> guarded action execution -> existing AppShell route/panel/store behavior.

No new route, shell, command registry, search registry, API client, backend service, or store was introduced.
