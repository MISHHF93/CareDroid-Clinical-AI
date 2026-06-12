# Emergency OS Page And Layout Map

Generated as part of the page registration/layout consistency pass.

## Active Layout Stack

1. `src/App.jsx` mounts app providers and owns the React Router table.
2. Authenticated routes are wrapped by `AppShellPage`.
3. `src/layout/AppShell.jsx` owns the single global Emergency OS chrome:
   - left icon rail from `APP_SHELL_NAV_ITEMS`
   - top shift/capacity/reassessment header
   - alert drawers/toasts
   - persistent right Copilot panel
   - route workspace slot
4. Route pages render inside the AppShell workspace. They should not add a second app sidebar or duplicate global header.

## Active Primary Routes

| Level | Path | Route Element | Layout Notes |
| --- | --- | --- | --- |
| Root redirect | `/` | `Navigate('/emergency/whiteboard')` | Public landing redirects to Emergency OS. |
| Emergency root redirect | `/emergency` | `Navigate('/emergency/whiteboard')` | Canonical root is explicit. |
| Primary page | `/emergency/whiteboard` | `EmergencyWhiteboard` | Main operational board. |
| Primary page | `/emergency/patients` | `EmergencyWhiteboard` | Patient list uses the same board/detail layout. |
| Primary page | `/emergency/ems` | `EMSPipeline` behind `ems_pipeline` | EMS route page, no nested app shell. |
| Primary page | `/emergency/intake` | `SmartIntake` | Smart intake page. |
| Primary page | `/emergency/queues` | `EmergencyQueueRoute` | Route panel wrapper with `QueueIntelligencePanel`. |
| Primary page | `/emergency/reassessment` | `EmergencyWhiteboard` | Reassessment stays in the board/drawer workflow. |
| Primary page | `/emergency/referrals` | `ReferralPanel` behind `referral_intelligence` | Referral route panel. |
| Primary page | `/emergency/capacity` | `EmergencyCapacityRoute` behind `capacity_intelligence` | Capacity route panel. |
| Primary page | `/emergency/boarding` | `EmergencyCapacityRoute` behind `capacity_intelligence` | Boarding uses the capacity route panel. |
| Primary page | `/emergency/copilot` | `EmergencyCopilotRedirect` | Opens right Copilot panel and returns to whiteboard. |
| Primary page | `/emergency/analytics` | `EmergencyAnalytics` | Analytics page. |
| Primary page | `/emergency/settings` | `SettingsRoute` | Settings route panel. |

## Alias And Legacy Routing

Short aliases such as `/ems`, `/queues`, `/reassessment`, `/capacity`, `/patients`, `/copilot`, `/settings`, `/boarding`, `/referrals`, and `/analytics` redirect to the canonical `/emergency/...` routes.

Legacy workspace paths under `/workspace/emergency/*` route through `WorkspaceRouteRedirect` and return to the canonical Emergency OS route surface.

`FUTURE_RELEASE_ROUTES` in `src/App.jsx` redirects broad platform/commercial/tool/profile paths back to `/emergency/whiteboard`. These pages may still exist in `src/pages/**`, but they are not active route pages.

## Exposure Contract

`src/config/navigation.config.js` now keeps quick command destinations scoped to Emergency OS routes only.

`src/data/searchFirstDiscovery.js` now defaults to active Emergency OS destinations only. Broader platform/workflow/commercial discovery is still available only when callers pass `includePlatformCatalog: true`, which keeps audit/catalog tests possible without exposing subsidiary pages in the active UX.

## Remaining Page Inventory Risk

The repository still contains many legacy/future page files in `src/pages/**`. They are retained for now because tests and inventory reports still reference them, but active app navigation should treat them as non-primary until they are either deleted or moved behind a separate product surface.
