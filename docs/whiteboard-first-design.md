# Whiteboard-First Design

Status: implemented

## Goal

Make the Emergency Whiteboard the center of operations.

Users should reduce dashboard hopping and access operational work directly from the Whiteboard.

## Whiteboard Access Targets

The Emergency Whiteboard should provide direct access to:

- Patient
- Queue
- Alert
- Referral
- EMS Arrival

## UX Rules

- Treat the Whiteboard as the operational home for real-time ED flow.
- Keep patient cards visible and actionable.
- Add direct actions for queue review, alert escalation, referral blockers, and EMS arrivals.
- Preserve deeper pages for detailed review, but make them secondary to the Whiteboard.
- Keep human review boundaries intact for clinical and operational actions.

## Implementation Notes

Implemented on:

`/workspace/emergency/whiteboard`

Changes:

- Added a direct Whiteboard action grid above the patient-flow columns.
- Added direct access actions for Patient, Queue, Alert, Referral, and EMS Arrival.
- Wired each action to the existing Emergency detail workflow:
  - Patient → `/workspace/emergency/patient-path`
  - Queue → `/workspace/emergency/queues`
  - Alert → `/workspace/emergency/escalations`
  - Referral → `/workspace/emergency/referrals`
  - EMS Arrival → `/workspace/emergency/ems`
- Kept patient-flow columns visible below the action grid.
- Preserved the Whiteboard summary, filters, search metadata, source state, safety boundary, and Assistant summary action.
- Added responsive styling so Whiteboard actions collapse with other Emergency grids.
- Added focused UI test coverage for the direct actions and sample EMS navigation.

Implementation files:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`
  - 1 test file passed
  - 32 tests passed
