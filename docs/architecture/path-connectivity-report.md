# Path Connectivity Report

Generated: 2026-06-12

## Scope
Audited active Emergency OS route, navigation, command, search, and legacy alias connectivity for the unified React Router + `AppShell` surface.

## Active Route Status

| File path | UI element name | Source page/component | Intended destination/action | Current status | Fix applied | Remaining issue |
|---|---|---|---|---|---|---|
| `src/App.jsx` | Emergency Whiteboard route | `AppRoutes` | `/emergency/whiteboard` inside `AppShell` | working | None | None |
| `src/App.jsx` | Patients route | `AppRoutes` | `/emergency/patients` inside `AppShell` | working | None | Shares `EmergencyWhiteboard` patient detail surface by design |
| `src/App.jsx` | EMS route | `AppRoutes` | `/emergency/ems` inside `AppShell` | working | None | Optional backend EMS/Mongoose routes remain environment-gated |
| `src/App.jsx` | Smart Intake route | `AppRoutes` | `/emergency/intake` inside `AppShell` | fixed | Final action buttons now have handlers | Backend Smart Intake API can still 404 when optional Mongoose runtime is disabled |
| `src/App.jsx` | Queues route | `EmergencyQueueRoute` | `/emergency/queues` inside `AppShell` | fixed | Queue panel collapse state is now local and clickable | None |
| `src/App.jsx` | Reassessment route | `AppRoutes` | `/emergency/reassessment` inside `AppShell` | working | None | Reuses whiteboard with reassessment drawer access by design |
| `src/App.jsx` | Capacity route | `AppRoutes` | `/emergency/capacity` inside `AppShell` | working | None | None |
| `src/App.jsx` | Boarding route | `AppRoutes` | `/emergency/boarding` inside `AppShell` | fixed | Feature guard changed from `capacity_intelligence` to `boarding_intelligence` | None |
| `src/App.jsx` | Referrals route | `AppRoutes` | `/emergency/referrals` inside `AppShell` | working | None | Missing-patient referral row remains manual review |
| `src/App.jsx` | ED Copilot route | `EmergencyCopilotRoute` | `/emergency/copilot` inside `AppShell` | working | Active chat-assisted support route remains mounted | None |
| `src/App.jsx` | Medical Tools route | `ToolsOverview` | `/emergency/tools` inside `AppShell` | working | Owns Medical Tools, operations/tool context, and calculator intent | None |
| `src/App.jsx` | Analytics route | `AppRoutes` | `/emergency/analytics` inside `AppShell` | working | None | None |
| `src/App.jsx` | Settings route | `SettingsRoute` | `/emergency/settings` inside `AppShell` | working | None | Hash tabs remain manual review |
| `src/App.jsx` | Legacy tools aliases | `ToolsRedirect` | Redirect to `/emergency/tools` | fixed | `/tools`, `/catalog`, `/calculators`, `/scores`, `/all-tools`, `/clinical-tools`, and workspace tools aliases now target Medical Tools with intent preserved | None |
| `src/config/navigation.config.js` | Medical Tools primary nav item | `APP_SHELL_NAV_ITEMS` | `/emergency/tools` | working | Navigation label and route match active Medical Tools ownership | Compatibility match still recognizes old `/tools/calculators` aliases |
| `src/config/commandPalette.config.js` | Emergency route commands | `EMERGENCY_OS_ROUTE_COMMANDS` | Mounted `/emergency/*` routes | working | None | None |
| `src/layout/AppShell.jsx` | AppShell route wrapper | `AppShellPage` | Protected pages render inside one `AppShell` | working | None | None |

## Summary
The normalized Emergency OS route tree is mounted in the shared `AppShell`. Calculator and clinical tool launches land on `/emergency/tools` with query and patient context; chat-assisted guidance lands on `/emergency/copilot`.
