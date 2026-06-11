# Patient Intake Analytics

## Goal

Measure intake performance so operational improvements become visible and measurable.

Patient Intake Analytics should turn registration, verification, document processing, and triage readiness activity into clear operational metrics for the Emergency Workspace.

## Metrics

Patient Intake Analytics should track:

- Average registration time
- Average verification time
- Intake completion rate
- Document processing volume
- Triage readiness time

## Dashboard

Display the analytics dashboard at:

`/workspace/emergency/intake-analytics`

The dashboard should show intake performance over the selected operating window and make delays, throughput, and completion trends easy to understand.

## Metric Definitions

Average registration time measures the time from registration start to registration completion.

Average verification time measures the time from verification start to verification completion for identity, demographic, document, or intake field review.

Intake completion rate measures the percentage of started intake workflows that reach completion with required fields resolved or appropriately marked for follow-up.

Document processing volume measures the number of patient-provided or external documents captured, OCR-processed, extracted, validated, or reviewed.

Triage readiness time measures the time from patient arrival or intake start to the patient becoming ready for triage queue placement.

## Operational Views

The dashboard should support:

- Current day and active shift performance.
- Trend views over time.
- Intake mode comparison when available.
- Registration and verification bottleneck visibility.
- Document processing throughput.
- Triage readiness delays.
- Completion rate by workflow stage.

## Governance Boundary

Patient Intake Analytics is an operational measurement layer. It does not diagnose, assign acuity, prioritize patients clinically, or replace staff review.

Analytics should help leaders and staff identify workflow improvements while preserving patient safety, privacy, and auditability.

## Acceptance

Patient Intake Analytics is ready when:

- Average registration time, average verification time, intake completion rate, document processing volume, and triage readiness time are tracked.
- The dashboard is available at `/workspace/emergency/intake-analytics`.
- Staff can see intake delays, throughput, and completion trends.
- Operational improvements become measurable.
