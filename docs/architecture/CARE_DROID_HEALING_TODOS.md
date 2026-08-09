# CareDroid Healing TODOs — Living Ledger

**This is the canonical, continuously-maintained engineering TODO ledger for the CareDroid repository-convergence healing campaign.** It is source-of-truth for what is broken, what has been fixed, what remains, and why. Every entry cites real source/runtime/test evidence — nothing here is speculative.

**Supersedes** (historical, last touched 2026-07-15/17, pre-dates the current campaign which has run continuously since 2026-08-03 through 45+ commits documented in `CareDroid-Emergency-OS-Master-Scorecard.html`): `MASTER_TODO.md`, `AI_MASTER_TODO.md`. Those files are kept for historical reference only — do not add new entries there. Their OPEN items were not blindly imported here; each was re-verified against current source before being carried forward, and most were not (the codebase has moved substantially since Cycle 82).

**Companion evidence documents**: `CareDroid-Emergency-OS-Master-Scorecard.html` (12-domain, 1000-point scorecard — the primary score-of-record), `AI_ORCHESTRATION_AUDIT.md`, `SOURCE_WIRING_AUDIT.md`, `docs/duplicate-system-audit.md`, `docs/orphan-detection-report.md`, `docs/backend-exposure-report.md`, persistent memory at `project-scorecard-campaign.md`.

## Status legend

`DISCOVERED` → `CONFIRMED` → `IN_PROGRESS` → `FIXED_PENDING_VALIDATION` → `VALIDATED` (terminal, success)
`BLOCKED` (external dependency) · `QUARANTINED` · `WONT_FIX_WITH_REASON` (terminal) · `SUPERSEDED` (terminal)

## Severity legend

`P0_CRITICAL` (patient safety / security / fabricated clinical data / auth bypass) · `P1_HIGH` (real functional break, split architecture, broken contract) · `P2_MEDIUM` (real but contained, dead code, UX fragmentation) · `P3_LOW` (cosmetic, documentation)

---

## VALIDATED (this campaign, most recent first)

### HEAL-021 — `TrainingService` was entirely in-memory; real training runs and their provenance were lost on every backend restart (HEAL-EPIC-D, third bounded slice)

- **Severity**: P2_MEDIUM
- **Domain**: Persistence ownership (HEAL-EPIC-D's "AI evaluation" domain — `TrainingService` is a structural sibling of `EvaluationService`/HEAL-020, explicitly flagged as the next target when HEAL-020 closed)
- **Source evidence**: `TrainingService` was backed by `private readonly runs: TrainingRun[] = [...]` (2 hardcoded baseline/seed entries) — no `@InjectRepository`, no database call anywhere. Two real mutation points, both losing data on restart: `createRun()` (`this.runs.unshift(run)`) and `evaluateRun()` (mutates an existing run's `status`/`metrics`/`provenance`/`updatedAt` in place — a second write path `EvaluationService` didn't have). The class already had an existing `onModuleInit()` (calling `syncUnifiedModelMetricsFromDisk()`, which refreshes the 2 baseline runs' metrics from real `ml-services/models/<head>/metrics.json` files on every boot) — extended rather than duplicated.
- **Affected files**: `backend/src/modules/training/entities/training-run.entity.ts` (new), `backend/src/database/migrations/1772702300000-CreateTrainingRuns.ts` (new), `backend/src/modules/training/training.module.ts` (`TypeOrmModule.forFeature` added), `backend/src/modules/training/training.service.ts` (`onModuleInit()` made `async` and extended with rehydration; write-through added to both `createRun()` and `evaluateRun()`), `backend/src/modules/training/training-run-persistence.spec.ts` (new, 5 tests)
- **Runtime impact**: Real training runs (both newly queued and later evaluated) now survive a process restart. The 2 hardcoded baseline runs (`training-run-baseline`, `training-run-artifact-router`) are deliberately never persisted and are always protected from a stale DB row by the existing duplicate-id skip — a dedicated test confirms a colliding persisted row can never override their fresh-from-disk sync.
- **Frontend impact**: None directly.
- **Backend impact**: New `training_runs` table (`id` primary key, single `runJson` text column — same JSON-blob-per-row strategy as HEAL-019/020). Same fire-and-forget `.save().catch()` write-through pattern.
- **Data impact**: Real durability added for a domain that previously had none.
- **AI/ML impact**: Closes the same class of gap HEAL-020 closed for `EvaluationService` — provenance-honest training records are now durable across the whole `evaluation`/`training` sibling-module pair, not just one of the two.
- **Affected user profiles**: Site Admin / AI governance reviewers consulting the Training Dashboard for real historical run data.
- **Security/privacy impact**: None (no PHI in training runs).
- **Clinical-safety impact**: Indirect — same reasoning as HEAL-020 (model-promotion decisions depend on a real historical run count).
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — TypeORM entity + migration + extended `OnModuleInit` rehydration + fire-and-forget write-through at both mutation points, following the exact `ReferralService`/`EMSIntakeService`/`EmergencySettingsService`/`EvaluationService` pattern.
- **Validation requirements**: Backend `tsc --noEmit -p tsconfig.build.json` clean. Real `nest build` succeeded. Migration verified end-to-end against an isolated throwaway SQLite file. New spec file: 5/5 passing (persist-on-create, persist-on-evaluate, rehydrate-and-merge, baseline-run-never-overridden-by-stale-DB-row, graceful degradation with no repository). Full `training` module suite re-verified: 4/4 suites, 35/35 tests (including the pre-existing untouched `training.service.spec.ts`/`training.controller-authorization.spec.ts`/`ml-services/nlu/training/training.spec.ts`, confirming no regression). ESLint clean (1 auto-fixed formatting issue).
- **Commit when resolved**: `TBD` (this round, pending commit).
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-020 — `EvaluationService` was entirely in-memory; real AI evaluation runs and their provenance were lost on every backend restart (HEAL-EPIC-D, second bounded slice)

- **Severity**: P2_MEDIUM
- **Domain**: Persistence ownership (HEAL-EPIC-D's "AI evaluation" domain)
- **Source evidence**: `EvaluationService` (`backend/src/modules/evaluation/evaluation.service.ts`) was backed entirely by `private readonly runs: EvaluationRun[] = this.bootstrapRuns();` — no `@InjectRepository`, no database call anywhere in the class (confirmed via grep of `this.runs.` — `createRun()`'s `unshift()` is the only mutation point). This campaign already invested heavily in making these exact records honestly labeled — the 2026-08-08 "AI Orchestration Pipeline Audit" fix made `ChatService.processMessage()` call `recordEvaluationRun()` with correct `seedOnly`/`provenance` tagging on every real live copilot conversation — but every one of those real runs, and the carefully-tracked provenance distinguishing them from seed data, was silently lost on every backend restart, undermining that earlier honesty work every time the process recycled.
- **Affected files**: `backend/src/modules/evaluation/entities/evaluation-run.entity.ts` (new), `backend/src/database/migrations/1772702200000-CreateEvaluationRuns.ts` (new), `backend/src/modules/evaluation/evaluation.module.ts` (`TypeOrmModule.forFeature` added), `backend/src/modules/evaluation/evaluation.service.ts` (`implements OnModuleInit`, optional injected repository, rehydration + write-through), `backend/src/modules/evaluation/evaluation-run-persistence.spec.ts` (new, 5 tests)
- **Runtime impact**: Real evaluation runs now survive a process restart. Seed/demo runs (`bootstrapRuns()`) and the file-based offline-harness fixture (`loadMeasuredOfflineRun()`) are untouched — persisted runs are rehydrated and prepended in front of them, matching `createRun()`'s own existing `unshift()` ordering (newest/most-real first), with duplicate-id detection so a persisted row can never double up against a bootstrap/seed run with the same id.
- **Frontend impact**: None directly.
- **Backend impact**: New `evaluation_runs` table (`id` primary key, single `runJson` text column storing the whole `EvaluationRun` record — same JSON-blob-per-row strategy as HEAL-019, since `metrics` is itself a nested object this codebase already treats atomically). Same fire-and-forget `.save().catch()` write-through pattern already established by `ReferralService`/`EMSIntakeService`/`EmergencySettingsService` in this codebase.
- **Data impact**: Real durability added for a domain that previously had none; a malformed persisted row is logged and skipped rather than crashing boot (verified by test).
- **AI/ML impact**: Closes a real gap in this campaign's own AI-governance evaluation infrastructure — provenance-honest records (MEASURED/SEED_ONLY/UNKNOWN/etc.) are now durable, not just honestly labeled in memory until the next restart.
- **Affected user profiles**: Site Admin / AI governance reviewers consulting the AI Evaluation Dashboard (`AiEvaluationDashboard.tsx`) for real historical trend data.
- **Security/privacy impact**: None (no PHI in evaluation runs).
- **Clinical-safety impact**: Indirect — evaluation trend/promotion decisions depend on a real historical run count; losing real runs on every restart could understate the actual measured evidence available for a model-promotion decision.
- **Current status**: `VALIDATED`
- **Dependencies**: None. `TrainingService` (`backend/src/modules/training/training.service.ts`) is a structural sibling with the exact same in-memory-only shape (`private readonly runs: TrainingRun[]`, confirmed via the same grep method, zero `@InjectRepository` anywhere) and the same real-runs-lost-on-restart risk — deliberately NOT fixed in this same round to keep this slice bounded; flagged as the next natural HEAL-EPIC-D candidate.
- **Recommended canonical solution**: Applied — TypeORM entity + migration + `OnModuleInit` rehydration + fire-and-forget write-through, following the exact pattern established by `ReferralService`/`EMSIntakeService`/`EmergencySettingsService` (HEAL-019) in this codebase.
- **Validation requirements**: Backend `tsc --noEmit -p tsconfig.build.json` clean. Real `nest build` (not just typecheck) succeeded. Migration verified end-to-end against an isolated throwaway SQLite file (not the real dev database) — `up()` creates the table, insert/select round-trips the JSON blob, `down()` cleanly drops it. New spec file: 5/5 passing (persist-on-create, rehydrate-and-merge, no-duplicate-on-id-collision with bootstrap/seed runs, graceful degradation with no repository, malformed-JSON row doesn't crash boot). Full `evaluation` module suite re-verified: 3/3 suites, 23/23 tests passing (including the pre-existing `evaluation.service.spec.ts` and `evaluation.controller-authorization.spec.ts`, both untouched, confirming no behavior regression). `chat.service.spec.ts` (the real caller of `createRun()` via `recordEvaluationRun()`) re-verified: 17/17 passing. ESLint clean (1 auto-fixed formatting issue).
- **Commit when resolved**: `4d5af4e7`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-019 — `EmergencySettingsService` was entirely in-memory; hospital-tuned safety thresholds silently reverted to defaults on every backend restart (HEAL-EPIC-D, first bounded slice)

- **Severity**: P1_HIGH
- **Domain**: Persistence ownership (HEAL-EPIC-D's "Settings" domain)
- **Source evidence**: `EmergencySettingsService` (`backend/src/modules/emergency-os/emergency-os.services.ts`) was backed entirely by `private readonly byOrganization = new Map<string, EmergencyOsSettingsContract>()` — no `@InjectRepository`, no database call anywhere. `getSettings()`/`updateSettings()` (real, tenant-scoped, `CONFIGURE_SYSTEM`-gated routes on `EmergencyOsController`) read/write only that in-memory map. `EmergencyOsSettingsContract` includes `reassessmentThresholds` (P1-P5 minute intervals controlling when a patient gets flagged `ReassessmentDue`), `capacityThresholds` (warning/critical percentages), `emsThresholds` (offload target minutes), and `notificationSettings` (escalation minutes) — all safety-relevant operational configuration a hospital could legitimately tune away from defaults. Every one of those customizations was lost on every backend restart/redeploy, silently reverting to hardcoded defaults with no error, no warning, and no way for staff to know their configured thresholds had reverted. Not previously documented anywhere in this campaign's ledger, scorecard, or audit docs — confirmed via direct grep before starting.
- **Affected files**: `backend/src/modules/emergency-os/entities/emergency-os-settings.entity.ts` (new), `backend/src/database/migrations/1772702100000-CreateEmergencyOsSettings.ts` (new), `backend/src/modules/emergency-os/emergency-os.module.ts` (entity registered in `TypeOrmModule.forFeature`), `backend/src/modules/emergency-os/emergency-os.services.ts` (`EmergencySettingsService` now `implements OnModuleInit`, optional injected repository, rehydration + write-through), `backend/src/modules/emergency-os/emergency-os-settings-persistence.spec.ts` (new, 6 tests)
- **Runtime impact**: Settings changes now survive a process restart. No behavior change for any caller when the database is unavailable (optional injection, matches `ReferralService`/`EMSIntakeService`'s established graceful-degradation pattern — verified via a dedicated test).
- **Frontend impact**: None directly — `emergencySettingsApi.tsx`'s existing contract is unchanged; the fix is entirely backend-side persistence.
- **Backend impact**: New `emergency_os_settings` table (`organizationId` primary key, `settingsJson` text column storing the whole contract as one JSON blob — matching how this service already treats the contract atomically everywhere via `materializeSettings`/`mergeSettings`/`clone`, deliberately not decomposed into dozens of relational columns for an 11-section nested config object). Rehydration on boot deep-merges each persisted row onto today's defaults (`mergeSettings(this.defaultSettings, persisted)`), so a schema change adding new default fields never loses old persisted overrides and never leaves new fields `undefined`.
- **Data impact**: Real durability added for a domain that previously had none.
- **AI/ML impact**: N/A.
- **Affected user profiles**: Site Admin (the only role with `CONFIGURE_SYSTEM`, the sole caller of `updateSettings()`); indirectly every profile whose workflow depends on the tuned thresholds (Triage Nurse/reassessment intervals, Charge Nurse/capacity warnings, EMS Handoff/offload targets).
- **Security/privacy impact**: None (no PHI in this table).
- **Clinical-safety impact**: Real — a hospital that had deliberately tightened a P1 reassessment interval for safety reasons would have silently had it widen back to default after any restart, with zero indication to staff. This fix closes that silent-reversion risk.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — TypeORM entity + migration + `OnModuleInit` rehydration + fire-and-forget write-through, following the exact established pattern already used by `ReferralService`/`EMSIntakeService`'s `updateArrivalStatus` in the same file.
- **Validation requirements**: Backend `tsc --noEmit -p tsconfig.build.json` clean. Real `nest build` (not just typecheck) succeeded. Migration verified end-to-end against an isolated throwaway SQLite file (not the real dev database) — `up()` creates the table, insert/select round-trips the JSON blob correctly, `down()` cleanly drops it. New spec file: 6/6 passing (persist-on-update, `__global__` fallback, rehydrate-and-merge-onto-defaults, per-tenant isolation, graceful degradation with no repository, malformed-JSON row doesn't crash boot). Full `emergency-os` backend module suite re-verified: 26/26 suites, 195/195 tests passing. ESLint clean (2 auto-fixed formatting issues).
- **Commit when resolved**: `f85ced58`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-018 — `CostTrackingContext.tsx`/`CostTrackingProvider` was globally-mounted dead code, deleted (HEAL-EPIC-A, second bounded slice)

- **Severity**: P3_LOW
- **Domain**: Dead-code reachability (HEAL-EPIC-A's "old stores/providers" category)
- **Source evidence**: Found via the same low-consumer-count sweep that surfaced HEAL-017: `src/contexts/CostTrackingContext.tsx` exported `CostTrackingProvider` (mounted at the app root) and `useCostTracking()`. Exhaustive grep for `useCostTracking` found only the context's own dedicated unit test (`renderHook`-based, tests the isolated hook/provider logic, not any real consuming UI) and one defensive `vi.mock(...)` in `routePagesSmoke.test.tsx` that was never actually exercised by any real route component. Unlike `WhiteLabelContext`/`OfflineProvider` (both checked and correctly kept — they mutate `document`/CSS variables or render real UI/perform real side effects independent of any hook consumer), `CostTrackingProvider` has no side effects beyond `localStorage` read of data that only changes via `trackToolCost()`/`updateCostLimit()`/`resetCostData()` — all 3 unreachable, since `useCostTracking()` is the only way to obtain them and it has zero real callers. No dashboard page (`CostAnalyticsDashboard.tsx`, the real, live cost page) actually imports it — confirmed directly, ruling out a `FUTURE_MODULE` classification. Independently corroborated by a separate, pre-existing audit catalog (`src/data/sourceCodeToolDiscovery.ts`) that already tags every tool ID sourced from `CostTrackingContext`'s `TOOL_COSTS`/`TOOL_ID_ALIASES` constants as `status: 'phantom'` — built by unrelated tooling, consistent with this same file never having been wired to anything real.
- **Affected files**: `src/contexts/CostTrackingContext.tsx` (deleted), `src/test/CostTrackingContext.test.tsx` (deleted — tested only the now-removed isolated logic, no real integration), `src/app/providers.tsx`, `src/routing/canonicalRouteTree.testShared.tsx`, `src/test/pilotWalkthrough.test.tsx` (import + provider-wrap removed), `src/test/routePagesSmoke.test.tsx` (dead defensive mock removed)
- **Runtime impact**: One fewer Context.Provider re-rendering on every app render for a component tree with zero real consumers.
- **Frontend impact**: No behavior change for any real user-facing feature (confirmed zero consumers). The real Cost Analytics Dashboard (`src/pages/ai/CostAnalyticsDashboard.tsx`) sources its data elsewhere and is untouched.
- **AI/ML impact**: N/A.
- **Affected user profiles**: None directly (invisible dead code).
- **Security/privacy impact**: None.
- **Clinical-safety impact**: None.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — `DELETE_PROVEN_DEAD` per the epic's own 6-way disposition taxonomy.
- **Validation requirements**: Full frontend `tsc --noEmit -p tsconfig.frontend.json` clean (whole-repo). ESLint clean on all 4 touched files. `vitest` blocked in this sandbox; change is purely subtractive and a full-repo `tsc` pass would catch any JSX/import mismatch.
- **Commit when resolved**: `a4d918e9`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-017 — `NotificationContext.tsx`/`NotificationProvider` was globally-mounted dead code, deleted (HEAL-EPIC-A, first bounded slice)

- **Severity**: P3_LOW
- **Domain**: Dead-code reachability (HEAL-EPIC-A's "old notification systems" category)
- **Source evidence**: `src/contexts/NotificationContext.tsx` exported `NotificationProvider` (mounted at the app root in `src/app/providers.tsx`, wrapping nearly the entire component tree) and a `useNotifications()` hook. Exhaustive grep for `useNotifications()` calls found zero real consumers anywhere in the app — its only 2 other references were both test-harness files (`src/routing/canonicalRouteTree.testShared.tsx`, `src/test/pilotWalkthrough.test.tsx`) that mirror `app/providers.tsx`'s own provider tree structurally, not tests of this context's own behavior. Git history places it in an older commit ("complete JS→TS migration") than the genuinely comprehensive, actively-used replacement, `src/contexts/NotificationShellContext.tsx`'s `NotificationShellProvider` (mounted in `AppShell.tsx`, consumed by `Sidebar.tsx`/`OperationalAlarmDock.tsx`/`SidebarNotificationPanel.tsx`, backed by `useNotificationCenter()` — a much larger, real system pulling from LWBS risk, deterioration watch, triage breach, EMS offload, and high-risk-complaint alert builders, all previously verified real in this campaign). `NotificationContext.tsx` itself had no dedicated test file. Applying last round's own "check for existing tests before assuming an oversight" lesson: confirmed no test exercises `useNotifications()`'s return value anywhere, only the app-root provider wrap — this is a clean dead-code case, not a deliberate deferral like the HEAL-008-round-3 near-miss.
- **Affected files**: `src/contexts/NotificationContext.tsx` (deleted), `src/app/providers.tsx`, `src/routing/canonicalRouteTree.testShared.tsx`, `src/test/pilotWalkthrough.test.tsx` (import + provider-wrap removed from all 3)
- **Runtime impact**: One fewer Context.Provider re-rendering (with a non-memoized `value` object literal, recomputed every render) on every `useEmergencyStore` alerts change, for a component tree with zero consumers — a small but real removal of wasted render work across nearly the whole app.
- **Frontend impact**: No behavior change for any real user-facing feature (confirmed zero consumers). `NotificationShellContext`/`useNotificationCenter` — the real notification system — untouched.
- **AI/ML impact**: N/A.
- **Affected user profiles**: None directly (invisible dead code); indirectly all profiles benefit from the small render-cost reduction.
- **Security/privacy impact**: None.
- **Clinical-safety impact**: None.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — `DELETE_PROVEN_DEAD` per the epic's own 6-way disposition taxonomy.
- **Validation requirements**: Full frontend `tsc --noEmit -p tsconfig.frontend.json` clean (whole-repo, not just an ad-hoc subset — confirms no transitive/barrel-export reference survived). ESLint clean on all 3 touched files. `vitest` blocked in this sandbox per established constraint; the change is purely subtractive (removing a provider wrap + its matching close tag), and a full-repo `tsc` pass would have caught any JSX mismatch as a compile error.
- **Commit when resolved**: `7a5dbaf4`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-008 — 9 of `EmergencyOsController`'s `DEMO`-labeled capability keys traced individually, all found genuinely real (same bug class as HEAL-002)

- **Severity**: P2_MEDIUM
- **Domain**: Documentation truthfulness / capability registry
- **Source evidence**: Per-key trace (controller method → service → confirm real-data-source vs. fixture), same method used for HEAL-002, applied to the `DEMO`-labeled keys HEAL-002's own investigation had flagged as needing individual verification. 9 confirmed real, not demo. 7 trace back to `EmergencyPatientService.listPatients()` (the same real, always-on TypeORM-backed patient list): `emergencyPatientJourney` (`getJourney()` → `PatientJourneyService.getJourney()`); `emergencyQueues` (`getQueues()` → `QueueIntelligenceService.getQueues()`, buckets by `state`); `emergencyBoarding` (`getBoarding()` → `BoardingService.getBoarding()`, filters by `isBoarding()`); `emergencyEmsRuntime` (`getEMS()` → `EMSIntakeService.getEMSIntake()`, filters by EMS flags/complaint text); `emergencyOperatingSurfaces` (`getOperatingSurface()` → `EmergencyOperatingSurfacesService.getSurface()`, assembles real patients/alerts/capacity/EMS/queues/analytics/referrals); `emergencyReassessment` (round 2: `getReassessment()` → `ReassessmentService.getReassessmentQueue()`, filters by `ReassessmentDue` flag); `emergencyPatientFlow` (round 2: `getPatientFlow()` → `PatientFlowService.buildSnapshot()`, composes real patients/staff/capacity/referrals via `buildBackendPatientFlowSnapshot()`, which contains zero fixture/demo/random data — its optional `OperationalIntelligenceService` dependency is used only for a realtime side-effect publish, never to source snapshot data). Round 3 added 2 more, different source: `emergencyCopilotRuntime` (`queryCopilot()` delegates to `ChatService.processMessage()`, the same real canonical AI dispatcher the live ED Copilot UI uses post the 2026-08-08 AI-Runtime Convergence fix; `listCopilotInteractions()` reads a real in-memory log populated by real DTO-driven writes, not seeded fixture data) and `emergencyDepartmentSettings` (`getSettings()`/`updateSettings()` read/write a real, tenant-scoped, in-memory settings store — same "in-memory + real mutation = REAL" standard already established for `emergencyPatients`/`emergencyReceptionSnapshot`). None of the 9 controller routes carry any feature-flag/Mongoose gate — confirmed by reading each route's decorators directly, only `@RequirePermission`. `emergencyDispatch` has no dedicated backend route at all (only a page-level capability pairing in `pageApiBinding.registry.ts`) — left uninvestigated. Checked but correctly left `DEMO`: `emergencyOperationalIntelligence`/`emergencyWorkflowOrchestration`/`careDroidUnifiedAINode` (`OperationalIntelligenceService.buildSnapshot()` mixes real patient data with `CareDroidCentralNodeService.getSnapshot()`, which backs the already-confirmed-demo `emergencyCentralNode` key — genuinely mixed, not a clean case); `emergencyAdvancedDecisionSupport` (covers `HybridDigitalTwinService`, which defaults its own `twinId` to `'ed-hybrid-des-abm-twin-demo'` and every response carries a self-reported `productionGaps()` disclosure — this subsystem honestly self-classifies as a demo/prototype simulation engine, an accurate label, not a mislabel); `emergencyThresholdSettings`/`emergencyAlertRuleSettings`/`emergencyShiftTemplates`/`emergencyStaffSettings` (zero frontend references anywhere outside this file itself — no evidence of what they gate, left un-traced rather than guessed).
- **Near-miss, corrected before landing**: while investigating `emergencyAdvancedDecisionSupport`, found `EmergencyOsController`'s 9 federated-learning/digital-twin routes carry no `@RequirePermission` decorator, which `AuthorizationGuard.canActivate()` fails open on ("If no permissions decorator, allow access"). Initially treated this as a fresh instance of the already-fixed "Cycle 240" bug class and added `Permission.VIEW_ANALYTICS` decorators (matching sibling `simulation/*` routes) plus a new regression test — but `emergency-os-patient-endpoints-authorization.spec.ts:127-152` already documents this as a **deliberate, reasoned Cycle-239 decision**: neither `FederatedLearningService` nor `HybridDigitalTwinService` injects `EmergencyPatientService` (no PHI-exposure risk), and no existing `Permission` value "cleanly fits" synthetic cross-hospital model state — left open pending a genuine product decision, not an oversight. Reverted the decorators and deleted the new spec file before committing. Logged as a lesson: check for existing test coverage asserting the *absence* of a decorator before assuming a missing one is a bug, the same discipline already applied (in the opposite direction) to not deleting things flagged "dead" without tracing the call graph first.
- **Affected files**: `src/config/backendApiCapabilities.ts`, `src/config/backendApiCapabilities.test.ts` (2 stale assertions corrected, 7 new assertions added for previously-unchecked keys)
- **Runtime impact**: None (label-only correction; the underlying routes were already always-on and already returning real data — this only fixes what the frontend's capability registry *claims* about them).
- **AI/ML impact**: N/A.
- **Affected user profiles**: Any developer/future-audit consulting `backendApiCapabilities.ts` as a source of truth for what's real vs. fixture-backed (this file is the campaign's own primary reference for that question).
- **Security/privacy impact**: None.
- **Clinical-safety impact**: None directly — but a stale DEMO label understates real capability, which is the opposite failure mode from the campaign's usual concern (false REAL claims); still worth correcting for the registry's own truthfulness.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied for the 9 confirmed keys. `emergencyDispatch`, `emergencyOperationalIntelligence`, `emergencyWorkflowOrchestration`, `careDroidUnifiedAINode`, `emergencyAdvancedDecisionSupport` (all checked, genuinely mixed/ambiguous/honestly-self-labeled, correctly left `DEMO`), and the remaining fully-un-traced `DEMO` keys (`emergencyWorkflowAudit`, `emergencyIntegrationHub` — already separately confirmed genuinely fixture-backed per HEAL-007, `emergencyProvincialHealth`, `emergencyThresholdSettings`/`emergencyAlertRuleSettings`/`emergencyShiftTemplates`/`emergencyStaffSettings` — zero frontend references, fleet/device/surveillance keys, etc.) remain open — do not batch-correct; each needs its own individual trace, per this exact finding's own demonstrated pattern that "DEMO" and "real-but-mislabeled" are not reliably distinguishable without reading the actual service code.
- **Validation requirements**: Frontend `tsc --noEmit` clean via ad-hoc tsconfig (`vitest` blocked in this sandbox). Empirically verified via standalone `tsx` scripts confirming all 9 keys now return `'real'`. Backend regression check: full `emergency-os` module suite, 25/25 suites, 189/189 tests passing both before and after the reverted near-miss (confirms no behavioral change to the underlying routes, consistent with this being a label-only fix).
- **Commit when resolved**: `236647a4` (round 1), `39c6013f` (round 2), `eb57ea96` (round 3)
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-001 — Hospital Map capacity KPIs permanently rendered demo data via a disabled-by-default endpoint

- **Severity**: P1_HIGH
- **Domain**: Frontend↔Backend contract / split persistence (Capacity)
- **Source evidence**: `src/services/emergencyAnalyticsApi.ts`'s `fetchEmergencyCapacityDashboard()` called `/api/emergency/capacity/dashboard` (`backend/src/modules/capacity/capacity.controller.ts`, Mongoose-only, `assertMongoReady()` throws 503 unless `ENABLE_MONGOOSE_EMERGENCY_OS=true`). Frontend capability gate `src/config/backendApiCapabilities.ts`'s `emergencyCapacityDashboard: DISABLED` meant `guardedJson()` short-circuited before ever calling the network — confirmed via direct read of `isBackendCapabilityEnabled()`. Even when reachable, `CapacityResponse`'s shape (`{score, color, triggers, recommendations, metrics}`) never matched what `src/pages/operations/HospitalMapDashboard.tsx` reads (`units`, `totalBeds`, `occupiedBeds`, `availableBeds`, `boardingPatients`) — confirmed by reading both shapes side by side.
- **Affected files**: `src/services/emergencyAnalyticsApi.ts`, `src/pages/operations/HospitalMapDashboard.tsx`, `src/pages/HospitalMapDashboard.css`, `src/config/backendApiCapabilities.ts`(+`.test.ts`), `src/hooks/useOperationsHubLiveFeeds.ts` (consumer, unchanged), `backend/src/modules/emergency-os/emergency-os.controller.ts` (target endpoint, unchanged), `lib/emergency-os/logic.ts` (canonical engine, unchanged)
- **Runtime impact**: Hospital Map Dashboard and Operations Hub live-feeds panel always showed hardcoded demo bed/boarding numbers, in every environment, regardless of backend configuration.
- **Frontend impact**: `HospitalMapDashboard.tsx`, `useOperationsHubLiveFeeds.ts` now receive real, live-computed KPIs.
- **Backend impact**: None — repointed to an already-existing, already-correct real endpoint (`EmergencyOsController.getCapacity()`). Old Mongoose `CapacityController` left in place (see HEAL-002).
- **Data impact**: None (read-only).
- **AI/ML impact**: None.
- **Affected user profiles**: Department Manager/Director, Site Admin, Charge Nurse (Hospital Map / Operations Hub viewers).
- **Security/privacy impact**: None — aggregate operational counts, no PHI.
- **Clinical-safety impact**: Real (moderate): a capacity gauge showing static demo numbers regardless of true department state could inform diversion/staffing decisions incorrectly if anyone treated it as live. A second, independent safety risk was found and fixed in the same round: naively wiring the real engine's 0-100 *pressure* score (higher = worse) into the page's legacy *availability*-style color thresholds (higher = better) would have silently inverted severity coloring. Fixed by deriving color from the canonical `band` field instead of a recomputed score threshold.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — repoint to `/api/emergency/capacity`, add a translation mapper, keep per-ward breakdown honestly labeled illustrative (no real per-ward tracking exists in the domain model).
- **Validation requirements**: `tsc --noEmit` clean (ad-hoc tsconfig, both source and new test file), ESLint clean, manual line-by-line trace of both the real-data and full-demo-fallback render paths (fallback path confirmed byte-for-byte unchanged). `vitest` blocked in this sandbox (`spawn UNKNOWN`, established this campaign) — 6 new tests written in `emergencyAnalyticsApi.capacity.test.ts` for future CI, not locally executed.
- **Commit when resolved**: `3e92f8d9`
- **Scorecard impact when resolved**: Master Scorecard Domain 3 (Whiteboard/Queue/Analytics-adjacent) or Domain 5 — pending next scorecard sync pass (see "Next steps" below).

### HEAL-002 — Stale `DEMO` capability label on a genuinely real, TypeORM-backed capacity endpoint

- **Severity**: P2_MEDIUM
- **Domain**: Documentation truthfulness / capability registry
- **Source evidence**: `src/config/backendApiCapabilities.ts`'s `emergencyCapacity: BACKEND_CAPABILITY_STATUS.DEMO` — but `EmergencyOsController.getCapacity()` → `CapacityService.getCapacity()` (`backend/src/modules/emergency-os/emergency-os.services.ts:2329`) → `EmergencyPatientService.computeCapacity()` → `calculateEmergencyOsCapacity()` (`lib/emergency-os/logic.ts`), which reads the real, always-on TypeORM patient repository. Directly verified, not inferred from the label.
- **Affected files**: `src/config/backendApiCapabilities.ts`, `src/config/backendApiCapabilities.test.ts`
- **Runtime/frontend/backend/data impact**: None — enabled-ness unchanged (`demo` and `real` both evaluate truthy), only the documentation-facing status string corrected.
- **AI/ML impact**: N/A
- **Affected user profiles**: N/A (internal documentation accuracy; indirectly affects any future engineer trusting this label)
- **Security/privacy/clinical-safety impact**: None directly, but mislabeling real capability surfaces as demo is the same failure class this whole campaign exists to catch (false claims about what's live vs. fixture-backed) — in this direction (real thing labeled fake) it doesn't create fabrication risk, just under-trust.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — corrected to `REAL` with an explanatory comment.
- **Validation requirements**: `tsc`/ESLint clean; test assertion updated to match.
- **Commit when resolved**: `3e92f8d9`
- **Scorecard impact when resolved**: None claimed (label-only correction).

### HEAL-003 — `AppNavigatorService` bypassed the shared LLM egress boundary

- **Severity**: P1_HIGH
- **Domain**: AI/ML Core Node — egress governance
- **Source evidence**: `backend/src/modules/app-navigator/app-navigator.service.ts`'s `groqAnswer()` called `api.groq.com` directly via a bespoke `fetch()`, bypassing `lib/ai/providers/egress.ts`'s `completeViaEgress()` — explicitly documented as "the single CareDroid LLM egress boundary" and confirmed as what both real backend AI callers (`chat.service.ts`, `ai.service.ts`) already route through via `lib/ai/serverClient.ts`.
- **Affected files**: `lib/ai/types.ts`, `lib/ai/toolRegistry.ts`, `backend/src/modules/app-navigator/app-navigator.service.ts`(+`.spec.ts`)
- **Runtime impact**: `AI_KILL_SWITCH`/`AI_EXTERNAL_LLM_DISABLED` would not have stopped this path during an incident; no `recordAiMonitorEvent` was ever emitted for it.
- **Frontend/data impact**: None.
- **AI/ML impact**: New `APP_NAVIGATION` `AIRequestType`; call now flows through the canonical egress boundary with kill-switch, circuit-breaker, and monitoring parity with every other real AI caller.
- **Affected user profiles**: All authenticated users (app-navigator is a non-clinical "where do I find X" helper, JWT-gated only).
- **Security/privacy impact**: Real — governance/kill-switch bypass closed.
- **Clinical-safety impact**: None directly (non-clinical feature).
- **Current status**: `VALIDATED`
- **Commit**: `6fc6f42d` (code), `1bdf362c` (scorecard)
- **Scorecard impact**: Domain 12 (AI Governance & Operational Intelligence), 15th recurrence entry, score held flat at 24/25.

### HEAL-004 — `ai/foundation/` dead duplicate expert-routing module

- **Severity**: P2_MEDIUM
- **Domain**: AI/ML Core Node — duplicate architecture
- **Source evidence**: `AiRoutingEngineService`/`AiContextManagerService`/`AiResponseComposerService` (1,402 lines/9 files) DI-registered and exported from `AiModule` but zero real callers anywhere in the backend (exhaustive grep, confirmed via `ai.module.ts`'s registration + the module's own 3 spec files only). `AiRoutingEngineService.createRoutePlan()` duplicated `MoERouterService`'s method of the same name — the real, live routing system `chat.service.ts` uses.
- **Affected files**: `backend/src/modules/ai/ai.module.ts`, `backend/src/modules/ai/foundation/*` (deleted), `AI_ORCHESTRATION_AUDIT.md`
- **Runtime/data/security impact**: None (dead code removal).
- **AI/ML impact**: Closes one of the "4 independent model/expert-selection systems" `AI_ORCHESTRATION_AUDIT.md` §3.2 had named; the other 3 (`MoERouterService`+`expert-selector`, `RoutingOptimizerService`, `lib/native-ai/panelOfExpertsRouter.ts`) were each individually investigated and closed — see HEAL-010b and HEAL-010 — none required deletion; each scores a genuinely different catalog by design.
- **Current status**: `VALIDATED`
- **Commit**: `e172a5e9` (code), `f1a1c518` (scorecard)
- **Scorecard impact**: Domain 12, 16th recurrence, score held flat.

### HEAL-005 — TrainingController/EvaluationController had no permission gate

- **Severity**: P1_HIGH
- **Domain**: RBAC
- **Source evidence**: Both controllers used only `@UseGuards(AuthGuard('jwt'))` — any authenticated user, including `STUDENT`, could create training runs and submit evaluation results. Documented as a "KNOWN GAP" by an earlier round for lack of a matching `Permission` enum value.
- **Affected files**: `backend/src/modules/auth/enums/permission.enum.ts`, `backend/src/modules/auth/config/role-permissions.config.ts`, `backend/src/modules/training/training.controller.ts`(+`.module.ts`+new `.controller-authorization.spec.ts`), `backend/src/modules/evaluation/evaluation.controller.ts`(+`.module.ts`+new `.controller-authorization.spec.ts`), `backend/test/backend-contract-hardening.spec.ts` (unrelated stale-import fix found via the regression run)
- **Runtime impact**: Added `VIEW_AI_TRAINING`/`MANAGE_AI_TRAINING`, `UserRole.ADMIN`-only. Empirically verified `AuthorizationGuard` actually resolves at module boot (depends on `AuditService`, which neither module previously imported) via a throwaway DI probe.
- **Affected user profiles**: Site Admin only (by design — was previously all 5 backend `UserRole` values).
- **Security/privacy impact**: Real access-control gap closed.
- **Current status**: `VALIDATED`
- **Commit**: `b266269f` (code), `23d44339` (scorecard)
- **Scorecard impact**: Domain 12, 17th recurrence, score held flat.

### HEAL-015 — OCR silently depended on a network fetch that fails in offline/fresh environments

- **Severity**: P1_HIGH
- **Domain**: AI/ML Core Node — OCR pipeline reliability / truthfulness
- **Source evidence**: Live user report ("the OCR model doesn't work in `http://localhost:5190/emergency/reception` or in general") while this session was actively running. Traced `TesseractOcrProvider.getWorker()` (`backend/src/modules/emergency-os/ocr-providers.ts`) calling `createWorker('eng')` with no path options. Read `tesseract.js`'s own source (`worker-script/index.js`): it checks a cache at `process.cwd() + '/eng.traineddata'` first, then falls back to fetching from `cdn.jsdelivr.net`. Confirmed `backend/eng.traineddata` existed in this sandbox only because of a prior session's incidental download, and was gitignored ("auto-downloaded at runtime, machine-local, safe to regenerate") — meaning it does not exist on a fresh clone, so every first real OCR attempt anywhere depends on live network access to that CDN, contradicting the class's own doc comment ("no external API calls"). Reproduced empirically: ran the compiled provider directly with `process.cwd()` set to the repo root (not `backend/`) using the *old* code and confirmed the cache lookup would miss.
- **Affected files**: `.gitignore`, `backend/eng.traineddata` (newly committed, 5MB), `backend/src/modules/emergency-os/ocr-providers.ts`(+`.spec.ts`)
- **Runtime impact**: Real OCR (Smart Intake document scanning) could fail on any environment without reliable network access to `cdn.jsdelivr.net`, or on any first-use in a fresh clone/deployment — not limited to the Reception page, since every caller shares the same `TesseractOcrProvider` singleton.
- **Frontend impact**: None directly — the fix is entirely backend-side; frontend already handled OCR failure gracefully (falls back to manual entry with a warning), it just shouldn't have been failing in the first place.
- **Backend impact**: `getWorker()` now resolves language data via a path computed from `__dirname` (`LOCAL_TESSDATA_DIR`), correct regardless of process cwd or launch method, falling back to Tesseract's own default behavior only if the committed file is ever missing.
- **Data impact**: None.
- **AI/ML impact**: Closes a real gap between this component's claimed provenance (self-hosted, no external dependency) and its actual behavior.
- **Affected user profiles**: Receptionist/ED Clerk (Smart Intake document capture is a core reception workflow), indirectly any profile that reviews OCR-derived intake data.
- **Security/privacy impact**: None directly, though a genuinely-offline/firewalled hospital deployment (a real, common healthcare IT posture) would have had zero working OCR with no clear diagnostic signal why.
- **Clinical-safety impact**: Low — OCR failure already degrades gracefully to manual entry (existing behavior, not part of this fix), so this is an availability/reliability fix, not a safety-critical one.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied.
- **Validation requirements**: `tsc --noEmit`/ESLint clean. Empirically verified via direct Node execution of the compiled provider from both `backend/` and repo-root cwd, both producing correct real OCR text ("First name: Alex\nLast name: Chen", 95% confidence) — the repo-root case is exactly the scenario that would have failed under the old code. New regression test in `ocr-providers.spec.ts` changes `process.cwd()` mid-test to a directory with no traineddata file and confirms extraction still succeeds. Full `ocr*` backend suite: 44/44 passing.
- **Commit when resolved**: `001784ba`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.
- **Operational note**: The user's already-running dev backend process was started from the pre-fix build; requires a backend restart (`npm run dev:api` / `npm run dev:fullstack`, or however the stack was started) for this fix to take effect in their live session — the running process serves a static compiled snapshot, not a hot-reloaded one.

### HEAL-010 — `panelOfExpertsRouter.ts`/`nlpTriageExpertSystem.ts`/`clinicalDomainSpecialists.ts` leaked `sourceState: 'live'` past an already-partial truthfulness fix

- **Severity**: P1_HIGH (reclassified — the original "frontend-only inert routing decision" framing was disproven; the real finding is a truthfulness/provenance bug, not a dead-code question)
- **Domain**: AI/ML Core Node — truthfulness/provenance
- **Source evidence**: The original framing (`lib/native-ai/panelOfExpertsRouter.ts` "is a frontend-only routing decision that never reaches the backend") was **wrong** — full call-graph trace found it reaches the backend directly via `backend/src/modules/native-ai/native-ai.service.ts`'s `routePatient()`/`evaluateTriage()`/`inferSpecialists()`, which are real, authenticated, `READ_PHI`-gated routes on `NativeAiController`. Investigating that call graph surfaced the real bug instead: `routePatientToClinicalSpecialists()` (`panelOfExpertsRouter.ts`), `inferTriageFromExpertSystem()` (`nlpTriageExpertSystem.ts`), and `runClinicalSpecialistInference()`/`runRoutedSpecialistPanel()` (`clinicalDomainSpecialists.ts`) are all pure keyword+vitals-threshold heuristics (zero ML/LLM) that defaulted their own `sourceState` to `'live'` via `options.sourceState || 'live'` — the same bug class already fixed 2026-08-07 for 4 sibling functions (`predictPostEdOrientation`/`predictProlongedEdStay`/`predictAdmissionLikelihoodMl`/`extractMultiChannelClinicalTextFeatures`) in `src/services/nativeAiCore.ts`'s `buildNativeAiPatientSnapshot()`, but never extended to these 3. That orchestrator's `heuristicSourceState()` filter (which forwards only the honest `'simulated'` case, letting each function's own `'demo'` default stand otherwise) was applied to only 4 of 7 heuristic calls — `routing`/`specialistInferences`/`triageInference` received the raw, unfiltered session-level state and inherited `'live'` whenever `resolveSourceState()` defaulted to it. The backend's `native-ai.service.ts` was worse: it hardcoded `sourceState: 'live'` outright at 4 call sites with no filtering logic at all, confirmed by direct read (not inferred from route names).
- **Affected files**: `lib/native-ai/panelOfExpertsRouter.ts`, `lib/native-ai/nlpTriageExpertSystem.ts`, `lib/native-ai/clinicalDomainSpecialists.ts` (own defaults `'live'` → `'demo'`); `src/services/nativeAiCore.ts` (extended `heuristicSourceState()` filter to all 7 heuristic calls); `backend/src/modules/native-ai/native-ai.service.ts` (removed 4 hardcoded `sourceState: 'live'` overrides); `src/services/nativeAiCore.test.ts` (updated stale assertions that had locked in the bug + added coverage for `triageInference`/`specialistInferences`, previously unasserted); new `backend/src/modules/native-ai/native-ai.service.spec.ts`.
- **Runtime impact**: Every consumer of `NativeAiController`'s `route`/`triage-rules/evaluate`/`specialists/infer` endpoints, and every frontend consumer of `buildNativeAiPatientSnapshot()` (most visibly `AiTransparencyDashboard`, `NativeAiRoutingBadge`, `TriageExpertBadge`, `SpecialistInferenceBadge`), now correctly see `demo` instead of a false `live` label for these 3 unvalidated heuristic outputs.
- **AI/ML impact**: Closes a real false-AI-claims gap — these keyword/threshold heuristics were being labeled as real live model inference platform-wide, the exact category this campaign's own priority ordering ranks above authorization/data-integrity issues. Also closes one of the "4 independent model/expert-selection systems" `AI_ORCHESTRATION_AUDIT.md` §3.2 had named — confirmed real, live, and reachable (not dead), just mislabeled; no deletion or reconciliation needed since it scores a different catalog than `MoERouterService` by design.
- **Affected user profiles**: Physician, Triage Nurse, Charge Nurse (any profile viewing AI Transparency Dashboard, routing badges, triage-expert badges, or specialist-inference badges — previously shown a false "live model" label for a keyword heuristic).
- **Security/privacy impact**: None (label-only change; no data exposure).
- **Clinical-safety impact**: Indirect — mislabeling a keyword heuristic as validated live inference could inflate clinician trust in an unvalidated signal; fix restores accurate provenance disclosure.
- **Current status**: `VALIDATED`
- **Dependencies**: None.
- **Recommended canonical solution**: Applied — let each heuristic function's own honest `'demo'` default stand everywhere except the deliberate `'simulated'` passthrough case.
- **Validation requirements**: Backend `native-ai.service.spec.ts` (3/3) + `native-ai.controller-authorization.spec.ts` (13/13 combined) passing via `npx jest native-ai`. Frontend `tsc --noEmit` clean via ad-hoc tsconfig (`vitest` blocked in this sandbox per established constraint). Empirically verified via a standalone `tsx` script exercising the real `buildNativeAiPatientSnapshot()`: default case now returns `routing=demo triage=demo specialists=demo` (previously `live`/`live`/`live`); `sourceState: 'simulated'` still correctly propagates `simulated` to all 3.
- **Commit when resolved**: `542bb11a`
- **Scorecard impact when resolved**: Pending next scorecard sync pass (Domain 12 — AI Governance & Operational Intelligence).

### HEAL-010b — `RoutingOptimizerService`'s independent re-pick — investigated, real but lower severity than framed, fixed via disclosure not reconciliation

- **Severity**: P2_MEDIUM (was framed as P1_HIGH "duplicate active architecture" pending investigation)
- **Domain**: AI/ML Core Node — truthfulness
- **Source evidence**: `AI_ORCHESTRATION_AUDIT.md` §3.2 originally framed this as `RoutingOptimizerService` "independently re-picking a model after MoE already chose an expert; nothing reconciles the two." Traced precisely: `chat.service.ts`'s real ED Copilot call path (`invokeAnthropicEdCopilot` → `unifiedAIClient.request()`) never reads the `costOptimization` object `RoutingOptimizerService.optimizeRequest()` computes — confirmed by reading the real dispatch call site directly, not inferred. Every real request is served by the same configured provider/model regardless of what "route" (`lightweight_model`/`rag`/`expert_model`) or fictional model name (`caredroid-lightweight-mini` etc.) this service predicts. **The actual bug was narrower than the audit's framing**: no wrong response can ever result (nothing consequential reads the estimate) — but `src/pages/ai/AiCommandCenterDashboard.tsx`'s "Tool Routing" panel rendered these fictional cost-tier route counts with zero disclosure, reading to any Site Admin/Manager viewer as real operational model-dispatch tracking of distinct models that don't actually exist as separate infrastructure.
- **Affected files**: `backend/src/modules/cost-optimizer/routing-optimizer.service.ts` (new class-level doc comment), `src/pages/ai/AiCommandCenterDashboard.tsx`(+`.css`+`.test.tsx`)
- **Runtime impact**: None (cosmetic/informational only — no real routing behavior changed, since none ever depended on this).
- **AI/ML impact**: Closes the "false AI claims" risk of this specific panel; `RoutingOptimizerService` itself kept as-is (real, useful cost-estimation tool for planning), not deleted.
- **Affected user profiles**: Site Admin, Department Manager/Director (AI Command Center Dashboard viewers).
- **Current status**: `VALIDATED`
- **Recommended canonical solution**: Applied — renamed the panel to "Cost-Tier Routing (Estimated)" with an explicit caption; added a class-level doc comment to `RoutingOptimizerService` so this doesn't get re-flagged as a live routing conflict in a future audit.
- **Validation requirements**: Backend `tsc`/ESLint clean, 5/5 `routing-optimizer` tests + 34/34 `chat` tests passing (confirms the real dispatch path is genuinely untouched). Frontend `tsc`/ESLint clean; new regression test asserts the disclosure renders and the old misleading title is gone (`vitest` blocked in this sandbox per established constraint — manually traced the render logic against the test's own mock data).
- **Commit when resolved**: `fb67fbcc`
- **Scorecard impact when resolved**: Pending next scorecard sync pass.

### HEAL-012 — `clinicalIntentRouterBackend.ts` — corrected framing, real live gap closed via stopgap; full relocation deferred

- **Severity**: P2_MEDIUM (was framed as a dead/duplicate-code cleanup; corrected — it's a live-path recognition-accuracy gap)
- **Domain**: Clinical terminology recognition
- **Source evidence**: Original framing ("backend has a dead/duplicate router, relocate and delete") was wrong on the "dead" claim — traced the full call graph and found it live: `EmergencyOsController.getPatientOrchestration()` (`GET /emergency/patients/:patientId/orchestration`) → `orchestrationService.buildPatientOrchestration()` → `recommendTools.ts`'s `buildPatientCardOrchestrationContext()` → `ClinicalIntentRouter.routeComplaint()` here → consumed by `CopilotPanel.tsx`/`PatientCardCopilot.tsx`'s tool recommendations via `usePatientOrchestration()`. The real bug: unlike `src/data/clinicalIntentRouter.ts` (which falls back to the canonical `recognizeComplaint()` pipeline when its own alias list misses), this backend mirror had no fallback and could not reach that pipeline at all (`backend/tsconfig.build.json` only allows `lib/`/`src/types/`; the canonical recognizer's dependency chain includes the safety-relevant `src/services/highRiskComplaintFlags.ts`) — so real phrasings the canonical recognizer already knows ("heart attack", "chest tightness", "can't breathe", "septic shock", "acute abdomen") silently failed to route, degrading real Copilot tool recommendations.
- **Affected files**: `lib/patient-orchestration/clinicalIntentRouterBackend.ts`(+new `.test.ts`)
- **Runtime/frontend/backend impact**: Copilot tool recommendations (calculators/protocols/referrals suggested) are now more complete for the 5 concepts both registries cover (chest pain, stroke, sepsis, shortness of breath, abdominal pain).
- **AI/ML impact**: N/A (deterministic keyword routing, not AI).
- **Affected user profiles**: Physician/NP/PA, Triage Nurse, Charge Nurse (Copilot panel + patient card tool-recommendation viewers).
- **Clinical-safety impact**: Low-moderate — this is a tool-*recommendation* completeness gap, not a missed safety alert (`highRiskComplaintFlags.ts`'s own fast-flag detection is a separate, unaffected, already-correctly-firing mechanism this router never gated).
- **Current status**: `VALIDATED` (stopgap fix) / `CONFIRMED` (canonical fix still open, see below)
- **Recommended canonical solution**: Applied as a stopgap — manually synced alias lists against `HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS`. The proper long-term fix (relocating the shared recognition pipeline into `lib/` so this file can delegate directly instead of a hand-synced mirror) remains open — deliberately deferred since it touches safety-relevant code (`highRiskComplaintFlags.ts`) and needs its own careful, dedicated round, not a rushed multi-file relocation.
- **Validation requirements**: `tsc`/ESLint clean on both stacks. `vitest` blocked in this sandbox even for `lib/` (confirmed via direct run, not assumed) — verified empirically by copying the exact matcher logic into a standalone Node script and running all 15 test cases directly (all pass). Backend regression check: 74/74 tests passing across the 2 suites covering this endpoint chain.
- **Commit when resolved**: `d0fbf4d0` (stopgap)
- **Scorecard impact when resolved**: Pending next scorecard sync pass.
- **Dependencies**: None blocking — safely schedulable.

---

## CONFIRMED — queued, not yet fixed

### HEAL-006 — Mongoose `CapacityController`/`CapacityService` — investigated for deletion, RETRACTED: this is real, tested, intentional infrastructure, not dead code

- **Severity**: P3_LOW (was tracked as P2_MEDIUM pending investigation; downgraded after verification)
- **Domain**: Split persistence (Capacity) — corrected understanding
- **Source evidence**: Initially hypothesized dead after HEAL-001 repointed both real frontend consumers away from `/api/emergency/capacity/dashboard`. Traced `service-registry.ts`'s use of `capacityService` first (per HEAL-006's own stated dependency): it's registered in `emergencyOsServiceRegistry` and checked generically by `checkServiceHealth()`'s `healthMethods` probe (`healthCheck`/`getHealth`/`checkHealth`) — `CapacityService` has none of these, so it always reports a generic `status: 'ready'` with no real check performed, identical to several other registered services lacking a health method. `health.routes.spec.ts`'s `capacityService` references are an arbitrary mocked fixture key (the whole `service-registry` module is jest-mocked there) — zero real coupling. **Then found the actual reason this module exists**: `tests/integration/emergency-os.test.ts` (rewritten 2026-08-05, "Cycles 284-287" Express-to-Nest decommission; runs under `npm run test:integration`, a separate `mongodb-memory-server`-backed Vitest suite, not the standard Jest backend suite) directly boots `CapacityModule` and asserts `GET /api/emergency/capacity/dashboard` returns real Mongoose-backed data (`metrics.active_patients >= 1`, `metrics.ems_inbound_45min >= 1`). This is deliberate, recently-maintained, CI-only integration coverage (blocked locally per this campaign's established `mongodb-memory-server`-on-Windows sandbox constraint) proving the module works correctly on its own terms — it was never dead, just never wired to the frontend (the real bug, already fixed in HEAL-001) and gated behind `ENABLE_MONGOOSE_EMERGENCY_OS` as an intentionally-optional "deep" data tier, consistent with this repo's established, deliberate dual-persistence pattern (Mongoose-backed "deep" controllers vs. TypeORM-backed "shallow" always-on ones, documented elsewhere in this campaign's memory for Reassessment/Boarding/EMS).
- **Affected files**: None changed — investigation only.
- **Current status**: `WONT_FIX_WITH_REASON` — not a bug. The module is real, tested (CI-only), and intentionally optional. Deleting it would break `tests/integration/emergency-os.test.ts`'s real coverage for no benefit.
- **Lesson**: This ledger's own initial HEAL-006/HEAL-013 framing (inherited from several rounds of prior-session memory as "the Capacity Mongoose/TypeORM persistence fork needs a retirement decision") was itself never fully re-verified against current source until this round — it turned out to be substantially wrong. Corrected rather than carried forward uncritically, per this campaign's own repeated "never batch-trust an unverified summary, including your own" discipline.

### HEAL-007 — `envelope()` helper hardcodes `source: 'backend-fixture'` for every `EmergencyOsController` response regardless of whether the underlying data is real

- **Severity**: P2_MEDIUM (truthfulness pattern; scope unknown until audited)
- **Domain**: Backend↔Frontend contract truthfulness
- **Source evidence**: `backend/src/modules/emergency-os/emergency-os.services.ts:218`'s `envelope<T>(module, data, remainingGaps)` unconditionally sets `source: 'backend-fixture'` — confirmed while investigating HEAL-001/HEAL-002. This means `GET /api/emergency/capacity`'s response envelope claims `source: 'backend-fixture'` even though the payload is genuinely computed from real TypeORM data (only the inner `capacity` object is real; the outer envelope's `source` field lies). Unknown how many of `EmergencyOsController`'s ~40+ routes this affects, and whether any frontend consumer actually reads the envelope's `source` field (vs. just `data.*`) — if none do, severity is lower (dead/unread field); if any do, this could be actively misleading provenance.
- **Affected files**: `backend/src/modules/emergency-os/emergency-os.services.ts` (the `envelope()` helper, used by dozens of call sites)
- **Current status**: `CONFIRMED`, narrowed and downgraded. Grepped the literal string `'backend-fixture'` across the whole frontend: exactly one real (non-test) consumer reads it — `src/pages/integrations/IntegrationHubPage.tsx:67`'s `<small>{envelope?.source || 'backend-fixture'}</small>`, sourced from `fetchIntegrationHub()` → `/api/emergency/integrations` → `IntegrationHubService.getIntegrationHub()`. Read that service directly: it genuinely IS hardcoded fixture data (`fhir-demo`/`hl7-demo`/`device-telemetry-demo`, explicit "External feeds are labeled placeholders until live credentials are configured" copy) — so the hardcoded `'backend-fixture'` label is, coincidentally, accurate for this one confirmed consumer, not actively misleading. No other real frontend page was found reading `.source` off any `EmergencyOsController` envelope (only 2 other hits, both test files). This does not rule out some consumer reading it via a non-literal comparison (e.g. `envelope.source !== 'real'`) that a plain string grep wouldn't catch, but no such pattern was found in a reasonable search.
- **Recommended canonical solution**: Not urgent. The one confirmed real read is harmless. A full per-call-site truthfulness audit of all ~40+ `envelope()` call sites remains a legitimate but low-urgency P2/P3 cleanup (the field is misleading-by-construction, just not proven to be actively read anywhere it would matter) — fold into a future round rather than a dedicated one.

### HEAL-009 — Terminology gap review queue is write-only

- **Severity**: P2_MEDIUM
- **Domain**: Clinical terminology recognition
- **Source evidence**: `src/services/terminologyGapQueue.ts`'s `recordTerminologyGap()` has 2 real callers (`QuickIntake.tsx`, `UnifiedIntakePanel.tsx`, both wired into real reception intake). `listTerminologyGaps()`/`resolveTerminologyGap()` have zero callers anywhere in the repo, including tests (exhaustive grep, verified 2026-08-08). Every unmatched chief-complaint typed by real staff accumulates silently in `localStorage` (capped 500 entries) with no admin page ever reading it back.
- **Affected files**: `src/services/terminologyGapQueue.ts` (already-built reader/resolver, unused), candidate host `src/pages/admin/AdminOperationsHome.tsx`
- **Frontend impact**: Requires building a genuinely new admin review UI (list/filter/resolve panel, route, nav entry) — real new feature scope, not a bug fix.
- **Affected user profiles**: Site Admin (would be the reviewer).
- **Current status**: `CONFIRMED`, deliberately not fixed — same reasoning as HEAL-011 (needs a scope decision, not a unilateral build).
- **Recommended canonical solution**: `FUTURE_MODULE` — needs product sign-off on whether/when to build the review surface.

### HEAL-011 — User/Role `roleProfileId` vocabulary mismatch (access-widening risk)

- **Severity**: P0_CRITICAL
- **Domain**: RBAC / authorization
- **Source evidence**: `user-profile.service.ts:126` writes a HYPHENATED `SaasUserRole` string into `UserProfile.roleProfileId`; `jwt-claims.util.ts:54-65` reads that same column expecting the UNDERSCORED `EmergencyRoleClaimId` format — they never match, silently falling back to a coarse per-`UserRole` default. Separately, `normalizeSaasRole`'s alias table (`saas-profile.constants.ts:161-197`) has no case for 9 of 12 canonical emergency-role IDs, all silently falling through to `DEFAULT_SAAS_PROFILE.role = 'student'` (minimal privilege — fails safe in that direction, but the underlying vocabulary mismatch is still a real bug). `AuthorizationGuard.hasRolePermission()` ORs `hasPermissionWithHierarchy(userRole, permission)` with `hasSaasProfilePermission(roleProfileId, permission)` — a wrong guess at reconciling the two vocabularies risks widening access, not just narrowing it.
- **Affected files**: `backend/src/modules/user-profile/user-profile.service.ts`, `backend/src/modules/auth/config/jwt-claims.util.ts`, `backend/src/modules/user-profile/saas-profile.constants.ts`, `backend/src/modules/auth/guards/authorization.guard.ts`
- **Security/privacy impact**: Real, potentially access-widening if fixed incorrectly.
- **Current status**: `CONFIRMED`, deliberately not fixed. This is the single highest-severity open item in the whole ledger by the campaign's own P0-security-first ranking, but requires a product/security decision on the correct canonical vocabulary (pick one of the 4: backend `UserRole` 5-value, `EmergencyRoleClaimId` 12-value, `SaasUserRole` 22-value, frontend `HospitalRole` 22-value) before any code change — guessing risks a real privilege-escalation regression.
- **Recommended canonical solution**: `MANUAL_REVIEW` — needs explicit human sign-off on the canonical role vocabulary before implementation.

### HEAL-013 — Capacity Mongoose/TypeORM "fork" — RETRACTED, same correction as HEAL-006

- **Severity**: N/A (closed)
- **Domain**: Split persistence — corrected understanding
- **Source evidence**: This item inherited a framing from several rounds of prior-session memory ("the Mongoose/TypeORM persistence fork needs a retirement decision") that was never independently re-verified until HEAL-006's investigation. That investigation found the Mongoose Capacity tier is real, CI-tested (`tests/integration/emergency-os.test.ts`), and intentionally optional — not a fork needing reconciliation, but this codebase's established dual-persistence pattern (an always-on TypeORM "shallow" tier plus an optional Mongoose "deep" tier for sites that enable it) working as designed. The only real bug was the frontend never being wired to the working tier (HEAL-001, fixed) — there is no cross-domain architectural decision left to make for Capacity specifically.
- **Current status**: `SUPERSEDED` by HEAL-006's finding.
- **Note**: This does not necessarily generalize to every other domain using the same Mongoose/TypeORM dual-tier pattern (Reassessment, Boarding, EMS per prior campaign memory) — each should be verified independently on its own evidence before assuming either "it's a bug" or "it's fine," per this exact lesson.

---

## BLOCKED — external/manual dependency

### HEAL-014 — Real `docker compose up` smoke test never run

- **Severity**: P2_MEDIUM
- **Domain**: Build/deploy verification
- **Source evidence**: Docker is not installed in this sandbox. The Prometheus/Grafana wiring and Dockerfiles are statically valid but operationally unproven end-to-end.
- **Current status**: `BLOCKED` — requires infrastructure this environment cannot provide.

---

## LARGE MULTI-ROUND PROGRAMS — not yet started, tracked as epics

These are each genuinely multi-day/multi-round efforts per the operating directive's own scope; each round should pick one bounded slice, not attempt the whole program at once.

### HEAL-EPIC-A — Dead-code reachability sweep (14 named legacy categories)

Old dashboards, Android/mobile paths, Express/Mongoose runtime, duplicate AI services, unused classifier models, stale symptom datasets, old calculators, prototype workspaces, duplicate AppShells, alternate API clients, old stores/providers, old notification systems, unused route trees, experimental integrations. 6-way disposition required per artifact (KEEP_CANONICAL/MIGRATE_THEN_REMOVE/QUARANTINE/DELETE_PROVEN_DEAD/FUTURE_MODULE/MANUAL_REVIEW), verified via DI/dynamic-import/registry/build-script/test/config evidence, not import counts alone. **Status: 2 bounded slices complete** — HEAL-017 ("old notification systems" — `NotificationContext.tsx` deleted) and HEAL-018 ("old stores/providers" — `CostTrackingContext.tsx` deleted), both `DELETE_PROVEN_DEAD`, both found via the same low-consumer-count sweep of `src/contexts/*`. `WhiteLabelContext`/`OfflineProvider` were also checked in the same sweep and correctly kept (real side effects independent of any hook consumer — CSS variables/document title/favicon, and service-worker/offline-sync/rendered banners respectively). 12 of 14 named categories remain unswept, and `src/contexts/*` itself isn't necessarily exhausted (only checked contexts with suspiciously low consumer counts). HEAL-004 (`ai/foundation/`, "duplicate AI services") was a separate, earlier, opportunistic instance, not from this systematic sweep either.

**Negative findings from a 3rd round of investigation (2026-08-09), recorded so future rounds don't re-check the same dead ends**: (1) "duplicate AppShells" — `src/components/AppShell.tsx` (1044 lines, the real implementation) vs. `src/layouts/AppShell.tsx` (4 lines) vs. `src/shell/ApplicationShell/ApplicationShell.tsx` (21 lines) initially looked like 3 competing implementations; both smaller files are confirmed thin re-export wrappers with honest doc comments ("Canonical layout export... implementation lives in `components/AppShell.tsx`"), not competing logic — `src/shell/`'s own header comment already documents that an EARLIER version of that specific file WAS a disconnected placeholder mock and was already fixed. Neither wrapper has any real external consumer today (checked directly), but neither has any runtime cost either (unused imports are tree-shaken, nothing is mounted) — a fundamentally different risk profile from HEAL-017/018's mounted-and-executing dead providers. Classified `FUTURE_MODULE`/`KEEP_CANONICAL`, not deleted. (2) The existing `orphanDetectionAudit.ts` tool (`buildOrphanDetectionReport()`) was run fresh via `tsx` (`vitest` blocked) — its 261-item `LEGACY` classification is too broad/noisy to act on directly for a bounded round (it misclassified this campaign's own actively-edited `CARE_DROID_HEALING_TODOS.md` as `QUARANTINE`, a known false-positive pattern for this tool per its own git history). (3) A hand-checked sample of "legacy"-tagged pages (`AppNavigator.tsx`, `AutomationAuditTrail.tsx`) that showed 0 consumers via a naive static-import grep turned out to be real, live routes — both are wired via `lazyRoute(() => import(...))` inside `publicConsoleRouteTree.tsx`/`adminConsoleRouteTree.tsx`, a wiring pattern static `from '...'` grep misses entirely. **Lesson**: the Context-file consumer-count method that found HEAL-017/018 does not transfer directly to page files — a real "unused route trees" sweep needs to check route-tree lazy-import registration specifically, which is a properly multi-file, systematic task, not a quick grep — consistent with the epic's own "multi-day/multi-round" scope estimate. (4) 49 `src/services/*Api.ts` client files were listed for a possible "alternate API clients" duplicate check — no near-duplicate naming pairs found at a glance; not individually verified (out of scope for one round).

### HEAL-EPIC-B — 8-profile end-to-end integration test matrix

Receptionist, Triage Nurse, Charge Nurse, Physician, EMS Handoff, Manager, Site Admin, Public/Read-Only — full journey + cross-profile propagation testing (e.g., Reception registers → Triage sees → Whiteboard updates → Manager metrics update → public aggregate updates without PHI). **Status: not started.**

### HEAL-EPIC-C — Event/notification architecture audit

Discover all WebSockets/polling/React subscriptions/Nest event emitters/queues/cron/notification publishers; normalize toward one canonical event architecture with full event metadata (type/version/eventId/timestamp/tenant/actor/patient-ref/payload schema/source/correlationId/audit). **Status: not started.**

### HEAL-EPIC-D — Persistence-ownership audit (15 named domains)

Patient, Encounter, Journey, Complaint/Terminology, Queue, EMS, Reassessment, Capacity, Boarding, Referral, Notification, Audit, AI evaluation, Settings, Roles/Permissions — determine canonical owner of truth per domain; add startup diagnostics that fail safely on invalid production persistence configuration. **Status: 3 domains now have real TypeORM persistence found/fixed as concrete instances, not from a full systematic sweep** — Capacity (HEAL-001/006/013), Settings (HEAL-019 — `EmergencySettingsService` was 100% in-memory, hospital-tuned safety thresholds silently reverted to defaults on every restart), and AI evaluation (HEAL-020 `EvaluationService` + HEAL-021 `TrainingService` — both structural siblings, both were 100% in-memory, real runs and their provenance lost on every restart). All 3 fixed via a new table + `OnModuleInit` rehydration, following the existing `ReferralService`/`EMSIntakeService` pattern. Already checked and confirmed NOT needing a separate persistence layer (they're derived/computed views over the real, already-persisted Patient entity, not independent domains): Journey (`PatientJourneyService`), Queue (`QueueIntelligenceService`), Reassessment (`ReassessmentService`), Boarding (`BoardingService`) — all read-only projections of `EmergencyPatientService.listPatients()`. Already confirmed real TypeORM persistence exists (not further audited, but spot-checked while investigating this epic): Referral (`ReferralEntity`), EMS (`EmsArrivalStatus`), Notification (`backend/src/modules/notifications/`), Audit (`AuditLog`). The "AI evaluation" domain is now considered closed for both of its known concrete services. Remaining fully-unaudited: Patient, Encounter, Complaint/Terminology, Roles/Permissions.

---

## Next steps (updated 2026-08-09, after HEAL-010)

Highest-value unstarted work, ranked:

1. HEAL-011 (User/Role mismatch) — P0, but blocked on a human decision; flag prominently rather than guess.
2. HEAL-008 — audit remaining `DEMO`-labeled `EmergencyOsController` capability keys individually (do not batch-correct).
3. HEAL-009 — terminology-gap review UI — confirmed real, but needs a product scope decision (new UI, not a bug fix).
4. HEAL-EPIC-A/B/C/D — large multi-round programs (dead-code sweep, 8-profile integration matrix, event/notification audit, persistence-ownership audit), none started.

Closed this session: HEAL-001 (fixed), HEAL-006/013 (`WONT_FIX_WITH_REASON` — real, tested, intentional dual-persistence infra, not a retirement candidate), HEAL-007 (closed, low urgency — sole real consumer's underlying data is genuinely fixture-backed), HEAL-010 (fixed — truthfulness gap, not the originally-framed dead-code question), HEAL-010b (fixed via disclosure), HEAL-012 (fixed via stopgap alias sync), HEAL-015 (fixed — OCR CDN dependency).
