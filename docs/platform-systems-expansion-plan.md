# Platform Systems Expansion Plan

## Purpose

CareDroid now has a broad clinical-tool and operations-tool catalog. The next platform investment should stop expanding calculators and make the existing roadmap useful in real workflows: patient context, interoperability, AI recommendations, documentation assistance, auditability, cost controls, explainability, and governance.

This plan covers five platform systems:

- Interoperability Pack
- AI Workflow Pack
- Patient Workspace Pack
- Documentation Pack
- Governance Pack

No code is implemented by this document. It defines the target product shape, canonical inventory entries, frontend routes, backend modules, API contracts, safety requirements, tests, and implementation phases.

## Tier Model

Tier A means deterministic platform foundations with explicit user actions, structured inputs, import status, and source provenance. These should ship before AI-dependent flows because they create the patient and system context.

Tier B means AI-assisted workflows. They may draft, recommend, summarize, or route, but must stay human-in-the-loop and clearly label missing data, confidence limits, citations, and source provenance.

Tier C means dashboards, control planes, governance systems, event timelines, audit systems, and integration services that orchestrate or monitor multiple capabilities. These need stronger permissions, logging, fallbacks, and operational readiness.

## Cross-System Principles

- Use registry IDs as canonical IDs. Do not introduce alternate IDs without adding aliases and drift tests.
- Add every user-facing capability to `toolInventory.js`, `toolRegistry.js`, `medicalToolsCatalogIndex.js`, and the relevant discovery/contract matrices.
- Distinguish backend-routed chat workflows from real POST executors. Only add a `POST /api/tools/:id/execute` executor when a backend `registerTool()` implementation exists.
- Require source provenance for imported EHR/FHIR/HL7 data. Every patient-context panel should show source system, timestamp, and freshness.
- Require PHI-aware permissions on patient-context, documentation, consent, audit, and governance surfaces.
- AI outputs must be drafts or decision support only. They must not diagnose, prescribe, place orders, sign notes, submit prior authorization, or alter records without human review.
- All systems need loading, empty, error, permission-denied, unsupported-backend, and demo/mock states.
- All routes must render at mobile widths and in light/dark themes.

## Pack 1: Interoperability

Goal: bring patient context into CareDroid through standards-based ingestion, source-system mapping, and safe import workflows.

### Capabilities

- `fhir-connector`: Tier C. FHIR connection manager for SMART/FHIR endpoints, resource sync status, scopes, and source provenance.
- `hl7-bridge`: Tier C. HL7 v2 bridge status for ADT, ORU, ORM, MDM, and interface message queues.
- `ehr-patient-import`: Tier A. Deterministic patient demographic and encounter import workflow.
- `lab-result-import`: Tier A. Deterministic import and normalization for labs and result trends.
- `medication-list-import`: Tier A. Deterministic medication reconciliation import with source labels.
- `observation-vitals-import`: Tier A. Deterministic Observation/vitals import with units, device/source metadata, and freshness.

### Frontend Routes

- `/integrations`
- `/integrations/fhir`
- `/integrations/hl7`
- `/patients/import`
- `/patients/:patientId/labs/import`
- `/patients/:patientId/medications/import`
- `/patients/:patientId/observations/import`

### Inventory And Catalog

Add canonical records with `launchType` values equivalent to platform/backend-backed surfaces, not calculator forms. Suggested category labels:

- `Interoperability`
- `Patient Data`
- `FHIR`
- `HL7`

Each record should include:

- `canonicalInventoryId`
- `route`
- `component`
- `endpoint`
- `apiClient`
- `permissionPolicy`
- `sourceKind: platform`
- `executorStatus: platform` for backend integration endpoints
- `testCoverage`

### Backend Modules

- `backend/src/modules/interoperability/fhir`
- `backend/src/modules/interoperability/hl7`
- `backend/src/modules/patient-import`
- `backend/src/modules/source-provenance`
- `backend/src/modules/terminology-mapping`

### API Contracts

- `GET /api/integrations/fhir/connections`
- `POST /api/integrations/fhir/connections`
- `POST /api/integrations/fhir/:connectionId/test`
- `POST /api/integrations/fhir/:connectionId/sync`
- `GET /api/integrations/hl7/interfaces`
- `POST /api/integrations/hl7/interfaces/:interfaceId/test-message`
- `POST /api/patients/import/ehr`
- `POST /api/patients/:patientId/import/labs`
- `POST /api/patients/:patientId/import/medications`
- `POST /api/patients/:patientId/import/observations`

Core DTOs:

- `FhirConnectionDto`
- `FhirSyncRequestDto`
- `FhirSyncStatusDto`
- `Hl7InterfaceDto`
- `Hl7MessagePreviewDto`
- `EhrPatientImportRequestDto`
- `PatientImportResultDto`
- `LabImportResultDto`
- `MedicationImportResultDto`
- `ObservationImportResultDto`
- `SourceProvenanceDto`

### Safety Requirements

- Do not overwrite patient records without a preview, diff, and explicit user confirmation.
- Never silently merge identifiers; require deterministic matching plus manual conflict resolution.
- Preserve original source values alongside normalized values.
- Mark stale, partial, failed, and demo data clearly.
- Log every import attempt, mapping decision, conflict, and user confirmation.

### Tests

- Unit tests for FHIR resource normalization and HL7 parsing.
- Contract tests for import DTOs and source provenance.
- Permission tests for integration routes.
- Route tests for `/integrations/*` and patient import routes.
- Inventory tests proving every import capability appears in `/tools` or a new platform catalog.
- E2E import preview tests with mock FHIR bundles and HL7 messages.

## Pack 2: AI Workflow

Goal: route the existing tool catalog into patient-aware, cited, auditable workflows that recommend what to use next without replacing clinician judgment.

### Capabilities

- `calculator-recommender-ai`: Tier B. Existing capability. Upgrade to patient-context-aware suggestions with citations and missing-data prompts.
- `workflow-builder-ai`: Tier B. Builds draft workflows from patient context, selected tools, and institutional templates.
- `clinical-reasoning-engine`: Tier B. Produces structured reasoning support, differential considerations, and uncertainty labels.
- `guideline-rag`: Tier C. Existing backend clinical-intelligence workflow. Expand as a governed guideline retrieval service with citations and source freshness.
- `why-engine`: Tier B. Explains why a tool, alert, recommendation, or workflow step was suggested.
- `audit-trail-ai`: Tier C. Summarizes AI/tool usage logs for review, not for autonomous compliance decisions.

### Frontend Routes

- `/tools/calculator-recommender`
- `/tools/workflow-builder-ai`
- `/tools/clinical-reasoning-engine`
- `/tools/guideline-rag`
- `/tools/why-engine`
- `/tools/audit-trail-ai`
- `/patients/:patientId/workflows`
- `/patients/:patientId/workflows/:workflowId`

### Inventory And Catalog

Use `Clinical AI`, `Workflow`, and `Governance` categories. All AI Workflow records should expose:

- `chatSeed` when launched into `/assistant`
- `endpoint` when backed by `clinical-intelligence`
- `permissionPolicy`
- `riskLevel: high` when PHI is used
- `executorStatus: platform`, not `registered`, unless a real orchestrator executor is added

### Backend Modules

- `backend/src/modules/clinical-intelligence/workflow-builder`
- `backend/src/modules/clinical-intelligence/reasoning-engine`
- `backend/src/modules/clinical-intelligence/guideline-rag`
- `backend/src/modules/clinical-intelligence/why-engine`
- `backend/src/modules/clinical-intelligence/audit-trail-ai`
- `backend/src/modules/tool-recommendation`

### API Contracts

- `POST /api/clinical-intelligence/calculator-recommender/suggest`
- `POST /api/clinical-intelligence/workflow-builder/generate`
- `POST /api/clinical-intelligence/reasoning/analyze`
- `POST /api/clinical-intelligence/guideline-rag/query`
- `POST /api/clinical-intelligence/why-engine/explain`
- `POST /api/clinical-intelligence/audit-trail/summarize`

Core DTOs:

- `CalculatorRecommendationRequestDto`
- `CalculatorRecommendationResponseDto`
- `WorkflowBuilderRequestDto`
- `WorkflowBuilderResponseDto`
- `ClinicalReasoningRequestDto`
- `ClinicalReasoningResponseDto`
- `GuidelineRagQueryDto`
- `GuidelineRagResponseDto`
- `WhyEngineRequestDto`
- `WhyEngineResponseDto`
- `AuditTrailSummaryRequestDto`
- `AuditTrailSummaryResponseDto`

### Safety Requirements

- Require citations or explicit "no source found" states for guideline answers.
- Separate facts, assumptions, missing data, and AI-generated interpretation.
- Never present reasoning as diagnosis, disposition, treatment order, or medication instruction.
- Require user confirmation before adding a generated workflow to a patient workspace.
- Store prompts, model, sources, inputs, outputs, user action, and final disposition in audit logs.

### Tests

- Contract tests for all clinical-intelligence DTOs.
- Prompt safety tests for prohibited phrasing.
- Citation tests for guideline RAG.
- Permission tests for PHI-dependent workflows.
- Inventory tests proving no AI Workflow tool falsely advertises POST executor support.
- Snapshot tests for empty/missing-data states.

## Pack 3: Patient Workspace

Goal: make CareDroid patient-centered instead of tool-centered by providing a single workspace where tools, notes, imports, events, risk history, and care plans connect.

### Capabilities

- `patient-workspace`: Tier C. Central patient workspace shell with demographics, active encounter, imported data, tools, notes, timeline, and care context.
- `patient-summary-ai`: Tier B/C. Existing clinical-intelligence endpoint. Upgrade as a patient-aware summary with source citations and edit tracking.
- `timeline-live`: Tier C. Live clinical timeline from imported EHR events, user actions, tool outputs, and documentation events.
- `clinical-event-ai`: Tier B. Drafts event summaries and flags missing context for human review.
- `risk-score-history`: Tier A/C. Deterministic longitudinal store and visualization of calculator outputs.
- `care-plan-view`: Tier C. Human-authored and imported care plan display with task/status tracking.

### Frontend Routes

- `/patients`
- `/patients/:patientId/workspace`
- `/patients/:patientId/summary`
- `/patients/:patientId/timeline`
- `/patients/:patientId/events`
- `/patients/:patientId/risk-history`
- `/patients/:patientId/care-plan`

### Inventory And Catalog

These should appear in a platform workspace inventory, and selected AI-backed entries may also appear in `/tools`:

- `patient-workspace`
- `patient-summary-ai`
- `timeline-live`
- `clinical-event-ai`
- `risk-score-history`
- `care-plan-view`

Add workspace launch metadata so any calculator result can be sent to a patient record only after user confirmation.

### Backend Modules

- `backend/src/modules/patient-workspace`
- `backend/src/modules/patient-timeline`
- `backend/src/modules/clinical-events`
- `backend/src/modules/risk-score-history`
- `backend/src/modules/care-plan`

### API Contracts

- `GET /api/patients/:patientId/workspace`
- `GET /api/patients/:patientId/summary`
- `POST /api/clinical-intelligence/patient-summary-ai/generate`
- `GET /api/patients/:patientId/timeline`
- `POST /api/patients/:patientId/events`
- `POST /api/clinical-intelligence/clinical-event-ai/draft`
- `GET /api/patients/:patientId/risk-scores`
- `POST /api/patients/:patientId/risk-scores`
- `GET /api/patients/:patientId/care-plan`

Core DTOs:

- `PatientWorkspaceDto`
- `PatientContextSnapshotDto`
- `PatientTimelineEventDto`
- `ClinicalEventDraftRequestDto`
- `ClinicalEventDraftResponseDto`
- `RiskScoreHistoryEntryDto`
- `CarePlanViewDto`

### Safety Requirements

- Patient context must show source, timestamp, and import state.
- AI summaries must show cited data sources and must be editable before use.
- Tool results cannot be attached to a patient without explicit user action.
- Care plan view must not generate or change orders.
- Timeline events must distinguish imported facts, user-entered notes, AI drafts, and tool outputs.

### Tests

- Route smoke tests for patient workspace routes.
- Permission tests for patient PHI access.
- Timeline ordering and provenance unit tests.
- Risk-score history persistence and deduplication tests.
- AI summary safety and citation tests.
- Responsive workspace tests for narrow mobile widths.

## Pack 4: Documentation

Goal: reduce documentation burden while keeping all AI-authored content draft-only, reviewable, attributable, and auditable.

### Capabilities

- `soap-builder`: Tier B. Drafts SOAP note sections from structured context and user-provided facts.
- `ambient-scribe`: Tier B/C. Existing endpoint. Expand with consent, transcript source, review state, and note export.
- `clinical-dictation`: Tier B. Dictation capture and structured draft generation.
- `discharge-summary-ai`: Tier B. Draft discharge summaries from patient workspace context and verified events.
- `referral-ai`: Tier B. Draft referral letters with reason, relevant data, and missing information.
- `prior-auth-ai`: Tier B/C. Draft prior authorization packets with policy citation and payer-specific evidence checklist.

### Frontend Routes

- `/tools/soap-builder`
- `/tools/ambient-scribe`
- `/tools/clinical-dictation`
- `/tools/discharge-summary-ai`
- `/tools/referral-ai`
- `/tools/prior-auth-ai`
- `/patients/:patientId/documentation`
- `/patients/:patientId/documentation/:documentId`

### Inventory And Catalog

Documentation tools should be categorized as `Documentation` or `Clinical AI`. Each entry needs:

- draft-only safety copy
- `requiresReview: true`
- PHI permissions
- audit event mapping
- export capability status
- consent dependency when audio/transcript is used

### Backend Modules

- `backend/src/modules/documentation`
- `backend/src/modules/ambient-scribe`
- `backend/src/modules/dictation`
- `backend/src/modules/document-export`
- `backend/src/modules/prior-auth`

### API Contracts

- `POST /api/documentation/soap/draft`
- `POST /api/clinical-intelligence/ambient-scribe/generate`
- `POST /api/documentation/dictation/transcribe`
- `POST /api/documentation/discharge-summary/draft`
- `POST /api/documentation/referral/draft`
- `POST /api/documentation/prior-auth/draft`
- `POST /api/documentation/:documentId/approve`
- `POST /api/documentation/:documentId/export`

Core DTOs:

- `SoapDraftRequestDto`
- `SoapDraftResponseDto`
- `AmbientScribeRequestDto`
- `AmbientScribeResponseDto`
- `DictationTranscriptDto`
- `DischargeSummaryDraftDto`
- `ReferralDraftDto`
- `PriorAuthDraftDto`
- `DocumentationApprovalDto`
- `DocumentationExportDto`

### Safety Requirements

- Do not sign, submit, fax, export, or file documentation without explicit user approval.
- Display "AI draft" state until approved.
- Preserve source snippets and user edits.
- Require consent checks for ambient capture and dictation.
- Track document lifecycle: draft, reviewed, approved, exported, rejected.

### Tests

- Draft generation contract tests.
- Consent gate tests for ambient/dictation routes.
- Audit lifecycle tests for draft/review/export.
- PHI permission tests.
- UI tests for draft labels and non-blank empty/error states.
- Export tests with mocked destinations.

## Pack 5: Governance

Goal: make AI/tool usage visible, controllable, explainable, consent-aware, privacy-safe, and cost-aware.

### Capabilities

- `ai-governance`: Tier C. Governance control plane for policies, model access, risk tiers, and review queues.
- `model-usage-dashboard`: Tier C. Usage, latency, errors, model mix, and safety event dashboard.
- `cost-optimization-control-plane`: Tier C. Cost budgets, alerts, model routing controls, and optimization recommendations.
- `clinical-safety-audit`: Tier C. Safety compliance dashboard for prompts, outputs, disclaimers, citations, and adverse workflow flags.
- `consent-manager`: Tier C. Consent capture, status, scope, expiration, revocation, and audit view.
- `privacy-center`: Tier C. PHI access logs, data export/delete workflows, privacy settings, and policy notices.

### Frontend Routes

- `/governance`
- `/governance/ai`
- `/governance/model-usage`
- `/governance/costs`
- `/governance/clinical-safety`
- `/governance/consent`
- `/governance/privacy`
- Existing related routes can redirect or deep-link: `/costs`, `/audit-logs`, `/consent`, `/consent-history`, `/settings`.

### Inventory And Catalog

Governance tools are platform/admin surfaces, not calculators. They should be visible based on permissions:

- `VIEW_AUDIT_LOGS`
- `VIEW_ANALYTICS`
- `CONFIGURE_SYSTEM`
- `MANAGE_BILLING`
- `MANAGE_CONSENT`
- `MANAGE_PRIVACY`

### Backend Modules

- `backend/src/modules/ai-governance`
- `backend/src/modules/model-usage`
- `backend/src/modules/cost-control`
- `backend/src/modules/clinical-safety-audit`
- `backend/src/modules/consent`
- `backend/src/modules/privacy`

### API Contracts

- `GET /api/governance/ai/policies`
- `PUT /api/governance/ai/policies/:policyId`
- `GET /api/governance/model-usage/summary`
- `GET /api/governance/model-usage/events`
- `GET /api/governance/costs/summary`
- `PUT /api/governance/costs/budgets/:budgetId`
- `GET /api/governance/clinical-safety/findings`
- `POST /api/governance/clinical-safety/findings/:findingId/review`
- `GET /api/consent/:patientId`
- `POST /api/consent/:patientId`
- `POST /api/consent/:patientId/revoke`
- `GET /api/privacy/access-log`
- `POST /api/privacy/export`
- `POST /api/privacy/delete-request`

Core DTOs:

- `AiGovernancePolicyDto`
- `ModelUsageSummaryDto`
- `ModelUsageEventDto`
- `CostControlSummaryDto`
- `CostBudgetDto`
- `ClinicalSafetyFindingDto`
- `ClinicalSafetyReviewDto`
- `ConsentRecordDto`
- `ConsentUpdateRequestDto`
- `PrivacyAccessLogDto`
- `PrivacyExportRequestDto`

### Safety Requirements

- Governance changes require admin permissions and audit logs.
- Cost controls must not silently downgrade clinical safety behavior.
- Model routing policies must record model, version, prompt class, and reason.
- Consent state must be checked before ambient capture, patient export, and documentation workflows.
- Privacy export/delete workflows must be explicit, tracked, and reversible until final approval where applicable.

### Tests

- Permission and RBAC tests for all governance routes.
- Audit-log tests for policy changes and consent changes.
- Cost budget tests for alerts and enforcement modes.
- Model usage aggregation tests.
- Safety finding workflow tests.
- Privacy export/delete request contract tests.

## Unified Backend Platform Architecture

The five packs should share these platform services:

- `PatientContextService`: resolves patient workspace context from imported EHR/FHIR/HL7 data and local app state.
- `SourceProvenanceService`: records source system, source resource ID, timestamp, freshness, and normalization status.
- `ClinicalIntelligenceService`: handles AI workflow generation, guideline RAG, why-engine, summaries, and documentation drafts.
- `AuditTrailService`: records user, patient, source data, model, prompts, outputs, confirmations, exports, and policy changes.
- `ConsentService`: exposes consent state to documentation, ambient, privacy, and patient workspace systems.
- `CostControlService`: centralizes model usage, budgets, alerts, and optimization controls.
- `GovernancePolicyService`: enforces AI policy, model routing, retention, and review requirements.

## Unified Frontend Architecture

Add platform navigation groups separate from the calculator catalog:

- `Integrations`: FHIR, HL7, import status, source mapping.
- `Patient Workspace`: summary, timeline, events, risk history, care plan, documentation.
- `AI Workflows`: recommender, workflow builder, reasoning, RAG, why-engine.
- `Documentation`: SOAP, ambient, dictation, discharge, referral, prior auth.
- `Governance`: AI policy, model usage, costs, safety audit, consent, privacy.

Shared UI patterns:

- provenance banner
- patient context header
- AI draft/review state
- citation/source panel
- missing-data panel
- audit event drawer
- permission-denied state
- unsupported backend state
- demo/mock state
- mobile-first split panels

## Implementation Phases

### Phase 0: Architecture And Contracts

- Add canonical platform pack definitions.
- Add route and inventory design docs.
- Define shared DTOs for patient context, provenance, AI audit, consent, and governance.
- Add contract matrix placeholders for all planned capabilities.
- Add no-false-executor tests for planned platform capabilities.

Exit criteria:

- Docs complete.
- Contract matrix includes planned rows with no broken or falsely executable entries.
- Routes and permissions are agreed before UI work starts.

### Phase 1: Interoperability Foundations

- Implement FHIR connection registry and mock connector.
- Implement HL7 bridge status and test-message parser.
- Implement patient/lab/medication/observation import preview flows.
- Add source provenance storage and UI.

Exit criteria:

- Patient context can be populated from mock FHIR/HL7 bundles.
- Import preview and conflict handling are tested.
- No patient record is modified without confirmation.

### Phase 2: Patient Workspace

- Build patient workspace shell.
- Add patient summary, timeline, risk-score history, and care-plan view.
- Connect calculator outputs to patient workspace with explicit user confirmation.
- Add responsive/mobile workspace tests.

Exit criteria:

- A user can open a patient workspace, review imported context, run a calculator, and attach the result with provenance.
- Timeline distinguishes imported facts, user notes, AI drafts, and tool outputs.

### Phase 3: AI Workflow Layer

- Upgrade calculator recommender to use patient context and missing-data prompts.
- Add workflow-builder, reasoning engine, why-engine, and guideline RAG expansion.
- Add citation panels and audit trail capture.

Exit criteria:

- AI suggestions cite sources or explicitly state source gaps.
- AI workflow output is draft/decision-support only.
- Audit trail captures inputs, model, output, sources, and user action.

### Phase 4: Documentation Layer

- Add SOAP builder, ambient scribe expansion, dictation, discharge summary, referral, and prior auth drafts.
- Add consent checks and document lifecycle states.
- Add export stubs with explicit approval requirements.

Exit criteria:

- Documentation drafts cannot be exported or marked final without review.
- Consent gating works for audio/transcript workflows.
- Source snippets and user edits are preserved.

### Phase 5: Governance And Operations

- Add AI governance policy UI and APIs.
- Add model usage and cost optimization control planes.
- Add clinical safety audit dashboard.
- Add consent manager and privacy center.

Exit criteria:

- Admins can inspect model usage, costs, safety findings, consent status, and privacy access logs.
- Policy changes are permissioned and audited.
- Cost controls and model routing decisions are explainable.

## Acceptance Criteria

- Every platform capability has a canonical ID, route, inventory record, API contract, permission policy, and safety copy.
- Every user-facing capability is discoverable through `/tools`, platform navigation, or patient workspace navigation.
- No planned platform system is falsely advertised as a POST executor.
- AI workflows are patient-context-aware, cited when source-backed, and human-reviewed before action.
- FHIR/HL7/import workflows preserve source provenance and require confirmation before writeback.
- Documentation workflows remain draft-only until reviewed and approved.
- Governance workflows capture audit logs for policy, consent, cost, model, privacy, and safety events.
- Mobile widths and light/dark themes render all platform shells.
- Frontend tests, backend tests, route tests, inventory tests, responsive tests, lint, and production build all pass before implementation PRs are merged.

## Recommended Test Additions

- `platformSystemsExpansionPlan.test.js`: verifies planned IDs, routes, tiers, and no executor false advertising.
- `interoperabilityContracts.test.ts`: verifies FHIR/HL7/import DTOs and source provenance.
- `patientWorkspaceRoutes.test.jsx`: verifies patient workspace routes, permission states, and non-blank UI.
- `clinicalIntelligenceWorkflowContracts.test.ts`: verifies workflow-builder, reasoning, RAG, why-engine, and audit-trail contracts.
- `documentationWorkflowSafety.test.jsx`: verifies AI draft labels, consent gates, review states, and export blocks.
- `governanceControlPlane.test.ts`: verifies policy, cost, model usage, consent, privacy, and audit endpoints.
- `platformResponsive.test.jsx`: verifies mobile route rendering for integrations, workspace, documentation, and governance shells.

