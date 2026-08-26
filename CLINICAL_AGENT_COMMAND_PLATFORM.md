# CareDroid Clinical Agent Command Platform

**Status:** living north-star architecture · **Created:** 2026-08-23  
**Authority:** this document is the canonical product direction. When it disagrees with older docs (AI_ARCHITECTURE.md, README.md, older scorecard entries), this document wins for the agent-command platform direction — but individual existing implementations remain authoritative for their own behavior until explicitly migrated.

**Companion documents:**
- `lib/ai/capabilityRegistry.ts` — the Capability Registry API and type system
- `lib/ai/capabilityRegistrations.ts` — every existing capability registration, verified against source
- `backend/src/modules/chief-investigation/` — the first vertical slice
- `MASTER_TODO.md` — the engineering backlog

---

## 1. The Product Is Not An EHR With An Assistant Anymore

CareDroid is becoming a **Clinical Intelligence Operating Environment / Agent Command Platform**.

The AI Chief is the **orchestrator of an intelligence ecosystem**, not the product's only intelligence and not the system of record.

The domain backend remains authoritative. The capability fabric provides the intelligence and tools. The security and policy layers govern every action. The interoperability layer connects healthcare data and external systems. The command center gives humans operational control. The architecture can continuously incorporate better medical models, agents, tools, and devices without requiring the entire product to be rebuilt.

**More autonomy must never mean less control.**

---

## 2. North-Star Architecture

```
                         HUMAN CLINICIAN
                              │
                         GOAL / COMMAND
                              │
                              ▼
                 ┌────────────────────────┐
                 │    CAREDRIOD CHIEF     │
                 │   AGENT COMMANDER      │
                 │                        │
                 │ Context                │
                 │ Planning               │
                 │ Delegation             │
                 │ Verification           │
                 │ Synthesis              │
                 │ Escalation             │
                 └───────────┬────────────┘
                             │
                     POLICY / IDENTITY
                             │
                             ▼
                 ┌────────────────────────┐
                 │  CAPABILITY FABRIC     │
                 │  (Capability Registry) │
                 └───────────┬────────────┘
                             │
        ┌────────────────────┼─────────────────────┐
        │                    │                     │
        ▼                    ▼                     ▼
  MEDICAL AGENTS        OPERATIONAL AGENTS     KNOWLEDGE
        │                    │                     │
  Labs / Imaging        Flow / Staffing       Guidelines
  Triage / Risk         Tasks / Handoff        Literature
  Medication            Results                RAG
  Documentation         Notifications           Protocols
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
            FHIR            APIs            IoT
          EHR/Data        Services        Devices
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    CAREDRIOD DOMAIN CORE
                             │
                 AUTHORIZATION / AUDIT
                             │
                             ▼
                     VERIFIED OUTCOME
```

The really important insight: **the Chief isn't the product's intelligence**. It is the **orchestrator of an intelligence ecosystem**.

If a better radiology model appears six months from now, or a better deterioration model appears next year, or a new medical agent becomes available, or a hospital exposes another FHIR capability, or a new bedside device becomes interoperable — CareDroid doesn't need to be redesigned from scratch.

You register the new capability, define its contract and risk, authorize it, evaluate it, and the command platform can potentially use it.

---

## 3. The Capability Registry Is the Fabric

Every model, agent, calculator, service, API, data source, and device in the CareDroid ecosystem declares itself in the **Capability Registry** (`lib/ai/capabilityRegistry.ts`).

A capability record declares:

- **Identity** — stable id, name, type (model/agent/calculator/service/api/data_source/device_iot/workflow/human_review/audit)
- **Purpose** — one sentence a clinician/operator can read
- **Version** — changes when behavior, inputs, or outputs change
- **Intended use** — the specific clinical/operational job this capability is validated for
- **Not-intended-for** — negative space is as important as positive
- **Modalities** — retrieval, analysis, calculator, deterministic_rule, model_prediction, llm_generation, rag_assisted, document_understanding, heuristic, keyword_match, fixture_demo, operational, workflow, communication, device_iot, FHIR_interop, human_review, audit
- **Risk class** — none, informational, low, moderate, elevated, high, critical
- **Write category** — none, draft, task, communication, patient_state, clinical_mutation, device_command, authoritative
- **Autonomy levels** — max and min (OBSERVE, ANALYZE, RECOMMEND, PREPARE, EXECUTE)
- **Input schema** — what the Chief must supply
- **Output schema** — what the capability returns, with field-level descriptions
- **Required context** — patient/encounter/tenant/user binding requirements
- **Data sources** — what this capability reads from or writes to
- **Evidence declaration** — what data it expects, whether it cites evidence, supports provenance, reports missing data, reports uncertainty, fabricates when insufficient (MUST be false for clinical)
- **Response source category** — LLM_GENERATED, MODEL_PREDICTION, RAG_ASSISTED, TOOL_RESULT, DETERMINISTIC_RULE, STATIC_CONTENT, FIXTURE_DEMO, UNAVAILABLE
- **Human approval requirement** — whether this capability requires human approval before its output can be acted upon
- **Permitted roles** — which roles may invoke this capability
- **Tenant scope** — tenant_only, cross_tenant_prohibited, platform
- **Patient binding** — required, optional, none
- **Authorization requirements** — beyond basic role check
- **Failure mode and behavior** — how the capability behaves when it cannot deliver (silent_failure is FORBIDDEN)
- **Approval status, accountable owner, last verified date, implementation reference, usage notes**

This is the **PRIMARY interface between the Chief and the capability fabric**. The Chief never reaches into the backend directly — it asks the registry what is available, filtered by task, context, risk, and policy, then invokes through the selected capability's declared contract.

### Capability types in the current registry

As of 2026-08-23, the registry contains:

- **44 calculator capabilities** — one per registered executor tool (NEWS2, SOFA, drug-interactions, lab-interpreter, HEART, CHA2DS2-VASc, CHADS2, GCS, Wells PE, APACHE II, anion-gap, A-a gradient, corrected-calcium, corrected-sodium, FeNa, FeUrea, osmolal-gap, serum-osmolality, P/F ratio, ROX index, MEWS, revised-trauma-score, Hunt & Hess, ICH score, FOUR score, modified-Rankin, PECARN head, Wells DVT, ABG interpreter, Duke treadmill, Framingham, GRACE ACS, HAS-BLED, TIMI UA/NSTEMI, Reynolds, Nexus C-spine, Canadian C-spine, ABCD2). All deterministic, all TOOL_RESULT source category, all risk class moderate, all write category none.

- **9 emergency-tool capabilities** — the 10 tools from `lib/ai/toolRegistry.ts` (get_patient_details, get_queue_status, get_capacity_status, search_patients, flag_patient, move_patient_state, launch_calculator, create_referral, dispatch_alert). Read-only tools are OBSERVE/ANALYZE; mutating tools produce pending actions requiring confirmation.

- **Chief Investigation Runner** — the first vertical slice (`backend/src/modules/chief-investigation/`). Deterministic plan runner. LEVEL_0_OBSERVE + LEVEL_2_PREPARE. No LLM planning, no autonomous mutation. Every suggested action becomes an AiActionProposal. Truthful states: SUPPORTED, PARTIALLY_SUPPORTED, INSUFFICIENT_DATA, STALE_DATA, TOOL_FAILURE, OUTSIDE_SCOPE, REQUIRES_HUMAN_REVIEW.

- **CareDroid AI Structured Heuristic Node** (`lib/ai/careDroidAI.ts`) — 18-intent deterministic heuristic, NOT an LLM. DETERMINISTIC_RULE source category.

- **6 LLM provider adapters** — Anthropic, OpenAI, Azure OpenAI, Gemini, Groq, local deterministic. LLM_GENERATED source category. Each declares its provider key requirement, streaming support, and fallback behavior.

- **RAG pipeline** — retrieval + reranking + citation with tenant isolation. RAG_ASSISTED source category. Unit-tested tenant isolation; adversarial HTTP/Postgres integration open.

- **OCR pipeline** — Tesseract.js document understanding. DETERMINISTIC_RULE source category. Accuracy on messy handwriting and PDF rasterization open.

- **Copilot Chat Pipeline** — the real, live copilot path (`POST /api/chat/message`). End-to-end pipeline. LLM_GENERATED primary source. Known gaps: 4 independent selection systems (2 agree), streaming unwired, artifacts read-side dead, approval gate advisory-only, memory UUID-gated.

- **Clinical Intelligence Service** — RAG-grounded, query-oriented intelligence surface. RAG_ASSISTED source category.

- **Human Review capability** — governance review items. The gate between AI preparation and clinical action. Currently advisory-only at 3 of 4 call sites.

- **Audit capability** — full provenance recording for every AI action. Deterministic_rule source category.

- **Context Engine** — binds every Chief task to the correct user, patient, encounter, tenant, site, and workflow. DETERMINISTIC_RULE source category.

- **Intent Classifier** — trained NLU head (local MLP) + keyword enrichment. MODEL_PREDICTION for the trained head. 100% on n=51 as of 2026-07-21.

- **MoE Router / Expert Selector** — real, wired expert selection. DETERMINISTIC_RULE source category. 4 independent selection systems remain live; only 2 agree.

- **Tool Registry Fabric** — the aggregate parent of the emergency tools.

- **Capability Registry** — the entry point for the Chief's discovery.

---

## 4. The Chief Is the Orchestrator, Not the Intelligence

The Chief:

1. **Receives a high-level goal** from a human clinician or authorized operator ("investigate this deterioration", "prepare this patient's handoff", "find unresolved critical results", "summarize what changed", "identify operational bottlenecks").

2. **Establishes context** — binds the task to the correct user, patient, encounter, tenant, site, and workflow through the Context Engine. Prevents stale global state from silently changing action ownership.

3. **Plans the work** — decomposes the goal into bounded operations.

4. **Discovers available capabilities** — queries the Capability Registry filtered by task, context, risk, and autonomy level. The Chief does NOT get arbitrary backend access; it discovers what it is legitimately allowed to use.

5. **Delegates bounded subtasks** to specialized medical AI agents, operational agents, deterministic calculators, clinical decision-support services, evidence/RAG systems, FHIR/EHR resources, APIs, hospital workflows, external software agents, and authorized IoT/device capabilities.

6. **Retrieves and reconciles information** — gathers evidence from multiple sources, detects missing/stale/conflicting data.

7. **Verifies tool outputs** — checks that deterministic tools executed correctly, that model outputs are grounded, that evidence is cited.

8. **Synthesizes evidence** — produces a transparent, clinician-understandable synthesis with evidence, provenance, uncertainty, missing information, and limitations. Never exposes hidden chain-of-thought.

9. **Prepares actions** — assembles drafts, briefs, task assignments, and approval-gated proposals. Nothing consequential executes automatically.

10. **Requests human approval** where required — consequential clinical mutations, orders, communications, patient-state changes, device commands, or other high-risk actions are subject to explicit authorization and appropriate human approval.

11. **Monitors results** — tracks the execution trace: context verified, vitals retrieved, laboratory data analyzed, medication interactions checked, evidence retrieved, missing data detected, recommendation prepared.

12. **Recovers from failures** — honest states when things go wrong (STALE, DEGRADED, FAILED, INSUFFICIENT_DATA, CONFLICTING_EVIDENCE, OUTSIDE_SCOPE, TOOL_FAILURE, REQUIRES_HUMAN_REVIEW).

13. **Produces a transparent, auditable outcome** — every action attributable to both the human initiating authority and the software agent performing it.

---

## 5. Autonomy Levels

Explicit, hierarchical, and policy-governed:

| Level | What it means |
|-------|---------------|
| **OBSERVE** | Read-only retrieval, monitoring, and display. May read patient/encounter/operational data. May not create, modify, or delete any state. |
| **ANALYZE** | May compute, score, classify, and reason over retrieved data using deterministic rules, calculators, or approved models. May not change authoritative state. Findings are decision support, never action. |
| **RECOMMEND** | May propose candidate actions, next steps, or dispositions as structured recommendations with explicit evidence, uncertainty, and limitations. No action is taken. |
| **PREPARE** | May assemble drafts, briefs, task assignments, and approval-gated proposals. Prepared items are inert until an authorized human explicitly approves or rejects them. |
| **EXECUTE** | May perform explicitly authorized, scoped, reversible operations. Consequential clinical mutations, orders, communications, patient-state changes, device commands, and other high-risk actions require explicit authorization and appropriate human approval — never an LLM-generated tool call firing automatically. |

Each capability declares its `maxAutonomyLevel` and `minAutonomyLevel`. The Chief may not invoke a capability above its declared max, and a capability below its min is not suitable for the current task context.

---

## 6. Truthful Agent and Result States

The system never presents stale data, unavailable services, model guesses, or fabricated metrics as authoritative clinical truth.

| State | Meaning |
|-------|---------|
| **LIVE** | Capability is available and functioning normally. |
| **STALE** | Capability is operational but its data, model, or configuration is stale and may not reflect current state. |
| **PENDING** | Capability is queued, initializing, or awaiting prerequisite context. |
| **DEGRADED** | Capability is partially available with reduced reliability, scope, or fidelity. |
| **FAILED** | Capability failed to execute. No result should be treated as authoritative. |
| **INSUFFICIENT_DATA** | Capability cannot produce a reliable result because required input data is missing or incomplete. |
| **CONFLICTING_EVIDENCE** | Multiple evidence sources disagree; no single conclusion can be presented as authoritative without reconciliation. |
| **OUTSIDE_SCOPE** | Requested operation is outside this capability's declared scope, modality, or risk envelope. |
| **TOOL_FAILURE** | The underlying tool, model, or service failed. Distinguish from INSUFFICIENT_DATA — the tool ran but errored. |
| **REQUIRES_HUMAN_REVIEW** | Result has been prepared but requires human review before it can inform any action. |

The Chief Investigation Runner's `overallState` computation demonstrates the precedence: **OUTSIDE_SCOPE > TOOL_FAILURE > REQUIRES_HUMAN_REVIEW > STALE_DATA > INSUFFICIENT_DATA > PARTIALLY_SUPPORTED > SUPPORTED**. The most honest state wins, not the best-case state.

---

## 7. Security Architecture

### Agent identity and attribution

The agent is a **security principal** that must be identifiable, attributable, and auditable. Every consequential action is attributable to both the human initiating authority and the software agent performing it. This follows the direction of current NIST work on agent identity, authorization, auditing, and non-repudiation.

### Authorization layers

CareDroid preserves and strengthens its existing separation between **clinical/emergency authorization** and **SaaS/platform capability authorization**. The agent-command platform adds:

- **Agent identity** — every capability invocation is attributable to a specific agent, not an anonymous "the AI did it"
- **Capability authorization** — the capability's declared permissions govern what it may do
- **Object-level authorization** — an agent can never use a valid credential to access an unrelated patient, encounter, tenant, organization, device, or resource
- **Tenant isolation** — tenant scope is declared per capability and enforced at invocation
- **Patient/encounter binding** — capabilities that require a bound patient/encounter must not run ad-hoc without one
- **Site scope** — operational scope is explicit
- **Action policy** — the policy layer governs every action; the Chief never bypasses it

**The model never gets direct unrestricted database/API privileges.** The Chief discovers capabilities through the registry and invokes them through their declared contracts.

### Read-only vs write separation

Read-only observation and retrieval are separated from constrained writes and consequential writes. The write category vocabulary enforces this:

- **none** — strictly read-only
- **draft** — creates draft/inert objects (not authoritative)
- **task** — creates/updates tasks (non-clinical state)
- **communication** — sends messages, alerts, notifications
- **patient_state** — changes patient journey/operational state
- **clinical_mutation** — modifies clinical data (orders, results, notes)
- **device_command** — commands physical-world device/IoT
- **authoritative** — full authoritative mutation — highest scrutiny

### Consequential actions require human approval

Consequential clinical mutations, orders, communications, patient-state changes, device commands, or other high-risk actions are subject to explicit authorization and appropriate human approval — **never an LLM-generated tool call firing automatically**. The emergency-tool fabric already implements this pattern: mutating tools return pending actions requiring confirmation, not mutations.

### Device and physical actions require stronger boundaries

Device and physical actions require **substantially stronger authorization, safety, reversibility, and human-control boundaries** than ordinary read operations. The capability registry's `writeCategory: 'device_command'` and `riskClass: 'critical'` capture this. The platform recognizes that device and physical actions are a different risk class from software operations.

### Indirect prompt injection defenses

The platform maintains a **strict conceptual separation between**:

- Trusted system/developer policy
- User intent
- Clinical data
- Untrusted external content

These are never concatenated into one trusted prompt. The platform defends against:

- Indirect prompt injection (malicious instructions in patient notes, documents, search results, literature, FHIR resources, emails, external content)
- Malicious tool output / tool poisoning
- Confused-deputy attacks
- Privilege escalation
- Cross-patient contamination
- Cross-tenant access
- Unauthorized writes
- Replay attacks
- Stale plans

The agent is continuously red-teamed **as an adversarial security principal**, not merely as a language model.

### Secure context engine

The context engine binds every agent task to the correct user, patient, encounter, tenant, site, and workflow. It prevents stale global state from silently changing action ownership, handles patient switching and interruption/recovery correctly, and ensures that patient A's data, drafts, recommendations, tasks, or AI working memory can never leak into patient B's workflow.

**Patient/encounter memory, operational memory, and agent working memory are separated** rather than creating one uncontrolled memory/vector store. Provenance and ownership are explicit.

---

## 8. Interoperability

### FHIR/SMART as strategic foundation

FHIR/SMART and standards-based interoperability are strategic foundations where appropriate. Patient, Encounter, Observation, DiagnosticReport, Medication, Condition, CarePlan, CareTeam, Device, Practitioner, Organization, Location, and related resources become interoperable agent context rather than proprietary silos.

### Emerging healthcare AI interoperability

The platform investigates emerging healthcare AI interoperability and transparency work around FHIR, AI provenance, MCP, and A2A without blindly adopting immature protocols. HL7 is actively exploring AI transparency on FHIR and how agent protocols such as MCP/A2A could coexist with FHIR-based healthcare interoperability. The platform follows this work but does not cargo-cult prototypes into production.

### Device/IoT integration

Future medical IoT provides authorized telemetry from monitors, beds, devices, and other sensors. CareDroid remains responsible for identity/context binding, data freshness, provenance, alerting, escalation, and audit — **not treating raw device data as automatically trustworthy**. Device data is a capability input that must be validated, freshness-checked, and provenance-labeled before it informs any clinical conclusion.

---

## 9. Evidence and Provenance

### AI Evidence and Provenance layer

Tells the clinician:

- What data the system used
- How current it is
- Which model/tool produced each finding
- What evidence supports it
- What information was missing
- What limitations apply
- What remains uncertain

**Never exposes hidden chain-of-thought.**

### Clinician-understandable evidence

Follow a principle of **clinician-understandable evidence rather than meaningless confidence scores**. Never fabricate hallucination rates, accuracy, satisfaction, confidence, or other AI evaluation metrics — every metric must be observed, measured, labeled, derived, or explicitly unknown.

### Provenance declaration per capability

Every capability declares:

- Whether it supports provenance (can name the specific source of each finding)
- Whether it reports missing data
- Whether it reports its own uncertainty
- Whether it fabricates when data is insufficient (MUST be false for clinical capabilities)

The Chief surfaces these declarations in the execution trace and the clinician-facing result. The clinician sees: context verified, vitals retrieved, laboratory data analyzed, medication interactions checked, evidence retrieved, missing data detected, recommendation prepared — not hidden reasoning.

---

## 10. Command Center Interface

The command center is **fundamentally different from a chatbot**. It provides a persistent operational view of:

- Patients
- Encounters
- Queues
- Pending investigations
- Abnormal results
- Unresolved tasks
- Reassessments
- Active agent runs
- Recommendations
- Evidence
- Approvals
- Failures
- Escalations
- System health

The clinician issues **natural high-level commands**:

- "Investigate this deterioration"
- "Prepare this patient's handoff"
- "Find unresolved critical results"
- "Summarize what changed"
- "Prepare information for reassessment"
- "Identify operational bottlenecks"
- "Investigate why this workflow is delayed"

After each command, the Chief **decomposes the goal into bounded operations and shows progress** rather than forcing the clinician to manually operate every subsystem.

### Unmistakable patient identity

Patient identity is unmistakable throughout the command center using appropriate identifiers, encounter/location/context, and other safety-relevant identity signals. Context switching and interruption recovery are first-class workflows.

### Existing navigation preserved and reinterpreted

All existing work on navigation, information architecture, contextual drawers/tabs/workspaces, responsive design, accessibility, performance, and workflow efficiency is preserved — but reinterpreted around the command-center model so clinicians can remain oriented in one operational environment rather than jumping through disconnected pages.

---

## 11. Existing Code Mapped to the Architecture

### What maps cleanly today

| Architecture concept | Existing implementation | Status |
|---------------------|------------------------|--------|
| Capability Registry | `lib/ai/capabilityRegistry.ts` (new) + `lib/ai/capabilityRegistrations.ts` (new) | Built this session |
| Chief orchestrator | `backend/src/modules/chief-investigation/chief-investigation.service.ts` | First vertical slice, working |
| Context Engine | `lib/ai/contextEngine.ts` | Working |
| Truthful states | `chief-investigation.types.ts` + `investigation-plan.lib.ts` | Working for investigation |
| Autonomy levels | `AUTONOMY_LEVELS` in `capabilityRegistry.ts` | Defined, mapped to existing code |
| Tool fabric | `lib/ai/toolRegistry.ts` + 44 calculator executors | Working, now registered as capabilities |
| Deterministic calculators | 39 tool-orchestrator-backed calculators | Working, now first-class capabilities |
| RAG pipeline | `backend/src/modules/rag/` | Working, unit-tested tenant isolation |
| OCR pipeline | `backend/src/modules/emergency-os/ocr-providers.ts` | Working on clean fixtures |
| Human review | `backend/src/modules/human-review/` + `platform-governance` | Working, advisory-only gate |
| Audit | `backend/src/modules/audit/` | Working |
| LLM providers | `lib/ai/providers/` (6 adapters) | Implemented, transport safety + circuit breaker |
| Streaming | `lib/ai/client.ts` | Built, unwired (zero consumers) |
| Artifacts | `backend/src/modules/artifacts/` | Write-side working, read-side dead |
| Copilot chat pipeline | `backend/src/modules/chat/chat.service.ts` | Real, live, working pipeline |
| Clinical intelligence | `backend/src/modules/clinical-intelligence/` | Working, RAG-integrated |
| Intent classifier | `backend/src/modules/emergency-os/intent-classifier/` + NLU head | Working, 100% on n=51 |
| MoE router | `backend/src/modules/moe-router/` | Working, 4 selection systems (2 agree) |
| ED Copilot (real) | `ChatService.processMessage()` | Working, via `/api/ai/node/conversational` |
| ED Copilot (fake, deleted) | `EDCopilotService.processQuery()` | Deleted 2026-08-08 |

### What's documented as gaps (not fixed here)

1. **4 independent model/expert-selection systems** — only MoERouter and RoutingOptimizer agree; panelOfExpertsRouter is frontend-only. Reconciliation open.
2. **Streaming** — fully built (`lib/ai/client.ts`), zero consumers. The chat endpoint returns complete responses.
3. **Artifacts read-side** — `src/services/artifactsApi.ts` never called by any page. Real artifacts unrecoverable through UI.
4. **Approval gate** — `tool-orchestrator.evaluateGate()` advisory-only at 3 of 4 call sites. Does not block. Separate working approval loop exists under `workflow-orchestration/review` but unconnected to AI output.
5. **Memory UUID-gated** — reads/writes skipped unless `userId` matches UUID pattern. Real production coverage unverified.
6. **RAG tenant isolation** — unit level verified; adversarial HTTP/Postgres integration open.
7. **OCR PDF rasterization + messy handwriting accuracy** — open.
8. **Live-retrieval eval baseline** — offline fixtures only; live Recall@K against real vector store open.
9. **Concurrent quota atomicity** — no test exercises concurrent quota updates.
10. **Groq demo record** — requires `GROQ_API_KEY`; operational, not code.
11. **Human-review integration** — unit-level asserted; full HTTP/Postgres integration thin.

### What the registry classifies honestly that older docs sometimes blur

- **Deterministic calculators** are TOOL_RESULT, not LLM_GENERATED. They must never be presented as models performing arithmetic.
- **The heuristic node** is DETERMINISTIC_RULE, not MODEL_PREDICTION or LLM_GENERATED. Its 18-intent set is its scope boundary.
- **The fake ED Copilot** (EDCopilotService) was a keyword if/else chain returning hardcoded strings with zero LLM involvement. It was deleted in 2026-08-08. Any doc still referencing two copilots is stale.
- **Administrative automation tasks** were unconditionally `aiGenerated: true` regardless of whether AI touched them. Fixed in 2026-08-22 — rule-generated is now the honest default.
- **Evaluation metrics** were fabricated per-turn (hallucinationRate: 0.02 or 0.05 based on citation count, userSatisfaction: 4.5 hardcoded). Fixed in 2026-08-08 — runs now default to `seedOnly: true` and must explicitly assert `seedOnly: false` to be counted as measured.

---

## 12. Build Strategy

### Increment from the smallest genuinely useful vertical slice

The Chief Investigation Runner (`backend/src/modules/chief-investigation/`) is that slice today. It traverses the full chain:

```
human command → context verification → planning → capability discovery →
deterministic tool invocation (NEWS2) → evidence/provenance →
synthesis with truthful states → human approval gate (AiActionProposal) →
audit/event → downstream workflow update → verification
```

This is the proven architecture. The rest of the platform migrates onto it.

### Do not:

- Spend the project producing diagrams without working behavior
- Create fake agent functionality
- Fabricate model capabilities
- Expose unrestricted APIs to an LLM
- Grant permissions merely to make an agent succeed
- Add futuristic medical agents without a real use case
- Replace deterministic clinical logic with an LLM when deterministic logic is safer
- Hide uncertainty
- Equate agent autonomy with product quality
- Rewrite stable working code merely to make the architecture look modern

### Do:

- Inspect, prove, classify, architect, implement, test, run, attack, verify, document, commit, and push each coherent milestone
- Maintain an evidence-backed backlog
- Update architectural invariants and repository documentation after structural changes
- Continuously ask: what is the highest-risk/highest-value currently provable weakness?

---

## 13. The Finished Platform

The finished CareDroid is a **Clinical Intelligence Operating Environment / Agent Command Platform** whose:

- **AI Chief** acts as the commander and coordinator
- **Capability fabric** provides the intelligence and tools
- **Domain backend** remains authoritative
- **Security and policy layers** govern every action
- **Interoperability layer** connects healthcare data and external systems
- **Command center** gives humans operational control
- **Architecture** can continuously incorporate better medical models, agents, tools, and devices without requiring the entire product to be rebuilt

It is **not** an autonomous doctor, autonomous hospital, or unrestricted computer-use agent. The target is an AI command platform where humans establish goals and retain appropriate authority while the system performs bounded observation, analysis, coordination, and preparation — and only performs consequential actions under explicit policy and authorization.

**More autonomy must never mean less control.**

The ultimate objective is something conceptually closer to a medical version of a Devin-style command environment — not a coding agent copied into healthcare, but a secure clinical agent platform in which a clinician can command an intelligent system and that system can orchestrate a growing ecosystem of specialized medical AIs, operational AIs, deterministic clinical tools, evidence systems, FHIR/EHR resources, hospital services, software agents, and authorized IoT/device capabilities while preserving patient safety, human authority, security, interoperability, provenance, auditability, accessibility, performance, reliability, and clinical trust.
