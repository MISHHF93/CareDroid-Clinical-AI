# AppShell Rendering Audit

Date: 2026-06-13

## Active Spine

- Frontend runtime: Vite React SPA.
- Router owner: `src/App.jsx`.
- Shell owner: `src/components/AppShell.tsx`.
- Backend spine: Nest `/api/emergency/*` with local Emergency OS store fallback.

## AppShell Ownership

`AppShell` remains the only active application shell for Emergency OS routes. It owns:

- `Sidebar` through `src/components/Sidebar.tsx`.
- `Header` through `src/components/Header.tsx`.
- Main route outlet via `AppShell` children from `src/App.jsx`.
- Notification and alert area through `Header`, `EMSCriticalBroadcast`, and `sonner` toaster.
- Search and command palette launch through the header search button and `/` shortcut.
- User and role controls through the header role/workload control.
- Main outlet error boundary and loading boundary.
- Patient detail, Copilot, reassessment drawer, EMS broadcast, and command palette overlays.

No new AppShell, router, or duplicate layout was introduced.

## Rendering Fixes

- Added AppShell-owned visible route context and page subtitle passed into the existing header.
- Wrapped the main outlet in the existing `ErrorBoundary` plus a `Suspense` loading fallback.
- Preserved all active route children under the existing `RootLayout` in `src/App.jsx`.
- Kept page components as content surfaces only; no page was promoted to a second shell.

## Route Rendering Result

All active target routes are registered in `src/App.jsx` and render inside `AppShell`:

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

## Remaining Manual Review

- Visual QA should verify the compact header title at tablet widths against real hospital display sizes.
- Full browser interaction QA should confirm overlay stacking with Copilot, patient detail, command palette, and reassessment drawer open in combination.
