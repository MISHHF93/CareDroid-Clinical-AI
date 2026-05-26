# Intended-Use And Blocked-Action Registry

## Purpose

This registry gives policy authors, reviewers, and implementers the canonical language for CareDroid intended use, excluded use, and blocked actions. Governance policies, regulatory classifications, release gates, tests, AI Gateway checks, and backend orchestrator checks should use these terms consistently.

## Platform Intended-Use Baseline

CareDroid provides clinician-facing decision support, workflow assistance, safety checks, retrieval, documentation drafting, operational insight, and governed platform controls. Outputs are advisory unless a policy explicitly marks them as administrative automation with no clinical side effect.

CareDroid does not replace clinician judgment. A licensed clinician or authorized operator remains responsible for diagnosis, orders, prescribing, patient communication, documentation signature, and external system writeback.

## P0 Capability Registry

These capabilities require active governance policy and active regulatory classification before controlled pilot or production use:

- `clinical-governance`: policy, release gate, and safety finding operations.
- `ai-security`: prompt firewall, PHI protection, model access, and unsafe tool control.
- `regulatory-classification`: intended-use and risk classification for clinical workflows.
- `equity-monitoring`: cohort performance, missingness, and bias monitoring.
- `validation-sandbox`: synthetic scenario validation before release.
- `human-review-queue`: required review for high-risk AI output and side-effecting workflows.
- `consent-center`: patient consent scope for AI, documentation, and data use.
- `privacy-center`: patient data export, delete, access transparency, and retention controls.
- `audit-trail-spine`: AI, PHI, policy, review, consent, integration, and deployment event reconstruction.
- `deployment-observability`: runtime health, safety events, degraded modes, and incident signals.
- `source-provenance`: FHIR, HL7, import, and external data source traceability.

## Canonical Blocked Actions

The following actions must be blocked before model or tool execution unless a future approved policy explicitly defines a safe, audited, human-confirmed variant:

- `autonomous_clinical_decision`: making or presenting a final diagnosis, treatment decision, disposition, or risk determination as autonomous.
- `ehr_writeback_without_confirmation`: writing to an EHR, chart, order queue, registry, or external clinical system without explicit authorized confirmation.
- `auto_sign_documentation`: signing, attesting, or finalizing clinical documentation on behalf of a clinician.
- `submit_prior_authorization`: submitting payer, authorization, appeal, or coverage documentation without governed review and authorization.
- `patient_outreach_without_review`: contacting a patient, proxy, or caregiver without required review, consent, and communication authorization.

## Excluded-Use Language

Policies should include excluded-use text when any of these conditions apply:

- The output could be interpreted as diagnosis, prescribing, order placement, or disposition without clinician review.
- The workflow involves emergency care, unstable patients, pediatric patients, pregnancy, behavioral health crisis, or other high-risk populations outside validated scope.
- The workflow depends on stale, incomplete, synthetic, imported, or unverified patient data.
- The workflow could disclose PHI across tenant, workspace, patient, caregiver, or integration boundaries.
- The workflow could trigger an external side effect such as EHR writeback, patient communication, billing, payer submission, device control, or care-team notification.

## Enforcement Expectations

- AI Gateway checks must return a blocked decision when required active policy, classification, consent, or prompt-security review is missing.
- Backend orchestrator checks must reject blocked actions before executing tools or external integrations.
- Release gates must include validation evidence for every blocked-action pathway relevant to the capability.
- Audit events must record the `runId`, `capabilityId`, action, decision, reasons, policy version when available, and whether PHI was accessed.
- UI copy must not imply autonomous diagnosis, prescribing, ordering, documentation signing, or patient outreach.

## Registry Change Control

Changes to this registry require clinical safety and governance review. Adding a blocked action should trigger enforcement and test updates. Removing or narrowing a blocked action requires a release gate, active policy update, regulatory review, and explicit rollback plan.
