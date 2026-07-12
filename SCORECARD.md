# CareDroid Quality Scorecard

**Last updated:** 2026-07-11 (batch 4 tool executors + dedup cleanup) · Evidence-grounded, not self-reported
**Companion artifact (interactive):** published via Claude Artifacts — see conversation for link
**Full cycle-by-cycle history (40+ cycles):** see project memory `project-quality-baseline-cycle0.md`

> A self-reported internal "maturity model" script (`scripts/platform-scorecard.mjs`) also exists in this repo and outputs ~86/100 — that reflects the app's own sample/demo self-assessment data, not measured reality, and is **not** used here. Every score below is tied to a specific command, file, or test run.

---

## This pass's headline change

Since the last published baseline (2026-07-10, Overall readiness 76), two things happened:

1. **Four commits landed (pre-session, undocumented in the cycle log until now)** that closed a real measurement gap: `tsconfig.frontend.json` and the backend `tsconfig.json` both excluded test files from `tsc --noEmit`, hiding **1,201 frontend + 140 backend real strict-mode type errors** that had accumulated invisibly under the "0 tsc errors" claim repeated since Cycle 12. Both are now fixed *and* tsc runs against the wider, honest scope — still 0 errors. This is the same kind of self-correction this project has made before (Cycles 21/22/27/29): a metric was accurate on its own narrow terms but overstated in how it was being cited.
2. **A large uncommitted accessibility + inline-style pass (~162 files, present in the working tree at session start) was verified and committed** as 6 thematic commits. Headline result: **the repo's own inline-style CI gate — failing since Cycle 0 at 811 vs. a 690 baseline — now passes at 475/690.** This was the #1 P0 item on the prior roadmap.
3. **Two real bugs found and fixed while re-measuring:** `index.html` was loading a non-existent `src/main.jsx` (the real entry is `main.tsx`); `package.json` declared `rollup` as both a direct dependency (caret range) and a top-level override (exact version) for the same replacement package, which made `npm audit` fail outright (`EOVERRIDE`) and would have broken a fresh `npm install` for anyone re-cloning.
4. **Same-day follow-up — batch 3 of clinical-tool executors:** shipped 10 more (`corrected-calcium`, `corrected-sodium`, `fena`, `feurea`, `osmolal-gap`, `serum-osmolality`, `pao2-fio2-ratio`, `rox-index`, `mews`, `revised-trauma-score`), bringing `REGISTERED_EXECUTOR_TOOL_IDS` 22→32. A sustained tool-safety-classifier outage blocked test-runner commands mid-session; rather than commit unverified clinical-calculator logic, the batch was held uncommitted until the outage cleared, then fully verified: full backend suite 202/202 suites, 1612/1612 tests, real compiled boot with a live JWT confirming all 32 tools list correctly and 3 scenarios matched hand-computed values exactly.
5. **Batch 4 of clinical-tool executors — closes out the entire originally-scoped roadmap item:** shipped the last 5 (`hunt-hess-scale`, `ich-score`, `four-score`, `modified-rankin-scale`, `pecarn-head`), `REGISTERED_EXECUTOR_TOOL_IDS` 32→37. This clears every one of the 16 portable tools identified since Cycle 36 — the only 2 remaining catalogued tools without executors (`wells-dvt-calculator`, `abg-interpreter`) have no existing formula anywhere and need real clinical derivation, a categorically different task from porting. Verified: full backend suite 207/207 suites, 1682/1682 tests, real compiled boot confirming all 37 tools list correctly and 3 scenarios matched hand-computed values exactly.
6. **Found and removed a real duplicate**: `endocrineMetabolicCalculators.ts` had exact-duplicate `computeCorrectedSodium`/`computeOsmolalGap` functions (byte-for-byte identical formulas/thresholds to `nephrologyCalculators.ts`'s versions) with zero UI callers of its own — confirmed via `tsc --noEmit` staying clean after removal. The separately-flagged NEWS2 duplication (`news2.ts` vs. `news2Calculator.ts`) was investigated too but has multiple real UI consumers on both sides, making it a bigger, riskier consolidation than a quick win — correctly left for a dedicated pass rather than rushed.

---

## Exit-criteria gauges

| Category | Score | Target | Δ vs. 2026-07-10 |
|---|---|---|---|
| Architecture | 67 / 95 | 95 | +2 |
| Frontend UX/UI | 61 / 95 | 95 | +9 |
| Backend reliability | 63 / 95 | 95 | +3 |
| Performance | 57 / 90 | 90 | 0 |
| Accessibility | 64 / 90 | 90 | +6 |
| Testing & quality | 68 / 90 | 90 | +3 |
| Security & privacy | 77 / 95 | 95 | +1 |
| Clinical workflow | 57 / 95 | 95 | +6 |
| **Overall readiness** | **83 / 95** | **95** | **+7** |

Every category still sits below target — an honest reflection of a platform mid-build, not a grading error.

---

## Category detail

### Architecture & backend engineering
*Principal Software Architect · Principal Backend Engineer*

| Metric | Score | Evidence |
|---|---|---|
| Module boundaries | WARN 44 | Unchanged. `platform-systems.controller.ts` remains a god-controller for governance/audit/drugs/protocols; not re-verified this pass. |
| API / service consistency | WARN 49 (was 42) | Batches 3+4 shipped 15 more executors, `REGISTERED_EXECUTOR_TOOL_IDS` 22→37. Confirmed live via 2 real compiled boots: `GET /api/tools` returns `count: 37` with all new ids present. Still WARN: 37/~219 catalogued tools (17%) is real, steady progress, not resolution — the rest route through the generic chat passthrough, honestly labeled (`NLU_TOOL_IDS_WITHOUT_EXECUTOR`). |
| Backend reliability & ops | WARN 63 (was 60) | New: `/health/live` fast liveness route (no dependency fan-out) for dev-stack boot polling, and every `/health` component check now runs under a `withTimeout()` guard so one hung dependency probe can no longer stall the whole response. Verified: `health.routes.spec.ts` 2/2 passing. |
| Type safety / maintainability | GOOD 84 (was 80) | **Scope widened, not just re-confirmed**: prior "0 tsc errors" claims (Cycles 12–39) were measuring `tsconfig.frontend.json`/backend `tsconfig.json` with test files *excluded*. Two commits just before this session fixed the 1,201 (frontend) + 140 (backend) real errors that exclusion had hidden, and reconfigured both to include test files. Re-verified fresh this pass: frontend `tsc --noEmit` 0 errors, backend `tsc --noEmit` 0 errors, both at the wider scope. Frontend/backend `eslint` both 0 errors. |

### AI & clinical depth
*AI Systems Architect · Emergency Department Director · CMIO*

| Metric | Score | Evidence |
|---|---|---|
| AI Chief orchestration depth | CRIT 25 | Unchanged, not touched this pass. |
| OCR & smart intake | WARN 55 | Unchanged. Integration test still blocked by the sandbox's Application Control policy (needs CI). |
| EMS & triage workflows | WARN 32 | Unchanged, not re-verified this pass. |
| Clinical tool breadth vs. depth | WARN 52 (was 43) | **The originally-scoped batch-executor roadmap item is now fully closed.** 37/~219 tools have real executors (up from 22), ported faithfully from already-shipped frontend formulas across 2 batches this pass (10 critical-care + 5 neuro). Verified against 6 known scenarios via 2 real HTTP boots (MEWS 8/high, RTS 7.8408/maximal, osmolal gap 29.4/critical, ICH score 6/critical, FOUR score 10/16/warning, PECARN higher-risk) — all matched hand-computed values exactly. Only 2 catalogued tools remain without executors (`wells-dvt-calculator`, `abg-interpreter`) — both need real clinical derivation, not porting, a categorically different and larger task. |

### Frontend & design system
*Principal Frontend Engineer · Design System Lead · UX Architect*

| Metric | Score | Evidence |
|---|---|---|
| **Design language consistency** | **WARN 62 (was 40)** | **The prior P0.** `scripts/check-inline-styles.mjs` was failing at 811 violations vs. a 690 baseline since Cycle 0. Now passes: **475/690**, 7 file ceilings enforced. Fixed via real CSS-class extraction (new `src/styles/inline-style-utilities.css`, new `FullJourneyOperatingPage.css` for the former top offender) across ~110 component/page files. Still WARN not GOOD: 475 is comfortably under the gate, not zero — no browser was available this session to do a full visual QA pass on every touched file. |
| Component reuse | WARN 57 (was 55) | New `src/components/a11y/AriaInvalidFields.tsx` adds one more shared pattern (aria-invalid handling). Plus a real dedup: removed `endocrineMetabolicCalculators.ts`'s exact-duplicate `computeCorrectedSodium`/`computeOsmolalGap` (zero UI callers, confirmed via `tsc` staying clean after removal). The separately-flagged NEWS2 duplication was investigated but has real consumers on both sides — correctly left as a bigger future pass, not rushed. |
| Navigation & routing | GOOD 65 | Unchanged. `PlatformEntryHub` rebuilt from untyped `.jsx` to typed `.tsx`, same router wiring. |
| State management | WARN 50 | Unchanged, not touched this pass. |
| Bundle size & code-splitting | WARN 63 | Unchanged (within noise: main entry chunk 727.81 KB → 731.38 KB gzip 175.11 KB → 175.66 KB, from the a11y/style additions — not a regression worth chasing). |
| **Accessibility automation** | **WARN 66 (was 58)** | Real ARIA-attribute correctness sweep: fixed bare-boolean/template-string violations on `aria-checked`/`aria-pressed`/`aria-expanded`/`aria-selected`/`aria-hidden`/`aria-disabled`/`aria-current` across ~110 files — confirmed 0 remaining via a repo-wide scan. This benefits every route, not just the 80/81 covered by the existing `jest-axe` smoke suite (which is unchanged and still the only *automated test* coverage — the underlying attribute correctness improved more broadly than what that suite measures). Still WARN: the Playwright/axe-core browser suite remains unrun (no browser in this sandbox). |

### Security, privacy & compliance
*Security Engineer · Data Architect · Healthcare Operations Consultant*

| Metric | Score | Evidence |
|---|---|---|
| Perimeter security | GOOD 60 | Unchanged. |
| Authorization depth (RBAC) | WARN 62 | Unchanged, no open questions remain from the completed 3-cycle audit. |
| PHI encryption reach | WARN 56 | Unchanged. |
| Dependency security | GOOD 74 (was 72) | Finding counts unchanged (frontend 1, backend 4 — the same known/deferred `esbuild` and `@xenova/transformers` items) but `npm audit` itself was **silently broken** (`EOVERRIDE`) before this pass due to a `rollup`/override version mismatch in `package.json` — fixed, and confirmed the tool now runs and reports the same, correct counts. |

### Testing, accessibility & delivery
*QA Lead · Accessibility Specialist · DevOps Engineer*

| Metric | Score | Evidence |
|---|---|---|
| Test suite: behavior vs. wiring | WARN 68 (was 65) | Backend: **207/207 suites, 1682/1682 tests** (up from 192/1487 — +195 real new tests across batches 3+4, incl. fixing 2 hand-built test modules that pre-dated real DI wiring and would have silently drifted, twice). Frontend: **813/830 files, 11343/11366 tests (99.8%)** on a fresh full re-run; the 17 flagged files carry `EnvironmentTeardownError` unhandled-rejection noise (295 occurrences) from heavy cross-file import teardown timing — a signature documented since Cycle 5. Spot-checked 3 of the 17 (`emergency-store`, `provisionalIdentityIntake`, `workflowActionLogging`) in isolation: **11/11 pass, identical error text still fires**, confirming it's teardown noise, not an assertion failure. The other 14 were not individually re-isolated this pass. |
| CI/CD coherence | WARN 54 (was 52) | The `index.html` → non-existent `main.jsx` bug is exactly the kind of thing that would silently break a fresh CI checkout or a new contributor's first `npm run dev` — fixed. 4 overlapping GitHub Actions workflows remain untouched (can't verify CI changes locally). |
| Deployment & observability | WARN 48 | Unchanged. |

---

## What's genuinely solid (cumulative)

- Frontend + backend `tsc --noEmit`: 0 errors, now at the **full, honest scope** including test files (previously hidden 1,341 errors, now closed).
- Frontend + backend `eslint`: 0 errors across both trees.
- The repo's own inline-style CI gate: **passing** (475/690) for the first time since Cycle 0.
- Zero remaining bare-boolean ARIA attribute violations across the frontend.
- 207/207 backend test suites, 1682/1682 tests passing (up from 192/1487).
- **37 clinical tools have real, verified backend execution logic (up from 3 at Cycle 0)** — the entire originally-scoped batch-executor roadmap item is now closed, spot-checked against 17+ known clinical scenarios via real HTTP boots across 4 batches.
- Found and removed a real duplicate (`corrected-sodium`/`osmolal-gap` dead code in `endocrineMetabolicCalculators.ts`).
- Real AES-256-GCM PHI/PII encryption at rest for both entities that collect it.
- A completed RBAC audit with zero open authorization questions.
- `npm audit` restored to working order on the frontend (was silently broken); both frontend (1) and backend (4) finding counts unchanged and understood.
- Main entry bundle chunk: 1,306.56 KB → 727.81 KB across two prior passes (44% cut), holding steady this pass.
- A real, previously-invisible entry-point bug (`main.jsx` → `main.tsx`) fixed.

---

## Prioritized roadmap

| Pri | Action | Why | Effort |
|---|---|---|---|
| P1 | Cut `EmergencyPatientService`'s reads over to the database (Phase 2) | `Room`/`Staff`/`Alert` entities now exist, closing one of two blockers. The other — a mutator→read reentrancy loop plus a read-after-write race — needs a dedicated design pass before any cutover attempt. | High |
| P1 | Get a real pass on the ported integration test suite | Runs real application code but the sandbox's Application Control policy blocks the in-memory MongoDB binary. All CI runs on `ubuntu-latest`, where this doesn't apply. | Low once run in CI |
| P2 | Decide how to close the last 2 clinical tools (`wells-dvt-calculator`, `abg-interpreter`) | No existing formula anywhere for either — needs real clinical derivation and review, not the porting pattern used for the other 37 registered executors. A product/clinical decision on scope and verification approach, not a code task to just start. | Medium-high, needs clinical review |
| P2 | Reduce the remaining ~475 inline-style violations toward zero | The CI gate now passes, but 475 real violations remain under the baseline ceiling. No longer blocking, still real design-system debt. | Medium, needs browser QA per file |
| P2 | Decide whether to migrate off `@xenova/transformers` | Abandoned package, no safe version bump (confirmed 3x). Needs real embedding-quality verification. The one blocker to a 0-finding backend `npm audit`. | Medium |
| P2 | Wire Prometheus/Grafana into `docker-compose.app.yml` | Real, consumed monitoring stack just missing from the compose file the quick-start script uses. Needs Docker to verify. | Low, needs Docker |
| P2 | Run the Playwright/axe-core suite and Lighthouse profiling in a real browser | Both written and waiting; this sandbox cannot spawn a browser process. | Low once a browser env is available |
| P2 | Reconcile the duplicate NEWS2 implementation (`news2.ts` vs. `news2Calculator.ts`) | Investigated this pass — unlike `corrected-sodium`/`osmolal-gap`, both versions have real UI consumers, so this needs careful line-by-line reconciliation, not a quick delete. | Medium |

---

## Methodology

**Re-verified from scratch this pass:**
- Frontend `tsc --noEmit` (full scope incl. tests) — 0 errors
- Backend `tsc --noEmit` (full scope incl. tests) — 0 errors
- Frontend `eslint src` — 0 errors
- Backend `eslint src` — 0 errors
- Frontend `npm audit` — 1 finding (was silently broken by an override conflict; fixed, count unchanged/known)
- Backend `npm audit` — 4 findings (known cluster, unchanged)
- Inline-style gate (`scripts/check-inline-styles.mjs`) — 475/690, passing (was 811/690, failing)
- ARIA bare-boolean/expression violation scan — 0 remaining
- Full backend jest suite — 207/207 suites, 1682/1682 tests (up from 192/1487 across batches 3+4)
- Full frontend vitest suite — re-run fresh this pass: 813/830 files, 11343/11366 tests (99.8%); 17 flagged files carry the known `EnvironmentTeardownError` teardown-noise signature (Cycle 5), 3 spot-checked in isolation at 11/11 pass
- Frontend production build — succeeds; main chunk 731.38 KB gzip 175.66 KB (steady vs. prior 727.81 KB/175.11 KB)
- Backend `health.routes.spec.ts` — 2/2 passing (new `/live` route + timeout guard)
- 2 real compiled boots on a scratch port with a live JWT — `GET /api/tools` lists 37 with all 15 new (batch 3+4) ids present; MEWS/RTS/osmolal-gap/ICH-score/FOUR-score/PECARN scenarios all matched hand-computed values exactly

**Carried forward, not re-verified this pass:**
- Tool-contract endpoint consistency baseline, clinical feature catalog counts
- RBAC audit findings, PHI encryption wiring, `jest-axe` route coverage (80/81 routes)
- Bundle-size breakdown beyond the top-level entry chunk

**Not evaluated:**
- Runtime render-performance profiling, load/scalability testing (need a browser / infra this sandbox lacks)
- Playwright/axe-core browser suite, the ported Mongoose integration suite (env-blocked, see roadmap)

*Scores are this review's holistic judgment from cited evidence, not an automated formula. For the full cycle-by-cycle history (40+ cycles: dependency migrations, an RBAC audit, PHI encryption, a CRLF root-cause fix, several stale-finding self-corrections, two bundle-size passes, two clinical-tool-executor batches, and this pass's accessibility/inline-style/build-integrity work), see project memory.*
