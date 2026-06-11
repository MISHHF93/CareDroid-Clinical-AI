# Instant Patient Context

## Goal

Generate a patient summary immediately after intake so clinicians can see key context in seconds.

The Patient Snapshot should assemble available administrative and clinical context into a concise, reviewable view that supports emergency care without requiring clinicians to manually search across disconnected records.

## Context Scope

The Patient Snapshot should include:

- Demographics
- Allergies
- Medications
- Prior visits
- Active conditions
- Recent encounters

## Patient Snapshot

Generate `Patient Snapshot` as the canonical post-intake summary artifact.

The snapshot should:

- Use the confirmed intake record as the identity anchor.
- Pull available patient context from approved clinical and administrative sources.
- Separate confirmed data from unavailable, stale, or unverified context.
- Preserve source references when available.
- Show freshness indicators for time-sensitive context.
- Avoid hiding missing information that clinicians may need to ask about.

## Workspace Display

Display the Patient Snapshot at:

`/workspace/emergency/patient-context`

The workspace view should present high-priority context first:

- Patient identity and demographics.
- Allergies and medication context.
- Active conditions.
- Recent encounters and prior visits.
- Source and freshness notes.
- Missing or unresolved context requiring clinician review.

## Review Boundary

The Patient Snapshot is a context assembly layer. It does not diagnose, change active conditions, reconcile medications autonomously, determine acuity, order treatment, or replace clinician review.

Clinicians should be able to use the snapshot as a fast starting point while retaining responsibility for confirming clinically relevant information with the patient, chart, or care team.

## Data Contract

The Patient Snapshot should preserve:

- Patient identifier from the confirmed intake record.
- Demographic summary.
- Allergy list with source and freshness metadata when available.
- Medication list with source and freshness metadata when available.
- Prior visit summary.
- Active condition summary.
- Recent encounter summary.
- Missing context indicators.
- Snapshot generated timestamp.

## Acceptance

Instant Patient Context is ready when:

- A Patient Snapshot is generated immediately after intake.
- The snapshot includes demographics, allergies, medications, prior visits, active conditions, and recent encounters when available.
- The snapshot is displayed at `/workspace/emergency/patient-context`.
- Clinicians can see patient context in seconds.
