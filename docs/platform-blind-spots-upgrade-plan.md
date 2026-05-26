# CareDroid Platform Blind Spots Upgrade Plan

## Purpose

CareDroid already has a broad clinical tool catalog, AI assistant surface, clinical intelligence APIs, a backend tool orchestrator, audit primitives, and dashboard planning. The next platform upgrade should close the enterprise-grade layers required before expanding into production clinical use: clinical governance, LLM security, FHIR/HL7 interoperability, regulatory classification, equity and bias monitoring, validation sandboxing, human review, consent and privacy controls, audit trails, and deployment observability.

This document is a design plan only. It defines the missing modules, criticality, integration model, route/API/data contracts, role rules, safety requirements, tests, documentation, and implementation phases.

## Production Criticality

### P0: Critical Before Production Clinical Use

These are blockers for any production use involving PHI, patient context, clinical recommendations, clinician-facing AI output, or external system integration:

- Clinical governance and clinical safety policy.
- LLM security and prompt/data protection.
- Regulatory classification and intended-use control.
- Human review queue for AI drafts, high-risk recommendations, and side-effecting workflows.
- Consent and privacy center for PHI, ambient capture, data export/delete, and patient-facing controls.
- Tamper-evident audit trails with standardized AI, PHI, policy, and integration events.
- Deployment observability for AI runs, orchestrator calls, errors, latency, cost, safety events, and degraded modes.
- Minimum validation sandbox for model, prompt, tool, and integration changes before release.
- FHIR/HL7 source provenance if any external patient data is imported or displayed.
- Baseline equity and bias monitoring for demographic-sensitive recommendations and tools.

### P1: Required For Controlled Pilot

These should exist before a limited pilot with real clinicians, even if scope is constrained:

- Full FHIR/HL7 connection manager with mock and test environments.
- Validation sandbox regression suites using synthetic patients and known clinical scenarios.
- Clinical governance dashboards with policy review and sign-off workflow.
- Reviewer assignment, escalation, and SLA reporting in the human review queue.
- Privacy access log UI and auditable consent state checks across documentation and assistant workflows.
- Observability drilldowns by `runId`, `capabilityId`, route, tenant, model, and tool.

### P2: Required For Enterprise Scale

These can phase after initial production controls but should be planned now:

- Advanced equity dashboards with cohort drift, calibration curves, and fairness reports.
- Multi-institution governance policy inheritance and exception handling.
- External audit exports for compliance and institutional review.
- Blue/green prompt and model deployment governance.
- HL7 queue replay, message quarantine, and interface certification workflows.

### P3: Later Platform Expansion

These are valuable, but not blockers for initial governed clinical deployment:

- Patient-facing regulatory disclosure portal beyond required notices.
- Automated bias root-cause analysis and remediation suggestions.
- Multi-region regulatory package generation.
- Marketplace-style connector certification.
- Autonomous observability remediation playbooks.

## Shared Integration Model

Every module in this plan must be represented as a platform capability, not as a clinical calculator. The canonical inventory should use stable capability IDs, explicit permissions, and `executorStatus: platform` unless a real `registerTool()` executor exists in the backend orchestrator.

Shared integration rules:

- Unified inventory: add platform records to `toolInventory.js`, `toolRegistry.js`, `medicalToolsCatalogIndex.js`, and contract/discovery docs with `sourceKind: platform`, `riskLevel`, `permissionPolicy`, `route`, `endpoint`, `apiClient`, `auditEvents`, and `dashboardPlacement`.
- AI assistant: route every AI-capable module through the AI Gateway envelope with `runId`, `capabilityId`, `sourceSurface`, `phiAccessed`, `requiresHumanReview`, policy version, model/prompt version, and review status.
- Backend orchestrator: keep deterministic clinical tool execution separate from platform governance workflows. The orchestrator should emit validation, execution, blocked-action, and result events into governance/audit services, but platform modules should not pretend to be `/api/tools/:id/execute` tools unless registered.
- Dashboards: surface P0/P1 status on `/dashboard`, admin controls under `/governance`, developer/source truth under `/tools/catalog`, and operational telemetry in Grafana/Datadog-compatible dashboards.
- Patient context: all modules that touch patient data must carry source provenance, freshness, consent scope, PHI flags, tenant scope, and audit references.
- Safety posture: AI outputs remain decision support and drafts. CareDroid must not autonomously diagnose, prescribe, place orders, alter charts, export documentation, or contact patients without explicit governed approval.

## Module 1: Clinical Governance Control Plane

### Scope And Criticality

Criticality: P0 production blocker.

Goal: define the institution-approved clinical policies, intended-use boundaries, safety rules, model/tool allowlists, prompt versions, review thresholds, and release gates that govern CareDroid.

### Route

- `/governance`
- `/governance/clinical`
- `/governance/clinical/policies`
- `/governance/clinical/release-gates`
- `/governance/clinical/safety-findings`

### Frontend UI

- Governance landing page with readiness checklist and P0 blocker status.
- Policy editor for clinical safety policy, intended-use text, model/tool allowlists, blocked actions, emergency escalation rules, and review thresholds.
- Release gate board showing pending model, prompt, tool, route, and integration changes.
- Safety findings table with severity, owner, source module, linked audit events, and disposition.
- Dashboard widgets on `/dashboard` for production readiness, open high-severity findings, and policy version in force.

### Backend Module

- `backend/src/modules/clinical-governance`
- `backend/src/modules/governance-policy`
- `backend/src/modules/release-gates`
- Shared dependency on `audit`, `permissions`, `ai/foundation`, and `clinical-intelligence`.

### API Contracts

- `GET /api/governance/clinical/readiness`
- `GET /api/governance/clinical/policies`
- `POST /api/governance/clinical/policies`
- `PUT /api/governance/clinical/policies/:policyId`
- `POST /api/governance/clinical/policies/:policyId/approve`
- `GET /api/governance/clinical/release-gates`
- `POST /api/governance/clinical/release-gates/:gateId/decision`
- `GET /api/governance/clinical/safety-findings`
- `POST /api/governance/clinical/safety-findings/:findingId/review`

Core DTOs:

- `ClinicalGovernancePolicyDto`
- `ClinicalReadinessSummaryDto`
- `ClinicalReleaseGateDto`
- `ReleaseGateDecisionDto`
- `ClinicalSafetyFindingDto`
- `ClinicalSafetyReviewDto`

### Data Model

- `clinical_governance_policies`: `id`, `organizationId`, `policyType`, `version`, `status`, `effectiveAt`, `retiredAt`, `content`, `createdBy`, `approvedBy`.
- `clinical_release_gates`: `id`, `capabilityId`, `changeType`, `artifactVersion`, `riskLevel`, `validationRunId`, `status`, `requiredApprovals`, `decision`.
- `clinical_safety_findings`: `id`, `runId`, `capabilityId`, `severity`, `findingType`, `source`, `description`, `ownerUserId`, `status`, `resolution`.
- `policy_bindings`: `id`, `capabilityId`, `policyId`, `promptVersion`, `modelPolicy`, `reviewPolicy`, `blockedActions`.

### Role/Permission Rules

- `VIEW_GOVERNANCE`: view readiness and policy summaries.
- `MANAGE_CLINICAL_POLICY`: create or update draft policies.
- `APPROVE_CLINICAL_POLICY`: approve policies and release gates.
- `REVIEW_SAFETY_FINDINGS`: triage and resolve safety findings.
- `CONFIGURE_SYSTEM`: bind approved policy versions to production capabilities.
- Clinicians can view active safety copy and intended-use constraints for tools they can access, but cannot edit governance policy.

### Safety Requirements

- No production AI capability can run without an active approved policy binding.
- Policy changes require dual approval for high-risk clinical workflows.
- Emergency escalation rules cannot be disabled by cost or convenience settings.
- Blocked actions are enforced by the AI Gateway and backend orchestrator before model/tool execution.
- Release gates must fail closed if validation, audit, or review dependencies are unavailable.

### Tests

- RBAC tests for policy read/write/approve paths.
- Contract tests for readiness, policy, release gate, and safety finding DTOs.
- Gateway enforcement tests proving unapproved capabilities are blocked.
- Audit tests for draft, approval, activation, and rollback events.
- UI tests for readiness blockers, empty states, and permission-denied states.

### Documentation

- [Clinical governance operating procedure](clinical-governance-operating-procedure.md).
- [Policy authoring guide](clinical-policy-authoring-guide.md).
- [Release gate checklist](release-gate-checklist.md).
- [Safety finding triage guide](safety-finding-triage-guide.md).
- [Intended-use and blocked-action registry](intended-use-and-blocked-action-registry.md).

### Implementation Phase

- Phase 0: define policy schema, permission model, readiness checklist, and inventory records.
- Phase 1: implement policy CRUD, release gates, and dashboard blockers.
- Phase 2: bind policies into AI Gateway, clinical intelligence, and tool orchestrator enforcement.

## Module 2: LLM Security And AI Trust Boundary

### Scope And Criticality

Criticality: P0 production blocker.

Goal: protect PHI, prompts, tools, retrieval, model calls, memory, and assistant interactions against prompt injection, data exfiltration, unsafe tool use, tenant leaks, and ungoverned model behavior.

### Route

- `/governance/ai-security`
- `/governance/ai-security/prompt-firewall`
- `/governance/ai-security/model-access`
- `/governance/ai-security/incidents`

### Frontend UI

- AI security dashboard with prompt injection blocks, PHI redaction events, unsafe tool attempts, model access violations, and policy denials.
- Prompt firewall rule editor for approved administrators.
- Model/provider access panel with approved models, allowed data classes, retention settings, and routing constraints.
- Security incident queue with linked audit events and affected `runId` values.

### Backend Module

- `backend/src/modules/ai-security`
- `backend/src/modules/prompt-firewall`
- `backend/src/modules/model-access-policy`
- Integrates with `backend/src/modules/ai/foundation`, `rag`, `memory`, `audit`, and `medical-control-plane/tool-orchestrator`.

### API Contracts

- `GET /api/governance/ai-security/summary`
- `GET /api/governance/ai-security/rules`
- `PUT /api/governance/ai-security/rules/:ruleId`
- `POST /api/governance/ai-security/evaluate`
- `GET /api/governance/ai-security/model-access`
- `PUT /api/governance/ai-security/model-access/:policyId`
- `GET /api/governance/ai-security/incidents`
- `POST /api/governance/ai-security/incidents/:incidentId/review`

Core DTOs:

- `AiSecuritySummaryDto`
- `PromptFirewallRuleDto`
- `PromptSecurityEvaluationDto`
- `ModelAccessPolicyDto`
- `AiSecurityIncidentDto`
- `AiSecurityIncidentReviewDto`

### Data Model

- `prompt_firewall_rules`: `id`, `organizationId`, `ruleType`, `pattern`, `severity`, `action`, `enabled`, `version`.
- `model_access_policies`: `id`, `provider`, `model`, `allowedDataClasses`, `allowedCapabilities`, `retentionMode`, `region`, `status`.
- `ai_security_events`: `id`, `runId`, `capabilityId`, `eventType`, `severity`, `action`, `inputHash`, `metadata`, `createdAt`.
- `ai_security_incidents`: `id`, `severity`, `status`, `openedAt`, `reviewedBy`, `linkedRunIds`, `resolution`.

### Role/Permission Rules

- `VIEW_AI_SECURITY`: view AI security dashboards and incidents.
- `MANAGE_AI_SECURITY`: create and edit firewall and model access policies.
- `REVIEW_AI_SECURITY_INCIDENTS`: disposition incidents.
- `CONFIGURE_SYSTEM`: activate model providers and production policy bindings.
- Non-admin clinicians receive safe denial messages but cannot inspect prompt firewall internals.

### Safety Requirements

- Apply prompt firewall checks before retrieval, tool routing, model calls, and memory writes.
- Redact or minimize PHI unless the approved route requires it.
- Prevent tool invocation from untrusted model output without schema validation and policy approval.
- Do not send patient data to models lacking approved data retention and region policy.
- Record blocked prompt injection, policy denial, redaction, and unsafe tool attempts in audit logs.

### Tests

- Prompt injection fixture tests.
- PHI redaction/minimization tests.
- Model policy enforcement tests by capability and data class.
- Tool-call validation tests preventing model-generated raw executor calls.
- Incident workflow tests and audit integrity tests.

### Documentation

- AI security architecture.
- Prompt injection response guide.
- Approved model/provider policy.
- PHI minimization and retention guide.
- Security incident runbook.

### Implementation Phase

- Phase 0: define AI security events, model policy schema, and prompt firewall contract.
- Phase 1: enforce pre-model checks in AI Gateway and clinical intelligence.
- Phase 2: integrate with RAG, memory, tool orchestrator, and dashboards.

## Module 3: FHIR/HL7 Interoperability And Source Provenance

### Scope And Criticality

Criticality: P0 if production uses external patient data; P1 if initial production is standalone calculator/demo mode only.

Goal: connect CareDroid to standards-based clinical data while preserving source provenance, consent scope, tenant boundaries, freshness, import preview, deterministic matching, and interface safety.

### Route

- `/integrations`
- `/integrations/fhir`
- `/integrations/hl7`
- `/integrations/source-provenance`
- `/patients/import`
- `/patients/:patientId/source-data`

### Frontend UI

- FHIR connection manager for SMART/FHIR endpoints, scopes, sync status, errors, and test connection.
- HL7 interface dashboard for ADT, ORU, ORM, MDM queues, parser status, message quarantine, and replay preview.
- Import preview and conflict resolution screens for demographics, encounters, labs, medications, observations, allergies, and documents.
- Source provenance drawer visible inside patient workspace, assistant context, and dashboards.
- Dashboard widgets for stale interfaces, failed syncs, and unresolved mapping conflicts.

### Backend Module

- `backend/src/modules/interoperability/fhir`
- `backend/src/modules/interoperability/hl7`
- `backend/src/modules/patient-import`
- `backend/src/modules/source-provenance`
- `backend/src/modules/terminology-mapping`
- Integrates with `patient-workspace`, `clinical-intelligence`, `audit`, and `consent`.

### API Contracts

- `GET /api/integrations/fhir/connections`
- `POST /api/integrations/fhir/connections`
- `POST /api/integrations/fhir/:connectionId/test`
- `POST /api/integrations/fhir/:connectionId/sync`
- `GET /api/integrations/hl7/interfaces`
- `POST /api/integrations/hl7/interfaces/:interfaceId/test-message`
- `GET /api/integrations/hl7/messages/quarantine`
- `POST /api/integrations/hl7/messages/:messageId/replay-preview`
- `POST /api/patients/import/ehr`
- `GET /api/patients/:patientId/source-data`
- `GET /api/source-provenance/:sourceId`

Core DTOs:

- `FhirConnectionDto`
- `FhirSyncRequestDto`
- `FhirSyncStatusDto`
- `Hl7InterfaceDto`
- `Hl7MessagePreviewDto`
- `PatientImportPreviewDto`
- `PatientImportCommitDto`
- `SourceProvenanceDto`
- `TerminologyMappingDto`

### Data Model

- `fhir_connections`: `id`, `organizationId`, `baseUrl`, `authMode`, `scopes`, `status`, `lastSyncAt`, `createdBy`.
- `hl7_interfaces`: `id`, `organizationId`, `interfaceType`, `sourceSystem`, `status`, `lastMessageAt`, `queueDepth`.
- `hl7_messages`: `id`, `interfaceId`, `messageType`, `controlId`, `rawHash`, `parseStatus`, `quarantineReason`, `receivedAt`.
- `source_provenance`: `id`, `sourceSystem`, `sourceType`, `externalResourceId`, `patientId`, `resourceType`, `fetchedAt`, `freshness`, `normalizedHash`.
- `patient_import_jobs`: `id`, `sourceId`, `patientId`, `status`, `conflicts`, `previewPayload`, `committedBy`, `committedAt`.
- `terminology_mappings`: `id`, `sourceCode`, `sourceSystem`, `targetSystem`, `targetCode`, `confidence`, `status`.

### Role/Permission Rules

- `MANAGE_INTEGRATIONS`: create and configure FHIR/HL7 interfaces.
- `VIEW_INTEGRATIONS`: view interface status.
- `IMPORT_PATIENT_DATA`: run import previews and commit imports.
- `RESOLVE_DATA_CONFLICTS`: resolve patient matching and terminology conflicts.
- `VIEW_PHI`: view patient source data.
- `BREAK_GLASS_ACCESS`: emergency access with elevated audit requirements.

### Safety Requirements

- Never overwrite patient data without preview, diff, and explicit confirmation.
- Never silently merge patient identifiers; ambiguous matches go to manual conflict resolution.
- Preserve original source values, normalized values, source system, timestamp, and mapping confidence.
- Mark stale, partial, failed, synthetic, and demo data visibly.
- Block assistant use of imported patient context when consent, role, or source freshness policy fails.

### Tests

- FHIR bundle normalization tests.
- HL7 parsing, quarantine, and replay preview tests.
- Patient matching and conflict resolution tests.
- Source provenance contract tests.
- Permission tests for integration setup and patient data access.
- E2E import preview tests using synthetic FHIR bundles and HL7 messages.

### Documentation

- FHIR connector setup guide.
- HL7 interface onboarding guide.
- Source provenance data dictionary.
- Import conflict resolution SOP.
- Synthetic test data guide.

### Implementation Phase

- Phase 0: define source provenance and import preview contracts.
- Phase 1: implement mock FHIR/HL7 connectors and provenance UI.
- Phase 2: implement production connector hardening, quarantine, replay preview, and patient workspace integration.

## Module 4: Regulatory Classification And Intended Use

### Scope And Criticality

Criticality: P0 production blocker.

Goal: classify each capability by intended use, clinical risk, jurisdictional obligations, decision-support status, review requirements, and whether it may be treated as wellness, administrative support, clinical decision support, documentation assistance, or regulated medical device software.

### Route

- `/governance/regulatory`
- `/governance/regulatory/capabilities`
- `/governance/regulatory/intended-use`
- `/governance/regulatory/evidence`

### Frontend UI

- Capability classification matrix by canonical inventory ID.
- Intended-use editor with approved user-facing safety copy.
- Regulatory evidence binder with validation results, policy approvals, risk assessment, and release history.
- Warnings for unclassified or classification-expired capabilities.
- Dashboard blocker when any production-exposed clinical capability lacks active classification.

### Backend Module

- `backend/src/modules/regulatory-classification`
- `backend/src/modules/intended-use`
- `backend/src/modules/evidence-binder`
- Integrates with governance policy, unified inventory, validation sandbox, audit, and release gates.

### API Contracts

- `GET /api/governance/regulatory/capabilities`
- `GET /api/governance/regulatory/capabilities/:capabilityId`
- `PUT /api/governance/regulatory/capabilities/:capabilityId/classification`
- `POST /api/governance/regulatory/capabilities/:capabilityId/approve`
- `GET /api/governance/regulatory/evidence/:capabilityId`
- `POST /api/governance/regulatory/evidence/:capabilityId/artifacts`

Core DTOs:

- `RegulatoryCapabilityClassificationDto`
- `IntendedUseStatementDto`
- `RegulatoryRiskAssessmentDto`
- `EvidenceArtifactDto`
- `ClassificationApprovalDto`

### Data Model

- `regulatory_classifications`: `id`, `capabilityId`, `jurisdiction`, `classification`, `riskLevel`, `intendedUse`, `excludedUses`, `requiresHumanReview`, `status`, `approvedBy`.
- `regulatory_evidence_artifacts`: `id`, `capabilityId`, `artifactType`, `version`, `uri`, `hash`, `createdAt`, `approvedAt`.
- `intended_use_versions`: `id`, `capabilityId`, `version`, `displayText`, `adminNotes`, `effectiveAt`, `retiredAt`.
- `regulatory_review_history`: `id`, `capabilityId`, `reviewType`, `decision`, `reviewedBy`, `reviewedAt`, `rationale`.

### Role/Permission Rules

- `VIEW_REGULATORY`: view classification and intended-use records.
- `MANAGE_REGULATORY`: draft and edit classifications.
- `APPROVE_REGULATORY`: approve classification and evidence packages.
- `CONFIGURE_SYSTEM`: expose only approved classifications to production routes.
- Clinicians must see intended-use and safety copy, but cannot alter classification.

### Safety Requirements

- Unclassified clinical capabilities are blocked from production exposure.
- User-facing route copy must match approved intended-use statements.
- AI Gateway must include classification metadata in every `AiRunEnvelope`.
- High-risk or regulated capabilities require human review and validation evidence before activation.
- Classification changes are audited and release-gated.

### Tests

- Inventory drift tests proving every clinical/AI/platform capability has classification metadata.
- Route tests showing unclassified capabilities are blocked or hidden.
- API contract tests for classification and evidence DTOs.
- Audit tests for approval, activation, and retirement.
- UI tests for intended-use copy rendering.

### Documentation

- Regulatory classification policy.
- Intended-use writing guide.
- Evidence binder structure.
- Capability risk taxonomy.
- Release checklist for regulated or high-risk workflows.

### Implementation Phase

- Phase 0: add classification schema and inventory requirements.
- Phase 1: build classification UI/API and block unclassified production capabilities.
- Phase 2: connect validation evidence and release gates.

## Module 5: Equity And Bias Monitoring

### Scope And Criticality

Criticality: P0 baseline for clinical AI; P2 for advanced cohort analytics.

Goal: monitor whether model-assisted recommendations, triage suggestions, documentation summaries, risk predictions, and tool recommendations behave differently across clinically relevant cohorts.

### Route

- `/governance/equity`
- `/governance/equity/metrics`
- `/governance/equity/cohorts`
- `/governance/equity/reports`

### Frontend UI

- Equity dashboard with cohort coverage, missing demographic data, recommendation rates, review outcomes, override rates, safety findings, and drift trends.
- Cohort definition editor with privacy-preserving aggregation thresholds.
- Bias finding queue linked to human review and governance safety findings.
- Report export for governance committees.
- Dashboard tile showing unresolved high-severity equity findings.

### Backend Module

- `backend/src/modules/equity-monitoring`
- `backend/src/modules/cohort-metrics`
- `backend/src/modules/model-evaluation`
- Integrates with AI audit events, validation sandbox, human review queue, clinical governance, and analytics.

### API Contracts

- `GET /api/governance/equity/summary`
- `GET /api/governance/equity/metrics`
- `POST /api/governance/equity/cohorts`
- `GET /api/governance/equity/cohorts`
- `GET /api/governance/equity/findings`
- `POST /api/governance/equity/findings/:findingId/review`
- `POST /api/governance/equity/reports`

Core DTOs:

- `EquitySummaryDto`
- `EquityMetricQueryDto`
- `EquityMetricResultDto`
- `CohortDefinitionDto`
- `BiasFindingDto`
- `EquityReportRequestDto`
- `EquityReportDto`

### Data Model

- `cohort_definitions`: `id`, `organizationId`, `name`, `attributes`, `minCellSize`, `status`, `createdBy`.
- `equity_metric_snapshots`: `id`, `capabilityId`, `cohortId`, `metricName`, `value`, `denominator`, `windowStart`, `windowEnd`.
- `bias_findings`: `id`, `capabilityId`, `cohortId`, `findingType`, `severity`, `status`, `linkedPolicyId`, `resolution`.
- `equity_reports`: `id`, `organizationId`, `period`, `artifactUri`, `createdBy`, `createdAt`.

### Role/Permission Rules

- `VIEW_EQUITY_METRICS`: view aggregated equity dashboards.
- `MANAGE_EQUITY_COHORTS`: define cohorts and thresholds.
- `REVIEW_BIAS_FINDINGS`: review and resolve findings.
- `EXPORT_EQUITY_REPORTS`: export committee reports.
- Raw PHI or small-cell cohort data requires `VIEW_PHI` plus privacy approval; default dashboards use aggregate thresholds only.

### Safety Requirements

- Enforce minimum cell sizes to avoid re-identification.
- Do not infer protected attributes for individuals without approved policy.
- Bias findings cannot silently auto-change clinical behavior; changes require governance review and validation.
- Monitor missingness as a first-class metric, since missing demographic data can hide inequity.
- Use synthetic and de-identified validation data whenever possible.

### Tests

- Metric aggregation tests by cohort and capability.
- Minimum-cell-size suppression tests.
- Missingness and drift tests.
- Bias finding workflow tests.
- Permission tests for aggregate versus PHI-level access.
- Validation sandbox tests for cohort-specific regression fixtures.

### Documentation

- Equity monitoring policy.
- Cohort definition guide.
- Fairness metric dictionary.
- Bias finding review SOP.
- Report interpretation guide.

### Implementation Phase

- Phase 0: define baseline audit fields and cohort-safe aggregation policy.
- Phase 1: add aggregate dashboards and missingness metrics for P0 clinical AI.
- Phase 2: add advanced drift, calibration, and committee reporting.

## Module 6: Validation Sandbox And Simulation Lab

### Scope And Criticality

Criticality: P0 minimum release gate; P1 full controlled-pilot sandbox.

Goal: test models, prompts, tools, FHIR/HL7 mappings, workflows, and UI states against synthetic scenarios before production release.

### Route

- `/governance/validation`
- `/governance/validation/scenarios`
- `/governance/validation/runs`
- `/governance/validation/synthetic-patients`
- `/governance/validation/release-gates`

### Frontend UI

- Scenario library for clinical, documentation, interoperability, security, privacy, and equity fixtures.
- Synthetic patient browser with source provenance and expected outcomes.
- Validation run detail page with pass/fail checks, diffs, model/prompt/tool versions, citations, safety warnings, and human review outcomes.
- Release gate integration showing which validation runs are required before activation.

### Backend Module

- `backend/src/modules/validation-sandbox`
- `backend/src/modules/synthetic-patient-lab`
- `backend/src/modules/evaluation`
- Integrates with `ai/foundation`, `clinical-intelligence`, `medical-control-plane/tool-orchestrator`, `interoperability`, governance, audit, and observability.

### API Contracts

- `GET /api/governance/validation/scenarios`
- `POST /api/governance/validation/scenarios`
- `GET /api/governance/validation/synthetic-patients`
- `POST /api/governance/validation/runs`
- `GET /api/governance/validation/runs/:runId`
- `POST /api/governance/validation/runs/:runId/approve`
- `GET /api/governance/validation/release-gates/:capabilityId`

Core DTOs:

- `ValidationScenarioDto`
- `SyntheticPatientDto`
- `ValidationRunRequestDto`
- `ValidationRunResultDto`
- `ValidationAssertionResultDto`
- `ValidationApprovalDto`

### Data Model

- `validation_scenarios`: `id`, `capabilityId`, `scenarioType`, `riskLevel`, `inputFixture`, `expectedAssertions`, `version`, `status`.
- `synthetic_patients`: `id`, `sourceBundle`, `demographics`, `clinicalFacts`, `expectedOutcomes`, `provenance`.
- `validation_runs`: `id`, `capabilityId`, `artifactVersions`, `status`, `startedBy`, `startedAt`, `completedAt`, `summary`.
- `validation_assertions`: `id`, `validationRunId`, `assertionType`, `expected`, `actual`, `status`, `severity`.

### Role/Permission Rules

- `VIEW_VALIDATION`: view scenarios and run results.
- `MANAGE_VALIDATION`: create scenarios and synthetic patients.
- `RUN_VALIDATION`: execute sandbox runs.
- `APPROVE_VALIDATION`: approve validation evidence for release gates.
- Sandbox data must be synthetic or explicitly de-identified unless a formal approval grants PHI use.

### Safety Requirements

- Validation runs must never write to production patient records or external systems.
- Sandbox endpoints use isolated credentials, source systems, model budgets, and audit namespace.
- Release gates fail if required P0 validation scenarios are missing or failing.
- Store input/output hashes and artifact versions so results are reproducible.
- Security and prompt-injection scenarios are required for AI capabilities.

### Tests

- Scenario CRUD and versioning tests.
- Sandbox isolation tests proving no production writeback.
- Assertion engine tests.
- Release gate enforcement tests.
- Synthetic FHIR/HL7 fixture tests.
- Regression tests for prompt/model/tool changes.

### Documentation

- Validation scenario authoring guide.
- Synthetic patient data guide.
- Release validation SOP.
- Sandbox isolation architecture.
- Required scenario matrix by capability risk tier.

### Implementation Phase

- Phase 0: define validation DTOs, required scenarios, and release gate linkage.
- Phase 1: implement scenario library and manual validation run capture.
- Phase 2: automate sandbox execution for AI, orchestrator, FHIR/HL7, and UI contract tests.

## Module 7: Human Review Queue

### Scope And Criticality

Criticality: P0 production blocker for clinical AI, documentation drafts, high-risk tool recommendations, external writeback, and privacy/export workflows.

Goal: provide a formal queue where clinicians, safety reviewers, privacy admins, and governance owners review AI outputs, blocked actions, safety findings, documentation drafts, imports, and release decisions.

### Route

- `/review`
- `/review/clinical`
- `/review/documentation`
- `/review/privacy`
- `/review/governance`
- `/patients/:patientId/review`

### Frontend UI

- Unified review inbox with filters for capability, patient, severity, SLA, status, reviewer role, and source module.
- Review detail page showing original input, AI output, citations, source provenance, policy version, safety warnings, audit trail, and proposed disposition.
- Actions: approve, request changes, reject, escalate, assign, comment, mark reviewed, attach to patient, export after approval.
- Patient workspace panel listing open review items tied to that patient.
- Dashboard summary for overdue reviews and high-severity items.

### Backend Module

- `backend/src/modules/human-review`
- `backend/src/modules/review-queue`
- Integrates with clinical intelligence, documentation, AI Gateway, audit, consent/privacy, validation sandbox, and governance.

### API Contracts

- `GET /api/review/items`
- `POST /api/review/items`
- `GET /api/review/items/:itemId`
- `POST /api/review/items/:itemId/assign`
- `POST /api/review/items/:itemId/decision`
- `POST /api/review/items/:itemId/comments`
- `GET /api/patients/:patientId/review-items`

Core DTOs:

- `ReviewItemDto`
- `CreateReviewItemDto`
- `ReviewAssignmentDto`
- `ReviewDecisionDto`
- `ReviewCommentDto`
- `ReviewQueueSummaryDto`

### Data Model

- `review_items`: `id`, `organizationId`, `patientId`, `runId`, `capabilityId`, `reviewType`, `severity`, `status`, `assignedTo`, `dueAt`, `sourceModule`, `payloadRef`.
- `review_decisions`: `id`, `reviewItemId`, `decision`, `rationale`, `decidedBy`, `decidedAt`, `resultingAction`.
- `review_comments`: `id`, `reviewItemId`, `authorId`, `comment`, `createdAt`.
- `review_sla_policies`: `id`, `reviewType`, `severity`, `dueWithinMinutes`, `escalationPolicy`.

### Role/Permission Rules

- `VIEW_REVIEW_QUEUE`: view queue items assigned or permitted by role.
- `REVIEW_CLINICAL_AI`: approve or reject clinical AI output.
- `REVIEW_DOCUMENTATION`: approve documentation drafts for export or filing.
- `REVIEW_PRIVACY_REQUESTS`: approve export/delete/access requests.
- `REVIEW_GOVERNANCE`: approve release gates and policy exceptions.
- Users cannot approve their own high-risk AI output unless policy explicitly allows self-review for low-risk drafts.

### Safety Requirements

- AI output requiring review cannot be exported, filed, written back, or marked final until approved.
- Review screens must show citations, source provenance, policy version, model/prompt version, and limitations.
- Rejection and escalation reasons are mandatory for high-risk items.
- Review events are audit logged with immutable links to the source run.
- Overdue high-severity reviews trigger dashboard and notification events.

### Tests

- Queue lifecycle tests.
- RBAC and self-review prevention tests.
- Approval gate tests for documentation export, patient attachment, and external writeback.
- Audit event tests for assignment, decision, escalation, and comments.
- UI tests for review detail evidence panels and empty states.

### Documentation

- Human review SOP.
- Reviewer role guide.
- Review SLA policy.
- Clinical AI review checklist.
- Documentation approval checklist.

### Implementation Phase

- Phase 0: define review item schema and required review policy by capability risk.
- Phase 1: implement review queue and gate documentation/AI outputs.
- Phase 2: add SLA dashboards, notifications, and governance release integration.

## Module 8: Consent And Privacy Center

### Scope And Criticality

Criticality: P0 production blocker for PHI, patient context, ambient capture, documentation export, external integrations, data export/delete, and patient-facing controls.

Goal: centralize consent status, privacy preferences, access logs, data export/delete workflows, ambient recording permissions, and PHI access transparency.

### Route

- `/privacy`
- `/privacy/access-log`
- `/privacy/requests`
- `/consent`
- `/consent/:patientId`
- `/patients/:patientId/privacy`
- `/patients/:patientId/consent`

### Frontend UI

- Privacy center showing PHI access log, data sharing settings, export/delete requests, and policy notices.
- Consent manager showing active, expired, revoked, pending, and scoped consent records.
- Patient-level consent panel embedded in patient workspace and ambient/documentation workflows.
- Consent gate component for assistant context, ambient scribe, dictation, import, export, and documentation flows.
- Dashboard widget for privacy requests and consent blockers.

### Backend Module

- `backend/src/modules/consent`
- `backend/src/modules/privacy`
- `backend/src/modules/data-rights`
- Integrates with audit, patient workspace, documentation, ambient scribe, interoperability, AI Gateway, and human review.

### API Contracts

- `GET /api/consent/:patientId`
- `POST /api/consent/:patientId`
- `POST /api/consent/:patientId/revoke`
- `GET /api/privacy/access-log`
- `GET /api/privacy/patient/:patientId/access-log`
- `POST /api/privacy/export`
- `POST /api/privacy/delete-request`
- `GET /api/privacy/requests`
- `POST /api/privacy/requests/:requestId/review`

Core DTOs:

- `ConsentRecordDto`
- `ConsentUpdateRequestDto`
- `ConsentRevocationDto`
- `PrivacyAccessLogDto`
- `PrivacyExportRequestDto`
- `PrivacyDeleteRequestDto`
- `PrivacyRequestReviewDto`

### Data Model

- `consent_records`: `id`, `patientId`, `organizationId`, `scope`, `status`, `grantedAt`, `expiresAt`, `revokedAt`, `source`, `capturedBy`.
- `privacy_access_logs`: `id`, `patientId`, `actorUserId`, `accessType`, `resource`, `purpose`, `runId`, `phiAccessed`, `timestamp`.
- `privacy_requests`: `id`, `patientId`, `requestType`, `status`, `requestedBy`, `reviewedBy`, `dueAt`, `resultArtifactUri`.
- `privacy_preferences`: `id`, `patientId`, `sharingScopes`, `communicationPreferences`, `updatedAt`.

### Role/Permission Rules

- `VIEW_PRIVACY_CENTER`: view privacy dashboards.
- `MANAGE_CONSENT`: create, update, and revoke consent records.
- `VIEW_PHI_ACCESS_LOGS`: view patient-level PHI access logs.
- `REQUEST_DATA_EXPORT`: initiate data export workflows.
- `APPROVE_DATA_RIGHTS_REQUESTS`: approve export/delete requests.
- Patients or patient proxies, if supported later, receive scoped access separate from staff/admin roles.

### Safety Requirements

- Consent state must be checked before ambient capture, transcript processing, documentation export, patient context injection, and external data sharing.
- Revoked consent blocks future use and is visible in patient workspace.
- Data deletion/export workflows require review, audit, and reversible staging where legally appropriate.
- Privacy access logs must distinguish user action, AI access, integration access, and break-glass access.
- Ambient recording must require explicit consent and visible recording state.

### Tests

- Consent gate tests across assistant, ambient, documentation, import, and export flows.
- Privacy request lifecycle tests.
- PHI access log tests.
- Permission tests for patient and staff visibility.
- Revocation tests proving blocked future access.
- UI tests for consent missing/expired/revoked states.

### Documentation

- Consent policy.
- Privacy center user guide.
- Data export/delete SOP.
- PHI access log data dictionary.
- Ambient capture consent guide.

### Implementation Phase

- Phase 0: define consent and privacy request schemas.
- Phase 1: implement consent checks and privacy access logs for P0 AI/documentation workflows.
- Phase 2: add patient-facing/privacy request workflows and external export controls.

## Module 9: Audit Trail Spine

### Scope And Criticality

Criticality: P0 production blocker.

Goal: standardize audit logging across auth, PHI access, AI runs, RAG, tool orchestration, clinical governance, regulatory classification, human review, consent/privacy, interoperability, validation, and deployment changes.

### Route

- `/audit`
- `/audit/ai`
- `/audit/phi`
- `/audit/integrations`
- `/audit/policy`
- Existing related route: `/tools/catalog` can deep-link to source/audit truth for developer users.

### Frontend UI

- Audit search with filters for user, patient, run ID, capability, action, PHI flag, source module, severity, and date range.
- AI run timeline showing gateway, routing, retrieval, model, tool, response composition, review, and final disposition.
- PHI access timeline for privacy/compliance review.
- Integrity status panel showing hash-chain verification, gaps, and export status.
- Dashboard widgets for audit integrity health and high-severity audit events.

### Backend Module

- Existing `backend/src/modules/audit`, expanded as an audit spine.
- `backend/src/modules/audit-export`
- `backend/src/modules/audit-integrity`
- Integrates with every module in this plan.

### API Contracts

- `GET /api/audit/events`
- `GET /api/audit/events/:eventId`
- `GET /api/audit/runs/:runId`
- `GET /api/audit/patients/:patientId/access`
- `POST /api/audit/integrity/verify`
- `GET /api/audit/integrity/status`
- `POST /api/audit/export`

Core DTOs:

- `AuditEventDto`
- `AuditEventQueryDto`
- `AiRunAuditTimelineDto`
- `PhiAccessAuditDto`
- `AuditIntegrityStatusDto`
- `AuditExportRequestDto`
- `AuditExportResultDto`

### Data Model

- Existing `audit_logs`: extend metadata conventions while preserving hash-chain fields.
- `audit_event_types`: `id`, `name`, `category`, `schemaVersion`, `requiredFields`.
- `audit_exports`: `id`, `requestedBy`, `query`, `status`, `artifactUri`, `hash`, `createdAt`.
- `audit_integrity_checks`: `id`, `status`, `checkedRangeStart`, `checkedRangeEnd`, `gapCount`, `checkedAt`.

Required metadata fields for AI/platform events:

- `runId`, `capabilityId`, `patientId`, `policyVersion`, `classification`, `model`, `promptVersion`, `route`, `retrievalPolicy`, `toolIds`, `sourceIds`, `reviewItemId`, `consentRecordId`, `phiAccessed`, `finalStatus`.

### Role/Permission Rules

- `VIEW_AUDIT_LOGS`: view non-PHI audit events.
- `VIEW_PHI_AUDIT`: view PHI access timelines.
- `EXPORT_AUDIT_LOGS`: export audit records.
- `VERIFY_AUDIT_INTEGRITY`: run integrity verification.
- Users can view their own limited activity history where appropriate, but compliance views require elevated permissions.

### Safety Requirements

- Audit writes must be best-effort before and after every high-risk operation; failures should block production high-risk actions when policy requires it.
- Audit metadata should avoid storing unnecessary raw PHI; use references, hashes, and redacted snippets where possible.
- Hash-chain/integrity checks must be monitored.
- Every deny, block, validation failure, review decision, consent change, and policy change is auditable.
- Exported audit artifacts must include integrity hashes and access controls.

### Tests

- Audit event schema tests for each module.
- Hash-chain integrity tests and concurrent-write tests.
- AI run timeline reconstruction tests.
- PHI access query tests.
- Audit export permission and artifact hash tests.
- Negative tests proving blocked/denied actions are logged.

### Documentation

- Audit event taxonomy.
- AI run audit schema.
- PHI access log schema.
- Audit export SOP.
- Integrity verification runbook.

### Implementation Phase

- Phase 0: define audit taxonomy and required metadata.
- Phase 1: standardize AI, PHI, governance, review, consent, and integration events.
- Phase 2: add timeline UI, export, and integrity dashboards.

## Module 10: Deployment Observability And Operations Readiness

### Scope And Criticality

Criticality: P0 production blocker.

Goal: make deployments, AI runs, tool execution, integrations, clinical safety events, costs, latency, errors, and degraded states observable before expanding production traffic.

### Route

- `/operations/observability`
- `/operations/deployments`
- `/operations/incidents`
- `/operations/service-health`
- External dashboards under Grafana/Datadog-compatible config.

### Frontend UI

- Service health dashboard with API status, database status, queue health, RAG health, model provider health, FHIR/HL7 health, and orchestrator health.
- AI operations dashboard with run volume, latency, model mix, cost, errors, safety blocks, review backlog, and citation failure rate.
- Deployment page showing version, feature flags, active policy versions, prompt/model versions, migrations, and rollback status.
- Incident panel linking production incidents to audit events, safety findings, and deployment changes.
- `/dashboard` production readiness tile for degraded services and critical incidents.

### Backend Module

- `backend/src/modules/observability`
- `backend/src/modules/deployment-health`
- `backend/src/modules/incidents`
- Integrates with AI Gateway, tool orchestrator, RAG, audit, cost optimizer, FHIR/HL7, validation, and governance.

### API Contracts

- `GET /api/operations/health`
- `GET /api/operations/observability/summary`
- `GET /api/operations/observability/ai-runs`
- `GET /api/operations/observability/orchestrator`
- `GET /api/operations/observability/integrations`
- `GET /api/operations/deployments/current`
- `GET /api/operations/incidents`
- `POST /api/operations/incidents/:incidentId/review`

Core DTOs:

- `OperationsHealthDto`
- `ObservabilitySummaryDto`
- `AiRunMetricsDto`
- `OrchestratorMetricsDto`
- `IntegrationHealthDto`
- `DeploymentVersionDto`
- `IncidentDto`
- `IncidentReviewDto`

### Data Model

- `deployment_versions`: `id`, `version`, `commitSha`, `environment`, `deployedAt`, `deployedBy`, `migrationVersion`, `featureFlags`.
- `service_health_snapshots`: `id`, `service`, `status`, `latencyMs`, `errorRate`, `checkedAt`, `metadata`.
- `operations_incidents`: `id`, `severity`, `status`, `source`, `summary`, `startedAt`, `resolvedAt`, `linkedDeploymentId`.
- `ai_run_metrics`: aggregate or metrics-store-backed records keyed by `runId`, `capabilityId`, `model`, `route`, `status`, `latencyMs`, `costUsd`, `safetyOutcome`.

### Role/Permission Rules

- `VIEW_OPERATIONS`: view service health and deployments.
- `VIEW_OBSERVABILITY`: view metrics dashboards.
- `MANAGE_INCIDENTS`: create, update, and resolve incidents.
- `CONFIGURE_SYSTEM`: change feature flags or deployment policy.
- Clinical users see only user-relevant degraded-mode messages, not internal infrastructure details.

### Safety Requirements

- High-risk capabilities must fail closed or degrade safely when audit, consent, review, model, RAG, or source-provenance dependencies are unavailable.
- Observability labels must avoid raw PHI and high-cardinality patient identifiers.
- Every production deployment records active governance, regulatory, model, prompt, and validation versions.
- Safety events, prompt blocks, review backlog, and consent failures are first-class operational signals.
- Alert thresholds include clinical safety metrics, not only uptime.

### Tests

- Health endpoint contract tests.
- Metrics emission tests for AI Gateway, RAG, orchestrator, review queue, consent, and integrations.
- Degraded-mode tests for unavailable model, RAG, audit, review, consent, and FHIR/HL7 services.
- Deployment metadata tests.
- Incident lifecycle tests.
- Dashboard empty/error state tests.

### Documentation

- Production observability runbook.
- Deployment readiness checklist.
- Incident response guide.
- Metrics and alert taxonomy.
- Degraded-mode behavior guide.

### Implementation Phase

- Phase 0: define health, metrics, and deployment metadata contracts.
- Phase 1: instrument P0 paths and add service health/readiness dashboards.
- Phase 2: add incident workflows, alerting, and advanced AI cost/safety analytics.

## Cross-Module API Event Contracts

All P0 modules should emit normalized events to audit and observability:

- `governance.policy.created`
- `governance.policy.approved`
- `ai.security.blocked`
- `ai.security.redacted`
- `interoperability.import.previewed`
- `interoperability.import.committed`
- `regulatory.classification.approved`
- `equity.finding.opened`
- `validation.run.completed`
- `review.item.created`
- `review.item.decided`
- `consent.changed`
- `privacy.request.created`
- `audit.integrity.checked`
- `deployment.version.activated`
- `operations.incident.opened`

Each event should include `organizationId`, `workspaceId`, `actorUserId`, `patientId` when applicable, `runId`, `capabilityId`, `sourceModule`, `policyVersion`, `phiAccessed`, `severity`, `status`, `metadata`, and `timestamp`.

## Unified Inventory Additions

Add these canonical platform capability IDs:

- `clinical-governance`
- `clinical-release-gates`
- `clinical-safety-findings`
- `ai-security`
- `prompt-firewall`
- `model-access-policy`
- `fhir-connector`
- `hl7-bridge`
- `source-provenance`
- `regulatory-classification`
- `intended-use-registry`
- `equity-monitoring`
- `bias-finding-review`
- `validation-sandbox`
- `synthetic-patient-lab`
- `human-review-queue`
- `consent-center`
- `privacy-center`
- `audit-trail-spine`
- `ai-run-audit-timeline`
- `deployment-observability`
- `operations-incident-center`

Inventory records should include:

- `canonicalInventoryId`
- `displayName`
- `route`
- `sourceKind: platform`
- `executorStatus: platform`
- `riskLevel`
- `criticality`
- `implementationPhase`
- `permissionPolicy`
- `apiClient`
- `endpoint`
- `dashboardPlacement`
- `auditEvents`
- `requiresHumanReview`
- `requiresConsent`
- `regulatoryClassificationRequired`

## AI Assistant Integration

The assistant should treat these modules as guardrails and context providers, not as ordinary chat tools.

Required assistant behavior:

- Every assistant run includes governance policy, regulatory classification, review policy, consent state, and audit metadata in the `AiRunEnvelope`.
- The assistant checks LLM security before retrieval, model calls, memory writes, and tool plans.
- Patient-scoped assistant context requires consent, PHI permission, source provenance, and freshness checks.
- The assistant creates review items for documentation drafts, high-risk recommendations, low-confidence outputs, blocked-action attempts, and external writeback requests.
- The assistant can answer "why was this blocked?", "what policy applies?", and "what needs review?" using governance/audit summaries.
- The assistant must not expose hidden security rules, raw prompts, or unauthorized audit details to non-admin users.

## Backend Orchestrator Integration

The backend tool orchestrator should remain the source of truth for real POST executors. Platform modules integrate around it:

- Clinical governance supplies allowed tools, blocked actions, and review thresholds.
- LLM security prevents untrusted model output from directly invoking executor calls.
- Regulatory classification marks which tool outputs require review or special safety copy.
- Validation sandbox tests executor inputs, outputs, safety framing, and unsupported-tool behavior.
- Human review gates tool results before they are attached to patients or exported when policy requires it.
- Audit trail records validation, execution, failure, unsupported requests, and review disposition.
- Observability records executor latency, error rate, validation failure rate, and safety block rate.

Do not add `/api/tools/:id/execute` claims for platform modules unless a real `registerTool()` implementation exists.

## Dashboard Integration

Dashboard placement:

- `/dashboard`: production readiness tile, critical blocker count, open high-severity review items, degraded service status, and AI safety event summary.
- `/governance`: clinical governance, regulatory classification, AI security, equity, validation, and safety findings.
- `/review`: human review queue and patient-linked review workflows.
- `/privacy` and `/consent`: privacy center and consent manager.
- `/integrations`: FHIR, HL7, source provenance, and import monitoring.
- `/audit`: audit search, AI run timeline, PHI access logs, and integrity checks.
- `/operations/observability`: deployment health, incidents, service status, and AI operations metrics.
- `/tools/catalog`: developer/source truth only, including inventory and executor status; do not mix clinician governance workflows into the catalog.

## Implementation Roadmap

### Phase 0: Production Readiness Contracts

- Add canonical capability IDs and inventory metadata for all modules.
- Define permissions, DTOs, data models, audit event taxonomy, and readiness gates.
- Define P0 safety policy: no production AI capability without governance, classification, audit, consent checks, review policy, and observability.
- Add docs and contract tests proving planned platform modules are not advertised as POST executors.

Exit criteria:

- Every module in this plan has an approved contract.
- Every production clinical capability has required metadata or is blocked from production exposure.
- Readiness dashboard can identify missing P0 blockers.

### Phase 1: P0 Control Plane

- Implement clinical governance, regulatory classification, LLM security, audit spine, consent/privacy gates, human review queue, and deployment observability minimums.
- Add gateway enforcement for policy, consent, review, model access, blocked actions, and audit.
- Add review gating for clinical AI and documentation drafts.
- Add production health/readiness dashboard.

Exit criteria:

- High-risk AI outputs cannot bypass review.
- Consent failures, security denials, policy denials, and audit failures are visible and enforced.
- Deployment readiness fails closed when P0 modules are missing.

### Phase 2: Interoperability And Validation Foundations

- Implement FHIR/HL7 mock connectors, source provenance, import previews, and quarantine basics.
- Implement validation sandbox with synthetic patients, scenarios, and release-gate evidence.
- Add equity baseline metrics and missingness monitoring.

Exit criteria:

- External patient data is never displayed without source provenance.
- New AI/prompt/tool/integration changes require validation evidence before activation.
- Baseline cohort safety metrics exist for clinical AI workflows.

### Phase 3: Controlled Pilot Hardening

- Add full review SLAs, notifications, escalation, governance reports, and validation automation.
- Add observability drilldowns by `runId`, `capabilityId`, model, route, tool, and integration.
- Add FHIR/HL7 production connector hardening, replay preview, and interface health dashboards.
- Add privacy request lifecycle and audit exports.

Exit criteria:

- Pilot operations can be monitored, audited, reviewed, and paused quickly.
- Governance committee can review evidence, safety findings, equity reports, and deployment history.

### Phase 4: Enterprise Scale

- Add multi-tenant policy inheritance, advanced equity analytics, certification workflows, multi-region compliance packages, and external audit exports.
- Add blue/green model and prompt rollout governance.
- Add incident automation and richer operational analytics.

Exit criteria:

- Enterprise administrators can manage policies, audits, connectors, observability, and fairness monitoring across organizations.

## Acceptance Criteria

- The plan identifies P0 production blockers, P1 pilot requirements, P2 enterprise scale work, and P3 later expansion.
- Each module defines route, frontend UI, backend module, API contracts, data model, role/permission rules, safety requirements, tests, documentation, and implementation phase.
- Every module explains how it integrates with unified inventory, AI assistant, backend orchestrator, and dashboards.
- Platform modules are not misrepresented as registered backend tool executors.
- Critical workflows fail closed when governance, consent, audit, review, security, or observability dependencies are unavailable.
- FHIR/HL7 workflows preserve source provenance and require preview/confirmation before writeback.
- Human review gates high-risk AI, documentation, external writeback, privacy requests, and release decisions.
- Audit trails can reconstruct AI runs, PHI access, policy changes, review decisions, consent changes, integration events, and deployments.
- Equity, validation, and observability are treated as safety systems, not optional analytics.
