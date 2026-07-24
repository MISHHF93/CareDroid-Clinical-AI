import type { EmergencyPatient } from './emergency-os.types';

/**
 * Server-side port of the weighted duplicate-scoring algorithm that already ships
 * twice in this codebase — src/utils/patientDuplicateDetection.ts (frontend, gates
 * the reception UI) and backend/src/services/mpi.service.ts (Mongoose intake path,
 * off by default). Neither runs against the primary NestJS/TypeORM patient store
 * that backs POST /emergency/patients and /emergency/intake by default, so those
 * endpoints previously had zero duplicate check of their own — this closes that gap
 * as a defense-in-depth server-side check, independent of whatever a given caller's
 * client already did. Field weights and score bands are kept identical to the
 * frontend implementation for consistency; only phone/email/healthCard are dropped
 * since EmergencyPatient (and the Patient TypeORM entity) don't carry those fields.
 *
 * Pure functions only, deliberately: EmergencyPatientService (emergency-os.services.ts)
 * needs to call these, and this file must not import back from there or it creates a
 * module-load cycle that breaks Nest's constructor-param DI metadata.
 */

export const DUPLICATE_HIGH_CONFIDENCE_THRESHOLD = 85;
export const DUPLICATE_REVIEW_THRESHOLD = 65;
export const DUPLICATE_MANUAL_REVIEW_THRESHOLD = 35;

export type DuplicateRecommendedAction =
  | 'link_after_staff_confirmation'
  | 'possible_duplicate_review'
  | 'manual_review'
  | 'create_new_patient';

export type PatientDuplicateDemographics = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  sex?: string;
  mrn?: string;
};

export type PatientDuplicateCandidate = {
  patientId: string;
  displayName: string;
  matchScore: number;
  matchedFields: string[];
  conflictingFields: string[];
  recommendedAction: DuplicateRecommendedAction;
  explanation: string;
};

function normalize(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function compareField(
  field: string,
  patientValue: unknown,
  incomingValue: unknown,
  matchedFields: string[],
  conflictingFields: string[],
  onMatch: () => void,
): void {
  if (!incomingValue || !patientValue) return;
  if (normalize(patientValue) === normalize(incomingValue)) {
    matchedFields.push(field);
    onMatch();
    return;
  }
  conflictingFields.push(field);
}

function recommendedActionForScore(
  score: number,
  conflictingCount: number,
): DuplicateRecommendedAction {
  if (score >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD && conflictingCount === 0) {
    return 'link_after_staff_confirmation';
  }
  if (score >= DUPLICATE_REVIEW_THRESHOLD) return 'possible_duplicate_review';
  if (score >= DUPLICATE_MANUAL_REVIEW_THRESHOLD) return 'manual_review';
  return 'create_new_patient';
}

export function scorePatientDuplicate(
  patient: Pick<EmergencyPatient, 'id' | 'firstName' | 'lastName' | 'dob' | 'sex' | 'mrn'>,
  demographics: PatientDuplicateDemographics,
): PatientDuplicateCandidate | null {
  const matchedFields: string[] = [];
  const conflictingFields: string[] = [];
  let score = 0;

  compareField(
    'firstName',
    patient.firstName,
    demographics.firstName,
    matchedFields,
    conflictingFields,
    () => {
      score += 12;
    },
  );
  compareField(
    'lastName',
    patient.lastName,
    demographics.lastName,
    matchedFields,
    conflictingFields,
    () => {
      score += 16;
    },
  );
  compareField('dob', patient.dob, demographics.dob, matchedFields, conflictingFields, () => {
    score += 25;
  });
  compareField('sex', patient.sex, demographics.sex, matchedFields, conflictingFields, () => {
    score += 5;
  });
  compareField('mrn', patient.mrn, demographics.mrn, matchedFields, conflictingFields, () => {
    score += 35;
  });

  if (
    matchedFields.includes('firstName') &&
    matchedFields.includes('lastName') &&
    demographics.firstName &&
    demographics.lastName
  ) {
    score += 37;
    matchedFields.push('fullName');
  }

  const boundedScore = Math.min(100, Math.max(0, score - conflictingFields.length * 5));
  if (boundedScore <= 0) return null;

  return {
    patientId: patient.id,
    displayName: `${patient.firstName} ${patient.lastName}`.trim(),
    matchScore: boundedScore,
    matchedFields,
    conflictingFields,
    recommendedAction: recommendedActionForScore(boundedScore, conflictingFields.length),
    explanation: `${matchedFields.length} field(s) matched${
      conflictingFields.length ? `; conflicts: ${conflictingFields.join(', ')}` : ''
    }. Staff confirmation required before linking.`,
  };
}

export function findPatientDuplicateCandidates(
  patients: Array<Pick<EmergencyPatient, 'id' | 'firstName' | 'lastName' | 'dob' | 'sex' | 'mrn'>>,
  demographics: PatientDuplicateDemographics,
  options: { minScore?: number; limit?: number } = {},
): PatientDuplicateCandidate[] {
  const { minScore = DUPLICATE_REVIEW_THRESHOLD, limit = 5 } = options;
  return patients
    .map((patient) => scorePatientDuplicate(patient, demographics))
    .filter((candidate): candidate is PatientDuplicateCandidate => candidate !== null)
    .filter((candidate) => candidate.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
