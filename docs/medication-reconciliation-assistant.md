# Medication Reconciliation Assistant

## Goal

Assist medication collection so medication history can be gathered faster with less manual transcription.

The assistant should combine patient-reported medications, prior records, and pharmacy integration data when available into a reviewable Medication Summary.

## Inputs

The Medication Reconciliation Assistant should use:

- Patient report
- Prior records
- Pharmacy integrations, if available

## Output

Generate `Medication Summary` as the canonical review artifact for medication history collection.

The summary should include:

- Medication name.
- Dose when available.
- Route when available.
- Frequency when available.
- Last taken date or time when available.
- Source of each entry.
- Confidence or uncertainty indicator.
- Verification status.

## Flagging Rules

The assistant should flag:

- Duplicates.
- Missing information.
- Uncertain entries.

Duplicate flags should identify possible repeated medications across patient report, prior records, and pharmacy sources. Missing information flags should identify incomplete dose, route, frequency, last-taken, or source details. Uncertain entry flags should identify low-confidence, conflicting, stale, or ambiguous medication data.

## Verification Requirement

All medication entries require human verification before they are treated as reconciled medication history.

The assistant may prefill and organize candidate entries, but it must not silently reconcile medications, discontinue medications, add active medications, change doses, or mark a medication list complete without clinician or authorized staff review.

## Review Workflow

The workflow should support:

- Comparing patient-reported medications against prior records.
- Highlighting pharmacy-sourced entries when integrations are available.
- Merging confirmed duplicates.
- Correcting incomplete or inaccurate medication details.
- Marking uncertain entries for follow-up.
- Confirming reviewed medications into the Medication Summary.

## Safety Boundary

The Medication Reconciliation Assistant supports collection and review. It does not prescribe, discontinue, substitute, dose-adjust, recommend treatment, or make autonomous medication decisions.

Medication history remains a human-verified clinical workflow.

## Acceptance

The Medication Reconciliation Assistant is ready when:

- Medication collection can use patient report, prior records, and pharmacy integrations when available.
- A Medication Summary is generated.
- Duplicates, missing information, and uncertain entries are flagged.
- Human verification is required before medication history is treated as reconciled.
- Medication history collection becomes faster.
