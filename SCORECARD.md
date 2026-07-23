# CareDroid Quality Scorecard

**CareDroid — Emergency Department operations platform** (Vite + React frontend, NestJS backend, embedded clinical copilot). This file tracks a long-running, cycle-by-cycle quality-improvement program: one well-scoped, evidence-backed lever per cycle, never a fabricated score.

**Last updated: 2026-07-23 (Cycle 163 — closed the single largest remaining `strictNullChecks` cluster: 13 errors in `test/tool-calling.spec.ts`, blast radius now 122→109; see Cycle log below).**

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

## Cycle 160 — dependency-audit regression, closed (mostly)

| Check | Result |
|---|---|
| Frontend `npm audit --omit=dev` | **0 vulnerabilities** (was 2) — `npm audit fix` cleanly bumped `axios`, `protobufjs`, `js-yaml`, `shell-quote`, `brace-expansion` within their existing `package.json` semver ranges |
| Backend `npm audit --omit=dev` | **2 high** (was 8: 1 moderate, 6 high, 1 critical) — `npm audit fix` (non-force) cleared `typeorm`, `brace-expansion`, `dd-trace` and dependents; a targeted `overrides` entry (`protobufjs: ^7.6.5`, package.json) deduped the last critical finding (arbitrary code execution via `onnx-proto`'s vendored `protobufjs@6.11.6`) onto the same 7.6.5 already used elsewhere in this tree via `firebase-admin`/`google-gax` — zero new packages introduced |
| Real embedding smoke test | **Verified** — `pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')` against real cached model weights, real text in, real 768-dim float vector out, after the `protobufjs` override. This is the actual runtime path the critical finding sat on (`@xenova/transformers` → `onnxruntime-web` → `onnx-proto` → `protobufjs`), not just a clean `npm ls` |
| Backend test suite | 245/245 suites, 1922/1922 tests — unchanged, re-run twice across the dependency changes |
| Frontend test suite | **Not re-verified this cycle** — see below |

**Still open: `sharp <0.35.0` (high, libvips CVEs) via `@xenova/transformers`'s vendored copy.** Attempted the same override approach; the fix requires npm to write a fresh native `.node` binary, which a local Windows Application Control policy in this dev sandbox blocked outright (`ERR_DLOPEN_FAILED`) — confirmed via direct `dlopen()` test, not just the wrapped error. Reverted to the original, already-trusted `sharp@0.32.6` rather than ship an unverified native-dependency bump; `sharp` is 0.x (pre-1.0 semver, minor bumps can be breaking) and is eagerly imported by `@xenova/transformers`'s pipeline machinery even for text-only feature-extraction — a broken sharp would take the whole embedding path down, so this isn't a low-stakes swap to make blind. Left open for a cycle with CI/Linux verification access (production runs `FROM node:20-alpine`, a different binary entirely, so this sandbox's block has no bearing on production safety — it's a *local verification* blocker, not a production risk indicator either way).

**Frontend runtime verification also blocked this cycle, unrelated to the dependency changes' correctness:** after `npm audit fix` touched `node_modules`, the same Application Control policy re-flagged the `esbuild` native binary Vite/Vitest depend on to even load their config file — `tsc` and `eslint` don't spawn it and both stayed clean, but `npm run test:run` cannot run in this sandbox for the remainder of this session. Reported honestly rather than assumed passing.

## Cycle 161 — real `strictNullChecks` blast-radius baseline established (166 errors), 44 closed

The `esbuild` Application Control block from Cycle 160 is still in effect in this sandbox (confirmed by re-testing `npm run test:run` before starting — same `spawn UNKNOWN`), so this cycle was scoped to backend-only work fully verifiable via `tsc`/`jest` (frontend `tsc --noEmit`/`eslint` re-confirmed clean, 0 errors, as a sanity check that they're unaffected).

| Check | Result |
|---|---|
| `strictNullChecks` blast radius (`tsc --noEmit -p tsconfig.eslint.json --strictNullChecks true`) | **166 errors → 122 errors** (44 closed) across the ~800-file backend tree — the roadmap's "blast radius unknown" is now a real, categorized number |
| Backend `tsc --noEmit -p tsconfig.eslint.json` (real project config, full scope incl. tests) | **0 errors**, unchanged |
| Frontend `tsc --noEmit` | **0 errors**, unchanged |
| Backend full jest suite | **245/245 suites, 1922/1922 tests** — including `test/operational-intelligence-build-snapshot.spec.ts`, which directly exercises the most heavily-touched file this cycle |
| Backend `npm run lint` | **21 pre-existing errors** (all `prettier/prettier` formatting, in 7 files this cycle didn't touch: CIG projection/entity mapper files, `intent-classifier.service.ts`, `document-chunker.spec.ts`) — see callout below |

**What the 44 closed errors actually were:** re-ran `tsc` with `--strictNullChecks true` against the full-scope config to get a real count instead of the roadmap's "unknown," then categorized all 166 by TS error code: 41 were `TS2345`/`TS2339` errors bearing the exact text `type 'never'`, all traced to the same single root cause — `const arr = [];` accumulator arrays with no type annotation, which TypeScript infers as `any[]` when `strictNullChecks` is off (today's setting) but as `never[]` when it's on, breaking every later `.push()`/property-access. This pattern repeated across 10 files (`lib/operational-intelligence/buildSnapshot.ts` alone had 15 of the 41, all from two untyped arrays feeding the exported `anomalies`/`recommendations` fields — fixed by annotating them against the already-existing `OperationalIntelligenceSnapshotOutput` contract type instead of duplicating it). Fixed all 10 files with explicit array element types, mostly reusing an existing declared return type, entity type, or sibling `Awaited<ReturnType<...>>` idiom already present in the same file rather than inventing new shapes.

**Bonus find while fixing `tenant-provisioning.service.ts`:** fixing its one `never[]` error surfaced 3 more, different errors nearby — `resolveWorkspaceDefaults()`'s `.filter()` used a type predicate reading `workspace is ReturnType<...normalizeWorkspaceDefault>`, but `normalizeWorkspaceDefault` can return `null`, so the predicate never actually narrowed `null` out of the *type* (even though the runtime `.filter(Boolean)` genuinely does drop falsy values — this was a type-annotation-only bug, not a runtime one). The correct idiom, `NonNullable<ReturnType<...>>`, was already used correctly two methods away in the same file (line 259) — this one call site just didn't match it. Fixed to match.

**Real, verified regression check:** frontend and backend `tsc` both re-confirmed 0 errors under their actual project configs (not just the experimental `--strictNullChecks true` flag), and the full backend jest suite re-ran clean at 245/245 (1922/1922) after all 10 files changed — including the one spec file that directly exercises the most-touched file (`buildSnapshot.ts`).

**What this cycle deliberately did NOT do:** flip `strictNullChecks: true` in `backend/tsconfig.json`. 122 errors remain, and unlike the 44 closed here, most of the rest are genuine "possibly null/undefined" findings (`TS18048`/`TS18047`/`TS2531`/`TS2532`, ~40 of the 122) inside sensitive, high-traffic services — `auth.service.ts` (11), `subscriptions.service.ts` (10), `ai.service.ts` (9), `chat.service.ts` (6 more, a different cluster than the ones fixed here) — where the correct fix requires understanding each call site's real nullability invariant, not a mechanical annotation. Rushing that without the ability to cross-check against a live frontend integration run (blocked this session) would risk exactly the kind of drive-by mistake this project's cycle discipline exists to avoid. Left as a well-scoped, now-quantified P2 roadmap item instead of a global flag flip.

**Also found, not fixed:** backend `npm run lint` currently has 21 real, pre-existing `prettier/prettier` errors in 7 files, none touched by this cycle and none touched recently by this session's own history (last commit on any of them: `14233485`, 2026-07-21, CIG/AI work). This directly contradicts this file's own "What's genuinely solid" claim that backend `eslint` was clean — that claim's "Cycle 158" citation, on closer reading, only ever re-confirmed *frontend* lint fresh; backend lint had not actually been re-run this session until now. Not fixed here (out of this cycle's chosen scope, and touching files with recent unrelated activity deserves its own pass rather than a drive-by inside a type-safety cycle) — corrected in "What's genuinely solid" below and added as a fresh roadmap item.

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
| Security & privacy | 94 / 95 | 95 | **Cycle 160: frontend audit fully clean, backend down to 2 high (from 8 incl. 1 critical) — the critical finding that prompted this number's flag in Cycle 158 is resolved and verified** |
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
| Type safety / maintainability | GOOD 86 (was 84) | "0 tsc errors" claims for Cycles 12–39 had actually excluded test files from scope; widened scope, fixed the 1,201 frontend + 140 backend errors that exclusion had hidden. **Cycle 158 re-confirms 0 errors at full scope, both trees. Cycle 161: established a real `strictNullChecks` blast-radius baseline (166 errors, was "unknown") and closed 44 of them (10 files), including one genuine type-predicate null-narrowing bug — 122 remain, mostly requiring per-site null-safety judgment in sensitive services, correctly left unrushed.** |

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
| Dependency security | GOOD 75 (was 74) | Regressed Cycle 158 (frontend 2, backend 8 incl. 1 critical). **Cycle 160: frontend back to 0, backend down to 2 high (critical cleared, verified via a real embedding smoke test) — remaining `sharp` finding is a native-binary version bump this sandbox can't safely verify locally, left open rather than shipped blind.** |
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
- Frontend + backend `eslint`: 0 errors across both trees — frontend **re-confirmed fresh, Cycle 158**; backend was found to actually have 21 pre-existing errors when finally re-checked in **Cycle 161** (the prior "both trees" wording had only ever verified frontend), then genuinely closed in **Cycle 162**.
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
- **(Cycle 160)** Frontend `npm audit` back to 0 vulnerabilities; backend's critical RCE finding (`protobufjs` via `onnx-proto`) fixed via a targeted `overrides` entry and verified with a real embedding smoke test against the actual cached ONNX model, not just a clean dependency tree.
- **(Cycle 161)** Replaced the roadmap's "`strictNullChecks` blast radius unknown" with a real, categorized number (166 errors) and closed 44 of them across 10 files — including one genuine type-predicate bug (a `.filter()` null-narrowing check that looked correct but wasn't) found and fixed along the way. All 245/245 backend tests still pass.
- **(Cycle 162)** Backend `eslint` genuinely clean now (0 errors, both trees) — closed the 21-error finding Cycle 161 caught, verified formatting-only via a whitespace-stripped diff per file, 245/245 backend tests unchanged.
- **(Cycle 163)** `strictNullChecks` blast radius down to 109 (was 166 at Cycle 161's baseline) — closed the single largest remaining cluster (13 errors, one test file, one root cause) with a safe, idiomatic fix; 245/245 backend tests unchanged.

---

## Prioritized roadmap

*Carried forward from the pre-rebuild archive. Status current as of Cycle 157 unless noted.*

| # | Status | Item | Note |
|---|---|---|---|
| — | ~~P1~~ DONE | 17 frontend test files (25 tests) failing with real named-assertion failures, not teardown noise | Closed 2026-07-23 (Cycle 159) — root-caused into ~8 distinct clusters (calculator lazy-loading refactor, backend route inventory gaps, renamed config file, intentional soft-fail behavior change, 2 stale doc/status fields, a new unmocked AI dependency, a dropped BEM modifier, an aria-role query mismatch) and fixed individually; full suite re-verified clean: **927/927 files, 12045/12045 tests.** |
| — | ~~P1~~ DONE (mostly) | Backend `npm audit` critical + frontend audit regression | Closed 2026-07-23 (Cycle 160) — frontend 2→0 vulnerabilities via `npm audit fix`; backend 8→2 via `npm audit fix` (non-force) + a targeted `protobufjs` override, verified with a real embedding smoke test. Remaining `sharp` high finding (item #5 below) needs native-binary verification this sandbox can't provide locally. |
| — | ~~P2~~ DONE | 1 backend test file failing: stale test double missing `AiGatewayService.attachUnifiedNode` | Closed 2026-07-23 (Cycle 159) — added the missing mock method to `test/tool-calling.spec.ts`'s `AIGatewayService` provider; backend suite now **245/245 suites, 1922/1922 tests.** |
| 1 | P1 OPEN | Untangle 72 frontend circular deps centered on `emergencyStore.ts` | First `madge --circular` scan; needs a dedicated architecture pass, not a drive-by. |
| 2 | P1 OPEN | Cut `EmergencyPatientService` reads to the database (Phase 2) | One of two blockers closed (entities exist); remaining reentrancy/race issue needs a dedicated design pass. |
| 3 | P1 OPEN | Get a real pass on the ported integration test suite | Blocked locally by sandbox Application Control policy on in-memory Mongo; not blocked on real CI. |
| 4 | P2 OPEN | Triage ~1,953 frontend / ~702 backend `ts-prune` unused exports | Investigation-only so far; found 7 unregistered page components. |
| 5 | P2 OPEN | `sharp <0.35.0` (high) via `@xenova/transformers`'s vendored copy, and whether to migrate off `@xenova/transformers` entirely | Cycle 160: critical `protobufjs` finding in the same chain is now fixed via override (verified). `sharp`'s fix needs a fresh native binary this dev sandbox's Application Control policy blocks from loading — needs CI/Linux verification, not a local one. `@xenova/transformers` itself is still abandoned at 2.17.2 (no newer version exists); `@huggingface/transformers` is the maintained successor and a plausible drop-in (same `pipeline()` API) but not evaluated end-to-end this cycle. |
| 6 | P2 OPEN | Wire Prometheus/Grafana into `docker-compose.app.yml` | Real, consumed stack just missing from the compose file; needs Docker to verify. |
| 7 | P2 OPEN (partially advanced) | Run Playwright/axe-core + Lighthouse profiling in a real browser | System-Edge workaround works; axe-core + Web Vitals run for real; suite coverage grown 8→15 pages. |
| 8 | P2 OPEN | Fix TBT/page-weight finding from perf measurement | Root cause found and fixed (dev JSX runtime shipping in prod), -27.5% JS; row not marked fully closed. |
| 9 | P2 OPEN (sub-phase closed) | Reduce remaining inline-style violations toward zero | Hand-classification phase formally closed after 31 cycles; remaining occurrences found genuinely non-extractable. Fresh count now 110/690 (Cycle 158). |
| 10 | P2 OPEN (baseline established, shrinking) | Decide backend `strictNullChecks: true` adoption | Cycle 161: blast radius is now a real, categorized number — was 166. Cycle 163 closed the single largest remaining cluster: **13 errors, all `TS18048` in `test/tool-calling.spec.ts`** (`.find()` results used after a runtime-only `expect(x).toBeDefined()` that doesn't narrow TS's static type) — fixed with a non-null assertion at each `.find()` call site, safe because `!` is compile-time-only and the `toBeDefined()` check still genuinely fails the test at runtime if ever actually undefined. **109 errors remain.** The largest remaining clusters are genuine null-safety findings in sensitive services (`auth.service.ts` 11, `subscriptions.service.ts` 10, `ai.service.ts` 9, `test/encryption.e2e-spec.ts` 7, `smart-handover-v2.service.ts` 5, `workspaces.service.ts` 5) needing per-site judgment, not a mechanical sweep — deliberately not rushed without frontend integration-test cross-check available this session. |
| — | ~~P2~~ DONE | Backend `eslint` had 21 real pre-existing errors (all `prettier/prettier`, 12 files — Cycle 161's "7 files" note undercounted; the full list is 2 migration files, `ai.service.ts`, the CIG projection/entity-mapper files + specs, `cig-node.entity.ts`, `cig-nest-projection.ts`, `intent-classifier.service.ts`, `document-chunker.spec.ts`) | Closed 2026-07-23 (Cycle 162) — `npm run lint:fix` (a plain `eslint --fix`) resolved all 21 in one pass; verified formatting-only via a whitespace-stripped diff per file plus manual review of every non-trivial hunk (import-line collapsing, trailing-comma normalization, one `??`-precedence clarifying paren pair that doesn't change evaluation order). Backend `tsc` 0 errors and full suite **245/245 (1922/1922)** re-confirmed unchanged after the fix. |
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

### Cycle 160 (2026-07-23) — closed the dependency-audit regression: frontend 2→0, backend 8→2 (critical cleared and verified)

Picked up the other top item Cycle 158 left open. Started with the safe path: `npm audit fix` (non-force) on both trees. Frontend went straight to 0 vulnerabilities — `axios`, `protobufjs`, `js-yaml`, `shell-quote`, and `brace-expansion` all had patch/minor fixes within the ranges already declared in `package.json`, confirmed via `tsc`/`eslint` staying clean afterward. Backend dropped from 8 to 5 (clearing `typeorm`, `brace-expansion`, `dd-trace` and dependents), leaving only the `@xenova/transformers` chain — a critical `protobufjs` RCE (via `onnx-proto`'s vendored `protobufjs@6.11.6`) and a high `sharp` finding, both requiring `npm audit fix --force`'s breaking `@xenova/transformers@1.4.2` downgrade per npm's own suggestion.

Investigated before accepting that downgrade. `@xenova/transformers` is genuinely capped at 2.17.2 (checked `npm view ... versions` — no newer release exists, confirming the roadmap's "abandoned package" note) and the maintained successor, `@huggingface/transformers`, exists at 4.2.0 — but a full library migration is a separate, larger body of work, not evaluated end-to-end here. Instead tried the smaller, more surgical fix: an `overrides` entry forcing `protobufjs` to `^7.6.5` repo-wide. A nested override (`{"onnx-proto": {"protobufjs": "..."}}`) silently failed to apply through incremental `npm install` (left the tree in an "invalid" state); a blanket top-level override worked cleanly, deduping `onnx-proto`'s copy onto the same `7.6.5` already used elsewhere in this exact tree via `firebase-admin`/`google-gax` — zero new packages, zero version conflicts.

Did not stop at a clean `npm ls`. Since this override changes which `protobufjs` build actually parses ONNX model definitions at runtime, wrote a smoke script calling the real `pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')` against the already-cached model weights with real text — got back a genuine 768-dimension float vector, confirming the override doesn't break the actual inference path, not just its dependency tree.

Attempted the same override approach for the remaining `sharp <0.35.0` finding and hit a real environment wall: forcing a new `sharp` version requires npm to write a fresh native `.node` binary, and this dev sandbox's Windows Application Control policy blocked it outright — confirmed two ways (through the wrapped `ERR_DLOPEN_FAILED` error, and via a direct `node -e "require(...)"` `dlopen()` call on the file itself, both citing the same policy). The exact same policy separately re-flagged the frontend's `esbuild` binary after its own `npm audit fix` touched `node_modules`, blocking `npm run test:run` for the rest of this session — confirmed by retrying after a wait, not assumed permanent. Rather than ship a native-dependency version bump nobody had verified, reverted `sharp` to its original, already-trusted `0.32.6` — re-ran the smoke test to confirm the revert didn't undo the real fix (it didn't; the 768-dim vector still came back clean) — and left the `sharp` finding open, flagged for a cycle with CI or Linux-container verification access, where this Windows-only local restriction doesn't apply and production (`FROM node:20-alpine`) was never affected by it either way.

Verified nothing else regressed: backend `tsc` 0 errors and full suite 245/245 (1922/1922) re-run twice across the changes. Frontend `tsc` and `eslint` confirmed clean before the sandbox blocked further frontend runtime verification; frontend's own test suite was not re-run this cycle for that reason, reported honestly rather than assumed passing.

### Cycle 161 (2026-07-23) — turned "strictNullChecks blast radius unknown" into a real number, closed 44 of 166, found a genuine type-predicate bug along the way

Confirmed the Cycle 160 `esbuild` Application Control block was still active before picking a lever (`npm run test:run` still fails with `spawn UNKNOWN`), so scoped this cycle to backend-only work fully verifiable via `tsc` and `jest`, both of which work fine in this sandbox. Picked roadmap item #10 — `strictNullChecks: true` adoption, open since Cycle 38 with "blast radius unknown" as its entire status for dozens of cycles.

Ran `tsc --noEmit -p tsconfig.eslint.json --strictNullChecks true` (the real full-scope config with the flag force-overridden via CLI) to get a first-ever real count: **166 errors.** Rather than treat that as one blob or attempt a blind global flip, grouped by TS error code first: 44 errors (`TS2345`/`TS2339`) contained the literal text `type 'never'` in their message — a strong signal of one specific, well-understood TypeScript inference quirk rather than 44 independent null-safety findings. Confirmed by reading `lib/operational-intelligence/buildSnapshot.ts` (15 of the 44, the single largest concentration): `const anomalies = [];` and `const recommendations = [];` have no type annotation, and TypeScript infers empty `const`-declared arrays as `any[]` when `strictNullChecks` is off (this repo's current setting) but as `never[]` when it's on — breaking every later `.push()` call and property read. Fixed by annotating both against the already-existing `OperationalIntelligenceSnapshotOutput['anomalies'/'recommendations']` contract types from `./types`, instead of inventing new shapes or duplicating the existing ones.

The same pattern repeated, one root cause each, across 9 more files: `analytics.service.ts` (return-type-annotated function, reused the signature), `chat.service.ts` (2 separate spots, plain `string[]`/`{normal,caution,critical: string[]}`), `organization-onboarding.service.ts` and `tenant-provisioning.service.ts` (both accumulate `WorkspacesService['createWorkspace']` results, fixed with `Awaited<ReturnType<...>>`), `asset-recommendation.service.ts`, `platform-assets.service.ts`, `sentinel-tracking.service.ts` (reused an inline return-type annotation already on the method), and two e2e spec files (`audit-logging.e2e-spec.ts` reusing `Awaited<ReturnType<AuditService['log']>>`, `tls-enforcement.e2e-spec.ts` with a plain inline shape). Every fix either reused an existing declared type or matched an idiom already present elsewhere in the same file — no new type vocabulary invented.

Fixing `tenant-provisioning.service.ts`'s one error surfaced 3 more, different ones nearby, all in the same function. Root cause: `resolveWorkspaceDefaults()`'s `.filter()` callback declared a type predicate — `workspace is ReturnType<TenantProvisioningService['normalizeWorkspaceDefault']>` — but `normalizeWorkspaceDefault` can return `null`, so `ReturnType<...>` includes `null`, meaning the predicate never actually told TypeScript that `null` was filtered out, even though the runtime `.filter(Boolean)` genuinely does drop it. A **type-annotation-only bug**, not a runtime one — the array never actually contained nulls, but its static type claimed it might, breaking 3 downstream call sites once `strictNullChecks` was on. The fix, `NonNullable<ReturnType<...>>`, was already used correctly two methods away in the exact same file (line 259) — just not applied consistently. Fixed to match the file's own established pattern.

**Verification:** re-ran `tsc --noEmit -p tsconfig.eslint.json --strictNullChecks true` after all 10 files — the `type 'never'` errors are gone entirely, and the total dropped from 166 to **122** (44 closed, matching the 41 identified plus the 3 bonus tenant-provisioning errors exactly). Confirmed the *real* project config (without the experimental flag) still reports 0 errors on both frontend and backend `tsc`, and ran the full backend jest suite once: **245/245 suites, 1922/1922 tests**, including `test/operational-intelligence-build-snapshot.spec.ts` which directly exercises the most heavily-touched file.

While verifying, ran backend `npm run lint` for the first time this cycle series (prior cycles' "eslint 0 errors across both trees" claim, on inspection, had only ever actually re-run *frontend* lint) and found **21 real, pre-existing `prettier/prettier` errors** across 7 files, none touched by this cycle and none touched by any command in this cycle's `git status` — confirmed via `git status --short` that these files aren't part of any in-progress concurrent-session edit either, just a genuinely stale claim. Corrected the "What's genuinely solid" line rather than leave it standing, and added it as a fresh, separately-scoped roadmap item rather than fix it as a drive-by (the flagged files show real recent activity from 2026-07-21, and a `prettier --fix` sweep deserves its own verified pass).

**Deliberately not attempted:** flipping `backend/tsconfig.json`'s `strictNullChecks` to `true` globally. Of the remaining 122 errors, roughly 40 are genuine "possibly null/undefined" findings (not the mechanical never[] pattern) concentrated in `auth.service.ts` (11), `subscriptions.service.ts` (10), `ai.service.ts` (9), and a different cluster in `chat.service.ts` (6 more) — each needs a real judgment call about that call site's actual nullability invariant, in some of the most sensitive services in the codebase, without the ability this session to cross-check against a live frontend integration test run. Matches this project's established discipline (see the `EmergencyPatientService` DB-read-cutover precedent in project memory) of scoping large, judgment-heavy changes down rather than rushing them inside one cycle.

**Final state, all fresh this cycle:** backend `tsc` (full scope) 0 errors, frontend `tsc` 0 errors, backend jest 245/245 (1922/1922), `strictNullChecks` blast radius 166→122 with a real category breakdown replacing "unknown." Diff: 10 files, all type-annotation-only changes plus the one type-predicate correctness fix — zero behavior changes to any runtime code path, confirmed by the unchanged jest pass count.

### Cycle 162 (2026-07-23) — closed the backend `eslint` finding Cycle 161 caught: 21 pre-existing errors, all formatting-only

User said "let's go the next cycle" with no further specifics. Re-checked environment state first (same discipline as every cycle this series): `git status` clean except the usual harmless `qa/emergency-nav-coverage-report.json` timestamp diff, backend `npm run lint` still showing the 21 errors Cycle 161 found and deliberately left open. Picked it up as this cycle's lever — small, well-scoped, and safe: every one of the 21 errors was `prettier/prettier` (pure formatting), none in files this session had touched, and `git status` confirmed no concurrent-session activity on any of them.

Re-running `npm run lint` first (rather than trusting Cycle 161's tail-truncated summary) corrected an inherited miscount: Cycle 161 said "7 files"; the real list is **12** — 2 migration files (`CreateCigOperationalGraph.ts`, `CreateAiActionProposalAuditEntries.ts`), `ai.service.ts` (5 errors), and 9 more across the CIG projection/entity-mapper module and its specs, `intent-classifier.service.ts`, and `document-chunker.spec.ts`. The undercount was a byproduct of only having read the tail of a long lint-output capture last cycle — corrected in the roadmap rather than silently carried forward.

Ran `npm run lint:fix` (a plain `eslint --fix`, no manual edits). One pass resolved all 21 — `npm run lint` immediately after confirmed 0 errors, 0 warnings. Verified the fix was genuinely formatting-only rather than trusting `prettier/prettier`'s reputation alone: for each of the 12 changed files, stripped all whitespace from both the pre- and post-fix versions and confirmed the non-whitespace character streams matched wherever possible; for the handful where they didn't (trailing-comma additions/removals during multi-line↔single-line reformatting, and one `??`-precedence clarifying paren pair `mode === 'A' ? input.board?.durability ?? 'session' : 'session'` → `mode === 'A' ? (input.board?.durability ?? 'session') : 'session'`), read every hunk by hand to confirm each was a token-preserving reformat with no semantic change — trailing commas in destructuring/array literals are inert, and the added parens don't change `??`'s already-tighter precedence relative to the ternary.

**Verification:** backend `tsc --noEmit -p tsconfig.eslint.json` (full scope) still 0 errors; full backend jest suite re-run clean: **245/245 suites, 1922/1922 tests**, identical to Cycle 161's count — confirming zero behavioral change. Frontend `tsc` re-confirmed 0 errors as a sanity check (none of the 12 files are frontend-reachable, expected to be unaffected and were).

Corrected the "What's genuinely solid" line one more time — it had already been partially corrected in Cycle 161 to note backend `eslint` wasn't actually verified; now it can honestly say both trees are 0 errors, verified fresh this cycle. Closed the roadmap item Cycle 161 opened. Committed and pushed; memory updated.

**Final state, all fresh this cycle:** backend `tsc` 0 errors, backend `eslint` 0 errors (was 21), frontend `tsc` 0 errors, backend jest 245/245 (1922/1922) unchanged. Diff: 12 files, entirely `eslint --fix` output, individually verified formatting-only.

### Cycle 163 (2026-07-23) — closed the largest remaining `strictNullChecks` cluster: 13 errors, one root cause, one test file

User said "let's do the next round then the next cycle" — two cycles back to back. Re-confirmed environment state first (`git status` clean except the usual timestamp diff), then re-ran the `strictNullChecks` baseline check from Cycle 161 to get current numbers rather than trust the stale 122 figure: still 122, unchanged since Cycle 161 (as expected — Cycle 162 only touched formatting). Broke it down by file again and picked the single largest cluster: **13 errors, all in `test/tool-calling.spec.ts`**, ahead of `auth.service.ts` (11) and `subscriptions.service.ts` (10) — deliberately chosen over the larger sensitive-service clusters both for size and for risk: a test file's own assertions are the safety net for any type-level change made to it, unlike touching `auth.service.ts`'s actual runtime logic without a working frontend integration check available this session.

All 13 errors were one pattern, verified by reading the file rather than assumed from the error codes alone: `const sofaTool = tools.find((t) => t.name === 'sofa_calculator');` followed by `expect(sofaTool).toBeDefined();` then direct property access (`sofaTool.description`, etc.) on later lines. Jest's `toBeDefined()` is a **runtime** assertion — it correctly fails the test if the tool is missing, but it does nothing to TypeScript's **static** type, which stays `Tool | undefined` for every line after it. Same shape, 3 tool names (`sofaTool`/`drugTool`/`labTool`), each appearing in 2 separate `it()` blocks — 6 call sites total, 13 error lines.

Fixed by adding a non-null assertion (`!`) directly at each `.find(...)` call site rather than at each property-access line — this is safe specifically because `!` is erased at compile time and changes nothing about runtime behavior: if a tool genuinely goes missing in the future, `expect(sofaTool).toBeDefined()` on the very next line still fails the test exactly as before. Considered restructuring to `if (!sofaTool) throw ...` instead (which would give TypeScript real narrowing without an assertion) but rejected it as unnecessary churn for a test file — the existing `expect().toBeDefined()` pattern is already this codebase's established idiom for asserting a required value exists before using it, matched here rather than replaced.

**Verification:** re-ran the experimental `--strictNullChecks true` flag — `tool-calling.spec.ts` fully clean, total dropped **122 → 109** (all 13 closed, none newly introduced). Ran the file in isolation first (`npx jest test/tool-calling.spec.ts`): **16/16 tests passing**. Then the full backend suite: **245/245 suites, 1922/1922 tests**, identical to Cycle 162's count. Backend `tsc` (real project config, full scope) still 0 errors.

**Final state, all fresh this cycle:** backend `tsc` 0 errors, backend jest 245/245 (1922/1922) unchanged, `strictNullChecks` blast radius 122→109. Diff: 1 file, 6 non-null assertions added, zero behavior change (confirmed by the identical jest pass count and the file's own 16/16 in isolation).
