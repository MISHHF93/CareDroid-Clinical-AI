# Asset Utilization Intelligence Report

## Goal

Asset utilization intelligence determines which platform assets are actually useful by turning usage facts into portfolio decisions. The report supports data-driven decisions to promote high-value assets, improve low-value assets, hide unused assets, and merge overlapping assets.

## Tracked Signals

All signals are organization-scoped and stored through the existing `usage_events` pipeline. The billing-facing `eventType` enum remains stable; behavioral details are recorded in metadata.

- Launches: asset opened from the registry, catalog, command launcher, workspace, recommendation, or dashboard.
- Usage duration: elapsed seconds for the active asset session.
- Repeat usage: repeated launches or sessions by the same user, role, workspace, or session fingerprint.
- Abandonment: asset sessions that end quickly or without completion.
- AI recommendations accepted: recommendation cards opened by users.
- Workflow completions: workflow blocks or preview chains completed from the workflow surface.

## Event Contract

Behavioral events use privacy-safe metadata:

- `metadata.eventType`: `asset_launched`, `asset_duration`, `asset_abandoned`, `recommendation_accepted`, or `workflow_completed`.
- `metadata.assetId`: canonical asset or registry ID.
- `metadata.sessionId`: browser-session fingerprint only; no patient or PHI content.
- `metadata.durationSeconds`: rounded session duration for duration and abandonment events.
- `metadata.source`: launch or completion surface, such as `registry-tool-launch`, `recommendations`, or `workflow-builder`.
- `metadata.route`, `metadata.mode`, `metadata.category`, and `metadata.assetType`: non-sensitive classification fields.

Behavioral-only events use `quantity: 0` so usefulness intelligence does not inflate billing meters or legacy usage totals. Launches keep `quantity: 1`.

## Report Definitions

Top Assets are assets with strong usefulness scores. They combine launches, repeat usage, accepted recommendations, workflow completions, and meaningful duration while discounting abandonment.

Underused Assets are entitled assets with some usage but low usefulness. These are candidates for onboarding, UX improvement, training, or repositioning.

Unused Assets are entitled assets with no launch, duration, recommendation acceptance, or completion signal in the reporting window. These are candidates for hiding or retiring.

Merge Candidates are low-use assets that overlap by category, type, or route pattern with a stronger asset. The recommendation includes a suggested target and a reason.

## Usefulness Formula

The usefulness score is intentionally simple and explainable:

- `launches * 5`
- `repeatUsers * 4`
- `workflowCompletions * 8`
- `recommendationsAccepted * 6`
- `averageDurationSeconds / 30`, capped at 10 points
- minus `abandonmentRate * 20`

Scores are rounded and never drop below zero. The formula can be tuned later without changing event storage.

## Decision Output

Each asset receives a data-driven decision:

- Promote: high usefulness and repeated usage.
- Improve: low score but nonzero usage.
- Hide: no useful signal.
- Merge: low score with a stronger similar asset.
- Monitor: enough signal to keep watching without action.

## Privacy And Safety

The report stores only aggregate usage facts and non-sensitive metadata. It must not persist patient IDs, MRNs, notes, free-text clinical input, emails, names, or raw recommendation prompts.

## Verification

Verification should cover:

- Frontend helpers emit launch, duration, abandonment, recommendation acceptance, and workflow completion metadata.
- Backend aggregation calculates tracked signals and generated report sections.
- `/platform-analytics` renders tracked KPIs, Top Assets, Underused Assets, Unused Assets, and Merge Candidates.
- Existing billing summaries remain stable because behavioral-only events use zero quantity.
