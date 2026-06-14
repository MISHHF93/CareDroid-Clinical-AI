# Emergency OS Cognitive Load Reduction Report

Date: 2026-06-13

## Scope

This pass inspected and reduced visible redundancy in the active Emergency OS app only:

- Vite React SPA mounted through `src/App.jsx`
- Active AppShell in `src/components/AppShell.tsx`
- Active Emergency OS navigation, command palette, and search registries
- Active pages: Whiteboard, Patients, EMS, Intake, Queues, Reassessment, Capacity, Boarding, Referrals, Copilot, Analytics, and Settings
- Existing Nest `/api/emergency/*` contracts as consumed by current hooks/services

No new AppShell, router, API convention, feature module, or backend endpoint was introduced. The 12-route harmonized route tree and Whiteboard-first mission-control behavior remain intact.

## Reduction Principles

- Keep situational awareness visible on the Whiteboard and header.
- Keep patient flow and operational actions reachable within two clicks.
- Prefer copy, grouping, and small removals over component rewrites.
- Remove duplicated route-only controls when sidebar, command palette, and search already expose the same destination.
- Do not delete uncertain legacy files in a dirty tree; document them for manual review instead.

## Before / After Redundancy Matrix

| Area | Before | After | Safety note |
| --- | --- | --- | --- |
| Header primary actions | Header repeated sidebar/search destinations for EMS and Queues while also showing true actions like Create, Reassess, Referral, and Discharge. | Removed route-only EMS and Queues header buttons. Sidebar, command palette, search, and Whiteboard contextual cards still reach those pages. | No workflow action was removed; only duplicate navigation buttons were suppressed. |
| Whiteboard mission-control actions | General mission-control block mixed direct actions with route-only review buttons: Patient Lookup, EMS Intake, Queue Review, Boarding Review, and Referral Board. | Kept action-oriented launchers: Central Intake, Identity Review, Reassessment Tasks, and New Referral. Contextual EMS and waiting-queue links remain near the relevant status cards. | Whiteboard remains the first mission-control surface; route-only destinations remain reachable through sidebar/search/palette. |
| Whiteboard KPI strip | Capacity Score duplicated the always-visible header capacity badge and the Capacity detail page. | Removed Capacity Score from the Whiteboard KPI strip while retaining Total, Waiting, High Risk, and Boarding. | Capacity remains prominent in the AppShell header and capacity crisis/status surfaces. |
| Smart Intake final actions | "Send New Patient Input" and "Send to Triage" both called the same create-patient path and added a triage-state patient. | Collapsed into one "Create and Send to Triage" action. Link Existing Patient and Continue as Unknown Patient remain separate. | The existing backend/local create flow is unchanged; the walkthrough test now targets the consolidated action. |
| Smart Intake steps | Separate final steps implied both create/link and send-to-triage decisions. | Final step is now "Finalize Intake." | Reduces decision duplication without changing verification or candidate matching. |
| Command palette | Route command list already included EMS, Queues, and Capacity, and the manual department command list added duplicate EMS Intake, Queue Review, and Capacity Status commands. | Removed duplicate manual navigation commands. | Route commands from `EMERGENCY_OS_ROUTE_COMMANDS` still expose EMS, Queues, and Capacity. |
| Search-first registry | Explicit Emergency OS destinations could be combined with general navigation entries for the same path. | Added path-level de-dupe for active Emergency OS search entries. | Explicit Emergency OS records remain the source of truth; a regression assertion covers default duplicate paths. |
| EMS detail header | Header repeated the incoming EMS count already shown in the Incoming section heading. | Removed the duplicate header count; kept average offload and EMS pressure. | Incoming count stays attached to the actionable list. |
| Referrals detail header | Header repeated Active referral count already shown in the metrics grid. | Removed the duplicate header count. | Active, Awaiting Response, Emergent, Accepted, Avg acknowledgement, and Transfers remain visible in the metrics grid. |
| Capacity detail metrics | Capacity detail repeated Total patients from the Patients page and Whiteboard. | Removed Total patients from Capacity metrics. | Capacity-specific room, blocked-room, boarder, and reassessment pressure indicators remain visible. |

## Preserved Visibility

- Whiteboard remains the default route and primary operational screen.
- Header still exposes capacity, patient lookup, command palette, alerts, reassessment badge, staff workload, and true global actions.
- Sidebar still exposes the 12 canonical Emergency OS routes.
- Command palette and search still expose active Emergency OS navigation.
- Dedicated pages remain useful for detail workflows rather than acting as duplicate dashboards.

## Manual Review Items

- Legacy/future-module files under review/archive paths were not deleted in this dirty tree.
- `src/features/future-modules/_review/*` still contains older dashboard and command launcher patterns; these are outside the active Emergency OS surface.
- Product/commercial search catalog entries can still reference Emergency capabilities when `includePlatformCatalog` is enabled; default Emergency OS search is now de-duped.
- Header density should still be checked on tablet/mobile with the patient lookup, alert badge, reassessment badge, and staff workload controls visible.
- Manual browser QA should verify that EMS, Queues, Boarding, and Referrals remain easy to reach from sidebar/search/palette after removing duplicate Whiteboard/Header route buttons.

## Validation

Passed:

- `npm exec vitest run src/components/CommandPalette.test.tsx src/data/searchFirstDiscovery.test.js src/test/pilotWalkthrough.test.jsx src/routing/canonicalRouteTree.behavior.test.jsx src/navigation/primaryNavigation.test.js src/routing/sectionLinkInventory.test.js src/components/QuickCommandLauncher.test.jsx`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- Edited-file diagnostics for changed source files and this report

Nonblocking build warnings:

- Existing Vite circular manual chunk warning: `vendor -> vendor-react -> vendor`.
- Existing mixed static/dynamic import warning for `src/services/offlineService.js`.
