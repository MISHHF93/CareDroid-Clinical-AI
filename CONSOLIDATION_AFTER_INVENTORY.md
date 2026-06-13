# Consolidation After Inventory

Generated after R2-R14 consolidation work.

## Patient Display: Before -> After
- Before: canonical `src/components/PatientCard.tsx` and `src/components/PatientDetailPanel.tsx`, plus duplicate implementations in `src/components/EmergencyPatientCard.jsx`, `src/components/EmergencyPatientDetailPanel.jsx`, and `src/components/EmergencyWhiteboard.jsx`.
- After: active routes mount `src/pages/emergency/index.tsx`, `src/components/PatientCard.tsx`, and `src/components/PatientDetailPanel.tsx`.
- After: legacy display files remain only as compatibility stubs that re-export canonical components/pages.

## State Stores: Before -> After
- Before: `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`, `frontend/src/store/emergency-store.ts`, and root `store/emergencyStore.ts` competed as Emergency OS state surfaces.
- After: `src/store/emergencyStore.ts` is canonical.
- After: `src/store/emergency-store.ts` and root `store/emergencyStore.ts` redirect to the canonical store.
- After: canonical store includes patients, staff, rooms, capacity, activeShift, emsUnits/emsArrivals, referrals, alerts, selectedPatientId, copilotOpen, activeQueueFilter, loading, features, workflow logs, note/referral/reassessment actions, and legacy selectors.

## AI Clients: Before -> After
- Before: root `lib/ai/client.ts` directly called Anthropic, while frontend services called chat/copilot backend routes directly.
- After: `src/lib/ai/client.ts` provides browser-safe `callAI` and `streamAI` for COPILOT_CHAT, HANDOFF_BRIEF, SCORE_ASSIST, INTAKE_SUGGEST, and PROTOCOL_SUGGEST.
- After: Copilot panel uses `callAI`; backend/provider secrets remain backend-owned.
- Remaining: broader non-ED/future chat callers still use `src/services/clinicalChatService.js` as a compatibility route wrapper.

## Dashboard Pages: Before -> After
- Before: broad dashboard/workspace routes and legacy aliases remained in route/config files.
- After: active app routes redirect non-ED entry points to Emergency OS and mount canonical Emergency OS whiteboard/tools/shift surfaces.
- Remaining: many non-ED page files remain in the repo as unmounted/future modules and test/data inventory references.

## Type Files: Before -> After
- Before: canonical `src/types/emergency.ts` missed several fields used by active ED flows and legacy store actions.
- After: `src/types/emergency.ts` includes PatientState, P1-P5 Priority, priority normalization, richer Note/Referral/Reminder/EMS/feature/capacity metadata, and alert/workflow metadata alignment.

## Alert Systems: Before -> After
- Before: capacity, qSOFA, and detail-panel escalation created alerts directly.
- After: `src/engine/alertEngine.ts` owns `dispatchAlert`, `dispatchScoreAlert`, and `dispatchCriticalVitalsAlerts`; root `engine/alertEngine.ts` redirects to it.
- Remaining: legacy notification/clinical-alert pages and services still exist but are outside the active Emergency OS alert dispatch path.

## Navigation Components: Before -> After
- Before: `src/components/Sidebar.tsx` consumed a shim to `frontend/src/config/unified-navigation.config.ts`; broader platform navigation configs also existed.
- After: `src/config/unified-navigation.config.ts` defines one Emergency OS sidebar set: Whiteboard, EMS, Referrals, Capacity, Tools, Shift, Settings.
- After: `src/components/Sidebar.css` includes mobile bottom-tab behavior.
- Remaining: broader navigation inventory/test files still exist for future modules.

## Calculator Locations: Before -> After
- Before: `src/pages/tools/Calculators.jsx`, standalone tool routes, and `src/pages/emergency/ClinicalCalculatorHub.jsx` coexisted.
- After: `src/components/ClinicalCalculatorHub.tsx` is the canonical component target and wraps the Emergency OS hub.
- After: `/tools/*` and `/calculators/*` redirect to `/emergency/tools` with `open`/`tool` query support.
- After: calculator saves use a standard note/timeline pattern and dispatch unified alerts for high/critical score outputs.

## Files Removed / LOC Removed
- Files physically removed: 0. Duplicate implementations were stubbed rather than deleted where tests/future modules still import them.
- Files substantially stubbed/redirected: `src/components/EmergencyPatientCard.jsx`, `src/components/EmergencyPatientDetailPanel.jsx`, `src/components/EmergencyWhiteboard.jsx`, root `store/emergencyStore.ts`, and root `engine/{alertEngine,capacityEngine,reassessmentEngine}.ts`.
- `git diff --stat` currently reports 55 changed files with 2,221 insertions and 8,016 deletions across the full working tree. This includes pre-existing/other-agent changes visible in the moving repo, not only this consolidation.

## Verification
- `npm run typecheck:frontend` - passed.
- `npm run build` - passed. Warnings: existing chunk-size/code-splitting warnings for large calculator/vendor bundles and one dynamic/static import warning for `offlineService.js`.
- `npx vitest run src/store/emergency-store.test.ts src/components/PatientCard.clinicalIntelligence.test.jsx src/components/EmergencyWhiteboard.storeReactivity.test.jsx src/pages/tools/Calculators.route.test.jsx` - passed, 29 tests.
- `ReadLints` on edited frontend files - no linter errors found.

## Blockers / Risks
- The repo remains a moving dirty tree with many backend/test/config edits that were not part of this consolidation pass.
- `caredroid.sqlite` remains untracked and was not modified.
- Some non-ED/future module files and data inventories remain present by design; they are redirected or unmounted rather than deleted.
- Direct AI compatibility services still exist for broader modules; active ED Copilot is migrated to the unified browser-safe client.

STATUS: EMERGENCY OS CORE CONSOLIDATED; LEGACY/FUTURE MODULE STUBS REMAIN

## R15 - After Inventory Mirror

Generated as the R15 mirror of R1. This section compares against `DUPLICATE_MAP.md` R1 counts and uses Windows-safe `rg`/glob equivalents instead of Unix `find | xargs | grep` pipelines.

Important mapping notes:
- R1 Search 1-8 comparable before total: 158 files/hits.
- R1 full grand total: 208, but that includes Search 9 API clients and Search 10 layout/shell files, which R15 did not ask to rerun.
- Several original grep patterns are broad and catch tests, CSS, support components, and data references. Counts below use the actual mirrored file hits, then classify canonical expected files separately.

### Search 1 - Patient Display Components

Equivalent used:
- `rg -l "patient|Patient" src -g "*.tsx"`
- Intersected with TSX files returning JSX. The literal line-oriented `return.*<div|return.*<tr|return.*<li` form returned 0 because these files use `return (` followed by JSX on the next line.

Actual after count: 12 TSX file hits.

Expected canonical files:
- `src/components/PatientCard.tsx` - expected, canonical patient card.
- `src/components/PatientDetailPanel.tsx` - expected, canonical patient detail surface.

Residual broad-search hits:
- `src/components/Header.tsx` - low risk; patient count/header context, not a patient display duplicate.
- `src/pages/emergency/index.tsx` - medium risk; canonical Emergency OS page renders patient grid by composing `PatientCard`.
- `src/components/AppShell.tsx` - low risk; shell mounts patient detail and store-driven UI.
- `src/components/QuickIntake.tsx` - low risk; intake form creates patients, not duplicate display.
- `src/components/ClinicalCalculatorHub.tsx` - low risk; calculator wrapper/context.
- `src/components/calculators/PediatricDrugCalc.tsx` - low risk; patient-scoped calculator.
- `src/components/calculators/qSOFA.tsx` - low risk; patient-scoped calculator.
- `src/components/calculators/HEARTScore.tsx` - low risk; patient-scoped calculator.
- `src/components/Sidebar.tsx` - low risk; reassessment badge references patients.
- `src/components/CopilotPanel.tsx` - low risk; patient context for copilot.

Status: Expected implementation count is supported at 2 canonical components, but the broad mirrored search returns 12 and therefore does not match the expected raw count.

### Search 2 - State Stores

Equivalent used:
- Exact intent: `rg -l "create\(" src -g "*.ts"` filtered to store paths.
- Zustand TypeScript-safe intent: `rg -l "create(?:<|\()" src -g "*.ts"` filtered to store paths.

Actual after count: 1 creator file.

Expected/canonical files:
- `src/store/emergencyStore.ts` - expected, canonical Zustand creator.

Residual/mapping note:
- `store/featureStore.ts` exists and is expected by the R15 wording, but it is outside `src/` and is now a compatibility re-export from `src/store/emergencyStore.ts`, not a second `create(...)` store creator.
- The exact `create\(` variant returns 0 because the Zustand creator is typed as `create<...>()(...)`.

Status: Raw mirrored creator count is 1, not 2. Consolidation risk is low because the extra expected feature store is no longer an independent store.

### Search 3 - AI Callers

Equivalent used:
- `rg -l "anthropic|openai" src -g "*.ts"`

Actual after count: 1.

Expected canonical files:
- `src/lib/ai/client.ts` - expected; the only `anthropic`/`openai` hit under `src` TypeScript.

Residual files: none.

Status: Matches expected raw count.

### Search 4 - Dashboard / Workspace Pages

Equivalent used:
- Globbed `src/pages/**/*.tsx`; `src/app` does not exist.

Actual after count: 2 TSX page files.

Expected/canonical files:
- `src/pages/emergency/index.tsx` - expected Emergency OS route.

Residual files:
- `src/pages/AIGovernanceDashboard.tsx` - medium risk residual TSX page/alias outside the Emergency OS page directory.

Status: Does not match the expected raw count of only Emergency OS TSX routes. Note that this search only measures TSX pages and does not include the many JSX page files still present in `src/pages`.

### Search 5 - Type Definitions

Equivalent used:
- `rg -l "export interface Patient|export enum PatientState" src`

Actual after count: 1.

Expected canonical files:
- `src/types/emergency.ts` - expected.

Residual files: none under `src`.

Mapping note:
- A broader repo-wide search also finds backend DTO/model patient interfaces, but R15 asked for `src/`, and the expected frontend Emergency OS type source is singular.

Status: Matches expected raw count.

### Search 6 - Alert / Notification Systems

Equivalent used:
- `rg -l "toast\.|Toaster|ToastProvider" src`

Actual after count: 5 raw files.

Expected canonical files:
- `src/engine/alertEngine.ts` - expected alert/toast dispatch engine.
- `src/components/AppShell.tsx` - expected `Toaster` mount.

Residual files:
- `src/components/AppShell.r12.test.tsx` - low risk; test reference.
- `src/engine/alertEngine.test.ts` - low risk; test reference.
- `src/components/notifications/NotificationToast.css` - medium/low risk; legacy notification styling remains in source tree and is caught by the broad pattern.

Status: Production implementation is effectively 2, but the raw mirrored search returns 5 because tests and legacy CSS remain.

### Search 7 - Navigation Components

Equivalent used:
- `rg -l "NavLink|sidebar.*nav|nav.*item" src -g "*.tsx"`

Actual after count: 2 raw TSX files.

Expected canonical files:
- `src/components/Sidebar.tsx` - expected.

Residual files:
- `src/components/Sidebar.test.tsx` - low risk; test reference.

Status: Production implementation matches expected at 1, but the raw mirrored search returns 2 because it includes the test file.

### Search 8 - Clinical Calculators

Equivalent used:
- `rg -l "score|Score|HEART|qSOFA|NIHSS" src -g "*.tsx"`

Actual after count: 13 TSX file hits.

Canonical calculator implementation location:
- `src/components/calculators/` - expected location.
- Files currently present there: `HEARTScore.tsx`, `qSOFA.tsx`, `PediatricDrugCalc.tsx`.

Residual broad-search hits outside `src/components/calculators/`:
- `src/components/Header.tsx` - low risk; capacity score label.
- `src/pages/emergency/index.tsx` - low risk; capacity score stat.
- `src/components/R12EndToEndWiring.test.tsx` - low risk; test reference.
- `src/components/PatientCard.tsx` - low risk; displays score badges from patient notes.
- `src/components/PatientDetailPanel.tsx` - medium/expected composition; launches canonical calculators.
- `src/components/QuickIntake.tsx` - low risk; suggested score IDs.
- `src/pages/AIGovernanceDashboard.tsx` - low risk; DPS score governance copy.
- `src/components/ClinicalCalculatorHub.test.tsx` - low risk; test reference.
- `src/components/ClinicalCalculatorHub.tsx` - medium/expected composition; canonical hub wrapper outside calculator implementation folder.
- `src/components/CopilotPanel.tsx` - low risk; capacity score context.

Status: Calculator implementation location is consolidated to 1 directory, but the raw mirrored file count is 13 because score terms appear in routing, context, tests, and displays.

### BEFORE -> AFTER Comparison

- Patient display: 8 -> 12 raw hits; 2 canonical implementation files.
- State stores: 16 -> 1 raw creator file; `store/featureStore.ts` remains only as a re-export compatibility surface.
- AI clients/callers: 6 -> 1.
- Dashboard/workspace pages: 33 -> 2 TSX page files; 1 Emergency OS TSX route plus 1 AI Governance residual.
- Type files: 9 -> 1 under `src`.
- Alert systems: 14 -> 5 raw hits; 2 production alert/toast system files.
- Nav components: 11 -> 2 raw TSX hits; 1 production component.
- Calculator locations: 61 -> 13 raw TSX hits; 1 canonical calculator implementation directory.

Comparable R1 Search 1-8 total: 158 -> 37 raw R15 hits.

Estimated duplicate inventory reduction: 121 file hits.

If using the R1 full grand total of 208 against the R15 eight-search raw total of 37, the arithmetic reduction is 171, but that comparison is not exact because R15 did not rerun R1 Search 9 API clients or Search 10 layout/shell files.

### Files Removed / LOC Removed

- Tracked physical deletions visible in `git status --short --untracked-files=no`: 3 files (`frontend/src/config/unified-navigation.config.ts`, `src/components/EmergencyPatientCard.jsx`, `src/components/EmergencyPatientDetailPanel.jsx`).
- Estimated removed duplicate inventory from comparable R1/R15 searches: 121 file hits.
- `git diff --stat` estimate for the full current working tree: 189 files changed, 4,931 insertions, 5,548 deletions, net -617 lines. This is a noisy working-tree estimate and includes other consolidation changes already present before R15.

### Final Status

R15 result: Emergency OS core consolidation is substantially supported, but the mirrored after inventory does not fully support the requested success statement as a raw search result.

Target statement remains: One product. One language. One system. Emergency OS.

Blockers/residuals:
- Patient display search returns 12 raw TSX hits because support components, calculators, shell, and page composition still reference patients.
- Dashboard/workspace TSX search still finds `src/pages/AIGovernanceDashboard.tsx`.
- Alert/toast search still finds tests plus legacy `src/components/notifications/NotificationToast.css`.
- Navigation search still finds `src/components/Sidebar.test.tsx`.
- Calculator search still finds score references outside `src/components/calculators/`, though calculator implementations are consolidated to that directory.
