# Emergency Registration Accelerator

## Goal

Minimize registration friction in the Emergency Workspace so patients can complete required registration steps faster and more consistently.

The accelerator should support multiple intake modes while preserving a shared registration model, completion tracking, and review visibility for staff.

## Supported Intake Modes

The Emergency Registration Accelerator should support:

- Self-service kiosk
- Tablet intake
- QR code intake
- Receptionist-assisted intake

Each mode should feed the same registration workflow so completion status, missing fields, and confirmed information remain consistent across entry points.

## Registration Completion Score

Generate `Registration Completion Score` as the canonical readiness signal for registration.

The score should reflect:

- Required demographic fields completed.
- Identity fields captured or confirmed.
- Contact information captured or confirmed.
- Emergency contact status.
- Insurance metadata status when available.
- Required acknowledgements or administrative forms completed.
- Unresolved conflicts, missing fields, or unconfirmed values.

The score should make incomplete registration work visible without blocking urgent clinical workflows when emergency care must proceed.

## Workflow Behavior

The registration workflow should:

- Let patients begin intake before arrival through QR code intake when available.
- Let patients complete intake on shared devices through kiosk or tablet modes.
- Let receptionists assist patients who cannot or should not complete self-service intake.
- Reuse confirmed values instead of asking for the same information repeatedly.
- Highlight missing, conflicting, or unconfirmed fields for staff follow-up.
- Preserve source and confirmation state for each registration field.

## Staff Visibility

Registration staff should be able to see:

- Current intake mode.
- Registration Completion Score.
- Completed fields.
- Missing required fields.
- Fields needing confirmation.
- Conflicting information.
- Administrative blockers that require follow-up.

## Safety And Access Boundary

The Emergency Registration Accelerator is an administrative workflow layer. It does not triage patients, determine acuity, delay emergency treatment, diagnose conditions, or make clinical decisions.

The workflow should support fast registration while keeping emergency care access and patient safety first.

## Acceptance

The Emergency Registration Accelerator is ready when:

- Self-service kiosk, tablet intake, QR code intake, and receptionist-assisted intake are supported.
- A Registration Completion Score is generated.
- Staff can see missing, conflicting, and unconfirmed registration work.
- Registration becomes faster and more consistent.
