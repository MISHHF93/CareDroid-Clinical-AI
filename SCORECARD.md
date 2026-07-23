# CareDroid Quality Scorecard

**CareDroid — Emergency Department operations platform** (Vite + React frontend, NestJS backend, embedded clinical copilot). This file tracks a long-running, cycle-by-cycle quality-improvement program: one well-scoped, evidence-backed lever per cycle, never a fabricated score.

**Last updated: 2026-07-23 (Cycle 159 — closed all 18 test failures + 6 tsc errors Cycle 158 found; see Cycle log below).**

**Rebuilt: 2026-07-23 (Cycle 158).** The previous version of this file had become structurally broken: its "Last updated" line had grown, by prepending each cycle's narrative for 157 cycles, to **162,783 characters on a single line** — unreadable by normal editors and tooling. Several other sections had the same runaway-accumulation shape. Nothing was deleted: the full prior file is preserved verbatim at [docs/archive/SCORECARD-archive-2026-07-23-cycles-1-157.md](docs/archive/SCORECARD-archive-2026-07-23-cycles-1-157.md), and the complete cycle-by-cycle narrative (157+ cycles) remains in project memory (`project-quality-baseline-cycle0.md`). This rebuild also found that parts of the old file were internally stale before it was even retired, and that the frontend test suite's last-recorded pass count was stale too — see the Cycle 158 entries in "Testing, accessibility & delivery" and "Cycle log" below.

**Architect Mode (2026-07-15) — structural coherence rescore:** **97/100** measured. Unified proof pack: [docs/architecture/architect-mode/PROOF-PACK.md](docs/architecture/architect-mode/PROOF-PACK.md). Gates: Architect FE **100**, BE **51**, contract-matrix **19**, cohesion-security **30**, redirect-parity **58**, dual builds **PASS**. Residual: dual Nest/Express, Postgres tenant e2e, full Playwright. *(Carried forward, not re-verified this cycle.)*

**Companion artifact (interactive):** <https://claude.ai/code/artifact/f613bb99-0c0b-43a3-ae9e-55cfbece7438> (kept current per cycle; supersedes `5b85f8ca…`)

> A self-reported internal "maturity model" script (`scripts/platform-scorecard.mjs`) also exists in this repo and outputs ~86/100 — that reflects the app's own sample/demo self-assessment data, not measured reality, and is **not** used here. Every score below is tied to a specific command, file, or test run.

---

## Cycle 158 — fresh, re-run-today evidence

Everything in this section was actually executed on 2026-07-23 against the current tree (`HEAD` `70cef8c5`), not carried forward.

| Check | Command | Result |
|---|---|---|
| Frontend type safety | `npx tsc --noEmit -p tsconfig.json` | **0 errors** |
| Backend type safety | `npx tsc --noEmit -p tsconfig.json` (in `backend/`) | **0 errors** |
| Frontend lint | `npm run lint` (`eslint src`) | **0 errors, exit 0** |
| Inline-style gate | `npm run check:inline-styles` | **110/690** (7 file ceilings enforced) — improved from the last recorded 137/690; not independently investigated this cycle, likely partly attributable to concurrent unrelated work in this repo |
| Frontend dependency audit | `npm audit --omit=dev` | **2 vulnerabilities** (1 high: `axios` 1.0.0–1.17.0, prototype-pollution/DoS family; 1 moderate: `protobufjs` 7.5.0–7.6.4, DoS via infinite loop) — regressed from the last-recorded "0 vulnerabilities"; fixes available via `npm audit fix` |
| Backend dependency audit | `npm audit --omit=dev` (in `backend/`) | **8 vulnerabilities** (1 moderate, 6 high, **1 critical**) — regressed from the last-recorded "4 known findings, unchanged." Critical + most highs trace to `protobufjs` (arbitrary code execution, multiple CVEs) pulled in transitively via `@xenova/transformers` → `onnxruntime-web` → `onnx-proto`; also `sharp` (high, libvips CVEs), `dd-trace` (high, W3C baggage header DoS), `brace-expansion` (high, DoS). `npm audit fix` clears the non-breaking ones; the `@xenova/transformers` chain needs `--force` (breaking downgrade) — this is the same abandoned-package migration already tracked as roadmap item #12 below, now materially more urgent given the critical severity |
| Frontend test suite | `npm run test:run` (vitest) | see below |
| Backend test suite | `npm test` (jest, in `backend/`) | see below |

**Not fixed this cycle:** the two dependency-audit regressions above are reported, not remediated — `npm audit fix --force` on the backend is a breaking dependency change (downgrades `@xenova/transformers`) and deserves its own verified pass, not a drive-by inside a file-restructuring cycle. Flagged as the new top of the roadmap below.

*(Test suite result rows below were filled in after both suites finished — see "Testing, accessibility & delivery" gauge.)*

---

## Exit-criteria gauges

*Carried forward from the pre-rebuild archive (last touched by Cycle 157 or earlier); not independently re-verified this cycle except where marked "Cycle 158."*

| Category | Score | Target | Note |
|---|---|---|---|
| Architecture | 86 / 95 | 95 | carried forward |
| Frontend UX/UI | 95 / 95 | 95 | carried forward |
| Backend reliability | 88 / 95 | 95 | carried forward |
| Performance | 81 / 90 | 90 | carried forward |
| Accessibility | 86 / 90 | 90 | carried forward |
| Testing & quality | 90 / 90 | 90 | **Cycle 159: both suites now clean — 927/927 frontend files (12045/12045 tests), 245/245 backend suites (1922/1922 tests). All 18 failures found in Cycle 158 root-caused and fixed. Number carried forward but no longer contradicted by known failures.** |
| Security & privacy | 94 / 95 | 95 | carried forward — **Cycle 158 found a fresh dependency-audit regression (see above) not yet reflected in this number** |
| Clinical workflow | 85 / 95 | 95 | carried forward |
| **Overall readiness** | **95 / 95** | **95** | carried forward |

Every category but Frontend UX/UI still sits below target — an honest reflection of a platform mid-build, not a grading error.

---

## Category detail

*All tables below are carried forward verbatim from the pre-rebuild archive. Per-row deltas ("was N") reflect the cycle that last touched that row, not necessarily Cycle 157 — several rows (flagged) were found stale relative to the rest of the document during this rebuild's extraction pass. None of these were independently re-verified during Cycle 158 except Testing (above).*

### Architecture & backend engineering
*Principal Software Architect · Principal Backend Engineer*

| Metric | Score | Note |
|---|---|---|
| Module boundaries | WARN 56 (was 53) | God-controller breakup round 2: `platform-systems.controller.ts`'s remaining ~33 routes split; 23 moved into 2 new controllers with 25 new tests. |
| API / service consistency | WARN 60 (was 58) | Canonical `/api/ai/unified` envelope endpoint + reception task→intent routing shipped; still WARN on stream/retry/tool-execute and ~180 chat-passthrough tools. |
| Backend reliability & ops | GOOD 85 (was 83) | Found+fixed a real live defect: fresh SQLite could not cold-boot at all (`synchronize: true` hardcoded for SQLite, unconditional, causing an AUTOINCREMENT schema error). |
| Type safety / maintainability | GOOD 84 (was 80) | "0 tsc errors" claims for Cycles 12–39 had actually excluded test files from scope; widened scope, fixed the 1,201 frontend + 140 backend errors that exclusion had hidden. **Cycle 158 re-confirms 0 errors at full scope, both trees.** |

### AI & clinical depth
*AI Systems Architect · Emergency Department Director · CMIO*

| Metric | Score | Note |
|---|---|---|
| AI Chief orchestration depth | WARN 72 (was 65) | Row had gone stale since Cycle 74; re-verified fresh — all 3 previously-cited blockers confirmed actually closed. |
| OCR & smart intake | WARN 58 (was 30) | Real self-hosted `tesseract.js` OCR integrated as the default provider (reversed an earlier "no real OCR" finding). |
| EMS & triage workflows | WARN 63 (was 50) | Row unverified for ~40 cycles at one point (longest-frozen row found); real EMS workspace sub-components and a live `postEmsHandoff` backend route confirmed shipped since. |
| Clinical tool breadth vs. depth | WARN 58 (was 52) | Wells DVT + ABG interpreter closed the entire originally-scoped executor roadmap item; hand-derived against clinical references, 34 new tests all passed first run. |

### Frontend & design system
*Principal Frontend Engineer · Design System Lead · UX Architect*

| Metric | Score | Note |
|---|---|---|
| Design language consistency | WARN 117 (was 116) | Inline-style gate at 137/690 as of last recording — **Cycle 158 re-check: now 110/690**, see fresh evidence above. |
| Component reuse | WARN 75 (was 73) | `ts-prune` unused-export lever opened; 5 confirmed zero-importer components deleted (net 11 real deletions after a near-miss where a live CSS `@import` aggregator was almost wrongly deleted). |
| Navigation & routing | GOOD 66 (was 65) | Fixed a real gap: `/dashboard` had no explicit redirect in `router.tsx` unlike its siblings. Since superseded by Cycles 153–154's routes/nav-wiring and full-app crawl work (see project memory). |
| State management | WARN 54 (was 51) | Found+fixed a live full-page crash on `/emergency/command-center`, root-caused to a dev-only offline shim's placeholder data shape reaching a real consumer expecting Sentinel-specific fields. |
| Bundle size & code-splitting | WARN 75 (was 73) | Whole-app JS payload cut 27.5% (8.58MB→6.21MB) by fixing a repo-wide production-build defect (`.env`'s `NODE_ENV=development` was shipping React's dev JSX runtime app-wide). |
| Runtime performance (live-browser) | WARN 77 (was 72) | Same root cause as above — discovered while regression-checking CLS. |
| Accessibility automation | WARN 84 (was 78) | Repo-wide ARIA bare-boolean/template-string sweep across ~110 files, confirmed 0 remaining via full scan. |

### Security, privacy & compliance
*Security Engineer · Data Architect · Healthcare Operations Consultant*

| Metric | Score | Note |
|---|---|---|
| Perimeter security | GOOD 60 | Unchanged. |
| Authorization depth (RBAC) | WARN 73 | Entire remaining RBAC controller triage list closed — all ~17 remaining controllers read in full and found clean under 4 legitimate authorization patterns. |
| PHI encryption reach | WARN 57 (was 56) | Verified `User.emailEncrypted` genuinely encrypted (AES-256-GCM); `UserProfile`'s DOB/history/allergy/medication encrypted columns were found never actually written to (non-functional no-op lifecycle hooks) — removed/documented. |
| Dependency security | GOOD 75 (was 74) | Last recorded: backend 4 findings unchanged, frontend 0 vulnerabilities. **Cycle 158 re-check: this has regressed — frontend now 2, backend now 8 including 1 critical. See fresh evidence above; this GOOD rating needs revisiting next cycle.** |
| Multi-tenant data isolation | WARN 62 | Closed a RAG tenant-scoping gap (vector DB had no `organizationId` concept) — not yet exploitable in practice, but was a real cross-tenant PHI-leak risk once org-specific ingestion ships. |

### Testing, accessibility & delivery
*QA Lead · Accessibility Specialist · DevOps Engineer*

| Metric | Score | Note |
|---|---|---|
| Test suite: behavior vs. wiring | GOOD 91 (was 80) | Essentially the entire prior test backlog closed: 37 files/165 tests reconciled to real tool-contract behavior. **Cycle 158 re-ran both full suites fresh — see below.** |
| CI/CD coherence | WARN 66 (was 54) | Fixed the `index.html`→nonexistent `main.jsx` entry bug; `validate.yml` confirmed a real, comprehensive CI gate. |
| Deployment & observability | WARN 64 (was 48) | First real audit of this row found substantial pre-existing, uncredited observability infra (multi-component health checks, 27 services, WebSocket/MQTT, 2 external APIs). |
| Accessibility (live-browser WCAG) | WARN 68 (was 66) | First-ever successful axe scan of `/emergency/command-center` (previously always crashed) found one real serious violation: a horizontally-scrolling status-chip rail with no keyboard access. |

**Cycle 158 fresh test-suite run:**

| Suite | Result | Notes |
|---|---|---|
| Backend (`npm test`, jest, in `backend/`) | **244/245 suites, 1917/1922 tests passing** | 1 file failing: `test/tool-calling.spec.ts` — `this.aiGateway.attachUnifiedNode is not a function`. `attachUnifiedNode` genuinely exists on the real `AiGatewayService` class, so this reads as a stale test double/DI wiring in that spec file lagging behind a real method addition — not investigated further this cycle (same "test wiring lags implementation" pattern as the "Test suite: behavior vs. wiring" row above). Test count grew from a last-recorded 1688 to 1922, consistent with ongoing work elsewhere in the repo. |
| Frontend (`npm run test:run`, vitest) | **910/927 files, 12020/12045 tests passing** | 25 real named-assertion failures across 17 files, plus 43 separate `EnvironmentTeardownError` occurrences (a previously-documented Vitest teardown-flakiness class, not new — see "What's genuinely solid"). The 25 failures are **not** teardown noise: named assertions in files like `backendOrphanAudit.test.ts`, `wiringAuditConsistency.test.ts`, `platformCapabilityMatrix.test.ts`, `segmentInventory.test.tsx`, `pr4aComprehensive.test.ts`, `pr5Consistency.test.ts` — self-referential contract/consistency checks over the calculator registry, route inventory, and orphan-detection wiring. None of the touched files trace to the most recent commit (`70cef8c5`, checked via `git show --stat` — it only touches Collaboration Hub/smart-intake/reception-theme files, none of which overlap this failure list). Root cause not investigated this cycle — flagged as the top open item below. |

**This is this cycle's most consequential finding.** The pre-rebuild archive's last recorded frontend number was "832/836 files, 11547/11556 tests passing, remaining 4 confirmed pure teardown noise" — a number that was carried forward, unverified, for an unknown number of cycles. The real, current state is 17 failing files with genuine named-assertion failures, not 4 teardown artifacts. Not fixed here (17 files of contract-test drift is a dedicated cycle's worth of root-causing, not a drive-by inside a file-restructuring pass) — logged as the new top roadmap item.

---

## What's genuinely solid (cumulative)

*Carried forward from the pre-rebuild archive — a running record of verified wins across 157 cycles, condensed to one line each. Full detail for any item lives in project memory.*

- Frontend + backend `tsc --noEmit`: 0 errors at full scope including test files (was hiding 1,341 errors before this was caught) — **re-confirmed fresh, Cycle 158.**
- Frontend + backend `eslint`: 0 errors across both trees — **frontend re-confirmed fresh, Cycle 158.**
- Repo's own inline-style CI gate passing — **now 110/690, Cycle 158.**
- Zero remaining bare-boolean ARIA attribute violations frontend-wide.
- 208/208 backend test suites, 1688/1688 tests passing at last full count (up from 192/1487) — **re-run, Cycle 158, see fresh results above.**
- Frontend/backend clinical-tool contract fully reconciled — all 37 backend executors correctly mirrored on frontend.
- 37 clinical tools have real, verified backend execution logic (up from 3 at Cycle 0), spot-checked against 17+ scenarios.
- Removed a real duplicate (`corrected-sodium`/`osmolal-gap` dead code).
- Real AES-256-GCM PHI/PII encryption at rest for both entities that collect it.
- Completed RBAC audit with zero open authorization questions.
- Main entry bundle chunk cut 44% (1,306.56 KB → 727.81 KB) across two passes.
- Fixed a real previously-invisible entry-point bug (`main.jsx` → `main.tsx`).
- Real cross-role accent-color token system shipped and correctly scoped (0 raw hardcode bypasses across 348 refs/114 files).
- 2 real pre-existing architecture bugs found by actually rendering the app in a browser (not static analysis alone).
- Sentinel module (7 permissions, 17 routes) now fully mirrored across all 3 frontend contract catalogs.
- The app's entire sky-blue accent-color identity restored after confirming a real regression (not a redesign) had flattened it to monochrome.
- All 39 catalogued "portable/derivable" clinical tools now have real backend executors.
- A real live dark-mode feature shipped and reconciled against stale tests.
- Entire missing-schema P0 closed: all 65 entity-declared tables now have real migrations (was 19/65), verified via full forward→revert→forward round trip.
- Real static a11y linting added (`eslint-plugin-jsx-a11y`); all 87 violations found were fixed with targeted repairs.
- **(Cycles 153–157, post-archive)** Fixed a genuinely orphaned page (`PatientRoomDisplay`), its wrong Help Center link, and the broken orphan-detection tool (`.jsx`-only extension filter) that should have caught it.
- **(Cycle 154)** Shipped a real full-app crash/layout crawl tool (182 routes, 0 crashed/blank/overflow) after diagnosing and eliminating a false-positive-generating browser-resource-exhaustion bug in the crawler itself.
- **(Cycle 155)** Fixed a real, user-reported visual layout bug in Reception's Waiting list via root-cause CSS grid analysis.
- **(Cycle 156)** Confirmed backend/frontend wiring is sound (0 unguarded API calls, 0 contract gaps) via the app's own audit infrastructure; fixed a report-test timeout bug that had silently prevented that confirmation from ever being regenerated into docs.
- **(Cycle 157)** Found and fixed a tool-catalog status-labeling bug that mislabeled 7 deliberately chat-only clinical tools as broken ("component gap") after they gained real backend executors.
- **(Cycle 159)** First fully clean full-suite run recorded in this file's history: frontend 927/927 files (12045/12045 tests), backend 245/245 suites (1922/1922 tests), both `tsc` trees and `eslint` at 0 errors — closed an 18-test regression across 2 suites plus 6 previously-uncaught `tsc` errors, all individually root-caused rather than mass-suppressed.

---

## Prioritized roadmap

*Carried forward from the pre-rebuild archive. Status current as of Cycle 157 unless noted.*

| # | Status | Item | Note |
|---|---|---|---|
| — | ~~P1~~ DONE | 17 frontend test files (25 tests) failing with real named-assertion failures, not teardown noise | Closed 2026-07-23 (Cycle 159) — root-caused into ~8 distinct clusters (calculator lazy-loading refactor, backend route inventory gaps, renamed config file, intentional soft-fail behavior change, 2 stale doc/status fields, a new unmocked AI dependency, a dropped BEM modifier, an aria-role query mismatch) and fixed individually; full suite re-verified clean: **927/927 files, 12045/12045 tests.** |
| — | P1 OPEN | Backend `npm audit` still shows 1 critical + 6 high findings (was "4 known, unchanged") | Found Cycle 158, not yet fixed — `npm audit fix --force` is a breaking downgrade of `@xenova/transformers` (item #5 below) and deserves its own verified pass. Now the most urgent unresolved item on this list given the critical severity. |
| — | ~~P2~~ DONE | 1 backend test file failing: stale test double missing `AiGatewayService.attachUnifiedNode` | Closed 2026-07-23 (Cycle 159) — added the missing mock method to `test/tool-calling.spec.ts`'s `AIGatewayService` provider; backend suite now **245/245 suites, 1922/1922 tests.** |
| 1 | P1 OPEN | Untangle 72 frontend circular deps centered on `emergencyStore.ts` | First `madge --circular` scan; needs a dedicated architecture pass, not a drive-by. |
| 2 | P1 OPEN | Cut `EmergencyPatientService` reads to the database (Phase 2) | One of two blockers closed (entities exist); remaining reentrancy/race issue needs a dedicated design pass. |
| 3 | P1 OPEN | Get a real pass on the ported integration test suite | Blocked locally by sandbox Application Control policy on in-memory Mongo; not blocked on real CI. |
| 4 | P2 OPEN | Triage ~1,953 frontend / ~702 backend `ts-prune` unused exports | Investigation-only so far; found 7 unregistered page components. |
| 5 | P2 OPEN | Decide whether to migrate off `@xenova/transformers` | Abandoned package, no safe version bump; now the direct source of the backend's 1 critical + several high audit findings (see NEW row above). |
| 6 | P2 OPEN | Wire Prometheus/Grafana into `docker-compose.app.yml` | Real, consumed stack just missing from the compose file; needs Docker to verify. |
| 7 | P2 OPEN (partially advanced) | Run Playwright/axe-core + Lighthouse profiling in a real browser | System-Edge workaround works; axe-core + Web Vitals run for real; suite coverage grown 8→15 pages. |
| 8 | P2 OPEN | Fix TBT/page-weight finding from perf measurement | Root cause found and fixed (dev JSX runtime shipping in prod), -27.5% JS; row not marked fully closed. |
| 9 | P2 OPEN (sub-phase closed) | Reduce remaining inline-style violations toward zero | Hand-classification phase formally closed after 31 cycles; remaining occurrences found genuinely non-extractable. Fresh count now 110/690 (Cycle 158). |
| 10 | P2 OPEN | Decide backend `strictNullChecks: true` adoption | Currently overridden false; blast radius across ~800 backend files unknown, needs its own baseline pass. |
| 11 | P3 | Re-verify "This pass's headline change" / methodology narrative gap | The pre-rebuild archive's dated cycle-log sections had themselves gone stale (frozen at Cycle 61 and Cycle 106 respectively) while the rest of the document referenced cycles into the 140s–150s. This rebuild does not attempt to backfill that gap — treat the archive as a historical snapshot, and project memory as the authoritative full history. |
| 12 | ~~P1~~ DONE | 6 fresh `tsc` errors found Cycle 159, not caught by Cycle 158's "0 errors" claim | Closed 2026-07-23 (Cycle 159) — `smartIntakeApi.ts`'s `postJson`/`getJson` had an under-typed return inferred as a narrow union across 3 return paths, breaking 5 call sites in `SmartIntake.tsx`/itself; a separate, unrelated latent gap in `AiRouteMetadata.tsx` (missing `routePlan` prop type) also surfaced. Both fixed with explicit type annotations. Root cause of why Cycle 158 didn't catch these not conclusively determined — flagged honestly rather than guessed. |

*Closed items (P0–P3, ~29 rows spanning Cycles 41–112) are preserved in the archive and are not reproduced here — nothing on that list is currently open.*

---

## Methodology

Scores are this review's holistic judgment from cited evidence, not an automated formula. For the full cycle-by-cycle history (157+ cycles), see project memory `project-quality-baseline-cycle0.md`.

Every cycle entry — going forward, logged below as its own dated section rather than prepended into one growing line — should follow the same reusable three-bucket pattern:

- **Re-verified from scratch this pass** — things actually re-run this cycle, each with a fresh count.
- **Carried forward, not re-verified this pass** — things asserted true but not re-checked this cycle.
- **Not evaluated** — things out of scope / environment-blocked, stated honestly rather than silently assumed.

**Recurring verification toolkit:** `tsc --noEmit` (frontend + backend, full scope incl. tests), `eslint` (frontend + backend), `npm audit` (both trees), `npm run check:inline-styles` (the repo's own inline-style CI gate), a repo-wide ARIA bare-boolean/expression violation scan, the full Jest backend suite (`npm test` in `backend/`) and Vitest frontend suite (`npm run test:run`) with exact pass counts each time, a production build check (chunk size/gzip), real compiled-boot smoke tests against a live JWT hitting real endpoints, `madge --circular` (dependency-cycle scans), `ts-prune` (unused-export inventory), a Playwright/axe-core a11y suite routed through the system's installed Edge binary (working around a sandboxed Chromium block), a native-`PerformanceObserver`-based performance suite (`e2e/performance.spec.mjs`), and the repo's various `scripts/audit-*.mjs` tools built up cycle over cycle (routes/nav, full-app crawl, backend-frontend exposure, etc. — see project memory for the full list).

**File-structure rule going forward (the reason this file was rebuilt):** never prepend a new cycle's narrative into an existing line. Each cycle gets its own `###` heading under "Cycle log" below. When this section grows unwieldy again, rotate older entries into `docs/archive/` exactly as done here — don't let it regrow into a single-line file.

---

## Cycle log

### Cycle 158 (2026-07-23) — rebuilt this file from scratch; it had become structurally unreadable

The "Last updated" line at the top of the old `SCORECARD.md` had grown, by prepending each cycle's summary for 157 cycles, to 162,783 characters on one line — unreadable by the Read tool, and almost certainly by any other tooling or editor that assumes reasonable line lengths. A second section ("This pass's headline change") had the same accumulation shape. Rather than keep patching a file with this structural defect, archived the full prior version verbatim to `docs/archive/SCORECARD-archive-2026-07-23-cycles-1-157.md` (nothing lost — git history and project memory both also retain the full record) and rebuilt this file with real section headers instead of run-on lines.

While extracting the old file's content, found it was internally stale in ways not previously flagged: the "This pass's headline change" narrative log stopped at Cycle 106 (2026-07-18) even though the Category detail and Roadmap sections referenced work up to the 140s; the "Methodology" dated log stopped at Cycle 61 (2026-07-15). Neither gap is backfilled here — noted honestly in the roadmap above as a known limitation of the archive, not silently smoothed over.

Rather than just reformat, re-ran the checks that are cheap to re-run today rather than copy stale numbers forward unverified: `tsc --noEmit` (frontend + backend, both 0 errors), `eslint` (frontend, 0 errors), `npm run check:inline-styles` (110/690, improved from the last-recorded 137/690), and `npm audit` on both trees. The audits surfaced a real, previously unflagged regression: frontend dependency vulnerabilities went from a recorded 0 to 2 (1 high), and backend went from a recorded "4 known, unchanged" to 8, including **1 critical** — a `protobufjs` remote-code-execution family of advisories reachable via the already-tracked `@xenova/transformers` migration item, now meaningfully more urgent than its prior WARN framing suggested. Also kicked off full fresh runs of both the frontend Vitest suite and backend Jest suite for an honest, dated pass/fail count (see the Testing gauge above and cycle addendum below) rather than carrying forward the last-recorded 1688/1688 and 11547/11556 figures unverified.

Did not attempt to fix the dependency-audit regressions in this cycle — `npm audit fix --force` on the backend is a breaking downgrade of `@xenova/transformers` and deserves its own verified pass, not a drive-by inside a file-restructuring cycle. Logged as a top roadmap item instead.

Also ran both full test suites fresh rather than trust the last-recorded counts. Backend: 244/245 suites, 1917/1922 tests — 1 file failing (`test/tool-calling.spec.ts`, a stale test double missing `AiGatewayService.attachUnifiedNode`, a method that genuinely exists on the real class). Frontend: 910/927 files, 12020/12045 tests — 25 real named-assertion failures across 17 files (self-referential contract/consistency checks: `backendOrphanAudit`, `wiringAuditConsistency`, `platformCapabilityMatrix`, `segmentInventory`, `pr4aComprehensive`, `pr5Consistency`, and others), plus 43 separate `EnvironmentTeardownError` occurrences matching a previously-documented Vitest teardown-flakiness class. The last-recorded frontend figure in the archive ("832/836 files, remaining 4 confirmed pure teardown noise") had gone stale for an unknown number of cycles — the real current state is a genuine 17-file contract-drift backlog, not 4 harmless artifacts. Checked whether the most recent commit (`70cef8c5`, Collaboration Hub/smart-intake/reception-theme work) explains it via `git show --stat`: it doesn't touch any of the 17 failing files, so the drift predates that commit and wasn't introduced by it. Root-causing all 17 is a dedicated cycle's work, not attempted here — logged as the new top roadmap item.

### Cycle 159 (2026-07-23) — root-caused and fixed all 18 test failures Cycle 158 found, plus 6 fresh tsc errors it missed

Picked up the top item Cycle 158 left open: 17 frontend files (25 tests) + 1 backend file, all genuinely failing. Rather than treat it as one blob, re-ran just the 17 failing files in isolation for full assertion-diff detail, then grouped the 25 failures into distinct root causes before touching anything — a mix of real refactors the tests hadn't caught up to, a few stale hardcoded values, and one real backend wiring gap:

- **Calculator lazy-loading refactor (4 files, 8 tests: `pr4aComprehensive`, `pr5Consistency`, `mentalHealthToolsUxAccessibility`, `wiringAuditConsistency`).** `Calculators.tsx` was refactored to import specialty calculators through a new `lazySpecialtyCalculators.tsx` barrel (dynamic `import()`, so the calculators route doesn't execute every specialty chunk up front) instead of importing `pr4aCalculators.tsx`/`mentalHealthCalculators.tsx` directly — a legitimate bundle-size optimization, not a break (all 6 affected calculators — ASCVD, CKD staging, STOP-BANG, AUDIT-C, PHQ-9, GAD-7 — are still real and wired). Updated the 4 test files to check the real two-hop path.
- **Backend route inventory gap (3 files, 5 tests: `backendControllerRouteScan`, `backendOrphanAudit` ×3, `emergencyOsApi.contract`).** 20 real backend routes existed and worked (AI proposals/models/tools/providers-health from `AIController`, a 3rd parallel bare-`/governance/*` controller, `POST /api/copilot/query`) but were never added to `backendHttpRouteInventory.ts`; a real, already-called `emsHandoff` endpoint was similarly missing from `frontendApiCallsInventory.ts`. Added all 21 entries after verifying each against the actual controller source (`@Get`/`@Post` decorators), not just trusting the test's diff.
- **Renamed file (`buildConfigConsistency`).** Test still pointed at `backend/src/config/database.config.ts`; real file is `database-url.config.ts` (same `buildPostgresOptions` export). One-line path fix.
- **Intentional soft-fail behavior (`smartIntakeApi`).** The concurrent session's `70cef8c5` deliberately changed `SmartIntakeApi.createSession` to soft-fail to a local demo session when offline instead of rejecting ("reception identity check must not hard-fail offline" — real UX intent, confirmed in the source comment). Test still expected the old hard-rejection. Updated to assert the new, correct behavior.
- **Stale status field (`segmentInventory`) + stale test-coverage path (`platformCapabilityMatrix`).** The `assistant` segment's own `recoveryBridge` note said its fragmentation cause (a duplicate `ChatInterface.tsx`) was "Resolved 2026-07-17: ... confirmed dead ... removed" — verified that's still true (file doesn't exist) — but `status` was never flipped from `FRAGMENTED` to `COMPLETE`. Separately, `platformCapabilityMatrix.ts`'s `assistant` row still cited `ChatInterface.nlu.test.tsx` as test coverage; replaced with the real current NLU-launch test (`src/data/nluLaunchPaths.test.ts`).
- **Live page-count drift (`pageDispositionFixture`).** A real `import.meta.glob`-driven scan, not a static fixture — total page-inventory count had drifted from a hardcoded 244/151/93/57/47 to a real, gap-free 242/150/92/58/48 (`getPageDispositionGaps()` already passed with 0 gaps, confirming no orphans, just an unrefreshed snapshot). Updated the 5 expected-total constants.
- **New unmocked dependency (`aiCommandCenterApi`, 2 tests).** `fetchAiCommandCenterSnapshot` gained a 5th real data source (`fetchUnifiedAiNodeModelsHealth` from `./unifiedAiNodeApi`) that the test never mocked, so it hit the real implementation — which itself called the shared, differently-shaped `apiFetchJson` mock, corrupting both the health-label computation and the "cost API was skipped" assertion. Added a proper mock matching the file's existing per-dependency mocking pattern.
- **New response envelope (`careDroidUnifiedAiNode`).** `invokeUnifiedAiStructured` now attaches a `unifiedAiEnvelope` field to structured responses (the same unified-envelope pattern the conversational path was already tested for) — a real, deliberate parity feature, not a regression. Updated the stale `toBe(response)` reference-equality check.
- **Dropped BEM modifier (`clinicalGraphicLayer`).** `patient-card__priority-strip--graphic` was folded into the plain `patient-card__priority-strip` once the graphic acuity-ring treatment became the only treatment — `PatientAcuityRing` itself is still rendered and tested; only the retired modifier class needed removing from the assertion.
- **ARIA role mismatch (`WhiteboardView`).** Sortable column headers are explicit `role="columnheader"` (correct grid semantics), not `role="button"` despite being `<button>` elements under the hood — the test's `getByRole('button', ...)` query was wrong, not the component.
- **Cross-test pollution (`pilotWalkthrough`).** Passed cleanly in isolation from the start; re-running the full original 17-file batch after the other 16 fixes landed made it pass too (335/335), confirming it was never an independent bug — it was order-dependent state leaking from one of the other 16 failing files.
- **Backend `attachUnifiedNode` (P2 item).** `test/tool-calling.spec.ts`'s `AIGatewayService` mock was missing the `attachUnifiedNode` method `chat.service.ts` now calls; added a simple pass-through mock. Backend suite: **245/245 suites, 1922/1922 tests.**

Ran `tsc --noEmit` after all fixes as a sanity check and found **6 fresh errors Cycle 158's "0 errors" claim hadn't caught** — `smartIntakeApi.ts`'s `postJson`/`getJson` had no explicit return type, so TS inferred an overly-narrow union across their 3 distinct return shapes (real payload / demo session / demo-ok), breaking property access at 5 call sites in `SmartIntake.tsx` and the file itself; separately, an unrelated latent gap in `AiRouteMetadata.tsx` (a destructured `routePlan` param with no default, making it structurally required even though the component already handles it being absent) surfaced too. Fixed both with explicit type annotations rather than casts. Could not conclusively determine why Cycle 158's tsc run — against the same `HEAD` commit — didn't report these; noted honestly rather than guessed at (possible incremental-build-cache staleness, not reproduced).

**Final state, all fresh this cycle:** frontend `tsc` 0 errors, backend `tsc` 0 errors, frontend `eslint` 0 errors, backend suite 245/245 (1922/1922), frontend suite **927/927 files, 12045/12045 tests** — the first fully clean full-suite run recorded in this file's history (the 43 `EnvironmentTeardownError` occurrences are unchanged from Cycle 158's count, pre-existing async-teardown noise, not test failures). Did not touch the still-open backend `npm audit` critical/high findings (Cycle 158's other top item) — a dependency-upgrade decision, not a test-drift fix, left for its own cycle.
