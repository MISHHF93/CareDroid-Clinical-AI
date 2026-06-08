# Dashboard To Asset Compression Report

Date: 2026-06-08

## Goal

Reduce navigation distance from the dashboard to the work users need to launch.

Target: every primary dashboard-to-work path should be reachable in a maximum of 2 clicks.

## Measured Paths

| Path | Current Route | Current Clicks | Target | Gap |
| --- | --- | ---: | ---: | --- |
| Dashboard -> Asset | Dashboard recommendations or Tools hub | 1 click for visible recommended tools, 2+ clicks for general assets | Max 2 | Needs explicit asset shortcut and personalized asset rows |
| Dashboard -> Workflow | Dashboard `Workflows` action | 1 click | Max 2 | Meets target |
| Dashboard -> Simulation | Dashboard `Medical Simulation` action | 1 click | Max 2 | Meets target |
| Dashboard -> Operation | Dashboard `Operations` action | 1 click | Max 2 | Meets target |

## Compression Strategy

Keep the one shell and dashboard, but add a compact launch surface that compresses four sources:

- Shortcuts: canonical routes for Assets, Workflows, Simulation, and Operations.
- Recommendations: role/workspace recommended assets that launch directly.
- Favorites: saved/pinned tools from `ToolPreferencesContext`.
- Recents: recent tools from `ToolPreferencesContext`.

## Canonical Click Contract

- Dashboard -> Assets hub: 1 click.
- Dashboard -> Recommended asset/tool: 1 click.
- Dashboard -> Favorite asset/tool: 1 click.
- Dashboard -> Recent asset/tool: 1 click.
- Dashboard -> Workflows hub: 1 click.
- Dashboard -> Simulation hub: 1 click.
- Dashboard -> Operations hub: 1 click.
- Dashboard -> Any non-visible asset through hub/search: 2 clicks.

## Implementation Plan

1. Add dashboard compression shortcuts for Assets, Workflows, Simulation, and Operations.
2. Use existing recommended tool data for direct recommended launches.
3. Use `favorites` and `pinned` from `ToolPreferencesContext` for saved asset launches.
4. Keep recent tool launches visible from the dashboard.
5. Preserve the existing one-shell structure and canonical routes.
6. Add tests that assert the max-two-click contract from the dashboard.

## Expected Result

The dashboard becomes the launch compression surface:

- Common destinations are one click.
- Personalized recommendations, favorites, and recents are one click.
- Broad discovery remains reachable in two clicks via the canonical hubs.
