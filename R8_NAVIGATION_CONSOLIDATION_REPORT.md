# R8 Navigation Consolidation Report

## Duplicate nav components inspected
- `src/components/Sidebar.tsx`: survivor from E9; now consumes the canonical `NAV_ITEMS` projection from `src/config/unified-navigation.config.ts`.
- `src/layout/AppShell.jsx`: legacy `ed-nav-rail` route list converted to render `Sidebar`; rail-specific state, long-press menu, and inline link rendering removed.
- `src/config/unified-navigation.config.ts`: canonical navigation source for the active sidebar.
- `src/config/navigation.config.js`: kept as a compatibility projection from `unified-navigation.config.ts`; no independent persistent sidebar list remains.
- `src/navigation/primaryNavigation.js`: kept as a compatibility re-export because it is imported by tests/data modules.
- `frontend/src/config/unified-navigation.config.ts`: deleted; alternate inactive navigation source with no active imports.
- `src/components/ui/Drawer.jsx`: generic `DrawerMobileNav` export renamed to `DrawerMenuPanel` to remove stale `MobileNav` naming.
- `src/components/Header.tsx` and `src/components/CommandPalette.jsx`: inspected as Search 7 navigation surfaces, but kept because they are shell controls/search, not duplicate sidebars.

## ED nav items extracted and ignored
- Kept in canonical sidebar: Emergency Whiteboard (`/emergency`), EMS Pipeline (`/emergency/ems`), Referrals (`/emergency/referrals`), Capacity (`/emergency/capacity`), Clinical Tools (`/emergency/tools`), Shift Summary (`/emergency/shift`), Settings (`/settings`).
- Ignored/dead for persistent sidebar: Patients, Patient Journey, Smart Intake, Queues, Reassessment, Boarding, Provincial Health, Integration Hub, ED Copilot, Analytics, Simulation, Federated Learning, Digital Twin, AI Governance, profile/account utilities, operations/fleet/platform/admin/solution links.

## Canonical NAV_ITEMS confirmation
`src/config/unified-navigation.config.ts` exports exactly:
- `whiteboard`, `Emergency Whiteboard`, `layout-dashboard`, `/emergency`, `featureGate: null`
- `ems`, `EMS Pipeline`, `ambulance`, `/emergency/ems`, `featureGate: 'ems_pipeline'`
- `referrals`, `Referrals`, `send`, `/emergency/referrals`, `featureGate: 'referral_intel'`
- `capacity`, `Capacity`, `chart-bar`, `/emergency/capacity`, `featureGate: 'capacity_intel'`
- `tools`, `Clinical Tools`, `stethoscope`, `/emergency/tools`, `featureGate: 'clinical_tools'`
- `shift`, `Shift Summary`, `report-analytics`, `/emergency/shift`, `featureGate: null`
- `settings`, `Settings`, `settings`, `/settings`, `featureGate: null`

## Feature gate behavior
- `Sidebar.tsx` wraps gated items with the existing `FeatureGate` component.
- Requested public gate IDs are preserved in `NAV_ITEMS`.
- Alias resolution maps `referral_intel` to `referral_intelligence`, `capacity_intel` to `capacity_intelligence`, and `clinical_tools` to `clinical_calculator_hub`.
- Disabled gated items render as `null`, so they are hidden rather than shown disabled.

## Mobile behavior
- `Sidebar.css` now uses `@media (max-width: 768px)` to transform the canonical sidebar into a fixed bottom tab bar.
- The bottom tab bar hides items from the sixth visible link onward using CSS only, leaving the top five by importance visible.
- No separate mobile navigation component remains under the requested residual search.

## Files deleted or wrapped
- Deleted: `frontend/src/config/unified-navigation.config.ts`.
- Wrapped/replaced: `src/layout/AppShell.jsx` now renders `Sidebar` instead of its own rail.
- Compatibility projections retained: `src/config/navigation.config.js`, `src/navigation/primaryNavigation.js`.
- Renamed generic drawer helper: `DrawerMobileNav` to `DrawerMenuPanel`.

## Verification commands and results
- PASS: residual nav duplicate search, `WorkspaceSidebar|AppNav|DashSidebar|MobileNav` under `src`, returned no matches.
- PASS: `npx tsc --noEmit`.
- PASS: focused nav tests, `npx vitest run src/config/unified-navigation.config.test.ts src/components/Sidebar.test.tsx src/layout/AppShell.navigation.test.jsx src/navigation/primaryNavigation.test.js src/config/emergencyRolePermissions.test.js src/data/emergencyPageRenderInventory.test.js src/layout/AppShell.layout.test.js src/layout/ProfileSettingsShell.test.jsx src/test/mobileScrolling.contract.test.js src/styles/designLanguageFit.test.js src/styles/compactUxFlattening.test.js src/featureFlagCoverage.test.jsx src/navigation/iconRegistry.test.js` passed 13 files / 105 tests.
- PASS: `ReadLints` on edited nav/sidebar/config/direct test files found no linter errors.

## Remaining risks
- `src/config/navigation.config.js` still exports legacy catalog arrays for non-sidebar consumers, but persistent sidebar exports now derive from the canonical seven-item config.
- Some broad non-focused tests may still encode pre-R8 assumptions about legacy searchable catalog behavior; focused R8 nav/sidebar tests were updated.
