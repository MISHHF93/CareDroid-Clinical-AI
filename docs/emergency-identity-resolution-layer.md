# Emergency Identity Resolution Layer

## Goal

Prevent duplicate patient records during emergency intake and registration.

The identity resolution layer should compare available identifiers, demographics, and verified documents to surface likely existing patient records before a new record is created.

## Match Inputs

The Emergency Identity Resolution Layer should match using:

- Identifiers
- Demographics
- Verified documents

Identifiers may include medical record number, visit identifier, government ID reference, health card number, insurance member identifier, or other facility-approved registration identifiers. Demographics may include name, date of birth, address, phone, and other confirmed intake fields. Verified documents may include reviewed driver's license, health card, insurance card, referral paperwork, or other approved sources.

## Confidence Score

Generate `Confidence Score` as the canonical match signal.

The score should reflect:

- Exact identifier matches.
- Partial identifier matches.
- Demographic similarity.
- Verified document agreement.
- Conflicting demographic or identifier values.
- Source freshness and confirmation status.
- Number and reliability of matching sources.

The score should help staff understand match strength without turning uncertain identity resolution into an autonomous decision.

## Review Requirement

Require review for uncertain matches.

The system may suggest likely matches, but it must not automatically merge records, overwrite identity fields, or suppress new record creation when match confidence is uncertain. Staff should review uncertain matches before selecting an existing record or creating a new one.

## Resolution Workflow

The workflow should support:

- Searching for existing patient records during intake.
- Comparing candidate records side by side.
- Showing matched and conflicting fields.
- Displaying source documents and confirmation status.
- Explaining the Confidence Score in plain language.
- Recording staff resolution decisions.
- Preserving an audit trail of match suggestions and outcomes.

## Duplicate Risk Signals

The layer should flag:

- Multiple candidate records with similar demographics.
- Identifier conflicts.
- Name or date-of-birth discrepancies.
- Recently created records with overlapping demographics.
- Document-backed identity fields that conflict with existing records.

## Governance Boundary

The Emergency Identity Resolution Layer is a patient matching and review support layer. It does not autonomously merge records, delete records, finalize disputed identity, or bypass verification.

Identity resolution remains a human-reviewed registration and governance workflow.

## Acceptance

The Emergency Identity Resolution Layer is ready when:

- Identifiers, demographics, and verified documents are used for matching.
- A Confidence Score is generated for candidate matches.
- Uncertain matches require review.
- Match suggestions, decisions, and source signals are auditable.
- Duplicate record risk is reduced.
