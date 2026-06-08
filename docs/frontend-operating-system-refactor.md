# Frontend Operating System Refactor

Status: implemented

## Goal

Treat frontend as an operating system shell.

Preserve:

- Backend
- SaaS architecture

Refactor frontend into:

```text
AppShell
-> Workspace
-> Dashboard
-> Asset Launch
-> Workflow
-> Result
```

## Eliminate

- Fragmentation
- Nested UX
- Duplicate navigation
- Duplicate widgets
- Duplicate dashboards

## Acceptance

- The platform feels like one product.
- The platform feels fast.
- The platform feels intentional.
- The platform feels workspace-driven.
- The platform feels SaaS-native.

## Audit Notes

Inspected the shell-to-result flow across:

- `src/layout/AppShell.jsx`
- `src/contexts/WorkspaceContext.jsx`
- `src/config/workspace.config.js`
- `src/data/workspaceExperience.js`
- `src/pages/CommandDashboard.jsx`
- `src/navigation/registryToolLaunch.js`
- `src/data/searchFirstDiscovery.js`
- `src/pages/PlatformOSPages.jsx`
- `src/config/routes.config.js`

Findings:

- `AppShell` already owns global chrome, sidebar/drawer navigation, workspace switcher, and Quick Command.
- Workspace state already preserves SaaS architecture by merging backend workspace context with local fallback workspace definitions.
- The dashboard was already compressed and workspace-driven, but the app did not expose a canonical frontend operating flow across shell, workspace, dashboard, launch, workflow, and result.
- Asset launch behavior was split across tools, assets, search, assistant, and command palette, even though recent search-first work gave those surfaces a shared discovery index.
- Workflow routes existed, but they were not clearly positioned as the next step after asset launch.
- Result surfaces existed as timeline, notifications, recommendations, outcomes, analytics, and workflow mining, but there was no shared "Result" stage that explained where execution context lands.
- Duplicate navigation risk was lowest if the OS model remained a status and routing contract, not another interactive nav bar.

Decision:

- Preserve backend and SaaS context APIs.
- Preserve the single AppShell and existing routing.
- Add one shared frontend OS flow model.
- Use the model to make the shell and dashboard feel like one intentional workspace-driven product.
- Avoid adding duplicate navigation; use the flow as shell state and dashboard context.

## Fixes Applied

- Added `src/data/frontendOperatingSystem.js`.
- Defined the canonical frontend flow:
  `AppShell -> Workspace -> Dashboard -> Asset Launch -> Workflow -> Result`.
- Added route classification for workspace, dashboard, asset launch, workflow, and result surfaces.
- Added workspace-aware OS state generation with tenant and plan metadata.
- Updated `AppShell` to read active workspace context and show a compact desktop OS status strip.
- Kept compact/mobile shell free of extra navigation so drawer/sidebar remains the only authenticated navigation system.
- Updated `CommandDashboard` to render the same OS flow in the hero.
- Added a canonical `Results` action on the dashboard that routes to the timeline/result context.
- Preserved existing asset launch, workflow launch, dashboard, SaaS entitlement, and backend behavior.
- Added focused tests for the OS model, shell strip, dashboard flow, and dashboard Results action.

## Verification

- `ReadLints`: no diagnostics for edited OS refactor files.
- `npm run test:run -- src/data/frontendOperatingSystem.test.js src/layout/AppShell.navigation.test.jsx src/layout/AppShell.layout.test.js src/pages/CommandDashboard.test.jsx`
  - 4 test files passed.
  - 39 tests passed.

## Entropy Reduction Update

- Workflow stage ownership is now clearer: `/workflows` is canonical and `/automation` redirects there as a legacy protected alias.
- Public legal/privacy pages remain outside the authenticated OS flow; protected privacy surfaces stay under governance/privacy routes.
- Workspace stage state is safer because stale backend workspace context no longer leaks into the active workspace after a local switch.
- The Operations hub now acts as the operations stage entry point, with maps, IoT, fleet, routing, and maintenance presented as drill-downs instead of competing dashboard surfaces.
