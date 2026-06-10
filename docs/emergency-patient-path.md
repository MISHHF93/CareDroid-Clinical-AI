# Emergency Patient Path

## Product Point

CareDroid ED OS turns every ED arrival into a known, risk-routed, queue-assigned, action-ready, destination-tracked patient flow object.

The key selling metric is **Door-to-Direction Time**: the time from an arrival signal to a visible next operational direction inside the Emergency OS.

## Patient Path

The canonical ED patient path is:

**Arrival Signal -> Patient Known -> Risk Known -> Queue Known -> Next Action Known -> Destination Known -> Throughput Measured**

This is designed for emergency departments because the ED is the first operational breakpoint where patients can become invisible between waiting room, triage, EMS handoff, provider queue, referral, boarding, and discharge.

## Metric Contract

Door-to-Direction includes these sub-metrics:

- `doorToKnownMinutes`: patient has a visible ED OS identifier, complaint, arrival mode, and current state.
- `doorToRiskMinutes`: risk level, complaint route, calculators, and alerts are attached for review.
- `doorToQueueMinutes`: patient is assigned to an operational ED queue.
- `doorToActionMinutes`: next human-reviewed operational action is visible.
- `doorToDestinationMinutes`: likely destination path is tracked.
- `doorToDirectionMinutes`: median time to visible next operational direction.
- `p90DoorToDirectionMinutes`: p90 time to visible next operational direction.
- `targetCompliance`: percent of patients within the Door-to-Direction target.

## Runtime Contract

`EmergencyPatientPathService` exposes:

- `getPatientPathDashboard()`
- `getPatientPathForPatient(patientId)`
- `getDoorToDirectionMetrics()`
- `getPathRecommendations()`

Each patient path row includes:

- patient ID / demo ID
- arrival mode
- chief complaint
- current journey state
- risk score and risk level
- assigned queue
- suggested calculators, protocols, and workflows
- destination path
- blockers
- next human-reviewed operational action
- source state
- safety statement

## Demo Posture

The first implementation uses demo/local ED data:

- sample patients from the Emergency Demo Environment
- whiteboard cards from the ED Digital Whiteboard service
- queue signals from Queue Intelligence
- complaint routing from Clinical Intent Router
- referral, boarding, capacity, and throughput context from existing ED OS services

The route and service clearly label demo data and do not imply live EHR, ADT, CAD, bed-board, staffing, or telemetry integration.

## UI Surfaces

Primary route:

- `/workspace/emergency/patient-path`

Summary surfaces:

- `/workspace/emergency/command-center`
- `/workspace/emergency/director`

Compatibility:

- `/workspace/emergency/patients` remains available for the existing journey and patient-operating-queue view.

## Safety Boundary

Patient Path is operational routing support only. It does not diagnose, treat, move patients, assign beds, discharge patients, order care, or make autonomous clinical decisions.

All next actions are workflow guidance for human review.

## First-Customer Message

For a first ED customer:

**CareDroid shows how fast the department can turn an arrival into a known, risk-routed, queue-assigned, action-ready patient.**

This lets leaders demonstrate value without replacing the EHR:

- fewer invisible patients
- clearer queue ownership
- earlier high-risk visibility
- faster operational direction
- measurable patient-flow bottlenecks
- a clear path from ED arrival to destination
