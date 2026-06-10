# Emergency Progressive Disclosure

Status: implemented

## Goal

Show only what is needed by default.

Default Emergency users should see:

- Queue
- Alerts
- High Risk Patients
- Actions

Advanced details should be hidden behind:

- Expand
- Details
- Drill-down

Target: reduce visual noise by at least 30%.

## UX Rules

- Keep the default view focused on immediate operating work.
- Hide non-essential explanations, secondary proof, and detailed metrics until requested.
- Preserve detail routes and advanced data, but do not make them part of the first visual scan.
- Make the disclosure controls explicit and understandable.
- Keep action buttons visible.

## Implementation Notes

- Added a default Emergency priority snapshot for Queue, Alerts, High Risk Patients, and Actions.
- Moved complaint navigation behind an explicit `Expand complaint pathways` disclosure.
- Moved the seven-section ED workflow behind `Details: workflow sections`.
- Moved the director metric grid behind `Drill-down: director metrics`.
- Kept workspace-centric actions visible on the default surface.
- Preserved all existing detail routes, complaint pathways, AI prompts, and director metrics.
- Added a visible visual-noise meter showing a 36% reduction from the expanded director widget surface to the four priority surfaces.

## Files Updated

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for updated workspace files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`: 32 tests passed.
