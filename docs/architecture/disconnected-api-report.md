# Disconnected API Report

Generated: 2026-06-12

## Summary

Disconnected APIs are the main Pilot Readiness gap. The visible Emergency OS workflow renders, but many backend/API-client paths either remain planned, demo-only, disabled by capability config, or are not wired into the active routes.

## Emergency OS Backend APIs Not Consumed By Active UI

| API | Current state | Classification | Recommended action |
| --- | --- | --- | --- |
| `/api/capacity/dashboard` | Backend exists; capacity page uses `useEmergencyStore.capacity`. | API Not Consumed, Duplicate Logic | Add a capacity hydration adapter with local fallback. |
| `/api/ems/incoming` | Backend exists; EMS page uses store arrivals and fleet/diversion clients. | API Not Consumed, Duplicate Logic | Hydrate EMS arrivals from this endpoint when backend runtime is enabled. |
| `/api/ems/alert`, `/status/:emsUnitId`, `/arrive/:emsUnitId` | Backend exists; no frontend submission/subscription path. | API Not Consumed, Event Not Subscribed | Add EMS intake client or hide endpoint from pilot docs. |
| `/api/reassessment/due` | Backend exists; reassessment route uses local flags. | API Not Consumed | Add reassessment client or explicitly label local safety queue. |
| `/api/reassessment/:id/reassess`, `/dismiss` | Backend exists; UI assessment actions select patient only. | API Not Consumed | Wire reassessment actions after backend contract is confirmed. |
| `/api/copilot/query` | Backend exists; Copilot uses `/api/chat/message`. | API Not Consumed, Duplicate Logic | Pick one copilot API before pilot onboarding. |
| `/api/referrals` | Platform endpoint exists; `ReferralPanel` persists to disabled `/api/emergency/referrals`. | Broken State Flow | Normalize referral persistence path. |

## Frontend API Clients With Partial Or No Production Consumer

| Client | Unused or partial functions | Classification | Pilot decision |
| --- | --- | --- | --- |
| `src/services/smartIntakeApi.js` | `submitManualEntry`, `uploadDocument`, `submitOcrResult`, `matchPatient`, `verifyField` | API Not Consumed | Keep, but report Smart Intake backend evidence flow as partial. |
| `src/services/emergencyAnalyticsApi.js` | `fetchEmergencyCapacityHistory`, `fetchEmergencyQueueAnalytics` | API Not Consumed | Compose into analytics later; not a pilot blocker if local fallback remains labeled. |
| `src/services/emergencyTransportApi.js` | `fetchEmergencyReferralHistory` | API Not Consumed | Wire to patient/referral detail later. |
| `src/services/clinicalContentApi.js` | Drug/category/detail helpers | API Not Consumed | Future module unless drug catalog is part of pilot walkthrough. |
| `src/services/clinicalAlertsApi.js` | `dismissClinicalAlertApi` | Hook Not Consumed | Add dismiss UI or remove from active inventory. |
| `src/services/memoryApi.js` | `saveLongMemory`, `recordClinicalMemory` | API Not Consumed | Future AI memory module; not pilot-critical. |
| `src/services/subscriptionApi.js` | Lifecycle/upgrade/downgrade/trial helpers | API Not Consumed | Revenue admin future module, not Emergency OS pilot workflow. |
| `src/services/platformAssetsApi.js` | Department/service-line/marketplace/org detail methods | Legacy Artifact | Keep out of pilot Emergency OS shell. |
| `src/services/productCatalogApi.js` | Product/detail/assets/plan helpers | Legacy Artifact | Keep out of pilot Emergency OS shell. |

## Safe Fixes Applied

- Smart Intake HTTP errors now reject instead of appearing successful.
- Smart Intake final actions now call backend methods and show visible pending/error state.
- Referral backend sync failures now show visible status.
- EMS and Settings async backend failures now show visible unavailable/error status.

## Remaining Blockers

- No single canonical Emergency OS backend client hydrates the active store.
- Socket/Event flows emitted by backend are not subscribed by frontend.
- API inventory should be split into `wired-ui`, `service-only`, `planned`, and `legacy` before customer-facing technical review.
