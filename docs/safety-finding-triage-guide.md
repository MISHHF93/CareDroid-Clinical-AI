# Safety Finding Triage Guide

## Purpose

Safety findings capture clinical, privacy, security, review, audit, equity, integration, or deployment issues that could make a CareDroid capability unsafe or non-compliant. This guide defines how findings are classified, assigned, resolved, and linked back to release gates.

## Required Finding Fields

- `runId`: runtime or validation run reference when available.
- `capabilityId`: affected capability.
- Severity: critical, high, medium, or low.
- Finding type: clinical safety, prompt security, PHI, consent, regulatory, equity, validation, audit, integration, observability, or workflow.
- Source: validation, runtime gate, reviewer, audit sample, incident, user report, or deployment monitor.
- Description: concise statement of the unsafe or non-compliant condition.
- Owner and due date.
- Status: new, needs review, blocked, resolved, accepted risk, or revoked.
- Resolution evidence and linked release gate.

## Severity Rubric

- Critical: actual or likely patient harm, PHI exposure, autonomous side effect, tenant leakage, unsafe EHR writeback, unauthorized patient outreach, or inability to audit governed actions.
- High: blocked action attempt, missing active policy/classification for PHI or P0 workflows, failed validation for high-risk workflow, unresolved prompt-injection path, or unavailable human review for required workflows.
- Medium: incomplete evidence, stale policy copy, degraded observability, delayed review SLA, non-critical consent ambiguity, or equity signal requiring investigation.
- Low: documentation mismatch, cosmetic UI issue in governance views, non-blocking metadata gap, or improvement opportunity with no immediate safety impact.

## Triage Workflow

1. Confirm the affected `capabilityId`, runtime context, patient or PHI scope, and whether the finding occurred in validation, pilot, or production.
2. Assign severity using the rubric. Escalate if severity is uncertain.
3. Determine immediate containment: block gate activation, disable route, require human review, revoke policy, quarantine connector payloads, or keep monitoring.
4. Assign an owner and due date. Critical and high findings must have a named owner before the triage session ends.
5. Link evidence: logs, audit events, validation runs, screenshots, policy versions, consent records, source provenance, and reviewer notes.
6. Decide whether a release gate must be opened, blocked, or re-reviewed.
7. Record resolution, accepted residual risk, or rollback action.
8. Verify closure with the reviewer who owns the relevant safety domain.

## SLA Targets

- Critical: contain immediately, owner within 1 hour, governance review same day.
- High: owner within 1 business day, mitigation plan within 2 business days.
- Medium: owner within 3 business days, review in the next governance cycle.
- Low: backlog with an owner and target release window.

## Closure Criteria

A finding can close only when the unsafe condition is removed, blocked, or formally accepted with residual risk controls. Closure evidence should include the policy or code change, validation result, audit reference, reviewer decision, and any release gate decision affected by the finding.

## Escalation Triggers

- Patient harm or likely patient harm.
- PHI leakage or unauthorized PHI access.
- Blocked action enforcement failure.
- Repeated prompt injection success.
- Missing audit trail for governed runtime action.
- Consent bypass for patient-context workflow.
- High-severity finding reopened after release.
