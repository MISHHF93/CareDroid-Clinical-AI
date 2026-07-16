# AI MASTER TODO — CareDroid Unified AI Node

**Created:** 2026-07-15 (Cycle 71) · **Plan:** [`AI_EXECUTION_PLAN.md`](./AI_EXECUTION_PLAN.md)  
**Rules:** Never delete completed tasks — mark VERIFIED with evidence. Status claims need a command run or file:line read.  
**Companion:** `MASTER_TODO.md` (platform backlog), `SCORECARD.md`, `AI_CONFIGURATION_MAP.md`

**Statuses:** `VERIFIED` · `PARTIAL` · `OPEN` · `BLOCKED` · `DEFERRED` · `N/A`

---

## 0. Deliverables (plan §20)

| ID | Deliverable | Status | Evidence |
|----|-------------|--------|----------|
| DL1 | `AI_EXECUTION_PLAN.md` | **VERIFIED** | repo root |
| DL2 | `AI_MASTER_TODO.md` | **VERIFIED** | this file (Cy71) |
| DL3 | `AI_ARCHITECTURE.md` | **VERIFIED** | Cy71 from source audit |
| DL4 | `AI_PROVIDER_MATRIX.md` | **VERIFIED** | Cy71 |
| DL5 | `AI_TOOL_CATALOG.md` | **VERIFIED** | Cy71 |
| DL6 | `AI_SCENARIO_LIBRARY.md` | **VERIFIED** | Cy71 + `data/ai-scenarios/v1/` |
| DL7 | `AI_EVALUATION_REPORT.md` | **VERIFIED** | Cy71 + `npm run ai:eval:gate` 41/41 |
| DL8 | `AI_SAFETY_REPORT.md` | **VERIFIED** | Cy71 |
| DL9 | `AI_DATASET_CARD.md` | **VERIFIED** | Cy71 |
| DL10 | `AI_MODEL_CARD.md` | **VERIFIED** | Cy71 |
| DL11 | `AI_RUNBOOK.md` | **VERIFIED** | Cy71 |

---

## 1. Discovery & contracts

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| U1 | Repository AI dependency map | **PARTIAL** | P0 | `AI_CONFIGURATION_MAP.md`, `AI_ARCHITECTURE.md` | Full map + classification of every AI artifact | Cy71 |
| U2 | Canonical `CareDroidUnifiedAIRequest/Response` | **VERIFIED** (types) | P0 | `lib/ai/unifiedAiContracts.ts` + tests | Runtime validation rejects bad requests | Cy71 |
| U3 | Migrate all callers onto unified envelope | **PARTIAL** | P1 | Cy72: CopilotPanel + invokeUnifiedAiConversational attach envelope; `POST /api/ai/unified` | EMS/triage/physician + remaining panels | Cy72 (reception/copilot) |

---

## 2. Gateway, providers, API, CLI

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| G1 | Single AI gateway (no duplicate service) | **VERIFIED** | P0 | Cy49 deleted dead copy | one module | Cy49 |
| G2 | Provider timeout + circuit breaker | **VERIFIED** | P0 | `transportSafety.ts` | test:lib | Cy69 |
| G3 | Multi-provider adapters | **VERIFIED** (unit) | P1 | anthropic/openai/azure/gemini/groq/local | health() no secrets | Cy69 |
| G4 | Direct API: providers/health, models, tools, requests/:id | **VERIFIED** | P1 | `ai.controller.ts` Cy71 | controller+service specs | Cy71 |
| G5 | Direct API: stream query, tool execute, retry, review | **PARTIAL** | P2 | Cy72: `POST /api/ai/unified`; stream via chat; review via human-review | full plan §12 surface | Cy72 (unified) |
| G6 | Dev CLI `npm run ai:query` | **VERIFIED** | P1 | `scripts/ai-query.mjs` | local + safety scenario exit codes; no secrets | Cy71 |
| G7 | No React direct provider calls | **VERIFIED** | P0 | frontend uses server/proxy clients | grep audit | prior |

---

## 3. Tools & calculators

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| T1 | 39 deterministic clinical executors | **VERIFIED** | P0 | REGISTERED_EXECUTOR_TOOL_IDS | backend suite + calculator_parity 100% | Cy44 |
| T2 | Unified typed tool registry with roles/timeouts | **PARTIAL** | P1 | three surfaces documented | single catalog source of truth | — |
| T3 | Calculator selection + execute via unified task | **PARTIAL** | P2 | orchestrator + chat recommender | unified task path | — |

---

## 4. RAG

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| R1 | Pipeline chunk/embed/retrieve/rerank/cite | **VERIFIED** (unit) | P0 | `backend/src/modules/rag/` | backend suite | Cy69 |
| R2 | Tenant isolation unit | **VERIFIED** | P0 | Cy58/64 | adversarial unit | Cy69 |
| R3 | Tenant isolation HTTP/Postgres | **OPEN** | P1 | MASTER RG4 | CI integration | — |
| R4 | Chunker edge-case matrix | **VERIFIED** | P2 | `document-chunker.spec.ts` Cy71 | empty/ws/multi/oversize | Cy71 |
| R5 | Live-retrieval eval baseline | **OPEN** | P2 | MASTER RG7 | Recall@K live | — |

---

## 5. OCR

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| O1 | Tesseract self-hosted + lifecycle | **VERIFIED** | P1 | Cy47 | fixture extract | Cy47 |
| O2 | PDF rasterization + messy accuracy | **OPEN** | P2 | MASTER O2 | eval set | — |
| O3 | Write gates before authoritative commit | **VERIFIED** (unit) | P1 | ocrFieldValidation | tests | Cy69 |

---

## 6. Safety & human review

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| S1 | Central safety policy | **VERIFIED** | P0 | safetyPolicy + clinicalSafetyRules | offline packs | prior |
| S2 | Human-review item from high-risk AI output | **VERIFIED** (unit) | P1 | `createHumanReviewItemIfRequired` + Cy71 test | createReviewItem called | Cy71 |
| S3 | Human-review full HTTP e2e | **OPEN** | P2 | MASTER AI7 remainder | integration test | — |

---

## 7. Workflows (Reception / EMS / roles)

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| W1 | Reception Copilot identity + shell | **PARTIAL** | P1 | Cy72 sourceScreen reception_copilot + unifiedChannel; MASTER RC3 | display audit + live demo | Cy72 |
| W2 | EMS handoff Playwright | **VERIFIED** (shell) | P1 | e2e ems-copilot 3/3 | free-text needs key | prior |
| W3 | Connect remaining role workflows to unified node | **OPEN** | P2 | plan §12 UI | all roles | — |

---

## 8. Scenarios, training, evaluation

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| E1 | Offline eval harness + CI gate | **VERIFIED** | P0 | 41/41 PASS Cy71 re-run | gate green | Cy71 |
| E2 | Scenario library seed | **VERIFIED** | P1 | `data/ai-scenarios/v1/` 4 scenarios | CLI runnable | Cy71 |
| E3 | Expand scenarios (nursing/physician/ops/admin + adversarial) | **OPEN** | P2 | plan §10 | full matrix | — |
| E4 | Fine-tune only if justified | **DEFERRED** | P3 | plan §11 | evidence-based | — |

---

## 9. Observability & DB

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| D1 | AI query persistence + tenant columns | **VERIFIED** | P0 | Cy48 migration | migrations green | Cy48 |
| D2 | Model/prompt in audit | **VERIFIED** | P1 | Cy46 | audit events | Cy46 |
| D3 | Quota atomicity under concurrency | **OPEN** | P2 | MASTER AI5 | Redis concurrency test | — |

---

## 10. Execution order progress (plan §21)

| Step | Item | Status |
|------|------|--------|
| 1–4 | Inspect, baseline, map, classify | **PARTIAL→strong** (docs + map) |
| 5 | Canonical contracts | **VERIFIED** types/validation |
| 6 | Unified gateway | **VERIFIED** backbone; caller migration open |
| 7 | Consolidate providers | **VERIFIED** unit |
| 8–10 | RAG / OCR / calculators | **VERIFIED** unit + residual opens |
| 11–13 | Tool registry / safety / human review | **PARTIAL→improved** (human review unit closed) |
| 14–15 | Direct query API / CLI | **PARTIAL→improved** (CLI + discovery APIs) |
| 16–18 | Role workflows | **PARTIAL** |
| 19–20 | Scenario library / eval suite | **PARTIAL→improved** |
| 21–29 | Improve / fine-tune / obs / tests / reports / TODO | **in progress** |

---

## Cycle 71 validation commands

```bash
npm run ai:eval:gate
npm run ai:query -- --providers
npm run ai:query -- --scenario data/ai-scenarios/v1/safety-prompt-injection.json
# backend (after npm install):
cd backend && npx jest src/modules/ai/ai.service.spec.ts src/modules/ai/ai.controller.spec.ts src/modules/rag/utils/document-chunker.spec.ts --runInBand
# frontend/lib (after npm install):
npx vitest run lib/ai/unifiedAiContracts.test.ts
```
