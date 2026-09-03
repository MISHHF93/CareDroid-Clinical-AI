import type { Patient } from '../types/emergency';
import {
  formatPrivacySafePatientName,
  type EmergencyDisplayPrivacyPolicy,
} from '../config/emergencyDisplayPrivacyPolicy';

export const MIN_PATIENT_NAME_SEARCH_LENGTH = 2;
export const DEFAULT_PATIENT_SEARCH_LIMIT = 8;

type PatientSearchSource = Pick<
  Patient,
  | 'id'
  | 'mrn'
  | 'firstName'
  | 'lastName'
  | 'name'
  | 'dob'
  | 'chiefComplaint'
  | 'complaint'
  | 'complaintCategory'
  | 'state'
  | 'priority'
> & {
  phone?: string;
  mobilePhone?: string;
  healthCardNumber?: string;
  healthCard?: string;
  phn?: string;
};

export type PatientSearchMatchKind =
  | 'exact-name'
  | 'exact-mrn'
  | 'exact-dob'
  | 'exact-phone'
  | 'exact-health-card'
  | 'prefix'
  | 'partial'
  | 'token';

export type PatientSearchResult<T extends PatientSearchSource = PatientSearchSource> = {
  patient: T;
  score: number;
  matchKind: PatientSearchMatchKind;
};

function normalizeText(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function parseDobQuery(query: string): string | null {
  const trimmed = String(query || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const month = slash[1].padStart(2, '0');
    const day = slash[2].padStart(2, '0');
    return `${slash[3]}-${month}-${day}`;
  }

  const compact = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) {
    return `${compact[3]}-${compact[1]}-${compact[2]}`;
  }

  return null;
}

export function getPatientDisplayName(
  patient: Pick<PatientSearchSource, 'id' | 'firstName' | 'lastName' | 'name' | 'mrn'>,
  privacyPolicy?: EmergencyDisplayPrivacyPolicy,
): string {
  if (privacyPolicy) {
    return formatPrivacySafePatientName(patient, privacyPolicy);
  }
  return (
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn
  );
}

export function getPatientSearchFields(patient: PatientSearchSource) {
  const displayName = normalizeText(getPatientDisplayName(patient));
  const mrn = normalizeText(patient.mrn);
  const dob = String(patient.dob || '').trim();
  const phone = patient.phone || patient.mobilePhone || '';
  const healthCard = patient.healthCardNumber || patient.healthCard || patient.phn || '';
  const phoneDigits = digitsOnly(phone);
  const healthCardDigits = digitsOnly(healthCard);
  const mrnDigits = digitsOnly(patient.mrn);
  const clinicalText = normalizeText(
    [
      patient.chiefComplaint,
      patient.complaint,
      patient.complaintCategory,
      patient.state,
      patient.priority,
    ]
      .filter(Boolean)
      .join(' '),
  );

  return {
    displayName,
    mrn,
    mrnDigits,
    dob,
    dobDigits: digitsOnly(dob),
    phone,
    phoneDigits,
    healthCard,
    healthCardDigits,
    clinicalText,
    lookupText: normalizeText(
      [displayName, mrn, dob, phone, healthCard, clinicalText, patient.id]
        .filter(Boolean)
        .join(' '),
    ),
  };
}

function isNumericHeavyQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  const digitCount = (trimmed.match(/\d/g) || []).length;
  return digitCount >= Math.max(2, Math.ceil(trimmed.length * 0.5));
}

export function isPatientSearchQueryReady(query: string): boolean {
  const trimmed = String(query || '').trim();
  if (!trimmed) return false;
  if (parseDobQuery(trimmed)) return true;
  if (isNumericHeavyQuery(trimmed)) return digitsOnly(trimmed).length >= 1;
  return trimmed.length >= MIN_PATIENT_NAME_SEARCH_LENGTH;
}

export function scorePatientSearch(
  patient: PatientSearchSource,
  query: string,
): { score: number; matchKind: PatientSearchMatchKind } | null {
  const trimmed = String(query || '').trim();
  if (!trimmed || !isPatientSearchQueryReady(trimmed)) return null;

  const fields = getPatientSearchFields(patient);
  const normalizedQuery = normalizeText(trimmed);
  const queryDigits = digitsOnly(trimmed);
  const parsedDob = parseDobQuery(trimmed);

  if (fields.displayName === normalizedQuery) {
    return { score: 1000, matchKind: 'exact-name' };
  }
  if (fields.mrn === normalizedQuery || (queryDigits && fields.mrnDigits === queryDigits)) {
    return { score: 980, matchKind: 'exact-mrn' };
  }
  if (parsedDob && fields.dob === parsedDob) {
    return { score: 960, matchKind: 'exact-dob' };
  }
  if (queryDigits.length >= 7 && fields.phoneDigits && fields.phoneDigits === queryDigits) {
    return { score: 940, matchKind: 'exact-phone' };
  }
  if (normalizeText(fields.phone) === normalizedQuery) {
    return { score: 935, matchKind: 'exact-phone' };
  }
  if (
    queryDigits.length >= 6 &&
    fields.healthCardDigits &&
    fields.healthCardDigits === queryDigits
  ) {
    return { score: 920, matchKind: 'exact-health-card' };
  }
  if (normalizeText(fields.healthCard) === normalizedQuery) {
    return { score: 915, matchKind: 'exact-health-card' };
  }

  if (fields.displayName.startsWith(normalizedQuery)) {
    return { score: 900 - fields.displayName.indexOf(normalizedQuery), matchKind: 'prefix' };
  }
  if (fields.mrn.startsWith(normalizedQuery)) {
    return { score: 880 - fields.mrn.indexOf(normalizedQuery), matchKind: 'prefix' };
  }
  if (parsedDob && fields.dob.startsWith(parsedDob)) {
    return { score: 860, matchKind: 'prefix' };
  }
  if (queryDigits.length >= 4 && fields.phoneDigits.endsWith(queryDigits)) {
    return { score: 840, matchKind: 'partial' };
  }
  if (queryDigits.length >= 4 && fields.healthCardDigits.includes(queryDigits)) {
    return { score: 820, matchKind: 'partial' };
  }
  if (queryDigits.length >= 3 && fields.mrnDigits.includes(queryDigits)) {
    return { score: 800, matchKind: 'partial' };
  }

  const nameIndex = fields.displayName.indexOf(normalizedQuery);
  if (nameIndex >= 0) {
    return { score: 780 - nameIndex, matchKind: 'partial' };
  }

  const clinicalIndex = fields.clinicalText.indexOf(normalizedQuery);
  if (clinicalIndex >= 0) {
    return { score: 620 - clinicalIndex, matchKind: 'partial' };
  }

  const initials = fields.displayName
    .split(' ')
    .map((part) => part[0])
    .join('');
  if (initials.startsWith(normalizedQuery.replace(/\s/g, ''))) {
    return { score: 600, matchKind: 'prefix' };
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => fields.lookupText.includes(token))) {
    return { score: 480 - tokens.length, matchKind: 'token' };
  }

  if (fields.lookupText.includes(normalizedQuery)) {
    return { score: 460, matchKind: 'partial' };
  }

  return null;
}

export function patientMatchesSearch(patient: PatientSearchSource, query: string): boolean {
  return scorePatientSearch(patient, query) !== null;
}

export function rankPatientsBySearch<T extends PatientSearchSource>(
  patients: T[],
  query: string,
  limit = DEFAULT_PATIENT_SEARCH_LIMIT,
): PatientSearchResult<T>[] {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];

  return patients
    .map((patient, order) => {
      const match = scorePatientSearch(patient, trimmed);
      return match ? { patient, order, ...match } : null;
    })
    .filter((item): item is PatientSearchResult<T> & { order: number } => item !== null)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, limit)
    .map(({ patient, score, matchKind }) => ({ patient, score, matchKind }));
}

export function filterPatientsBySearch<T extends PatientSearchSource>(
  patients: T[],
  query = '',
  { limit }: { limit?: number } = {},
): T[] {
  const trimmed = String(query || '').trim();
  if (!trimmed) return patients;
  return rankPatientsBySearch(patients, trimmed, limit ?? patients.length).map(
    (result) => result.patient,
  );
}

/**
 * SAFER patient-identification guidance: the moment a clinician chooses
 * between multiple search results is exactly where a same-name mix-up risk
 * is highest -- two different patients named "John Smith" with different
 * MRNs otherwise look identical at a glance in a results list, even though
 * formatPatientSearchHint already puts MRN/DOB in the row's secondary text
 * (nothing forces the reader to actually compare them). Returns the set of
 * patient ids that share a normalized display name with at least one OTHER
 * result in the same list, so the UI can flag exactly those rows.
 */
export function findSameNamePatientIds<T extends PatientSearchSource>(
  results: Array<{ patient: T }>,
): Set<string> {
  const byName = new Map<string, string[]>();
  for (const { patient } of results) {
    if (!patient.id) continue;
    const key = normalizeText(getPatientDisplayName(patient));
    if (!key) continue;
    const ids = byName.get(key) ?? [];
    ids.push(patient.id);
    byName.set(key, ids);
  }

  const collidingIds = new Set<string>();
  for (const ids of byName.values()) {
    if (ids.length > 1) ids.forEach((id) => collidingIds.add(id));
  }
  return collidingIds;
}

export function formatPatientSearchHint(
  patient: PatientSearchSource,
  matchKind?: PatientSearchMatchKind,
): string {
  const fields = getPatientSearchFields(patient);
  const parts = [patient.mrn];
  if (fields.dob) parts.push(fields.dob);
  if (matchKind === 'exact-phone' || matchKind === 'partial') {
    if (fields.phone) parts.push(fields.phone);
  }
  if (matchKind === 'exact-health-card' || matchKind === 'partial') {
    if (fields.healthCard) parts.push(fields.healthCard);
  }
  const complaint = patient.chiefComplaint || patient.complaint;
  if (complaint) parts.push(complaint);
  return parts.filter(Boolean).join(' · ');
}
