# Frontend To Backend Trace

## Active Page Traces

| Active page | Component(s) | Hook/store | API client | Backend endpoint | Backend service | Returned data | Rendered UI/status |
|---|---|---|---|---|---|---|---|
| `/emergency/whiteboard` | `EmergencyWhiteboard`, `PatientCard`, `QuickIntake`, `WhoNextPanel`, `CapacityCrisisMode` | `useEmergencyWhiteboard`, `useEmergencyStore` | `fetchEmergencyWhiteboard`, `createSmartIntakePatient` | `GET /api/emergency/whiteboard`, `POST /api/emergency/intake` | `EmergencyWhiteboardService`, `SmartIntakeService` | patients, rooms, staff, alerts, capacity, created patient | ACTIVE_AND_WIRED with loading/error/empty board states |
| `/emergency/patients` | inline `PatientsRoute`, `PatientCard` | `useEmergencyPatients`, `useEmergencyStore` | `fetchEmergencyPatients` | `GET /api/emergency/patients` | `EmergencyPatientService` | patients, staff, alerts | ACTIVE_AND_WIRED with search, metrics, empty/error fallback |
| `/emergency/ems` | `EMSPipeline`, `EMSPressureScore` | `useEMSIntake`, `useEmergencyStore` | `fetchEMSIntake`, optional external `emergencyTransportApi` | `GET /api/emergency/ems` | `EMSIntakeService` | arrivals, available resus rooms | ACTIVE_AND_WIRED; backend arrivals normalize into visible EMS rows |
| `/emergency/intake` | `SmartIntake` | `useEmergencyStore` | `fetchSmartIntake`, `runSmartIntakeVerticalSlice` | `GET /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice` | `SmartIntakeService` | identity review, recent patients, created patient, encounter, validations | ACTIVE_AND_WIRED for create/unknown; manual link remains local staff action |
| `/emergency/queues` | inline `QueueRoute` | `useEmergencyQueues`, `useEmergencyStore` | `fetchEmergencyQueues` | `GET /api/emergency/queues` | `QueueIntelligenceService` | queue rows with patients, target, breach, oldest wait | ACTIVE_AND_WIRED with metrics, queue cards, empty/error fallback |
| `/emergency/reassessment` | inline `ReassessmentRoute`, AppShell `ReassessmentDrawer` | `useReassessmentQueue`, `useEmergencyStore` | `fetchReassessmentQueue` | `GET /api/emergency/reassessment` | `ReassessmentService` | due patients, overdue count, next action | ACTIVE_AND_WIRED with patient cards and empty/error fallback |
| `/emergency/capacity` | inline `CapacityRoute` | `useCapacityStatus`, `useEmergencyStore` | `fetchCapacityStatus` | `GET /api/emergency/capacity` | `CapacityService` | capacity, rooms, recommendations | ACTIVE_AND_WIRED with score, room status, recommendations |
| `/emergency/boarding` | inline `BoardingRoute` | `useBoardingStatus`, `useEmergencyStore` | `fetchBoardingStatus` | `GET /api/emergency/boarding` | `BoardingService` | boarding patients, longest duration, escalation | ACTIVE_AND_WIRED with patient cards and empty/error fallback |
| `/emergency/referrals` | `ReferralPanel` | `useReferrals`, `useEmergencyStore` | `fetchReferrals`, optional external referral persistence | `GET /api/emergency/referrals` | `ReferralService` | referrals by patient/specialty/status/elapsed minutes | ACTIVE_AND_WIRED for backend queue; local-first for create/status mutations |
| `/emergency/copilot` | inline `CopilotRoute`, AppShell `CopilotPanel` | `useEDCopilot`, `useEmergencyStore` | `fetchEDCopilot` | `GET /api/emergency/copilot` | `EDCopilotService` | prompt context, quick actions, safety rule | ACTIVE_AND_WIRED with disclaimers and operational summaries |
| `/emergency/analytics` | `EmergencyAnalytics`, `QueueIntelligencePanel` consumers | `loadEmergencyAnalytics`, `useEmergencyStore` | `fetchEmergencyAnalytics` | `GET /api/emergency/analytics` | `EmergencyAnalyticsService` | active census, waiting, high risk, boarding, reassessment, wait, capacity | ACTIVE_AND_WIRED with backend-first KPIs and local chart fallback |
| `/emergency/settings` | `EmergencySettings` | `useEmergencyStore` | `fetchEmergencyOsSettings`, `saveEmergencyOsSettings`, `fetchEmergencyWorkflowLogs` via canonical facade | `GET/PATCH /api/emergency/settings`, `GET /api/emergency/workflow-logs` | `EmergencySettingsService`, `WorkflowActionLogService` | settings contract, workflow logs | ACTIVE_AND_WIRED with loading, save status, audit log states |

## Shared AppShell Surfaces

- `PatientDetailPanel`: mounted in `AppShell`; consumes selected patient/store timeline. ACTIVE_AND_WIRED through patient payloads.
- `CopilotPanel`: mounted in `AppShell`; consumes store and role permissions. ACTIVE_AND_WIRED as docked workflow.
- `CommandPalette`: mounted in `AppShell`; navigates existing canonical routes. ACTIVE_AND_WIRED.
- `EMSCriticalBroadcast`: mounted in `AppShell`; consumes EMS store rows. ACTIVE_AND_WIRED after backend EMS hydration.
- `ReassessmentDrawer`: mounted in `AppShell`; consumes reassessment flags/store rows. ACTIVE_AND_WIRED.

## Duplicate Or Legacy Route Handling

`src/config/routes.config.js` and `src/App.jsx` redirect legacy paths and non-ED workspace routes back to the active Emergency OS spine. No duplicate router or AppShell was introduced.

## Files Changed

- Active API/store/hook/page files listed in `discovery-execution-report.md`.

## Remaining Risks

- Some frontend-only operational helpers remain because canonical mutation endpoints do not exist yet.
- Existing future-module review files under `src/features/future-modules/_review` are retained because tests and documentation still reference them.
