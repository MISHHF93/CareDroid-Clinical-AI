# CareDroid AI Baseline Report v1

| Field | Value |
|-------|--------|
| **Document ID** | `AI_BASELINE_REPORT_v1` |
| **Version** | `1.0.0` |
| **Frozen at** | `2026-07-11` |
| **Platform build** | `emergency-os-2026.06` (`CARE_AI_PLATFORM_BUILD`) |
| **Scope** | Discovery only — **no runtime behavior changes** |
| **Authority** | Repository inspection + live stack probe (`scripts/verify-ai-stack.mjs`) |
| **Companion artifacts** | `docs/ai/AI_CAPABILITY_MATURITY_MATRIX_v1.md`, `qa/ai-baseline/*` |

> **Purpose.** Establish an honest, versioned snapshot of how CareDroid’s AI node operates **before** knowledge expansion, architecture upgrades, training, or model promotion. Seeded dashboard scores are **not** treated as measured quality.

---

## 1. Executive summary

CareDroid already has a **multi-layer AI platform**:

1. **Conversational LLM path** — Anthropic Claude (`claude-sonnet-4-6`) via Nest chat pipeline (gateway → governance → intent → optional RAG → tools → composer → audit).
2. **Structured CareDroid AI Node** — 18 **heuristic / rule** intents in `lib/ai/careDroidAI.ts` (not LLM inference).
3. **Local ML routing** — Xenova `all-mpnet-base-v2` embeddings + MLP heads (NLU + artifact-router) as the Unified AI Node (ADR-0003).
4. **Deterministic clinical tools** — large calculator surface; backend tool orchestrator executors; ED copilot tools with human confirm on mutations.
5. **RAG plumbing** — Pinecone or in-memory; **seed corpus is only four markdown files**.
6. **Governance scaffolding** — service registry, safety policy, clinical safety rules, llm-security, human-review flags, AI_QUERY audit, 7-year retention default.

**Critical honesty gaps** (must guide all subsequent work):

| Gap | Evidence |
|-----|----------|
| Multi-provider docs vs Anthropic-only runtime | **PR-3 (2026-07-11):** unified egress + adapters for anthropic/openai/azure-openai/gemini/local; default remains Anthropic. See `docs/ai/LLM_EGRESS_v1.md`. |
| Evaluation theater | **PR-4:** offline harness + CI gate produce measured metrics; EvaluationService labels seeds `seedOnly` and prefers measured runs when present |
| Tiny knowledge base | `data/medical-knowledge/` = 4 files; now registered under `data/knowledge-registry/` (PR-2) with hash/license gates |
| Predictive “AI” oversell risk | Registry `future` / local-deterministic for deterioration, edge, federated EMS |
| NLU metrics validity | Manifest reports accuracy `1.0` on test set size `51`; on-disk `metrics.json` **missing** in this worktree probe |
| Dual mental models | Structured heuristics + LLM chat + keyword copilot all appear as “AI” |

**Safety posture (strengths to preserve):**

- Global kill switch `AI_ENABLED` default **false**
- Patient context in prompts default **off** (`AI_PATIENT_CONTEXT_ENABLED`)
- Mutating tools require human confirmation
- Calculators are deterministic pure functions
- Sentinel AI envelopes force `requiresHumanReview: true`
- Structured CareDroid AI responses force `requiresClinicianReview: true`

---

## 2. Architecture map (as-is)

```
┌─────────────────────────────────────────────────────────────────┐
│  UI: CopilotPanel / ChatInterface / AI Chief / PatientCard      │
└────────────┬───────────────────┬───────────────────┬────────────┘
             │                   │                   │
             ▼                   ▼                   ▼
   POST /api/chat/message   POST /api/ai/node   Keyword copilot
   (conversational LLM)     (structured node)   (regex/rules)
             │                   │                   │
             ▼                   ▼                   ▼
   ChatService pipeline     careDroidAI         copilot.service
   AIGateway envelope       HANDLERS (rules)    store-backed answers
   PlatformGovernance
   Intent / NLU / MoE
   optional RAG
   Tool orchestrator
   AIService.invokeLLM ──► Anthropic Messages API
   Response composer
   AuditService (AI_QUERY)
             │
             ▼
   Unified AI Node (local)
   Xenova embedding + MLP
   intent + artifact heads
```

### Primary code anchors

| Concern | Path |
|---------|------|
| Tenant + service registry | `lib/ai/config.ts` |
| Prompts (8) | `lib/ai/promptRegistry.ts` |
| Tools (9 ED) | `lib/ai/toolRegistry.ts` |
| Safety | `lib/ai/safetyPolicy.ts`, `lib/ai/clinicalSafetyRules.ts` |
| Structured intents | `lib/ai/careDroidAI.ts`, `careDroidAITypes.ts` |
| Server LLM client | `lib/ai/serverClient.ts` |
| Browser proxy client | `src/lib/ai/client.ts` |
| Nest AI | `backend/src/modules/ai/` |
| AI gateway | `backend/src/modules/ai-gateway/` |
| Chat | `backend/src/modules/chat/` |
| RAG | `backend/src/modules/rag/` |
| MoE router | `backend/src/modules/moe-router/` |
| Tool orchestrator | `backend/src/modules/medical-control-plane/tool-orchestrator/` |
| LLM security | `backend/src/modules/llm-security/` |
| Evaluation (seeded) | `backend/src/modules/evaluation/` |
| Local ML | `backend/ml-services/` |
| Sentinel AI envelopes | `lib/sentinel/aiEnvelope.ts` |
| Feature docs | `docs/AI_FEATURES.md`, ADR-0003 |

---

## 3. Models, providers, and routing

| Layer | Provider / model | Status |
|-------|------------------|--------|
| Default generation | Anthropic `claude-sonnet-4-6` | **Live path** when AI features enabled |
| Fallback model (config) | `claude-sonnet-4-6` | Same model; not a true alternate provider |
| Config-declared providers | openai, azure-openai, gemini, local | **Not fully wired** as generation backends |
| Embeddings | Xenova `all-mpnet-base-v2` (768-d) | Live for RAG + NLU |
| Vector store | Pinecone `caredroid-medical-knowledge` **or** in-memory | Depends on `PINECONE_API_KEY` |
| Rerank | Local keyword; Cohere module optional | Default **disabled** |
| NLU head | MLP on embeddings | Live; metrics file missing in this tree |
| Artifact router | MLP on embeddings | Present in manifest (acc ≈ 0.95 on 282 tests) |
| Ambient documentation | Azure GPT-4o (registry) | **Legacy** |
| Predictive edge models | Local heuristics | **future / demo** |

Default generation hyperparameters (`DEFAULT_AI_PROVIDER_CONFIG`): temperature `0.2`, max tokens `2000`, stream `false`.

---

## 4. Tenant gates (defaults)

| Setting | Default | Env |
|---------|---------|-----|
| `aiEnabled` | **false** | `AI_ENABLED` |
| `edCopilotEnabled` | true | `ED_COPILOT_AI_ENABLED` |
| `smartIntakeAiEnabled` | false | `SMART_INTAKE_AI_ENABLED` |
| `referralAiEnabled` | false | `REFERRAL_AI_ENABLED` |
| `analyticsAiEnabled` | false | `ANALYTICS_AI_ENABLED` |
| `clinicalWorkflowAiEnabled` | false | `CLINICAL_WORKFLOW_AI_ENABLED` |
| `aiAuditLoggingEnabled` | true | `AI_AUDIT_LOGGING_ENABLED` |
| `aiPatientContextEnabled` | **false** | `AI_PATIENT_CONTEXT_ENABLED` |

Interpretation: **global AI is off by default**, but ED Copilot flag defaults on — operators must understand both knobs.

---

## 5. Service registry maturity (17 services)

See full matrix: [`AI_CAPABILITY_MATURITY_MATRIX_v1.md`](./AI_CAPABILITY_MATURITY_MATRIX_v1.md).

Summary:

| Status | Count | Examples |
|--------|-------|----------|
| **active** LLM/governance-ready | ~7 | ED Copilot, smart intake verification, referral, analytics, workflow launcher, calculator explanation |
| **local-deterministic** | several | protocol trigger, text mining |
| **legacy** | ~3 | smart handover LLM, AI triage assistant, ambient documentation |
| **future** | ~6 | deterioration, discharge, START-AI, MoH matching, federated EMS, edge ambulance |

Structured CareDroid AI **intents** (18) are separate from the service registry and are **rule handlers**, not foundation-model inference.

---

## 6. Knowledge sources accessible today

| Source | Location / system | Quality note |
|--------|-------------------|--------------|
| Medical markdown seed | `data/medical-knowledge/` (ACLS, sepsis Hour-1, SOFA, warfarin–aspirin) | Tiny; not a multi-specialty library |
| Pinecone index | `PINECONE_*` env | Optional; empty without ingest |
| In-memory / local vectors | RAG module + `.rag-local` path | Dev fallback |
| Live operational context | capacity, queues, EMS, patients via tools/context engine | Strong for **ops** questions |
| Clinical calculators | FE utils + BE executors | Strong **deterministic** CDS |
| Protocol CRUD entity | Nest clinical protocol service | Catalog, not closed-loop pathway engine |
| NLU/artifact training jsonl | `backend/ml-services/**/data` | Train/eval only |
| Sentinel NEMSIS→FHIR maps | `lib/sentinel/nemsisMap.ts`, `fhirMap.ts` | Subset / minimal Bundle — not full standards compliance |

**No governed evidence registry** (title, license, content hash, evidence grade, expiry) exists yet — planned Phase 1.

---

## 7. Tools and clinical task coverage

### ED Copilot tools (`lib/ai/toolRegistry.ts`)

| Class | Tools |
|-------|--------|
| Read-only | `get_patient_details`, `get_queue_status`, `get_capacity_status`, `search_patients` |
| Mutating (confirm required) | `flag_patient`, `move_patient_state`, `launch_calculator`, `create_referral`, `dispatch_alert` |

### Calculators

- MVP registry: qSOFA, HEART, Wells PE, GCS, NEWS2, NIHSS (`src/clinical-calculators/`).
- Backend orchestrator: ~22 executors (SOFA, HEART, NEWS2, Wells, GCS, TIMI, GRACE, etc.).
- NLU knows a large tool ID list; **many IDs lack executors** (`NLU_TOOL_IDS_WITHOUT_EXECUTOR`).

### Structured intents (heuristic)

Including: critical alert assessment, 3-minute response, intake assist, triage recommendation, handoff summary, EMS pre-arrival risk, bottleneck analysis, etc. (`CARE_DROID_AI_INTENTS`).

### Genuinely implemented vs placeholder

| Task | Maturity |
|------|----------|
| Operational/clinical chat + tools | Implemented (tenant-gated) |
| Keyword operational copilot | Implemented (rules) |
| Calculator execution | Implemented (deterministic) |
| Smart intake pipeline | Implemented (OCR/MPI); LLM assist off by default |
| Sentinel ETA/geofence/alarms/NEMSIS maps | Implemented (rules engines) |
| RAG retrieval plumbing | Implemented; corpus weak |
| Deterioration / discharge / admission prediction | Heuristic / future |
| Edge ultrasound / federated EMS | Demo / future |
| Ambient documentation | Legacy registry only |
| Multi-provider LLM failover | Config-level only |
| CDS Hooks / SMART on FHIR | **Absent** |
| Live gold-set LLM evaluation | **Absent** (seeded dashboard) |

---

## 8. Safety, privacy, audit

| Control | Location | Note |
|---------|----------|------|
| Unsafe pattern review | `safetyPolicy.ts` | Blocks autonomous diagnose/prescribe-style instruction patterns |
| Priority floor | `clinicalSafetyRules.ts` | DPS 1–2, stroke/sepsis/chest pain, abnormal vitals |
| Prompt injection / PHI patterns | `llm-security` | Pattern-based; not full de-id pipeline |
| Human review disclaimer | All prompts + registry | Required language |
| Tool mutation confirm | toolRegistry | Product contract |
| Audit AI_QUERY | Nest audit + `ai-query` entity | Hash-chain migration exists |
| Audit retention | 2555 days default | Config-driven |
| PHI in prompts | Opt-in tenant setting | Default off — **preserve** |

**Gaps:** not every surface may share the same gate; evaluation UI may display seed scores as if measured; edge demos can display “confidence” without ML.

---

## 9. Evaluation baseline (frozen schema — not measured scores)

### Seeded dashboard values (DO NOT treat as production quality)

From `backend/src/modules/evaluation/evaluation.service.ts` `DEFAULT_METRICS`:

| Metric | Seed value | Baseline status |
|--------|------------|-----------------|
| modelQuality | 0.912 | **SEED ONLY** |
| hallucinationRate | 0.038 | **SEED ONLY** |
| accuracy | 0.924 | **SEED ONLY** |
| latencyMs | 860 | **SEED ONLY** |
| retrievalPrecision | 0.887 | **SEED ONLY** |
| toolExecutionSuccess | 0.991 | **SEED ONLY** |
| workflowSuccess | 0.943 | **SEED ONLY** |
| userSatisfaction | 4.55 | **SEED ONLY** |
| costUsd | 12.8 | **SEED ONLY** |

### Local ML manifest snapshot (Unified AI Node)

From `backend/ml-services/models/manifest.json` (copied to `qa/ai-baseline/unified-ai-node-manifest.snapshot.json`):

| Head | Reported accuracy | Test set size | Caveat |
|------|-------------------|---------------|--------|
| NLU | 1.0 | 51 | Small set; likely overfit; **metrics.json missing** on disk in this worktree |
| Artifact-router | ≈0.947 | 282 | Better size; still not clinical LLM quality |

### Live stack probe (`2026-07-11`)

Archived: `qa/ai-baseline/verify-ai-stack.txt`

```
[OK] Backend /health
[OK] NLU model loaded (Xenova/all-mpnet-base-v2)
[OK] NLU predict drug_interaction_check @ 99.7%
[FAIL] NLU metrics.json on disk — missing
[OK] No stale Python NLU / port 8001 references
```

### Metrics freeze for future measurement

Schema and empty series: `qa/ai-baseline/metrics.schema.json`, `qa/ai-baseline/measured-series.empty.json`.

**Required measured series (Phase 4+)** before any model promotion:

- latency p50/p95, token cost, retrieval hit-rate, citation presence, tool-call accuracy, structured-output validity, refusal on unsafe prompts, PHI leak rate (synthetic), calculator parity (LLM never computes scores), human-review flag rate, subgroup slices.

---

## 10. Interoperability baseline

| Standard | Status |
|----------|--------|
| NEMSIS | Subset alias map for inbound EMS — not full XSD |
| FHIR R4 | Minimal Patient+Encounter+Observation Bundle from Sentinel — not US Core validated |
| HL7 v2 | Family label on integration hub only — no MLLP/parser |
| CDS Hooks | **Not implemented** |
| SMART on FHIR | **Not implemented** |
| LOINC | Used in Sentinel observations |

---

## 11. Failure modes and risks (pre-upgrade)

1. **Generic chat** when RAG miss + weak corpus.  
2. **Fake success** via seeded evaluation UI.  
3. **Automation bias** if heuristic confidence looks like model certainty.  
4. **PHI egress** if `AI_PATIENT_CONTEXT_ENABLED` turned on without de-id.  
5. **Broken tool IDs** (NLU suggests tools without executors).  
6. **Provider misconfiguration** (AI_PROVIDER=openai with Anthropic-only client).  
7. **Silent degradation** when Anthropic down without clear deterministic fallback UX.  
8. **Stale knowledge** (no expiry/revalidation on guidelines).  

---

## 12. What must NOT change until gates pass

- No silent model swap  
- No production chat → training  
- No LLM calculating validated medical scores  
- No autonomous diagnose/prescribe/alarm suppress/ambulance redirect/identity merge  
- No indiscriminate web scrape into the knowledge base  

---

## 13. Prioritized repair roadmap (reference)

| Priority | Item | Phase |
|----------|------|-------|
| P0 | Publish this baseline + maturity matrix (done in PR-1) | 0 |
| P0 | Knowledge registry + license/hash gate | 1 |
| P0 | Real eval harness; retire seed as sole truth | 4 |
| P1 | Single LLM egress + provider adapters + PHI minimize | 2 |
| P1 | RAG hybrid + citation entailment + corpus growth | 3 |
| P1 | UI honesty labels for heuristic/future/demo | 6 |
| P2 | Tool ID alignment | 2/7 |
| P2 | Model registry + shadow/canary | 7 |
| P3 | Local NLU retrain only if residual gap | 5 |
| P3 | CDS Hooks / SMART design (optional) | later |

Full program plan: session plan / Professor Mode AI Discovery program.

---

## 14. Validation evidence for this document

| Check | Result |
|-------|--------|
| Repo inventory (AI modules, lib/ai, ml-services, RAG) | Completed 2026-07-11 |
| Service registry read from `lib/ai/config.ts` | Completed |
| Evaluation seed constants read | Completed |
| Medical knowledge directory listing | 4 files |
| Unified AI Node manifest snapshot | Archived under `qa/ai-baseline/` |
| `node scripts/verify-ai-stack.mjs` | Archived; NLU metrics file missing |

---

## 15. Document control

| Role | Action |
|------|--------|
| Engineering | Own baseline accuracy; update only via versioned v1.x / v2 |
| Clinical informatics | Review maturity labels before pilot claims |
| Security/privacy | Review PHI egress section before enabling patient context |
| Rollback | N/A (documentation-only deliverable) |

**PR-2 status (2026-07-11):** Knowledge registry delivered — see `data/knowledge-registry/`, `docs/ai/knowledge-registry/`, `npm run verify:knowledge-registry`.

**PR-3 status (2026-07-11):** Unified LLM egress + multi-provider adapters + PHI minimize + kill switch — `lib/ai/providers/`, `docs/ai/LLM_EGRESS_v1.md`.

**PR-4 status (2026-07-11):** Offline AI eval harness + synthetic gold packs + CI gate — `data/ai-eval/v1/`, `npm run ai:eval` / `npm run ai:eval:gate`, `docs/ai/AI_EVAL_HARNESS_v1.md`. Measured series: `qa/ai-baseline/measured-series.from-eval.json`.

**PR-5 status (2026-07-11):** Hybrid RAG retrieval (lexical+dense RRF) + citation entailment grounding + knowledge-registry metadata on ingest — lib/rag/, docs/ai/RAG_HYBRID_RETRIEVAL_v1.md.

**PR-6 status (2026-07-11):** Response provenance contract on structured AI node + chat/gateway composers — lib/ai/provenanceContract.ts, docs/ai/RESPONSE_PROVENANCE_CONTRACT_v1.md.

**PR-7/8 status (2026-07-11):** Tool capability honesty + AI maturity UI — docs/ai/TOOL_CAPABILITY_HONESTY_v1.md.

**PR-10 status (2026-07-11):** Model registry + shadow/canary flags + rollback runbooks — data/model-registry/, lib/ai/deploymentFlags.ts, docs/ai/MODEL_REGISTRY_v1.md, docs/ai/runbooks/.

**PR-11 status (2026-07-11):** Comprehensive AI assurance engineering report — docs/ai/AI_ASSURANCE_ENGINEERING_REPORT_v1.md. Program v1 closed for training-free control plane.

**Next deliverable:** Expand licensed knowledge corpus + optional live LLM eval pack (post-v1 roadmap).
