# MASTER TODO — Authoritative Engineering Backlog

**Created:** 2026-07-15 (Cycle 70) · **Owner default:** unassigned (single-maintainer repo; "owner" marks who verified, not who must do it)
**Rules (from `MASTER_EXECUTION_PLAN.md`):** never delete completed tasks — mark them VERIFIED with evidence and date. Every status claim below is backed by a command run or file:line read; nothing is inferred from filenames or prior reports. Companion evidence documents: `SCORECARD.md` (cycle log + gauges), `docs/MONDAY_AI_RAG_READINESS_REPORT.md` (defect register D1–D11).

**Statuses:** `VERIFIED` (done + evidence) · `PARTIAL` (real progress, scoped remainder) · `OPEN` · `BLOCKED` (with evidence) · `DEFERRED` (with justification) · `N/A` (with justification).

---

## 1. Architecture & TypeScript

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| A1 | Zero `tsc` errors, both trees, tests included | **VERIFIED** (re-check every cycle) | P0 | Frontend + backend `tsc --noEmit` 0/0 at full scope | `npx tsc --noEmit -p tsconfig.frontend.json` && backend `npx tsc --noEmit` | 2026-07-15 Cy69 |
| A2 | Zero ESLint errors, both trees | **VERIFIED** (re-check every cycle) | P0 | 0/0 after Cy69 fixes | `npm run lint` && backend `npx eslint src` | 2026-07-15 Cy69 |
| A3 | Remove duplicate AiGatewayService | **VERIFIED** | P1 | Dead copy deleted; survivor `backend/src/modules/ai-gateway/` spec-covered | backend suite green | 2026-07-14 Cy49 |
| A4 | God-controller breakup (platform-systems) | **VERIFIED** | P1 | 4 controllers split out; parent now 10-route single-responsibility | `platform-systems.controller.ts` + specs | 2026-07-15 Cy57 |
| A5 | Canonical `Result<T,E>`/ProblemDetails adoption platform-wide | **PARTIAL** | P2 | `src/contracts/results.ts` canonical; EMS-convert chain migrated (Cy68) — but 3 call sites read it flat until Cy69 fixed them. Most services still throw/ad-hoc | Each migrated service: tsc + its tests green; no flat access to `ResultSuccess` fields | — |
| A6 | 20-domain module re-consolidation | **OPEN** | P2 | Standing item from reconstruction brief; no cycle has attempted it wholesale | Per-domain move compiles + full suite green | — |
| A7 | Unified event/pub-sub model | **OPEN** | P2 | Workflows publish via ad-hoc realtime paths; no single event catalogue | Event catalogue doc + one bus implementation + workflow engine publishing through it | — |
| A8 | Rename vendor-named local services (D8: `OpenAIEmbeddingsService`, `CohereRankerService`) | **OPEN** | P3 | Both are local implementations wearing vendor names (readiness report §4) | Mechanical rename + imports; backend suite green | — |

## 2. Application shell & design language

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| S1 | One shell — consolidate scaffold onto real AppShell/Header/Sidebar | **VERIFIED** | P1 | Fake scaffold deleted, canonical re-exports kept | 2 full-suite runs 837/837 at the time | 2026-07-14 Cy45 |
| S2 | Real `WorkspaceHeader` / `PageCommandBar` / `PageLayout` components | **OPEN** | P2 | Deliberately removed as fake mocks in Cy45; page titles/actions live inline per-page today | New components + ≥3 pages migrated + tests | — |
| S3 | CCDS palette at root token layer + role accents | **VERIFIED** | P1 | `medical-color-layer.css` root block; role-accent system scoped correctly | `themeColorSystem`/`medicalThemeAudit` tests green | 2026-07-14 Cy45 |
| S4 | Medical Light theme layer | **VERIFIED** (unit) | P1 | `src/styles/medical-light-theme.css` + `medicalLightTheme.test.ts` (Cy63–68 consolidation; verified in 834-file suite run) | `npx vitest run src/styles/medicalLightTheme.test.ts` | 2026-07-15 Cy69 |
| S5 | Header duplication / stacked-header issues | **VERIFIED** | P1 | ProfileRoleSwitcher dedup (Cy42); header/CSS reconverged (Cy41) | Header test files green | 2026-07-13 |
| S6 | Ink-token contrast (WCAG 4.5:1) at token root | **VERIFIED** | P1 | 259→~48 axe violation nodes (−81%) | re-run `e2e/a11y.spec.mjs` | 2026-07-15 Cy59 |

## 3. Responsive

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| R1 | Responsive QA harness (Playwright, system-Edge escape hatch) | **VERIFIED** | P1 | `e2e/responsive-qa.spec.mjs` + CI job `responsive-playwright` | CI green | pre-existing, re-confirmed Cy62 |
| R2 | Ultrawide verification 2560×1080 / 3440×1440 / 3840×1600 | **OPEN** | P2 | Named in every brief; no run has captured these three widths | Screenshot set + overflow assertions at all 3 widths | — |

## 4. Roles & permissions

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| P1 | RBAC audit (zero open authorization questions) | **VERIFIED** | P1 | 3-cycle audit + Sentinel mirror + role-route gaps closed | `security.contract.test.ts` green | 2026-07-13 |
| P2 | `it_admin` role complete in all matrices | **VERIFIED** | P1 | Was missing from action + screen matrices (broke tsc); grounded in its nav model (settings home, clinical actions hidden) | `emergencyRoleActionMatrix/ScreenMatrix` tests green | 2026-07-15 Cy69 |
| P3 | Per-role dashboards/workflow completion (Triage/Nursing/Physician/Ops/Education) | **PARTIAL** | P2 | Reception is the reference; other roles have real screens (Cy45–58 history) but no per-role completion audit | Per-role checklist: nav + workflow + alerts + audit + backend wiring traced | — |
| P4 | EMS handoff permission matrix locked | **VERIFIED** | P1 | `emsHandoffPermission.contract.test.ts` (charge allow; physician/public deny) | test green | 2026-07-15 Cy64 |

## 5. Reception (reference role)

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| RC1 | Reception Command Desk + intake orchestration | **VERIFIED** | P1 | Built 2026-06-29; audited + escalation wiring fixed Cy-era | reception test files green | 2026-07-11 |
| RC2 | Reception→triage handoff backend | **VERIFIED** | P1 | `@Post('reception/handoff')` `WRITE_PHI`-guarded + `emergencyOsApi` client | backend suite green | 2026-07-15 Cy62 |
| RC3 | Reception Copilot end-to-end | **PARTIAL** | P1 | Cy72: unified envelope + sourceScreen `reception_copilot` + accountable card path; Playwright shell (`e2e/ems-copilot-handoff.spec.mjs`); free-text still needs provider key for live LLM | Display-audit checklist + live demo record | 2026-07-16 Cy72 |
| RC4 | OCR into Reception intake | **VERIFIED** (clean images) | P1 | Real Tesseract.js, end-to-end fixture-verified; PDF rasterization + messy-handwriting accuracy open (→ O2) | backend OCR specs green | 2026-07-14 Cy47 |

## 6. AI / providers

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| AI1 | Provider timeout + circuit breaker (D1) | **VERIFIED** | P0 | `transportSafety.ts` used by anthropic/groq/openai/gemini adapters + `egress.ts`; env knobs; typed `AI_TIMEOUT`/`AI_CIRCUIT_OPEN` | `npm run test:lib` (26 provider tests) | 2026-07-15 Cy69 |
| AI2 | Groq demo adapter, env-based, not in CI | **VERIFIED** (unit) | P1 | `groqAdapter.ts`, registry-wired, `GROQ_API_KEY`/`GROQ_MODEL` in both `.env.example`s | `npm run test:lib`; manual demo record still to capture (→ AI6) | 2026-07-15 Cy69 |
| AI3 | Deterministic fallback for critical workflows | **VERIFIED** | P0 | 8 of 9 AI domains on `careDroidAI-heuristic-node`; 39 deterministic calculators | backend suite green | re-confirmed Cy62 |
| AI4 | Model/prompt provenance in audit trail | **VERIFIED** | P1 | Wired at all call sites | backend specs green | 2026-07-14 Cy46 |
| AI5 | Quota atomicity under concurrency (simultaneous requests at boundary) | **OPEN** | P2 | No test exercises concurrent quota updates (readiness §3) | Redis-backed concurrency test in CI integration group | — |
| AI6 | Manual Groq demo record (model/latency/tokens/cost/failure mode) | **OPEN** | P2 | Requires `GROQ_API_KEY` in demo env — operational, not code | Recorded result separate from CI evidence | — |
| AI7 | Human-review record creation asserted end-to-end | **PARTIAL** | P2 | **Cy71 unit:** `ai.service.spec.ts` asserts `createReviewItem` from high-risk structured node via `createHumanReviewItemIfRequired`. Full HTTP/Postgres integration still open. | Integration test against real review queue | 2026-07-15 Cy71 (unit) |
| AI8 | Canonical unified AI contracts + CLI + discovery APIs | **VERIFIED** | P1 | `lib/ai/unifiedAiContracts.ts`, `scripts/ai-query.mjs`, `GET /api/ai/providers/health\|models\|tools\|requests/:id`, plan §20 docs | `npm run ai:eval:gate`; CLI safety scenario; backend 25/25 targeted | 2026-07-15 Cy71 |
| AI9 | Migrate Reception Copilot + AI Chief onto unified envelope | **PARTIAL** | P1 | Cy72: `unifiedAiEnvelope.ts`, CopilotPanel channel stamp, `POST /api/ai/unified`, accountableFromGateway prefers envelope | EMS/triage/physician callers + live demo record | 2026-07-16 Cy72 (reception path) |

## 7. RAG

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| RG1 | Pipeline (chunk/embed/cache/retrieve/rerank/cite) | **VERIFIED** (unit) | P0 | `backend/src/modules/rag/` all spec-covered, green in 232/232 | backend suite | 2026-07-15 Cy69 |
| RG2 | Chat + Copilot + clinical-intelligence integration | **VERIFIED** | P0 | 3 call sites (`chat.service.ts:469,1987`; `clinical-intelligence.service.ts:142`) | spec asserts | 2026-07-15 Cy62 |
| RG3 | Tenant isolation — unit level | **VERIFIED** | P0 | Cy58 org scoping + Cy64 adversarial unit cases + filter hardening (10 tests in `rag.service.spec.ts`) | backend suite | 2026-07-15 Cy69 |
| RG4 | Tenant isolation — adversarial HTTP/Postgres integration (D4 remainder) | **OPEN** | P1 | Unit-only today; needs full-path denial proof incl. cache hits, batch ops, malformed tenant context, against real Postgres | New CI integration group using the postgres service container | — |
| RG5 | PgVectorStore (D5) | **VERIFIED** (unit) | P1 | `pgvector.store.ts` implements `IVectorDatabase`, org IN-filter, dimension validation + migration `1772701300000` + `RAG_VECTOR_BACKEND` | live-Postgres run remains CI/deploy-only here | 2026-07-15 Cy69 |
| RG6 | Versioned clinical eval dataset + baseline (D6) | **VERIFIED** (offline) | P1 | `data/ai-eval/v1/` (manifest, DATA_CARD, packs) + `BASELINE_RECORDED.json` (41/41, offline_fixture) | `npm run ai:eval`; **live-retrieval baseline still open** (→ RG7) | 2026-07-15 Cy69 |
| RG7 | Live-retrieval eval baseline (Recall@K against real vector store, not fixtures) | **OPEN** | P2 | Offline-fixture mode only today | Recorded metrics vs. thresholds in BASELINE.md, no dataset tuning | — |
| RG8 | Chunker edge-case matrix (empty/whitespace/multilingual/malformed/no-valid-chunks) | **VERIFIED** | P2 | `document-chunker.spec.ts` (Cy71); also fixed tiktoken decode non-string force-split crash | Named tests per edge case green | 2026-07-15 Cy71 |
| RG9 | "Dictionary chunking" | **N/A** | — | Concept does not exist in this repo (verified twice: Cy pre-48 audit + Cy62); chunker is sentence-boundary + tiktoken | — | 2026-07-15 Cy62 |

## 8. OCR

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| O1 | Real self-hosted OCR (Tesseract.js) + worker lifecycle | **VERIFIED** | P1 | Fixture-verified extraction; `OnModuleDestroy` leak fix | backend OCR specs | 2026-07-14 Cy47 |
| O2 | PDF rasterization + real-world (messy) accuracy evaluation | **OPEN** | P2 | PDFs fall back to manual text with warning; accuracy on non-synthetic images unmeasured | Eval set + recorded accuracy | — |
| O3 | OCR write gates / field validation before authoritative | **VERIFIED** (unit) | P1 | `ocrFieldValidation.ts` + tests (Cy63–68 consolidation) | `npx vitest run src/services/ocrFieldValidation.test.ts` | 2026-07-15 Cy69 |

## 9. Database / Redis / CI

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| D1 | All 65 entities migration-backed; chain replays from empty | **VERIFIED** | P0 | 28/28 from empty (82 tables), 0 pending on rerun; fwd→revert→fwd round-trip Cy50 | `DATABASE_CLIENT=sqlite SQLITE_PATH=<scratch> npm run migration:run` (NOT `DATABASE_NAME` — see readiness report honesty note) | 2026-07-15 Cy69 |
| D2 | No `synchronize: true` reachable in production | **VERIFIED** | P0 | Wired config forces off for Postgres; dead file deleted; `synchronize-guard.spec.ts` locks it | backend suite | 2026-07-15 Cy69 |
| D3 | Redis real client + dev fallback + CI service | **VERIFIED** (structure) | P1 | `cache.service.ts` + `redis:7-alpine` in CI | Atomicity/tenant-key tests open (→ AI5) | 2026-07-15 Cy62 |
| D4 | lib/ tests in CI (D10) | **VERIFIED** | P0 | `test:lib` (32 files/204 tests) wired into `validate:ci` | `npm run test:lib` | 2026-07-15 Cy69 |
| D5 | Dedicated CI groups: migration-replay, tenant-isolation; fail-on-skipped-suites guard | **OPEN** | P2 | Migrations only exercised via app boot in E2E today | New `validate.yml` jobs | — |
| D6 | Mongoose integration suite real pass | **BLOCKED (locally)** | P2 | Windows Application Control blocks mongodb-memory-server binary on this machine — CI-only | Run in CI on ubuntu-latest | evidence Cy6, re-confirmed Cy62 |

## 10. Performance (carried from Cycle 61)

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| PF1 | manualChunks fusion (calculator catalog on every route) | **VERIFIED** | P1 | Preloads ~20→8 files; LCP improved 7/8 pages | `scripts/perf-profile.mjs` + perf suite vs isolated `vite preview` | 2026-07-15 Cy61 |
| PF2 | Calculator hub self-cost (bimodal 0.6–3.5s TBT) | **PARTIAL** | P2 | `lazySpecialtyCalculators.tsx` landed in consolidation; impact NOT yet re-measured | Re-run perf suite on calculator-bmi vs Cy61 numbers | — |
| PF3 | `analytics`+`vendor-charts` eager fusion (~660KB) | **OPEN** | P2 | Same manualChunks signature as PF1 | Sourcemap trace + preload list check after fix | — |
| PF4 | Entry chunk split (1,364KB post-fusion-fix) | **OPEN** | P3 | Grew by absorbing un-fused shared modules | Build output + TBT re-measure | — |

## 11. Branch review queue

| ID | Task | Status | Pri | Evidence / files | Acceptance & validation | Verified |
|---|---|---|---|---|---|---|
| B1 | `devin/security-audit-fixes` review | **PARTIAL** | P1 | Partially merged into consolidation (runtime-auth, socket auth — Cy65 note); rest unreviewed | Line-by-line review; no auth regression; backend suite green | — |
| B2 | `devin/error-handling`, `devin/least-covered-unit-tests` review | **OPEN** | P2 | Small, additive | Review + merge + suites green | — |
| B3 | `devin/calculator-shared-primitives`, `devin/frontend-styling-fixes` review | **OPEN** | P3 | ⚠ both overlap merged work (calculator dedup; CCDS tokens) — expect conflicts; reject accent/ink re-flattening | Review against current files | — |
| B4 | Fast-forward main to verified consolidation branch | **IN PROGRESS** | P0 | Gate: full frontend suite on `architect-mode/consolidation-2026-07-15` (running) | Suite ≥ baseline pass rate → `git push origin main` | — |

## 12. Process guards (standing, every cycle)

- Re-verify `tsc`/`eslint`/suites before every push — parallel sessions land work between cycles (Cy69 caught 10 tsc errors this way).
- Grep `SCORECARD.md` for the highest cycle number before claiming the next — the sequence is shared across sessions.
- Watch for cp1252 mojibake (`â€"`) whenever SCORECARD.md is rewritten by other tooling (recurred once, D11).
- Migration replays: use `SQLITE_PATH` env var, never `DATABASE_NAME`, and always a scratch file.
- Performance numbers only against a curl-verified isolated `vite preview` — never a reused port.
