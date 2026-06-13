# CareDroid Enterprise AI Governance Policy

## 1. Purpose And Scope

This policy defines how CareDroid governs artificial intelligence across Emergency OS and related clinical platform services. It applies to generative AI, rules engines, predictive models, embeddings, identity matching, prompt templates, clinical documentation, triage support, operational copilots, and any workflow that can influence clinical operations.

The implementation source of truth is `backend/src/config/ai-governance.registry.ts`, surfaced through `backend/src/config/ai.config.ts`, enforced by `backend/src/services/ai-governance.service.ts`, and exposed through `/api/v1/governance/*` plus `/api/emergency/governance/*` compatibility endpoints.

## 2. Standards Alignment

CareDroid AI governance is aligned to:

- NIST AI RMF: governed inventory, mapped risks, measured controls, managed incidents, and recurring validation.
- WHO guidance for AI in healthcare: human autonomy, safety, transparency, accountability, inclusiveness, and sustainable deployment.
- HIPAA Security Rule: access control, audit controls, integrity controls, transmission security, and incident procedures for PHI-adjacent AI workflows.
- FDA SaMD principles: intended use, risk categorization, validation evidence, change control, monitoring, and human oversight for clinical decision support.

## 3. Governed Service Inventory

The enterprise registry includes ED Copilot, Smart Handover, Protocol Trigger, Deterioration Prediction, Discharge Prediction, Admission Prediction/START-AI, Triage Support, Ambient Documentation, Clinical Text Mining, and MoH Patient Matching. Each service entry must include provider, model, purpose, owner, risk level, regulatory category, human-review requirement, rate limits, safety constraints, fallback status, and audit level.

No AI service may be launched, exposed in navigation, or integrated into workflow automation unless it has an active registry entry and a documented owner.

## 4. Safety Rules Enforced In Code

The runtime safety rules are not documentation-only. `AIGovernanceService.checkSafetyViolation()` blocks priority-lowering actions for DPS 1 or DPS 2 patients and enforces required disclaimers for clinical recommendations. Registered prompt templates are validated through `/api/v1/governance/validate-prompts`.

Required disclaimers:

- Human review required
- Not a replacement for clinical judgment
- AI-generated content - verify before acting

Priority lowering is prohibited for DPS 1 or DPS 2 patients, stroke, sepsis, chest pain, and abnormal vital-sign contexts defined by the registry.

## 5. Human Review

Human review is mandatory before acting on outputs from Smart Handover, Deterioration Prediction, Discharge Prediction, Admission Prediction/START-AI, Triage Support, Ambient Documentation, and MoH Patient Matching. Rule-based protocol triggers may alert without prior human review but require clinician acknowledgement before treatment, disposition, or acuity changes.

AI output must be presented as advisory. It may support triage, documentation, queue awareness, capacity planning, handover, or identity review, but it cannot independently diagnose, prescribe, discharge, assign acuity, merge patient records, or write back clinical orders.

## 6. Prohibited Uses

The following uses are prohibited:

- Autonomous clinical decision-making or treatment planning.
- Autonomous medication, order, diagnosis, discharge, or admission decisions.
- Lowering priority based on AI alone.
- Autonomous identity matching, patient merge, or external record import.
- Hidden AI output that is not visible to the responsible clinician.
- Use of unregistered prompts, models, or providers in clinical workflows.
- Use of frontend-exposed provider API keys for patient or operational AI.

## 7. Audit And Retention

AI audit records must capture timestamp, user ID, role, service name, input/output envelope, safety result, violation details, human-review state, reviewer, latency, and cost when available. Compliance reports aggregate total interactions, service usage, violations, latency, human-review rate, cost, and top users.

Retention target is seven years. The current implementation uses an auditable in-memory fixture repository for local validation and dashboard wiring; production must replace this with the platform audit/data-source pattern before live clinical deployment.

## 8. Incident Response

Safety violations trigger immediate audit logging, escalation to clinical leadership, privacy/compliance review when PHI is involved, and remediation tracking. High-severity incidents require review within 24 hours, prompt/model rollback if needed, affected-service disabling if the risk cannot be contained, and follow-up validation before reactivation.

## 9. Validation Schedule

Generative prompt templates must be validated at every release and at least quarterly. High-risk clinical decision support and identity-resolution services require monthly safety review until production evidence supports a longer interval. Medium-risk predictive services require quarterly review. Low-risk extraction or informational services require semiannual review.

Validation evidence must include intended use, test cases, failure modes, bias/equity review where applicable, clinical owner approval, prompt-template validation, safety-rule verification, and audit logging verification.

## 10. Compliance Reporting

The AI Governance Dashboard at `/ai-governance` presents compliance summary, interactions by service, safety rules, service inventory, source state, and prompt-validation status. Quarterly reports are provided to the Hospital AI Committee, Quality and Safety Board, Compliance Officer, Privacy Officer, and Clinical Informatics owner.

## 11. Ownership

Policy owner: Clinical Informatics  
Operational owner: Emergency OS Product and Clinical Safety  
Compliance owner: Privacy and Security Office  
Contact: ai-governance@caredroid.com  
Effective date: 2026-06-13  
Review date: 2026-12-13
