# Referral Document Ingestion

## Goal

Ingest external clinical documents so relevant outside information becomes searchable and reviewable inside the Emergency Workspace.

The ingestion workflow should process external documents, extract key clinical context, and preserve source references for every extracted item.

## Document Examples

Referral Document Ingestion should support:

- Referral letters
- Clinic notes
- Discharge summaries
- EMS reports

## Extract

The ingestion workflow should extract:

- Diagnoses
- Medications
- Allergies
- Recommendations

Extracted values should remain reviewable context unless confirmed or incorporated through the appropriate clinical workflow.

## Source References

Store source references for extracted information.

Each extracted item should retain:

- Source document type.
- Source document identifier or file reference.
- Page, section, or location when available.
- Extracted text span when available.
- Extraction confidence.
- Review status.
- Ingestion timestamp.

Source references should allow clinicians and staff to trace every extracted diagnosis, medication, allergy, or recommendation back to the original external document.

## Searchable Record

The ingestion workflow should create searchable records that include:

- Document metadata.
- OCR or parsed text reference.
- Extracted diagnoses.
- Extracted medications.
- Extracted allergies.
- Extracted recommendations.
- Source references.
- Review status.

Search should support finding external information by patient, document type, extracted concept, source, and review state.

## Review Boundary

Referral Document Ingestion is a document processing and search layer. It does not diagnose, reconcile medications, update allergy lists, accept recommendations, determine disposition, or replace clinician review of external documents.

External information should be easy to find, but clinical use remains review-required.

## Acceptance

Referral Document Ingestion is ready when:

- Referral letters, clinic notes, discharge summaries, and EMS reports can be ingested.
- Diagnoses, medications, allergies, and recommendations are extracted when available.
- Source references are stored for extracted information.
- External document information becomes searchable.
