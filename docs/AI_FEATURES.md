# CareDroid AI Features Reference

> **Platform build:** `emergency-os-2026.06`
> **Primary model:** `claude-sonnet-4-6` (Anthropic Claude)
> **Governance posture:** Human-reviewed clinical decision support — never autonomous clinician
>
> **Baseline freeze (2026-07-11):** [AI Baseline Report v1](./ai/AI_BASELINE_REPORT_v1.md) · [Maturity matrix](./ai/AI_CAPABILITY_MATURITY_MATRIX_v1.md) · `qa/ai-baseline/`.  
> **Eval (PR-4):** [AI Eval Harness v1](./ai/AI_EVAL_HARNESS_v1.md) — `npm run ai:eval:gate` (authoritative offline safety suite).  
> **RAG (PR-5):** [Hybrid retrieval + citation entailment](./ai/RAG_HYBRID_RETRIEVAL_v1.md).  
> **Provenance (PR-6):** [Response provenance contract](./ai/RESPONSE_PROVENANCE_CONTRACT_v1.md) — evidence, confidence, missing info, uncertainty, clinician review.  
> **Tools / honesty (PR-7/8):** [Tool capability + maturity labels](./ai/TOOL_CAPABILITY_HONESTY_v1.md).  
> **Registry / deploy (PR-10):** [Model registry](./ai/MODEL_REGISTRY_v1.md) · [Shadow/canary](./ai/runbooks/SHADOW_CANARY_DEPLOYMENT.md) · [Rollback](./ai/runbooks/ROLLBACK_AND_KILL_SWITCH.md).  
> **Assurance report (PR-11):** [AI Assurance Engineering Report v1](./ai/AI_ASSURANCE_ENGINEERING_REPORT_v1.md).  
> **Post-v1:** subgroup eval gate · 7 knowledge artifacts · eval dashboard seed banner · [production monitoring](./ai/PRODUCTION_MONITORING_v1.md).  
> Feature docs describe intended design; the baseline documents what is **actually wired**, what is **heuristic/future**, and which evaluation numbers are **seeded only**.

This document is the authoritative reference for every AI capability in CareDroid. It covers the AI platform architecture, all 17 registered AI services, the 9 live copilot tools, the RAG pipeline, NLU service, edge AI layer, governance framework, and per-tenant configuration.

---

## Table of contents

1. [AI platform philosophy](#1-ai-platform-philosophy)
2. [Provider support](#2-provider-support)
3. [Tenant AI settings](#3-tenant-ai-settings)
4. [AI services registry](#4-ai-services-registry)
5. [Copilot tools (function calling)](#5-copilot-tools-function-calling)
6. [Prompt registry](#6-prompt-registry)
7. [RAG — medical knowledge retrieval](#7-rag--medical-knowledge-retrieval)
8. [NLU intent classifier (in-process TypeScript)](#8-nlu-intent-classifier-in-process-typescript)
9. [Anomaly detection service](#9-anomaly-detection-service)
10. [Prompt caching](#10-prompt-caching)
11. [Edge AI — ambulance & EMS](#11-edge-ai--ambulance--ems)
12. [Federated EMS triage](#12-federated-ems-triage)
13. [MCP server](#13-mcp-server)
14. [AI risk thresholds](#14-ai-risk-thresholds)
15. [Governance framework](#15-governance-framework)
16. [AI audit logging](#16-ai-audit-logging)
17. [Environment variables](#17-environment-variables)

---

## 1. AI platform philosophy

CareDroid's AI layer is built around three non-negotiable principles:

**1. Human-in-the-loop on every clinical action.** No AI service in CareDroid autonomously diagnoses, prescribes, triages, discharges, or admits patients. Every output carries a required disclaimer. Every mutating tool action requires explicit human confirmation before it is applied to the patient record.

**2. Audit everything.** Every AI request, model response, token usage, and tool call is logged with full context. The default retention window is 7 years (2,555 days). Audit records are hash-chained and cannot be silently modified.

**3. Governance is a first-class config surface.** Safety constraints, required disclaimers, risk thresholds, and per-tenant settings are defined in code (not docs) and enforced at the service layer — not left to individual call sites.

---

## 2. Provider support

Generation goes through a **single egress** (`lib/ai/providers/egress.ts` → `callAI` / `unifiedAIClient`). See [LLM Egress v1](./ai/LLM_EGRESS_v1.md).

| Provider | `AI_PROVIDER` value | Notes |
|----------|--------------------|----|
| **Anthropic Claude** | `anthropic` | **Default.** Prompt caching + tools + streaming. |
| OpenAI | `openai` | Chat Completions adapter (non-streaming in v1 egress). |
| Azure OpenAI | `azure-openai` | Requires endpoint + deployment + API key. |
| Google Gemini | `gemini` | generateContent adapter (non-streaming text). |
| Local / deterministic | `local` | No network; degraded-mode / tests / offline. |

**Default model:** `claude-sonnet-4-6`  
**Fallback:** set `AI_FALLBACK_PROVIDER` (e.g. `local`) and/or `AI_LOCAL_FALLBACK=1`  
**Kill switch:** `AI_KILL_SWITCH=1` or `AI_EXTERNAL_LLM_DISABLED=1`  
**PHI minimize:** applied on every egress call (pattern redaction)

Override per-call via `AI_MODEL`, `AI_TEMPERATURE`, `AI_MAX_TOKENS`, or `AI_STREAMING_ENABLED`.

---

## 3. Tenant AI settings

Each deployment has a `TenantAISettings` object that gates which AI features are active. This is controlled by environment variables and can be overridden per tenant in the admin console.

| Setting | Env var | Default | Controls |
|---------|---------|---------|---------|
| `aiEnabled` | `AI_ENABLED` | `false` | Global AI kill-switch |
| `edCopilotEnabled` | `ED_COPILOT_AI_ENABLED` | `true` | ED Copilot chat surface |
| `smartIntakeAiEnabled` | `SMART_INTAKE_AI_ENABLED` | `false` | AI field suggestions at reception |
| `referralAiEnabled` | `REFERRAL_AI_ENABLED` | `false` | Referral summarization |
| `analyticsAiEnabled` | `ANALYTICS_AI_ENABLED` | `false` | Analytics explanation AI |
| `clinicalWorkflowAiEnabled` | `CLINICAL_WORKFLOW_AI_ENABLED` | `false` | Workflow / protocol launcher AI |
| `aiAuditLoggingEnabled` | `AI_AUDIT_LOGGING_ENABLED` | `true` | Audit log all AI requests |
| `aiPatientContextEnabled` | `AI_PATIENT_CONTEXT_ENABLED` | `false` | Inject live patient context into prompts |

Defined in [`lib/ai/config.ts`](../lib/ai/config.ts) as `DEFAULT_TENANT_AI_SETTINGS`.

---

## 4. AI services registry

CareDroid registers 17 AI services with full governance metadata: provider, model, purpose, risk level, regulatory category, safety constraints, rate limits, audit level, and lifecycle status.

Source: [`lib/ai/config.ts`](../lib/ai/config.ts) — `buildServiceRegistry()`.

### Active services

These services are production-ready and enabled when the relevant tenant setting is on.

---

#### ED Copilot (`copilot`)

| Field | Value |
|-------|-------|
| Purpose | Operational workflow assistant for ED staff |
| Risk level | Medium |
| Regulatory category | Informational |
| Requires human review | Yes |
| Max tokens | Per tenant config (default 2,000) |
| Temperature | 0.2 |
| Rate limit | 30 req/min · 60,000 tok/min |
| Audit level | Full |

**Scope:** Answers questions about wait times, queue pressure, reassessments, bottlenecks, capacity, EMS load, boarding, and queues. Cites live board data. Never gives generic advice. Never makes autonomous clinical decisions.

**Safety constraints:**
- Cannot make autonomous clinical recommendations
- Cannot override human judgment
- Cannot lower priority for DPS 1–2 patients
- Must include "Human review required" disclaimer

---

#### Smart Intake Verification (`smartIntakeVerification`)

| Field | Value |
|-------|-------|
| Purpose | Verify intake fields and identify missing information |
| Risk level | Medium |
| Regulatory category | Informational |
| Requires human review | Yes |
| Max tokens | 1,000 |
| Temperature | 0.1 |
| Rate limit | 20 req/min · 20,000 tok/min |

**Safety constraints:**
- Cannot auto-triage
- Cannot auto-link patient identity
- Cannot auto-import external health data

---

#### Referral Summarization (`referralSummarization`)

| Field | Value |
|-------|-------|
| Purpose | Summarize referral context, urgency, destination, and missing information |
| Risk level | Medium |
| Regulatory category | Clinical decision support |
| Requires human review | Yes |
| Max tokens | 1,500 |
| Temperature | 0.2 |
| Rate limit | 20 req/min · 30,000 tok/min |

**Safety constraints:**
- Cannot decide patient disposition
- Cannot replace specialist or clinician review

---

#### Operational Analytics Explanation (`analyticsExplanation`)

| Field | Value |
|-------|-------|
| Purpose | Plain-language explanation of throughput, boarding, EMS, and queue trends |
| Risk level | Low |
| Regulatory category | Informational |
| Requires human review | Yes |
| Max tokens | 1,500 |
| Temperature | 0.2 |

**Safety constraints:**
- Cannot make autonomous staffing, transfer, admission, or discharge decisions

---

#### Clinical Workflow Launcher (`clinicalWorkflowLauncher`)

| Field | Value |
|-------|-------|
| Purpose | Suggest relevant CareDroid workflows, checklists, and calculators for human launch |
| Risk level | Medium |
| Regulatory category | Clinical decision support |
| Requires human review | Yes |
| Max tokens | 1,000 |
| Temperature | 0.1 |

**Safety constraints:**
- Cannot diagnose, prescribe, or disposition patients
- All workflow launches require explicit human confirmation

---

#### Calculator Explanation (`calculatorExplanation`)

| Field | Value |
|-------|-------|
| Purpose | Explain calculator inputs, missing values, score bands, limitations, and next review steps |
| Risk level | Medium |
| Regulatory category | Clinical decision support |
| Requires human review | Yes |
| Max tokens | 1,000 |
| Temperature | 0.1 |

**Safety constraints:**
- Cannot invent calculator inputs
- Cannot use scores as autonomous decisions

---

### Local / deterministic services

These run without a language model. No token cost. No latency from external API.

---

#### Protocol Auto-Trigger (`protocolTrigger`)

| Field | Value |
|-------|-------|
| Purpose | Detect clinical deterioration and trigger appropriate protocols |
| Provider | Local (rule-based) |
| Model | `rule-based-protocol-trigger-v1` |
| Risk level | High |
| Regulatory category | Clinical decision support |
| Requires human review | No (rules are clinically validated; overrides require acknowledgment) |
| Rate limit | 600 req/min |

---

#### Clinical Text Mining (`textMining`)

| Field | Value |
|-------|-------|
| Purpose | Extract patient characteristics from clinical notes |
| Provider | Local |
| Model | `local-entity-extraction-v1` |
| Risk level | Low |
| Regulatory category | Informational |
| Requires human review | No |
| Rate limit | 300 req/min · 150,000 tok/min |

---

### Legacy services

Implemented and functional but superseded by newer surface design. Available when explicitly configured.

| Service | Purpose |
|---------|---------|
| **Smart Handover** | Generate clinical handover summaries (SBAR) from patient data |
| **AI Triage Assistant** | CTAS priority suggestion for nurse triage review |
| **Ambient Clinical Documentation** | Draft SOAP notes from encounter audio (Azure OpenAI / GPT-4o) |

---

### Roadmap services

Registered in the platform config; not yet connected to live models. Placeholder models are in place; production activation requires validated training data, clinical validation, and regulatory review.

| Service | Purpose | Model placeholder |
|---------|---------|---------|
| **Deterioration Prediction** | Probabilistic deterioration risk from operational and clinical signals | `deterioration-v3-deterministic` |
| **Discharge Prediction** | Discharge readiness and timing estimates | `heuristic-readiness-v1` |
| **START-AI (Admission Prediction)** | Pre-physician admission likelihood for proactive bed coordination | `start-ai-ensemble-v1` |
| **MoH Patient Matching** | Embedding-based patient record matching for identity resolution | `local-deterministic-embedding` |
| **Federated EMS Triage** | Coordinated EMS edge triage with federated model aggregation | `fed-ems-edge-v1` |
| **Edge AI Ambulance** | Vital stream and ultrasound frame analysis at the ambulance edge | `edge-ambulance-vitals-v1` |

---

## 5. Copilot tools (function calling)

The ED Copilot uses the Anthropic tool-use API. Nine tools are registered in [`lib/ai/toolRegistry.ts`](../lib/ai/toolRegistry.ts).

Tools are split into **read-only** (execute immediately against the Zustand store) and **mutating** (return a `PendingToolAction` that requires explicit human confirmation before being applied).

### Read-only tools — execute immediately

| Tool | Description |
|------|------------|
| `get_patient_details` | Reads the full CareDroid patient object for a given patient ID |
| `get_queue_status` | Reads queue statistics for one queue or all queues |
| `get_capacity_status` | Reads the full current `CapacitySnapshot` |
| `search_patients` | Searches patients by query string and optional field filters; returns summary fields only |

### Mutating tools — require human confirmation

| Tool | Action | Confirmation required |
|------|--------|----------------------|
| `flag_patient` | Proposes adding a clinical/operational flag to a patient | Yes — staff must confirm before flag is written |
| `move_patient_state` | Proposes moving a patient to a different journey state | Yes — validates transition against `VALID_TRANSITIONS` table |
| `launch_calculator` | Proposes opening a clinical calculator for a patient | Yes — fires `ed:open-calculator` custom event on the window after confirm |
| `create_referral` | Proposes creating a draft referral | Yes — written as `status: 'Draft'`; requires staff to submit |
| `dispatch_alert` | Proposes dispatching a CareDroid alert | Yes — staff must confirm before alert appears |

### Valid patient state transitions

The Copilot can only propose moves that match the clinical workflow sequence:

```
Arrival → Registration → Triage → Waiting → Assessment → Orders → Results → Disposition → Discharge
                                                                          └→ Admission
```

Proposals that violate the transition table are rejected with an error message listing valid next states.

### Tool availability by request type

| Request type | Available tools |
|-------------|----------------|
| `COPILOT_CHAT` | All 9 tools |
| `SCORE_ASSIST` | `launch_calculator` |
| `INTAKE_SUGGEST` / `INTAKE_SUGGESTION` | `get_patient_details`, `launch_calculator` |
| `CLINICAL_SUMMARY` | `get_patient_details`, `search_patients`, `get_capacity_status` |
| `PROTOCOL_SUGGEST` | `launch_calculator`, `search_patients` |
| `TRIAGE_ASSIST` | `search_patients`, `get_patient_details`, `get_queue_status`, `get_capacity_status` |
| `SHIFT_SUMMARY` | `get_capacity_status`, `get_queue_status`, `search_patients` |
| `HANDOFF_BRIEF` | _(no tools — generation only)_ |

---

## 6. Prompt registry

Eight prompts are registered in [`lib/ai/promptRegistry.ts`](../lib/ai/promptRegistry.ts). Every prompt ships with a `requiredDisclaimer` field that is always appended to responses.

| Prompt ID | Request type | Role |
|-----------|-------------|------|
| `ed-copilot` | `COPILOT_CHAT` | ED Copilot — operational assistant for queue, capacity, EMS, boarding |
| `patient-status-summarizer` | `CLINICAL_SUMMARY` | Case-aware patient status summary for staff review |
| `smart-intake-assistant` | `INTAKE_SUGGESTION` | Intake field extraction and verification helper |
| `triage-assistant` | `TRIAGE_ASSIST` | CTAS priority and waiting queue suggestions for nurse review |
| `clinical-workflow-launcher` | `PROTOCOL_SUGGEST` | Workflow, checklist, and calculator suggestions |
| `referral-summarizer` | `CLINICAL_SUMMARY` | Referral context summary for staff review |
| `analytics-assistant` | `SHIFT_SUMMARY` | Operational metrics explanation |
| `calculator-helper` | `SCORE_ASSIST` | Score bands, missing inputs, and limitations explanation |

All prompts are defined with a `productRole` field that constrains the model's behavior at the persona level, not just through instructions.

---

## 7. RAG — medical knowledge retrieval

CareDroid includes a RAG (Retrieval-Augmented Generation) pipeline backed by **Pinecone** for evidence-linked clinical knowledge retrieval.

| Parameter | Default |
|-----------|---------|
| Vector index | `caredroid-medical-knowledge` |
| Embedding dimension | 1,536 |
| Pinecone environment | `us-east-1-aws` |
| Namespace | `medical-docs` |
| Chunk size | 512 tokens |
| Chunk overlap | 50 tokens |
| Top-K retrieval | 5 |
| Minimum score threshold | 0.70 |
| Max retrieved tokens | 2,000 |
| Re-ranking | Disabled by default (`local-keyword-reranker`) |
| Embedding model | `local-deterministic-embedding` (override via `AI_EMBEDDING_MODEL`) |

### Enabling RAG

```bash
RAG_ENABLED=true
PINECONE_API_KEY=<your-key>
PINECONE_INDEX_NAME=caredroid-medical-knowledge
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_NAMESPACE=medical-docs
```

Full config reference: `readRagConfig()` in [`lib/ai/config.ts`](../lib/ai/config.ts).

---

## 8. NLU intent classifier (in-process TypeScript)

CareDroid does **not** run a separate Python NLU sidecar. Intent routing for the medical control plane uses a small **TypeScript classifier** embedded in the Nest backend at `/api/nlu`:

- **Embeddings:** `Xenova/all-mpnet-base-v2` (frozen, via `@xenova/transformers`)
- **Head:** MLP softmax over 10 clinical intent classes
- **Training:** `cd backend && npm run nlu:pipeline` (prepare → train → evaluate)
- **Fallback:** Rule-based keyword classifier when no trained weights are on disk

This is **intent routing only** — not a foundation model. Primary clinical reasoning uses **Anthropic Claude** (`claude-sonnet-4-6`) plus **RAG** (Pinecone) and deterministic safety rules.

| Parameter | Default |
|-----------|---------|
| Mode | `in-process` (inject `NluService` in Nest) |
| URL | `http://127.0.0.1:3350/api/nlu` (or `http://backend:3000/api/nlu` in Docker) |
| Timeout | 30,000 ms |
| Retries | 3 |
| Confidence threshold | 0.70 |

```bash
NLU_SERVICE_MODE=in-process
NLU_SERVICE_ENABLED=true
NLU_SERVICE_URL=http://127.0.0.1:3350/api/nlu
NLU_CONFIDENCE_THRESHOLD=0.70
```

Set `NLU_SERVICE_MODE=http` only if you deploy a separate NLU HTTP service. When `NLU_SERVICE_ENABLED=false`, the intent classifier skips the NLU phase and uses keyword + LLM fallback.

---

## 9. Anomaly detection service

A separate ML anomaly detection service monitors ED operational signals for statistical outliers (queue spikes, vital stream anomalies, wait-time outliers).

| Parameter | Default |
|-----------|---------|
| URL | `http://anomaly-detection:5000` |
| Timeout | 30,000 ms |
| Retries | 3 |

```bash
ANOMALY_DETECTION_ENABLED=true
ANOMALY_DETECTION_URL=http://anomaly-detection:5000
```

Optional external HTTP service — not bundled in `docker-compose.yml`. Disable with `ANOMALY_DETECTION_ENABLED=false` for local dev.

---

## 10. Prompt caching

CareDroid uses **Anthropic prompt caching** (`anthropic-beta: prompt-caching-2024-07-31`) to reduce cost and latency on high-frequency copilot calls.

### How it works

The system prompt is split into two blocks at the `DEPARTMENT_CONTEXT_SEPARATOR` string:

```
"Department context is provided for situational awareness."
```

| Block | Type | Cached |
|-------|------|--------|
| Everything before the separator | Static clinical safety rules, role definitions, governance | ✅ Cached with `cache_control: { type: "ephemeral" }` |
| Everything after the separator | Dynamic department context (current patients, queue state) | ❌ Not cached — changes each call |

**Cache TTL:** 5 minutes (Anthropic platform).
**Cache hit cost:** ~10% of normal input token cost.
**Minimum cacheable size:** 1,024 tokens (Anthropic silently ignores `cache_control` below this threshold).

Implementation: [`lib/ai/serverClient.ts`](../lib/ai/serverClient.ts) — `buildCachedSystemBlocks()`.

### Token usage tracking

Every AI response includes a `usage` object with:
- `inputTokens`
- `outputTokens`
- `totalTokens`
- `cacheReadInputTokens` — tokens read from cache (billed at ~10%)
- `cacheCreationInputTokens` — tokens written to cache on this request

---

## 11. Edge AI — ambulance & EMS

The **Edge AI Ambulance** service (`edgeAmbulance`) processes vital streams and ultrasound frame signals at the ambulance edge — before the unit arrives at the ED.

**Current status:** Registered as `future`; demo support in this build.

### Risk thresholds for edge inference

| Signal | Threshold |
|--------|-----------|
| Severe hypoxia (SpO₂) | < 90% |
| Hypoxia (SpO₂) | < 94% |
| Hypotension (SBP) | < 90 mmHg |
| Ultrasound bleeding signal | > 0.80 confidence |
| Fracture signal | > 0.72 confidence |

Configurable via env:

```bash
AI_EDGE_SEVERE_HYPOXIA_SPO2=90
AI_EDGE_HYPOXIA_SPO2=94
AI_EDGE_HYPOTENSION_SBP=90
AI_EDGE_ULTRASOUND_BLEEDING_THRESHOLD=0.80
AI_EDGE_FRACTURE_THRESHOLD=0.72
```

**Safety constraints:**
- Pre-alert and stabilization suggestions require human EMS review before action
- Vital and image models are deterministic demo support in this platform build

---

## 12. Federated EMS triage

The **Federated EMS Triage** service (`federatedEmsTriage`) coordinates local EMS triage models across multiple units and aggregates predictions without exposing patient-level source data from any individual unit.

**Current status:** Registered as `future`.

**Safety constraints:**
- All EMS recommendations require dispatcher or clinician confirmation
- Federated model updates never expose patient-level data from source units

---

## 13. MCP server

CareDroid ships a **Model Context Protocol (MCP) server** package at `mcp/`. This enables external agents, IDE integrations, or automation pipelines to interact with CareDroid's AI capabilities through the MCP protocol.

The MCP package has its own `package.json` and lock file. Install separately:

```bash
npm --prefix mcp install
```

---

## 14. AI risk thresholds

Risk thresholds govern how AI model outputs are translated into operational signals (badges, alerts, protocol triggers). All values are configurable via environment variables.

### Deterioration prediction

| Level | Default threshold |
|-------|-----------------|
| Moderate risk | ≥ 0.38 |
| High risk | ≥ 0.62 |
| Critical risk | ≥ 0.80 |

```bash
AI_DETERIORATION_MODERATE_THRESHOLD=0.38
AI_DETERIORATION_HIGH_THRESHOLD=0.62
AI_DETERIORATION_CRITICAL_THRESHOLD=0.80
```

### Discharge readiness

| Signal | Default score |
|--------|--------------|
| Monitor | ≥ 50 |
| Prepare paperwork | ≥ 70 |
| Discharge now | ≥ 85 |

```bash
AI_DISCHARGE_MONITOR_THRESHOLD=50
AI_DISCHARGE_PREPARE_THRESHOLD=70
AI_DISCHARGE_NOW_THRESHOLD=85
```

### EMS triage

| Priority | Default threshold |
|----------|-----------------|
| Emergency | ≥ 0.55 |
| Immediate | ≥ 0.78 |

```bash
AI_EMS_EMERGENCY_THRESHOLD=0.55
AI_EMS_IMMEDIATE_THRESHOLD=0.78
```

---

## 15. Governance framework

### Hardcoded safety rules (cannot be overridden by tenant config)

CareDroid's governance config defines conditions where AI must never lower severity or suppress alerts, regardless of model output:

**DPS scores 1–2** (highest acuity) — AI cannot suggest a lower priority.

**Conditions:**
- Stroke
- Sepsis
- Chest pain

**Abnormal vitals:**
- HR > 120 bpm
- BP < 90/60 mmHg
- SpO₂ < 92%
- RR > 24 breaths/min

These are enforced in [`lib/ai/config.ts`](../lib/ai/config.ts) under `governance.cannotLowerPriorityFor`.

### Required disclaimers

Every AI response must include all three:

1. `"Human review required — do not act on AI output without clinical verification"`
2. `"External data review required — AI does not have access to live EHR, PACS, or lab feeds unless explicitly connected"`
3. `"AI-generated content — verify before acting"`

### Audit retention

Default: **2,555 days** (7 years). Override via `AI_AUDIT_RETENTION_DAYS`.

---

## 16. AI audit logging

All AI activity is captured by the audit layer in [`src/lib/ai/audit/logger.ts`](../src/lib/ai/audit/logger.ts).

Every audit record captures:
- Request type and prompt ID
- Model and provider
- Token usage (input, output, cache read, cache creation)
- Tool calls made (name and input)
- Whether the response required human confirmation
- Timestamp and user context

The backend audit store uses TypeORM with hash-chaining to prevent silent record modification. Patient-context AI calls are flagged as `phi_access` in the audit log.

AI audit records are queryable from `/audit` (`PlatformGovernanceWorkspace`) and the admin console.

---

## 17. Environment variables

### AI provider

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `anthropic` | Active provider |
| `AI_MODEL` | `claude-sonnet-4-6` | Primary model |
| `AI_FALLBACK_MODEL` | `claude-sonnet-4-6` | Fallback model |
| `AI_TEMPERATURE` | `0.2` | Generation temperature |
| `AI_MAX_TOKENS` | `2000` | Max output tokens |
| `AI_STREAMING_ENABLED` | `false` | Enable streaming responses |
| `ANTHROPIC_API_KEY` | — | Required for Anthropic provider |

### Per-service model overrides

| Variable | Service |
|----------|---------|
| `AI_COPILOT_MODEL` | ED Copilot |
| `AI_SMART_INTAKE_MODEL` | Smart Intake Verification |
| `AI_REFERRAL_MODEL` | Referral Summarization |
| `AI_ANALYTICS_MODEL` | Analytics Explanation |
| `AI_WORKFLOW_MODEL` | Clinical Workflow Launcher |
| `AI_CALCULATOR_MODEL` | Calculator Explanation |
| `AI_HANDOVER_MODEL` | Smart Handover |
| `AI_TRIAGE_MODEL` | AI Triage Assistant |
| `AI_AMBIENT_DOCUMENTATION_MODEL` | Ambient Documentation (default: `gpt-4o`) |
| `AI_AMBIENT_DOCUMENTATION_PROVIDER` | Ambient Documentation provider (default: `azure-openai`) |
| `AI_DETERIORATION_MODEL` | Deterioration Prediction |
| `AI_DISCHARGE_MODEL` | Discharge Prediction |
| `AI_ADMISSION_MODEL` | START-AI Admission |
| `AI_PATIENT_MATCHING_MODEL` | MoH Patient Matching |
| `AI_FEDERATED_EMS_MODEL` | Federated EMS Triage |
| `AI_EDGE_AMBULANCE_MODEL` | Edge AI Ambulance |

### Tenant AI feature flags

| Variable | Default |
|----------|---------|
| `AI_ENABLED` | `false` |
| `ED_COPILOT_AI_ENABLED` | `true` |
| `SMART_INTAKE_AI_ENABLED` | `false` |
| `REFERRAL_AI_ENABLED` | `false` |
| `ANALYTICS_AI_ENABLED` | `false` |
| `CLINICAL_WORKFLOW_AI_ENABLED` | `false` |
| `AI_AUDIT_LOGGING_ENABLED` | `true` |
| `AI_PATIENT_CONTEXT_ENABLED` | `false` |

### RAG

| Variable | Default |
|----------|---------|
| `RAG_ENABLED` | `true` |
| `PINECONE_API_KEY` | — |
| `PINECONE_INDEX_NAME` | `caredroid-medical-knowledge` |
| `PINECONE_ENVIRONMENT` | `us-east-1-aws` |
| `PINECONE_NAMESPACE` | `medical-docs` |
| `AI_EMBEDDING_MODEL` | `local-deterministic-embedding` |
| `EMBEDDING_DIMENSION` | `1536` |
| `EMBEDDING_BATCH_SIZE` | `100` |
| `RAG_TOP_K` | `5` |
| `RAG_MIN_SCORE` | `0.70` |
| `RAG_MAX_TOKENS` | `2000` |
| `RERANK_ENABLED` | `false` |
| `RERANK_PROVIDER` | `local` |
| `CHUNK_SIZE` | `512` |
| `CHUNK_OVERLAP` | `50` |

### NLU & anomaly detection

| Variable | Default |
|----------|---------|
| `NLU_SERVICE_MODE` | `in-process` |
| `NLU_SERVICE_ENABLED` | `true` |
| `NLU_SERVICE_URL` | `http://127.0.0.1:3350/api/nlu` |
| `NLU_SERVICE_TIMEOUT` | `30000` |
| `NLU_SERVICE_RETRIES` | `3` |
| `NLU_CONFIDENCE_THRESHOLD` | `0.70` |
| `ANOMALY_DETECTION_ENABLED` | `true` |
| `ANOMALY_DETECTION_URL` | `http://anomaly-detection:5000` |
| `ANOMALY_DETECTION_TIMEOUT` | `30000` |
| `ANOMALY_DETECTION_RETRIES` | `3` |

### Governance

| Variable | Default |
|----------|---------|
| `AI_AUDIT_RETENTION_DAYS` | `2555` (7 years) |
| `AI_PLATFORM_BUILD` | `emergency-os-2026.06` |

---

*This document reflects platform build `emergency-os-2026.06`. For the broader platform README, see [`/README.md`](../README.md).*
