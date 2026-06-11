# Consent And Verification Framework

## Goal

Ensure all intake automation remains compliant and governance-ready.

The framework should make patient confirmation, consent capture, audit logging, source attribution, and correction workflows required parts of automated intake.

## Requirements

The Consent And Verification Framework requires:

- Patient confirmation
- Consent capture
- Audit logging
- Source attribution
- Correction workflow

## Verification Rule

No demographic extraction should bypass verification.

Extracted demographic, identity, contact, identifier, insurance, and intake fields should remain proposed values until confirmed by the patient, an approved representative, or authorized staff according to local policy.

## Patient Confirmation

Patient confirmation should record:

- Which fields were confirmed.
- Who confirmed the fields.
- When confirmation occurred.
- Whether confirmation was completed by the patient, representative, or staff.
- Any fields the patient disputed, corrected, or declined to answer.

## Consent Capture

Consent capture should record the patient's acknowledgement or consent for applicable intake workflows, forms, document processing, communications, and administrative use cases.

Consent records should preserve:

- Consent type.
- Consent status.
- Consent text or policy version when available.
- Capturing user or channel.
- Timestamp.
- Revocation or correction state when applicable.

## Audit Logging

Audit logging should preserve a durable record of intake automation activity:

- Field extracted.
- Source used.
- Suggested value.
- Validation result.
- Reviewer action.
- Confirmed value.
- Correction action.
- User or system actor.
- Timestamp.

Audit logs should make it possible to reconstruct how an intake field moved from source material to proposed value to confirmed record.

## Source Attribution

Every extracted or prefilled value should retain source attribution when available.

Sources may include patient-entered forms, scanned documents, OCR output, prior records, integration payloads, receptionist entry, kiosk entry, tablet intake, QR code intake, or staff correction.

## Correction Workflow

The correction workflow should allow authorized users to:

- Edit inaccurate extracted values.
- Mark values as rejected.
- Resolve conflicting source values.
- Record patient-requested corrections.
- Reconfirm corrected fields.
- Preserve the original source and correction history.

## Governance Boundary

The framework applies to intake and registration automation. It does not authorize silent demographic updates, clinical decisions, coverage determinations, or irreversible changes without review.

Automation may assist capture and organization, but governance remains anchored in confirmation, consent, traceability, and correction.

## Acceptance

The Consent And Verification Framework is ready when:

- Patient confirmation, consent capture, audit logging, source attribution, and correction workflow are required for intake automation.
- No demographic extraction can bypass verification.
- Extracted values preserve source and review history.
- Corrections are auditable and reconfirmable.
- Automation remains governance-ready.
