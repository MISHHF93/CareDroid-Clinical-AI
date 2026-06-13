# R9 Alert Consolidation Report

## Notification mechanisms found

- Toast libraries: neither `sonner` nor `react-hot-toast` was installed in `package.json` or `package-lock.json` before R9. Installed `sonner`.
- Custom toast components: `src/components/notifications/NotificationToast.jsx` and `NotificationToast.css`; the container was mounted in `src/App.jsx`.
- Notification context/actions: `src/contexts/NotificationContext.jsx`, `src/contexts/NotificationContext.js`, and `src/hooks/useNotificationActions.js`.
- Notification center/inbox surfaces: `src/pages/PlatformOSPages.jsx` Notification Center, `src/pages/CommandDashboard.jsx` signals panel, and `src/pages/ExecutiveCommandCenter.jsx` operational alert aggregation.
- Notification API/browser service: `src/services/NotificationService.js` and legacy `src/services/notifications/NotificationService.js`.
- Alert banners and inline alert surfaces: `src/components/ApiStateBanner.jsx`, `src/components/ToolApiErrorBanner.jsx`, `src/components/ApiConfigDegradedBanner.jsx`, `src/components/ui/Alert.jsx`, `src/components/clinical/ClinicalAlertBanner.jsx`, `src/components/clinical/AnomalyBanner.jsx`, `src/components/StateSourceNotice.jsx`, `src/components/EMSCriticalBroadcast.jsx`, and `src/components/CrisisMode.jsx`.
- Badge counters and visual indicators: `src/components/Header.tsx` alert/capacity counters, `src/components/Sidebar.tsx` reassessment badge, `src/components/EMSCriticalBroadcast.jsx` countdown badge, patient/workload/queue score badges, and notification unread counts.
- Store alert path: `src/store/emergencyStore.ts` `addAlert` implementation and active alert selectors.
- User-facing error reporting: `src/services/apiErrorHandling.js` through `reportApiError`.
- Console warnings reviewed: `src/services/realtime/RealTimeCostService.js`, `src/services/websocket/WebSocketManager.js`, `src/utils/sharedSessions.js`, `src/utils/logger.ts`, `src/layout/AppShell.jsx`, and test setup/build tests.

## Chosen toast library

`sonner` was chosen because neither allowed toast library was installed. R9 installed it with the repo's npm workflow:

- `package.json`: added `sonner`.
- `package-lock.json`: locked `sonner@2.0.7`.

## Files migrated or wrapped

- `src/engine/alertEngine.ts`: canonical `dispatchAlert` now creates the emergency-store alert, calls `useEmergencyStore.getState().addAlert`, emits `sonner` toasts by severity, and supports critical patient action routing through `selectPatient`.
- `engine/alertEngine.ts`: already a compatibility re-export of `src/engine/alertEngine`; left as the root wrapper.
- `src/components/AppShell.tsx`: mounted the only active `<Toaster />`.
- `src/App.jsx`: removed the legacy `NotificationToastContainer` mount.
- `src/contexts/NotificationContext.jsx`: converted to an alert-store facade; legacy `addNotification` now dispatches through `dispatchAlert`.
- `src/hooks/useNotificationActions.js`: success/error/warning/info/update/announcement helpers now dispatch only through `dispatchAlert`.
- `src/services/NotificationService.js`: `sendBrowserNotification` now dispatches through `dispatchAlert` instead of constructing `new Notification`.
- `src/services/apiErrorHandling.js`: imports the canonical `src/engine/alertEngine` path.
- `src/components/notifications/NotificationToast.jsx`: retained as an unmounted compatibility wrapper; legacy `addToast` dispatches through `dispatchAlert`.
- `src/components/CrisisMode.jsx`: crisis notifications now import and call canonical `dispatchAlert` instead of selecting a store-level alert dispatcher.
- `src/engine/alertEngine.test.ts`: added focused unit coverage for store insertion, severity toast routing, and critical patient action.

No files were deleted for R9. `caredroid.sqlite` was not touched.

## Toaster placement

The single visible toaster is in `src/components/AppShell.tsx`:

- `<Toaster richColors closeButton position="top-right" />`

`src/App.jsx` no longer mounts `NotificationToastContainer`.

## Residual direct notification calls

- `src/engine/alertEngine.ts`: canonical `toast.error`, `toast.warning`, and default `toast` calls remain intentionally.
- `src/engine/alertEngine.test.ts`: direct `toast.*` references are mock assertions.
- `src/store/emergencyStore.ts`: `addAlert` type and implementation remain as the canonical store API used by `alertEngine`; external user-facing calls were not left.
- `src/components/notifications/NotificationToast.jsx`: `NotificationToastContainer`/`useToasts` names remain only as compatibility exports; they dispatch through `alertEngine` and are not mounted.
- `src/components/notifications/NotificationToast.css`: legacy CSS class names remain for compatibility/design-language tests; they are not an active dispatch mechanism.
- `src/services/NotificationService.js`: `Notification.permission` and `Notification.requestPermission` remain for browser permission setup. No `new Notification` call remains.
- Console warnings remain only for developer diagnostics/test harness logging, not user-facing notification behavior.
- Visual badges/counters were retained because they are presentation of existing state, not notification dispatch APIs.

No `showNotification(` or `setBanner(` calls were found in the searched frontend/root alert paths.

## Verification

- `git status --short`: inspected before and after. Repo had extensive unrelated R1-R8/untracked changes; R9 changes were kept scoped and no commit/push was performed.
- Residual search: `toast\.|toast\(|showNotification\(|addAlert\(|setBanner\(|ToastProvider|Toaster` in `src`, `engine`, and `store`.
- Residual search: `NotificationToastContainer|useToasts\(|new Notification|Notification\.permission|Notification\.requestPermission|sendBrowserNotification\(|addNotification\(|console\.warn` in `src`.
- Focused tests: `npx vitest run src/engine/alertEngine.test.ts src/store/emergency-store.test.ts` passed, 2 files / 4 tests.
- Frontend typecheck: `npm run typecheck:frontend` passed.
- Lints: `ReadLints` on edited files reported no linter errors.

## Remaining risks

- Some legacy/non-active pages still render inline alert or notification-center UI as presentation. Dispatch paths now route through `alertEngine`, but UI consolidation beyond R9's alert dispatch scope was not performed.
- Legacy notification API clients and inbox screens still support backend notification history/preferences; those are data APIs rather than in-app alert dispatchers.
- The working tree contains many unrelated pre-existing R1-R8 changes and untracked files, so R9 verification was focused on alert consolidation rather than whole-repo cleanup.
