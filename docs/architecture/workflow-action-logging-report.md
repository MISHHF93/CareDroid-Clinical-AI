# Workflow Action Logging Report

## Schema

Emergency OS workflow actions use a normalized `WorkflowActionLog` shape:

- `id`: stable log identifier.
- `type`: one of `patient_created`, `journey_state_changed`, `clinician_assigned`, `reassessment_created`, `reassessment_completed`, `ems_arrival_created`, `ems_converted_to_patient`, `capacity_score_changed`, `boarding_started`, `referral_created`, `copilot_used`, `provincial_data_viewed`, or `integration_event_received`.
- `title` and `summary`: human-readable audit text for timeline/admin views.
- `timestamp`: ISO timestamp.
- `actorStaffId` / `actorName`: staff actor when known.
- `patientId`: patient scope when applicable.
- `source`: emitting module or route.
- `severity`: `Info`, `Warning`, or `Critical`.
- `status`: `recorded`, `pending`, `completed`, or `failed`.
- `metadata`: structured event details such as state transitions, referral IDs, EMS arrival IDs, capacity score deltas, connector status, and Copilot context counts.

## Event Coverage

- Frontend store actions log patient creation, journey state changes, clinician assignment, reassessment scheduling/completion, EMS arrival creation, EMS conversion to patient, capacity score changes, boarding start, referral creation, Copilot prompt usage, provincial data views, and integration events received.
- Backend Emergency OS services log patient creation, journey state changes, boarding start, capacity score changes, provincial data views, integration events received, and Copilot context generation.
- Existing journey events remain the patient-flow source of truth. Patient timeline rendering derives workflow logs from journey events where possible and merges explicit workflow logs by ID to avoid duplicate records for the same journey event.

## Frontend Wiring

- `store/emergencyStore.ts` now stores `workflowLogs`, exports `selectWorkflowLogs`, `selectPatientWorkflowTimeline`, and syncs workflow actions through existing `recordEmergencyActivity` and `syncEmergencyAuditEvent`.
- `src/store/emergencyStore.ts` carries the same lightweight log shape for the newer route shell, patient detail, and Copilot surfaces.
- `src/components/PatientDetailPanel.tsx` renders patient-scoped workflow actions with empty state.
- `src/pages/emergency/EmergencySettings.jsx` renders an admin workflow audit section with loading, empty, error, backend-loaded, and local-fallback states.
- `src/services/emergencyOsApi.js` exposes `fetchEmergencyWorkflowLogs()` for `/api/emergency/workflow-logs`.

## Backend Wiring

- `WorkflowActionLogService` in `backend/src/modules/emergency-os/emergency-os.services.ts` provides fixture-safe in-memory workflow log recording.
- `EmergencyOsController` exposes:
  - `GET /api/emergency/workflow-logs`
  - `GET /api/emergency/patients/:patientId/workflow-logs`
- `EmergencyPatientService`, `ProvincialHealthService`, `IntegrationHubService`, and `EDCopilotService` emit workflow logs at existing service boundaries.

## Validation Commands

Focused validation targets:

- `npm test -- store/emergencyStore.test.ts`
- `npm test -- src/services/emergencyOsApi.test.js`
- Backend controller spec for `backend/src/modules/emergency-os/emergency-os.controller.spec.ts`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`

## Boundaries

- Logs are fixture/local-memory backed unless the existing activity/audit sync endpoints accept the client-side sync payloads.
- The implementation does not persist workflow logs to `caredroid.sqlite`.
- Backend EMS/referral/reassessment write endpoints are not all present in the normalized Emergency OS controller, so those events are logged on frontend actions where the workflows currently mutate local state.
