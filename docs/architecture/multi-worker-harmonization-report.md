# CareDroid Emergency OS Harmonization Report

Date: 2026-06-13

## Scope

This implementation pass harmonized the active Vite React Emergency OS product around the unified shell:

`src/main.jsx` -> `src/App.jsx` -> `BrowserRouter` -> `RootLayout` -> `src/components/AppShell.tsx` -> `Outlet`.

The active shell is `src/components/AppShell.tsx`, `src/components/Sidebar.tsx`, and `src/components/Header.tsx`. Legacy/general platform surfaces were not deleted; uncertain stale code is documented for review.

## Active Route Contract

Only these Emergency OS routes are mounted as active pages under the unified shell:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

The following now redirect to `/emergency/whiteboard` unless noted otherwise: `/`, `/emergency`, `/dashboard`, `/home`, `/workspace`, `/app`, mobile/android/general healthcare aliases, calculator/tool aliases, unknown routes, and retired Emergency OS routes including pulse, command-center, provincial-health, integrations, simulation, tools, and shift. Patient journey aliases redirect to `/emergency/patients`.

## Implementation Summary

- Pruned `src/App.jsx` to the 12 target routes and removed active mounts for retired non-target pages.
- Updated `src/config/routes.config.js` as the canonical route and redirect registry, including `EMERGENCY_OS_TARGET_ROUTES`.
- Updated `src/config/unified-navigation.config.ts`, `src/components/Sidebar.tsx`, and primary navigation tests to the target sidebar model.
- Updated command palette config/runtime commands so active navigation commands target the harmonized route set.
- Updated `src/data/searchFirstDiscovery.js` and `src/data/emergencyPageRenderInventory.js` to expose only target Emergency OS pages.
- Aligned role permissions and route-command access to the active pages.
- Fixed broken relative imports in Emergency OS components/pages and aligned EMS critical checklist imports with the store checklist source.
- Redirected root feature-registry sidebar routes for retired Pulse, Tools, and Shift feature records to `/emergency/whiteboard` while preserving the records for settings/manual review.
- Normalized `EMERGENCY_OS_BRANDING.commandCenterRoute` to `/emergency/whiteboard`.

## Validation

- `ReadLints` on edited source/config files: passed.
- `npm run test:run -- <focused harmonization suite>`: passed, 11 files and 93 tests.
- `npm run typecheck:frontend`: passed.
- `npm run build`: passed after correcting the EMS critical checklist import.

Build warnings remain for existing manual chunk circularity and an `offlineService.js` dynamic/static import overlap; neither appears introduced by this pass.
