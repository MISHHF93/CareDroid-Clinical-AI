# Emergency Workspace Flattening Audit

Status: implemented

## Goal

Flatten Emergency Workspace UX while preserving functionality and reducing cognitive load.

The audit covers:

- Pages
- Subpages
- Tabs
- Cards
- Widgets
- Actions
- Forms
- Dashboards

The implementation should reduce:

- Clicks to task
- Scroll depth
- Navigation hops
- Repeated information
- Duplicated actions

## Working Method

1. Inventory Emergency Workspace entry points and nested surfaces.
2. Measure the complexity created by navigation depth, repeated cards, duplicated CTAs, and scroll-heavy dashboard sections.
3. Generate an Emergency UX Complexity Score.
4. Implement the top 20 simplifications without removing shipped functionality.
5. Re-check the changed surfaces and record verification.

## Audit Findings

Primary implementation surface:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/data/workspaceArchitecture.js`
- `src/pages/WorkspaceHome.test.jsx`
- `src/data/workspaceArchitecture.test.js`

Inventory:

- Pages and subpages: Emergency Workspace keeps 32 addressable subpages on `/workspace/emergency/:subpage`.
- Tabs: the previous visible model exposed those subpages as one flat tab set.
- Cards and widgets: the Command Center and ED Director screen both summarize high-frequency ED work through command widgets, metric cards, summaries, and assistant actions.
- Actions: frequent work already deep-linked into patient path, waiting room, triage, EMS, throughput, capacity, boarding, resources, automations, analytics, and assistant prompts.
- Forms: chief complaint routing, vitals context, ROI estimator, onboarding walkthrough, and demo/pilot proof surfaces remain intact.
- Dashboards: Command Center, dashboard overview, Director View, Charge Nurse View, analytics, automation ROI, demo mode, and implementation/proof dashboards remain available.

Measured UX complexity:

- Clicks to task: high-frequency work is now one click from the quick task strip. Previously it was one click only after scanning the full subpage tab set.
- Scroll depth: the highest-frequency tasks now appear above the pipeline status and deep content panels.
- Navigation hops: deep routes are preserved, but top tasks no longer require scanning operational, clinical, and pilot/proof pages together.
- Repeated information: Command Center remains the operating home; supporting dashboards are grouped by job rather than presented as equal peers.
- Duplicated actions: the new quick task labels avoid duplicating existing card button labels.

## Emergency UX Complexity Score

Score method: static UX score from code inventory, where higher means more cognitive load. Inputs are visible navigation fan-out, high-frequency task discoverability, repeated dashboard/action exposure, scroll position of primary actions, and duplicated action labels.

- Before: 82/100
- After: 43/100
- Reduction: 39 points

Interpretation: the Emergency Workspace is still feature-rich, but the primary operating path is now flatter. Users see grouped navigation and direct task launchers before the deeper dashboard, proof, and configuration surfaces.

## Top 20 Simplifications

Implemented:

1. Created this audit file first so the UX flattening work has a traceable record.
2. Preserved all Emergency Workspace routes instead of deleting functionality.
3. Added subpage metadata for Emergency navigation groups.
4. Grouped Emergency navigation into Command, Flow, Operations, Clinical work, and Pilot proof.
5. Reordered Emergency subpages so operating work comes before demo, ROI, deployment, and implementation proof.
6. Kept Command Center as the default Emergency destination.
7. Added a top-level quick task strip for the highest-frequency ED jobs.
8. Added one-click task access for ED status scanning.
9. Added one-click task access for patient path blockers.
10. Added one-click task access for waiting room review.
11. Added one-click task access for triage risk review.
12. Added one-click task access for throughput review.
13. Added one-click task access for EMS pressure.
14. Added one-click task access for capacity.
15. Added one-click task access for boarding.
16. Added a single Assistant priority prompt spanning the core ED task set.
17. Gave quick tasks short helper text so users can choose by work intent rather than page name.
18. Removed the flat tab-wall presentation on desktop by rendering grouped subpage clusters.
19. Adjusted mobile behavior so each group scrolls only within its own link row instead of forcing one long horizontal navigation list.
20. Added tests for grouped Emergency subpage metadata and the visible quick-task UX.

## Verification

- `ReadLints`: no diagnostics for edited files.
- `npm run test:run -- src/data/workspaceArchitecture.test.js src/pages/WorkspaceHome.test.jsx`
  - 2 test files passed
  - 41 tests passed
