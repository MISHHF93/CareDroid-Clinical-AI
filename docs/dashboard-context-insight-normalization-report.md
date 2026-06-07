# Dashboard Context Insight Normalization Report

Date: 2026-06-07

## Summary

CareDroid dashboards now use a shared `ContextInsightCard` pattern for contextual recommendations, demo insights, generated local insights, empty states, action-required items, and backend-unavailable states. Long source paragraphs are hidden under `Source details` in `StateSourceNotice` so primary dashboard panels no longer read like typed scripts.

## Context Notes Found

- Profile/workspace summary chips in `CommandDashboard`.
- Assistant-context line in `ProfileToolGraphCard`.
- Inline backend/demo source messages in Medical IoT, Hospital Map, Device Fleet, Fleet Command, Live Map, AI Command Center, Laboratory, Simulation, and Digital Twin surfaces.
- Placeholder/demo wording in Hospital Map, Medical IoT, Device Fleet, and Simulation.
- Custom predictive insight cards in Digital Twin that did not expose source/status consistently.

## Conversions Applied

- Created `src/components/ContextInsightCard.jsx` and `src/components/ContextInsightCard.css`.
- Converted Command Dashboard profile/workspace summaries into sourced insight cards.
- Converted Profile Tool Graph coverage and assistant context into generated/empty cards.
- Converted Medical IoT, Hospital Map, Device Fleet, Fleet Command, Live Tracking, Operations, Digital Twin, AI Command Center, Laboratory, and Simulation context blocks into cards.
- Changed `StateSourceNotice` details to a collapsible help disclosure.
- Renamed hardcoded simulation `AI tutor` labels to `Demo tutor` labels.
- Removed visible `placeholder` wording from dashboard detail panels where it looked unfinished.

## Source Honesty

Every new card identifies its source and status:

- `live`: organization/backend-provided status where available.
- `generated`: local computed context from current snapshot/profile.
- `demo`: local/demo fixtures or role/workspace demo context.
- `unavailable`: backend/API source not wired or fallback state.
- `empty`: no recommendation/context yet.
- `action-required`: a recommendation that needs user review and has a route.

## Tests Added Or Updated

- Added `src/components/ContextInsightCard.test.jsx`.
- Updated `StateSourceNotice` tests for collapsible source details.
- Updated Medical IoT and Hospital Map tests for demo/unavailable insight labels, absence of raw `context note`, and responsive card presence.
- Updated Simulation/Laboratory tests from `AI tutor feedback` to `Demo tutor feedback`.

## Remaining Risks

- Several dashboards still use demo/local data by design. They are now labeled, but live production integrations still require backend contracts.
- Some chart panels retain short `Demo data` or `Mock telemetry` badges. These are concise source labels, not script-like context notes.
- AI-generated labels are only used where the UI has AI/system context; hardcoded simulation tutor copy is now labeled as demo.

