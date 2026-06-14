# Emergency OS Sidebar Coverage and Icon Report

Date: 2026-06-13

## Summary

The active Emergency OS spine remains the Vite React SPA in `src/App.jsx` with the existing `AppShell` and `Sidebar`. No router, layout, or duplicate shell was added.

Pilot Customer Mode intentionally exposes 10 persistent sidebar destinations: Whiteboard, Patients, EMS, Intake, Queues, Reassessment, Capacity, Boarding, Referrals, and Copilot. Analytics and Settings remain mounted direct/admin routes and are intentionally hidden from pilot-facing persistent navigation.

## Page Coverage Matrix

| Route | Source page/component | Sidebar status | Command/search status | Notes |
| --- | --- | --- | --- | --- |
| `/emergency/whiteboard` | `EmergencyWhiteboard` | Visible as `Whiteboard` | Command/search visible | Default `/` and `/emergency` redirect target; active paths include `/emergency`. |
| `/emergency/patients` | `PatientsRoute` | Visible as `Patients` | Command/search visible | Patient search remains route query based. |
| `/emergency/ems` | `EMSPipeline` | Visible as `EMS` | Command/search visible | Feature-gated by `ems_pipeline`. |
| `/emergency/intake` | `SmartIntake` | Visible as `Intake` | Command/search visible | Patient creation path remains route-backed. |
| `/emergency/queues` | `QueueRoute` | Visible as `Queues` | Command/search visible | Canonical operations queue surface. |
| `/emergency/reassessment` | `ReassessmentRoute` | Visible as `Reassess` | Command/search visible | Drawer remains a shell overlay; route is persistent nav. |
| `/emergency/capacity` | `CapacityRoute` | Visible as `Capacity` | Command/search visible | Feature-gated by `capacity_intel`. |
| `/emergency/boarding` | `BoardingRoute` | Visible as `Boarding` | Command/search visible | Canonical boarder pressure route. |
| `/emergency/referrals` | `ReferralPanel` | Visible as `Referrals` | Command/search visible | Feature-gated by `referral_intel`. |
| `/emergency/copilot` | `CopilotRoute` | Visible as `Copilot` | Command/search visible | Mobile Copilot button continues to toggle the docked panel. |
| `/emergency/analytics` | `EmergencyAnalytics` | Hidden intentionally | Hidden from pilot commands/search | Retained direct/admin route by `PILOT_CUSTOMER_MODE.retainedDirectRoutes`. |
| `/emergency/settings` | `EmergencySettings` | Hidden intentionally | Hidden from pilot commands/search | Retained direct/admin route by `PILOT_CUSTOMER_MODE.retainedDirectRoutes`; `/settings` alias still resolves through route redirects. |

## Hidden Route Rationale

Analytics and Settings are active page routes in `CANONICAL_APP_ROUTE_TREE` and `AppRoutes`, but Pilot Customer Mode lists them in `hiddenNavItemIds` while retaining them as direct routes. This matches the prior harmonization constraint: pilot users get the operational sidebar only, while admin/test surfaces stay reachable by direct URL and route guards.

Legacy Emergency OS routes such as `/emergency/pulse`, `/emergency/journey`, `/emergency/tools`, `/emergency/shift`, `/workspace/emergency/*`, and root aliases continue to redirect to canonical active pages. They are not persistent sidebar destinations.

## Icon Mapping

| Sidebar item | Icon key | Tabler symbol |
| --- | --- | --- |
| Whiteboard | `layout-dashboard` | `IconLayoutDashboard` |
| Patients | `emergency-patients` | `IconUsers` |
| EMS | `ambulance` | `IconAmbulance` |
| Intake | `intake` | `IconClipboardPlus` |
| Queues | `queues` | `IconListDetails` |
| Reassess | `reassessment` | `IconRefresh` |
| Capacity | `capacity` | `IconGauge` |
| Boarding | `boarding` | `IconBed` |
| Referrals | `referrals` | `IconArrowsExchange` |
| Copilot | `ed-copilot` | `IconRobot` |

The pilot-facing icon keys are now unique, and the sidebar links expose `title`, `data-nav-id`, and `data-icon-key` for clearer labels and focused coverage assertions.

## Changed Files

- `src/config/unified-navigation.config.ts`
- `src/components/Sidebar.tsx`
- `src/components/Sidebar.test.tsx`
- `src/config/unified-navigation.config.test.ts`
- `src/layout/AppShell.navigation.test.jsx`
- `docs/architecture/sidebar-coverage-icon-report.md`

## Validation

- Passed: `npm run test:run -- src/components/Sidebar.test.tsx src/config/unified-navigation.config.test.ts src/layout/AppShell.navigation.test.jsx src/navigation/primaryNavigation.test.js src/data/emergencyPageRenderInventory.test.js`
- Passed: `npm run typecheck:frontend`
- Passed: `npx eslint src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/config/unified-navigation.config.ts src/config/unified-navigation.config.test.ts src/layout/AppShell.navigation.test.jsx`
- Passed: IDE diagnostics for edited files reported no linter errors.

## Remaining Manual QA

- Visually scan the desktop rail at normal and tablet widths to confirm the new icons are distinguishable at 20px.
- On mobile, confirm the Copilot button uses the robot symbol and the More sheet preserves labels, active state, and close behavior.
- Directly visit `/emergency/analytics` and `/emergency/settings` with an admin-capable role to confirm they remain reachable while hidden from pilot persistent nav.
