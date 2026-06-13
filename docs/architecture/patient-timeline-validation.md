# Patient Timeline Validation

## Scope

The Patient Timeline is rendered from every Emergency OS patient card through the existing card-to-detail flow. Each `PatientCard` exposes a `Timeline` button and still opens `PatientDetailPanel`; the detail panel now contains a `Patient Timeline` section below the journey progress strip.

## Data Sources

- Local patient state: `arrivalTime`, `triageTime`, `state`, `priority`, `roomId`, `flags`, `vitals`, `notes`, and `patient.timeline`.
- Existing workflow log stream: `workflowLogs` in `src/store/emergencyStore.ts`, including patient creation, journey changes, reassessments, EMS, boarding, referrals, copilot, provincial data, and capacity events.
- Local alerts: patient-scoped escalation, EMS, reassessment, vitals, and copilot signals.
- Optional backend enrichment, fetched without hydrating or overwriting the whiteboard store:
  - `/api/emergency/journey`
  - `/api/emergency/ems`
  - `/api/emergency/queues`
  - `/api/emergency/reassessment`
  - `/api/emergency/boarding`
  - `/api/emergency/referrals`
  - `/api/emergency/provincial-health`
  - `/api/emergency/copilot`
  - `/api/patients/:patientId/timeline` through the existing patient-management bundle client

## Event Categories

The normalized timeline item shape is defined in `src/utils/patientTimeline.ts`:

- `intake`: patient arrival or local patient creation.
- `state-transition`: journey state changes that are not better classified as triage, boarding, or discharge.
- `triage`: triage timestamp, priority, or journey event to Triage.
- `queue`: room/staff assignments, current queue, and queue module membership.
- `reassessment`: vitals updates, reassessment flags, reassessment workflow logs, and reassessment alerts.
- `ems`: EMS flags, EMS pre-arrival complaint text, EMS module arrivals, and EMS alerts.
- `referral`: referral module rows, disposition review, or pending-admission referral context.
- `boarding`: Admission state, PendingAdmission flag, boarding module rows, and boarding workflow logs.
- `discharge`: Discharge state or discharge journey events.
- `ai-copilot`: high-risk/deterioration/sepsis signals, copilot workflow logs, and copilot context.
- `provincial-health`: provincial connector records when present, otherwise an explicit local fallback that the connector is pending or unavailable.

## UI Access Path

1. Open any Emergency OS view that renders `PatientCard`.
2. Select the card itself or the card-level `Timeline` button.
3. `PatientDetailPanel` opens with the normalized `Patient Timeline` section.
4. The section shows loading and partial-error states for backend enrichment while preserving the local fallback timeline.

## Frontend Wiring

- `src/components/PatientCard.tsx` adds the explicit card-level `Timeline` button.
- `src/components/PatientDetailPanel.tsx` renders timeline events and passes local patient state, alerts, workflow logs, staff, and optional backend context into `buildPatientTimeline`.
- `src/hooks/usePatientTimelineContext.ts` fetches optional module context without using the generic Emergency OS hydration hook, avoiding accidental replacement of the active patient list with module-specific subsets.
- `src/store/emergencyStore.ts` appends typed patient timeline events for active local actions: intake, state transitions, staff assignment, room assignment, flag changes, vitals reassessments, and patient-scoped alerts.

## Backend/API Wiring

No new backend route was required. The implementation aligns with existing Emergency OS module routes and the existing patient-management timeline route. Backend failures are treated as enrichment failures only; the patient timeline still renders local patient state and workflow logs.

## Validation Commands

Focused checks:

```bash
npx vitest run src/utils/patientTimeline.test.ts src/components/PatientCard.clinicalIntelligence.test.jsx
```

Requested broader checks:

```bash
npm run typecheck:frontend
npm run lint
npm run build
```

## Boundaries

- The provincial health connector remains a placeholder unless backend credentials/feed adapters are configured.
- Emergency OS module enrichment is read-only in the timeline hook and does not mutate or hydrate the whiteboard store.
- Historical events are synthesized from available patient state where no persisted event exists, which keeps the timeline useful for existing seeded patients without inventing a separate mock-only data store.
