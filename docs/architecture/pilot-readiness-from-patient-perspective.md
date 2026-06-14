# Pilot Readiness From Patient Perspective

Generated: 2026-06-14

## Patient-Centered Strengths

The active system presents a coherent ED journey from arrival through discharge/admission using one shell and one route family. Patients can enter through Central Intake, Smart Intake, or EMS. Staff can see identity, complaint, acuity, wait time, reassessment needs, referral/admission status, assigned staff, location, and safety flags on patient cards.

The Whiteboard and Header keep department-wide bottlenecks visible: waiting patients, EMS pressure, reassessment due, capacity score, boarders, referrals pending, and alerts.

## Safety Strengths

Smart Intake keeps identity decisions human-reviewed. Copilot messaging and backend services preserve human-review disclaimers. Public screen modes redact patient-sensitive data. Reassessment, sepsis/deterioration, long wait, EMS arrival, and pending admission flags are visible in patient cards and central summaries.

## Flow Strengths

The application supports front-door movement, EMS arrival/handoff, queue review, reassessment, provider assessment, orders/results visibility, referral/consult workflows, disposition, boarding/admission, and discharge-ready visibility.

## Pilot Limitations

- Core Emergency OS backend endpoints are enabled but demo/fixture-backed.
- Provincial health, FHIR/HL7, and device telemetry are visible as placeholders or demo-ready sources, not production integrations.
- Optional transfer workflow, referral history, diversion status, capacity history, queue analytics, and shift export capabilities remain disabled or review-only.
- Analytics is a retained direct route but hidden from pilot primary navigation by `PILOT_CUSTOMER_MODE`.
- Settings is a retained direct/admin route but hidden from pilot primary navigation.

## Readiness Judgment

The current source is pilot-ready as a walkthrough and validation harness for patient-centered ED flow, operational awareness, and human-reviewed decision support. It is not production-ready for live clinical operations without real integration credentials, persistence hardening, measured model validation, production identity management, and clinical governance sign-off.
