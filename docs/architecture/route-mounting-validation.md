# Route Mounting Validation

Date: 2026-06-13

## Validation Scope

Confirmed active spine only:

- `src/App.jsx`
- `src/components/AppShell.tsx`
- Vite React SPA
- Nest `/api/emergency/*`

## Route Matrix

| Route | `App.jsx` registration | AppShell outlet | Component | Search | Command palette | Sidebar/header |
| --- | --- | --- | --- | --- | --- | --- |
| `/emergency/whiteboard` | Yes | Yes | `EmergencyWhiteboard` via `src/components/EmergencyWhiteboard.jsx` re-export | Yes | Yes | Yes |
| `/emergency/patients` | Yes | Yes | `PatientsRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/ems` | Yes | Yes | `EMSPipeline` | Yes | Yes | Yes |
| `/emergency/intake` | Yes | Yes | `SmartIntake` | Yes | Yes | Yes |
| `/emergency/queues` | Yes | Yes | `QueueRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/reassessment` | Yes | Yes | `ReassessmentRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/capacity` | Yes | Yes | `CapacityRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/boarding` | Yes | Yes | `BoardingRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/referrals` | Yes | Yes | `ReferralPanel` | Yes | Yes | Yes |
| `/emergency/copilot` | Yes | Yes | `CopilotRoute` in `src/App.jsx` | Yes | Yes | Yes |
| `/emergency/analytics` | Yes | Yes | `EmergencyAnalytics` | Yes | Yes | Yes |
| `/emergency/settings` | Yes | Yes | `EmergencySettings` | Yes | Yes | Yes |

## Fixes Applied

- Kept all route registrations in `src/App.jsx`; no new router was created.
- Kept all active route rendering inside `RootLayout` and `AppShell`.
- Completed command palette route coverage from `EMERGENCY_OS_ROUTE_COMMANDS`.
- Added AppShell-derived header title/subtitle updates for active pages.
- Added AppShell main outlet loading and error boundaries.

## Redirects

Legacy Emergency OS aliases and retired workspace paths continue to redirect to canonical Emergency OS routes through `src/config/routes.config.js` and `src/App.jsx`.

## Remaining Manual Review

- Browser smoke should verify each route URL loads directly after a hard refresh in the deployed Vite configuration.
