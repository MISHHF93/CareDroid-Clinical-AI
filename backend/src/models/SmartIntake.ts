import { Schema, model, Document } from 'mongoose';

export type IntakeInputSource =
  | 'manual_entry'
  | 'id_document_scan'
  | 'ocr_result'
  | 'referral_document'
  | 'medication_list'
  | 'allergy_list'
  | 'ems_prearrival'
  | 'biometric_provider';

export type VerificationDecision = 'approved' | 'rejected' | 'edited' | 'pending';
export type FinalIntakeAction =
  | 'create_new_patient'
  | 'link_to_existing_patient'
  | 'continue_as_unknown_patient'
  | 'escalate_to_manual_review';

export type IdentityAuditAction =
  | 'document_uploaded'
  | 'ocr_extracted'
  | 'candidate_match_generated'
  | 'field_verified'
  | 'field_rejected'
  | 'field_edited'
  | 'patient_linked'
  | 'patient_created'
  | 'duplicate_warning_shown'
  | 'unknown_patient_created'
  | 'unknown_patient_reconciled'
  | 'biometric_consent_granted'
  | 'biometric_consent_withdrawn'
  | 'manual_override_used'
  | 'ems_evidence_added';

export type IdentifierType =
  | 'internal'
  | 'mrn'
  | 'health_card'
  | 'ems_temporary'
  | 'external_ehr'
  | 'referral_source';

export interface ExtractedDemographics {
  firstName?: string;
  lastName?: string;
  previousNames?: string[];
  dateOfBirth?: string;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  mrn?: string;
  healthCardNumber?: string;
  externalEhrId?: string;
  referralSourceId?: string;
}

export interface ExtractedMedication {
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  sourceText?: string;
  confidence?: number;
}

export interface ExtractedAllergy {
  substance: string;
  reaction?: string;
  severity?: string;
  sourceText?: string;
  confidence?: number;
}

export interface IdentityEvidence {
  id: string;
  source: IntakeInputSource;
  field: string;
  value: unknown;
  confidence: number;
  verified: boolean;
  verificationDecision: VerificationDecision;
  reviewedBy?: string;
  reviewedAt?: Date;
  purpose: string;
  redacted: boolean;
  createdAt: Date;
}

export interface PatientMatchCandidate {
  patientId: string;
  displayName: string;
  matchScore: number;
  matchedFields: string[];
  conflictingFields: string[];
  explanation: string;
  recommendedAction: 'link_after_staff_confirmation' | 'possible_duplicate_review' | 'create_new_patient' | 'manual_review';
}

export interface DocumentCapture {
  id: string;
  type: 'id_card' | 'health_card' | 'referral_letter' | 'medication_list' | 'allergy_list' | 'discharge_summary';
  filename?: string;
  uploadedBy: string;
  uploadedAt: Date;
  ocrProvider?: string;
  ocrPayload?: unknown;
  purpose: string;
  verified: boolean;
}

export interface BiometricConsent {
  enabledByTenant: boolean;
  consentGranted: boolean;
  consentGrantedAt?: Date;
  consentWithdrawnAt?: Date;
  purposeStatement?: string;
  retentionPolicy?: string;
  staffAttestation?: string;
  providerReference?: string;
  modality?: 'face_image' | 'palm_vein' | 'fingerprint' | 'iris' | 'voice';
}

export interface PatientIdentityAuditLog {
  id: string;
  action: IdentityAuditAction;
  actor: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export interface SmartIntakeInput {
  source: IntakeInputSource;
  manual?: ExtractedDemographics & {
    chiefComplaint?: string;
    staffNotes?: string;
  };
  ems?: {
    emsUnitId: string;
    temporaryId?: string;
    etaMinutes?: number;
    chiefComplaint?: string;
    riskFlags?: string[];
  };
  documents?: DocumentCapture[];
  medications?: ExtractedMedication[];
  allergies?: ExtractedAllergy[];
  staffNotes?: string;
}

export interface SmartIntakeOutput {
  verifiedPatientSnapshot: Record<string, unknown>;
  unverifiedExtractedFields: IdentityEvidence[];
  patientMatchCandidates: PatientMatchCandidate[];
  confidenceScore: number;
  matchExplanation: string;
  duplicateWarning: boolean;
  missingFieldWarnings: string[];
  staffVerificationStatus: 'not_started' | 'in_progress' | 'complete' | 'manual_review';
  auditLogEntry: PatientIdentityAuditLog | null;
  finalAction: FinalIntakeAction | null;
}

export interface IntakeSession extends Document {
  status: 'started' | 'capturing_inputs' | 'review_ocr' | 'matching' | 'verifying' | 'completed' | 'manual_review';
  inputs: unknown[];
  evidence: IdentityEvidence[];
  documents: DocumentCapture[];
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  matchCandidates: PatientMatchCandidate[];
  verifiedSnapshot: Record<string, unknown>;
  finalAction: FinalIntakeAction | null;
  linkedPatientId: string | null;
  temporaryEncounterId: string | null;
  biometricConsent: BiometricConsent;
  auditLog: PatientIdentityAuditLog[];
  duplicateWarning: boolean;
  missingFieldWarnings: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const IdentityEvidenceSchema = new Schema<IdentityEvidence>({
  id: { type: String, required: true },
  source: { type: String, required: true },
  field: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  confidence: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  verificationDecision: { type: String, default: 'pending' },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  purpose: { type: String, required: true },
  redacted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const PatientMatchCandidateSchema = new Schema<PatientMatchCandidate>({
  patientId: { type: String, required: true },
  displayName: { type: String, required: true },
  matchScore: { type: Number, required: true },
  matchedFields: { type: [String], default: [] },
  conflictingFields: { type: [String], default: [] },
  explanation: { type: String, required: true },
  recommendedAction: { type: String, required: true },
});

const DocumentCaptureSchema = new Schema<DocumentCapture>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  filename: { type: String, default: null },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  ocrProvider: { type: String, default: null },
  ocrPayload: { type: Schema.Types.Mixed, default: null },
  purpose: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const MedicationSchema = new Schema<ExtractedMedication>({
  name: { type: String, required: true },
  dose: { type: String, default: null },
  route: { type: String, default: null },
  frequency: { type: String, default: null },
  sourceText: { type: String, default: null },
  confidence: { type: Number, default: 0 },
});

const AllergySchema = new Schema<ExtractedAllergy>({
  substance: { type: String, required: true },
  reaction: { type: String, default: null },
  severity: { type: String, default: null },
  sourceText: { type: String, default: null },
  confidence: { type: Number, default: 0 },
});

const BiometricConsentSchema = new Schema<BiometricConsent>({
  enabledByTenant: { type: Boolean, default: false },
  consentGranted: { type: Boolean, default: false },
  consentGrantedAt: { type: Date, default: null },
  consentWithdrawnAt: { type: Date, default: null },
  purposeStatement: { type: String, default: null },
  retentionPolicy: { type: String, default: null },
  staffAttestation: { type: String, default: null },
  providerReference: { type: String, default: null },
  modality: { type: String, default: null },
});

const AuditLogSchema = new Schema<PatientIdentityAuditLog>({
  id: { type: String, required: true },
  action: { type: String, required: true },
  actor: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: Schema.Types.Mixed, default: {} },
});

const IntakeSessionSchema = new Schema<IntakeSession>(
  {
    status: { type: String, default: 'started' },
    inputs: { type: Array, default: [] },
    evidence: { type: [IdentityEvidenceSchema], default: [] },
    documents: { type: [DocumentCaptureSchema], default: [] },
    medications: { type: [MedicationSchema], default: [] },
    allergies: { type: [AllergySchema], default: [] },
    matchCandidates: { type: [PatientMatchCandidateSchema], default: [] },
    verifiedSnapshot: { type: Schema.Types.Mixed, default: {} },
    finalAction: { type: String, default: null },
    linkedPatientId: { type: String, default: null },
    temporaryEncounterId: { type: String, default: null },
    biometricConsent: { type: BiometricConsentSchema, default: () => ({}) },
    auditLog: { type: [AuditLogSchema], default: [] },
    duplicateWarning: { type: Boolean, default: false },
    missingFieldWarnings: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

IntakeSessionSchema.index({ status: 1 });
IntakeSessionSchema.index({ linkedPatientId: 1 });
IntakeSessionSchema.index({ temporaryEncounterId: 1 });
IntakeSessionSchema.index({ 'evidence.field': 1 });

export const SmartIntakeSession = model<IntakeSession>('SmartIntakeSession', IntakeSessionSchema);
