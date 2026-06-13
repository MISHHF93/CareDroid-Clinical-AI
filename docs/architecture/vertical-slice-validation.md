# CareDroid Emergency OS Vertical Slice Validation

## Scope

This slice is intentionally narrow:

Smart Intake -> Create Patient -> Create Encounter -> Move to ARRIVAL -> Move to TRIAGE -> Show on Emergency Whiteboard -> Show in Queue Metrics -> Trigger Reassessment if needed -> Show Capacity Update.

No unrelated Emergency OS features are part of this validation.

## Backend Contract

Primary endpoint:

`POST /api/emergency/intake/vertical-slice`

The endpoint is mounted by `EmergencyOsController` and implemented by `SmartIntakeService.createVerticalSlice()`.

Request shape:

```json
{
  "staffId": "staff-smart-intake-rn",
  "patient": {
    "mrn": "ED-SLICE-001",
    "firstName": "Avery",
    "lastName": "Stone",
    "chiefComplaint": "Chest pressure with diaphoresis",
    "complaintCategory": "Cardiac",
    "priority": "P2",
    "vitals": [{ "hr": 128, "sbp": 144, "spo2": 97, "temp": 36.8 }]
  }
}
```

Response proof points:

- `data.patient.state` is `Triage`.
- `data.encounter.source` is `smart-intake`.
- `data.transitions` includes an `Arrival` transition and a `Triage` transition.
- `data.whiteboard.patients` contains the created patient.
- `data.queueMetrics.queues` contains the patient in the Triage queue.
- `data.reassessment.patients` contains the patient when acuity or vitals require reassessment.
- `data.capacity.capacity.updatedAt` confirms capacity was recomputed after the patient entered the system.

## Frontend Path

Primary UI entry:

`src/components/NewPatientIntake.jsx`

Shared slice builder:

`src/data/smartIntakeVerticalSlice.js`

Frontend API client:

`runSmartIntakeVerticalSlice()` in `src/services/emergencyOsApi.js`

The whiteboard intake first submits the built patient to `POST /api/emergency/intake/vertical-slice`. If the backend is unavailable in local demo mode, the same deterministic patient object is still added to the Zustand Emergency OS store so the UI remains usable.

## Store/UI Proof

The created patient is added through `useEmergencyStore.addPatient()`.

Derived store state then updates:

- `selectFilteredPatients()` shows the patient on the Emergency Whiteboard.
- `selectQueueCounts()` and `selectQueuePanelRows()` show the patient in queue metrics.
- `selectReassessmentQueue()` includes the patient when `ReassessmentDue`, `HighRisk`, or another reassessment-managed flag is present.
- `capacity.reassessmentDueCount`, `capacity.triageCount`, and `capacity.generatedAt` update from the same patient list.

## Reassessment Rule

Smart Intake triggers reassessment when any of these are true:

- Priority is `P1` or `P2`.
- Heart rate is below 50 or above 120.
- Systolic blood pressure is below 90.
- SpO2 is below 94.
- Temperature is above 38.5 C.
- Pain score is 8 or higher.

## Validation Commands

Recommended focused checks:

```bash
npm run test:run -- src/components/NewPatientIntake.test.jsx src/services/emergencyOsApi.test.js src/services/smartIntakeApi.test.js src/config/backendApiCapabilities.test.js src/data/backendFrontendExposure.test.js
cd backend && npm test -- emergency-os.controller.spec.ts
npm run typecheck:frontend
npm run lint
npm run backend:build
```

## Current Boundaries

The slice uses the existing in-memory Emergency OS backend services and the existing whiteboard Zustand store. It does not add real EHR writeback, Mongo identity-session runtime requirements, billing/admin workflows, or unrelated research endpoints.
