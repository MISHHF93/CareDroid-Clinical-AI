# Triage Workspace Compression

Status: implemented

## Goal

Compress the Emergency triage experience into a single workflow surface.

The target is:

Single triage workflow experience.

No unnecessary screens.

## Inputs

The triage workflow should collect:

- Complaint
- Vitals
- Age
- Risk Factors

## Outputs

The triage workflow should return:

- Risk Bundle
- Recommended Workflow
- Recommended Calculators
- Escalation Flags

## UX Rules

- Keep complaint routing, calculators, protocols, and escalation guidance in one triage workspace.
- Do not force users to navigate separately to tools, calculators, workflows, or protocols before receiving triage guidance.
- Make the output immediately actionable and human-reviewed.
- Preserve deep routes for detailed review, but do not require them for the primary triage task.

## Implementation Notes

Implemented on:

`/workspace/emergency/triage`

Changes:

- Replaced the previous separated triage orchestrator layout with a single compressed triage workflow.
- Added one input panel for Complaint, Vitals, Age, and Risk Factors.
- Added one output panel for Risk Bundle, Recommended Workflow, Recommended Calculators, and Escalation Flags.
- Reused the existing Emergency complaint router so complaint selection updates workflow and calculator recommendations immediately.
- Added escalation flags derived from complaint, age, vitals, and risk-factor text.
- Kept recommended calculator launch buttons in the same workflow surface.
- Preserved optional calculator trigger details behind a disclosure instead of making them the primary experience.
- Added a `Review Triage Bundle` action that sends the full compressed bundle to Assistant for human-reviewed guidance.
- Kept the triage safety boundary visible.

Implementation files:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`
  - 1 test file passed
  - 32 tests passed
