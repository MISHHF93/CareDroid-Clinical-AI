import { PatientState, type Patient, type Referral, type Staff, type WorkflowActionLog } from '../types/emergency';
import {
  buildReassessmentTimerSnapshot,
  formatTimerClockTime,
  type ReassessmentTimerSnapshot,
} from '../engine/reassessmentTimerEngine';
import { resolveWhatHappensNext } from './whatHappensNextGuidance';
import {
  buildCommunicationEvents,
  formatCommunicationDuration,
  isWaitingRoomCommunicationEligible,
  resolveCommunicationRecency,
  type CommunicationRecencyTone,
  type WaitingRoomCommunicationKind,
} from './waitingRoomCommunicationLog';

export type PatientCommunicationStatusTone = CommunicationRecencyTone;

export type PatientCommunicationStatus = Readonly<{
  patientId: string;
  displayName: string;
  state: PatientState;
  lastPatientUpdateAt: string | null;
  lastPatientUpdateLabel: string;
  lastReassessmentAt: string | null;
  lastReassessmentLabel: string;
  lastVitalsAt: string | null;
  lastVitalsLabel: string;
  nextExpectedCheckpointAt: string | null;
  nextExpectedCheckpointLabel: string;
  nextExpectedCheckpointDetail: string | null;
  communicationOverdue: boolean;
  communicationOverdueLabel: string | null;
  tone: PatientCommunicationStatusTone;
  timer: ReassessmentTimerSnapshot;
}>;

export type PatientCommunicationStatusBoard = Readonly<{
  rows: readonly PatientCommunicationStatus[];
  overdueCount: number;
  summaryLine: string;
}>;

export type PatientCommunicationStatusContext = {
  now?: Date;
  workflowLogs?: WorkflowActionLog[];
  staff?: Staff[];
  referrals?: Referral[];
  settings?: Record<string, unknown> | null;
  /** Minutes without staff contact before flagged overdue. Default 30. */
  communicationOverdueMinutes?: number;
};

const PATIENT_UPDATE_KINDS = new Set<WaitingRoomCommunicationKind>([
  'patient-updated',
  'delay-informed',
  'queue-status-moved',
]);

const REASSESSMENT_KINDS = new Set<WaitingRoomCommunicationKind>(['reassessed']);
const VITALS_KINDS = new Set<WaitingRoomCommunicationKind>(['vitals-repeated']);

function minutesSince(timestamp: string | null | undefined, now: Date): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function patientDisplayName(patient: Patient): string {
  const first = patient.firstName?.trim() || '';
  const last = patient.lastName?.trim() || '';
  const name = `${first} ${last}`.trim();
  return name || patient.mrn || patient.id;
}

function maxTimestamp(left: string | null | undefined, right: string | null | undefined): string | null {
  if (!left) return right || null;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function latestEventTimestamp(
  events: ReturnType<typeof buildCommunicationEvents>,
  kinds: Set<WaitingRoomCommunicationKind>,
): string | null {
  for (const event of events) {
    if (kinds.has(event.kind)) return event.timestamp;
  }
  return null;
}

export function formatCommunicationStatusTimestamp(
  timestamp: string | null | undefined,
  now: Date,
  { unknownLabel = '—' }: any = {},
): string {
  if (!timestamp) return unknownLabel;
  const minutes = minutesSince(timestamp, now);
  const clock = formatTimerClockTime(timestamp);
  if (minutes === null) return clock;
  return `${clock} · ${formatCommunicationDuration(minutes)}`;
}

function resolveNextCheckpoint(input: {
  patient: Patient;
  timer: ReassessmentTimerSnapshot;
  communicationOverdue: boolean;
  now: Date;
  referrals?: Referral[];
  staff?: Staff[];
}): {
  at: string | null;
  label: string;
  detail: string | null;
} {
  const { patient, timer, communicationOverdue, now, referrals, staff } = input;

  if (timer.isOverdue || timer.stage === 'overdue') {
    return {
      at: timer.reassessmentDueTime || timer.overdueTime,
      label: 'Reassessment overdue',
      detail: timer.dueInLabel,
    };
  }

  if (timer.reassessmentDueTime && (timer.stage === 'due' || timer.stage === 'upcoming')) {
    return {
      at: timer.reassessmentDueTime,
      label: 'Reassessment due',
      detail: timer.dueInLabel,
    };
  }

  if (communicationOverdue) {
    return {
      at: now.toISOString(),
      label: 'Patient check-in due',
      detail: 'Staff contact is overdue for this waiting patient.',
    };
  }

  const nextStep = resolveWhatHappensNext(patient, { referrals, staff, now });
  if (nextStep) {
    return {
      at: timer.reassessmentDueTime,
      label: nextStep.shortLabel || nextStep.label,
      detail: nextStep.guidance,
    };
  }

  if (timer.reassessmentDueTime) {
    return {
      at: timer.reassessmentDueTime,
      label: 'Reassessment due',
      detail: timer.dueInLabel,
    };
  }

  return {
    at: null,
    label: 'Routine check-in',
    detail: 'No checkpoint scheduled — maintain routine waiting-room contact.',
  };
}

function resolveStatusTone(input: {
  communicationOverdue: boolean;
  communicationTone: CommunicationRecencyTone;
  timer: ReassessmentTimerSnapshot;
}): PatientCommunicationStatusTone {
  if (input.communicationOverdue || input.timer.isOverdue) return 'critical';
  if (input.communicationTone === 'critical' || input.communicationTone === 'warning') {
    return input.communicationTone;
  }
  if (input.timer.stage === 'due' || input.timer.stage === 'upcoming') return 'watch';
  return input.communicationTone;
}

/** Build internal communication status for a single waiting-room patient. */
export function buildPatientCommunicationStatus(
  patient: Patient,
  context: PatientCommunicationStatusContext = {},
): PatientCommunicationStatus | null {
  if (!isWaitingRoomCommunicationEligible(patient)) return null;

  const now = context.now || new Date();
  const events = buildCommunicationEvents(patient, {
    workflowLogs: context.workflowLogs,
    staff: context.staff,
  });
  const communication = resolveCommunicationRecency(patient, {
    now,
    workflowLogs: context.workflowLogs,
    staff: context.staff,
  });
  const timer = buildReassessmentTimerSnapshot(patient, {
    now,
    thresholds: context.settings?.thresholds as never,
  });

  const lastPatientUpdateAt = maxTimestamp(
    latestEventTimestamp(events, PATIENT_UPDATE_KINDS),
    timer.lastNurseContactTime,
  );
  const lastReassessmentAt = maxTimestamp(
    latestEventTimestamp(events, REASSESSMENT_KINDS),
    timer.lastReassessmentTime,
  );
  const lastVitalsAt = maxTimestamp(
    latestEventTimestamp(events, VITALS_KINDS),
    timer.lastVitalsTime,
  );

  const overdueMinutes = context.communicationOverdueMinutes ?? 30;
  const waitingMinutes = minutesSince(patient.triageTime || patient.arrivalTime, now) ?? 0;
  const contactMinutes = communication.minutesSinceContact;
  const communicationOverdue =
    contactMinutes === null
      ? waitingMinutes >= overdueMinutes
      : contactMinutes >= overdueMinutes;

  const nextCheckpoint = resolveNextCheckpoint({
    patient,
    timer,
    communicationOverdue,
    now,
    referrals: context.referrals,
    staff: context.staff,
  });

  const tone = resolveStatusTone({
    communicationOverdue,
    communicationTone: communication.tone,
    timer,
  });

  return Object.freeze({
    patientId: patient.id,
    displayName: patientDisplayName(patient),
    state: patient.state,
    lastPatientUpdateAt,
    lastPatientUpdateLabel: formatCommunicationStatusTimestamp(lastPatientUpdateAt, now, {
      unknownLabel: 'No update logged',
    }),
    lastReassessmentAt,
    lastReassessmentLabel: formatCommunicationStatusTimestamp(lastReassessmentAt, now, {
      unknownLabel: 'No reassessment logged',
    }),
    lastVitalsAt,
    lastVitalsLabel: formatCommunicationStatusTimestamp(lastVitalsAt, now, {
      unknownLabel: 'No vitals logged',
    }),
    nextExpectedCheckpointAt: nextCheckpoint.at,
    nextExpectedCheckpointLabel: nextCheckpoint.label,
    nextExpectedCheckpointDetail: nextCheckpoint.detail,
    communicationOverdue,
    communicationOverdueLabel: communicationOverdue
      ? contactMinutes === null
        ? 'No staff contact logged'
        : `Contact overdue · ${formatCommunicationDuration(contactMinutes)}`
      : null,
    tone,
    timer,
  });
}

export function buildPatientCommunicationStatusBoard(
  patients: Patient[] = [],
  context: PatientCommunicationStatusContext = {},
): PatientCommunicationStatusBoard {
  const rows = patients
    .map((patient) => buildPatientCommunicationStatus(patient, context))
    .filter((row): row is PatientCommunicationStatus => Boolean(row))
    .sort((left, right) => {
      if (left.communicationOverdue !== right.communicationOverdue) {
        return left.communicationOverdue ? -1 : 1;
      }
      const toneRank: Record<PatientCommunicationStatusTone, number> = {
        critical: 4,
        warning: 3,
        watch: 2,
        fresh: 1,
      };
      const toneDelta = toneRank[right.tone] - toneRank[left.tone];
      if (toneDelta !== 0) return toneDelta;
      return left.displayName.localeCompare(right.displayName);
    });

  const overdueCount = rows.filter((row) => row.communicationOverdue).length;
  const summaryLine =
    rows.length === 0
      ? 'No waiting patients to track for communication status.'
      : overdueCount
        ? `${overdueCount} of ${rows.length} waiting patients need staff contact.`
        : `${rows.length} waiting patients — communication checkpoints current.`;

  return Object.freeze({
    rows,
    overdueCount,
    summaryLine,
  });
}
