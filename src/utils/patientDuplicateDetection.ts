import type { Patient } from '../types/emergency';
import { getPatientDisplayName, parseDobQuery } from './patientSearch';

export const DUPLICATE_REVIEW_THRESHOLD = 65;
export const DUPLICATE_HIGH_CONFIDENCE_THRESHOLD = 85;

export type DuplicateRecommendedAction =
  | 'link_after_staff_confirmation'
  | 'possible_duplicate_review'
  | 'manual_review'
  | 'create_new_patient';

export type PatientDuplicateCandidate = {
  patientId: string;
  displayName: string;
  matchScore: number;
  matchedFields: string[];
  conflictingFields: string[];
  recommendedAction: DuplicateRecommendedAction;
  explanation: string;
};

export type ExtractedPatientDemographics = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  mrn?: string;
  healthCardNumber?: string;
  sex?: string;
  address?: string;
};

function normalize(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function compareField(
  field: string,
  patientValue: unknown,
  incomingValue: unknown,
  matchedFields: string[],
  conflictingFields: string[],
  onMatch: () => void,
) {
  if (!incomingValue || !patientValue) return;
  const patientDigits = digitsOnly(String(patientValue));
  const incomingDigits = digitsOnly(String(incomingValue));
  const normalizedMatch =
    normalize(patientValue) === normalize(incomingValue) ||
    (patientDigits.length >= 4 &&
      incomingDigits.length >= 4 &&
      patientDigits === incomingDigits);
  if (normalizedMatch) {
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
  if (score >= 35) return 'manual_review';
  return 'create_new_patient';
}

export function scorePatientDuplicate(
  patient: Patient,
  demographics: ExtractedPatientDemographics,
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
  compareField('dateOfBirth', patient.dob, demographics.dateOfBirth, matchedFields, conflictingFields, () => {
    score += 25;
  });
  compareField('phone', patient.phone, demographics.phone, matchedFields, conflictingFields, () => {
    score += 12;
  });
  compareField('sex', patient.sex, demographics.sex, matchedFields, conflictingFields, () => {
    score += 5;
  });
  compareField('mrn', patient.mrn, demographics.mrn, matchedFields, conflictingFields, () => {
    score += 35;
  });

  const healthCard =
    patient.healthCardNumber || patient.healthCard || patient.phn || '';
  compareField(
    'healthCardNumber',
    healthCard,
    demographics.healthCardNumber,
    matchedFields,
    conflictingFields,
    () => {
      score += 35;
    },
  );

  if (
    matchedFields.includes('firstName') &&
    matchedFields.includes('lastName') &&
    demographics.firstName &&
    demographics.lastName
  ) {
    score += 37;
    if (!matchedFields.includes('fullName')) matchedFields.push('fullName');
  }

  const boundedScore = Math.min(100, Math.max(0, score - conflictingFields.length * 5));
  if (boundedScore <= 0) return null;

  const recommendedAction = recommendedActionForScore(boundedScore, conflictingFields.length);
  return {
    patientId: patient.id,
    displayName: getPatientDisplayName(patient),
    matchScore: boundedScore,
    matchedFields,
    conflictingFields,
    recommendedAction,
    explanation: `${matchedFields.length} fields matched${
      conflictingFields.length ? `; conflicts: ${conflictingFields.join(', ')}` : ''
    }. Staff confirmation required before linking.`,
  };
}

export function findDuplicateCandidates(
  patients: Patient[],
  demographics: ExtractedPatientDemographics,
  { minScore = DUPLICATE_REVIEW_THRESHOLD, limit = 5 }: any = {},
): PatientDuplicateCandidate[] {
  return patients
    .map((patient) => scorePatientDuplicate(patient, demographics))
    .filter((candidate): candidate is PatientDuplicateCandidate => candidate !== null)
    .filter((candidate) => candidate.matchScore >= minScore)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, limit);
}

export function demographicsFromSearchQuery(query: string): ExtractedPatientDemographics {
  const trimmed = String(query || '').trim();
  if (!trimmed) return {};

  const parsedDob = parseDobQuery(trimmed);
  if (parsedDob) return { dateOfBirth: parsedDob };

  const digits = digitsOnly(trimmed);
  if (digits.length >= 6) {
    if (/^ED-/i.test(trimmed)) {
      return { mrn: trimmed };
    }
    if (/^HC-/i.test(trimmed)) {
      return { healthCardNumber: trimmed };
    }
    return {
      mrn: trimmed,
      healthCardNumber: trimmed,
      phone: trimmed,
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  return {
    firstName: trimmed,
    lastName: trimmed,
    mrn: trimmed,
  };
}

export function findDuplicateCandidatesFromQuery(
  patients: Patient[],
  query: string,
  options: { minScore?: number; limit?: number } = {},
) {
  return findDuplicateCandidates(patients, demographicsFromSearchQuery(query), options);
}

export function patientToDemographics(patient: Patient): ExtractedPatientDemographics {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dob,
    phone: patient.phone,
    mrn: patient.mrn,
    healthCardNumber: patient.healthCardNumber || patient.healthCard || patient.phn,
    sex: patient.sex,
  };
}

export function duplicateActionLabel(action: DuplicateRecommendedAction): string {
  if (action === 'link_after_staff_confirmation') return 'Likely existing patient';
  if (action === 'possible_duplicate_review') return 'Possible duplicate';
  if (action === 'manual_review') return 'Review match';
  return 'Low confidence';
}

export function mergeDuplicateCandidates(
  primary: PatientDuplicateCandidate[],
  secondary: PatientDuplicateCandidate[] = [],
): PatientDuplicateCandidate[] {
  const merged = new Map<string, PatientDuplicateCandidate>();
  for (const candidate of [...primary, ...secondary]) {
    const existing = merged.get(candidate.patientId);
    if (!existing || candidate.matchScore > existing.matchScore) {
      merged.set(candidate.patientId, candidate);
    }
  }
  return [...merged.values()].sort((left, right) => right.matchScore - left.matchScore);
}

export type DuplicatePatientPair = {
  patientIdA: string;
  patientIdB: string;
  displayNameA: string;
  displayNameB: string;
  matchScore: number;
  matchedFields: string[];
  recommendedAction: DuplicateRecommendedAction;
};

export function discoverDuplicatePatientPairs(
  patients: Patient[],
  { minScore = DUPLICATE_REVIEW_THRESHOLD }: any = {},
): DuplicatePatientPair[] {
  const pairs: DuplicatePatientPair[] = [];
  const seen = new Set<string>();

  patients.forEach((source) => {
    const candidates = findDuplicateCandidates(
      patients.filter((patient) => patient.id !== source.id),
      patientToDemographics(source),
      { minScore, limit: 3 },
    );

    candidates.forEach((candidate) => {
      const pairKey = [source.id, candidate.patientId].sort().join('::');
      if (seen.has(pairKey)) return;
      seen.add(pairKey);
      pairs.push({
        patientIdA: source.id,
        patientIdB: candidate.patientId,
        displayNameA: getPatientDisplayName(source),
        displayNameB: candidate.displayName,
        matchScore: candidate.matchScore,
        matchedFields: candidate.matchedFields,
        recommendedAction: candidate.recommendedAction,
      });
    });
  });

  return pairs.sort((left, right) => right.matchScore - left.matchScore);
}
