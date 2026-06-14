# Route Config Pruning Report

Date: 2026-06-13

## Canonical Registry

Route ownership is centralized in `src/config/routes.config.js`.

`CANONICAL_APP_ROUTE_TREE` contains only:

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

`EMERGENCY_OS_TARGET_ROUTES` is derived from the active page entries in that route tree.

## Redirect Policy

The following resolve back to `/emergency/whiteboard`:

- `/`, `/emergency`, `/dashboard`, `/home`, `/workspace`, `/app`
- mobile, Android, general healthcare, tools, calculator, score aliases
- retired Emergency OS pages: pulse, command-center, provincial-health, integrations, simulation, tools, shift
- unknown routes

Patient journey aliases resolve to `/emergency/patients` so journey context is preserved inside the patient surface rather than as a separate route.

## Registry Alignment

The 12-route contract is reflected in:

- `src/config/unified-navigation.config.ts`
- `src/config/commandPalette.config.js`
- `src/components/CommandPalette.tsx`
- `src/data/searchFirstDiscovery.js`
- `src/data/emergencyPageRenderInventory.js`
- `src/config/emergencyRolePermissions.js`
- `src/config/emergencySettings.config.js`

## Legacy References

Retired route constants remain in `CANONICAL_ROUTES` only for redirect compatibility and tests that assert retired paths are no longer active. Legacy workspace/future-module references remain documented for manual review.
