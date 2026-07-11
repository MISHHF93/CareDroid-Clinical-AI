# FHIR R4 — citation-only registry entry

**Status:** Citation metadata only. Full FHIR specification text is **not** redistributed in this repository.

| Field | Value |
|-------|--------|
| **Standard** | HL7 FHIR Release 4 (R4) |
| **Publisher** | HL7 International |
| **Canonical** | https://hl7.org/fhir/R4/ |
| **License** | HL7 FHIR license as published by HL7 International |
| **CareDroid use** | Citation / interoperability reference only |

## CareDroid policy

- Do **not** ingest full FHIR specification prose into the RAG index from this artifact.
- Clinicians and engineers should open the official HL7 site for normative definitions.
- AI responses may **cite** `kn-fhir-r4-citation-v1` when discussing FHIR resources, but must not invent resource field semantics beyond what institutional integration docs allow.
- Patient-identifying FHIR resources (e.g., Patient, Encounter) must never be sent to external LLMs without de-identification and `AI_PATIENT_CONTEXT_ENABLED` governance.

## Not a clinical protocol

This entry is an interoperability standard reference, not a treatment guideline.
