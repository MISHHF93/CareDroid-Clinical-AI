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

## 11. Interactive Intelligence (Professor Mode extension)

| ID | Task | Status | Pri | Evidence | Acceptance | Verified |
|----|------|--------|-----|----------|------------|----------|
| IX1 | Interactive contracts (stream states, proposals, cards, sessions) | **VERIFIED** | P0 | `src/contracts/interactiveAi.ts` + tests | Type-safe transitions | 2026-07-16 |
| IX2 | Action proposal state machine (preview/approve/execute/rollback) | **VERIFIED** | P0 | `actionProposalService.ts` + tests | No high-risk auto-approve | 2026-07-16 |
| IX3 | Context assembler + patient-switch confirmation | **VERIFIED** | P0 | `contextAssembler.ts` + tests | No silent cross-patient attach | 2026-07-16 |
| IX4 | Workflow-triggered AI cards (dedupe/dismiss) | **VERIFIED** | P1 | `workflowAiCards.ts` + tests | Non-auto-executing actions | 2026-07-16 |
| IX5 | Suggested prompts from approved templates only | **VERIFIED** | P1 | `suggestedPrompts.ts` + tests | No free-form capability invention | 2026-07-16 |
| IX6 | Stream progress controller (named states) | **VERIFIED** | P0 | `streamProgress.ts` + tests | Cancel + terminal guards | 2026-07-16 |
| IX7 | Typed interactive realtime client (dedupe/stale) | **VERIFIED** (unit) | P1 | `interactiveRealtimeClient.ts` | Never show stale as live | 2026-07-16 |
| IX8 | InteractiveAIWorkspace + Medical Light CSS | **VERIFIED** | P0 | `components/interactive-ai/*` | Status live region, cancel, proposals | 2026-07-16 |
| IX9 | Reception workspace mount | **VERIFIED** | P0 | `ReceptionWorkspace.tsx` sidebar | Channel reception + seed cards | 2026-07-16 |
| IX10 | EMS handoff panel component | **VERIFIED** | P1 | Mounted on `EMSPipeline.tsx` (Cy74) | Live on /emergency/ems | 2026-07-16 Cy74 |
| IX11 | Interactive assist orchestrator (unified node) | **VERIFIED** | P0 | `interactiveAiOrchestrator.ts` | Safety block + progress + proposals | 2026-07-16 |
| IX12 | Playwright streaming/reconnect/a11y suite | **VERIFIED** (hermetic + unit) | P1 | Cy78: 5/5 via system-Edge — mounts, named stream phases→terminal, keyboard card ops, live-region semantics, scoped axe clean; caught + fixed a real no-op Acknowledge. Cy79: reconnect/offline proof — `data-live` never claims live without a connection; workspace fully operable through a hard offline/online cycle (6/6); both workspace routes added to the main a11y suite and clean on first scan (10/10). `npm run test:e2e:interactive-ai` | Live-SSE reconnect against a real backend = CI/deploy scope | 2026-07-17 Cy79 |
| IX13 | Personal interaction inbox + collaboration | **PARTIAL** | P2 | Cy74: `InteractionInbox` + `interactionInbox.ts` in workspace | Assign/comment collaboration still open | 2026-07-16 Cy74 |
| IX14 | Command-palette typed AI commands | **OPEN** | P2 | — | Searchable permissioned commands | — |
| IX15 | Simulation mode scoring on scenario library | **OPEN** | P2 | Scenario library exists | Training score without prod writes | — |
| IX16 | Persist proposals server-side | **VERIFIED** | P2 | Cy77: write-through TypeORM journal (`AIActionProposalRecord`, table `ai_action_proposals`, migration `1772701600000`, chain 30/30 from empty) behind the unchanged synchronous contract; module-init rehydration proven (restart survival test); journal failure never breaks the workflow; corrupt rows skipped. 5 persistence tests + existing spec untouched-green | `npx jest src/modules/ai/ai-action-proposal.persistence.spec.ts` (5/5) · Remainder tracked here: hash-chain audit per transition (pre-consolidation design) + multi-instance read model | 2026-07-17 Cy77 |
| IX17 | Triage interactive assist mount | **VERIFIED** | P1 | `TriageQueueFeature` + `TriageInteractiveAssistPanel` | Channel triage seed cards | 2026-07-16 Cy74 |

## Cycle 71–73 validation commands

```bash
npm run ai:eval:gate
npm run ai:query -- --providers
npm run ai:query -- --scenario data/ai-scenarios/v1/safety-prompt-injection.json
# backend (after npm install):
cd backend && npx jest src/modules/ai/ai.service.spec.ts src/modules/ai/ai.controller.spec.ts src/modules/rag/utils/document-chunker.spec.ts --runInBand
# frontend interactive intelligence:
npx vitest run src/contracts/interactiveAi.test.ts src/services/interactiveAi --maxWorkers=1
npx tsc --noEmit -p tsconfig.frontend.json
```
