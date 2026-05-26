# Clinical Policy Authoring Guide

## Purpose

This guide defines the minimum content and review standard for CareDroid clinical governance policies. Policies bind intended use, model and prompt constraints, review thresholds, blocked actions, and safety evidence to a specific platform capability.

## Policy Identity

Each policy must include:

- `capabilityId`: stable platform capability identifier.
- `policyType`: clinical safety, model access, prompt governance, privacy, integration, or release control.
- `version`: immutable semantic or dated version.
- `status`: `draft`, `active`, `revoked`, or equivalent platform state.
- `organizationId`: tenant or institution scope when applicable.
- `createdBy`, `approvedBy`, `effectiveAt`, and `retiredAt` when known.

## Required Content

- Intended use: clinician-facing task, user population, patient population, and supported workflow context.
- Excluded uses: clinical scenarios, populations, sites of care, acuity levels, or actions that are out of scope.
- Human review policy: review triggers, reviewer role, decision options, escalation path, and maximum wait time.
- Blocked actions: actions the gateway and orchestrator must deny before model or tool execution.
- Model and prompt constraints: approved providers, model versions, prompt versions, data classes, retention posture, and fallback rules.
- PHI and consent scope: required consent purpose, allowed data classes, retention, export, delete, and access-log behavior.
- Evidence requirements: validation scenarios, safety findings, audit sampling, regulatory classification, equity checks, and observability monitors.
- Rollback rules: activation stop conditions, downgrade path, owner, and notification plan.

## Authoring Steps

1. Start from the current active policy, if one exists, and copy only still-valid constraints.
2. State the clinical workflow in plain language before adding implementation details.
3. Define allowed and excluded use with testable statements.
4. Add blocked actions using registry identifiers so enforcement can be checked automatically.
5. Map each high-risk behavior to a validation scenario or human review requirement.
6. Link the policy to the regulatory classification, release gate, and relevant safety findings.
7. Request clinical safety and privacy review before approval.
8. Activate only after the release gate passes.

## Approval Standard

Approval means the reviewers agree that the policy is specific, testable, enforceable, and aligned with the current capability implementation. High-risk clinical workflows require dual approval from a clinical safety reviewer and a governance or compliance owner.

## Quality Checklist

- The policy names the exact capability and workflow it governs.
- Intended use and excluded use are not vague or contradictory.
- Blocked actions use the canonical registry terms.
- Human review triggers are explicit.
- PHI and consent requirements are stated.
- Validation and audit evidence are linked.
- Rollback conditions are operationally actionable.
- No policy grants autonomous clinical authority.
