import { CANONICAL_ROUTES } from '../config/routes.config';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import type { EMSArrival, Patient, QueueSummary, Referral } from '../types/emergency';
import { getExistingEncounterId } from './intakeEncounter';
import {
  getPatientDisplayName,
  getPatientSearchFields,
  isPatientSearchQueryReady,
  rankPatientsBySearch,
  scorePatientSearch,
} from '../utils/patientSearch';

export const OPERATIONAL_SEARCH_ENTITY_TYPES = [
  'patient',
  'encounter',
  'referral',
  'ems',
  'queue',
] as const;

export type OperationalSearchEntityType = (typeof OPERATIONAL_SEARCH_ENTITY_TYPES)[number];

export type OperationalSearchHit = {
  entityType: OperationalSearchEntityType;
  id: string;
  label: string;
  hint: string;
  score: number;
  patientId?: string;
  encounterId?: string;
  referralId?: string;
  emsArrivalId?: string;
  queueType?: string;
};

export type OperationalSearchLimits = {
  patient?: number;
  encounter?: number;
  referral?: number;
  ems?: number;
  queue?: number;
  total?: number;
};

const DEFAULT_LIMITS: Required<OperationalSearchLimits> = {
  patient: 6,
  encounter: 4,
  referral: 4,
  ems: 4,
  queue: 4,
  total: 16,
};

function normalizeQuery(query: string): string {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function includesQuery(haystack: string, query: string): boolean {
  const normalizedHaystack = normalizeQuery(haystack);
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return false;
  if (normalizedHaystack.includes(normalizedQuery)) return true;
  return normalizedQuery
    .split(' ')
    .filter(Boolean)
    .every((token) => normalizedHaystack.includes(token));
}

function scoreTextMatch(value: string, query: string, baseScore: number): number | null {
  const normalizedValue = normalizeQuery(value);
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedValue || !normalizedQuery) return null;
  if (normalizedValue === normalizedQuery) return baseScore;
  if (normalizedValue.startsWith(normalizedQuery)) return baseScore - 20;
  if (normalizedValue.includes(normalizedQuery)) return baseScore - 60;
  return null;
}

function patientById(patients: Patient[]): Map<string, Patient> {
  return new Map(patients.map((patient) => [patient.id, patient]));
}

function searchPatientHits(patients: Patient[], query: string, limit: number): OperationalSearchHit[] {
  if (!isPatientSearchQueryReady(query)) return [];
  return rankPatientsBySearch(patients, query, limit).map(({ patient, score, matchKind }) => ({
    entityType: 'patient',
    id: `patient-${patient.id}`,
    label: getPatientDisplayName(patient),
    hint: `${patient.mrn} · ${patient.state} · ${patient.chiefComplaint || patient.complaint || 'No complaint'} · ${matchKind}`,
    score,
    patientId: patient.id,
    encounterId: getExistingEncounterId(patient) || undefined,
  }));
}

function searchEncounterHits(patients: Patient[], query: string, limit: number): OperationalSearchHit[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length < 3) return [];

  const hits: OperationalSearchHit[] = [];
  for (const patient of patients) {
    const encounterId = getExistingEncounterId(patient);
    if (!encounterId) continue;

    const score =
      scoreTextMatch(encounterId, query, 940) ||
      (normalizedQuery.startsWith('encounter') ? scoreTextMatch(encounterId, query.replace(/^encounter[-\s]*/, ''), 900) : null);
    if (!score) continue;

    hits.push({
      entityType: 'encounter',
      id: `encounter-${encounterId}`,
      label: encounterId,
      hint: `${getPatientDisplayName(patient)} · ${patient.state} · ${patient.chiefComplaint || 'Encounter active'}`,
      score,
      patientId: patient.id,
      encounterId,
    });
  }

  return hits.sort((left, right) => right.score - left.score).slice(0, limit);
}

function searchReferralHits(
  referrals: Referral[],
  patients: Patient[],
  query: string,
  limit: number,
): OperationalSearchHit[] {
  const lookup = patientById(patients);
  const hits: OperationalSearchHit[] = [];

  for (const referral of referrals) {
    const patient = lookup.get(referral.patientId);
    const patientLabel = patient ? getPatientDisplayName(patient) : referral.patientId;
    const searchable = [
      referral.id,
      referral.patientId,
      referral.targetDepartment,
      referral.service,
      referral.reason,
      referral.summary,
      referral.status,
      referral.urgency,
      patientLabel,
    ]
      .filter(Boolean)
      .join(' ');

    const score =
      scoreTextMatch(referral.id, query, 960) ||
      scoreTextMatch(String(referral.targetDepartment || ''), query, 880) ||
      (includesQuery(searchable, query) ? 760 : null);
    if (!score) continue;

    hits.push({
      entityType: 'referral',
      id: `referral-${referral.id}`,
      label: `${referral.targetDepartment || referral.service || 'Referral'} · ${patientLabel}`,
      hint: `${referral.status} · ${referral.urgency || 'Routine'} · ${referral.reason || referral.summary || 'Open referral'}`,
      score,
      patientId: referral.patientId,
      referralId: referral.id,
    });
  }

  return hits.sort((left, right) => right.score - left.score).slice(0, limit);
}

function searchEmsHits(
  emsArrivals: EMSArrival[],
  patients: Patient[],
  query: string,
  limit: number,
): OperationalSearchHit[] {
  const lookup = patientById(patients);
  const hits: OperationalSearchHit[] = [];

  for (const arrival of emsArrivals) {
    const patient = arrival.patientId ? lookup.get(arrival.patientId) : undefined;
    const searchable = [
      arrival.id,
      arrival.unitId,
      arrival.unitName,
      arrival.chiefComplaint,
      arrival.prearrivalComplaint,
      arrival.status,
      arrival.severity,
      patient ? getPatientDisplayName(patient) : '',
    ]
      .filter(Boolean)
      .join(' ');

    const score =
      scoreTextMatch(arrival.id, query, 970) ||
      scoreTextMatch(String(arrival.unitId), query, 950) ||
      scoreTextMatch(String(arrival.unitName), query, 900) ||
      (includesQuery(searchable, query) ? 780 : null);
    if (!score) continue;

    hits.push({
      entityType: 'ems',
      id: `ems-${arrival.id}`,
      label: `${arrival.unitId} · ${arrival.chiefComplaint || arrival.prearrivalComplaint || 'EMS case'}`,
      hint: `${arrival.status} · ${arrival.severity} · ETA ${arrival.eta}m${patient ? ` · ${getPatientDisplayName(patient)}` : ''}`,
      score,
      patientId: arrival.patientId,
      emsArrivalId: arrival.id,
    });
  }

  return hits.sort((left, right) => right.score - left.score).slice(0, limit);
}

const QUEUE_LABELS: Record<string, string> = {
  [WHITEBOARD_QUEUE_FILTER.triage]: 'Triage queue',
  [WHITEBOARD_QUEUE_FILTER.waiting]: 'Waiting queue',
  [WHITEBOARD_QUEUE_FILTER.ems]: 'EMS queue',
  [WHITEBOARD_QUEUE_FILTER.reassessment]: 'Reassessment queue',
  pretriage: 'Awaiting triage',
  verification: 'Verification queue',
  referral: 'Referral queue',
};

function resolvePatientQueueLabel(patient: Patient): string {
  if (patient.state) return `${patient.state} queue`;
  return 'Active queue';
}

function searchQueueHits(
  patients: Patient[],
  queues: QueueSummary[],
  query: string,
  limit: number,
): OperationalSearchHit[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length < 2) return [];

  const hits: OperationalSearchHit[] = [];

  for (const queue of queues) {
    const queueKey = String(queue.type || queue.label || queue.id || '');
    const queueLabel = queue.label || QUEUE_LABELS[queueKey] || queueKey;
    const queueScore =
      scoreTextMatch(queueLabel, query, 860) ||
      scoreTextMatch(queueKey, query, 840) ||
      (includesQuery(`${queueLabel} queue ${queueKey}`, query) ? 820 : null);
    if (queueScore) {
      hits.push({
        entityType: 'queue',
        id: `queue-${queue.id || queueKey}`,
        label: queueLabel,
        hint: `${queue.count ?? 0} patients · longest ${queue.longestWaitMinutes ?? 0}m`,
        score: queueScore,
        queueType: queueKey,
      });
    }
  }

  for (const patient of patients) {
    const patientScore = scorePatientSearch(patient, query);
    if (!patientScore) continue;

    const queueType = patient.state || 'Waiting';
    const queueLabel = QUEUE_LABELS[queueType] || resolvePatientQueueLabel(patient);
    const queueQueryMatch =
      scoreTextMatch(queueLabel, query, 820) ||
      scoreTextMatch(queueType, query, 800) ||
      (includesQuery('queue waiting triage ems reassessment', query) ? 700 : null);

    hits.push({
      entityType: 'queue',
      id: `queue-patient-${patient.id}`,
      label: `${queueLabel} · ${getPatientDisplayName(patient)}`,
      hint: `${patient.mrn} · ${patient.priority} · ${patient.chiefComplaint || 'Queue item'}`,
      score: patientScore.score + (queueQueryMatch || 0),
      patientId: patient.id,
      queueType,
    });
  }

  return hits.sort((left, right) => right.score - left.score).slice(0, limit);
}

export function searchOperationalEntities(
  {
    query = '',
    patients = [] as any[],
    referrals = [] as any[],
    emsArrivals = [] as any[],
    queues = [] as any[],
  }: {
    query?: string;
    patients?: Patient[];
    referrals?: Referral[];
    emsArrivals?: EMSArrival[];
    queues?: QueueSummary[];
  },
  limits: OperationalSearchLimits = {},
): OperationalSearchHit[] {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];

  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };
  const grouped = {
    patient: searchPatientHits(patients, trimmed, resolvedLimits.patient),
    encounter: searchEncounterHits(patients, trimmed, resolvedLimits.encounter),
    referral: searchReferralHits(referrals, patients, trimmed, resolvedLimits.referral),
    ems: searchEmsHits(emsArrivals, patients, trimmed, resolvedLimits.ems),
    queue: searchQueueHits(patients, queues, trimmed, resolvedLimits.queue),
  };

  return Object.values(grouped)
    .flat()
    .sort((left, right) => right.score - left.score)
    .slice(0, resolvedLimits.total);
}

export function groupOperationalSearchHits(hits: OperationalSearchHit[] = []) {
  return Object.freeze({
    patient: hits.filter((hit) => hit.entityType === 'patient'),
    encounter: hits.filter((hit) => hit.entityType === 'encounter'),
    referral: hits.filter((hit) => hit.entityType === 'referral'),
    ems: hits.filter((hit) => hit.entityType === 'ems'),
    queue: hits.filter((hit) => hit.entityType === 'queue'),
  });
}

export function auditOperationalSearchCoverage(hits: OperationalSearchHit[] = []) {
  const found = new Set(hits.map((hit) => hit.entityType));
  const missing = OPERATIONAL_SEARCH_ENTITY_TYPES.filter((entityType) => !found.has(entityType));
  return Object.freeze({
    passesSingleSearchTest: missing.length === 0,
    found: [...found],
    missing,
    hitCount: hits.length,
    recommendation:
      missing.length === 0
        ? 'Unified search surfaces patient, encounter, referral, EMS, and queue hits.'
        : `Wire ${missing.join(', ')} into CommandPalette and Header search.`,
  });
}

export function patientHitsFromOperationalSearch(hits: OperationalSearchHit[] = []) {
  return hits.filter((hit) => hit.entityType === 'patient');
}

export function formatOperationalSearchEntityLabel(entityType: OperationalSearchEntityType): string {
  if (entityType === 'ems') return 'EMS case';
  if (entityType === 'queue') return 'Queue item';
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

export function operationalSearchHaystack(hit: OperationalSearchHit): string {
  return normalizeQuery([hit.label, hit.hint, hit.id, hit.patientId, hit.encounterId].filter(Boolean).join(' '));
}

export function getPatientSearchFieldsForOperationalAudit(patient: Patient) {
  return getPatientSearchFields(patient);
}
