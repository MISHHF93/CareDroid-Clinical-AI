# AI Patient Snapshot Generator

## Goal

Generate concise clinician-facing summaries so clinicians can understand patient context quickly.

The generator should turn available patient context into a short, source-cited summary that supports review without replacing clinical judgment.

## Snapshot Format

The AI Patient Snapshot should answer:

- Who is this patient?
- Why are they here?
- Key history?
- Key medications?
- Key allergies?
- Recent encounters?

Each section should be concise, readable, and focused on information most likely to matter during emergency review.

## Source Citation Rule

Always cite source records.

Every generated statement that depends on patient data should include a source reference when available. Source references may point to intake records, prior encounters, medication records, allergy records, referral letters, discharge papers, patient-reported information, or integration payloads.

If a source is unavailable or uncertain, the snapshot should state that clearly instead of presenting the information as confirmed.

## Review Requirement

The AI Patient Snapshot requires clinician review.

The generator may summarize, organize, and highlight patient context, but it must not diagnose, assign acuity, determine treatment, reconcile medications, change allergy status, or finalize clinical documentation without clinician review.

## Summary Behavior

The generator should:

- Use the confirmed intake record as the patient identity anchor.
- Prefer recent and source-backed records.
- Distinguish confirmed information from patient-reported or unverified information.
- Highlight missing or uncertain context.
- Keep the summary short enough to scan during emergency care.
- Preserve links or references back to source records.

## Output Contract

The generated snapshot should include:

- Patient identity summary.
- Reason for visit or arrival context when available.
- Key history summary.
- Key medication summary.
- Key allergy summary.
- Recent encounter summary.
- Source citations for each section.
- Missing or uncertain context notes.
- Generated timestamp.
- Clinician review status.

## Safety Boundary

The AI Patient Snapshot Generator is a summarization and context assembly tool. It does not replace chart review, bedside assessment, medication reconciliation, allergy confirmation, diagnosis, disposition, or treatment decisions.

Clinicians remain responsible for reviewing the snapshot and validating clinically relevant information.

## Acceptance

The AI Patient Snapshot Generator is ready when:

- Concise clinician-facing summaries can be generated.
- The summary answers who the patient is, why they are here, key history, key medications, key allergies, and recent encounters.
- Source records are cited for generated patient-context statements.
- Clinician review is required.
- Clinicians can understand patient context quickly.
