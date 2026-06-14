# State Reconciliation Report

Date: 2026-06-14

## Scope

This pass searched the CareDroid Emergency OS repo for React Context providers/hooks, Zustand stores, Redux/MobX usage, local module stores, singleton stores, provider trees, storage-backed state, and locally duplicated operational state.

The active target model is one Emergency OS operational state model:

```text
Emergency OS UI / route / command
  -> shared API hook or direct store selector
  -> src/store/emergencyStore.ts
  -> Emergency OS API facade when backend data is available
  -> local/demo fallback only through canonical hydration and store actions
```

No new provider, route system, store, API facade, or speculative architecture was introduced.

## State Systems Discovered

| State system | Location | Classification | Notes |
| --- | --- | --- | --- |
| Emergency OS Zustand store | `src/store/emergencyStore.ts` | ACTIVE_CANONICAL | Canonical operational model for patients, staff, rooms, capacity, EMS, referrals, alerts, workflow logs, audit log, settings, feature flags, scenario mode, websocket status, integration events, and analytics. |
| Emergency store compatibility export | `src/store/emergency-store.ts` | LEGACY_COMPAT | Re-exports `src/store/emergencyStore.ts` and supplies `createInitialEmergencyStoreState()` for compatibility tests/imports. It does not create another store instance. |
| Root emergency store compatibility export | `store/emergencyStore.ts` | LEGACY_COMPAT | Re-exports `src/store/emergencyStore.ts` for root-level tests and older import paths. |
| Frontend emergency store compatibility export | `frontend/src/store/emergency-store.ts` | LEGACY_COMPAT | Re-exports the canonical store and websocket hook for frontend package compatibility. |
| Feature store alias | `store/featureStore.ts` and `useFeatureStore` in `src/store/emergencyStore.ts` | LEGACY_COMPAT | Feature state is stored inside the canonical emergency store and exposed through an alias. |
| Emergency API module hooks | `src/hooks/useEmergencyOs.js` | ACTIVE_CONSUMER | Fetches Emergency OS envelopes and hydrates canonical store payloads when patients, rooms, staff, alerts, capacity, EMS arrivals, referrals, or workflow logs are returned. Local hook `data/loading/error` is request state, not a second operational store. |
| Central node hook | `src/hooks/useCareDroidCentralNode.ts` | ACTIVE_CONSUMER | Builds the central node snapshot from canonical store selectors. Backend snapshot state is refresh metadata and source labeling, not an alternate operational model. |
| App provider tree | `src/App.jsx` | ACTIVE_CONSUMER | Uses one provider tree for broad app concerns: theme, user, notifications, conversation, tool preferences, workspace, organization, white label, identity, cost, system config, tenant, offline, router. |
| Notification context | `src/contexts/NotificationContext.jsx` | ACTIVE_CONSUMER | Now derives notifications from canonical emergency alerts. Its local `readIds` set is UI acknowledgement state only. |
| App contexts | `src/contexts/*.jsx` | FUTURE_REVIEW | User, workspace, tenant, organization, identity, white label, tool preferences, conversation, cost, system config, theme, and offline contexts are broad app state. They are outside the Emergency OS operational model and were not removed in this pass. |
| Tenant context singleton | `src/services/tenantContextStore.js` | FUTURE_REVIEW | Module-level tenant header cache. Non-emergency operational state, but it should remain visible in future app-state cleanup. |
| Offline DB/service singletons | `src/db/offline.db.js`, `src/services/offlineService.js` | FUTURE_REVIEW | Offline infrastructure singleton state. Not an Emergency OS operational store. |
| Service singleton caches | `src/services/configService.js`, `src/services/realtime/RealTimeCostService.js`, notification/crash services | FUTURE_REVIEW | Service-local cache or lifecycle state. Not part of Emergency OS patient-flow state. |
| Redux/MobX | repo search | ACTIVE_CANONICAL absence | No active first-party Redux or MobX state system was found. Package search only surfaced transitive `symbol-observable` metadata. |

## Active Emergency OS Operational State Model

Canonical operational state is centralized in `src/store/emergencyStore.ts`:

- Core department state: `patients`, `staff`, `rooms`, `capacity`, `capacityHistory`, `activeShift`.
- Runtime operational modules: `emsUnits`, `emsArrivals`, `emsIncomingPatients`, `referrals`, `alerts`, `workflowLogs`, `auditLog`, `integrationEvents`.
- Control plane state: `thresholds`, `emergencySettings`, `features`, `flags`, `overrides`, `tier`, scenario mode, backend availability, persistence mode.
- UI coordination state that must be shared across active Emergency OS surfaces: `selectedPatientId`, `activeQueueFilter`, `whiteboardSearchQuery`, `copilotOpen`, websocket status.
- Store actions are the write boundary for local/demo operations: patient movement, intake, EMS conversion, referral creation/status, reassessment reminders, alerts, settings, thresholds, scenario switching, analytics loading, realtime event dispatch.

Shared API hooks in `src/hooks/useEmergencyOs.js` remain the read/hydration boundary for backend envelopes. They should continue to hydrate the canonical store rather than feeding isolated page-only operational arrays.

## Duplicate / Conflict / Island Findings

| Finding | Classification | Resolution |
| --- | --- | --- |
| `EmergencySettings` imported `useEmergencyStore` twice, aliasing the same store as root and shell, then read workflow logs, audit logs, scenario setters, and threshold actions through both names. | DUPLICATE | Fixed. The settings page now imports the canonical store once and reads one workflow/audit/scenario/threshold source. |
| `src/store/emergency-store.ts`, `store/emergencyStore.ts`, and `frontend/src/store/emergency-store.ts` look like separate store entry points by name. | LEGACY_COMPAT | Kept. They all re-export `src/store/emergencyStore.ts`; no duplicate Zustand instance exists. |
| `store/featureStore.ts` appears to be a separate feature store. | LEGACY_COMPAT | Kept. It re-exports feature state/actions from the canonical Emergency OS store. |
| `useEmergencyOs.js` hooks hold local `data/loading/error` envelopes alongside hydrated store data. | ACTIVE_CONSUMER | Kept. This is request lifecycle state. Operational payloads hydrate canonical store when available. |
| Whiteboard route merges API whiteboard patients with store patients. | ACTIVE_CONSUMER | Kept. Merge is render-time reconciliation with canonical store fallback; route actions write to the store. |
| Queue, reassessment, boarding, capacity, copilot, EMS, referral, analytics route components combine API hook envelopes with store fallback. | ACTIVE_CONSUMER | Kept. These are active consumers of store plus backend envelopes, not standalone operational stores. |
| `CopilotPanel` keeps local streamed chat `messages` while the store also has `copilotMessages` actions/state. | FUTURE_REVIEW | Not changed. Streaming UX is local-session state today, but future consolidation should decide whether durable/copilot transcript state belongs in the canonical store. |
| `EmergencySettings` uses a local `draft` copy of settings. | ACTIVE_CONSUMER | Kept. This is editable form draft state; saves flow through canonical `saveEmergencySettings()` and API calls. |
| EMS fleet snapshot and diversion status live in local component state in `EMSPipeline`. | FUTURE_REVIEW | Not changed. They are external integration snapshots; if they become operational routing inputs they should hydrate canonical store fields instead. |
| Referral form/search/response-note state lives in `ReferralPanel`. | ACTIVE_CONSUMER | Kept. Local form state is transient; referral records write through canonical store actions and Emergency OS API persistence. |
| Command palette localStorage state for recents/favorites/preferences. | ISOLATED | Kept. User preference state is isolated from Emergency OS operational state. |
| Scenario selection persists to `caredroid.edScenarioId` through scenario fixtures. | ACTIVE_CONSUMER | Kept. Persistence supports the canonical store scenario mode rather than creating another state model. |
| AppShell sessionStorage for charge-nurse pulse default. | ISOLATED | Kept. It is one-time UI display preference, not operational state. |
| Broad React contexts for workspace, tenant, identity, organization, tool preferences, conversation, cost, system config, theme, offline. | MANUAL_REVIEW | Not changed. These are broad app contexts; removing or collapsing them is outside a safe Emergency OS state pass. |

## Fixes Applied

### Emergency Settings Store Alias

Before:

```text
EmergencySettings
  -> useEmergencyStore as root store
  -> useEmergencyStore as shell store
  -> de-dupe identical workflow/audit arrays
  -> call scenario setter twice
```

After:

```text
EmergencySettings
  -> useEmergencyStore once
  -> one workflow log source
  -> one audit log source
  -> one scenario setter
  -> one threshold action source
```

Changed file:

- `src/pages/emergency/EmergencySettings.jsx`

## Remaining Risks / Manual Review

- `CopilotPanel` should be reviewed when durable copilot conversations are productized. Today its streamed local transcript can diverge from `copilotMessages` in the canonical store.
- EMS integration snapshots (`fleetSnapshot`, `diversionStatus`) should hydrate canonical store/integration fields if they begin driving dispatch, diversion, or capacity decisions.
- Broad app contexts remain valid but numerous. They should not be collapsed into Emergency OS state unless the product explicitly chooses a broader platform state reconciliation pass.
- Compatibility export files should remain shims only. Future changes should not add independent Zustand `create()` calls outside `src/store/emergencyStore.ts`.
- `src/store/emergency-store.ts` exposes `createInitialEmergencyStoreState()` snapshots for tests/compatibility. Do not treat that snapshot factory as an independent runtime state source.

## Validation

Commands run:

```text
npx eslint "src/pages/emergency/EmergencySettings.jsx"
npm run typecheck:frontend
npx vitest run "src/store/emergency-store.test.ts" "src/store/emergencyScenarioStore.test.ts" "src/components/EmergencyWhiteboard.storeReactivity.test.jsx"
```

Results:

- ESLint passed for the touched settings page.
- Frontend TypeScript check passed.
- Focused state tests passed: 3 test files, 8 tests.
