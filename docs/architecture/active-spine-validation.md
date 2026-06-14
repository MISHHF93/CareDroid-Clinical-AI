# Active Spine Validation

Date: 2026-06-13

## Confirmed Spine

The active product spine is:

`src/main.jsx` -> `src/App.jsx` -> `BrowserRouter` -> `RootLayout` -> `src/components/AppShell.tsx` -> `Outlet` -> active Emergency OS route page.

## Shell Ownership

The active shell is:

- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Header.tsx`

Legacy shell material under `src/layout/` remains review-only. It was not moved in this pass because it still has historical tests/references and broad cleanup would be risky in the dirty working tree.

## Runtime Checklist Spine

The EMS critical checklist runtime now uses `src/config/criticalChecklists.ts` consistently:

- `src/components/EMSCriticalBroadcast.jsx` imports `CRITICAL_CHECKLISTS` from `src/config`.
- `src/store/emergencyStore.ts` imports `resolveCriticalChecklistConfig` from `src/config`.

This keeps EMS checklist rendering and store preparation logic on the same runtime source.

## Page State Coverage

Active routes render nonblank surfaces through one or more of:

- `Suspense` route loading fallback in `src/App.jsx`.
- `ApiStateBanner` loading/error/empty states in `src/App.jsx`.
- Page-local status/error/empty states in `SmartIntake`, `EMSPipeline`, `ReferralPanel`, `EmergencyAnalytics`, and `EmergencySettings`.
- `ErrorBoundary` wrapping `PatientDetailPanel` and `CopilotPanel` in `AppShell`.

Focused route behavior tests cover the active route tree and retired-route redirects.
