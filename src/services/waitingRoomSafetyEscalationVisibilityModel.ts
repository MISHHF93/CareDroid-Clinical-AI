import {
  buildReassessmentTimerSnapshot,
} from '../engine/reassessmentTimerEngine';
import {
  patientHasHighRiskComplaintFlags,
  patientNeedsRapidReview,
} from './highRiskComplaintFlags';
import {
  buildCommunicationEvents,
  resolveCommunicationRecency,
} from './waitingRoomCommunicationLog';
import { RECEPTION_ESCALATION_ALERT_SOURCE } from './receptionEscalationWorkflow';
import {
  PatientFlag,
  PatientState,
  type Alert,
  type EMSArrival,
  type Patient,
  type Staff,
  type WorkflowActionLog,
} from '../types/emergency';
import { hasDueReassessmentReminder } from '../utils/reassessmentScheduler';

export type WaitingRoomSafetyEscalationTriggerId =
  | 'overdue-reassessment'
  | 'abnormal-vitals'
  | 'high-risk-complaint'
  | 'long-since-contact'
  | 'worsening-symptoms';

export type WaitingRoomSafetyEscalationTone = 'neutral' | 'watch' | 'warning' | 'critical';

export type WaitingRoomSafetyEscalationPatientRow = {
  patientId: string;
  displayName: string;
  triggerIds: WaitingRoomSafetyEscalationTriggerId[];
  tone: WaitingRoomSafetyEscalationTone;
  detail: string;
};

export type WaitingRoomSafetyEscalationSnapshot = {
  escalatedPatientCount: number;
  overdueReassessmentCount: number;
  abnormalVitalsCount: number;
  highRiskComplaintCount: number;
  longSinceContactCount: number;
  worseningSymptomsCount: number;
  rows: WaitingRoomSafetyEscalationPatientRow[];
  previewRows: WaitingRoomSafetyEscalationPatientRow[];
};

export type WaitingRoomSafetyEscalationStripMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: WaitingRoomSafetyEscalationTone;
};

export type WaitingRoomSafetyEscalationContext = {
  now?: Date;
  emsArrivals?: EMSArrival[];
  workflowLogs?: WorkflowActionLog[];
  staff?: Staff[];
  alerts?: Alert[];
  communicationOverdueMinutes?: number;
};

const TRIGGER_LABELS: Readonly<Record<WaitingRoomSafetyEscalationTriggerId, string>> = Object.freeze({
  'overdue-reassessment': 'Overdue reassessment',
  'abnormal-vitals': 'Abnormal vitals',
  'high-risk-complaint': 'High-risk complaint',
  'long-since-contact': 'Long since contact',
  'worsening-symptoms': 'Worsening symptoms',
});

export const WAITING_ROOM_SAFETY_ESCALATION_SURFACES = Object.freeze([
  'reception',
  'triage',
  'charge-nurse',
  'notification-center',
  'whiteboard',
]);

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Patient'
  );
}

function minutesSince(timestamp?: string | null, now = new Date()): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function getLatestVitals(patient: Patient) {
  if (Array.isArray(patient.vitals) && patient.vitals.length > 0) {
    return patient.vitals[patient.vitals.length - 1];
  }
  return patient.vitals;
}

function hasAbnormalVitals(patient: Patient): boolean {
  if ((patient.vitalsAlerts || []).length > 0) return true;
  const vitals = getLatestVitals(patient);
  if (!vitals || typeof vitals !== 'object') return false;
  const hr = vitals.hr || vitals.heartRate;
  const sbp = vitals.sbp || vitals.bpSystolic;
  const spo2 = vitals.spo2 || vitals.oxygenSaturation;
  const rr = vitals.rr || vitals.respiratoryRate;
  if (hr && (hr < 40 || hr > 130)) return true;
  if (sbp && (sbp < 80 || sbp > 180)) return true;
  if (spo2 && spo2 < 90) return true;
  if (rr && (rr < 10 || rr > 30)) return true;
  return false;
}

function hasPatientFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) => {
    if (typeof entry === 'string') return entry === flag;
    return (entry as { type?: string })?.type === flag;
  });
}

export function isWaitingRoomSafetyEscalationEligible(
  patient: Patient | null | undefined,
): boolean {
  return Boolean(patient && patient.state === PatientState.Waiting);
}

function detectOverdueReassessment(patient: Patient, now: Date): boolean {
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  if (timer.isOverdue) return true;
  if (hasDueReassessmentReminder(patient, now)) return true;
  return (patient.reassessmentReminders || []).some((reminder) =>
    ['overdue', 'missed'].includes(String(reminder.status || '')),
  );
}

function detectLongSinceContact(
  patient: Patient,
  context: WaitingRoomSafetyEscalationContext,
  now: Date,
): boolean {
  const overdueMinutes = context.communicationOverdueMinutes ?? 30;
  const communication = resolveCommunicationRecency(patient, {
    now,
    workflowLogs: context.workflowLogs,
    staff: context.staff,
  });
  const waitingMinutes =
    minutesSince(patient.triageTime || patient.arrivalTime, now) ?? 0;
  if (communication.minutesSinceContact === null) {
    return waitingMinutes >= overdueMinutes;
  }
  return (
    communication.minutesSinceContact >= overdueMinutes ||
    communication.tone === 'critical'
  );
}

function detectWorseningSymptomsReported(
  patient: Patient,
  context: WaitingRoomSafetyEscalationContext,
): boolean {
  if (hasPatientFlag(patient, PatientFlag.DeteriorationRisk)) return true;

  const timelineWorsening = (patient.timeline || []).some((event) =>
    /worsen|deteriorat|symptom.*worse|rapidly worse|escalat/i.test(
      `${event.type || ''} ${event.summary || ''} ${event.note || ''}`,
    ),
  );
  if (timelineWorsening) return true;

  const concernEscalated = buildCommunicationEvents(patient, {
    workflowLogs: context.workflowLogs,
    staff: context.staff,
    limit: 8,
  }).some((event) => event.kind === 'concern-escalated');
  if (concernEscalated) return true;

  return (context.alerts || []).some(
    (alert) =>
      alert.patientId === patient.id &&
      !alert.dismissed &&
      (alert.metadata?.receptionEscalationReason === 'worsening-symptoms' ||
        (alert.source === RECEPTION_ESCALATION_ALERT_SOURCE &&
          /worsening/i.test(`${alert.title} ${alert.message}`))),
  );
}

export function resolveWaitingRoomSafetyEscalationTriggers(
  patient: Patient,
  context: WaitingRoomSafetyEscalationContext = {},
): WaitingRoomSafetyEscalationTriggerId[] {
  if (!isWaitingRoomSafetyEscalationEligible(patient)) return [];

  const now = context.now || new Date();
  const triggers: WaitingRoomSafetyEscalationTriggerId[] = [];

  if (detectOverdueReassessment(patient, now)) {
    triggers.push('overdue-reassessment');
  }
  if (hasAbnormalVitals(patient)) {
    triggers.push('abnormal-vitals');
  }
  if (patientHasHighRiskComplaintFlags(patient) || patientNeedsRapidReview(patient)) {
    triggers.push('high-risk-complaint');
  }
  if (detectLongSinceContact(patient, context, now)) {
    triggers.push('long-since-contact');
  }
  if (detectWorseningSymptomsReported(patient, context)) {
    triggers.push('worsening-symptoms');
  }

  return triggers;
}

function rowTone(
  triggers: WaitingRoomSafetyEscalationTriggerId[],
): WaitingRoomSafetyEscalationTone {
  if (
    triggers.includes('abnormal-vitals') ||
    triggers.includes('worsening-symptoms') ||
    (triggers.includes('overdue-reassessment') && triggers.length >= 2)
  ) {
    return 'critical';
  }
  if (triggers.length >= 2 || triggers.includes('high-risk-complaint')) {
    return 'warning';
  }
  return 'watch';
}

export function buildWaitingRoomSafetyEscalationSnapshot(
  patients: Patient[] = [],
  context: WaitingRoomSafetyEscalationContext = {},
): WaitingRoomSafetyEscalationSnapshot {
  const counts: Record<WaitingRoomSafetyEscalationTriggerId, number> = {
    'overdue-reassessment': 0,
    'abnormal-vitals': 0,
    'high-risk-complaint': 0,
    'long-since-contact': 0,
    'worsening-symptoms': 0,
  };

  const rows = patients
    .filter(isWaitingRoomSafetyEscalationEligible)
    .map((patient) => {
      const triggerIds = resolveWaitingRoomSafetyEscalationTriggers(patient, context);
      if (!triggerIds.length) return null;
      triggerIds.forEach((id) => {
        counts[id] += 1;
      });
      return {
        patientId: patient.id,
        displayName: patientDisplayName(patient),
        triggerIds,
        tone: rowTone(triggerIds),
        detail: triggerIds.map((id) => TRIGGER_LABELS[id]).join(' · '),
      };
    })
    .filter((row): row is WaitingRoomSafetyEscalationPatientRow => Boolean(row))
    .sort((left, right) => {
      const rank = { critical: 3, warning: 2, watch: 1, neutral: 0 };
      return rank[right.tone] - rank[left.tone] || right.triggerIds.length - left.triggerIds.length;
    });

  return {
    escalatedPatientCount: rows.length,
    overdueReassessmentCount: counts['overdue-reassessment'],
    abnormalVitalsCount: counts['abnormal-vitals'],
    highRiskComplaintCount: counts['high-risk-complaint'],
    longSinceContactCount: counts['long-since-contact'],
    worseningSymptomsCount: counts['worsening-symptoms'],
    rows,
    previewRows: rows.slice(0, 4),
  };
}

export function hasWaitingRoomSafetyEscalationActivity(
  snapshot: WaitingRoomSafetyEscalationSnapshot,
): boolean {
  return snapshot.escalatedPatientCount > 0;
}

export const WAITING_ROOM_SAFETY_ESCALATION_STRIP_ID_ALIASES: Readonly<
  Record<WaitingRoomSafetyEscalationTriggerId, Record<string, string>>
> = Object.freeze({
  'overdue-reassessment': Object.freeze({
    reception: 'overdue-reassessment',
    triage: 'overdue-reassessment',
    chargeNurse: 'overdue-reassessment',
    whiteboard: 'overdue-reassessment',
    notificationCenter: 'overdue-reassessment',
  }),
  'abnormal-vitals': Object.freeze({
    reception: 'abnormal-vitals',
    triage: 'abnormal-vitals',
    chargeNurse: 'abnormal-vitals',
    whiteboard: 'abnormal-vitals',
    notificationCenter: 'abnormal-vitals',
  }),
  'high-risk-complaint': Object.freeze({
    reception: 'high-risk-complaint',
    triage: 'high-risk-complaint',
    chargeNurse: 'high-risk-complaint',
    whiteboard: 'high-risk-complaint',
    notificationCenter: 'high-risk-complaint',
  }),
  'long-since-contact': Object.freeze({
    reception: 'long-since-contact',
    triage: 'long-since-contact',
    chargeNurse: 'long-since-contact',
    whiteboard: 'long-since-contact',
    notificationCenter: 'long-since-contact',
  }),
  'worsening-symptoms': Object.freeze({
    reception: 'worsening-symptoms',
    triage: 'worsening-symptoms',
    chargeNurse: 'worsening-symptoms',
    whiteboard: 'worsening-symptoms',
    notificationCenter: 'worsening-symptoms',
  }),
});

export function selectWaitingRoomSafetyEscalationMetrics(
  patients: Patient[] = [],
  {
    metricIds = null,
    surface = 'whiteboard',
    ...context
  }: WaitingRoomSafetyEscalationContext & {
    metricIds?: readonly WaitingRoomSafetyEscalationTriggerId[] | null;
    surface?: 'reception' | 'triage' | 'chargeNurse' | 'whiteboard' | 'notificationCenter';
  } = {},
): WaitingRoomSafetyEscalationStripMetric[] {
  const snapshot = buildWaitingRoomSafetyEscalationSnapshot(patients, context);
  const ids: WaitingRoomSafetyEscalationTriggerId[] = metricIds?.length
    ? [...metricIds]
    : [
        'overdue-reassessment',
        'abnormal-vitals',
        'high-risk-complaint',
        'long-since-contact',
        'worsening-symptoms',
      ];

  const valueById: Record<WaitingRoomSafetyEscalationTriggerId, number> = {
    'overdue-reassessment': snapshot.overdueReassessmentCount,
    'abnormal-vitals': snapshot.abnormalVitalsCount,
    'high-risk-complaint': snapshot.highRiskComplaintCount,
    'long-since-contact': snapshot.longSinceContactCount,
    'worsening-symptoms': snapshot.worseningSymptomsCount,
  };

  const toneFor = (id: WaitingRoomSafetyEscalationTriggerId, count: number) => {
    if (!count) return 'neutral' as const;
    if (id === 'abnormal-vitals' || id === 'worsening-symptoms') return 'critical' as const;
    if (id === 'overdue-reassessment' || id === 'high-risk-complaint') {
      return count >= 2 ? 'critical' : 'warning';
    }
    return count >= 2 ? 'warning' : 'watch';
  };

  const surfaceKey =
    surface === 'reception' ||
    surface === 'triage' ||
    surface === 'chargeNurse' ||
    surface === 'whiteboard' ||
    surface === 'notificationCenter'
      ? surface
      : 'whiteboard';

  return ids.map((canonicalId) => ({
    id: WAITING_ROOM_SAFETY_ESCALATION_STRIP_ID_ALIASES[canonicalId][surfaceKey],
    label: TRIGGER_LABELS[canonicalId],
    value: valueById[canonicalId],
    hint:
      canonicalId === 'long-since-contact'
        ? `No staff contact within ${context.communicationOverdueMinutes ?? 30}m`
        : `Waiting patients with ${TRIGGER_LABELS[canonicalId].toLowerCase()}`,
    tone: toneFor(canonicalId, valueById[canonicalId]),
  }));
}

export function buildWaitingRoomSafetyEscalationAlerts(
  patients: Patient[] = [],
  context: WaitingRoomSafetyEscalationContext = {},
): Alert[] {
  const now = context.now || new Date();
  const snapshot = buildWaitingRoomSafetyEscalationSnapshot(patients, context);

  return snapshot.rows
    .filter((row) => row.tone === 'critical' || row.tone === 'warning')
    .slice(0, 12)
    .map((row) => ({
      id: `waiting-room-safety-escalation-${row.patientId}`,
      type: 'OperationalIntelligence' as const,
      severity: row.tone === 'critical' ? ('Critical' as const) : ('Warning' as const),
      title: `Waiting room safety — ${row.displayName}`,
      message: `${row.detail}. Staff re-review required.`,
      patientId: row.patientId,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'waiting-room-safety-escalation',
      actionType: 'VIEW_PATIENT',
      actionLabel: 'Review patient',
      metadata: {
        triggers: row.triggerIds,
        advisoryOnly: true,
      },
    }));
}
