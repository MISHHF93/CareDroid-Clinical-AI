# CareDroid Unified AI Architecture

**Status:** living document · **Updated:** 2026-07-15 (Cycle 71 — AI Execution Plan activation)  
**Authority:** verified source paths + offline eval gate (`npm run ai:eval:gate`)  
**Plan:** [`AI_EXECUTION_PLAN.md`](./AI_EXECUTION_PLAN.md) · Register: [`AI_MASTER_TODO.md`](./AI_MASTER_TODO.md)

---

## 1. Goal

One **CareDroid Unified AI Node** that receives requests from every approved channel, selects tools and knowledge, retrieves evidence, executes deterministic functions, calls approved models, validates outputs, enforces safety, creates human-review tasks when required, records activity, and returns structured responses.

This is **not** a page-local chatbot. Feature modules must not call foundation providers directly.

---

## 2. Canonical request path

```text
User action (Reception / EMS / Triage / Nursing / Physician / Ops / Admin / Training / API / CLI)
    ↓
Frontend component or CLI / direct API
    ↓
Typed request (CareDroidUnifiedAIRequest | CareDroidAINodeDto | chat message)
    ↓
AuthN + entitlement + tenant isolation
    ↓
AI gateway envelope (ai-gateway) + optional MoE route plan
    ↓
Intent / clinical-risk / emergency escalation classification
    ↓
Tool allowlist + model router
    ↓
RAG / OCR / calculator / structured node / LLM adapter
    ↓
Structured-output validation + safety policy
    ↓
Human-review item when requiresHumanReview
    ↓
Audit / metering / cost / metrics / trace
    ↓
CareDroidUnifiedAIResponse (or role-specific envelope)
    ↓
UI rendering (citations, accept/modify/dismiss/escalate)
```

### Primary code anchors

| Concern | Path |
|---------|------|
| Canonical contracts | `lib/ai/unifiedAiContracts.ts` |
| Structured heuristic node | `lib/ai/careDroidAI.ts` |
| LLM egress + adapters | `lib/ai/providers/` (`egress.ts`, `registry.ts`, adapters) |
| Safety policy | `lib/ai/safetyPolicy.ts`, `lib/ai/clinicalSafetyRules.ts` |
| Prompt registry | `lib/ai/promptRegistry.ts` |
| Tool registry (ED copilot) | `lib/ai/toolRegistry.ts` |
| Nest AI controller/service | `backend/src/modules/ai/` |
| AI gateway | `backend/src/modules/ai-gateway/` |
| Chat pipeline | `backend/src/modules/chat/` |
| RAG | `backend/src/modules/rag/` |
| OCR | `backend/src/modules/emergency-os/ocr-providers.ts` |
| Tool orchestrator (39 calculators) | `backend/src/modules/medical-control-plane/tool-orchestrator/` |
| Human review | `backend/src/modules/human-review/`, `platform-governance` |
| Local ML (NLU + artifact) | `backend/ml-services/unified-ai-node/` |
| Offline eval | `scripts/ai-eval-run.mjs`, `data/ai-eval/v1/` |
| Dev CLI | `scripts/ai-query.mjs` (`npm run ai:query`) |

---

## 3. Module composition (target = current backbone)

```text
CareDroid AI Gateway
├── Request validator (unifiedAiContracts + DTOs)
├── Authentication and entitlement guard
├── Tenant and workspace isolation guard
├── Role and permission resolver
├── Intent classifier (Nest + local MLP)
├── Clinical-risk / emergency escalation
├── Tool allowlist resolver
├── Model router (MoE + provider registry)
├── RAG orchestrator
├── OCR orchestrator (Tesseract default)
├── Deterministic calculator executor
├── Workflow action planner (heuristic node)
├── Language model adapter (Anthropic/OpenAI/Azure/Gemini/Groq/local)
├── Structured-output validator
├── Safety policy engine
├── Human-review creator (PlatformGovernanceService.createReviewItem)
├── Response grounding / citations
├── Redaction and privacy controls
├── Audit, metering, cost, telemetry
├── Provider fallback and circuit breaker
└── Typed response formatter
```

---

## 4. Provider independence

`LlmAdapter` interface (`lib/ai/providers/types.ts`):

- `health()` — configured/ok without secrets
- `complete(request)` — non-streaming generation
- Streaming optional per adapter

Adapters: `anthropic`, `openai`, `azure-openai`, `gemini`, `groq`, `local` (deterministic, always configured).

Timeouts and circuit breakers: `lib/ai/providers/transportSafety.ts`.

---

## 5. Direct executable interfaces

| Interface | Status |
|-----------|--------|
| `POST /api/ai/query` | Implemented |
| `POST /api/ai/node` | Implemented (structured heuristic node) |
| `POST /api/ai/structured` | Implemented |
| `GET /api/ai/providers/health` | Implemented (Cycle 71) |
| `GET /api/ai/models` | Implemented (Cycle 71) |
| `GET /api/ai/tools` | Implemented (Cycle 71) |
| `GET /api/ai/requests/:requestId` | Implemented (Cycle 71) |
| `POST /api/ai/query/stream` | Partial — chat streaming path exists separately |
| `POST /api/ai/tools/:toolName/execute` | Partial — tool-orchestrator owns execution |
| `POST /api/ai/requests/:requestId/retry` | Missing |
| `POST /api/ai/requests/:requestId/review` | Partial — human-review decision endpoints exist under `/api/human-review` |
| CLI `npm run ai:query` | Implemented (Cycle 71) |

---

## 6. Safety non-negotiables

AI **may**: retrieve, summarize, classify, identify missing information, explain, suggest, draft, forecast, recommend approved next actions, select deterministic tools, create human-review tasks.

AI **must not**: autonomously diagnose, prescribe, order medication, assign definitive triage, alter authoritative patient data, suppress critical alerts, merge identities, redirect ambulances, place a facility on diversion, discharge/admit, resolve restricted clinical alerts, or execute irreversible clinical actions.

High-risk outputs set `requiresHumanReview` / `requiresClinicianReview` and create a governance review item via `AIService.createHumanReviewItemIfRequired`.

---

## 7. Classification of major surfaces (evidence-based)

| Surface | Classification | Notes |
|---------|----------------|-------|
| AI gateway envelope | Verified complete (unit) | Single module after Cy49 dedup |
| Structured CareDroid AI node (18 intents) | Verified complete (heuristic) | Always clinician review |
| LLM egress multi-provider | Implemented but unverified live | Keys often absent locally |
| RAG pipeline | Implemented + tenant unit isolation | Live Postgres adversarial still open |
| OCR Tesseract | Verified on clean fixtures | PDF rasterization open |
| 39 clinical calculators | Verified complete | Deterministic; offline eval parity 100% |
| Human-review creation | Verified complete (unit, Cy71) | Integration against real queue still thin |
| Offline eval harness | Verified complete | 41/41 gate pass |
| Scenario library | Partial | Seeded `data/ai-scenarios/v1/` |
| Unified contracts | Partial | Types + validation shipped; not all callers migrated |

---

## 8. Related documents

- `AI_CONFIGURATION_MAP.md` — trained vs heuristic vs foundation LLM honesty map
- `AI_PROVIDER_MATRIX.md` — providers/models/flags
- `AI_TOOL_CATALOG.md` — tools and calculators
- `AI_SCENARIO_LIBRARY.md` — scenario pack
- `AI_EVALUATION_REPORT.md` — eval results
- `AI_SAFETY_REPORT.md` — safety posture
- `docs/ai/AI_BASELINE_REPORT_v1.md` — frozen baseline
- `docs/ai/runbooks/ROLLBACK_AND_KILL_SWITCH.md`
