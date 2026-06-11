# Pre-Triage Queue Builder

## Goal

Create structured triage queues so triage staff start with organized information before assessment begins.

The queue builder should assemble intake, demographics, complaint, and risk indicators into a reviewable Pre-Triage Queue without making autonomous triage decisions.

## Inputs

The Pre-Triage Queue Builder should use:

- Intake
- Demographics
- Complaint
- Risk indicators

## Output

Generate `Pre-Triage Queue` as the canonical queue artifact for patients awaiting triage.

The queue should include:

- Patient identity and demographic summary.
- Arrival or intake timestamp.
- Chief complaint or arrival reason when available.
- Captured risk indicators.
- Missing or unconfirmed intake fields.
- Source and confirmation status when available.

## Queue Behavior

The Pre-Triage Queue should help staff scan and prepare:

- Group patients awaiting triage.
- Surface available complaint context.
- Highlight confirmed and pending risk indicators.
- Show unresolved intake gaps that may matter during triage.
- Preserve the order and operational metadata needed by staff.
- Keep all queue information editable or reviewable by authorized users.

## Decision Boundary

No autonomous triage decisions.

The queue builder must not assign acuity, diagnose, determine priority, route a patient to treatment, trigger clinical escalation, or replace triage nurse assessment. It may organize and display information for human review only.

## Safety Boundary

The Pre-Triage Queue Builder is an operational organization layer. It supports triage readiness but does not perform triage.

Triage staff remain responsible for assessment, prioritization, escalation, and documentation according to local policy.

## Acceptance

The Pre-Triage Queue Builder is ready when:

- Intake, demographics, complaint, and risk indicators feed a structured queue.
- A Pre-Triage Queue is generated.
- The system makes no autonomous triage decisions.
- Triage staff start with organized information.
