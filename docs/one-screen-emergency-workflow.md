# One-Screen Emergency Workflow

Status: implemented

## Goal

Allow 80% of ED activities from one Emergency Workspace screen:

`/workspace/emergency`

Users should not need to constantly change pages for routine ED work. Deep pages remain available for detail review, but the primary workspace should support common activity directly.

## Primary Screen Sections

The `/workspace/emergency` primary screen should include:

- Current Queue
- High Risk Patients
- EMS Arrivals
- Alerts
- Referrals
- Capacity
- AI Recommendations

## Workspace-Centric Action Model

Routine actions should happen from the workspace screen first:

- Summarize priority work.
- Review queue pressure.
- Prioritize high-risk patients.
- Prepare EMS handoff context.
- Review alerts and escalation triggers.
- Prioritize referral blockers.
- Assess capacity and boarding pressure.
- Ask AI for next recommended actions.

Detail pages should be secondary, not the default operating pattern.

## Implementation Notes

Implemented on the Emergency Command Center surface, which is the default primary screen for:

`/workspace/emergency`

Changes:

- Added a one-screen ED workflow panel above the existing director command widgets.
- Added the required sections: Current Queue, High Risk Patients, EMS Arrivals, Alerts, Referrals, Capacity, and AI Recommendations.
- Made primary section actions workspace-centric: they seed ED-specific AI context without navigating away from `/workspace/emergency`.
- Kept detail routes as secondary actions for deeper review.
- Preserved the existing Emergency Command Center, Director View, Charge Nurse View, and all deep subpages.
- Added responsive layout rules so the one-screen workflow remains usable on smaller screens.
- Added test coverage for the required sections and no-navigation primary action behavior.

Implementation files:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`
  - 1 test file passed
  - 31 tests passed
