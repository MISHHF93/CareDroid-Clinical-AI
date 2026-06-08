# Dashboard Compression Report

Status: implemented

## Goal

Reduce dashboard visual noise while preserving dashboard functionality.

## Audit Scope

- Oversized cards
- Duplicate metrics
- Static text
- Context notes
- Unused widgets

## Replacement Model

- Compact cards
- Insight chips
- Actions
- Recommendations

## Implementation Log

### Audit Findings

- Oversized cards: the previous Command Dashboard rendered many full panels at once, including workspace context, adaptive dashboard, profile tool graph, quick actions, notifications, alerts, simulation/lab/3D, assistant, recommended tools, favorites, tools, calculators, analytics, detail panels, recent activity, and system status.
- Duplicate metrics: organization, recommendations, packs, pinned/recent assets, inventory totals, backend readiness, unsupported tools, and API state appeared across hero stats, analytics metrics, and status panels.
- Static text: many panels had descriptive copy that competed with action content and made the page read like documentation.
- Context notes: workspace/profile/status notes were repeated across hero copy, workspace panel, insight cards, system cards, and empty states.
- Unused widgets: analytics charts and detailed category/tier/readiness distributions were always visible even when the user’s immediate dashboard job was to act.

### Compression Model

The dashboard now defaults to compressed mode:

- Hero: short command-center framing plus four insight chips.
- Actions: one compact launch row for primary routes and top workspace shortcuts.
- Assistant: one focused prompt form plus six starter prompt chips.
- Recommendations: one compact tool recommendation panel with a route to the full recommended tool view.
- Signals: notifications, active alerts, recent tools, and recent conversation continuation in one compact feed.
- Status: compact inventory/backend/planned metric cards plus two status cards and direct retry/library/audit actions.

### Files Updated

- `src/pages/CommandDashboard.jsx`
- `src/pages/CommandDashboard.css`
- `src/pages/CommandDashboard.test.jsx`

### Functionality Preserved

- Assistant prompt seeding still routes to `/assistant`.
- Primary dashboard actions still route to Assistant, Tools, Operations, Workspaces, and workspace shortcuts.
- Recommended tools still launch through canonical `applyRegistryToolLaunch`.
- Notifications and alerts remain accessible through `/notifications` and `/clinical/alerts`.
- Tool library, system retry, and developer audit actions remain available where permitted.
- Backend behavior was not changed.

## Verification

- `npm run test:run -- src/pages/CommandDashboard.test.jsx src/styles/compactUxFlattening.test.js` passed: 13 tests.
- IDE diagnostics reported no linter errors for `CommandDashboard.jsx`, `CommandDashboard.css`, or `CommandDashboard.test.jsx`.
