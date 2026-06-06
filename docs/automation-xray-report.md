# Automation X-Ray Report

Generated: 2026-06-06

## Purpose

Scan CareDroid automation-adjacent systems for hidden, orphaned, duplicated, unsafe, or partially wired behavior. Classifications use the requested labels: **implemented**, **partially implemented**, **demo-only**, **hidden**, **orphaned**, **unsafe**, **duplicate**, and **production-ready**.

## Executive Summary

The highest-impact issues are not missing code paths; they are unclear runtime state and duplicate automation entry points:

1. **Legacy `/automation` builder implies save readiness without a live executor.** It is a demo-only rule composer and should be visibly labeled as a preview that does not execute or persist automation rules.
2. **Offline sync is always mounted through `OfflineProvider` while deferred startup separately initializes the same singleton behind `VITE_ENABLE_OFFLINE_MODE`.** This makes a background sync automation effectively hidden and active even when the feature flag is disabled.
3. **Two frontend notification services exist.** `src/services/NotificationService.js` is the production REST/browser-push client, while `src/services/notifications/NotificationService.js` is a queue-style cost/recommendation/emergency notifier used by `LiveCostDashboard` only for initialization. That duplicate path should not be active from UI code.
4. **Several backend automation hooks are intentionally partial.** `ScheduleModule` is enabled, notification scheduling stores pending rows but has no queue worker, and Redis/cache/Firebase initialize opportunistically at module startup.
5. **Backend observability had one unsafe async response path.** The metrics endpoint called the async Prometheus exporter without awaiting it.

## Classification Matrix

| System | Files | Classification | Evidence | Fix |
|---|---|---|---|---|
| Workflow Automation Builder | `src/pages/WorkflowAutomationBuilder.jsx`, `src/data/workflowAutomationBuilder.js` | partially implemented, demo-only, duplicate | `/automation` builds trigger-condition-action chains from local constants only; no save API or executor. `/workflows` is the canonical Platform OS workflow route. | Label as demo preview, remove "Ready to save" implication, link users to canonical `/workflows`. |
| Platform OS Workflows | `src/pages/PlatformOSPages.jsx`, `src/data/platformOperatingSystem.js` | implemented, demo-only | `/workflows` exposes saved workflow examples and launchable blocks from frontend data. Save/AI-generate buttons are UI-only. | Keep as canonical user-facing workflow surface; future work should wire save/generation to backend before marking live. |
| Offline Sync Automation | `src/contexts/OfflineProvider.jsx`, `src/services/syncService.js`, `src/utils/deferStartupTasks.js` | implemented, hidden, unsafe | `OfflineProvider` imports/registers service worker and initializes `syncService` regardless of `enableOfflineMode`; deferred startup initializes the same singleton when the flag is enabled. | Gate provider behavior on `FEATURE_FLAGS.enableOfflineMode`, show a disabled/demo state, and avoid duplicate singleton initialization. |
| Sync Service Interval | `src/services/syncService.js` | implemented, hidden | Singleton starts a 30s interval and online/offline listeners; cleanup only stops interval, not listeners. | Keep single owner in provider/deferred startup; no duplicate auto-start paths. |
| Notification REST/Push Client | `src/services/NotificationService.js`, `src/components/NotificationPreferences.jsx`, backend notification module | implemented, production-ready | Frontend calls backend notification history/preferences/devices routes and push token registration behind `enablePushNotifications`. | Keep canonical. |
| Queue-Style Notification Service | `src/services/notifications/NotificationService.js`, `src/components/LiveCostDashboard.jsx` | duplicate, partially implemented, unsafe | Maintains in-memory queue and calls disabled `/notifications/send/:channel`; production component initializes it but never uses it. | Remove active UI import/initialization so it is quarantined to tests until a real queue/send route exists. |
| Backend Notification Scheduling | `backend/src/modules/notifications/services/notification.service.ts` | partially implemented, orphaned | `scheduleNotification` only creates a pending row; comment says a future Bull/Agenda queue is needed. | Keep quarantined as non-delivering schedule API until a worker exists. |
| Backend Schedule Module | `backend/src/app.module.ts` | partially implemented, hidden | `ScheduleModule.forRoot()` is enabled, but no `@Cron`, `@Interval`, or `@Timeout` handlers were found. | Document as idle infrastructure; do not add scheduled work without visible owner/tests. |
| Metrics Endpoint | `backend/src/modules/metrics/metrics.controller.ts` | implemented, unsafe | `getMetricsAsString()` returns a Promise; sending it directly can break Prometheus scraping. | Await metrics text before setting the response body and cover with a focused controller test. |
| Anomaly Detection Compose Service | `docker-compose.yml`, `backend/ml-services/anomaly-detection/anomaly_detector.py` | partially implemented, orphaned, unsafe | Compose describes a service/Dockerfile/health endpoint, but the folder contains a one-shot script instead of an HTTP service. | Quarantine or convert into a real worker/service before treating it as live automation. |
| Backend Governance Gates | `backend/src/modules/chat/chat.service.ts`, `backend/src/modules/platform-governance` | implemented, partially implemented, unsafe | Governance/review metadata exists, but block decisions need consistent fail-closed enforcement across chat/tool/RAG/model calls. | Centralize allowed/blocked checks before downstream execution. |
| Emergency Escalation | `backend/src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service.ts` | partially implemented, demo-only, unsafe | Escalation actions are audited/selected, but real external paging/911 integrations are placeholders. | Mark placeholder actions simulated and fail closed in production unless integrations are configured. |
| Stripe Webhooks | `backend/src/modules/subscriptions/subscriptions.controller.ts` | implemented, partially implemented, unsafe | Webhook automation exists; invalid signatures should return non-2xx rather than a normal OK body. | Make signature failures explicit and test invalid webhook behavior. |
| Clinical Alerts | `src/services/clinicalAlertsApi.js`, `backend/src/modules/clinical-alerts` | implemented, demo-only | Capability status is `demo`; client labels disabled state and route smoke tests use demo alert data. | Keep labels; future live alerting needs stream/ack contracts. |
| Live Tracking Refresh | `src/pages/LiveTrackingMap.jsx`, `src/services/liveTrackingApi.js` | implemented, demo-only | Page polls every refresh interval and service returns `demo` state from demo backend capabilities. UI includes stale/offline warnings. | Accept as labeled demo/live hybrid; no immediate change. |
| AI Command Center Refresh | `src/pages/AiCommandCenterDashboard.jsx`, `src/services/aiCommandCenterApi.js` | implemented, partially implemented | Polls every 15s and shows source status per subsystem. Local fallbacks are labeled as `fallback`. | Accept; labels are visible. |
| Advanced Tool Recommendations | `src/services/advancedRecommendationService.js` | implemented, partially implemented | Calls backend intent classification, caches for 5 minutes, and falls back to keyword rules. | Accept; cache is in-memory and scoped. |
| Feature Flag Center | `src/config/featureFlags.config.js`, `src/pages/FeatureFlagCenter.jsx`, `src/services/featureFlagService.js` | implemented, partially implemented | Local overrides persist in browser storage and rollout labels are visible; not backend-enforced. | Accept as governance UI; keep entitlement enforcement separate. |
| Startup Automations | `src/utils/deferStartupTasks.js` | implemented, hidden | Crash reporting, analytics, push token registration, and offline sync are deferred after first paint. Push/offline are feature-flagged there. | Keep, but ensure offline provider respects the same flag. |
| Cached Responses / Offline Catalogs | `src/services/offlineService.js`, `src/db/offline.db.js`, `src/data/offlineMode.js` | implemented, partially implemented | Offline catalogs and sync queue are local-first; unsupported backend sync capabilities are guarded. | Keep guarded; provider should label disabled state. |
| Backend Cache Service | `backend/src/modules/cache/cache.service.ts` | implemented, production-ready | Redis only connects when configured; reconnect attempts are bounded. | No immediate change. |
| AI Gateway / Tool Orchestrator | `backend/src/modules/ai-gateway`, `backend/src/modules/medical-control-plane/tool-orchestrator` | implemented, production-ready | Registered executor ids are contract-tested from backend/frontend capability maps. | No immediate change. |
| Human Review Queue | `backend/src/modules/human-review/human-review.module.ts`, `/review` route | partially implemented, demo-only | In-memory service queue, no durable worker. | Keep demo until persistence/assignment exists. |
| Training Pipeline Queue | `backend/src/modules/training/training.service.ts` | partially implemented, demo-only | "Queued" training runs are service state, not a durable queue. | Keep demo-labeled in UI. |

## Fix Execution Plan

1. Label the legacy automation builder as demo-only and route users toward the canonical `/workflows` surface.
2. Gate `OfflineProvider` initialization, service worker registration, and background sync on `FEATURE_FLAGS.enableOfflineMode`; render a clear disabled state when offline mode is off.
3. Remove the duplicate queue-style notification service from `LiveCostDashboard` so no production UI initializes the orphaned send-channel notifier.
4. Add/adjust focused tests for demo labels, offline feature gating, and duplicate notification quarantine.

## Executed Fixes

| Fix | Status | Evidence |
|---|---|---|
| Legacy automation builder labeling | Done | `/automation` now says it is a demo-only preview, removes "Ready to save" language, states rules are not saved/scheduled/executed, and links to `/workflows`. |
| Offline sync feature gate | Done | `OfflineProvider` no longer initializes service worker/offline cache/sync automation unless `FEATURE_FLAGS.enableOfflineMode` is true; disabled offline state is labeled in UI. |
| Duplicate notification path quarantine | Done | `LiveCostDashboard` no longer imports or initializes `src/services/notifications/NotificationService.js`; the queue-style service is test-only until a real send-channel route exists. |
| Metrics endpoint async response | Done | `MetricsController.getMetrics()` now awaits Prometheus text before sending the response. |
| Focused regression tests | Done | Added/updated tests for automation demo labels, offline feature gating, and duplicate notification quarantine. |

## Verification

| Command | Result |
|---|---|
| `npm run test:run -- src/pages/WorkflowAutomationBuilder.test.jsx src/data/workflowAutomationBuilder.test.js src/contexts/OfflineProvider.test.jsx src/contexts/OfflineProvider.disabled.test.jsx src/components/LiveCostDashboard.automation.test.js` | Passed: 5 files, 9 tests. |
| `cd backend && npm test -- metrics.controller.spec.ts` | Passed: 1 file, 1 test. |
| `npm run build` | Passed. |
| `npm run backend:build` | Passed. |
| `npm run test:run` | Failed in existing repo-wide route/inventory/navigation contracts: 25 failed files, 38 failed tests, 361 passed files, 9279 passed tests. No failures were in the targeted automation files changed for this report. |

## Residual Risks

- Backend `scheduleNotification` remains a non-delivering pending-record helper; it should not be exposed as scheduled delivery until a queue worker exists.
- `/workflows` still has demo save/generate buttons. That is acceptable for this pass because the UI is already part of Platform OS demo data, but it should not be marketed as live automation execution.
- The duplicate queue-style notification service remains in the repo for existing tests; it is quarantined by removing production imports, not deleted.
