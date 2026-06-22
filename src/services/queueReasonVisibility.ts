import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import {
  classifyReferralBucket,
  isClosedReferralStatus,
} from '../components/whiteboard/referralAwarenessModel';
import { deriveProviderWaitingStatus } from '../components/whiteboard/waitingRoomSafetyBoardModel';
import { buildReassessmentTimerSnapshot } from '../engine/reassessmentTimerEngine';
import {
  deriveQueueDestination,
  deriveRegistrationStatus,
  deriveTriagePending,
} from './arrivalControlLayer';
import {
  PatientFlag,
  PatientState,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import { hasDueReassessmentReminder } from '../utils/reassessmentScheduler';

export type QueueReasonId =
  | 'triage-pending'
  | 'provider-pending'
  | 'room-pending'
  | 'result-pending'
  | 'referral-pending'
  | 'admission-bed-pending'
  | 'reassessment-pending'
  | 'registration-incomplete'
  | 'verification-incomplete';

export type QueueReasonTone = 'neutral' | 'info' | 'watch' | 'critical';

export type QueueReasonDefinition = {
  id: QueueReasonId;
  label: string;
  shortLabel: string;
  tone: QueueReasonTone;
};

export const QUEUE_REASON_DEFINITIONS: readonly QueueReasonDefinition[] = Object.freeze([
  {
    id: 'verification-incomplete',
    label: 'Verification incomplete',
    shortLabel: 'Verify',
    tone: 'watch',
  },
  {
    id: 'registration-incomplete',
    label: 'Registration incomplete',
    shortLabel: 'Register',
    tone: 'watch',
  },
  {
    id: 'triage-pending',
    label: 'Triage pending',
    shortLabel: 'Triage',
    tone: 'watch',
  },
  {
    id: 'reassessment-pending',
    label: 'Reassessment pending',
    shortLabel: 'Reassess',
    tone: 'critical',
  },
  {
    id: 'admission-bed-pending',
    label: 'Admission bed pending',
    shortLabel: 'Bed',
    tone: 'watch',
  },
  {
    id: 'referral-pending',
    label: 'Referral pending',
    shortLabel: 'Referral',
    tone: 'watch',
  },
  {
    id: 'result-pending',
    label: 'Result pending',
    shortLabel: 'Results',
    tone: 'info',
  },
  {
    id: 'room-pending',
    label: 'Room pending',
    shortLabel: 'Room',
    tone: 'watch',
  },
  {
    id: 'provider-pending',
    label: 'Provider pending',
    shortLabel: 'Provider',
    tone: 'watch',
  },
]);

const REASON_BY_ID = new Map(QUEUE_REASON_DEFINITIONS.map((reason) => [reason.id, reason]));

const REASON_PRIORITY: Record<QueueReasonId, number> = {
  'verification-incomplete': 1,
  'registration-incomplete': 2,
  'triage-pending': 3,
  'reassessment-pending': 4,
  'admission-bed-pending': 5,
  'referral-pending': 6,
  'result-pending': 7,
  'room-pending': 8,
  'provider-pending': 9,
};

const QUEUE_FLOW_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
]);

export type QueueReasonContext = {
  referrals?: Referral[];
  staff?: Staff[];
  now?: Date;
};

export type QueueReasonEntry = QueueReasonDefinition & {
  staffDetail: string;
};

export type QueueReasonSnapshot = {
  primaryReason: QueueReasonEntry;
  reasons: QueueReasonEntry[];
  labels: string[];
  staffDetail: string;
};

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

export function isInQueueFlow(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return QUEUE_FLOW_STATES.has(patient.state);
}

function activeReferral(patient: Patient, referrals: Referral[] = []): Referral | null {
  const match = referrals.find(
    (referral) =>
      referral.patientId === patient.id && classifyReferralBucket(referral) !== null,
  );
  if (match) return match;
  if (patient.referral && !isClosedReferralStatus(patient.referral.status)) {
    return patient.referral;
  }
  return null;
}

function pendingResultCount(patient: Patient): number {
  const timeline = patient.timeline || [];
  const orders = timeline.filter((event) => event.type === 'OrderPlaced').length;
  const results = timeline.filter((event) => event.type === 'ResultReceived').length;
  return Math.max(0, orders - results);
}

function needsTreatmentRoom(patient: Patient): boolean {
  const classificationId = patient.fitToWaitClassification?.id;
  if (classificationId === 'immediate-room-needed' || classificationId === 'stretcher-needed') {
    return true;
  }

  if (patient.roomId) return false;

  return patient.state === PatientState.Assessment;
}

function detectReasons(
  patient: Patient,
  context: QueueReasonContext,
): Array<{ id: QueueReasonId; staffDetail: string }> {
  if (!isInQueueFlow(patient)) return [];

  const now = context.now || new Date();
  const staff = context.staff || [];
  const referrals = context.referrals || [];
  const queueDestination = deriveQueueDestination(patient);
  const registrationStatus = deriveRegistrationStatus(patient);
  const reasons: Array<{ id: QueueReasonId; staffDetail: string }> = [];

  if (
    hasFlag(patient, PatientFlag.IdentityPending) ||
    registrationStatus === 'provisional' ||
    queueDestination === 'verification' ||
    (queueDestination === 'ems-registration' &&
      (patient.state === PatientState.Registration || patient.state === PatientState.Arrival))
  ) {
    reasons.push({
      id: 'verification-incomplete',
      staffDetail: `Identity verification lane · ${queueDestination}`,
    });
  }

  if (
    (patient.state === PatientState.Arrival || patient.state === PatientState.Registration) &&
    registrationStatus !== 'complete'
  ) {
    reasons.push({
      id: 'registration-incomplete',
      staffDetail: `Registration ${registrationStatus} · ${patient.state}`,
    });
  }

  if (
    patient.state === PatientState.Triage ||
    deriveTriagePending(patient) ||
    ((queueDestination === 'triage-queue' || queueDestination === 'rapid-review') &&
      !patient.triageTime)
  ) {
    reasons.push({
      id: 'triage-pending',
      staffDetail: `Awaiting triage · ${queueDestination}`,
    });
  }

  const timer = buildReassessmentTimerSnapshot(patient, { now });
  if (
    hasFlag(patient, PatientFlag.ReassessmentDue) ||
    hasDueReassessmentReminder(patient, now) ||
    timer.isOverdue
  ) {
    reasons.push({
      id: 'reassessment-pending',
      staffDetail: timer.isOverdue
        ? `Reassessment overdue · last ${timer.lastReassessmentAgeLabel}`
        : `Reassessment due · ${timer.dueInLabel}`,
    });
  }

  if (
    patient.state === PatientState.Admission ||
    hasFlag(patient, PatientFlag.PendingAdmission)
  ) {
    reasons.push({
      id: 'admission-bed-pending',
      staffDetail: `Inpatient bed placement · ${patient.state}`,
    });
  }

  const referral = activeReferral(patient, referrals);
  if (referral) {
    reasons.push({
      id: 'referral-pending',
      staffDetail: `Referral ${referral.status}${referral.service || referral.targetDepartment ? ` · ${referral.service || referral.targetDepartment}` : ''}`,
    });
  }

  if (patient.state === PatientState.Results) {
    reasons.push({
      id: 'result-pending',
      staffDetail: 'Results returned · review outstanding',
    });
  } else if (patient.state === PatientState.Orders || pendingResultCount(patient) > 0) {
    reasons.push({
      id: 'result-pending',
      staffDetail: `${Math.max(pendingResultCount(patient), 1)} result(s) outstanding`,
    });
  }

  if (needsTreatmentRoom(patient)) {
    reasons.push({
      id: 'room-pending',
      staffDetail: patient.fitToWaitClassification?.id
        ? `Fit-to-wait · ${patient.fitToWaitClassification.label || patient.fitToWaitClassification.id}`
        : 'Treatment room not assigned',
    });
  }

  const provider = deriveProviderWaitingStatus(patient, staff);
  if (
    patient.state === PatientState.Waiting &&
    (provider.label === 'Awaiting provider' ||
      provider.label.includes('not seen') ||
      provider.label.includes('Return'))
  ) {
    reasons.push({
      id: 'provider-pending',
      staffDetail: provider.label,
    });
  } else if (patient.state === PatientState.Waiting && !patient.assignedStaffId) {
    reasons.push({
      id: 'provider-pending',
      staffDetail: 'No assigned clinician',
    });
  }

  if (
    (patient.state === PatientState.Registration ||
      patient.state === PatientState.Arrival ||
      isEmsRegistrationPatient(patient)) &&
    !reasons.some((reason) => reason.id === 'triage-pending') &&
    !reasons.some((reason) => reason.id === 'registration-incomplete') &&
    !reasons.some((reason) => reason.id === 'verification-incomplete')
  ) {
    reasons.push({
      id: 'triage-pending',
      staffDetail: `Route to triage · ${queueDestination}`,
    });
  }

  return reasons;
}

function sortReasons(reasons: Array<{ id: QueueReasonId; staffDetail: string }>) {
  return [...reasons].sort(
    (left, right) => (REASON_PRIORITY[left.id] ?? 99) - (REASON_PRIORITY[right.id] ?? 99),
  );
}

function toEntry(reason: { id: QueueReasonId; staffDetail: string }): QueueReasonEntry {
  const definition = REASON_BY_ID.get(reason.id)!;
  return {
    ...definition,
    staffDetail: reason.staffDetail,
  };
}

export function resolveQueueReason(
  patient: Patient,
  context: QueueReasonContext = {},
): QueueReasonSnapshot | null {
  const detected = sortReasons(detectReasons(patient, context));
  if (!detected.length) return null;

  const reasons = detected.map(toEntry);
  const primaryReason = reasons[0];

  return {
    primaryReason,
    reasons,
    labels: reasons.map((reason) => reason.label),
    staffDetail: primaryReason.staffDetail,
  };
}

export function summarizeQueueReasonBoard(
  patients: Patient[] = [],
  context: QueueReasonContext = {},
): Record<QueueReasonId, number> {
  const counts = Object.fromEntries(
    QUEUE_REASON_DEFINITIONS.map((reason) => [reason.id, 0]),
  ) as Record<QueueReasonId, number>;

  patients.forEach((patient) => {
    const snapshot = resolveQueueReason(patient, context);
    if (snapshot) counts[snapshot.primaryReason.id] += 1;
  });

  return counts;
}

export type QueueReasonBoardLine = {
  id: QueueReasonId;
  label: string;
  shortLabel: string;
  tone: QueueReasonTone;
  count: number;
};

export function buildQueueReasonBoardSummary(
  patients: Patient[] = [],
  context: QueueReasonContext = {},
): { activeCount: number; statusLines: QueueReasonBoardLine[] } {
  const counts = summarizeQueueReasonBoard(patients, context);
  const statusLines = QUEUE_REASON_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    tone: definition.tone,
    count: counts[definition.id],
  })).filter((line) => line.count > 0);

  return {
    activeCount: patients.filter((patient) => resolveQueueReason(patient, context)).length,
    statusLines,
  };
}
