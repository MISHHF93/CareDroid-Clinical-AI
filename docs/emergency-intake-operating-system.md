# Emergency Intake Operating System

## Goal

Create the Emergency Intake OS as a subsystem of the Emergency Department OS.

The subsystem should unify intake automation, document processing, identity resolution, patient context, medication and allergy capture, verification, and analytics into one operational product that feeds the broader Emergency Department Operating System.

## Unified Capabilities

The Emergency Intake OS should unify:

- Smart Intake
- Document Intelligence
- Identity Resolution
- Patient Snapshot
- Medication Capture
- Allergy Capture
- Verification
- Intake Analytics

## Operating Model

The Emergency Intake OS should turn arrival and registration into a measurable, governed workflow:

- Patients arrive through walk-in, referral, EMS, transfer, kiosk, tablet, QR code, or receptionist-assisted intake paths.
- Smart Intake captures administrative and demographic information.
- Document Intelligence processes patient-provided and external documents.
- Identity Resolution reduces duplicate record risk.
- Verification confirms extracted and prefilled values before they become operational data.
- Patient Snapshot summarizes available context for clinician review.
- Medication Capture and Allergy Capture surface high-risk information early.
- Intake Analytics measures performance, bottlenecks, and completion rates.

## Emergency Department OS Integration

The Emergency Intake OS should feed the Emergency Department OS through the Patient Journey Engine.

Integrated intake signals should support:

- Arrival state tracking.
- Registration and verification progress.
- Door-to-triage measurement.
- Patient context generation.
- Pre-triage queue readiness.
- Command center visibility.
- Intake analytics and operational improvement.
- Downstream assessment and disposition context.

## Governance Requirements

The subsystem should preserve governance across all intake automation:

- Patient confirmation for extracted or prefilled intake data.
- Consent capture where required.
- Source attribution for generated, extracted, or imported values.
- Audit logging for field changes and review actions.
- Correction workflow for inaccurate or disputed information.
- Clinician or staff review for clinical context before downstream use.

No intake automation should bypass verification, silently finalize demographic changes, autonomously reconcile medications, confirm allergies without review, merge identity records without appropriate review, or make triage decisions.

## Product Surfaces

The Emergency Intake OS should connect the following surfaces:

- Intake dashboard.
- Intake analytics dashboard.
- Patient context workspace.
- Pre-triage queue.
- Registration completion views.
- Document review workspace.
- Identity resolution review.
- Medication and allergy capture review.
- Emergency command center and Patient Journey Engine views.

## Product Boundary

The Emergency Intake OS is an operational intake subsystem. It does not diagnose, assign acuity, determine treatment, authorize coverage, or replace clinician assessment.

Its purpose is to reduce administrative burden, improve early context availability, make bottlenecks visible, and hand off governed intake data into the Emergency Department Operating System.

## Acceptance

The Emergency Intake OS is ready when:

- Smart Intake, Document Intelligence, Identity Resolution, Patient Snapshot, Medication Capture, Allergy Capture, Verification, and Intake Analytics operate as one subsystem.
- Intake activity feeds the Patient Journey Engine and Emergency Department OS.
- Intake dashboards, patient context, queues, and analytics share a consistent operational model.
- Governance requirements remain attached to intake-derived data.
- Emergency Intake becomes a complete operational product that feeds the Emergency Department Operating System.
