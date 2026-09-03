/**
 * Unified registry of capturable intake artifacts for reception and Smart Intake.
 * One source of truth for document types, fields, parsers, and review routing.
 */

export type IntakeArtifactCategory = 'identity' | 'clinical' | 'admin' | 'arrival';

export type IntakeCaptureMethod = 'photo' | 'upload' | 'paste';

export type IntakeArtifactParser =
  | 'identity'
  | 'insurance'
  | 'medication'
  | 'allergy'
  | 'referral'
  | 'discharge';

export type IntakeReviewStep = 'identity_verify' | 'clinical_review' | 'admin_review';

export type IntakeArtifactId =
  | 'government_id'
  | 'health_card'
  | 'drivers_license'
  | 'passport'
  | 'insurance_card'
  | 'medication_list'
  | 'allergy_list'
  | 'referral_letter'
  | 'clinic_notes'
  | 'discharge_summary';

export interface IntakeArtifactDefinition {
  artifactId: IntakeArtifactId;
  label: string;
  shortLabel: string;
  description: string;
  category: IntakeArtifactCategory;
  captureMethods: IntakeCaptureMethod[];
  extractableFields: readonly string[];
  requiredForRegistration?: readonly string[];
  promotesTo: string;
  parser: IntakeArtifactParser;
  backendDocumentType:
    | 'id_card'
    | 'health_card'
    | 'referral_letter'
    | 'medication_list'
    | 'allergy_list'
    | 'discharge_summary';
  intakeInputSource:
    | 'id_document_scan'
    | 'ocr_result'
    | 'referral_document'
    | 'medication_list'
    | 'allergy_list';
  reviewStep: IntakeReviewStep;
  filenameHints: readonly string[];
  receptionVisible: boolean;
}

export const INTAKE_ARTIFACT_REGISTRY: Record<IntakeArtifactId, IntakeArtifactDefinition> = {
  government_id: {
    artifactId: 'government_id',
    label: 'Government ID',
    shortLabel: 'ID',
    description: 'National ID, photo card, or general identity document.',
    category: 'identity',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'firstName',
      'lastName',
      'dateOfBirth',
      'sex',
      'address',
      'documentNumber',
      'nationality',
      'documentExpiry',
      'bloodType',
    ],
    requiredForRegistration: ['firstName', 'lastName', 'dateOfBirth', 'sex'],
    promotesTo: 'patient.identity',
    parser: 'identity',
    backendDocumentType: 'id_card',
    intakeInputSource: 'id_document_scan',
    reviewStep: 'identity_verify',
    filenameHints: ['id', 'identity', 'national'],
    receptionVisible: true,
  },
  health_card: {
    artifactId: 'health_card',
    label: 'Health card',
    shortLabel: 'Health card',
    description: 'Provincial or territorial health insurance card.',
    category: 'identity',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'firstName',
      'lastName',
      'dateOfBirth',
      'sex',
      'healthCardNumber',
      'address',
    ],
    requiredForRegistration: ['firstName', 'lastName', 'dateOfBirth', 'healthCardNumber'],
    promotesTo: 'patient.identity',
    parser: 'identity',
    backendDocumentType: 'health_card',
    intakeInputSource: 'id_document_scan',
    reviewStep: 'identity_verify',
    filenameHints: ['health', 'ohip', 'ramq', 'phn', 'hcn'],
    receptionVisible: true,
  },
  drivers_license: {
    artifactId: 'drivers_license',
    label: "Driver's licence",
    shortLabel: 'Licence',
    description: 'Driver licence or equivalent government photo ID.',
    category: 'identity',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'firstName',
      'lastName',
      'dateOfBirth',
      'sex',
      'address',
      'documentNumber',
      'documentExpiry',
    ],
    requiredForRegistration: ['firstName', 'lastName', 'dateOfBirth'],
    promotesTo: 'patient.identity',
    parser: 'identity',
    backendDocumentType: 'id_card',
    intakeInputSource: 'id_document_scan',
    reviewStep: 'identity_verify',
    filenameHints: ['license', 'licence', 'driver', 'dl'],
    receptionVisible: true,
  },
  passport: {
    artifactId: 'passport',
    label: 'Passport',
    shortLabel: 'Passport',
    description: 'Passport identity page for demographic confirmation.',
    category: 'identity',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'firstName',
      'lastName',
      'dateOfBirth',
      'sex',
      'nationality',
      'documentNumber',
      'documentExpiry',
    ],
    requiredForRegistration: ['firstName', 'lastName', 'dateOfBirth'],
    promotesTo: 'patient.identity',
    parser: 'identity',
    backendDocumentType: 'id_card',
    intakeInputSource: 'id_document_scan',
    reviewStep: 'identity_verify',
    filenameHints: ['passport'],
    receptionVisible: true,
  },
  insurance_card: {
    artifactId: 'insurance_card',
    label: 'Insurance card',
    shortLabel: 'Insurance',
    description: 'Private insurance or supplemental coverage card.',
    category: 'admin',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: ['payerName', 'memberId', 'groupId', 'subscriberName'],
    requiredForRegistration: ['payerName', 'memberId'],
    promotesTo: 'patient.coverage',
    parser: 'insurance',
    backendDocumentType: 'id_card',
    intakeInputSource: 'ocr_result',
    reviewStep: 'admin_review',
    filenameHints: ['insurance', 'payer', 'coverage', 'benefits'],
    receptionVisible: true,
  },
  medication_list: {
    artifactId: 'medication_list',
    label: 'Medication list',
    shortLabel: 'Medications',
    description: 'Home medication list, pill bottle label, or pharmacy printout.',
    category: 'clinical',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: ['medication', 'medicationName', 'dose', 'route', 'frequency'],
    promotesTo: 'patient.medications',
    parser: 'medication',
    backendDocumentType: 'medication_list',
    intakeInputSource: 'medication_list',
    reviewStep: 'clinical_review',
    filenameHints: ['medication', 'meds', 'rx', 'pharmacy'],
    receptionVisible: true,
  },
  allergy_list: {
    artifactId: 'allergy_list',
    label: 'Allergy list',
    shortLabel: 'Allergies',
    description: 'Allergy card, bracelet note, or documented adverse reactions.',
    category: 'clinical',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: ['allergy', 'substance', 'reaction', 'severity'],
    promotesTo: 'patient.allergies',
    parser: 'allergy',
    backendDocumentType: 'allergy_list',
    intakeInputSource: 'allergy_list',
    reviewStep: 'clinical_review',
    filenameHints: ['allergy', 'allergies', 'adverse'],
    receptionVisible: true,
  },
  referral_letter: {
    artifactId: 'referral_letter',
    label: 'Referral letter',
    shortLabel: 'Referral',
    description: 'Referral from clinic, family doctor, or specialist.',
    category: 'clinical',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'chiefComplaint',
      'diagnoses',
      'medications',
      'allergies',
      'recommendations',
    ],
    promotesTo: 'encounter.referralContext',
    parser: 'referral',
    backendDocumentType: 'referral_letter',
    intakeInputSource: 'referral_document',
    reviewStep: 'clinical_review',
    filenameHints: ['referral', 'refer'],
    receptionVisible: true,
  },
  clinic_notes: {
    artifactId: 'clinic_notes',
    label: 'Clinic notes',
    shortLabel: 'Clinic notes',
    description: 'Outpatient clinic note or consult summary.',
    category: 'clinical',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'chiefComplaint',
      'diagnoses',
      'medications',
      'allergies',
      'recommendations',
    ],
    promotesTo: 'encounter.referralContext',
    parser: 'referral',
    backendDocumentType: 'referral_letter',
    intakeInputSource: 'referral_document',
    reviewStep: 'clinical_review',
    filenameHints: ['clinic', 'consult', 'note'],
    receptionVisible: true,
  },
  discharge_summary: {
    artifactId: 'discharge_summary',
    label: 'Discharge summary',
    shortLabel: 'Discharge',
    description: 'Recent hospital discharge paperwork or summary.',
    category: 'clinical',
    captureMethods: ['photo', 'upload', 'paste'],
    extractableFields: [
      'diagnoses',
      'medications',
      'allergies',
      'recommendations',
      'recentEncounter',
      'followUpInstructions',
    ],
    promotesTo: 'encounter.priorCare',
    parser: 'discharge',
    backendDocumentType: 'discharge_summary',
    intakeInputSource: 'referral_document',
    reviewStep: 'clinical_review',
    filenameHints: ['discharge', 'summary', 'd/c'],
    receptionVisible: true,
  },
};

export const DEFAULT_INTAKE_ARTIFACT_ID: IntakeArtifactId = 'government_id';

export const INTAKE_ARTIFACT_CATEGORIES: ReadonlyArray<{
  id: IntakeArtifactCategory;
  label: string;
}> = [
  { id: 'identity', label: 'Identity & ID' },
  { id: 'admin', label: 'Coverage & admin' },
  { id: 'clinical', label: 'Clinical documents' },
];

export function getIntakeArtifact(artifactId?: string | null): IntakeArtifactDefinition {
  const key = String(artifactId || '').trim() as IntakeArtifactId;
  return INTAKE_ARTIFACT_REGISTRY[key] || INTAKE_ARTIFACT_REGISTRY[DEFAULT_INTAKE_ARTIFACT_ID];
}

export function listReceptionArtifacts(): IntakeArtifactDefinition[] {
  return Object.values(INTAKE_ARTIFACT_REGISTRY).filter((artifact) => artifact.receptionVisible);
}

export function listArtifactsByCategory(
  category: IntakeArtifactCategory,
): IntakeArtifactDefinition[] {
  return listReceptionArtifacts().filter((artifact) => artifact.category === category);
}

export function resolveArtifactFromFilename(
  filename: string,
  mimeType = '',
): IntakeArtifactDefinition {
  const normalized = String(filename || '').toLowerCase();
  const ranked = listReceptionArtifacts()
    .map((artifact) => {
      const score = artifact.filenameHints.reduce(
        (sum, hint) => (normalized.includes(hint) ? sum + hint.length : sum),
        0,
      );
      return { artifact, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked[0]) return ranked[0].artifact;
  if (mimeType.includes('pdf')) return INTAKE_ARTIFACT_REGISTRY.referral_letter;
  return INTAKE_ARTIFACT_REGISTRY[DEFAULT_INTAKE_ARTIFACT_ID];
}

export function resolveArtifactId(
  artifactId?: string | null,
  filename = '',
  mimeType = '',
): IntakeArtifactId {
  if (artifactId && INTAKE_ARTIFACT_REGISTRY[artifactId as IntakeArtifactId]) {
    return artifactId as IntakeArtifactId;
  }
  return resolveArtifactFromFilename(filename, mimeType).artifactId;
}
