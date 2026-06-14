# Professor Mode Source Investigation

Date: 2026-06-14

## Scope

This pass investigated the current CareDroid Emergency OS source before making changes. The goal was to preserve one active product spine and apply only safe, high-value harmonization work already supported by existing artifacts.

## Git State At Investigation

`git status --porcelain=v1` returned no entries at the start of this pass from `C:\Users\borah\CareDroid-Clinical-AI`. The repository now has this pass's new command-palette and documentation changes.

## Reports Reviewed

- `docs/architecture/deep-upgrade-inventory.md`
- `docs/architecture/disconnected-artifacts-after-upgrade.md`
- `docs/architecture/system-upgrade-validation.md`
- `docs/architecture/wiring-upgrade-report.md`
- `docs/architecture/backend-frontend-wiring-validation.md`
- `docs/architecture/active-spine-validation.md`

The recent reports showed that prior deep-upgrade work already wired central node snapshots, patient journey visibility, store startup hydration, settings runtime connector status, EMS/referral vitals normalization, and analytics fallback shape.

## Active Source Read

- App entry and shell: `src/main.jsx`, `src/App.jsx`, `src/components/AppShell.tsx`
- Route and navigation registries: `src/config/routes.config.js`, `src/config/unified-navigation.config.ts`
- Command palette registry/runtime: `src/config/commandPalette.config.js`, `src/components/CommandPalette.tsx`
- Role permissions: `src/config/emergencyRolePermissions.js`, `src/hooks/useEmergencyRolePermissions.js`
- Frontend API and hooks: `src/services/emergencyOsApi.js`, `src/hooks/useEmergencyOs.js`, `src/store/emergencyStore.ts`
- Active whiteboard route: `src/pages/emergency/index.tsx`
- Backend controller: `backend/src/modules/emergency-os/emergency-os.controller.ts`

## Source State Discovered

- The active spine is still `src/main.jsx` -> `src/App.jsx` -> `src/components/AppShell.tsx` -> existing `/emergency/*` routes.
- The active shell is `src/components/AppShell.tsx`; legacy shell material remains review/compatibility material and was not moved.
- The mounted route system uses `CANONICAL_ROUTES`, `CANONICAL_APP_ROUTE_TREE`, route guards, and redirect aliases rather than a second router.
- `src/config/unified-navigation.config.ts` remains the visible navigation registry, with Pilot Customer Mode hiding analytics/settings from sidebar navigation while retaining direct routes.
- `src/config/commandPalette.config.js` is the active route-command registry for the mounted palette.
- `src/services/emergencyOsApi.js` is the canonical `/api/emergency/*` facade for active frontend consumers.
- `backend/src/modules/emergency-os/emergency-os.controller.ts` mounts active endpoints for whiteboard, patients, journey, EMS, intake, queues, reassessment, capacity, boarding, referrals, copilot, analytics, settings, workflow logs, integrations, provincial health, central node, and review-scoped advanced harnesses.
- No P0 build, render, route, or backend endpoint blocker was found during source reading.

## P1 Opportunity Selected

The highest-value safe P1 found in active mounted code was command-palette role/action harmonization. The palette already used the canonical command registry and searched active patients, but command visibility and execution did not consult the same Emergency OS role permission hook used by the shell, header, and whiteboard. This could expose actions like central intake, Copilot, referral creation, or discharge controls in roles that should not see them.

No artifacts were archived in this investigation pass.
