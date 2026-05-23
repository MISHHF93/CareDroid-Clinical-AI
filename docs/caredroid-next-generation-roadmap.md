# CareDroid Clinical AI Next-Generation Roadmap

Status: strategic architecture roadmap  
Scope: frontend, backend, launch contracts, tool inventory, clinical intelligence, patient workspace, operations, interoperability, education, governance, safety, testing, and migration strategy  
Non-goal: this document does not claim future capabilities already exist unless the current codebase shows shipped or partial implementation

## 1. Executive Summary

CareDroid Clinical AI is no longer only a calculator platform. The current codebase already contains the foundations of a clinical operating system: a normalized tool inventory, canonical tool ID contracts, route-derived calculator deep links, centralized catalog launch resolution, explicit backend executor boundaries, clinical intelligence APIs, patient and operations workspace shells, fleet pages, mobile shell hardening, and contract tests that reduce drift.

The next generation should evolve CareDroid into a unified clinical intelligence platform by extending those existing foundations rather than creating parallel systems. Every future user-facing capability should enter through the same inventory, route, launch, contract, permission, safety, and testing path:

- Inventory first: add the capability to `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, and the appropriate registry/catalog projection.
- Launch first: resolve all tool opens through `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`.
- Route first: every visible path must resolve to a real page, a guarded chat launch, or a deliberate `ToolNotFound`/unsupported state.
- Contract first: every frontend API call must map to `src/data/backendHttpRouteInventory.js`, `src/data/frontendApiCallsInventory.js`, and `src/config/backendApiCapabilities.js`.
- Executor honesty: only real registered backend executors should be exposed as `POST /api/tools/:id/execute`.
- Safety first: AI outputs remain clinical decision support, require human review where clinical or operational actions are affected, and must expose citations, reasoning, audit traces, and limitations.

The recommended strategy is a layered expansion:

1. Stabilize and formalize the expansion schema.
2. Unify clinical reasoning, calculator recommendation, guideline retrieval, and explainability around the Assistant.
3. Build a real patient workspace with timeline, summaries, events, documentation, and review queues.
4. Add evidence graph, interoperability, operations intelligence, and governance controls.
5. Harden for production EHR/device integrations, PHI handling, auditability, performance, and institutional deployment.

## 2. Current Architecture Assessment

### Frontend Application Shape

The SPA route table is owned by `src/App.jsx`. Current authenticated routes include the simplified operating system destinations (`/home`, `/assistant`, `/tools`, `/patients`, `/operations`, `/settings`), legacy-compatible paths (`/dashboard`, `/chat`), tool pages under `/tools/*`, generated calculator deep links, fleet pages under `/fleet/*`, audit and analytics routes, and public/shared/legal routes.

The shell architecture is centered in `src/layout/AppShell.jsx`. It already handles compact viewport state, mobile drawer state, sidebar collapse, focus restoration, Escape close, route-change close, bottom navigation, and theme controls. `src/navigation/primaryNavigation.js` defines the visible information architecture: Home, Assistant, Tools, Patients, Operations, and Settings. That is the right high-level shape for an AI-native clinical operating system.

### Tool Inventory And Launch Architecture

The strongest frontend contract is `src/data/toolInventory.js`. It normalizes registry tools, NLU profiles, backend executors, clinical intelligence endpoints, calculator slugs, launch type, surface, route, component, endpoint, DTO metadata, and test coverage.

Canonical IDs live in `src/data/clinicalToolIdContract.js`. It distinguishes registry IDs, NLU IDs, built-in calculator slugs, Tier A calculator groups, Tier B chat-assisted groups, Tier C workflows, fleet tools, and registered backend executors.

Launch resolution is centralized in `src/data/clinicalCatalogWiring.js` and `src/navigation/registryToolLaunch.js`. The key behavior is healthy: launches resolve to calculator routes, tool pages, chat-assisted flows, hub routes, or safe fallbacks. Unknown catalog-shaped tools do not silently navigate to blank screens.

### Calculator Architecture

`src/pages/tools/Calculators.jsx` is both the calculator hub and the form host. It accepts route-derived `initialCalculatorId` and `?calc=` values, resolves invalid calculator slugs to `ToolNotFound`, and sends chat-assisted tools to `/chat`.

`src/routes/clinicalToolRoutes.js` derives `CALCULATOR_ROUTE_DEFS` from the canonical inventory, so deep links are not manually duplicated in the app route table. `src/data/calculatorHubManifest.js` derives hub cards from inventory and built-in calculators, which prevents calculator-only features from existing under the surface without a launch path.

### Backend Architecture

The backend is a NestJS app rooted at `backend/src/app.module.ts` with a global `/api` prefix in `backend/src/main.ts`. Strict validation is enabled through Nest validation pipes. Major modules include auth, users, subscriptions, AI, chat, RAG, audit, compliance, metrics, analytics, notifications, clinical intelligence, and the medical control plane.

The medical control plane is the backend boundary for intent classification and tool orchestration. `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` is explicit: only these three POST executors are registered today:

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`

Most NLU tools and frontend calculators are deliberately classified as unsupported for direct `POST /api/tools/:id/execute`. That is a strength. It prevents fake server capabilities and creates a clear path for future executor registration.

### Clinical Intelligence Architecture

Clinical intelligence APIs already exist in `backend/src/modules/clinical-intelligence`. Current endpoints include:

- `POST /api/clinical-intelligence/ambient-scribe/generate`
- `POST /api/clinical-intelligence/guideline-rag/query`
- `POST /api/clinical-intelligence/differential-ai/generate`
- `POST /api/clinical-intelligence/timeline-ai/generate`
- `POST /api/clinical-intelligence/patient-summary-ai/generate`
- `POST /api/clinical-intelligence/order-set-ai/generate`
- `GET /api/clinical-intelligence/ai-explainability/trace`
- `GET /api/clinical-intelligence/clinical-audit/execution-logs`

Frontend clients for these live in `src/services/clinicalIntelligenceApi.js`, and corresponding pages live under `src/pages/tools`. These are the most important immediate bridge from calculator platform to clinical intelligence platform.

### Patient And Operations Workspaces

`src/pages/Patients.jsx` and `src/pages/Operations.jsx` are currently workspace launch shells. They do not yet represent full patient records or a full hospital command center, but they establish the right IA:

- Patients routes users to patient summary, timeline, ambient documentation, and order-set workflows.
- Operations routes users to clinical alerts, fleet command, route optimization, predictive maintenance, analytics, and audit logs.

Fleet pages are currently frontend-first. `src/pages/fleet/FleetDashboard.jsx` uses mock telemetry from `src/services/fleetTelemetryService.js`; `RouteOptimizer.jsx` and `PredictiveMaintenance.jsx` use deterministic local services. These should remain honest local/Tier A surfaces until backend operations intelligence is added.

### Contract And Test Architecture

The codebase already has useful guardrails:

- Route and deep-link tests around `src/routes/clinicalToolRoutes.js`.
- Inventory and ID contract tests around `src/data/toolInventory.js` and `src/data/clinicalToolIdContract.js`.
- Backend/frontend exposure tests using `src/data/backendHttpRouteInventory.js` and `src/data/frontendApiCallsInventory.js`.
- Launch tests around catalog and registry navigation.
- Calculator hub, form smoke, and route tests.
- Responsive shell, sidebar, tool page, fleet, and mobile performance tests.
- Backend orchestrator, clinical intelligence service, RAG, audit, intent classifier, and executor tests.

The next generation should expand these tests rather than replace them.

## 3. Current Strengths

- Centralized inventory and ID contracts already reduce duplicate launch systems.
- Calculator routes are derived from inventory, which reduces hidden calculator risk.
- `resolveCatalogLaunch()` and `applyRegistryToolLaunch()` provide a single launch path for sidebar, catalog, dashboard, and deep-link flows.
- `ToolsAreaFallback` and calculator slug handling prevent many blank or null route outcomes.
- Backend executor honesty is strong: unsupported NLU tools receive structured unsupported responses instead of fake execution.
- Clinical intelligence endpoints already return contract versions, run IDs, safety blocks, explainability fields, and audit metadata.
- Mobile shell behavior is intentional: compact mode, drawer focus, bottom nav, route-change close, and responsive tests are present.
- The simplified IA in `primaryNavigation.js` already aligns with a clinical operating system model.
- API capabilities are explicitly gated through `backendApiCapabilities.js`, reducing accidental calls to missing routes.
- Existing audits identify hidden-functionality and mismatch risks, giving the roadmap a grounded repair baseline.

## 4. Current Weaknesses

- Clinical intelligence routes are visible as authenticated pages, but backend permissions vary by endpoint. Route-level permission preflight should become more explicit.
- Some audit/generated docs are placeholders, so architecture visibility exists in tests and code but not fully in regenerated markdown artifacts.
- The backend orchestrator has only three POST executors, while the visible product contains many calculators, chat-assisted tools, AI pages, and fleet surfaces. This is acceptable only if the UI keeps capability modes clear.
- Fleet is frontend-first and mock/local today. It should not be described as live telematics or AI fleet control until backend integrations exist.
- Patient workspace is currently a launch shell, not a patient chart, timeline, or longitudinal workspace.
- Clinical intelligence services are currently concentrated in one module. Future growth needs subdomain boundaries to avoid a monolithic `ClinicalIntelligenceService`.
- Calculator logic is large and partly centralized in `Calculators.jsx`, which may become hard to evolve into workflow chains unless calculator metadata and execution adapters are made more modular.
- NLU, launch aliases, registry IDs, and backend executor IDs are well documented but still easy to confuse when adding new capabilities.
- Several future platform concepts, such as FHIR, HL7, devices, literature search, trials, education, and governance, are not implemented and need deliberate platform modules.
- Hidden functionality can reappear if future work adds pages, services, or backend endpoints without inventory entries, route tests, and contract inventories.

## 5. Capability Layer Architecture

### Tier Definitions

- Tier A: full UI. The capability deserves a dedicated user-facing workspace or page, strong mobile behavior, explicit route ownership, and visible inventory metadata.
- Tier B: chat-assisted. The primary experience is Assistant-guided, with optional cards or shallow pages. It must still have inventory metadata, launch behavior, and safe chat seeds.
- Tier C: backend/service heavy. The capability is primarily a platform service, executor, connector, or intelligence layer. It may surface through existing pages, but backend contracts, DTOs, audit, safety, and explainability are the center of gravity.

### Status Key

- Existing: materially present in the current codebase.
- Partial: some surface exists, but the complete capability is not implemented.
- Planned: no real implementation found beyond metadata, adjacent surfaces, or roadmap need.

### Shared Capability Requirements

Every capability below should follow this implementation contract:

- Frontend: route or deliberate no-standalone-route decision, inventory entry, launch type, component owner, mobile behavior, and fallback state.
- Backend: module owner, controller route, service boundary, executor decision, DTOs, API inventory entry, capability flag, permission policy, and audit behavior.
- NLU: canonical NLU ID if chat-discoverable, guarded chat seed, alias map only for high-value phrases, and no executor claim unless registered.
- Safety: decision support limitation, human review requirement, explainability, audit, and prohibited autonomous actions.
- Testing: unit tests, integration tests, route tests, backend contract tests, responsive tests, performance tests, and drift tests.
- Dependencies: upstream data, services, permissions, inventory, launch contracts, and downstream consumers.
- Risks: duplicate systems, hidden route/API paths, null UI states, permission mismatch, frontend/backend imbalance, and unsafe automation.

### Clinical Intelligence Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `clinical-reasoning-engine` | Tier C, planned. This should be the reasoning substrate behind differential, guideline, calculator chain, why, and patient summary workflows. | Route: no standalone clinician page in Phase 1; launch through `/assistant?capability=clinical-reasoning-engine` and embedded panels in `/tools/differential-ai`, `/tools/guideline-rag`, `/tools/ai-explainability`, and future `/patients/:patientId`. Inventory: internal/platform record with `surface: internal` unless exposed in Assistant. Launch type: `platform` or `chat-assisted`. Component: `src/components/clinical/ReasoningTracePanel.jsx` planned. Mobile: collapsible reasoning sheet with source chips and no horizontal tables. | Module: `backend/src/modules/clinical-intelligence/reasoning`. Controller: avoid public standalone controller initially; expose through existing clinical-intelligence endpoints and future `POST /api/clinical-intelligence/reasoning/run` only after contract tests. Service: `ClinicalReasoningEngineService`. Executors: not a tool-orchestrator executor unless deterministic execution is needed. DTOs: `ReasoningRunRequestDto`, `ReasoningRunResponseDto`, `ReasoningTraceDto`. APIs: add to backend route and frontend API inventories when surfaced. | NLU ID: `clinical-reasoning-engine` only if Assistant needs direct launch. Launch should seed Assistant with a guarded prompt asking for patient context, question, and evidence scope. Never route to `/api/tools/:id/execute`. | Safety: no diagnosis, no autonomous orders, explicit uncertainty and missing-data fields. Human review required for all conclusions. Explainability: reasoning trace, evidence inputs, rule/calculator links. Audit: PHI access, run ID, source types, not raw prompt. Tests: reasoning unit tests, DTO validation, clinical-intelligence contract tests, Assistant launch tests, mobile trace panel tests, latency budget. Dependencies: RAG, calculators, patient context, audit. Reuse: existing clinical intelligence run ID/safety/audit pattern. Risks: unsafe overconfidence, monolithic service growth, hidden backend endpoint. |
| `workflow-calculator-chain` | Tier B, planned. It should guide users through calculator selection and sequencing rather than create another calculator hub. | Route: `/assistant?workflow=calculator-chain`; optional Tools card routes to Assistant, not a new calculator page. Inventory: `workflow-calculator-chain`, launch type `chat-assisted`, surface `chat-assisted`. Component: `CalculatorChainPanel` embedded in Assistant and calculator results. Mobile: stepper layout with one calculator/result at a time. | Module: can start frontend-only using current calculator utilities; backend later under `clinical-intelligence/workflows`. Controller: `POST /api/clinical-intelligence/workflows/calculator-chain/run` when server-side chain persistence is needed. Services: `CalculatorChainPlannerService`, calculator adapter registry. Executors: only individual deterministic calculators become executors if registered. DTOs: chain request, step result, chain explanation. | NLU ID: `workflow-calculator-chain`. Launch should use `resolveCatalogLaunch()` and chat seed to ask for clinical context, then recommend shipped calculators only. | Safety: calculators are decision support only and must not rule in/out disease. Human review required before action. Explainability: why each calculator was selected, input assumptions, contraindications. Audit: chain steps and calculator IDs, not unnecessary PHI. Tests: calculator adapter unit tests, chain integration, route launch, responsive stepper, backend contract when API ships, performance for multi-step chains. Dependencies: calculator hub manifest, calculator recommender, reasoning engine. Reuse: `CALCULATOR_ROUTE_DEFS`, `calculatorHubManifest`, `ToolPageLayout`. Risks: duplicate calculator logic, hidden calculators, null step results. |
| `workflow-builder-ai` | Tier A, planned. This is a full workflow authoring and execution UI for institutions. | Route: `/tools/workflow-builder-ai`. Inventory: registry row with launch type `clinical-page` in early mode, later `backend-backed`. Component: `src/pages/tools/WorkflowBuilderAi.jsx` with builder canvas, step library, safety review panel, test-run preview. Mobile: read/run/review mode first; authoring canvas should degrade to stacked steps or be desktop-preferred with clear notice. | Module: `backend/src/modules/workflow-builder`. Controller: `POST /api/workflows`, `GET /api/workflows`, `POST /api/workflows/:id/run`, `POST /api/workflows/:id/validate`. Services: workflow definition service, validation service, runner, versioning. Executors: workflow runner should call registered services, not bypass orchestrator contracts. DTOs: workflow definition, step, guardrail, run request/response. | NLU ID: `workflow-builder-ai`. Assistant launch should create a draft workflow from a goal, then require user review before saving. | Safety: no autonomous clinical actions; every generated workflow must pass validation and human approval. Explainability: step rationale and data dependencies. Audit: definition changes, approvals, run IDs. Tests: schema unit tests, builder component tests, workflow validation integration, route tests, backend contract tests, responsive read mode, performance for large workflows. Dependencies: reasoning engine, calculator chain, governance approvals. Reuse: inventory, launch resolver, clinical-intelligence safety blocks. Risks: unsafe workflow automation, duplicate orchestration engine, version drift. |
| `calculator-recommender-ai` | Tier B, partial. Current route and NLU/backend chat support exist, but it should become a platform recommendation service embedded throughout workflows. | Route: existing `/tools/calculator-recommender`; also Assistant and calculator hub entry points. Inventory: existing `calculator-recommender-ai`. Launch type: currently clinical page/chat-assisted, should remain honest unless a dedicated backend endpoint is added. Component: keep `CalculatorRecommender.jsx`, add reusable recommendation cards. Mobile: compact cards with one-tap open/try-in-chat actions. | Current backend support exists in chat via `CalculatorRecommenderService`; no clinical-intelligence endpoint yet. Future controller: `POST /api/clinical-intelligence/calculator-recommender/recommend`. DTOs: clinical question, context snippets, candidate calculators, explanation. Executors: no `/api/tools` executor. | NLU ID already exists. Launch should seed Assistant and open shipped calculator routes via `getRegistryToolNavigation()`. | Safety: tool selection support only, not diagnosis. Explainability: matched keywords/features and missing context. Audit: recommendation request and selected calculator IDs. Tests: recommender service tests, launch tests, inventory tests, route tests, responsive recommendation cards, performance under large catalog. Dependencies: tool inventory, calculator hub manifest, reasoning engine. Reuse: existing chat service and launch resolver. Risks: recommending unshipped tools, duplicate recommendation data, hidden calculator cards. |
| `differential-ai` | Tier C, existing. It has route, frontend API client, backend DTO/controller/service, audit, safety, and tests. | Route: existing `/tools/differential-ai`. Inventory: existing Tier C/backend-backed record. Component: `src/pages/tools/DifferentialAi.jsx` using `ToolPageLayout`. Mobile: preserve single-column form/results and collapsible explainability. | Module: existing `clinical-intelligence`. Controller: existing `POST /api/clinical-intelligence/differential-ai/generate`. Service: existing `generateDifferentialAi`. DTOs: existing `DifferentialAiRequestDto`, response DTO. Executors: no tool-orchestrator executor. | NLU ID exists. Launch should continue through catalog or Assistant, with guarded seed and no claim of diagnostic certainty. | Safety: decision support only, not diagnosis; no rule-in/rule-out claims. Explainability: feature matches, urgency signals, suggested shipped calculators. Audit: PHI access with run ID and metadata only. Tests: existing service/page tests plus route permission tests, contract inventory tests, responsive tests, performance for long narratives. Dependencies: patient context, calculator recommender, guideline RAG. Reuse: clinical-intelligence API pattern. Risks: user treating ranked list as diagnosis, permission mismatch. |
| `guideline-rag` | Tier C, existing. It should become the evidence retrieval substrate for many workflows. | Route: existing `/tools/guideline-rag`. Inventory: existing Tier C/backend-backed record. Component: `GuidelineRag.jsx`; future reusable `EvidenceCitationPanel`. Mobile: citation cards and source drawer, no dense tables. | Module: existing `clinical-intelligence` plus `rag`. Controller: existing `POST /api/clinical-intelligence/guideline-rag/query`. Service: RAG retrieve, citation builder, source attribution. DTOs: existing guideline query/response. Executors: no tool-orchestrator executor. | Launch through catalog, Assistant, differential, why engine, and workflow builder. NLU aliases should map to existing registry ID. | Safety: citation-bound support only; withhold unsupported claims when evidence is insufficient. Explainability: retrieval method, chunks, sources, limitations. Audit: query length, source count, not raw PHI unless patient context added. Tests: RAG service tests, citation contract tests, frontend source rendering, route tests, responsive citation tests, retrieval performance. Dependencies: RAG corpus ingestion, source freshness, reasoning engine. Reuse: existing RAG service. Risks: stale guidelines, unsupported generated claims, source hallucination. |
| `why-engine` | Tier C, planned as an extension of existing `ai-explainability`, not a duplicate route. | Route: reuse `/tools/ai-explainability`; optional Assistant command `/assistant?capability=why-engine`. Inventory: do not create a competing user-facing page unless product wants separate branding; add alias/feature metadata to existing explainability record. Component: `WhyPanel` inside explainability, differential, guideline, calculator chain, and patient summary. Mobile: bottom sheet with source, reasoning, and audit tabs. | Module: extend `clinical-intelligence` explainability or create submodule `clinical-intelligence/explainability`. Controller: reuse `GET /api/clinical-intelligence/ai-explainability/trace`; add `POST /api/clinical-intelligence/explainability/why` only for run-specific questions. DTOs: why query, trace reference, reason segments. Executors: none. | NLU ID: `why-engine` can alias to `ai-explainability`. Launch should require a target run/tool/result and fall back to a helpful empty state if none exists. | Safety: explain reasoning and limitations, never fabricate missing rationale. Human review required for clinical interpretation. Audit: trace access, referenced run IDs. Tests: trace retrieval, no-run fallback, route alias tests, backend DTO tests, responsive sheet tests, performance for trace lookup. Dependencies: audit logs, run IDs, reasoning engine. Reuse: existing `ai-explainability` and clinical audit. Risks: duplicate explainability systems, leaking PHI in traces. |

### Patient Workspace Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `patient-workspace` | Tier A, partial. `Patients.jsx` exists as a launch shell, not a real patient workspace. | Route: keep `/patients`; add `/patients/:patientId` when patient records exist. Inventory: workspace entry, not necessarily a clinical tool card. Launch type: `platform`. Component: `PatientWorkspace.jsx` with summary, timeline, documentation, events, orders, evidence, and audit panels. Mobile: one patient section at a time with sticky context header and safe-area bottom actions. | Module: `backend/src/modules/patient-workspace`. Controller: `GET /api/patients/:id/workspace`, `POST /api/patients/:id/context`, later event/timeline endpoints. Services: patient context, timeline aggregation, summary orchestration. DTOs: patient context, workspace snapshot, permissions, provenance. Executors: none. | NLU ID optional; Assistant should attach active patient context, not launch hidden patient routes without user selection. | Safety: PHI access control, minimum necessary context, no autonomous chart write. Explainability: source provenance per section. Audit: every patient workspace open and AI run. Tests: route permission tests, workspace empty/error states, backend contract tests, responsive patient layout, performance for large timelines. Dependencies: FHIR connector, timeline AI, patient summary AI, consent, audit. Reuse: existing Patients IA and clinical intelligence pages. Risks: PHI leakage, blank workspace without data, permission mismatch. |
| `timeline-live` | Tier A, planned from existing `timeline-ai`. | Route: `/patients/:patientId/timeline` when patient workspace exists; existing `/tools/timeline-ai` remains a power-user route. Inventory: `timeline-live` platform/workspace entry plus existing `timeline-ai`. Launch type: `platform` for patient route, `backend-backed` for AI generation. Component: `LiveTimeline.jsx` with event stream, filters, abnormal progression flags. Mobile: vertical timeline with progressive disclosure. | Module: `patient-workspace/timeline` plus existing clinical-intelligence timeline service. Controller: `GET /api/patients/:id/timeline`, optional SSE/WebSocket later. DTOs: timeline event, source reference, trend, abnormal flag. Executors: none. | NLU should route "show timeline" to active patient timeline if context exists, otherwise to `/tools/timeline-ai` with seed. | Safety: flags require clinician verification; no triage/order decisions. Explainability: event provenance and trend method. Audit: PHI access, source systems, generated flags. Tests: event ordering unit tests, stream integration, route tests, backend contract, responsive timeline, performance for long records. Dependencies: patient workspace, FHIR/HL7/device data, clinical-event-ai. Reuse: existing `TimelineAi.jsx` and DTO patterns. Risks: duplicate timeline implementations, stale live data, empty timeline states. |
| `clinical-event-ai` | Tier C, planned. It detects and summarizes clinically relevant events. | Route: no standalone route; surface in `/patients/:patientId/events` and timeline cards. Inventory: internal/platform record. Launch type: `platform`. Component: `ClinicalEventList.jsx` embedded in patient workspace. Mobile: event cards with severity and source badges. | Module: `patient-workspace/events` or `clinical-intelligence/events`. Controller: `GET /api/patients/:id/events`, `POST /api/clinical-intelligence/events/detect`. Services: event extraction, deduplication, severity labeling. DTOs: event detection request, event candidate, source provenance. Executors: none. | NLU should answer "what changed?" against active patient context and open timeline/events panels. | Safety: event detection is advisory; requires source verification. Explainability: source note/lab/vital references and extraction rules. Audit: PHI access and event generation. Tests: extraction unit tests, dedupe tests, integration with timeline, route tests, responsive event list, performance on large note sets. Dependencies: patient workspace, timeline-live, FHIR/HL7 feeds. Reuse: clinical-intelligence run/audit pattern. Risks: false positives, alert fatigue, duplicated event models. |
| `patient-summary-ai` | Tier C, existing. It should become the summary engine inside patient workspace. | Route: existing `/tools/patient-summary-ai`; embed in `/patients/:patientId`. Inventory: existing Tier C/backend-backed record. Component: existing `PatientSummaryAi.jsx` plus future `PatientSummaryPanel`. Mobile: summary cards for problems, meds, labs, alerts, risks. | Module/controller/service/DTOs: existing clinical-intelligence patient summary endpoint. Future: patient-workspace controller can call it with structured patient context. Executors: none. | NLU routes "summarize patient/case" to active patient if present; otherwise to existing tool page or chat seed. | Safety: requires human review and source verification; not a chart source of truth. Explainability: inputs used and limitations. Audit: PHI access, run ID, no raw note persistence. Tests: existing service/page tests, embedded panel tests, permission tests, backend contract, responsive summary, performance for large inputs. Dependencies: patient workspace, consent, interoperability. Reuse: existing endpoint and UI. Risks: stale summaries, missing source provenance, over-reliance. |

### Documentation Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `ambient-scribe` | Tier C, existing. It currently generates review-required drafts. | Route: existing `/tools/ambient-scribe`; embed in `/patients/:patientId/documentation`. Inventory: existing Tier C/backend-backed record. Component: existing `AmbientScribe.jsx`; future recorder/transcript panel. Mobile: recording/transcript controls must be large, explicit, and pause-safe. | Module/controller/service/DTOs: existing clinical-intelligence ambient scribe endpoint. Future services: transcription adapter, note template service, review queue. Executors: none. | NLU should launch documentation drafting only after user intent and context are clear. | Safety: human clinician review required; no auto-sign, no autonomous EHR write-back. Explainability: transcript sections mapped to draft sections. Audit: PHI, transcript length, note type, blocked actions. Tests: existing service/page tests, transcription adapter tests, route permission, responsive recorder, performance for long transcripts. Dependencies: patient workspace, consent, privacy center. Reuse: existing safety warnings and blocked actions. Risks: recording consent, inaccurate note draft, hidden write-back. |
| `soap-builder` | Tier A, planned. It is a structured documentation workspace, not a separate ambient scribe clone. | Route: `/tools/soap-builder`; embed under `/patients/:patientId/documentation/soap`. Inventory: registry ID `soap-builder`, launch type `clinical-page` first, `backend-backed` when API ships. Component: `SoapBuilder.jsx` with Subjective, Objective, Assessment, Plan panes and source references. Mobile: stacked SOAP sections with section status and review checklist. | Module: `documentation`. Controller: `POST /api/documentation/soap/draft`, `POST /api/documentation/soap/validate`. Services: SOAP template, source mapping, validation. DTOs: SOAP draft request/response, section validation. Executors: none. | NLU should map "make SOAP note" to SOAP builder, prefilled only with user-approved context. | Safety: review required, no auto-sign or chart write. Explainability: source-to-section mapping. Audit: draft generation and edits. Tests: template unit tests, page tests, API contract, route tests, responsive section editor, performance for long notes. Dependencies: ambient scribe, patient workspace. Reuse: existing documentation safety model. Risks: duplicate documentation stack, hidden EHR write-back. |
| `clinical-dictation` | Tier B, planned. Dictation is a guided capture mode that feeds documentation workflows. | Route: `/tools/clinical-dictation`; Assistant quick action from patient workspace. Inventory: `clinical-dictation`, launch type `chat-assisted` until recording/transcription backend exists. Component: dictation capture panel, transcript review, send-to-note actions. Mobile: push-to-talk, clear recording state, offline/permission fallback. | Module: `documentation/dictation`. Controller: `POST /api/documentation/dictation/transcribe` when transcription is available. Services: speech-to-text adapter, transcript sanitizer. DTOs: transcript request, transcript segment, confidence. Executors: none. | NLU can start a dictation workflow but must not record without explicit user action and consent. | Safety: recording consent, PHI handling, user review before use. Explainability: transcript confidence and uncertain words. Audit: recording start/stop metadata, not raw audio unless configured. Tests: permission state tests, transcript unit tests, backend contract, responsive recorder, performance/audio upload limits. Dependencies: privacy center, consent manager, ambient scribe, SOAP builder. Reuse: ToolPageLayout safety copy. Risks: browser permissions, PHI audio storage, silent recording concerns. |
| `referral-ai` | Tier C, planned. Referral drafts require evidence, patient summary, and review. | Route: `/tools/referral-ai`; embed in `/patients/:patientId/documentation/referral`. Inventory: `referral-ai`, launch type `backend-backed` when API exists. Component: `ReferralAi.jsx` with specialty, reason, supporting evidence, draft, checklist. Mobile: stepper form and review screen. | Module: `documentation/referral`. Controller: `POST /api/documentation/referral/draft`. Services: referral template, specialty requirements, source summarization. DTOs: referral draft request/response, recipient specialty, attachments/provenance. Executors: none. | NLU maps "draft referral" to referral workflow and asks for specialty/urgency if missing. | Safety: human review, no sending without approval, no autonomous scheduling. Explainability: why referral criteria were included. Audit: PHI access, draft generation, send/export events. Tests: template unit tests, integration with patient summary, route tests, backend contract, responsive draft review, performance. Dependencies: patient summary, guideline RAG, consent/privacy. Reuse: documentation safety and audit patterns. Risks: inaccurate referral rationale, missing attachments, hidden outbound communication. |

### Evidence And Knowledge Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `guideline-knowledge-graph` | Tier C, planned. It should power RAG and why, not compete with guideline RAG UI. | Route: no standalone clinician route at first; developer/admin visibility under `/settings/trust/guidelines` if needed. Inventory: internal/platform record. Component: source graph viewer only for trust/admin. Mobile: source list rather than graph canvas. | Module: `knowledge-graph`. Controller: `GET /api/knowledge/guidelines/graph`, ingestion/admin routes guarded. Services: guideline parser, entity linker, versioning. DTOs: node, edge, source, freshness. Executors: none. | NLU should not launch graph internals directly; questions go to guideline RAG. | Safety: cite source documents, freshness warnings, no recommendations from graph alone. Audit: source access and ingestion changes. Tests: graph build unit tests, ingestion integration, RAG retrieval tests, backend contract, admin UI route tests, performance for graph queries. Dependencies: RAG corpus, guideline RAG, why engine. Reuse: existing RAG service. Risks: stale graph, graph UI becoming duplicate guideline product. |
| `literature-ai` | Tier C, planned. Literature search and synthesis should be citation-bound. | Route: `/tools/literature-ai`. Inventory: launch type `backend-backed`, surface `tool-page`. Component: `LiteratureAi.jsx` with query, filters, citations, evidence grade. Mobile: citation cards and saved evidence drawer. | Module: `evidence/literature`. Controller: `POST /api/evidence/literature/search`, `POST /api/evidence/literature/summarize`. Services: literature provider adapters, reranking, citation extraction. DTOs: query, article, citation, synthesis. Executors: none. | NLU launches literature search for research/evidence questions, not patient-specific treatment unless patient context and permissions are explicit. | Safety: research support only; verify source quality and recency. Explainability: databases searched, filters, inclusion/exclusion. Audit: query metadata, source IDs. Tests: provider adapter unit tests, citation tests, route tests, backend contract, responsive citation UI, latency/cost tests. Dependencies: RAG, knowledge graph, privacy if patient context used. Reuse: guideline RAG citation panel. Risks: hallucinated citations, paywall/provider failures, stale literature. |
| `trial-match-ai` | Tier C, planned. Trial matching requires strict eligibility and consent boundaries. | Route: `/tools/trial-match-ai`; embed from patient workspace only when consent/permission allow. Inventory: backend-backed clinical page. Component: `TrialMatchAi.jsx` with eligibility criteria, uncertain fields, referral/export review. Mobile: eligibility checklist cards. | Module: `evidence/trials`. Controller: `POST /api/evidence/trials/match`. Services: trial registry adapter, eligibility extractor, patient criteria matcher. DTOs: trial match request, eligibility criterion, match score, uncertainty. Executors: none. | NLU asks for disease/context and consent before matching patient data. | Safety: not enrollment, not eligibility determination, human research staff review required. Explainability: inclusion/exclusion criteria and missing fields. Audit: PHI access, consent, trial IDs. Tests: criteria parser unit tests, backend contract, patient-context permission tests, route tests, responsive checklist, provider latency tests. Dependencies: patient workspace, FHIR, consent manager, privacy center. Reuse: patient summary and evidence panels. Risks: privacy, false eligibility, regulatory scope creep. |

### Operational Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `hospital-command` | Tier A, planned. It should extend `/operations`, not create another top-level nav. | Route: `/operations/hospital-command`. Inventory: workspace/platform entry. Component: `HospitalCommand.jsx` with capacity, alerts, staffing, fleet, bottlenecks. Mobile: priority cards and drill-down sheets. | Module: `operations-intelligence`. Controller: `GET /api/operations/command`, `POST /api/operations/command/analyze`. Services: command snapshot, alert aggregation, prediction adapters. DTOs: command snapshot, signal, recommendation. Executors: none. | NLU opens Operations command for operational questions; chat answers must distinguish operational guidance from action. | Safety: no autonomous dispatch, staffing, bed assignment, or patient movement. Human operations leader review required. Explainability: signal sources and timestamps. Audit: operations decision support access. Tests: dashboard route tests, backend contract, widget unit tests, responsive operations layout, performance for polling. Dependencies: predictive capacity, staff optimizer, fleet telemetry, alerts. Reuse: existing `Operations.jsx` and fleet pages. Risks: operational automation ambiguity, stale data, duplicate dashboards. |
| `predictive-capacity` | Tier C, planned. Service-heavy forecasting with dashboard widgets. | Route: `/operations/predictive-capacity` for full view; summary in hospital command. Inventory: backend-backed platform entry. Component: `PredictiveCapacity.jsx` with census forecast, confidence, drivers. Mobile: forecast cards and scenario drawer. | Module: `operations-intelligence/capacity`. Controller: `POST /api/operations/capacity/predict`. Services: forecasting model adapter, scenario service. DTOs: demand inputs, forecast, confidence, drivers. Executors: none. | NLU can answer capacity questions using latest snapshot; launch to route for details. | Safety: planning support only; no bed assignment or triage decision. Explainability: model inputs, confidence, stale-data warnings. Audit: operational query and data sources. Tests: model adapter unit tests, backend contract, scenario integration, route/responsive tests, performance forecast budget. Dependencies: interoperability feeds, hospital command. Reuse: analytics and operations UI. Risks: bad forecasts, hidden stale data, over-automation. |
| `staff-optimizer` | Tier C, planned. Operational planning with labor and safety constraints. | Route: `/operations/staff-optimizer`. Inventory: backend-backed platform entry. Component: staffing scenario editor, constraints, review queue. Mobile: read/review mode and simple scenario controls. | Module: `operations-intelligence/staffing`. Controller: `POST /api/operations/staffing/optimize`. Services: constraint engine, scheduling adapter. DTOs: staff roster, demand forecast, constraints, recommendation. Executors: none. | NLU can generate staffing scenarios but must route to review UI before action. | Safety: no autonomous scheduling; preserve human manager approval and labor policy constraints. Explainability: constraints and tradeoffs. Audit: scenario generation and approvals. Tests: constraint unit tests, backend contract, permission tests, responsive scenario UI, performance for large rosters. Dependencies: predictive capacity, hospital command, governance. Reuse: workflow review patterns. Risks: labor compliance, biased recommendations, accidental scheduling action. |
| `fleet-telemetry-ai` | Tier C, partial. Current fleet pages are frontend/mock/local; AI telemetry is planned. | Route: reuse `/fleet/command` and add analysis panel; do not create duplicate command route. Inventory: extend existing `fleet-command`, `route-optimizer`, and `predictive-maintenance` records; optional `fleet-telemetry-ai` internal record. Component: `FleetTelemetryInsightsPanel`. Mobile: alert cards and vehicle drill-down. | Module: `operations-intelligence/fleet`. Controller: `GET /api/operations/fleet/snapshot`, `POST /api/operations/fleet/analyze`. Services: telemetry ingestion, anomaly detection, maintenance prediction. DTOs: vehicle telemetry, anomaly, recommendation. Executors: no clinical tool executor. | NLU maps fleet questions to Operations/Fleet and never to clinical calculators. | Safety: decision support only; no vehicle control, dispatch, route push, or maintenance scheduling. Explainability: telemetry sources, rule/model drivers. Audit: operational access and recommendations. Tests: telemetry service unit tests, frontend empty/error tests, backend contract, route tests, responsive fleet tests, polling/performance tests. Dependencies: device hub, route optimizer, predictive maintenance. Reuse: existing fleet pages and local services as adapters. Risks: mock data mistaken for live, duplicate fleet APIs, stale telemetry. |

### Interoperability Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `fhir-connector` | Tier C, planned. Current code shows only FHIR/HL7/DICOM feature metadata, not a connector. | Route: `/settings/integrations/fhir`. Inventory: integration/platform record, not a clinician tool. Component: `FhirConnectorSettings.jsx` with connection status, scopes, sync logs. Mobile: read/status and simple connect/disconnect flows. | Module: `interoperability/fhir`. Controller: `GET/POST /api/interoperability/fhir/connections`, `POST /api/interoperability/fhir/sync`. Services: SMART/FHIR auth, resource sync, mapping. DTOs: connection, sync request, resource summary. Executors: none. | NLU should explain integration status but not expose PHI unless permissioned. | Safety: minimum necessary scopes, tenant isolation, source provenance. Audit: connection changes, sync events, PHI reads. Tests: connector unit tests, mocked FHIR integration, backend contract, settings route tests, responsive settings, sync performance. Dependencies: patient workspace, consent, privacy center. Reuse: backend capability inventory and audit. Risks: PHI leakage, version mismatch, duplicate patient models. |
| `hl7-bridge` | Tier C, planned. This is backend integration infrastructure. | Route: `/settings/integrations/hl7`. Inventory: integration/platform record. Component: HL7 feed status, mapping errors, message queue health. Mobile: status/error review only. | Module: `interoperability/hl7`. Controller: admin/status APIs only; ingestion may be worker-based. Services: HL7 parser, mapper, queue, dedupe. DTOs: message status, mapping error, ack. Executors: none. | NLU can summarize feed health for admins, not launch clinical actions. | Safety: message provenance, PHI access controls, replay safeguards. Audit: feed config changes, message processing summaries. Tests: parser unit tests, mapping integration, backend contract/status tests, error UI tests, throughput performance. Dependencies: patient workspace, clinical events, audit. Reuse: backend modules and audit. Risks: duplicate ingestion path, silent message failures, malformed data. |
| `device-hub` | Tier C, planned. Device telemetry should feed operations and patient workspace through one hub. | Route: `/settings/integrations/devices`; operational views in `/operations` and `/fleet/command`. Inventory: integration/platform record. Component: device inventory, status, alerts, data routing. Mobile: status and alert review. | Module: `interoperability/devices`. Controller: `GET /api/interoperability/devices`, `POST /api/interoperability/devices/:id/config`. Services: device registry, telemetry ingestion, routing. DTOs: device, telemetry packet, route status. Executors: none. | NLU can answer device status questions for permitted users; should not control devices. | Safety: no device command/control unless separately regulated and approved. Explainability: source timestamps and units. Audit: telemetry access/config. Tests: telemetry ingestion unit tests, backend contract, route tests, responsive status UI, streaming/performance tests. Dependencies: fleet telemetry, clinical events, patient workspace. Reuse: operations/fleet UI. Risks: unsafe device control, stale vitals, unit normalization errors. |

### Education Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `clinical-tutor` | Tier B, planned. It should live primarily in Assistant and Tools, not top-level navigation. | Route: `/tools/clinical-tutor`; Assistant mode `/assistant?mode=tutor`. Inventory: chat-assisted clinical education record. Component: tutor panel with objectives, questions, feedback, citations. Mobile: chat-first lesson cards. | Module: `education`. Controller: `POST /api/education/tutor/session`, `POST /api/education/tutor/feedback`. Services: teaching plan, quiz generation, feedback. DTOs: tutor session, objective, answer feedback. Executors: none. | NLU routes teaching/explain requests to tutor mode and separates education from patient-care advice. | Safety: education only; not patient-specific advice unless clearly in clinician decision support mode. Explainability: sources and rationale. Audit: lower PHI by default; audit if patient context is attached. Tests: tutor prompt unit tests, route tests, backend contract, responsive lesson cards, safety mode tests, performance/cost. Dependencies: guideline RAG, why engine. Reuse: Assistant and citation panels. Risks: mixing education with care decisions, unsupported teaching claims. |
| `simulation-ai` | Tier A, planned. Simulation is a full UI with cases, branching, and debrief. | Route: `/tools/simulation-ai`. Inventory: clinical education tool, launch type `clinical-page` initially, backend-backed later. Component: `SimulationAi.jsx` with case setup, scenario state, decisions, debrief. Mobile: scenario stepper; complex authoring desktop-preferred. | Module: `education/simulation`. Controller: `POST /api/education/simulations`, `POST /api/education/simulations/:id/step`. Services: case engine, scoring, debrief generation. DTOs: scenario, decision, outcome, debrief. Executors: none. | NLU can start a simulation from a learning goal, not from a real patient unless deidentified and consented. | Safety: simulated cases clearly labeled; no real patient orders or documentation. Explainability: debrief with guidelines and rationale. Audit: education activity; PHI blocked by default. Tests: scenario engine unit tests, route tests, backend contract, responsive scenario UI, performance for long sessions. Dependencies: clinical tutor, guideline RAG. Reuse: workflow builder patterns. Risks: confusing simulation with live care, generated unsafe scenarios. |

### Governance And Safety Layer

| Capability | Tier and Status | Frontend Requirements | Backend Requirements | NLU and Launch Behavior | Safety, Testing, Dependencies, Reuse, Risks |
|---|---|---|---|---|---|
| `ai-governance` | Tier A, planned. This is an admin/trust workspace. | Route: `/settings/ai-governance`. Inventory: settings/platform entry, not a clinician tool. Component: policy registry, model/tool approvals, risk tiers, monitoring. Mobile: review/approve/status flows, not dense config tables. | Module: `governance`. Controller: `GET/POST /api/governance/ai-policies`, `GET /api/governance/capabilities`. Services: policy engine, approval workflow, model registry. DTOs: policy, control, approval, capability risk. Executors: none. | NLU can answer governance status for admins, but changes require UI confirmation. | Safety: institutional approval gates, risk tiering, blocked actions. Explainability: policy decisions and violations. Audit: all governance changes. Tests: policy unit tests, permission tests, backend contract, settings route tests, responsive admin UI, performance for policy evaluation. Dependencies: all AI capabilities, audit trail, privacy. Reuse: backend capability flags and audit. Risks: governance bypass, duplicate policy config, hidden model changes. |
| `audit-trail-ai` | Tier C, partial. Existing audit logs and clinical audit/explainability endpoints are foundations. | Route: reuse `/tools/clinical-audit` and `/audit-logs`; avoid a third duplicate audit page. Inventory: alias/feature metadata can map `audit-trail-ai` to `clinical-audit` or Settings trust area. Component: audit trail insight panel and sanitized log viewer. Mobile: filter chips and event cards. | Module: extend `audit` and `clinical-intelligence` audit endpoints. Controller: existing `/api/audit/*` plus `GET /api/clinical-intelligence/clinical-audit/execution-logs`. DTOs: sanitized audit event, AI trail summary. Executors: none. | NLU alias should launch clinical audit for "AI audit trail" only for permitted users. | Safety: no raw PHI leakage; role-based audit access. Explainability: tool chain and run IDs. Audit: meta-audit for audit access. Tests: audit sanitization tests, permission tests, route launch tests, backend contract, responsive audit cards, query performance. Dependencies: audit service, explainability, governance. Reuse: existing clinical audit and audit logs. Risks: duplicate audit surfaces, PHI in logs, expensive queries. |
| `privacy-center` | Tier A, partial through legal/privacy/compliance surfaces. | Route: `/settings/privacy` or existing Settings privacy section; keep legal pages separate. Inventory: settings/platform entry. Component: privacy dashboard, export/delete, PHI access, integrations, sharing state. Mobile: task cards and confirmation flows. | Module: extend `compliance`, `audit`, and user settings. Controller: `GET /api/privacy/summary`, reuse compliance export/delete endpoints where real. Services: privacy summary, PHI access report. DTOs: privacy summary, export status, data category. Executors: none. | NLU can explain privacy settings and route users, but destructive actions require UI confirmation. | Safety: explicit confirmations, no hidden data export/delete. Audit: privacy actions and PHI access. Tests: settings route tests, capability-gated API tests, backend contract, responsive privacy cards, performance for audit summaries. Dependencies: compliance, audit, consent, integrations. Reuse: existing legal/compliance APIs. Risks: duplicate privacy pages, unsupported export buttons, unclear local share semantics. |
| `consent-manager` | Tier A, partial. Consent routes and compliance consent APIs already exist. | Route: existing `/consent` and `/consent-history`; settings entry under `/settings`. Inventory: settings/platform entry. Component: consent preferences, history, per-integration consent, patient trial consent. Mobile: clear consent cards and revision history. | Module: existing `compliance`, future `consent`. Controller: existing `GET/POST /api/compliance/consent`; add history endpoint only when implemented. Services: consent policy, versioning, integration consent. DTOs: consent preference, version, scope. Executors: none. | NLU can route to consent settings but must not toggle consent without explicit UI action. | Safety: informed consent, reversible where legally allowed, source/version tracking. Audit: consent changes. Tests: compliance API tests, route tests, settings integration tests, responsive consent flows, backend contract. Dependencies: privacy center, trial matching, dictation, interoperability. Reuse: existing compliance consent. Risks: missing history API, hidden consent effects, regulatory ambiguity. |
| `ai-explainability` | Tier C, existing. It should be the canonical explainability surface and substrate for `why-engine`. | Route: existing `/tools/ai-explainability`. Inventory: existing Tier C/backend-backed record. Component: existing `AiExplainability.jsx`, future reusable panels. Mobile: trace cards with source/reasoning/tool-chain tabs. | Module/controller/service/DTOs: existing clinical-intelligence explainability endpoint. Future: shared explainability service used by all AI endpoints. Executors: none. | NLU aliases should resolve "why" and "explain this" to `ai-explainability` with target run context when possible. | Safety: explain limitations, confidence, and missing data; no invented trace. Audit: trace access and clinical question presence without raw text. Tests: existing service/page tests, no-run empty state, launch alias tests, backend contract, responsive trace UI, performance for log queries. Dependencies: audit, run IDs, governance. Reuse: existing endpoint. Risks: duplicate why engine, PHI in traces, slow audit queries. |

## 6. Frontend Architecture Expansion Map

### Route Strategy

The current route tree should be extended with workspace routes rather than new top-level product areas:

- Clinical tools and AI tools: `/tools/<capability>`
- Patient context: `/patients` and planned `/patients/:patientId/*`
- Operations: `/operations/*` and existing `/fleet/*`
- Integrations and governance: `/settings/*`
- Assistant-first workflows: `/assistant?capability=...`, `/assistant?workflow=...`, or `/assistant?mode=...`

Avoid new top-level routes such as `/clinical-intelligence`, `/ai`, `/evidence`, `/education`, or `/governance` unless the visible IA is intentionally revised. The current primary navigation already supports the operating system model.

### Inventory And Launch Expansion

Every new user-facing capability should add or update:

- `REGISTRY.*` and, if needed, `NLU.*` in `src/data/clinicalToolIdContract.js`.
- Tier grouping in the same contract file.
- `toolRegistry.js` metadata only as a compatibility/source projection.
- `clinicalIntentToolCatalog.js` if Assistant/NLU discovery is needed.
- `toolInventory.js` metadata: route, component, launch type, surface, endpoint, DTOs, executor status, safety notes, tests.
- `TOOL_LAUNCH_PATHS` only for shared canonical paths, not one-off pages.
- `clinicalCatalogWiring.js` only when launch behavior differs from normal inventory resolution.
- `registryToolLaunch.js` tests when navigation mode changes.

The default frontend rule should be: if a capability is discoverable, it must have a route, chat seed, explicit unsupported state, or settings/workspace location. There should be no hidden discoverable ID.

### Component Structure

Recommended new component boundaries:

- `src/pages/tools/<Capability>.jsx` for full clinical tool pages.
- `src/pages/patients/PatientWorkspace.jsx` and subpanels for patient capabilities.
- `src/pages/operations/<Capability>.jsx` for operations intelligence pages.
- `src/pages/settings/integrations/*` for FHIR, HL7, and device configuration.
- `src/components/clinical/*` for reusable reasoning, evidence, explainability, safety, and source-provenance panels.
- `src/components/workflows/*` for workflow builder, calculator chains, and review queues.
- `src/services/<domain>Api.js` for typed frontend API wrappers that use `apiFetch`, capability gates, and safe error objects.

### Mobile Behavior

All new pages should follow the existing compact shell expectations:

- One primary task per screen on phone widths.
- No dense multi-column tables as the only usable UI.
- Results, citations, audit traces, and reasoning should collapse into cards or sheets.
- Destructive or regulated actions should require full-width confirmation review.
- Any live/polling view must show loading, empty, stale, error, and retry states.
- Touch targets should preserve the existing 44px standard used by responsive tests.

## 7. Backend Architecture Expansion Map

### Recommended Module Boundaries

Future backend modules should be explicit and domain-owned:

- `clinical-intelligence`: reasoning, differential, guideline, explainability, order-set, calculator recommendation, patient summary services.
- `patient-workspace`: patient context snapshots, timeline aggregation, clinical events, source provenance.
- `documentation`: ambient scribe extensions, SOAP builder, dictation, referral drafts, review queues.
- `evidence`: literature, trials, guideline graph facade.
- `knowledge-graph`: guideline/entity graph ingestion and query.
- `operations-intelligence`: hospital command, capacity prediction, staffing, fleet telemetry analysis.
- `interoperability`: FHIR, HL7, device hub, mapping, sync, and ingestion.
- `education`: tutor and simulation.
- `governance`: AI policy, model/capability approvals, risk tiering.
- Existing `audit`, `compliance`, `rag`, `ai`, `metrics`, and `auth` modules remain shared infrastructure.

### Controller And API Strategy

Use route families that match platform domains:

- `/api/clinical-intelligence/*`
- `/api/patients/:id/*`
- `/api/documentation/*`
- `/api/evidence/*`
- `/api/operations/*`
- `/api/interoperability/*`
- `/api/education/*`
- `/api/governance/*`

Do not overload `POST /api/tools/:id/execute` for platform workflows. That endpoint should remain for registered `ClinicalToolService` executors with deterministic schemas and registry tests.

### Service And Executor Strategy

The tool orchestrator should continue to register only real executor services. Future deterministic calculators or server-side tools can become executors only when they provide:

- `ClinicalToolService` implementation.
- Registry entry in `REGISTERED_EXECUTOR_TOOL_IDS`.
- Request/response contract in `EXECUTOR_REQUEST_CONTRACTS`.
- Frontend mapping in `REGISTRY_ID_TO_ORCHESTRATOR_TOOL`.
- Contract tests and structured unsupported behavior for non-executors.

AI workflows should normally live under domain modules instead of becoming tool-orchestrator executors. This avoids a fake "everything is a tool executor" architecture.

### DTO Strategy

All new backend DTOs should include:

- `runId` for generated outputs.
- `capabilityId` matching the canonical inventory ID.
- `contractVersion`.
- `status`.
- `safety`.
- `explainability`.
- `audit` summary where relevant.
- Source/provenance references when using patient or evidence data.

Requests that may contain PHI should avoid raw-text persistence in audit metadata.

## 8. Frontend ↔ Backend Contract Strategy

The current contract inventories should become mandatory for all expansion work:

- Add backend routes to `src/data/backendHttpRouteInventory.js` when controllers ship.
- Add frontend calls to `src/data/frontendApiCallsInventory.js` when clients call backend routes.
- Add capability flags to `src/config/backendApiCapabilities.js` for routes that can be disabled, deferred, or absent.
- Add route exposure policy entries when backend routes should remain internal, admin-only, or deferred.
- Add test coverage to backend/frontend exposure tests before exposing the UI.

Contract states should be explicit:

- `local-only`: deterministic frontend computation, no backend call.
- `chat-assisted`: Assistant-guided flow, no direct executor.
- `backend-backed`: real HTTP API exists and is contract-tested.
- `platform`: internal or workspace infrastructure, not necessarily a tool card.
- `unsupported-planned`: visible only where the product intentionally shows roadmap/planned status.

The UI should never infer backend support from an NLU ID. It should rely on inventory and backend capability flags.

## 9. Tool Inventory Expansion Strategy

### Required Inventory Fields

For every capability, define:

- Canonical registry ID.
- Optional NLU ID and aliases.
- Layer and product category.
- Tier A/B/C.
- Status: existing, partial, planned, deprecated, internal.
- Route or workspace location.
- Component path.
- Launch type.
- Surface.
- Backend endpoint, method, and capability flag if applicable.
- DTO names.
- Executor status.
- Safety profile.
- Permission profile.
- Mobile/responsive test profile.
- Contract test profile.

### Inventory Governance Rules

- No user-facing route without an inventory record.
- No inventory record with a route unless `App.jsx` or generated route definitions mount it.
- No chat-assisted tool without a guarded chat seed.
- No backend-backed tool without a matching backend route inventory entry.
- No executor badge without registration in the backend orchestrator registry.
- No planned capability in clinician-facing tools unless it is clearly labeled as unavailable or roadmap.
- No duplicate route for an existing capability if an alias can resolve to the canonical route.

### Migration Of Existing Partial Capabilities

- Keep `calculator-recommender-ai`, `differential-ai`, `guideline-rag`, `timeline-ai`, `patient-summary-ai`, `ambient-scribe`, `order-set-ai`, `ai-explainability`, and `clinical-audit` as canonical clinical intelligence capabilities.
- Map `why-engine` to `ai-explainability` first, not a separate page.
- Map `audit-trail-ai` to `clinical-audit` and `/audit-logs` first, not a separate audit product.
- Extend current fleet pages for `fleet-telemetry-ai` before adding new fleet routes.
- Extend `/patients` into patient workspace instead of adding a competing patient AI area.

## 10. UX and Workflow Strategy

CareDroid should feel like one operating system with multiple workspaces:

- Home: "What needs attention?"
- Assistant: "Help me reason, choose tools, verify evidence, and prepare reviewed outputs."
- Tools: "Open a clinical workflow, calculator, reference, or AI capability."
- Patients: "Understand and act on a patient or case context."
- Operations: "Understand operational state and risks."
- Settings: "Configure privacy, integrations, governance, and trust."

The UX should move from feature dumping to workflow composition:

- Differential AI suggests calculators and guideline evidence.
- Calculator chains explain why each calculator was selected.
- Guideline RAG provides citation-bound evidence to reasoning and documentation.
- Patient summary, timeline, and event AI feed documentation and referral workflows.
- Why/explainability is available beside every AI output.
- Governance and audit are visible as trust controls, not hidden developer tools.

Every AI output should have an obvious next step:

- Review sources.
- Ask why.
- Open relevant calculator.
- Send summary to Assistant.
- Draft documentation for review.
- Save/export only when backend and consent support exist.

## 11. Safety and Governance Strategy

### Decision Support Boundaries

CareDroid should consistently state and enforce:

- It does not diagnose.
- It does not rule in or rule out conditions.
- It does not place orders.
- It does not auto-sign notes.
- It does not write back to an EHR unless a separately approved integration explicitly supports reviewed write-back.
- It does not dispatch vehicles, schedule staff, assign beds, or control devices autonomously.

### Human Review Requirements

Human review is required for:

- Differential diagnosis outputs.
- Guideline or literature synthesis before clinical application.
- Calculator interpretation before treatment/disposition decisions.
- Ambient scribe, SOAP, dictation, and referral drafts.
- Trial matching and eligibility review.
- Capacity, staffing, fleet, and operations recommendations.
- Governance policy changes.
- Consent and privacy changes.

### Explainability Requirements

Every AI-backed capability should return:

- Inputs used.
- Sources or data provenance.
- Reasoning summary.
- Confidence or uncertainty.
- Missing-data warnings.
- Limitations.
- Related tool/calculator/evidence links.
- Run ID and contract version.

### Audit Requirements

Audit metadata should capture:

- User ID and role.
- Capability ID.
- Run ID.
- Contract version.
- PHI access flag.
- Source system categories.
- Status and blocked actions.
- Human review state when applicable.
- No unnecessary raw clinical narrative in audit metadata.

## 12. Testing and Quality Strategy

### Required Test Layers

Each capability should add or extend:

- Unit tests for deterministic logic, DTO validation, adapters, parsers, policy checks, and safety formatting.
- Frontend component tests for loading, empty, error, success, review, and unsupported states.
- Route tests for every visible route and alias.
- Launch tests for `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`.
- Inventory contract tests for tier, route, launch type, endpoint, component, DTO, and executor status.
- Backend contract tests for controllers, DTOs, permissions, and response shape.
- Integration tests for domain flows such as patient summary to SOAP or differential to guideline evidence.
- Responsive tests for desktop, tablet, Android-sized, drawer, bottom nav, and sheet states.
- Performance tests for long notes, long timelines, large citations, polling dashboards, and graph/literature queries.
- Security and permission tests for PHI, audit, consent, governance, and integration settings.

### Existing Test Families To Reuse

Reuse and expand the existing suites around:

- `clinicalToolRoutes.*`
- `toolInventory.test.js`
- `clinicalToolIdContract.test.js`
- `backendFrontendToolContract.test.js`
- `backendFrontendExposure.test.js`
- `ClinicalToolCatalog.launch*.test.*`
- `registryToolLaunch.test.js`
- `Calculators.*.test.*`
- `ToolPages.responsive.test.js`
- `Sidebar.responsive.test.js`
- `AppShell.layout.test.js`
- `fleet/*.test.*`
- Backend orchestrator registry and API tests.
- Backend clinical intelligence service tests.

### Quality Gates

A capability should not be considered production-ready until:

- Inventory, route, frontend API, backend route, permission, and capability flags are aligned.
- Empty/error/unsupported states are tested.
- Mobile behavior is tested.
- Audit and safety blocks are tested.
- Backend responses include run IDs and contract versions where generated.
- Performance budgets are defined and measured.
- Documentation distinguishes existing, partial, and planned behavior.

## 13. Risk Analysis

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicate systems | Multiple catalogs, launch paths, audit pages, explainability pages, or patient contexts confuse users and tests. | Use canonical inventory, launch resolver, and existing routes. Prefer aliases to new surfaces. |
| Hidden functionality | A route, API, or component ships without visible inventory or tests. | Enforce inventory/route/API contract tests and `ToolNotFound` fallbacks. |
| Nested launch paths | Tools launch to hubs that launch to chat that launch back to tools. | Define one canonical launch mode per capability and test `getRegistryToolNavigation()`. |
| Null or blank UI | Missing patient data, unavailable backend, invalid slug, or permission mismatch renders nothing useful. | Require loading, empty, error, unsupported, permission-denied, and stale states. |
| Frontend/backend imbalance | UI claims backend or AI support before routes, DTOs, permissions, or services exist. | Use `backendApiCapabilities.js` and explicit planned labels. |
| Executor confusion | NLU tools are mistaken for POST executors. | Keep executor registry authoritative and label chat-assisted/local/backend-backed modes clearly. |
| Unsafe AI autonomy | Users infer diagnosis, orders, scheduling, dispatch, or chart writes. | Hard safety copy, blocked actions, human review queues, governance policy checks. |
| PHI leakage | Logs, traces, prompts, recordings, or integration errors expose sensitive data. | Audit summaries only, minimum necessary fields, permission tests, privacy center controls. |
| Stale evidence or telemetry | Guidelines, literature, patient data, or operations data are outdated. | Source timestamps, freshness warnings, provenance, sync status. |
| Performance degradation | Long notes, timelines, graph queries, or dashboards become slow on mobile. | Performance budgets, pagination, virtualization, streaming where appropriate. |
| Regulatory scope creep | Documentation, trial matching, device hub, or operations recommendations imply regulated automation. | Keep reviewed decision support boundaries and governance approvals explicit. |

## 14. Phase-by-Phase Roadmap

### Phase 0: Stabilize And Formalize Expansion Contracts

Goals:

- Refresh generated contract docs when package tooling is available.
- Add route-level permission/preflight alignment for clinical intelligence pages.
- Formalize inventory fields for tier, layer, status, permission, safety, mobile profile, and contract profile.
- Confirm all existing routes produce page, redirect, chat launch, unsupported, or `ToolNotFound` outcomes.
- Clarify fleet mock/local status and executor status in user-facing labels.

Primary capabilities:

- Existing inventory/launch system.
- Existing clinical intelligence pages.
- Existing calculator hub and fleet local pages.
- Governance schema foundation.

### Phase 1: Unified Clinical Intelligence Foundation

Goals:

- Build `clinical-reasoning-engine` as shared backend/service infrastructure.
- Promote `calculator-recommender-ai` into Assistant and calculator workflows.
- Add `workflow-calculator-chain` as chat-assisted workflow.
- Define `workflow-builder-ai` as a governed authoring surface before executable workflows are enabled.
- Extend `ai-explainability` into the canonical `why-engine`.
- Keep `differential-ai` and `guideline-rag` as the first integrated reasoning/evidence pair.

Primary capabilities:

- `clinical-reasoning-engine`
- `workflow-calculator-chain`
- `workflow-builder-ai`
- `calculator-recommender-ai`
- `differential-ai`
- `guideline-rag`
- `why-engine`
- `ai-explainability`

### Phase 2: Patient Workspace And Documentation Workflows

Goals:

- Turn `/patients` from launch shell into a real patient workspace.
- Embed patient summary, timeline, event detection, and documentation panels.
- Extend ambient scribe into reviewed documentation flows.
- Add SOAP builder, clinical dictation, and referral drafting with explicit review queues.

Primary capabilities:

- `patient-workspace`
- `timeline-live`
- `clinical-event-ai`
- `patient-summary-ai`
- `ambient-scribe`
- `soap-builder`
- `clinical-dictation`
- `referral-ai`

### Phase 3: Evidence, Knowledge, Interoperability, And Governance

Goals:

- Build citation-bound literature and trial matching.
- Add guideline knowledge graph as RAG infrastructure.
- Add FHIR, HL7, and device integration foundations.
- Build privacy center, consent manager, AI governance, and audit trail AI around real policy and audit data.

Primary capabilities:

- `guideline-knowledge-graph`
- `literature-ai`
- `trial-match-ai`
- `fhir-connector`
- `hl7-bridge`
- `device-hub`
- `ai-governance`
- `audit-trail-ai`
- `privacy-center`
- `consent-manager`

### Phase 4: Operations Intelligence And Education

Goals:

- Expand `/operations` into hospital command.
- Add predictive capacity, staff optimization, and backend fleet telemetry AI.
- Add clinical tutor and simulation AI as education workspaces using guideline evidence and explainability.

Primary capabilities:

- `hospital-command`
- `predictive-capacity`
- `staff-optimizer`
- `fleet-telemetry-ai`
- `clinical-tutor`
- `simulation-ai`

### Phase 5: Production Integration Hardening

Goals:

- Harden EHR/device integrations with tenant isolation, retry, monitoring, and audit.
- Add observability for AI latency, cost, error rates, retrieval quality, and route drift.
- Validate PHI, consent, audit, and governance controls with role-based test fixtures.
- Add load/performance tests for patient timelines, evidence retrieval, operations dashboards, and telemetry ingestion.
- Define release gates per capability and per institution.

## 15. Estimated Complexity

| Capability Group | Relative Complexity | Why |
|---|---|---|
| Existing clinical intelligence hardening | Medium | Routes, clients, DTOs, and services already exist, but permission UX, embedded workflows, and cross-tool explainability need work. |
| Calculator recommender and calculator chain | Medium | Inventory and calculators exist; risk is duplicate calculator logic and chain safety. |
| Workflow builder AI | High | Workflow authoring needs versioning, validation, governance approval, review UI, and strict prevention of unsafe autonomous execution. |
| Clinical reasoning engine and why engine | High | Shared reasoning affects many workflows and must handle evidence, uncertainty, audit, and safety. |
| Patient workspace and live timeline | High | Requires patient data model, permissions, provenance, PHI audit, empty states, and integration readiness. |
| Documentation layer | High | Dictation, scribe, SOAP, and referral workflows touch PHI, consent, review, and potential EHR write-back boundaries. |
| Evidence graph, literature, and trial matching | High | Source quality, citation integrity, external providers, and trial eligibility make this sensitive. |
| Interoperability | Very high | FHIR/HL7/device work requires security, mapping, tenant isolation, sync, error recovery, and operational monitoring. |
| Operations intelligence | High | Forecasting and optimization require live data, stale-state handling, human approval, and clear non-automation boundaries. |
| Education | Medium | Less PHI by default, but still needs source grounding and separation from live care. |
| Governance and privacy | High | Cross-cutting controls must be correct before high-risk capabilities scale. |

## 16. Production Readiness Considerations

Before production expansion, CareDroid should establish:

- Capability registry review for every new tool/workflow.
- Role and permission matrix for clinical, operational, admin, and integration routes.
- PHI data classification for every DTO and audit event.
- Human review queues for documentation, differential, orders, referrals, operations, and governance changes.
- Model/provider registry with approved models, versions, costs, and fallback behavior.
- Retrieval source governance: guideline freshness, literature provider status, citation validation.
- Integration observability: FHIR/HL7/device sync health, retries, dead-letter queues, mapping errors.
- Patient context provenance: every AI output should identify source categories and timestamps.
- Mobile release gate for every user-facing workflow.
- Performance budgets for AI calls, RAG retrieval, timelines, dashboards, and telemetry.
- Incident response paths for unsafe AI output, PHI leak, integration failure, or audit integrity issue.
- Clear institutional deployment controls for enabling or disabling capability layers.

## 17. Final System Vision

The target system is a unified AI-native clinical operating system:

- Assistant becomes the front door for reasoning, tool choice, evidence, documentation, education, and review.
- Tools becomes a curated workflow library grounded in the canonical inventory.
- Patients becomes the clinical context workspace where summaries, timelines, events, documentation, and evidence converge.
- Operations becomes the command workspace for alerts, fleet, capacity, staffing, and audit.
- Settings becomes the trust, privacy, integration, and governance center.

The system should feel expansive without becoming fragmented. The way to achieve that is to keep the current architectural discipline: one inventory, one launch resolver, one route contract, one backend capability inventory, one honest executor registry, one safety posture, and one test strategy that prevents hidden or unwired functionality from returning.

CareDroid should not evolve by adding dozens of isolated AI pages. It should evolve by turning each new capability into a governed, explainable, contract-tested workflow that helps clinicians and operators understand context, choose the right tool, review the evidence, and act with human accountability.
