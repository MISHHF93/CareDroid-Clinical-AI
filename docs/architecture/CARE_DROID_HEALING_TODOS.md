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
- **AI/ML impact**: Closes one of the "4 independent model/expert-selection systems" `AI_ORCHESTRATION_AUDIT.md` §3.2 had named; 3 remain (`MoERouterService`+`expert-selector`, `RoutingOptimizerService`, `lib/native-ai/panelOfExpertsRouter.ts` — see HEAL-010).
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
- **Current status**: `DISCOVERED` — needs: (1) grep every frontend consumer of any `EmergencyOsController` response for `.source`/`.module`/`.status` field reads, (2) determine if any genuinely branch on it, (3) if so, either compute `source` honestly per-call-site or remove the field if unused.
- **Recommended canonical solution**: Do not guess; investigate reads before deciding whether to fix the shared helper (high blast radius, ~40+ call sites) or leave as an unread vestigial field.

### HEAL-008 — Possible broader pattern: other `EmergencyOsController` capability keys may share HEAL-002's stale-DEMO-label bug

- **Severity**: P2_MEDIUM
- **Domain**: Documentation truthfulness / capability registry
- **Source evidence**: `src/config/backendApiCapabilities.ts` marks `emergencyPatientJourney`, `emergencyQueues`, `emergencyBoarding`, `emergencyEmsRuntime`, `emergencyOperatingSurfaces`, `emergencyDispatch`, and others `DEMO` alongside the just-corrected `emergencyCapacity`. Not yet individually verified whether each is genuinely fixture-backed (many likely are — `EmergencyOsController` has both real-data and genuinely-fixture-backed endpoints) or similarly stale.
- **Affected files**: `src/config/backendApiCapabilities.ts`
- **Current status**: `DISCOVERED` — needs a per-key trace (same method used for HEAL-002: read the controller method → service → confirm TypeORM-backed vs. hardcoded fixture data) before correcting any label. Do not batch-correct without individual verification — some of these probably are genuinely demo-only.

### HEAL-009 — Terminology gap review queue is write-only

- **Severity**: P2_MEDIUM
- **Domain**: Clinical terminology recognition
- **Source evidence**: `src/services/terminologyGapQueue.ts`'s `recordTerminologyGap()` has 2 real callers (`QuickIntake.tsx`, `UnifiedIntakePanel.tsx`, both wired into real reception intake). `listTerminologyGaps()`/`resolveTerminologyGap()` have zero callers anywhere in the repo, including tests (exhaustive grep, verified 2026-08-08). Every unmatched chief-complaint typed by real staff accumulates silently in `localStorage` (capped 500 entries) with no admin page ever reading it back.
- **Affected files**: `src/services/terminologyGapQueue.ts` (already-built reader/resolver, unused), candidate host `src/pages/admin/AdminOperationsHome.tsx`
- **Frontend impact**: Requires building a genuinely new admin review UI (list/filter/resolve panel, route, nav entry) — real new feature scope, not a bug fix.
- **Affected user profiles**: Site Admin (would be the reviewer).
- **Current status**: `CONFIRMED`, deliberately not fixed — same reasoning as HEAL-011 (needs a scope decision, not a unilateral build).
- **Recommended canonical solution**: `FUTURE_MODULE` — needs product sign-off on whether/when to build the review surface.

### HEAL-010 — 3 remaining independent model/expert-selection systems (down from 4 after HEAL-004)

- **Severity**: P1_HIGH
- **Domain**: AI/ML Core Node — duplicate architecture
- **Source evidence**: `AI_ORCHESTRATION_AUDIT.md` §3.2: (1) `MoERouterService`+`expert-selector.service.ts` — real, wired, live path. (2) `RoutingOptimizerService` — real, wired, but independently re-picks a model *after* MoE already chose an expert; nothing reconciles the two, both stuffed into response metadata side by side. (3) `lib/native-ai/panelOfExpertsRouter.ts` — real, frontend-only, scores an entirely different catalog (`CLINICAL_DOMAIN_SPECIALISTS`); its decision never reaches the backend.
- **Current status**: `CONFIRMED`, not yet fixed. Neither #2 nor #3 currently produces a wrong *routing* decision reaching a patient (both #1/#2 execute, they just don't agree on which model to bill/log; #3 never reaches the backend at all so is inert, not wrong) — real but not yet P0.
- **Recommended canonical solution**: For #2: either reconcile `RoutingOptimizerService`'s re-pick with MoE's original choice (single source of truth) or retire one. For #3: either wire its decision into the real backend path or explicitly document it as a frontend-only, non-authoritative UI hint. Needs its own dedicated round — do not rush into an existing round's tail end.

### HEAL-011 — User/Role `roleProfileId` vocabulary mismatch (access-widening risk)

- **Severity**: P0_CRITICAL
- **Domain**: RBAC / authorization
- **Source evidence**: `user-profile.service.ts:126` writes a HYPHENATED `SaasUserRole` string into `UserProfile.roleProfileId`; `jwt-claims.util.ts:54-65` reads that same column expecting the UNDERSCORED `EmergencyRoleClaimId` format — they never match, silently falling back to a coarse per-`UserRole` default. Separately, `normalizeSaasRole`'s alias table (`saas-profile.constants.ts:161-197`) has no case for 9 of 12 canonical emergency-role IDs, all silently falling through to `DEFAULT_SAAS_PROFILE.role = 'student'` (minimal privilege — fails safe in that direction, but the underlying vocabulary mismatch is still a real bug). `AuthorizationGuard.hasRolePermission()` ORs `hasPermissionWithHierarchy(userRole, permission)` with `hasSaasProfilePermission(roleProfileId, permission)` — a wrong guess at reconciling the two vocabularies risks widening access, not just narrowing it.
- **Affected files**: `backend/src/modules/user-profile/user-profile.service.ts`, `backend/src/modules/auth/config/jwt-claims.util.ts`, `backend/src/modules/user-profile/saas-profile.constants.ts`, `backend/src/modules/auth/guards/authorization.guard.ts`
- **Security/privacy impact**: Real, potentially access-widening if fixed incorrectly.
- **Current status**: `CONFIRMED`, deliberately not fixed. This is the single highest-severity open item in the whole ledger by the campaign's own P0-security-first ranking, but requires a product/security decision on the correct canonical vocabulary (pick one of the 4: backend `UserRole` 5-value, `EmergencyRoleClaimId` 12-value, `SaasUserRole` 22-value, frontend `HospitalRole` 22-value) before any code change — guessing risks a real privilege-escalation regression.
- **Recommended canonical solution**: `MANUAL_REVIEW` — needs explicit human sign-off on the canonical role vocabulary before implementation.

### HEAL-012 — `clinicalIntentRouterBackend.ts` backend-side duplicate

- **Severity**: P2_MEDIUM
- **Domain**: Clinical terminology recognition
- **Source evidence**: Backend has its own duplicate of complaint/intent routing logic because it cannot reach `src/data/clinicalTerminology/` (frontend-only path; `backend/tsconfig.build.json` only allows `lib/` and `src/types/`).
- **Current status**: `CONFIRMED`, not fixed.
- **Recommended canonical solution**: Relocate `clinicalConceptTypes.ts` (and whatever else is needed) into `lib/` or `src/types/` so both stacks import the same canonical types/logic, then delete the backend duplicate.
- **Dependencies**: None blocking — safely schedulable.

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

Old dashboards, Android/mobile paths, Express/Mongoose runtime, duplicate AI services, unused classifier models, stale symptom datasets, old calculators, prototype workspaces, duplicate AppShells, alternate API clients, old stores/providers, old notification systems, unused route trees, experimental integrations. 6-way disposition required per artifact (KEEP_CANONICAL/MIGRATE_THEN_REMOVE/QUARANTINE/DELETE_PROVEN_DEAD/FUTURE_MODULE/MANUAL_REVIEW), verified via DI/dynamic-import/registry/build-script/test/config evidence, not import counts alone. **Status: not started this campaign iteration** (HEAL-004 is one concrete instance found opportunistically, not from a systematic sweep).

### HEAL-EPIC-B — 8-profile end-to-end integration test matrix

Receptionist, Triage Nurse, Charge Nurse, Physician, EMS Handoff, Manager, Site Admin, Public/Read-Only — full journey + cross-profile propagation testing (e.g., Reception registers → Triage sees → Whiteboard updates → Manager metrics update → public aggregate updates without PHI). **Status: not started.**

### HEAL-EPIC-C — Event/notification architecture audit

Discover all WebSockets/polling/React subscriptions/Nest event emitters/queues/cron/notification publishers; normalize toward one canonical event architecture with full event metadata (type/version/eventId/timestamp/tenant/actor/patient-ref/payload schema/source/correlationId/audit). **Status: not started.**

### HEAL-EPIC-D — Persistence-ownership audit (15 named domains)

Patient, Encounter, Journey, Complaint/Terminology, Queue, EMS, Reassessment, Capacity, Boarding, Referral, Notification, Audit, AI evaluation, Settings, Roles/Permissions — determine canonical owner of truth per domain; add startup diagnostics that fail safely on invalid production persistence configuration. **Status: not started** (HEAL-001/006/013 are one concrete Capacity-domain instance, not the full 15-domain sweep).

---

## Next steps (as of this ledger's creation, 2026-08-09)

Highest-value unstarted work, ranked:

1. HEAL-011 (User/Role mismatch) — P0, but blocked on a human decision; flag prominently rather than guess.
2. HEAL-007 — determine blast radius of the `envelope()` `source: 'backend-fixture'` hardcode before deciding whether it's worth fixing.
3. HEAL-010 — reconcile or retire `RoutingOptimizerService`'s independent re-pick.
4. HEAL-012 — relocate `clinicalConceptTypes.ts`, delete the backend router duplicate.
5. HEAL-008 — audit remaining `DEMO`-labeled `EmergencyOsController` capability keys individually (do not batch-correct).

HEAL-006 is closed as `WONT_FIX_WITH_REASON` (see its entry) — the Mongoose Capacity module turned out to be real, tested, intentional infrastructure, not a retirement candidate.
