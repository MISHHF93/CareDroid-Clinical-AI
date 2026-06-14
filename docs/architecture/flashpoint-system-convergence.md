# Flashpoint System Convergence

Date: 2026-06-14

## Discovery Method

This pass traced the active CareDroid Emergency OS product spine across the files most likely to encode duplicate truths:

- Routes and render ownership: `src/App.jsx`, `src/config/routes.config.js`, `src/data/emergencyPageRenderInventory.js`, route tests.
- Layout and navigation: `src/components/AppShell.tsx`, `src/layout/AppShell.jsx`, `src/components/Sidebar.tsx`, `src/config/unified-navigation.config.ts`, `src/config/navigation.config.js`, `src/config/commandPalette.config.js`.
- API surfaces: `src/services/emergencyOsApi.js`, `src/services/emergencyTransportApi.js`, `src/data/backendHttpRouteInventory.js`, `src/data/frontendApiCallsInventory.js`, `backend/src/modules/emergency-os/*`.
- State and models: `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`, `src/types/emergency.ts`, `src/central-node/careDroidCentralNode.ts`, `backend/src/modules/emergency-os/emergency-os.types.ts`, `backend/src/modules/emergency-os/emergency-os.services.ts`.
- Settings, providers, and design language: `src/config/emergencySettings.config.js`, `src/config/emergencyRolePermissions.js`, `src/config/theme.tokens.js`, `src/styles/theme-tokens.css`, `src/styles/design-tokens.css`, `src/layout/designTokens.js`, `src/contexts/*`.

Searches focused on repeated imports, hard-coded `/emergency/*` paths, parallel API clients, compatibility filenames, duplicate AppShell references, central-node naming, settings threshold keys, provider mounting, alert state, and design token mirrors.

## Canonical Sources Of Truth

| Domain | Canonical source | Compatibility / secondary surface | Status |
| --- | --- | --- | --- |
| Product route constants | `src/config/routes.config.js` (`CANONICAL_ROUTES`, `CANONICAL_APP_ROUTE_TREE`) | React Router declarations in `src/App.jsx`, legacy redirects in the same config | CONVERGED_CANONICAL |
| Active route rendering | `src/App.jsx` under one `AppShell` route layout | `emergencyPageRenderInventory.js` validates page inventory against `CANONICAL_APP_ROUTE_TREE` | CONVERGED_CANONICAL |
| AppShell layout | `src/components/AppShell.tsx` | `src/layout/AppShell.jsx` retained for legacy/manual-review tests, not runtime-mounted | LEGACY_COMPAT |
| Navigation rail | `src/config/unified-navigation.config.ts` (`NAVIGATION_ITEMS`) | `src/config/navigation.config.js` projection to `APP_SHELL_NAV_ITEMS` | CONVERGED_CANONICAL |
| Command route actions | `NAVIGATION_ITEMS` plus retained direct hidden routes in `commandPalette.config.js` | Previous inline route command list | SAFE_FIX_APPLIED |
| Emergency role and route access | `src/config/emergencyRolePermissions.js` | `useEmergencyRolePermissions` consumers in shell and route guards | CONVERGED_CANONICAL |
| Frontend Emergency OS API facade | `src/services/emergencyOsApi.js` (`EMERGENCY_OS_API_ENDPOINTS`) | `emergencyTransportApi.js` for gated transport/referral/EMS optional runtime actions | CONVERGED_CANONICAL / LEGACY_COMPAT |
| Backend Emergency OS API | `backend/src/modules/emergency-os/emergency-os.controller.ts` and services | `backendHttpRouteInventory.js`, optional runtime routes gated by capability flags | CONVERGED_CANONICAL / LEGACY_COMPAT |
| Operational store | `src/store/emergencyStore.ts` | `src/store/emergency-store.ts` re-export and initial-state helper for legacy tests | LEGACY_COMPAT |
| Shared frontend model | `src/types/emergency.ts` | Backend owns separate Nest contract in `emergency-os.types.ts`; convergence happens by response normalization | CONFLICTING_MODEL |
| Central node snapshot | `src/central-node/careDroidCentralNode.ts` | Backend `CareDroidCentralNodeService` envelope normalized by `useCareDroidCentralNode` | CONVERGED_CANONICAL |
| Settings defaults | `src/config/emergencySettings.config.js` plus backend `DEFAULT_EMERGENCY_OS_SETTINGS` | Store threshold projection in `emergencyStore.ts` | CONFLICTING_SETTING |
| Theme/design tokens | CSS runtime tokens in `theme-tokens.css` and `design-tokens.css` | JS projection in `config/theme.tokens.js` and `layout/designTokens.js` | CONVERGED_CANONICAL |
| Providers | `src/App.jsx` provider stack | Test harness providers duplicate minimum providers only | CONVERGED_CANONICAL |

## Flashpoint Inventory

### CONVERGED_CANONICAL

- `routes.config.js` owns route constants, app route tree, alias redirects, and workspace subpage redirects. `App.jsx` renders the route tree but imports canonical path constants instead of owning another route truth.
- `emergencyPageRenderInventory.js` imports `CANONICAL_APP_ROUTE_TREE` and `CANONICAL_ROUTES`; its tests assert mounted app page paths match inventory paths.
- `unified-navigation.config.ts` owns active Emergency OS nav item order, pilot visibility, feature gates, and route IDs. `navigation.config.js` projects this into older `APP_SHELL_NAV_ITEMS` consumers.
- `emergencyOsApi.js`, `backendHttpRouteInventory.js`, and `frontendApiCallsInventory.js` now agree on active Emergency OS read endpoints including `/api/emergency/referrals` for referral persistence.
- `theme.tokens.js` explicitly declares CSS token files as runtime sources and only re-exports JS mirrors for tests/programmatic layout.
- `src/App.jsx` mounts a single provider stack and a single `BrowserRouter`; provider duplication found in tests is harness-local.

### SAFE_FIX_APPLIED

- `src/config/commandPalette.config.js` no longer carries a full parallel list of active navigation route paths. Active route commands are projected from `getPilotCustomerNavigationItems(NAVIGATION_ITEMS)`, with metadata retained only for command labels, hints, and keywords.
- `open-pulse` and `open-shift` remain explicit retained direct-route commands because they are mounted app routes but intentionally hidden from the pilot rail.
- This converges command-palette route truth onto `unified-navigation.config.ts` without changing runtime route destinations or adding an adapter layer.

### DUPLICATE_TRUTH

- `CANONICAL_ROUTES` and `CANONICAL_APP_ROUTE_TREE` still both spell the active Emergency OS page paths. This is intentional for now because route constants are reused by non-render consumers, while the route tree is a route-health contract.
- `emergencyPageRenderInventory.js` repeats page labels, screenshot slugs, component keys, and endpoint lists. It is a validation/audit inventory, not runtime routing, but it can drift if new pages are added without tests.
- `frontendApiCallsInventory.js` and `backendHttpRouteInventory.js` intentionally duplicate API paths for exposure validation.

### CONFLICTING_MODEL

- Frontend `src/types/emergency.ts` and backend `backend/src/modules/emergency-os/emergency-os.types.ts` define separate patient, alert, capacity, settings, central-node, and journey shapes. They mostly align by string values, but there is no shared generated schema.
- `PatientState` exists as a frontend enum and backend union. Current values align for active states, but this remains a manual contract.
- Frontend `Alert` uses `severity: 'Info' | 'Warning' | 'Critical'`; other legacy clinical utilities use lower-case `critical/warning/normal` or `high/medium/low`. Active Emergency OS alerts normalize through store/header contracts, but non-OS alert utilities still represent severity differently.
- `EmsUnit` and `EMSUnit` both exist in `src/types/emergency.ts` with overlapping concepts and different field shapes. Active EMS screens tolerate both through store/service normalization.

### CONFLICTING_API

- Active Emergency OS API reads live in `emergencyOsApi.js`; transport/referral/EMS optional runtime writes live in `emergencyTransportApi.js`. This split is acceptable for gated optional runtime actions, but it should not grow into a second active Emergency OS API facade.
- Backend still exposes broad platform emergency-like routes such as `/api/patients`, `/api/ems`, and `/api/referrals` alongside `/api/emergency/*`. The active product surface should keep using `/api/emergency/*`; platform routes are compatibility/platform-system scope.
- Optional Mongoose runtime routes in `OPTIONAL_RUNTIME_BACKEND_ROUTES` duplicate EMS, governance, intake, reassessment, surge, boarding, and capacity concepts behind `ENABLE_MONGOOSE_EMERGENCY_OS`. Because these may overlap active parallel worker areas, this pass documents them instead of merging them.

### CONFLICTING_SETTING

- Store thresholds use the persisted misspelled key `waitTimeCtiticalMin`. `buildEmergencySettingsPatchFromThresholds()` maps it to the correct backend/settings key `waitCriticalMinutes`. This is a legacy persisted key and was not renamed.
- Frontend `DEFAULT_EMERGENCY_MODULES` uses ids such as `emergency-whiteboard` and `queue-intelligence`; backend `DEFAULT_EMERGENCY_OS_SETTINGS.enabledModules` uses ids such as `whiteboard`, `queues`, and `smartIntake`. Central-node module status normalization accepts backend ids, but there is not one shared module id registry.
- `DEFAULT_EMERGENCY_ALERT_RULES` uses lower-camel ids (`longWait`, `reassessmentDue`, `emsCritical`), while demo settings in `firstCustomerDemoMode.js` use category keys (`Reassessment`, `Capacity`, `EMS`, `Referral`, `Queue`, `System`, `CAPACITY_CRISIS`). Active settings UI surfaces tolerate both through store/default merges, but this remains a dual rule model.

### CONFLICTING_STATE

- `src/store/emergencyStore.ts` is the active operational store; `src/store/emergency-store.ts` is a re-export shim with a test initial-state helper. This is acceptable legacy compatibility, but new imports should use `emergencyStore.ts`.
- Page route components still blend backend envelope data with local store fallbacks for patients, queues, reassessment, capacity, referrals, and copilot context. This is intentional for disconnected/demo operation, but it means the active UI can display merged backend/local state.
- `useCareDroidCentralNode()` can build from local store and then hydrate from backend snapshot. The central-node builder is canonical, but source status must remain visible because the snapshot may be store-derived or backend-derived.

### CONFLICTING_ROUTE

- `CANONICAL_ROUTES` still includes future/non-rendered emergency routes such as command center, journey, simulation, federated learning, digital twin, provincial health, integrations, and AI governance. `CANONICAL_APP_ROUTE_TREE` restricts the active route surface and legacy redirects collapse those future paths back to active Emergency OS pages.
- `App.jsx` has a few direct path literals for tool redirects and catch-all emergency handling. They are compatibility redirect logic and not a second page registry.
- Tests contain hard-coded `/emergency/*` paths as acceptance fixtures. These are not runtime sources of truth.

### CONFLICTING_LAYOUT

- `src/components/AppShell.tsx` is the active shell imported by `src/App.jsx`.
- `src/layout/AppShell.jsx` is a large legacy shell with its own header, keyboard shortcuts, alert drawer, capacity detail, command palette handling, and CSS. It is not runtime-mounted but remains referenced by legacy audits/tests. It should stay manual-review until tests that still inspect it are retired or rewritten.
- New components `Header.tsx`, `PatientCard.tsx`, `ReferralPanel.jsx`, and `EMSPipeline.jsx` are active Emergency OS surfaces inside the canonical shell, not separate shells.

### CONFLICTING_PROVIDER

- `NotificationContext.jsx` is the implementation; `NotificationContext.js` is a compatibility re-export. Existing imports resolve to the implementation through extension resolution.
- Test harnesses mount subsets of `ThemeProvider`, `UserProvider`, `NotificationProvider`, and `ConversationProvider` to render route tests. Runtime provider ownership remains in `src/App.jsx`.
- No second runtime `BrowserRouter` was found in the active app path.

### LEGACY_COMPAT

- `src/store/emergency-store.ts` remains as a re-export helper.
- `src/config/navigation.config.js` remains a compatibility projection for older nav consumers.
- `src/navigation/primaryNavigation.js` is already documented as a re-export shim by existing duplicate-system audit data.
- `/api/v1/governance/*` optional aliases are documented as compatibility aliases; active frontend clients should prefer `/api/emergency/governance/*`.
- Platform route aliases such as `/assistant`, `/chat`, `/copilot`, `/settings/*`, `/workspace/emergency/*`, and `/calculators/*` are retained redirects into the Emergency OS route surface.

### PENDING_PARALLEL_WORK

- State reconciliation and data freshness are active worker areas; no broad changes were made to backend/local fallback merging.
- Alerts/escalation, optional runtime EMS writes, and central-node source freshness overlap likely active workers; this report documents their dual representations without changing contracts.
- Whiteboard dominance and repository simplification may retire `src/layout/AppShell.jsx` and older audit tests; this pass did not delete or move it.
- Operational metrics may rationalize module ids across settings, central node, backend defaults, and navigation. This pass left module id convergence as pending.

### MANUAL_REVIEW

- Decide whether frontend/backend emergency models should share a generated contract or remain manually normalized.
- Decide whether `waitTimeCtiticalMin` should be migrated with a deliberate persistence migration, or kept forever as a stable compatibility key.
- Decide whether optional Mongoose runtime routes should become first-class Emergency OS routes, stay gated demo routes, or be removed from active inventories.
- Decide whether the legacy `src/layout/AppShell.jsx` tests still protect useful behavior or now preserve a dead shell.
- Decide whether alert severity should standardize to Emergency OS `Info/Warning/Critical` across all alert-like utilities, or remain scoped by domain.

## Safe Fix Applied

Changed file:

- `src/config/commandPalette.config.js`

Before:

```text
commandPalette.config.js
  -> inline command route list
  -> duplicate paths also owned by unified-navigation.config.ts and routes.config.js
```

After:

```text
unified-navigation.config.ts NAVIGATION_ITEMS
  -> getPilotCustomerNavigationItems()
  -> commandPalette.config.js routeCommandFromNavigationItem()
  -> EMERGENCY_OS_ROUTE_COMMANDS
```

The command palette now gets active pilot navigation route commands from the canonical nav registry. It still keeps explicit direct commands for `/emergency/pulse` and `/emergency/shift` because those are intentionally mounted but hidden from the pilot rail.

## Validation

Commands run from `C:\Users\borah\CareDroid-Clinical-AI`:

```text
npx eslint "src/config/commandPalette.config.js"
```

Result: passed with no output.

```text
npx vitest run "src/layout/AppShell.navigation.test.jsx" "src/config/emergencyRolePermissions.test.js" "src/components/CommandPalette.test.tsx" "src/data/emergencyPageRenderInventory.test.js"
```

Result: passed. 4 test files, 20 tests.

```text
npm run typecheck:frontend
```

Result: passed.

## Final Position

The active product spine is one repository, one Emergency OS route tree, one runtime AppShell, one canonical navigation registry, one primary Emergency OS API facade, one operational store, one central-node snapshot builder, one provider stack, and one CSS-token-led design language.

The repository is still fighting itself where legacy compatibility, optional runtime APIs, backend/frontend model duplication, and settings/module-id drift remain. Those were classified above and left for manual or parallel-worker review unless the convergence was local, obvious, and validated.
