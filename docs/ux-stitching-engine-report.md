# UX Stitching Engine Report

Date: 2026-06-08

## Goal

Every page should feel connected. Users should always understand where they came from, what they can do now, and where the next useful action lives.

## Transition Audit

| Transition | Current State | Gap | Fix |
| --- | --- | --- | --- |
| Dashboard -> Tools | Strong. Dashboard exposes Tools through primary actions, shortcuts, favorites, recents, recommendations, and status links. | Tools receives users but does not explicitly continue into workflow creation. | Add contextual workflow bridge on Tools. |
| Dashboard -> Operations | Strong. Dashboard exposes Operations and Operations fans out into maps, devices, alerts, and telemetry. | Operations can still feel like a hub without a next-step continuation. | Add stitched links to workflows, results, and Assistant. |
| Dashboard -> Assistant | Strong. Dashboard has prompt form, prompt chips, and Assistant route. | Assistant result cards can show next best actions as static text. | Make result next actions route-backed where possible. |
| Tools -> Workflow | Partial. Tools has AI workflow filters and launches tools, but no explicit handoff from selected tools into workflow assembly. | Users can stop after browsing tools instead of building a workflow. | Add "Continue into workflow" contextual transition. |
| Workflow -> Result | Weak. Workflow completion records telemetry and shows status text only. | Completion is a dead end. | Render completion result panel with Timeline, Recommendations, and Assistant CTAs. |
| Result -> Recommended Next Action | Partial. Recommendations page exists, but result cards and workflow completion do not hand off into it clearly. | Next action guidance is not always clickable. | Add route-backed next-action affordances. |

## Stitching Rules

1. Every hub should expose a clear next step.
2. Every completed workflow should produce a visible result state.
3. Every result state should link to a recommended next action.
4. Assistant should be available as the fallback when the next action is ambiguous.
5. Search and recommendations remain the broad discovery escape hatches.
6. No page should end with only static copy.

## Implementation Plan

1. Add a Tools -> Workflow contextual bridge near the Tools discovery controls.
2. Add Operations continuation actions to Workflows, Timeline, Recommendations, and Assistant.
3. Expand workflow fixture metadata with result summaries and recommended next actions.
4. Render a workflow completion result panel after completion.
5. Make operational result card next actions clickable when route metadata exists.
6. Add focused tests that verify the stitched path and no-dead-end affordances.

## Success Criteria

- Dashboard routes still open Tools, Operations, and Assistant.
- Tools exposes a visible path into Workflows.
- Workflow completion exposes Timeline, Recommendations, and Assistant.
- Result cards can route to recommended next actions.
- Operations provides continuation actions instead of stopping at drill-down cards.

## Implemented Stitching

- Tools now includes a "Continue into workflow" transition with actions for workflow building and recommended next actions.
- Operations now includes continuation links to workflow building, result review, recommendations, and Assistant.
- Workflow deep links now select the requested workflow from `?workflow=...`.
- Workflow completion now renders a result panel connected to Timeline, Recommendations, and Assistant.
- Workflow fixture metadata now includes result summaries and recommended next-action routes.
- Operational result cards now render route-backed next actions for Timeline, Recommendations, Assistant, and Settings where appropriate.

## Verification

- `npm run test:run -- src/pages/PlatformOSPages.test.jsx src/pages/tools/ToolsOverview.visibility.test.jsx src/pages/Operations.test.jsx src/components/chat/OperationalResultCard.test.jsx src/pages/CommandDashboard.test.jsx src/pages/Dashboard.chatLayout.test.jsx`
- Lint diagnostics passed for the edited files.
