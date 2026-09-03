import type { ISODateString } from './emergency';
import type { AIResponseSourceCategory } from '../../lib/ai/provenanceContract';

/** FHIR-friendly resource hints for interoperability mapping. */
export type FhirResourceHint =
  | 'Patient'
  | 'Encounter'
  | 'DocumentReference'
  | 'Composition'
  | 'Observation'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'MedicationStatement'
  | 'MedicationRequest'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'CarePlan'
  | 'Task';

export type PatientDocumentArtifactType =
  | 'IDENTITY_DEMOGRAPHIC'
  | 'IDENTIFIER'
  | 'ENCOUNTER'
  | 'DOCUMENT_METADATA'
  | 'CHIEF_COMPLAINT'
  | 'VITAL_SIGN'
  | 'ALLERGY'
  | 'MEDICATION'
  | 'CONDITION'
  | 'PAST_HISTORY'
  | 'PROCEDURE'
  | 'LAB_RESULT'
  | 'IMAGING_REFERENCE'
  | 'CLINICAL_NOTE'
  | 'ARRIVAL_CONTEXT'
  | 'EMS_HANDOFF'
  | 'TRIAGE_NOTE'
  | 'REASSESSMENT_TRIGGER'
  | 'DETERIORATION_SIGNAL'
  | 'REFERRAL_STATUS'
  | 'BOARDING_STATUS'
  | 'PENDING_TASK'
  | 'CARE_STAGE'
  | 'COPILOT_SUMMARY'
  | 'COPILOT_TIMELINE'
  | 'COPILOT_RISK_HIGHLIGHT'
  | 'COPILOT_TOOL_RECOMMENDATION'
  | 'COPILOT_HANDOFF_SUMMARY'
  | 'COPILOT_MISSING_DATA'
  | 'COPILOT_CONTRADICTION';

export type ArtifactClinicalStatus = 'confirmed' | 'suggested' | 'refuted' | 'superseded';

export type ArtifactReviewStatus =
  | 'pending_human_review'
  | 'accepted'
  | 'rejected'
  | 'needs_clarification';

export type ArtifactSourceStateLabel =
  | 'live'
  | 'demo'
  | 'simulated'
  | 'extracted'
  | 'staff_entered';

/**
 * Every producer of this type named a code system and then supplied only free
 * text -- `{ system: 'SNOMED_CT', display: 'penicillin' }` with no `code` --
 * across seven call sites and four different systems. Nothing rendered it, so
 * the claim was never visible, but "this allergy is SNOMED-coded" is exactly
 * the kind of assertion a downstream consumer (or an export, or a reviewer)
 * would reasonably trust.
 *
 * `status` makes the difference explicit and un-fakeable: `coded` requires a
 * real `code` from a terminology lookup, `unbound` says the system is the
 * intended binding target and nothing has bound it yet. See
 * normalizedCodeIsCoherent() for the invariant, which is enforced by test.
 */
export type NormalizedCode = {
  system?: 'SNOMED_CT' | 'RXNORM' | 'LOINC' | 'ICD-10-CM' | 'LOCAL';
  code?: string | null;
  display?: string;
  /** `coded` ONLY when `code` holds a real identifier from that system. */
  status?: 'coded' | 'unbound';
  /** Why it is not coded -- licensing, or no lookup performed yet. */
  unboundReason?: string;
};

/**
 * A NormalizedCode must not claim to be coded without carrying a code.
 * Exported so both the model and its tests share one definition of coherent.
 */
export function normalizedCodeIsCoherent(value: NormalizedCode | undefined): boolean {
  if (!value) return true;
  if (value.status === 'coded') return Boolean(value.code && String(value.code).trim());
  return true;
}

export type SourceTextSpan = {
  page?: number;
  startChar?: number;
  endChar?: number;
};

export type PatientDocumentSource = {
  id: string;
  patientId: string;
  encounterId?: string;
  documentType: string;
  sourceSystem: string;
  sourceType:
    | 'uploaded_document'
    | 'referral_note'
    | 'ems_report'
    | 'triage_note'
    | 'discharge_summary'
    | 'lab_document'
    | 'scanned_note'
    | 'staff_paste'
    | 'patient_record'
    | 'copilot_synthesis';
  filename?: string;
  mimeType?: string;
  capturedAt: ISODateString;
  sourceState: ArtifactSourceStateLabel;
  fhirResourceHint?: FhirResourceHint;
};

export type PatientDocumentArtifactProvenance = {
  sourceType: PatientDocumentSource['sourceType'];
  sourceSystem: string;
  extractedBy: string;
  modelVersion: string;
  extractedAt: ISODateString;
  auditEventId?: string;
  /**
   * How this artifact was actually produced -- the canonical AI Core Node
   * category (lib/ai/provenanceContract.ts). Added 2026-08-08 after finding
   * every regex/keyword-extracted artifact (CHIEF_COMPLAINT, ALLERGY,
   * MEDICATION, LAB_RESULT, COPILOT_TOOL_RECOMMENDATION) defaulted
   * `safety.isAiDerived` to `true` regardless of the extraction mechanism,
   * which is unconditionally regex matching in
   * PatientDocumentArtifactService.extractArtifactsFromText() -- never a
   * model call. `isAiDerived` below is now derived from this field rather
   * than a second, independently-settable boolean.
   */
  responseSource: AIResponseSourceCategory;
};

export type PatientDocumentArtifactSafety = {
  /** Derived from provenance.responseSource; kept for backward-compat display. */
  isAiDerived: boolean;
  requiresHumanReview: boolean;
  mayAffectClinicalWorkflow: boolean;
  disclaimer?: string;
};

export type PatientDocumentArtifactVisibility = {
  showOnPatientCard: boolean;
  showOnWhiteboard: boolean;
  showInCopilot: boolean;
};

export type PatientDocumentArtifact = {
  id: string;
  patientId: string;
  patientCardId: string;
  encounterId?: string;
  sourceDocumentId?: string;
  artifactType: PatientDocumentArtifactType;
  clinicalStatus: ArtifactClinicalStatus;
  reviewStatus: ArtifactReviewStatus;
  label: string;
  normalizedCode?: NormalizedCode;
  value: Record<string, unknown>;
  sourceText?: string;
  sourceSpan?: SourceTextSpan;
  confidence: number;
  provenance: PatientDocumentArtifactProvenance;
  safety: PatientDocumentArtifactSafety;
  visibility: PatientDocumentArtifactVisibility;
  fhirResourceHint?: FhirResourceHint;
  sourceState: ArtifactSourceStateLabel;
  reviewedBy?: string;
  reviewedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type PatientDocumentArtifactReviewInput = {
  artifactId: string;
  reviewStatus: ArtifactReviewStatus;
  clinicalStatus?: ArtifactClinicalStatus;
  reviewer?: string;
  reviewNote?: string;
};

export type ExtractDocumentArtifactsInput = {
  patientId: string;
  encounterId?: string;
  sourceDocumentId?: string;
  documentType: string;
  sourceType: PatientDocumentSource['sourceType'];
  sourceSystem?: string;
  rawText: string;
  parser?: string;
  filename?: string;
  confidence?: number;
  sourceState?: ArtifactSourceStateLabel;
  // extractedBy/modelVersion/isAiDerived were previously caller-settable
  // here, letting a caller claim an extraction was AI-derived when
  // PatientDocumentArtifactService.extractArtifactsFromText() always
  // performs the same regex/keyword extraction regardless of what's
  // claimed. Removed 2026-08-08 -- the service now reports its own real
  // provenance (DETERMINISTIC_RULE) unconditionally, since that's what's
  // actually true of every artifact this method produces.
};
