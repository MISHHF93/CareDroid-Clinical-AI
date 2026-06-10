# Complaint-Centric Navigation

Status: implemented

## Goal

Emergency navigation should start from common ED presentations:

- Chest Pain
- Stroke
- Sepsis
- Trauma
- Respiratory Distress

Instead of forcing users to start from generic buckets:

- Tools
- Calculators
- Workflows

## Navigation Model

Complaint

↓

Workflow

↓

Calculators

↓

Protocols

## UX Rules

- The complaint launcher should live on the primary Emergency Workspace screen.
- Each complaint entry should show the workflow first.
- Calculators should appear as part of the complaint pathway, not as a separate destination users must discover.
- Protocols should be tied to the complaint context.
- The launcher should seed workspace AI context while keeping human review boundaries intact.
- Detail routes can remain available, but the primary action should start from the complaint.

## Implementation Notes

Implemented a complaint launcher on the primary Emergency Workspace screen:

`/workspace/emergency`

Changes:

- Added complaint-first launch cards for Chest Pain, Stroke, Sepsis, Trauma, and Respiratory Distress.
- Mapped each complaint through the existing clinical intent router.
- Rendered the pathway as Complaint → Workflow → Calculators → Protocols.
- Kept calculators embedded in the complaint pathway instead of making users start from the calculator library.
- Added workspace-centric primary actions that seed complaint-specific AI context without leaving the Emergency workspace.
- Kept detail pathway access as a secondary action through the existing Emergency evidence route.
- Preserved human review wording in the generated complaint prompts.
- Added focused UI tests for complaint cards, pathway structure, and no-navigation complaint launching.

Implementation files:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`
  - 1 test file passed
  - 32 tests passed
