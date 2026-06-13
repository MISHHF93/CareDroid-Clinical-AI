# R4 State Consolidation Report

## Scope
- Executed R4 store/state consolidation only, using `CONSOLIDATION_DECISIONS.md`.
- Canonical target: `src/store/emergencyStore.ts`.
- No commits or pushes performed.
- `caredroid.sqlite` was not touched.

## Store Files Inspected
- `src/store/emergencyStore.ts` - canonical Emergency OS Zustand store.
- `store/featureStore.ts` - marked `MERGE INTO src/store/emergencyStore.ts`.
- `frontend/src/store/emergency-store.ts` - marked `MERGE INTO src/store/emergencyStore.ts`.
- `store/emergencyStore.ts` - compatibility re-export boundary, retained.
- `src/store/emergency-store.ts` - compatibility re-export/reset snapshot boundary, retained.
- `src/types/emergency.ts` - canonical Emergency OS types.

## Provider State Entries Inspected
These are marked `MERGE INTO src/store/emergencyStore.ts` in the decisions file, but remain compatibility providers for R4 because their consumers are broad and provider removal would create route/app-shell churn outside direct store consolidation.

- `src/contexts/WorkspaceContext.jsx`
  - State: `clientProfile`, `workspaceContext`, `workspaces`, `activeWorkspaceId`, `isLoading`, `error`.
  - Actions: `setActiveWorkspaceId`, `switchWorkspace`, `refreshWorkspaceContext`, `addWorkspace`, `updateWorkspace`, `removeWorkspace`.
- `src/contexts/WhiteLabelContext.jsx`
  - State: `publicBranding`; derived `branding`, `tenantId`, `organizationName`, `isWhiteLabeled`.
  - Actions/effects: fetch/cache public branding, apply CSS variables/favicon/title.
- `src/contexts/ToolPreferencesContext.jsx`
  - State: `favorites`, `pinned`, `recentTools`, `hiddenTools`, `profileSettings`.
  - Actions: `toggleFavorite`, `togglePinned`, `toggleHidden`, `recordToolAccess`, `clearRecentTools`, `updateProfileSettings`, `resetToolRecommendations`.
- `src/contexts/NotificationContext.jsx`
  - State: `notifications`.
  - Actions: `addNotification`, `removeNotification`, `markAsRead`, `markAllAsRead`, `clearAll`.
- `src/contexts/TenantContext.jsx`
  - State: `tenantContext`, `isLoading`, `error`; derived `hasTenantContext`.
  - Actions: `refreshTenantContext`.
- `src/contexts/OfflineProvider.jsx`
  - State: `isOnline`, `isSyncing`, `syncProgress`, `syncStats`, `catalogSummary`, `lastSyncAt`, `syncError`, `onlineNoticeDismissed`.
  - Actions: `refreshOfflineCatalogs`, `syncWhenOnline`.
- `src/contexts/UserIdentityContext.jsx`
  - State: `operationalProfile`, `platformContext`, `memoryFabricContext`, `isLoading`, `error`; derived account/workspace/activity/security/entitlement fields.
  - Actions: `refreshIdentity`, `switchWorkspace`, `savePreferences`, `updateProfile`, `recordActivity`, `hasEffectivePermission`, `refreshPlatformContext`, `refreshMemoryFabricContext`.
- `src/contexts/UserContext.jsx`
  - State: `user`, `authToken`, `isLoading`; derived auth flags.
  - Actions: `setUser`, `setAuthToken`, `signOut`, `hasPermission`, `hasAnyPermission`, `hasAllPermissions`.
- `src/contexts/ConversationContext.jsx`
  - State: `conversations`, `activeConversationId`, `messages`, `selectedTool`, `isLoading`.
  - Actions: `addConversation`, `selectConversation`, `deleteConversation`, `addMessage`, `clearMessages`, `selectTool`, `setActiveTool`, `clearTool`, `setIsLoading`.
- `src/contexts/ThemeContext.jsx`
  - State: `preference`, `systemDark`; derived `resolvedTheme`.
  - Actions: `setPreference`.
- `src/contexts/SystemConfigContext.jsx`
  - State: `systemConfig`, `aiUsage`, `availableTools`, `subscription`, `loading`, `error`, `configDegraded`.
  - Actions: `refresh`.
- `src/contexts/OrganizationContext.jsx`
  - State: `organizationEngine`, `isLoading`, `error`; derived organization/tenant/branding/subscription/integrations.
  - Actions: `refreshOrganizationEngine`, `saveOrganizationSettings`.
- `src/contexts/CostTrackingContext.jsx`
  - State: `costData`, `costLimit`, `isLoading`; derived limit warnings.
  - Actions: `trackToolCost`, `getToolCost`, `getTopSpendingTools`, `getCostTrends`, `updateCostLimit`, `resetCostData`, `getROIMetrics`.

## State And Actions Merged

### From `store/featureStore.ts`
Merged into `src/store/emergencyStore.ts`:

- State:
  - `flags: Record<string, boolean>`
  - `overrides: Record<string, boolean>`
  - `tier: FeatureTier`
  - `lastSynced: Date | null`
  - `backendAvailable: boolean`
  - `persistenceMode: 'backend' | 'local'`
  - Existing `features` was widened to `Record<string, boolean>` via `src/types/emergency.ts`.
- Actions:
  - `initializeFlags`
  - `toggleFeature`
  - `setTier`
  - `isEnabled`
  - `getEnabledFeatures`
  - `getDependencyWarning`
  - `syncFeatureFlag`
  - `buildDefaultFlags`
  - `subscribeToFeatureFlagSync`
- Behavior preserved:
  - Tier gating and dependency resolution.
  - LocalStorage snapshot key `caredroid.emergency.featureStore.v1`.
  - Backend settings load/persist fallback.
  - Local audit event on fallback feature toggles.

### From `frontend/src/store/emergency-store.ts`
Merged into `src/store/emergencyStore.ts`:

- State:
  - `capacityMetrics`
  - `boardingMetrics`
  - `surgeStatus`
  - `copilotMessages`
  - `emsIncomingPatients`
  - `ui`
  - `websocket`
  - `integrationEvents`
- Actions:
  - `setPatients`
  - `removePatient`
  - `clearError`
  - `refreshAllData`
  - `activateSurge`
  - `sendCopilotQuery`
  - `setWebSocketStatus`
  - `dispatchWebSocketEvent`
  - `appendCopilotMessage`
  - `upsertEmsIncomingPatient`
- Existing canonical equivalents preserved:
  - `selectPatient` now also mirrors `ui.selectedPatientId`.
  - `updatePatient` remains canonical patient update behavior.
  - `addPatient` remains canonical patient create behavior.

### Emergency OS Terminology
- `selectedPatientId` is retained as canonical selected patient state.
- Added `clearPatientSelection` as canonical clear-selection action.
- `activeQueueFilter` is now `string | null` and defaults to `null`.
- Existing `updatePatient` and `PatientState` terminology remain canonical.

## Direct Consumers Updated
- `src/main.jsx`
- `src/hooks/useFeature.js`
- `src/pages/settings/FeatureManagement.jsx`
- `src/layout/AppShell.jsx`
- `src/featureFlagCoverage.test.jsx`
- `src/components/ChatInterface.nlu.test.jsx`
- `src/store/emergency-store.test.ts`

All active `src` imports from `store/featureStore` were removed or redirected to `src/store/emergencyStore.ts`.

## Compatibility Shims Retained
- `store/emergencyStore.ts`
  - Retained as root import boundary re-exporting `src/store/emergencyStore.ts`.
- `src/store/emergency-store.ts`
  - Retained as hyphenated compatibility boundary and reset snapshot helper.
- `store/featureStore.ts`
  - Converted to a thin compatibility shim that re-exports `buildDefaultFlags`, `subscribeToFeatureFlagSync`, `useFeatureStore`, and related types from `src/store/emergencyStore.ts`.
  - Retained because tests/docs and non-`src` imports use it as a stable root import boundary.
- `frontend/src/store/emergency-store.ts`
  - Converted to a thin compatibility shim that re-exports `src/store/emergencyStore.ts` and the active `src/hooks/useEmergencyWebSocket.ts`.
  - Retained because `frontend/src/hooks/useEmergencyWebSocket.ts` imports it.
- Context providers listed above are retained as compatibility providers because deleting or rewriting them would create broad app-shell/provider churn outside R4.

## Store Files Deleted
- None.

Deletion was intentionally avoided because each duplicate store path is still useful as a compatibility import boundary or would require broad churn. R4 instructions allowed shims in this case.

## Completeness Checklist
- `patients: Patient[]` - present.
- `staff: Staff[]` - present.
- `rooms: Room[]` - present.
- `capacity: CapacitySnapshot` - present.
- `activeShift: Shift` - present as `ActiveShift`.
- `emsUnits: EMSUnit[]` - present as `EmsUnit[]`.
- `referrals: Referral[]` - present.
- `alerts: Alert[]` - present.
- `selectedPatientId: string | null` - present.
- `copilotOpen: boolean` - present.
- `activeQueueFilter: string | null` - present, default `null`.
- `loading: boolean` - present.
- `features: Record<string, boolean>` - present.

Additional merged frontend emergency-store state is also present: `capacityMetrics`, `boardingMetrics`, `surgeStatus`, `copilotMessages`, `emsIncomingPatients`, `ui`, `websocket`, and `integrationEvents`.

## Import Search Result
Requested ripgrep equivalent:

`from.*caseStore|from.*patientStore|from.*dashboardStore` in `src`

Result: no matches.

Additional active merged-store search:

`from ['"].*featureStore['"]|useFeatureStore` in `src`

Result: only the canonical alias export remains in `src/store/emergencyStore.ts`; no active `src` consumer imports `featureStore`.

## Verification Commands And Results
- `npx tsc --noEmit`
  - Passed.
- `npm run typecheck:frontend`
  - Passed.
- `npx vitest run "src/store/emergency-store.test.ts" "store/emergencyStore.test.ts" "store/workflowActionLogging.test.ts" "src/store/emergencyScenarioStore.test.ts"`
  - Failed: `src/store/emergency-store.test.ts` and `src/store/emergencyScenarioStore.test.ts` passed; root `store/emergencyStore.test.ts` and `store/workflowActionLogging.test.ts` failed because they expect broader EMS/escalation/staffing/alert methods such as `prepareEMSBay`, `addEMSArrival`, `updateCapacity`, `escalatePatient`, `requestAdditionalStaff`, and `updateAlerts` that are not implemented in the current canonical store.
- `npx vitest run "src/store/emergency-store.test.ts" "src/store/emergencyScenarioStore.test.ts"`
  - Passed: 2 files, 5 tests.
- `ReadLints` on edited files
  - Passed: no linter errors reported.

## Remaining Risks
- Root-level store tests describe behavior beyond this R4 consolidation and still fail until canonical Emergency OS implements or shims those EMS/escalation/staffing/alert workflow methods.
- Provider state remains in compatibility context providers. R4 inventoried it, but full provider deletion should be a separate route/provider migration because consumers are broad.
- `frontend/src/store/emergency-store.ts` is now a shim, so any legacy caller depending on its old persisted-only behavior now receives canonical Emergency OS state and the active websocket hook.
