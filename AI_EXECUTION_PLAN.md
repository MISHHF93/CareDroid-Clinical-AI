# CareDroid Unified AI Node Execution Plan
## Professor Mode — AI Architecture, Scenario Training, Query Execution, Evaluation, Safety, and Production Readiness

Claude,

Take ownership of the CareDroid AI implementation and turn the current AI, RAG, OCR, clinical tools, model-provider integrations, Copilot experiences, EMS workflows, Reception workflows, and platform intelligence into one unified, executable, testable, observable, and safely governed AI node.

Your goal is not to create another isolated chatbot.

Your goal is to build one **CareDroid Unified AI Node** that can receive requests from every approved user profile, select the correct tools and knowledge sources, retrieve evidence, execute deterministic functions, call approved models, validate outputs, enforce safety policy, create human-review tasks where required, record all activity, and return structured responses that every CareDroid workflow can consume.

Do not assume that existing AI code works because files or routes exist.

Prove every capability by tracing it from user action to final result.

---

# 1. Primary Objective

Create one unified AI orchestration layer for CareDroid that supports:

- Reception Copilot
- EMS handoff assistance
- Triage assistance
- Nursing assistance
- Physician assistance
- Clinical calculator selection and execution
- OCR-assisted document understanding
- RAG-based clinical and operational retrieval
- Patient-flow intelligence
- Alert explanation
- Operational forecasting
- Administrative assistance
- Analytics and reporting support
- Policy and procedure retrieval
- Training and simulation scenarios
- Human-review workflows
- Safe fallback behavior when AI providers are unavailable

The unified AI node must be provider-independent, role-aware, tenant-isolated, evidence-grounded, auditable, and executable through both the CareDroid user interface and direct API queries.

---

# 2. Repository Discovery

Inspect the complete repository and identify every AI-related implementation, including:

- `backend/src/modules/ai`
- `backend/src/modules/ai-gateway`
- `backend/src/modules/rag`
- OCR modules
- clinical calculator modules
- Copilot components
- EMS handoff components
- Reception AI components
- predictive analytics modules
- model adapters
- provider clients
- prompt files
- tool registries
- agent registries
- safety filters
- redaction utilities
- audit services
- token and cost tracking
- vector stores
- embedding clients
- Redis caches
- PostgreSQL and pgvector integration
- API routes
- controllers
- services
- schemas
- tests
- fixtures
- feature flags
- environment configuration
- frontend hooks and API clients
- WebSocket or realtime AI events
- unfinished, duplicated, orphaned, or disconnected AI code

Create an AI dependency map showing:

```text
User action
    ↓
Frontend component
    ↓
Typed request
    ↓
Authentication and entitlement
    ↓
AI gateway
    ↓
Intent and risk classification
    ↓
Tool and model routing
    ↓
RAG / OCR / calculator / workflow service
    ↓
Safety validation
    ↓
Human review when required
    ↓
Audit, cost, metrics, and trace
    ↓
Structured response
    ↓
Frontend rendering and user action
```

Classify every AI artifact as:

- Verified complete
- Implemented but unverified
- Partially implemented
- Disconnected
- Duplicated
- Placeholder
- Broken
- Deprecated
- Missing
- Blocked

Do not mark anything complete based only on filenames or comments.

---

# 3. Unified AI Node Architecture

Create one canonical AI architecture composed of the following modules:

```text
CareDroid AI Gateway
├── Request validator
├── Authentication and entitlement guard
├── Tenant and workspace isolation guard
├── Role and permission resolver
├── Intent classifier
├── Clinical-risk classifier
├── Emergency escalation detector
├── Tool allowlist resolver
├── Model router
├── RAG orchestrator
├── OCR orchestrator
├── Deterministic calculator executor
├── Workflow action planner
├── Predictive model adapter
├── Language model adapter
├── Structured-output validator
├── Safety policy engine
├── Human-review creator
├── Response grounding and citation layer
├── Redaction and privacy controls
├── Audit, metering, cost, and telemetry
├── Provider fallback and circuit breaker
└── Typed response formatter
```

Every AI request must pass through this node.

Do not allow role pages, React components, controllers, or feature modules to call model providers directly.

Create one provider-independent interface such as:

```ts
interface AIProvider {
  generate(request: AIProviderRequest): Promise<AIProviderResult>;
  stream?(request: AIProviderRequest): AsyncIterable<AIProviderChunk>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Support multiple adapters without coupling workflows to one provider:

- Groq for early demonstrations
- approved commercial providers
- approved open-source or self-hosted providers
- deterministic mock provider for tests
- local development fallback where available

Model names, provider priority, timeouts, context limits, tool support, structured-output support, and cost metadata must come from configuration, not page code.

---

# 4. Canonical AI Request Contract

Define one strict request envelope:

```ts
interface CareDroidAIRequest {
  requestId: string;
  correlationId: string;
  organizationId: string;
  workspaceId?: string;
  facilityId?: string;
  userId: string;
  role: CareDroidRole;
  permissions: string[];
  channel:
    | "reception"
    | "ems"
    | "triage"
    | "nursing"
    | "physician"
    | "operations"
    | "administration"
    | "training"
    | "api";
  task:
    | "answer_question"
    | "summarize"
    | "retrieve_policy"
    | "extract_document"
    | "detect_missing_information"
    | "suggest_next_action"
    | "prepare_handoff"
    | "select_calculator"
    | "execute_calculator"
    | "explain_alert"
    | "forecast_operations"
    | "create_training_scenario"
    | "evaluate_simulation";
  patientContext?: PatientContext;
  encounterContext?: EncounterContext;
  emsContext?: EmsContext;
  workflowContext?: WorkflowContext;
  documentContext?: DocumentContext;
  query: string;
  attachments?: AIAttachmentReference[];
  requestedTools?: string[];
  responseFormat: "text" | "structured" | "stream";
  locale?: string;
}
```

Validate every request at runtime.

Reject malformed, unauthorized, cross-tenant, oversized, unsupported, or unsafe requests before invoking a model.

---

# 5. Canonical AI Response Contract

Define one strict response envelope:

```ts
interface CareDroidAIResponse {
  requestId: string;
  correlationId: string;
  status:
    | "completed"
    | "needs_human_review"
    | "insufficient_evidence"
    | "blocked_by_safety"
    | "provider_unavailable"
    | "failed";
  responseType:
    | "answer"
    | "summary"
    | "recommendation"
    | "calculator_result"
    | "workflow_plan"
    | "training_scenario"
    | "error";
  content: string;
  structuredData?: unknown;
  evidence: EvidenceReference[];
  citations: CitationReference[];
  confidence?: number;
  uncertainty: string[];
  missingInformation: string[];
  limitations: string[];
  toolExecutions: ToolExecutionRecord[];
  model: ModelExecutionMetadata;
  safety: SafetyEvaluation;
  humanReview?: HumanReviewReference;
  createdAt: string;
}
```

Do not return ambiguous empty objects, unvalidated JSON, fake success, or silent fallbacks.

Clearly distinguish no answer found, insufficient evidence, provider unavailability, safety blocks, tool failure, calculator failure, OCR failure, malformed model output, and required human review.

---

# 6. Tool Registry

Create one typed tool registry with explicit ownership, permissions, input schema, output schema, timeout, retry behavior, audit requirements, and risk level.

The registry may include:

- patient search
- patient summary retrieval
- registration draft retrieval
- waiting-queue lookup
- EMS pre-arrival lookup
- ambulance ETA lookup
- alert lookup
- policy retrieval
- procedure retrieval
- clinical calculator selection
- deterministic calculator execution
- OCR document extraction
- document summarization
- staff and room availability lookup
- patient-flow KPI lookup
- audit lookup
- report generation
- training scenario generation
- simulation evaluation
- human-review task creation

Every tool must declare:

```ts
interface AIToolDefinition<TInput, TOutput> {
  name: string;
  version: string;
  description: string;
  riskLevel: "low" | "moderate" | "high";
  allowedRoles: CareDroidRole[];
  requiredPermissions: string[];
  inputSchema: Schema<TInput>;
  outputSchema: Schema<TOutput>;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  requiresHumanApproval: boolean;
  execute(input: TInput, context: ToolContext): Promise<Result<TOutput, ToolError>>;
}
```

Do not allow unrestricted tool calling or invented tool names and arguments.

---

# 7. Deterministic Clinical Calculators

Audit the existing clinical calculator library and classify each calculator as implemented, validated, duplicated, disconnected, missing tests, missing units, missing source, unsafe, or incomplete.

For every active calculator:

- use deterministic TypeScript functions
- validate every input
- require explicit units
- handle boundary conditions
- show the formula or algorithm version
- show source and provenance
- record the calculator version
- never let the LLM perform the arithmetic itself
- return structured results
- require human interpretation where appropriate

Add direct query support and tests for normal, minimum, maximum, invalid, missing, conflicting, and unit-conversion cases.

---

# 8. RAG Integration

Use the existing RAG system as the evidence layer for the unified AI node.

Verify and improve document ingestion, parsing, chunking, headings, tables, Unicode, long and short documents, chunk overlap, stable chunk IDs, content hashes, embedding cache, embedding versioning, duplicate documents, re-ingestion, version updates, deletion, pgvector storage, optional external vector providers, tenant isolation, workspace isolation, metadata filtering, top-K, minimum score, hybrid retrieval, reranking, citation mapping, token budgeting, cache invalidation, concurrent retrieval, fallback behavior, no-evidence handling, prompt-injection resistance, and stale-source detection.

The system must abstain or escalate when evidence is missing, conflicting, outdated, below threshold, jurisdictionally incompatible, population-incompatible, or unsupported by citations.

---

# 9. OCR Integration

Audit and connect the existing OCR implementation.

Support image preprocessing, rotation correction, de-skewing, contrast enhancement, document classification, text extraction, table extraction, key-value extraction, confidence scoring, page-level provenance, field-level provenance, retry handling, manual correction, human verification, document versioning, secure storage, and audit history.

Integrate OCR into Reception document capture, EMS handoff documents, referrals, transfers, consent forms, insurance documents, uploaded clinical documents, and training fixtures.

Never commit low-confidence OCR content directly into authoritative patient records without approval.

---

# 10. Platform Scenario Training

Create a versioned scenario library representing workflows already present in CareDroid.

Do not train on uncontrolled production conversations.

Use de-identified, synthetic, licensed, or explicitly approved data.

Cover Reception, EMS, Triage, Nursing, Physician, Operations, Administration, and Safety scenarios, including normal cases, ambiguous cases, missing data, stale data, dependency outages, prompt injection, cross-tenant access attempts, unsupported tool calls, malformed JSON, fabricated citations, unsafe automation requests, and required escalation.

Each scenario must include scenario ID, version, role, context, request, evidence, expected tools, forbidden tools, expected response type, expected citations, expected safety behavior, human-review expectation, scoring rubric, and regression classification.

---

# 11. Training Strategy

Use this priority order:

1. repair execution paths
2. improve prompts
3. improve tool definitions
4. improve RAG
5. improve deterministic calculators
6. improve structured-output validation
7. improve safety policy
8. improve model routing
9. fine-tune only when evidence proves it is necessary

Prefer RAG over retraining for changing knowledge and deterministic tools over LLM reasoning for validated calculations and state transitions.

Do not fine-tune on uncontrolled chats, unapproved PHI, unlicensed corpora, unverified internet material, incorrect examples, unlabeled model-generated answers, or mixed-tenant data.

Create data cards, model cards, dataset versions, experiment records, training manifests, validation splits, test splits, contamination checks, deduplication checks, subgroup evaluations, and rollback checkpoints.

Never overwrite the deployed model silently.

---

# 12. Direct Query Execution

Create and verify direct executable interfaces.

## API

```text
POST /api/ai/query
POST /api/ai/query/stream
POST /api/ai/tools/:toolName/execute
GET  /api/ai/providers/health
GET  /api/ai/models
GET  /api/ai/tools
GET  /api/ai/requests/:requestId
POST /api/ai/requests/:requestId/retry
POST /api/ai/requests/:requestId/review
```

## CLI

Create a safe development command such as:

```bash
npm run ai:query -- --role reception --task answer_question --query "..."
```

The CLI must support mocked and live providers, scenario fixtures, request IDs, tool calls, citations, confidence, safety result, latency, token usage, and nonzero exit codes on failure while never printing secrets or PHI.

## UI

Ensure Reception Copilot, EMS handoff, Triage assistance, and other approved interfaces call the unified AI node.

Every visible AI action must have loading, cancellation, timeout, retry, failure explanation, source display, citations, accept, modify, dismiss, escalate, and audit behavior.

---

# 13. Safety Policy

Implement one central AI safety policy.

The AI may retrieve, summarize, classify, identify missing information, explain, suggest, draft, forecast, recommend approved next actions, select deterministic tools, and create human-review tasks.

The AI must not autonomously diagnose, prescribe, order medication, assign definitive triage, alter authoritative patient data, suppress critical alerts, merge identities, redirect ambulances, place a facility on diversion, discharge or admit a patient, resolve restricted clinical alerts, or execute irreversible clinical actions.

Require human review for high-risk outputs, emergency escalation rules, tool allowlists, role and permission checks, tenant isolation, prompt-injection defense, retrieved-document injection defense, PHI-aware redaction, provider timeout, circuit breaker, kill switch, deterministic fallback, model and prompt versioning, immutable audit trails, provenance, citations, and unsupported-claim detection.

---

# 14. Evaluation Framework

Create a locked benchmark and compare every candidate with the current baseline.

Measure task completion, structured-output validity, tool selection accuracy, tool argument accuracy, RAG Recall@K, retrieval precision, citation precision, citation coverage, groundedness, unsupported-claim rate, hallucination rate, emergency escalation recall, refusal accuracy, human-review accuracy, missing-information detection, summarization factuality, calculator selection, calculator correctness, OCR accuracy, OCR confidence calibration, latency, token usage, cost, provider availability, cache effectiveness, tenant isolation, prompt-injection resistance, cross-tenant resistance, role-permission enforcement, subgroup performance, fallback behavior, and recovery behavior.

Minimum gates include zero cross-tenant leakage, zero unauthorized tool execution, zero critical safety regressions, 100% calculator correctness for validated fixtures, and 100% passing required deterministic suites.

---

# 15. Testing

Add or repair AI unit tests, gateway tests, provider adapter tests, authentication tests, entitlement tests, rate-limit tests, concurrency tests, timeout tests, cancellation tests, malformed-response tests, structured JSON tests, redaction tests, audit tests, token and cost tests, RAG chunking tests, embedding tests, vector-store tests, pgvector tests, cache tests, tenant-isolation tests, reranking tests, citation tests, clinical evaluation tests, OCR tests, calculator tests, human-review tests, Reception Copilot tests, EMS handoff tests, direct API query tests, CLI query tests, Playwright AI workflow tests, outage tests, prompt-injection tests, malicious-document tests, stale-source tests, and regression tests.

Mandatory CI must use deterministic providers and fixtures.

External live-provider checks must remain separate unless explicitly approved.

---

# 16. Database and Persistence

Persist AI request, response, user, role, tenant, facility, task, model, provider, prompt version, retrieved evidence, tool calls, latency, token usage, cost, safety result, human-review state, user action, final disposition, error code, correlation ID, and trace ID.

Verify migrations from empty and previous schemas, schema parity, indexes, foreign keys, tenant indexes, vector dimensions, uniqueness, transactions, retention, deletion, and no production `synchronize: true`.

Use transactional outbox or equivalent for committed AI events.

---

# 17. Observability

Instrument the AI node with structured logs, metrics, distributed traces, provider health, model health, RAG latency, retrieval scores, tool latency, tool failures, OCR latency, calculator executions, safety blocks, human-review creation, unsupported claims, fallback activation, cache metrics, token usage, cost, tenant-isolation violations, rate limits, queue depth, timeout rate, and cancellation rate.

Do not log raw PHI, secrets, full prompts, or unredacted documents without approved policy.

---

# 18. Rollout

Deploy through local development, deterministic test environment, simulation, shadow mode, silent prospective evaluation, limited supervised pilot, canary release, and controlled production.

Use feature flags, provider flags, model registry, prompt registry, kill switch, automatic rollback, circuit breakers, fallback models, deterministic fallback, version pinning, and audit history.

---

# 19. Living AI TODO Register

Create `AI_MASTER_TODO.md`.

Every task must include ID, category, owner, branch, priority, risk, status, evidence, source files, dependencies, acceptance criteria, validation commands, benchmark impact, completion date, and rollback notes.

Never delete completed tasks; mark them verified and preserve evidence.

---

# 20. Required Deliverables

Create and maintain:

```text
AI_EXECUTION_PLAN.md
AI_MASTER_TODO.md
AI_ARCHITECTURE.md
AI_PROVIDER_MATRIX.md
AI_TOOL_CATALOG.md
AI_SCENARIO_LIBRARY.md
AI_EVALUATION_REPORT.md
AI_SAFETY_REPORT.md
AI_DATASET_CARD.md
AI_MODEL_CARD.md
AI_RUNBOOK.md
```

---

# 21. Execution Order

1. inspect the repository
2. establish the baseline
3. map AI, RAG, OCR, calculators, providers, and Copilot
4. classify implementations
5. define canonical contracts
6. build the unified AI gateway
7. consolidate providers
8. connect RAG
9. connect OCR
10. connect calculators
11. build the tool registry
12. implement safety policy
13. implement human review
14. implement direct query API
15. implement development CLI
16. connect Reception Copilot
17. connect EMS handoff
18. connect remaining role workflows
19. create the scenario library
20. build the evaluation suite
21. improve prompts, retrieval, routing, and tools
22. fine-tune only if justified
23. add observability
24. validate database and migrations
25. run deterministic tests
26. run controlled live-provider tests
27. publish reports and scorecards
28. update the living TODO register
29. repeat until gates pass

---

# 22. Non-Negotiable Rules

Do not use `any`, `@ts-ignore`, `@ts-nocheck`, weakened strictness, broad ESLint suppression, disabled tests, hard-coded secrets, hard-coded production model IDs in UI code, fake success responses, unvalidated model JSON, unbounded retries, unrestricted tools, cross-tenant retrieval, direct provider calls from React components, silent AI fallbacks, low-confidence OCR committed as truth, LLM-calculated validated medical scores, production `synchronize: true`, uncontrolled production-conversation training, automatic clinical decisions, or hidden safety failures.

---

# 23. Definition of Done

The unified CareDroid AI node is complete only when:

- one canonical AI gateway exists
- every approved AI workflow uses it
- direct API queries work
- development CLI queries work
- Reception Copilot works
- EMS handoff works
- RAG is connected and evaluated
- OCR is connected and verified
- deterministic calculators execute correctly
- tool calls are validated and permissioned
- structured responses validate
- citations and evidence are shown
- safety rules work
- human-review creation works
- provider fallback works
- tenant isolation is proven
- migrations pass
- TypeScript reports zero errors
- ESLint reports zero errors
- deterministic tests pass
- browser workflows pass
- no fake success remains
- no AI control is disconnected
- no critical workflow depends on one unavailable provider
- model and prompt versions are recorded
- metrics, cost, latency, audit, and traces are recorded
- the evaluation report demonstrates improvement over baseline
- every unresolved item is explicitly documented

Work autonomously but preserve valid functionality.

Do not stop after creating documents.

Use the documents to guide implementation and continuously update the plan and TODO register.

Do not claim completion without executable proof.