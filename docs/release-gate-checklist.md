# Release Gate Checklist

## Purpose

Use this checklist before activating or materially changing a CareDroid platform capability, model, prompt, tool, route, integration, policy binding, or deployment configuration that can affect clinical workflows, PHI, safety, privacy, auditability, or external system behavior.

## Gate Intake

Every release gate should capture:

- `capabilityId` and owning team.
- Change type: model, prompt, tool, route, policy, integration, deployment, data source, or review workflow.
- Artifact version: build, prompt version, model policy, migration, connector version, or route contract.
- Risk level and regulatory classification.
- Linked validation run, policy version, safety findings, review items, audit records, and observability monitors.
- Required approvers and decision deadline.

## Preconditions

- Active or proposed governance policy exists for the capability.
- Regulatory classification is present for P0, PHI, patient-context, or clinical decision support workflows.
- Required consent and privacy checks are implemented for PHI workflows.
- Blocked actions are enforced by the AI Gateway or backend orchestrator before model/tool execution.
- Validation scenarios cover normal operation, fail-closed behavior, prompt injection, PHI minimization, and unsafe action attempts.
- Audit events include enough detail to reconstruct the change and runtime decision path.
- Observability includes error, latency, cost, degraded-mode, safety event, and blocked-action signals.

## Reviewer Checklist

- Intended use is unchanged or explicitly updated in the policy and classification.
- Excluded use remains enforceable.
- Human review triggers match the current risk level.
- No unresolved high-severity safety finding affects the capability.
- Prompt, model, and tool versions are pinned or otherwise traceable.
- Synthetic patient and integration tests passed for relevant workflows.
- Permission changes are covered by RBAC tests or equivalent review.
- Any accepted residual risk has an owner, expiry, and compensating control.
- Rollback can be executed without losing audit continuity.

## Decision Outcomes

- Approved: all required evidence is present and reviewers accept the residual risk.
- Approved with conditions: activation is allowed only with named compensating controls and an expiry.
- Blocked: activation is denied until blockers are resolved.
- Rolled back: a previously approved activation is reverted because safety, privacy, policy, audit, or availability conditions changed.

## Fail-Closed Conditions

The gate must fail closed if any of these conditions are true:

- Active policy or regulatory classification is missing when required.
- Consent status cannot be verified for PHI workflows.
- Validation dependencies are unavailable.
- Audit writes fail for governed actions.
- Prompt security or blocked-action enforcement is bypassed.
- Required human review queue is unavailable.
- The deployment cannot emit observability events for gate decisions.

## Post-Release Monitoring

For the first release window after approval, monitor gate decisions, security events, safety findings, review queue backlog, audit sampling, equity signals, integration provenance, latency, cost, and degraded-mode behavior. Reopen the gate if any high-severity finding, PHI incident, autonomous action attempt, or policy drift appears.
