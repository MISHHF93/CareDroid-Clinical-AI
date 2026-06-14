# CareDroid Emergency OS Notification Center Inventory

Generated during Notification Center realignment.

## Active Notification Center

| Artifact | Classification | Notes |
| --- | --- | --- |
| `src/components/Header.tsx` | ACTIVE_AND_WIRED | Existing AppShell header notification bell and panel. Chosen as the single active Emergency OS Notification Center. |
| `src/components/Header.css` | ACTIVE_AND_WIRED | Header responsive styles now own bell sizing, badge placement, panel sizing, scroll, z-index, and touch behavior. |
| `src/components/AppShell.tsx` | ACTIVE_AND_WIRED | Existing mounted shell. It mounts `Header` and starts reassessment/capacity engines, central node realtime, Emergency OS drawers, Copilot, and Sonner. |
| `src/App.jsx` `NotificationProvider` | ACTIVE_AND_WIRED | Runtime provider wrapper. It projects app notifications into the canonical alert engine/store. |
| `src/contexts/NotificationContext.jsx` | ACTIVE_AND_WIRED | Compatibility context that writes notifications to `dispatchAlert` rather than a separate queue. |
| `src/services/NotificationService.js` | ACTIVE_AND_WIRED | Active app-facing notification API/browser/SSE facade. Browser notifications and stream events dispatch into canonical alerts. |
| `src/engine/alertEngine.ts` | ACTIVE_AND_WIRED | Canonical alert dispatcher and Sonner toast bridge. |
| `src/store/emergencyStore.ts` | ACTIVE_AND_WIRED | Canonical Emergency OS alert store and module-derived alert extraction. Now tracks read, acknowledged, and dismissed state. |
| `src/hooks/useCareDroidCentralNode.ts` | ACTIVE_AND_WIRED | Builds central snapshot and starts Emergency OS realtime/polling into store alerts. |
| `src/central-node/careDroidCentralNode.ts` | ACTIVE_AND_WIRED | Central node snapshot exposes active operational alerts and screen mode context. |

## Active But Misaligned Before Fix

| Artifact | Classification | Notes |
| --- | --- | --- |
| Previous `Header` alert drawer | ACTIVE_BUT_MISALIGNED | Was mounted and data-backed, but used hardcoded small dropdown sizing, limited metadata, no read/acknowledge/dismiss controls, and weak responsive behavior. Realigned in place. |
| Header notification bell/badge | ACTIVE_BUT_MISALIGNED | Badge was hardcoded inline with small offsets and no mobile adjustment. Replaced with tokenized classes. |
| Header alert actions | ACTIVE_BUT_MISALIGNED | Prior click selected patients or routed module alerts, but did not expose intentional disabled states or read/acknowledge/dismiss actions. |

## Compatibility And Legacy Artifacts

| Artifact | Classification | Notes |
| --- | --- | --- |
| `src/contexts/NotificationContext.js` | LEGACY | Re-export shim to `NotificationContext.jsx`; safe to keep for import compatibility. |
| `src/components/notifications/NotificationToast.jsx` | LEGACY | Toast compatibility container dispatches to canonical alerts and renders no independent UI. |
| `src/components/notifications/NotificationToast.css` | LEGACY | Retained style artifact for the compatibility toast module. |
| `src/services/notifications/NotificationService.js` | LEGACY | Queue-style service explicitly marked non-active; retained for tests/cost/recommendation queues. |
| `src/layout/AppShell.jsx` alert drawer | LEGACY | Large legacy shell not mounted by active `src/App.jsx`; has its own alert drawer and must remain manual-review until legacy audits/tests are retired. |

## Related Surfaces

| Artifact | Classification | Notes |
| --- | --- | --- |
| `src/pages/PlatformOSPages.jsx` `NotificationCenterPage` | DISCONNECTED | Platform route mixes fixture `PLATFORM_NOTIFICATIONS` with context notifications. It is not the Emergency OS header Notification Center chosen here. |
| `src/pages/ClinicalAlertsPage.jsx` | FUTURE_MODULE | Clinical alerts API page uses demo/backend clinical alert endpoints; related but separate from Emergency OS operational notifications. |
| `backend/src/modules/notifications/*` | FUTURE_MODULE | Backend push/preference/history API exists. The active Emergency OS header uses store/central alert data, with backend notification service available for preferences/history/stream. |
| `backend/src/modules/clinical-alerts/*` | FUTURE_MODULE | Demo clinical alerts backend, not the active Emergency OS notification center. |
| `backend/src/modules/telemetry/alert.service.ts` | FUTURE_MODULE | Telemetry alert service, not mounted into Emergency OS notification center in this pass. |
| `src/components/clinical/ClinicalAlertBanner.jsx` | NEEDS_MANUAL_REVIEW | Clinical banner is separate from operational Notification Center; review before consolidation. |

## Duplicate Or Dead Artifacts

No active duplicate Notification Center was created. No artifacts were removed in this pass because the working tree is dirty and several legacy/review artifacts are still referenced by tests and audits. The only active Notification Center after this pass is the existing `Header` notification bell/panel mounted by `src/components/AppShell.tsx`.
