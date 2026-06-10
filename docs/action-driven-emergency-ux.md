# Action-Driven Emergency UX

Status: implemented

## Goal

Every Emergency Workspace card must answer:

What should I do next?

Cards should not stop at passive status reporting. They should present a suggested action and a clear next step.

## Required Action Language

Emergency cards should expose action-oriented language:

- Suggested Action
- Escalate
- Reassess
- Review
- Refer
- Complete

## UX Rules

- Lead with action before detail when possible.
- Keep metrics visible, but connect them to the next operational step.
- Remove passive information-only cards where the same information can be represented as an action card.
- Keep detail pages available, but make routine action possible from the workspace card.
- Preserve human review boundaries for clinical or operational decisions.

## Implementation Notes

Implemented on the Emergency primary workflow and command-card surfaces.

Changes:

- Added explicit `Suggested Action` blocks to the one-screen Emergency workflow cards.
- Added action verbs to the primary workflow cards: Review, Reassess, Complete, Escalate, Refer.
- Replaced passive detail-only body copy on primary workflow cards with action-first guidance plus supporting context.
- Updated primary action labels so the next step is operational, not informational.
- Added shared suggested-action guidance for Emergency Command Center widgets.
- Added the same suggested-action treatment to ED Director command cards.
- Kept metrics, detail routes, and Assistant prompts intact.
- Preserved human review language in AI and clinical action prompts.
- Added focused UI test coverage that verifies the action language appears and primary workflow actions still work.

Implementation files:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`
  - 1 test file passed
  - 31 tests passed
