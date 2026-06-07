# UX Normalization And Wiring Report

## Current UX Map

1. User opens the app and lands on the public/auth shell.
2. User authenticates, follows an auth alias, or enters a local demo session.
3. Authenticated routes render inside the single `AppShell` with sidebar, header, quick command, and one main content region.
4. The user lands on `/dashboard`, the command-center route.
5. The active workspace can be changed from shell/header workspace controls.
6. The user opens `/assistant` for AI-first workflows, often seeded by dashboard/tool launch actions.
7. The user finds assets in `/tools`, or reaches operations detail pages from dashboard, quick command, direct links, or the operations hub.
8. Tools, calculators, dashboards, maps, IoT, fleet, simulations, laboratory, and admin pages render as protected app routes.
9. The user returns through sidebar, quick command, dashboard cards, or page CTAs.

## Nested UX Findings

- The app already has one shell, but user-facing navigation was split across primary nav, account utilities, a solutions group, advanced pages, dashboard cards, and quick command.
- `Profile` and `Settings` were reachable but not part of the primary sidebar model, so normal account tasks felt secondary.
- `/operations` and `/operations-center` both acted like operations command surfaces, creating two competing hubs.
- Operations leaves such as Hospital Map, Medical IoT, Devices, Fleet Map, Live Map, Digital Twin, alerts, telemetry, and maintenance were reachable, but not consistently framed as details under one Operations system.
- `/tools` and `/tools/calculators` were wired, but the visible filter language mixed user-facing categories with implementation-oriented groupings.
- Dashboard shortcuts and command prompts could launch deep routes directly, which is useful, but some labels made those detail pages feel like separate products.
- Optional sidebar solution links added another navigation layer that competed with the requested simple six-entry model.

## Broken Or Confusing Journey Points

- A user looking for profile or settings had to use account utility affordances instead of primary navigation.
- A user looking for operations could choose `/operations`, `/operations-center`, dashboard cards, or direct operational routes without a clear hierarchy.
- Fleet detail pages and operations detail CTAs were inconsistent about whether the return path was `/tools`, `/dashboard`, or `/operations`.
- Developer/source audit surfaces lived close to the user-facing tools experience and needed clearer Advanced separation.
- Tools filters did not exactly match the requested library model, making it harder to scan by calculators, clinical tools, AI workflows, simulations, laboratory, operations, and governance.

## Duplicate Entry Points

- Dashboard: `/dashboard` plus `/home` alias.
- Assistant: `/assistant` plus `/chat`, `/ai`, and `/copilot` aliases.
- Tools: `/tools` plus `/all-tools`, `/clinical-tools`, and `/catalog` aliases.
- Calculators: `/tools/calculators`, `/calculators`, and direct `/tools/calculators/:slug` routes.
- Operations: `/operations`, `/operations-center`, `/digital-twin`, `/hospital-map`, `/medical-iot`, `/devices`, `/fleet/map`, and `/live-map`.
- Fleet/live map aliases: `/fleet`, `/fleet/live-map`, `/fleet/tracking`, `/maps`, `/tracking`, and `/live-tracking`.
- Audit: `/audit` plus `/audit-logs`.

## Recommended Flat UX Model

Primary navigation should contain only:

1. Dashboard
2. Assistant
3. Tools
4. Operations
5. Profile
6. Settings

Advanced should hold admin, developer, governance, security, audit, regulatory, products, organization, configuration, and asset management surfaces.

User-facing routes should behave as follows:

- `/dashboard` is the home base and command center.
- `/assistant` is the AI-first workflow layer.
- `/tools` is the single searchable library for calculators, clinical tools, AI workflows, simulations, laboratory, maps, IoT, operations, governance, favorites, and recent assets.
- `/operations` is the hub for Digital Twin, Hospital Map, Medical IoT, Devices, Fleet Map, Live Map, Alerts, Telemetry, and Maintenance.
- `/profile` owns user identity, activity, pinned/hidden tools, and tool graph entry points.
- `/settings` owns application and account settings.

Detail routes remain available, but visible launch paths should frame them as details under Tools or Operations rather than separate command centers.

