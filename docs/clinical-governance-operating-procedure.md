# Clinical Governance Operating Procedure

## Purpose

This operating procedure defines how CareDroid governance owners move clinical AI capabilities from draft to controlled pilot or production use. It applies to platform capabilities that can touch PHI, patient context, clinical recommendations, clinician-facing AI output, external integrations, review queues, audit trails, or deployment safety controls.

CareDroid remains clinical decision support. It must not autonomously diagnose, prescribe, place orders, alter charts, export documentation, submit prior authorization, sign documentation, or contact patients without explicit governed review and confirmation.

## Required Roles

- Governance owner: owns policy content, readiness review, and final operational acceptance.
- Clinical safety reviewer: validates intended use, excluded use, escalation rules, and human review requirements.
- Technical owner: owns evidence for model, prompt, tool, route, integration, and deployment changes.
- Privacy or compliance reviewer: confirms consent, PHI scope, retention, and audit requirements.
- Release approver: approves or rejects gate decisions after evidence review.

## Operating Cadence

- Daily during active release preparation: review new blockers, unresolved safety findings, high-risk review items, and failed validation scenarios.
- Weekly during controlled pilot: review readiness status, policy drift, audit samples, security events, equity metrics, and observability incidents.
- Immediately after any high-severity incident: freeze affected capability activation, open a safety finding, and require release gate re-approval before reactivation.

## Standard Workflow

1. Register the capability in the platform inventory with a stable `capabilityId`, owner, route, endpoint, permission policy, audit events, criticality, and source provenance requirements.
2. Create or update the governance policy as `draft`, including intended use, excluded use, review thresholds, blocked actions, model and prompt constraints, and emergency escalation rules.
3. Add or update the regulatory classification with risk level, jurisdiction, intended use, excluded uses, and human review requirement.
4. Run validation scenarios for the capability, including synthetic PHI, prompt-injection attempts, unsafe action attempts, and expected fail-closed behavior.
5. Confirm consent and privacy controls for any workflow that uses patient context or PHI.
6. Open a release gate with evidence links for validation, review, audit, policy, privacy, security, and deployment observability.
7. Resolve safety findings before approval, or document accepted residual risk with an owner, expiry, and compensating control.
8. Activate the policy only after required approvals are recorded and the release gate passes.
9. Monitor audit, observability, security, review, and equity signals after activation.

## Readiness Rules

- Active governance policy is required for P0 platform capabilities and any capability that accesses PHI.
- Active regulatory classification is required for P0 platform capabilities and any capability that accesses PHI.
- Active consent is required when patient context or PHI is used.
- Prompt security review is required when prompt-injection or data-exfiltration indicators are detected.
- Release gates fail closed if policy, classification, consent, validation, review, audit, or observability dependencies are unavailable.

## Incident And Emergency Handling

- High-severity safety findings block new activations for the affected capability until triaged.
- Emergency escalation rules cannot be disabled by cost, convenience, or availability settings.
- Any incident involving PHI exposure, unsafe clinical action, autonomous side effect, tenant leakage, or blocked action bypass requires compliance notification and a release gate re-review.
- Temporary mitigation must include an owner, expiry, rollback condition, and audit reference.

## Audit Expectations

Governance operations must preserve enough evidence to reconstruct who authored, reviewed, approved, activated, blocked, or rolled back a policy or release gate. Relevant records should include `runId`, `capabilityId`, patient scope when applicable, policy version, model or prompt version, reviewer identity, decision, timestamp, and linked safety findings.
