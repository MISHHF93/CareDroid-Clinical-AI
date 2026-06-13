# Emergency OS Data Return Chain Report

## Scope

This report traces backend functions and service methods used by CareDroid Emergency OS routes and frontend clients. It focuses on return-value safety:

- `undefined` responses
- unexpected `null` responses
- mutators that did not return updated data
- swallowed or hidden errors
- mismatched DTOs
- backend data that is not currently rendered by the frontend

## Always-Mounted Emergency OS Chain

The primary Emergency OS API uses Nest controllers and fixture-backed services:

| Route | Controller method | Service method | Return status |
| --- | --- | --- | --- |
| `GET /api/emergency/whiteboard` | `getWhiteboard()` | `EmergencyWhiteboardService.getWhiteboard()` | Returns envelope with patients, rooms, staff, alerts, capacity |
| `GET /api/emergency/patients` | `getPatients()` | `EmergencyPatientService.getPatientEnvelope()` | Returns envelope with patients, staff, alerts |
| `POST /api/emergency/patients` | `createPatient()` | `SmartIntakeService.createFromIntake()` | Returns envelope with created patient |
| `GET /api/emergency/journey` | `getJourney()` | `PatientJourneyService.getJourney()` | Returns envelope with journey events and state counts |
| `GET /api/emergency/ems` | `getEMS()` | `EMSIntakeService.getEMSIntake()` | Returns envelope with EMS arrivals |
| `GET /api/emergency/intake` | `getIntake()` | `SmartIntakeService.getSmartIntake()` | Returns envelope with intake review state |
| `POST /api/emergency/intake` | `createIntakePatient()` | `SmartIntakeService.createFromIntake()` | Returns envelope with created patient |
| `POST /api/emergency/intake/vertical-slice` | `createSmartIntakeVerticalSlice()` | `SmartIntakeService.createVerticalSlice()` | Returns created patient, encounter, transitions, whiteboard, queues, reassessment, capacity |
| `GET /api/emergency/queues` | `getQueues()` | `QueueIntelligenceService.getQueues()` | Returns envelope with queue rows and patients |
| `GET /api/emergency/reassessment` | `getReassessment()` | `ReassessmentService.getReassessmentQueue()` | Returns envelope with reassessment patients |
| `GET /api/emergency/capacity` | `getCapacity()` | `CapacityService.getCapacity()` | Returns envelope with capacity, rooms, recommendations |

No always-mounted Emergency OS controller method was found returning `undefined`.

## Safe Fixes Applied

### Boarding Decision

Before:

- `BoardingService.trackDecisionToAdmit()` mutated the patient and emitted an event but returned `void`.
- `POST /api/emergency/boarding/track-decision` returned only `{ success: true }`.

Now:

- `trackDecisionToAdmit()` returns `{ patient, boardingStartTime, clinicianId }`.
- The route returns `{ success: true, message, patient, boardingStartTime, clinicianId }`.

This gives frontend/API callers the updated boarding state without requiring a follow-up fetch.

### Reassessment Dismissal

Before:

- `ReassessmentService.dismissReassessment()` mutated the patient but returned `void`.
- `POST /api/emergency/reassessment/:patientId/dismiss` returned only a message.

Now:

- `dismissReassessment()` returns the updated patient.
- The route returns `{ message, patient }`.

This keeps dismissal behavior aligned with `reassessPatient()`, which already returns the updated patient.

### Error Reporting

Before:

- `GET /api/emergency/reassessment/due` caught `_error` and returned a generic error.
- `GET /api/emergency/capacity/dashboard` caught `_error` and returned a generic error.

Now:

- Both routes log the caught error server-side and return `error.message` when available.
- They still preserve a safe fallback message.

## Intentional Null/Empty Returns

These were not changed because their route contracts already translate them safely:

| Function | Return | Why it is safe |
| --- | --- | --- |
| `EMSService.updateEMSStatus()` | `null` when EMS unit is not found | Route converts to `404 EMS unit not found` |
| `EMSService.confirmArrival()` | `null` when EMS unit is not found | Route converts to `404 EMS unit not found` |
| `SurgeCapacityService.deactivateSurgeMode()` | `null` when surge event is not found | Route converts to `404 surge event not found` |
| `CopilotService.extractRequestedDps()` | `null` when no DPS target exists | Caller returns explicit safety response |
| Frontend guarded API wrappers | `{ ok: false, data: null, message }` | Intentional disabled-capability fallback |

## Backend Data Not Fully Rendered

The backend returns more data than the current frontend renders in a few areas. These are not return-value bugs, but they are product/UI follow-up candidates:

- Optional Mongoose runtime endpoints under `/api/emergency/boarding/*`, `/capacity/dashboard`, `/ems/*`, `/reassessment/*`, and `/surge/*` are inventoried but only selectively surfaced in active Emergency OS UI.
- `QueueIntelligenceService.getQueues()` returns patient arrays for each queue. The active whiteboard uses the Zustand-derived queue panel rather than rendering every backend queue patient list.
- `ProvincialHealthService.getProvincialHealth()` returns placeholder external medication/allergy/encounter messages. These are intentionally labeled until live HIE/provincial feeds exist.
- `IntegrationHubService.getIntegrationHub()` returns placeholder connector statuses and review queue items. Active UI surfaces integration status at a high level, not every item.
- Research/digital twin/federated-learning endpoints return deterministic decision-support DTOs, but their frontend workflows remain deferred unless explicitly productized.

## Remaining Return Risks

No safe additional backend return-value fix was identified in the active Emergency OS chain.

Remaining intentional boundaries:

- Some private helper methods return `void` after writing audit rows, emitting events, or logging. These are not route responses.
- Some optional runtime services depend on Mongo/Mongoose availability. Their routes return API errors when unavailable.
- Frontend hooks convert failed Emergency OS module loads to local error state instead of throwing through React render. This is intentional UI behavior.

## Validation Checklist

Use these commands after return-chain changes:

```bash
npm run test:run -- src/services/emergencyOsApi.test.js src/services/smartIntakeApi.test.js src/config/backendApiCapabilities.test.js src/data/backendFrontendExposure.test.js
cd backend && npm test -- emergency-os.controller.spec.ts
cd backend && npm run build
cd backend && npm run lint
npm run typecheck:frontend
npm run lint
```
