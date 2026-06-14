# Pilot Customer Mode Report

## Scope

Pilot Customer Mode configures the active CareDroid Emergency OS app for a first pilot site with approximately 100 patients per day, 5-10 staff, high pressure, and limited training time. The implementation stays inside the existing Vite React SPA, `src/App.jsx`, `src/components/AppShell.tsx`, existing navigation/config projections, and the current Nest `/api/emergency/*` backend contract.

No new app architecture, shell, router, duplicate layout, module, feature, or API convention was introduced.

## Pilot-Visible Surface

Pilot-facing navigation, command palette route commands, quick/search destinations, and default module settings expose only:

1. Whiteboard: `/emergency/whiteboard`
2. Patients: `/emergency/patients`
3. EMS: `/emergency/ems`
4. Intake: `/emergency/intake`
5. Queues: `/emergency/queues`
6. Reassessment: `/emergency/reassessment`
7. Capacity: `/emergency/capacity`
8. Boarding: `/emergency/boarding`
9. Referrals: `/emergency/referrals`
10. Copilot: `/emergency/copilot`

The pilot surface is defined by `PILOT_CUSTOMER_MODE` and `PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS` in `src/config/unified-navigation.config.ts`. Existing shell and compatibility consumers derive from that configuration instead of duplicating route lists.

## Hidden Surface

Hidden from pilot-facing nav/search/command/module settings:

- Analytics: `/emergency/analytics`
- Settings: `/emergency/settings`
- Header advanced controls: central-control pill, staff workload control, and top-level discharge shortcut
- Command palette advanced discharge command
- Retired, future, and experimental Emergency OS routes that already redirect to the whiteboard, including simulation, tools, pulse, integrations, provincial health, AI governance, digital twin, and federated learning routes

Analytics and Settings remain mounted as direct routes for admin/test compatibility and to preserve the harmonized 12-route Emergency OS route tree. Backend endpoints were not removed.

## Rationale

The pilot mode optimizes for first-time ED users under pressure by reducing the visible surface to the operational workflows needed during a shift. The implementation uses configuration and existing projection layers instead of deleting uncertain modules or changing route ownership.

User-facing copy was simplified on active route wrappers for Patients, Queues, Reassessment, Boarding, and Capacity. The command palette now uses plain labels such as Intake and Copilot, and the header keeps only simple operational actions: Create, Reassess, Referral, patient lookup, command search, alerts, and Capacity.

## Validation

Passed:

- `npx vitest run src/config/unified-navigation.config.test.ts src/layout/AppShell.navigation.test.jsx src/navigation/primaryNavigation.test.js src/data/emergencyPageRenderInventory.test.js src/data/searchFirstDiscovery.test.js src/config/emergencyRolePermissions.test.js src/config/emergencySettings.config.test.js src/routing/canonicalRouteTree.behavior.test.jsx src/featureFlagCoverage.test.jsx src/components/Header.centralControl.test.tsx src/components/CommandPalette.test.tsx`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`

Build completed successfully. Vite still reports existing nonblocking warnings for manual chunk circularity and `offlineService.js` being both statically and dynamically imported.

## Manual QA

- Start the app and confirm the sidebar shows only the 10 pilot routes above.
- Open the command palette and search for Analytics, Settings, Discharge, Staff workload, Simulation, Tools, and AI Governance; these should not appear as pilot-facing commands.
- Use global/search-first discovery and confirm Analytics and Settings are absent from default Emergency OS destination results.
- Directly visit `/emergency/analytics` and `/emergency/settings`; they should still render for compatibility rather than becoming deleted routes.
- Confirm primary pilot workflows work from the header: Create, Reassess, Referral, patient lookup, command search, alerts, and Capacity.
