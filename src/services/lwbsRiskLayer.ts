import {
  deriveLastNurseContactTime,
  buildReassessmentTimerSnapshot,
} from '../engine/reassessmentTimerEngine';
import {
  PatientFlag,
  PatientState,
  type Alert,
  type Patient,
  type Staff,
  type WorkflowActionLog,
} from '../types/emergency';
import { longWaitStatus, waitMinutesForPatient } from '../utils/longWaitRescue';
import { hasDueReassessmentReminder } from '../utils/reassessmentScheduler';
import { resolveCommunicationRecency } from './waitingRoomCommunicationLog';

export type LwbsRiskLevel = 'low' | 'medium' | 'high' | 'elevated';

export type LwbsRiskTone = 'neutral' | 'info' | 'watch' | 'critical';

export type LwbsRiskFactorId =
  | 'wait-duration'
  | 'overdue-reassessment'
  | 'low-contact-frequency'
  | 'waiting-room-congestion'
  | 'time-of-day'
  | 'complaint-category';

export type LwbsRiskFactor = {
  id: LwbsRiskFactorId;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export type LwbsRiskSnapshot = {
  patientId: string;
  score: number;
  level: LwbsRiskLevel;
  label: string;
  shortLabel: string;
  tone: LwbsRiskTone;
  advisoryOnly: true;
  factors: LwbsRiskFactor[];
  staffDetail: string;
};

export type LwbsRiskContext = {
  now?: Date;
  waitingPatientCount?: number;
  congestionThreshold?: number;
  settingsOrTargets?: Record<string, unknown>;
  workflowLogs?: WorkflowActionLog[];
  staff?: Staff[];
};

const ADVISORY_LABEL = 'Advisory only — staff review required';

const LEVEL_BY_SCORE: Array<{ min: number; level: LwbsRiskLevel; label: string; shortLabel: string; tone: LwbsRiskTone }> =
  [
    { min: 70, level: 'elevated', label: 'Elevated LWBS risk', shortLabel: 'Elevated', tone: 'critical' },
    { min: 50, level: 'high', label: 'High LWBS risk', shortLabel: 'High', tone: 'watch' },
    { min: 30, level: 'medium', label: 'Medium LWBS risk', shortLabel: 'Medium', tone: 'info' },
    { min: 0, level: 'low', label: 'Low LWBS risk', shortLabel: 'Low', tone: 'neutral' },
  ];

const LWBS_PRONE_COMPLAINT_CATEGORIES = new Set([
  'Psych',
  'Minor injury',
  'Medication',
  'Pain',
  'General',
  'Other',
]);

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
  );
}

function minutesSince(timestamp?: string | null, now = new Date()): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function resolveLevel(score: number) {
  return LEVEL_BY_SCORE.find((entry) => score >= entry.min) || LEVEL_BY_SCORE.at(-1)!;
}

function scoreWaitDuration(
  patient: Patient,
  context: LwbsRiskContext,
  now: Date,
): LwbsRiskFactor {
  const status = longWaitStatus(patient, now, context.settingsOrTargets);
  const threshold = status.thresholdMinutes || 30;
  const waitMinutes = waitMinutesForPatient(patient, now);
  const ratio = threshold > 0 ? waitMinutes / threshold : 0;

  let points = 0;
  if (status.phase === 'lwbs') points = 30;
  else if (status.phase === 'critical') points = 22;
  else if (status.phase === 'warning') points = 14;
  else if (ratio >= 0.75) points = 8;

  return {
    id: 'wait-duration',
    label: 'Wait duration',
    points,
    maxPoints: 30,
    detail: `${waitMinutes}m waiting · ${patient.priority} target ${threshold}m (${status.phase})`,
  };
}

function countOverdueReassessmentSignals(patient: Patient, now: Date): number {
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  let count = timer.isOverdue ? 1 : 0;

  const overdueReminders = (patient.reassessmentReminders || []).filter(
    (reminder) => (reminder.status as string) === 'overdue' || (reminder.status as string) === 'missed',
  ).length;
  count = Math.max(count, overdueReminders);

  const timelineOverdue = (patient.timeline || []).filter((event) =>
    /reassessment.*overdue|missed reassessment/i.test(`${event.type || ''} ${event.summary || ''}`),
  ).length;

  return count + timelineOverdue;
}

function scoreOverdueReassessment(patient: Patient, now: Date): LwbsRiskFactor {
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  const overdueSignals = countOverdueReassessmentSignals(patient, now);
  const repeated =
    overdueSignals >= 2 ||
    (timer.isOverdue && hasDueReassessmentReminder(patient, now)) ||
    hasFlag(patient, PatientFlag.ReassessmentDue);

  let points = 0;
  if (repeated && timer.isOverdue) points = 20;
  else if (timer.isOverdue || hasDueReassessmentReminder(patient, now)) points = 12;

  return {
    id: 'overdue-reassessment',
    label: 'Reassessment overdue',
    points,
    maxPoints: 20,
    detail: repeated
      ? `Repeated overdue reassessment (${overdueSignals} signal${overdueSignals === 1 ? '' : 's'})`
      : timer.isOverdue
        ? `Reassessment overdue · ${timer.overdueLabel || 'due now'}`
        : 'Reassessment on schedule',
  };
}

function scoreLowContactFrequency(patient: Patient, context: LwbsRiskContext, now: Date): LwbsRiskFactor {
  const waitMinutes = waitMinutesForPatient(patient, now);
  const nurseContactAt = deriveLastNurseContactTime(patient);
  let contactAgeMinutes = minutesSince(nurseContactAt, now);

  if (contactAgeMinutes === null && context.workflowLogs?.length) {
    const communication = resolveCommunicationRecency(patient, {
      now,
      workflowLogs: context.workflowLogs,
      staff: context.staff,
    });
    contactAgeMinutes = communication.minutesSinceContact;
  }

  let points = 0;
  if (waitMinutes >= 30 && contactAgeMinutes === null) {
    points = 15;
  } else if (contactAgeMinutes !== null && waitMinutes > 0) {
    const ratio = contactAgeMinutes / waitMinutes;
    if (ratio >= 0.7) points = 20;
    else if (ratio >= 0.5) points = 12;
    else if (contactAgeMinutes >= 45) points = 8;
  }

  return {
    id: 'low-contact-frequency',
    label: 'Low contact frequency',
    points,
    maxPoints: 20,
    detail:
      contactAgeMinutes === null
        ? 'No documented staff contact since arrival'
        : `Last staff contact ${contactAgeMinutes}m ago · waiting ${waitMinutes}m`,
  };
}

function scoreWaitingRoomCongestion(context: LwbsRiskContext): LwbsRiskFactor {
  const threshold = context.congestionThreshold ?? 12;
  const waitingCount = context.waitingPatientCount ?? 0;
  const ratio = threshold > 0 ? waitingCount / threshold : 0;

  let points = 0;
  if (waitingCount >= threshold * 1.75 || waitingCount >= 20) points = 15;
  else if (waitingCount >= threshold * 1.25 || waitingCount >= 15) points = 10;
  else if (ratio >= 0.85 || waitingCount >= 10) points = 6;

  return {
    id: 'waiting-room-congestion',
    label: 'Waiting-room congestion',
    points,
    maxPoints: 15,
    detail: `${waitingCount} patient${waitingCount === 1 ? '' : 's'} waiting · threshold ${threshold}`,
  };
}

function scoreTimeOfDay(now: Date): LwbsRiskFactor {
  const hour = now.getHours();
  let points = 0;
  if (hour >= 22 || hour < 6) points = 10;
  else if (hour >= 18 || hour < 8) points = 5;

  return {
    id: 'time-of-day',
    label: 'Time of day',
    points,
    maxPoints: 10,
    detail: `Local hour ${hour}:00 · operational LWBS pattern context`,
  };
}

function scoreComplaintCategory(patient: Patient): LwbsRiskFactor {
  const category = patient.complaintCategory?.trim() || '';
  const complaint = `${patient.chiefComplaint || patient.complaint || ''}`.trim();
  let points = 0;

  if (category && LWBS_PRONE_COMPLAINT_CATEGORIES.has(category)) {
    points = 5;
  } else if (!category && complaint.length > 0 && complaint.length < 24) {
    points = 3;
  } else if (/psych|minor|medication refill|prescription|wait/i.test(`${category} ${complaint}`)) {
    points = 5;
  }

  return {
    id: 'complaint-category',
    label: 'Complaint category',
    points,
    maxPoints: 5,
    detail: category
      ? `${category} · operational LWBS pattern context`
      : complaint
        ? 'Complaint captured · category unavailable'
        : 'No complaint category available',
  };
}

export function isLwbsRiskEligible(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return patient.state === PatientState.Waiting;
}

export function resolveLwbsRisk(
  patient: Patient,
  context: LwbsRiskContext = {},
): LwbsRiskSnapshot | null {
  if (!isLwbsRiskEligible(patient)) return null;

  const now = context.now || new Date();
  const factors = [
    scoreWaitDuration(patient, context, now),
    scoreOverdueReassessment(patient, now),
    scoreLowContactFrequency(patient, context, now),
    scoreWaitingRoomCongestion(context),
    scoreTimeOfDay(now),
    scoreComplaintCategory(patient),
  ];
  const score = factors.reduce((sum, factor) => sum + factor.points, 0);
  const levelMeta = resolveLevel(score);
  const activeFactors = factors.filter((factor) => factor.points > 0);

  return {
    patientId: patient.id,
    score,
    level: levelMeta.level,
    label: levelMeta.label,
    shortLabel: levelMeta.shortLabel,
    tone: levelMeta.tone,
    advisoryOnly: true,
    factors: activeFactors,
    staffDetail: [
      ADVISORY_LABEL,
      activeFactors.map((factor) => `${factor.label}: ${factor.detail}`).join(' · '),
    ]
      .filter(Boolean)
      .join(' — '),
  };
}

export function summarizeLwbsRiskBoard(
  patients: Patient[] = [],
  context: LwbsRiskContext = {},
): Record<LwbsRiskLevel, number> {
  const waitingPatients = patients.filter(isLwbsRiskEligible);
  const waitingCount = context.waitingPatientCount ?? waitingPatients.length;
  const enrichedContext = { ...context, waitingPatientCount: waitingCount };

  const counts: Record<LwbsRiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    elevated: 0,
  };

  waitingPatients.forEach((patient) => {
    const snapshot = resolveLwbsRisk(patient, enrichedContext);
    if (snapshot) counts[snapshot.level] += 1;
  });

  return counts;
}

export function buildLwbsRiskAdvisoryAlerts(
  patients: Patient[] = [],
  context: LwbsRiskContext = {},
): Alert[] {
  const now = context.now || new Date();
  const waitingPatients = patients.filter(isLwbsRiskEligible);
  const waitingCount = context.waitingPatientCount ?? waitingPatients.length;
  const enrichedContext = { ...context, now, waitingPatientCount: waitingCount };

  return waitingPatients
    .map((patient) => ({
      patient,
      snapshot: resolveLwbsRisk(patient, enrichedContext),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: LwbsRiskSnapshot } =>
        Boolean(entry.snapshot && (entry.snapshot.level === 'high' || entry.snapshot.level === 'elevated')),
    )
    .sort((left, right) => right.snapshot.score - left.snapshot.score)
    .map(({ patient, snapshot }) => ({
      id: `lwbs-risk-advisory-${patient.id}`,
      type: 'OperationalIntelligence' as const,
      severity: snapshot.level === 'elevated' ? ('Critical' as const) : ('Warning' as const),
      title: `${snapshot.label} — ${patientDisplayName(patient)}`,
      message: `${ADVISORY_LABEL}. Score ${snapshot.score}/100 from ${snapshot.factors.map((factor) => factor.label.toLowerCase()).join(', ') || 'operational factors'}.`,
      patientId: patient.id,
      createdAt: patient.arrivalTime || now.toISOString(),
      dismissed: false,
      source: 'lwbs-risk-advisory',
      actionType: 'VIEW_PATIENT',
      actionLabel: 'Review patient',
      metadata: {
        advisoryOnly: true,
        lwbsRiskScore: snapshot.score,
        lwbsRiskLevel: snapshot.level as string,
        factors: snapshot.factors.map((factor) => factor.id).join(','),
      },
    }));
}

export function shouldSurfaceLwbsRisk(snapshot: LwbsRiskSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.level !== 'low';
}

export const LWBS_RISK_SURFACES = Object.freeze([
  'waiting-room-board',
  'whiteboard',
  'notification-center',
  'patient-card',
  'command-center',
]);

export type LwbsRiskAttentionRow = {
  patientId: string;
  displayName: string;
  score: number;
  level: LwbsRiskLevel;
  label: string;
  tone: LwbsRiskTone;
  factorIds: LwbsRiskFactorId[];
};

export type LwbsRiskAttentionSnapshot = {
  waitingCount: number;
  counts: Record<LwbsRiskLevel, number>;
  elevatedAndHighCount: number;
  rows: LwbsRiskAttentionRow[];
  previewRows: LwbsRiskAttentionRow[];
};

function lwbsPatientDisplayName(patient: Patient): string {
  return patientDisplayName(patient);
}

export function sortPatientsForLwbsRiskAttention(
  patients: Patient[] = [],
  context: LwbsRiskContext = {},
): Patient[] {
  const waitingPatients = patients.filter(isLwbsRiskEligible);
  const waitingCount = context.waitingPatientCount ?? waitingPatients.length;
  const enrichedContext = { ...context, waitingPatientCount: waitingCount };

  return [...waitingPatients]
    .map((patient) => ({
      patient,
      snapshot: resolveLwbsRisk(patient, enrichedContext),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: LwbsRiskSnapshot } =>
        Boolean(entry.snapshot && shouldSurfaceLwbsRisk(entry.snapshot)),
    )
    .sort((left, right) => right.snapshot.score - left.snapshot.score)
    .map((entry) => entry.patient);
}

export function buildLwbsRiskAttentionSnapshot(
  patients: Patient[] = [],
  context: LwbsRiskContext = {},
): LwbsRiskAttentionSnapshot {
  const waitingPatients = patients.filter(isLwbsRiskEligible);
  const waitingCount = context.waitingPatientCount ?? waitingPatients.length;
  const enrichedContext = { ...context, waitingPatientCount: waitingCount };
  const counts = summarizeLwbsRiskBoard(patients, enrichedContext);

  const rows = sortPatientsForLwbsRiskAttention(patients, enrichedContext)
    .map((patient) => {
      const snapshot = resolveLwbsRisk(patient, enrichedContext)!;
      return {
        patientId: patient.id,
        displayName: lwbsPatientDisplayName(patient),
        score: snapshot.score,
        level: snapshot.level,
        label: snapshot.label,
        tone: snapshot.tone,
        factorIds: snapshot.factors.map((factor) => factor.id),
      };
    });

  return {
    waitingCount,
    counts,
    elevatedAndHighCount: counts.elevated + counts.high,
    rows,
    previewRows: rows.slice(0, 4),
  };
}

export type LwbsRiskLayerStore = {
  patients?: Patient[];
  workflowLogs?: WorkflowActionLog[];
  staff?: Staff[];
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/** Broadcast LWBS advisory snapshot to connected operational surfaces. */
export function syncLwbsRiskOperationalSurfaces(
  store: LwbsRiskLayerStore,
  options: { patientId?: string; source?: string } = {},
): LwbsRiskAttentionSnapshot {
  const snapshot = buildLwbsRiskAttentionSnapshot(store.patients || [], {
    workflowLogs: store.workflowLogs,
    staff: store.staff,
  });

  store.dispatchWebSocketEvent?.({
    type: 'lwbs_risk_sync',
    payload: {
      patientId: options.patientId || null,
      source: options.source || 'lwbs-risk-layer',
      surfaces: [...LWBS_RISK_SURFACES],
      summary: {
        waitingCount: snapshot.waitingCount,
        elevatedAndHighCount: snapshot.elevatedAndHighCount,
        counts: snapshot.counts,
      },
      rows: snapshot.rows.map((row) => ({
        patientId: row.patientId,
        displayName: row.displayName,
        score: row.score,
        level: row.level,
        label: row.label,
        tone: row.tone,
        factorIds: row.factorIds,
        advisoryOnly: true,
      })),
      generatedAt: new Date().toISOString(),
    },
  });

  return snapshot;
}
