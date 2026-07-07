import {
  resolvePatientExperienceStatus,
  summarizePatientExperienceStatuses,
  type PatientExperienceContext,
} from './patientExperienceStatus';
import type { CapacitySnapshot, Patient, Referral } from '../types/emergency';
import type { PatientExperienceStatusId } from '../types/emergency';

export type WaitingRoomStatusMessageId =
  | 'registered'
  | 'waiting-for-triage'
  | 'waiting-for-clinician'
  | 'tests-in-progress'
  | 'waiting-for-results'
  | 'waiting-for-specialist-review'
  | 'preparing-discharge'
  | 'awaiting-admission-bed'
  | 'longer-wait-advisory'
  | 'symptom-escalation';

export type WaitingRoomStatusTone = 'neutral' | 'info' | 'watch' | 'warning' | 'critical' | 'stable';

export type WaitingRoomStatusMessageKind = 'process-status' | 'advisory' | 'safety';

export type WaitingRoomStatusMessageDefinition = {
  id: WaitingRoomStatusMessageId;
  patientMessage: string;
  staffMessage: string;
  tone: WaitingRoomStatusTone;
  kind: WaitingRoomStatusMessageKind;
};

export type WaitingRoomStatusLine = {
  id: WaitingRoomStatusMessageId;
  message: string;
  count: number;
  tone: WaitingRoomStatusTone;
  kind: WaitingRoomStatusMessageKind;
};

export type WaitingRoomStatusMessagingSnapshot = {
  statusLines: WaitingRoomStatusLine[];
  advisories: WaitingRoomStatusLine[];
  escalationMessage: string;
  longerWaitActive: boolean;
  summaryLine: string;
  updatedAt: string | null;
};

export const WAITING_ROOM_STATUS_MESSAGE_REGISTRY: readonly WaitingRoomStatusMessageDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'registered',
      patientMessage: 'You are registered',
      staffMessage: 'Registered — next step pending',
      tone: 'neutral',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'waiting-for-triage',
      patientMessage: 'Waiting for triage',
      staffMessage: 'Waiting for triage nurse assessment',
      tone: 'watch',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'waiting-for-clinician',
      patientMessage: 'Waiting for clinician',
      staffMessage: 'Waiting for clinician assessment',
      tone: 'watch',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'tests-in-progress',
      patientMessage: 'Tests in progress',
      staffMessage: 'Diagnostic tests in progress',
      tone: 'info',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'waiting-for-results',
      patientMessage: 'Waiting for results',
      staffMessage: 'Waiting for test results review',
      tone: 'watch',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'waiting-for-specialist-review',
      patientMessage: 'Waiting for specialist review',
      staffMessage: 'Waiting for specialist review',
      tone: 'watch',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'preparing-discharge',
      patientMessage: 'Preparing for discharge',
      staffMessage: 'Preparing discharge — final paperwork and instructions',
      tone: 'stable',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'awaiting-admission-bed',
      patientMessage: 'Awaiting admission bed',
      staffMessage: 'Awaiting inpatient bed assignment',
      tone: 'watch',
      kind: 'process-status',
    }),
    Object.freeze({
      id: 'longer-wait-advisory',
      patientMessage: 'We are experiencing longer than usual wait times',
      staffMessage: 'Longer than usual wait times — set expectations at the desk',
      tone: 'warning',
      kind: 'advisory',
    }),
    Object.freeze({
      id: 'symptom-escalation',
      patientMessage: 'If your symptoms worsen, notify staff immediately',
      staffMessage: 'Escalate immediately if symptoms worsen',
      tone: 'critical',
      kind: 'safety',
    }),
  ]);

/** @deprecated Use WAITING_ROOM_STATUS_MESSAGE_REGISTRY symptom-escalation entry. */
export const PUBLIC_WAITING_ESCALATION_MESSAGE =
  WAITING_ROOM_STATUS_MESSAGE_REGISTRY.find((entry) => entry.id === 'symptom-escalation')!
    .patientMessage;

const MESSAGE_BY_ID = Object.freeze(
  Object.fromEntries(
    WAITING_ROOM_STATUS_MESSAGE_REGISTRY.map((definition) => [definition.id, definition]),
  ),
) as Record<WaitingRoomStatusMessageId, WaitingRoomStatusMessageDefinition>;

const PROCESS_STATUS_ORDER: readonly WaitingRoomStatusMessageId[] = Object.freeze([
  'registered',
  'waiting-for-triage',
  'waiting-for-clinician',
  'tests-in-progress',
  'waiting-for-results',
  'waiting-for-specialist-review',
  'preparing-discharge',
  'awaiting-admission-bed',
]);

const EXPERIENCE_STATUS_TO_MESSAGE: Record<
  PatientExperienceStatusId,
  WaitingRoomStatusMessageId
> = Object.freeze({
  registered: 'registered',
  'waiting-for-triage': 'waiting-for-triage',
  'waiting-for-clinician': 'waiting-for-clinician',
  'tests-in-progress': 'tests-in-progress',
  'waiting-for-results': 'waiting-for-results',
  'waiting-for-specialist-review': 'waiting-for-specialist-review',
  'preparing-discharge': 'preparing-discharge',
  'awaiting-admission-bed': 'awaiting-admission-bed',
});

const PHI_PATTERN =
  /\b(mrn|dob|ssn|@[a-z0-9.-]+\.[a-z]{2,})\b|(?:\b\d{3}-\d{2}-\d{4}\b)|(?:\b\d{2}\/\d{2}\/\d{4}\b)/i;

export function getWaitingRoomStatusMessageDefinition(
  id: WaitingRoomStatusMessageId,
): WaitingRoomStatusMessageDefinition {
  return MESSAGE_BY_ID[id];
}

export function mapExperienceStatusToWaitingRoomMessageId(
  statusId: PatientExperienceStatusId,
): WaitingRoomStatusMessageId {
  return EXPERIENCE_STATUS_TO_MESSAGE[statusId];
}

export function resolveWaitingRoomStatusMessage(
  id: WaitingRoomStatusMessageId,
  audience: 'patient' | 'staff' = 'patient',
): string {
  const definition = MESSAGE_BY_ID[id];
  return audience === 'staff' ? definition.staffMessage : definition.patientMessage;
}

export function resolvePatientWaitingRoomStatusId(
  patient: Patient,
  context: PatientExperienceContext = {},
): WaitingRoomStatusMessageId {
  if (patient.arrival?.waitingRoomStatus) {
    return mapExperienceStatusToWaitingRoomMessageId(patient.arrival.waitingRoomStatus);
  }

  const experience = resolvePatientExperienceStatus(patient, context);
  return mapExperienceStatusToWaitingRoomMessageId(experience.id);
}

export function resolvePatientWaitingRoomMessage(
  patient: Patient,
  context: PatientExperienceContext = {},
  audience: 'patient' | 'staff' = 'patient',
): string | null {
  const messageId = resolvePatientWaitingRoomStatusId(patient, context);
  return resolveWaitingRoomStatusMessage(messageId, audience);
}

function shouldShowLongerWaitAdvisory(input: {
  waitingCount: number;
  capacityBand?: string;
  averageWaitMinutes?: number;
  longestWaitMinutes?: number;
}): boolean {
  const band = input.capacityBand || 'Green';
  if (band === 'Red' || band === 'Orange') return true;
  if ((input.waitingCount ?? 0) >= 12) return true;
  if ((input.averageWaitMinutes ?? 0) >= 90) return true;
  if ((input.longestWaitMinutes ?? 0) >= 120) return true;
  return false;
}

function buildStatusLine(
  id: WaitingRoomStatusMessageId,
  count: number,
  audience: 'patient' | 'staff',
): WaitingRoomStatusLine | null {
  if (count <= 0 && id !== 'symptom-escalation' && id !== 'longer-wait-advisory') return null;
  const definition = MESSAGE_BY_ID[id];
  return {
    id,
    message: audience === 'staff' ? definition.staffMessage : definition.patientMessage,
    count,
    tone: definition.tone,
    kind: definition.kind,
  };
}

export function buildWaitingRoomStatusMessagingSnapshot(
  input: {
    patients?: Patient[];
    referrals?: Referral[];
    capacity?: CapacitySnapshot;
    now?: Date;
    updatedAt?: string | null;
    audience?: 'patient' | 'staff';
  } = {},
): WaitingRoomStatusMessagingSnapshot {
  const audience = input.audience || 'patient';
  const patients = input.patients || [];
  const capacity = input.capacity;
  const experienceCounts = summarizePatientExperienceStatuses(patients, {
    referrals: input.referrals,
  });

  const messageCounts = Object.fromEntries(
    PROCESS_STATUS_ORDER.map((id) => [id, 0]),
  ) as Record<WaitingRoomStatusMessageId, number>;

  (Object.entries(experienceCounts) as Array<[PatientExperienceStatusId, number]>).forEach(
    ([statusId, count]) => {
      const messageId = mapExperienceStatusToWaitingRoomMessageId(statusId);
      messageCounts[messageId] += count;
    },
  );

  const statusLines = PROCESS_STATUS_ORDER.map((id) =>
    buildStatusLine(id, messageCounts[id], audience),
  ).filter((line): line is WaitingRoomStatusLine => Boolean(line));

  const waitingCount = capacity?.waitingCount ?? messageCounts['waiting-for-clinician'];
  const longerWaitActive = shouldShowLongerWaitAdvisory({
    waitingCount,
    capacityBand: capacity?.band,
    averageWaitMinutes: capacity?.averageWaitMinutes,
    longestWaitMinutes: capacity?.longestWaitMinutes,
  });

  const advisories: WaitingRoomStatusLine[] = [];
  if (longerWaitActive) {
    const advisory = buildStatusLine('longer-wait-advisory', 0, audience);
    if (advisory) advisories.push({ ...advisory, count: 0 });
  }
  const escalation = buildStatusLine('symptom-escalation', 0, audience);
  if (escalation) advisories.push({ ...escalation, count: 0 });

  const escalationMessage = resolveWaitingRoomStatusMessage('symptom-escalation', 'patient');
  const summaryParts = [
    statusLines.length ? `${statusLines.length} active status groups` : null,
    longerWaitActive ? 'longer waits advisory' : null,
    'symptom escalation guidance posted',
  ].filter(Boolean);

  return {
    statusLines,
    advisories,
    escalationMessage,
    longerWaitActive,
    summaryLine: summaryParts.join(' · ') || 'Waiting room status messaging ready',
    updatedAt: input.updatedAt ?? capacity?.updatedAt ?? null,
  };
}

/** Validates that serialized messaging output contains no obvious PHI tokens. */
export function assertWaitingRoomMessagingIsPhiSafe(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return !PHI_PATTERN.test(serialized);
}
