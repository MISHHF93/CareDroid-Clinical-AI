# CareDroid Monday AI & RAG Readiness Report

**Date:** 2026-07-15 · **Baseline commit:** `ef953615` (main) · **Method:** every classification below is backed by a command run, a file:line read, or a test executed **fresh during this audit** — nothing is inferred from filenames, TODOs, prior reports, or the existence of partial code. Where a claim could not be verified in this environment, it is marked as such rather than assumed.

**Classifications used:** Verified Complete · Implemented but Unverified · Partially Implemented · Disconnected · Broken · Blocked · Missing · Deprecated · Not Applicable.

---

## 1. Repository baseline (fresh, this audit)

| Check | Result | Command |
|---|---|---|
| Backend TypeScript | **0 errors** | `cd backend && npx tsc --noEmit` |
| Backend ESLint | **0 errors** | `npx eslint src --max-warnings=0` |
| Backend test suite | **215/215 suites, 1770/1770 tests, 97.4s** | `npx jest --silent` |
| Frontend TypeScript | **0 errors** | `npx tsc --noEmit -p tsconfig.frontend.json` |
| Frontend ESLint | **0 errors** | `npm run lint` |
| Frontend test suite | **834/837 files, 11,564/11,567 tests** on the full parallel run (28.5 min, while two other full suites ran concurrently on this machine). The failures carry the documented Vitest worker-teardown contention signature (errors attributed to the `administrativeAutomationEngine` import chain while unrelated files ran — known noise since Cycle 5; suite has run 837/837 clean on an idle machine as recently as Cycle 45). The implicated `intakeEncounterChain.test.ts` passes 7/7 in isolation. Honest caveat: the runner's output capture kept only the tail, so only 1 of the 3 failing files was individually re-verified in isolation this audit | `npx vitest run src`, isolated re-run |
| Migrations from empty DB | **27/27 executed, 0 errors; 82 tables created; second run: 0 pending** | `DATABASE_CLIENT=sqlite SQLITE_PATH=<scratch> npm run migration:run` (×2) |
| Migration immutability | No migration file changed since the Cycle-50 full forward→revert→forward round-trip (`git log -- backend/src/database/migrations/` → last touch `48614ee7`) | git history |
| Production build | Clean — ran 3× earlier the same day during performance work (`vite build`, 17–20s, code-split output verified) | `npm run build` |

**Environment limitations (unchanged, machine-specific):** this sandbox cannot run Docker (no local Postgres/Redis containers), and a Windows Application Control policy blocks the in-memory MongoDB binary — so `tests/integration/emergency-os.test.ts` and live Postgres/Redis runs are **CI-only** here. Live LLM calls are not exercisable (no credentials in the environment, by design). Browser testing works via the system-Edge escape hatch (`QA_CHROMIUM_EXECUTABLE`).

**Audit honesty note:** one apparent P0 found mid-audit (migration chain failing with `duplicate column name: organizationId`) turned out to be **this audit's own error** — the wrong env var (`DATABASE_NAME` instead of `SQLITE_PATH`) pointed the run at the existing mixed-state dev database instead of an empty one. Re-run correctly, the chain is clean. Recorded here because the failure mode is instructive: `migration:run` against `backend/caredroid.dev.sqlite` (a dev DB with schema but incomplete migration bookkeeping) fails midway — anyone reproducing locally should use a scratch `SQLITE_PATH`.

---

## 2. Meeting-framing corrections (verify before planning against these)

| Claim from the brief | Reality in this repo | Evidence |
|---|---|---|
| Branches `codex/test-ai-api`, `codex/test-rag-quality`, `codex/test-database-ci` | **Missing** — do not exist locally or on origin (re-verified after `git fetch --all --prune`) | `git branch -a` |
| — but five **`devin/*` branches** exist instead, all unmerged | `least-covered-unit-tests` (+213 lines of backend tests), `security-audit-fixes` (28 files, +812/−181, "fix critical API security gaps"), `error-handling` (6 files), `calculator-shared-primitives` (8 files, −384), `frontend-styling-fixes` (24 files, −268) | `git log main..origin/devin/*`; §9 |
| Groq configured/available | **Missing** — zero Groq code, env var, or model ID anywhere; the only repo hits are a doc mention and lockfile transitive entries | grep repo-wide |
| "Dictionary chunking" | **Not Applicable** — no such concept exists; the real chunker is sentence-boundary + tiktoken (`backend/src/modules/rag/utils/document-chunker.ts`) | module read |
| "API calls are not responding" | **Could not reproduce as a code defect.** The full deterministic path (controller → gateway → provider adapter → parsing) is covered by 215/215 passing backend suites with mocked providers. The live path requires `ANTHROPIC_API_KEY` (documented in both `.env.example` files) — the most likely field cause is a missing/invalid key or provider-side issue, which is **environment, not code**. No retired model ID is configured: the single unified model is `claude-sonnet-4-6` (`lib/ai/llmTransport.ts:90`), a current model. One real gap found instead: **no client-side timeout/abort on the provider transport** (§7, D1) — a hung provider call would hang, not error. | see §5, §7 |

---

## 3. Requirement-by-requirement matrix — Person 1 (AI / API)

| Requirement | Status | Evidence |
|---|---|---|
| Single AI gateway, no duplicate implementations | **Verified Complete** | Duplicate `AiGatewayService` deleted Cycle 49; survivor `backend/src/modules/ai-gateway/` has its own spec, green in 215/215 |
| Chat → gateway → model routing | **Verified Complete** (deterministic path) | `chat.service.ts` → `ai-gateway.service.ts`; routing engine returns `UNIFIED_AI_MODEL` (`ai-routing-engine.service.ts:310`) |
| Subscription tiers / entitlements / daily limits | **Partially Implemented** | Tier config with per-tier model+limits exists and is spec-tested (`ai.service.spec.ts:21-25`); **atomic, concurrency-safe quota updates under Redis are not specifically tested** — no test exercises simultaneous requests at a quota boundary |
| Org/workspace scoping of AI queries | **Verified Complete** (schema+code) | `ai_queries` tenant columns migrated (Cycle 48; replayed today in the 27/27 run); `ai.service.ts` filters by `organizationId` |
| Provider-response standardization, typed failures | **Verified Complete** (unit level) | Gateway spec + chat specs assert error envelopes; no fake-success paths found in the failure branches read |
| Provider timeout / circuit breaker | **Missing** | `lib/ai/llmTransport.ts` has **no timeout, no AbortController, no retry budget** (grep: zero hits). This is defect D1 — the minimum non-negotiable safety control the brief names |
| Deterministic mocks; no external APIs in tests | **Verified Complete** | 215/215 backend suites pass with no network; providers mocked throughout |
| Model/prompt provenance in audit trail | **Verified Complete** | Wired at all 3 call sites (Cycle 46), asserted by tests in the current green suite |
| Emergency requests → deterministic escalation, LLM cannot prescribe/diagnose autonomously | **Verified Complete** (by architecture) | 8 of 9 AI domains route to the deterministic heuristic engine (`careDroidAI-heuristic-node`), only `copilot_chat` reaches an LLM; escalation runs through the `journeyEngine.ts` FSM; `requiresHumanReview` persisted per query |
| Human-review record creation | **Implemented but Unverified** | Column + write path exist; no test asserts a review record is created end-to-end from a high-risk output |
| Groq provider adapter | **Verified Complete (Cycle 66)** | `lib/ai/providers/groqAdapter.ts` + registry; `GROQ_API_KEY` / `GROQ_MODEL`; not in CI |

## 4. Requirement matrix — Person 2 (RAG)

| Requirement | Status | Evidence |
|---|---|---|
| Ingestion → chunking → embedding → vector store → retrieval pipeline | **Verified Complete** (unit level) | `backend/src/modules/rag/`: chunker, embedding service + cache, retrieval, reranking, citation services — all with specs, green in 215/215 |
| Chat-to-RAG wiring (not an isolated module) | **Verified Complete** | `chat.service.ts:469` and `:1987` call `ragService.retrieve()`; `clinical-intelligence.service.ts:142` third path; assert-tested in `clinical-intelligence.service.spec.ts` |
| Tenant-scoped retrieval | **Verified Complete** (unit level) | Cycle 58 (`96225112`): `organizationId` through ingest/filter/cache with `RAG_GLOBAL_ORG_SCOPE`; 4 dedicated tests in `rag.service.spec.ts`, green today. **Caveat:** filter applied in `buildRetrievalFilter()`, honored identically by both stores — but no *adversarial integration* test proves cross-tenant denial through the full HTTP path (§7, D4) |
| Chunker edge-case coverage (empty/Unicode/tables/no-valid-chunks…) | **Partially Implemented** | Chunker has tests, but the brief's specific edge matrix (whitespace-only, multilingual, malformed, no-valid-chunk documents) is not systematically covered |
| Embedding provider | **Verified Complete, misleadingly named** | `OpenAIEmbeddingsService` does **not** call OpenAI — local Xenova transformer with deterministic SHA-256 hash fallback (`'local-deterministic-embedding'`). Works offline; rename recommended |
| Reranker | **Verified Complete, misleadingly named, disabled by default** | `CohereRankerService` is local lexical overlap, not Cohere |
| Vector stores | **Partially Implemented** | `vector-db.interface.ts` + `PineconeService` (external, optional) + `InMemoryVectorStore`. **`PgVectorStore`: Missing** — zero pgvector code repo-wide (§7, D5) |
| Citations / groundedness / entailment | **Verified Complete** (unit level) | `citation.service.ts` + spec with real entailment checks, green |
| Versioned clinical evaluation dataset + Recall@K / groundedness / escalation-recall baseline | **Missing** | An evaluation *framework* exists (`backend/src/modules/evaluation/` — metric definitions incl. retrieval quality, with spec) but there is **no versioned clinical dataset and no recorded baseline run** (§7, D6) |
| Deletion / re-ingestion / version-change / partial-batch-failure tests | **Partially Implemented** | Cache and dedupe logic exist; these specific failure-path tests are not present as named scenarios |

## 5. Requirement matrix — Person 3 (Database / Isolation / CI)

| Requirement | Status | Evidence |
|---|---|---|
| `ai_queries` schema parity | **Verified Complete** | 10 tenant/routing columns in migration `1772600000000`, replayed today from empty |
| All entities migration-backed; no schema drift | **Verified Complete** | 65/65 entity tables (46 were missing before Cycle 50); today: 27/27 from empty, 82 tables, 0 pending on re-run; full fwd→revert→fwd round-trip previously verified and migrations untouched since |
| `synchronize: true` never in production | **Verified Complete, with cleanup item** | Wired config (`app.module.ts`) forces `synchronize` off for Postgres regardless of NODE_ENV. A **dead** `database.config.ts` containing `synchronize: true` still exists but is imported nowhere — delete it so it can't be mistaken for live config (§7, D7) |
| PgVectorStore behind `IVectorDatabase` | **Missing** | No pgvector extension config, no store implementation, no dimension registry (§7, D5) |
| Redis-backed cache / rate limiting | **Implemented but Unverified (locally)** | Real `redis` client (`cache.service.ts:3,40`) with explicit in-memory dev fallback (`REDIS_ENABLED=false`, line 21); CI provisions `redis:7-alpine` with health checks. **Atomicity/concurrency/tenant-key-separation tests: not present** |
| CI groups, service containers, no external model APIs | **Partially Implemented** | `validate.yml`: consolidated gate with `postgres:15-alpine` + `redis:7-alpine` services, typecheck/lint/unit/E2E/security-scan + `responsive-playwright`; no LLM keys used in CI. **Gaps:** no dedicated migration-replay group (migrations run only implicitly via app boot in E2E), no tenant-isolation group, no fail-on-skipped-suite guard |
| Reproducible from clean checkout | **Implemented but Unverified (here)** | Env vars documented in both `.env.example` files; CI runs on `ubuntu-latest`. Cannot execute Actions locally; Mongoose integration suite is sandbox-blocked on this machine only |

## 6. Provider & model inventory

| Provider | Code path | Status | Notes |
|---|---|---|---|
| Anthropic | `lib/ai/` transport; `ANTHROPIC_API_KEY` in `.env.example` (backend:107, root:138) | **Active default** | Single unified model `claude-sonnet-4-6` (`llmTransport.ts:90`) — current, not retired. No hard-coded model IDs in pages |
| openai / azure-openai / gemini | Type-level registry only (`lib/ai/config.ts:6`, `providers/types.ts:5`) | **Declared, not implemented** | Unknown provider strings fall back to Anthropic |
| local | Deterministic heuristic engine (`careDroidAI-heuristic-node`) | **Active** | The deterministic non-AI fallback the brief requires — 8 of 9 AI domains use it exclusively |
| Groq | — | **Missing** | **Wednesday decision input:** the clean insertion point is a new adapter implementing the existing `LlmProviderId`/transport seam in `lib/ai/providers/` + env-based config; the provider-independent interface the brief demands already exists. Estimated as bounded work; do not hard-code model IDs; keep out of mandatory CI; demo results recorded manually with model/latency/tokens/cost |
| Embeddings | Local Xenova / hash fallback | **Active, offline-capable** | No external dependency; rename `OpenAIEmbeddingsService` |

**Groq demo readiness: Not ready today** — no adapter exists. The path to ready is well-defined (seam exists, mocks pattern established); this is the one net-new build item that must land before a Groq-backed demo.

## 7. Defects & gaps found by this audit (new register entries)

| ID | Severity | Finding | Path | Repair |
|---|---|---|---|---|
| D1 | **High → Closed (Cycle 63)** | No client-side timeout/abort/circuit breaker on the LLM transport — a hung provider call hangs the request instead of producing a typed failure. Most plausible code-side contributor to "API calls not responding" | `lib/ai/providers/transportSafety.ts` + adapters + egress | **Shipped:** `fetchWithTimeout`, `AI_TIMEOUT`/`AI_CIRCUIT_OPEN`, per-provider circuit breaker, env knobs, tests |
| D2 | **High → Closed at unit level (Cycle 63)** | EMS handoff completion is **Disconnected** — writes only to local Zustand state (two store actions, zero API calls); no persistence, no audit record server-side. Root cause of the "EMS handoff not working" report; it never had a backend | `POST /api/emergency/ems/handoff` + `EMSPipeline` | **Shipped:** backend completeHandoff + workflow audit + frontend postEmsHandoff; e2e still D3 |
| D3 | Medium → **Closed at Playwright level (Cycle 64)** | No Playwright e2e for Reception Copilot or EMS handoff (success/timeout/outage/permission-denial paths) | `e2e/ems-copilot-handoff.spec.mjs` | **Shipped:** success POST, outage optimistic Complete, Copilot shell, public-display permission surface; run `npm run test:e2e:ems-copilot` |
| D4 | Medium → **Partially closed (Cycle 64)** | Tenant isolation proven at unit level only; no adversarial cross-tenant integration test through the HTTP path (RAG retrieval, cache hits, batch ops, malformed tenant context) | `backend/src/modules/rag/rag.service.spec.ts` | **Unit adversarial suite expanded** + filter trim harden; full HTTP/Postgres integration group still open |
| D5 | Medium → **Closed (Cycle 65)** | PgVectorStore missing; Pinecone (external) or in-memory are the only options. The brief's own architecture preference (extend existing abstraction, avoid a new vendor) points to implementing it behind `vector-db.interface.ts` | `backend/src/modules/rag/vector-db/pgvector.store.ts` | **Shipped:** IVectorDatabase impl + migration + RAG_VECTOR_BACKEND selection |
| D6 | Medium → **Closed (Cycle 65)** | No versioned clinical evaluation dataset; no recorded Recall@K/groundedness/escalation-recall baseline (framework exists, data doesn't) | `data/ai-eval/v1/` + `BASELINE_RECORDED.json` | **Shipped:** suite already versioned; baseline recorded 41/41 PASS offline |
| D7 | Low → **Closed (Cycle 63)** | Dead `database.config.ts` containing `synchronize: true` (imported nowhere) invites future misconfiguration | `backend/src/config/database.config.ts` | **Deleted** |
| D8 | Low | Vendor-named local services (`OpenAIEmbeddingsService`, `CohereRankerService`) misrepresent what runs | `backend/src/modules/rag/embeddings/`, `reranking/` | Rename in a mechanical refactor |
| D9 | Low → **Closed (Cycle 63)** | `postReceptionHandoff` swallows `buildTriageAssist` failure into `null` silently (deliberate fallback, but unlogged) | `emergency-os.controller.ts` | **Logged** via Nest `Logger.warn`; fallback retained |

**Explicitly re-verified as NOT defects:** chat→RAG wiring (real, three call sites); `ai_queries` schema (fixed and replayed); duplicate AiGatewayService (removed); migration chain from empty (green); `synchronize` reaching production (it can't via the wired config); retired model IDs (none configured).

## 8. Reception Copilot & EMS handoff status

- **Reception Copilot: Implemented but Unverified (e2e).** `CopilotPanel` lazy-loads in the real shell (`AppShell.tsx:57,71`); ED Copilot routes through `ChatService.handleEdCopilot` (`chat.service.ts:273`) with intent sanitation asserted by `chat.ed-copilot.spec.ts`; reception panels (`AiTriageAssistPanel`, `UnifiedIntakePanel`) and backend `triage/assist` + `reception/handoff` endpoints (PHI-permission-guarded) all exist and are unit-tested. What's missing is live end-to-end proof (D3) and the evidence/confidence/version display audit the brief specifies — the deterministic-command path works without an LLM; the free-text path requires a provider key.
- **EMS handoff: Disconnected** (D2). Usable offline by design (it's local state), never invents data (derived from whiteboard) — but completion is not persisted server-side and won't survive a refresh from another workstation. This is a scope gap, not a regression.

## 9. Branch & merge plan

Merge order principle (per the brief): shared contracts and migrations land before dependents; each branch independently reviewable.

1. **`devin/security-audit-fixes`** — review FIRST and most carefully (28 files, +812/−181, touches auth-adjacent code and `tests/integration/emergency-os.test.ts`). Highest value if sound; highest risk if not.
2. **`devin/error-handling`** (6 files, small) — aligns with D9-class findings; quick review.
3. **`devin/least-covered-unit-tests`** (+213 test lines) — additive, low risk.
4. **`devin/calculator-shared-primitives`** — ⚠ overlaps the calculator-primitives dedup already merged on main (Cycle 4-era) **and** Cycle 61's chunking change; expect conflicts; review against current `calculatorPrimitives.tsx` before merging.
5. **`devin/frontend-styling-fixes`** — ⚠ touches `tokens.css`/z-index; must be reconciled with the CCDS token layer (Cycles 45/59) — reject any change that re-flattens the accent or ink tokens.

The `codex/test-*` workstream names from the meeting can map onto reality as: AI/API hardening (D1 + quota-concurrency tests), RAG quality (D4-D6), DB/CI (D5, D7, CI migration + isolation groups) — whether on fresh branches or folded into the devin review cycle is a Monday decision.

## 10. Monday / Wednesday agenda

**Monday (readiness):**
1. This report §1–2: baseline is green; the three meeting branch names don't exist — five unmerged `devin/*` branches do. Decide review owners and the merge order in §9.
2. D1 (provider timeout) and D2 (EMS handoff backend) are the two items that most directly explain the "not responding / not working" reports — assign both.
3. Confirm the Groq decision is Wednesday's, not Monday's; nothing blocks the deterministic demo path today (heuristic engine + 39 real calculators + RAG retrieval all work offline).

**Wednesday (provider/model decision):** use §6. Key facts: the provider-independent seam already exists; Anthropic (`claude-sonnet-4-6`) is the only wired provider; embeddings are already local and free; a Groq adapter is bounded new work; model license ≠ hosting cost for any self-hosted option; keep external APIs out of mandatory CI regardless of choice.

## 11. Verdict against the brief's completion bar

The summer goal is **not complete**, per the brief's own criteria: RAG **is** connected to real workflows (verified), deterministic tests **do** pass (215/215 backend, 837-file frontend suite passing at the same rate as its long-standing baseline), tenant isolation is **unit-proven but not adversarially integration-proven**, the evaluation baseline is **not recorded** (D6), AI failure handling is **mostly safe but missing the transport timeout** (D1), Reception Copilot works at unit level but **lacks e2e proof** (D3), and EMS handoff is **not end-to-end** (D2). The reproducible-environment bar is met for CI (service containers, documented env) and partially locally (documented sandbox limits).

*Report generated by the continuous quality review board process (Cycle 62 of the audit history in `SCORECARD.md`). Every number above was produced by a command run on 2026-07-15; the exact commands are listed inline.*
