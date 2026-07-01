import {
  PatientFlag,
  PatientState,
  Priority,
  type Alert,
  type Patient,
} from '../types/emergency';
import {
  REASSESSMENT_REMINDER_OVERDUE_MS,
  activeReassessmentReminders,
  nextActiveReminder,
  reminderStage,
} from '../utils/reassessmentScheduler';

export type ReassessmentTimerStage = 'none' | 'upcoming' | 'due' | 'overdue';
export type ReassessmentTimerTone = 'stable' | 'watch' | 'critical';

export type ReassessmentTimerThresholds = {
  waitTimeWarningMin?: number;
  reassessP1Min?: number;
  reassessP2Min?: number;
  reassessP3Min?: number;
  reassessP4Min?: number;
  reassessP5Min?: number;
};

export type ReassessmentTimerSnapshot = {
  patientId: string;
  displayName: string;
  state: PatientState;
  priority: Priority;
  arrivalTime: string | null;
  triageTime: string | null;
  lastNurseContactTime: string | null;
  lastVitalsTime: string | null;
  lastReassessmentTime: string | null;
  reassessmentDueTime: string | null;
  overdueTime: string | null;
  arrivalAgeMinutes: number | null;
  triageAgeMinutes: number | null;
  lastNurseContactAgeMinutes: number | null;
  lastVitalsAgeMinutes: number | null;
  lastReassessmentAgeMinutes: number | null;
  arrivalAgeLabel: string;
  triageAgeLabel: string;
  lastNurseContactAgeLabel: string;
  lastVitalsAgeLabel: string;
  lastReassessmentAgeLabel: string;
  dueInLabel: string;
  overdueLabel: string | null;
  stage: ReassessmentTimerStage;
  isOverdue: boolean;
  intervalMinutes: number;
  minutesUntilDue: number | null;
  minutesOverdue: number | null;
  tone: ReassessmentTimerTone;
  dueSource: 'scheduled-reminder' | 'priority-interval' | 'wait-threshold';
};

export const DEFAULT_REASSESSMENT_TIMER_THRESHOLDS: Required<ReassessmentTimerThresholds> = {
  waitTimeWarningMin: 45,
  reassessP1Min: 0,
  reassessP2Min: 15,
  reassessP3Min: 30,
  reassessP4Min: 60,
  reassessP5Min: 120,
};

/** Canonical CareDroid surfaces that consume reassessment timer snapshots. */
export const REASSESSMENT_TIMER_SURFACES = Object.freeze([
  'waiting-room-safety-board',
  'whiteboard-patient-card',
  'notification-center',
  'patient-detail',
  'reassessment-attention-strip',
  'header-badge',
] as const);

export type ReassessmentTimerSurface = (typeof REASSESSMENT_TIMER_SURFACES)[number];

export type ReassessmentTimerThresholdsInput = {
  thresholds?: Partial<ReassessmentTimerThresholds> | null;
  emergencySettings?: { thresholds?: Partial<ReassessmentTimerThresholds> | null } | null;
};

/** Resolves org thresholds into timer engine intervals. */
export function resolveReassessmentTimerThresholds(
  input: ReassessmentTimerThresholdsInput = {},
): Required<ReassessmentTimerThresholds> {
  const merged = {
    ...DEFAULT_REASSESSMENT_TIMER_THRESHOLDS,
    ...(input.emergencySettings?.thresholds || {}),
    ...(input.thresholds || {}),
  };
  return {
    waitTimeWarningMin: Number(merged.waitTimeWarningMin) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.waitTimeWarningMin,
    reassessP1Min: Number(merged.reassessP1Min) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.reassessP1Min,
    reassessP2Min: Number(merged.reassessP2Min) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.reassessP2Min,
    reassessP3Min: Number(merged.reassessP3Min) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.reassessP3Min,
    reassessP4Min: Number(merged.reassessP4Min) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.reassessP4Min,
    reassessP5Min: Number(merged.reassessP5Min) || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS.reassessP5Min,
  };
}

export function formatTimerClockTime(isoTime?: string | null): string {
  if (!isoTime) return '—';
  const date = new Date(isoTime);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export type ReassessmentDueEvaluation = {
  timer: ReassessmentTimerSnapshot;
  shouldFlag: boolean;
};

/** Single source for ReassessmentDue flagging in the background engine. */
export function evaluateReassessmentDueFlag(
  patient: Patient,
  options: { now?: Date; thresholds?: ReassessmentTimerThresholdsInput } = {},
): ReassessmentDueEvaluation {
  const resolvedThresholds = resolveReassessmentTimerThresholds(options.thresholds || {});
  const timer = buildReassessmentTimerSnapshot(patient, {
    now: options.now,
    thresholds: resolvedThresholds,
  });
  const shouldFlag =
    patient.state === PatientState.Waiting &&
    (timer.isOverdue ||
      timer.stage === 'due' ||
      timer.stage === 'overdue' ||
      (timer.lastVitalsAgeMinutes !== null &&
        timer.lastVitalsAgeMinutes > timer.intervalMinutes));
  return { timer, shouldFlag };
}

export type ReassessmentNotificationCenterSnapshot = {
  timers: ReassessmentTimerSnapshot[];
  alerts: Alert[];
  overdueCount: number;
  dueCount: number;
  waitingCount: number;
  summaryLine: string;
};

/** Notification center payload from the unified timer engine. */
export function buildReassessmentNotificationCenterSnapshot(
  patients: Patient[] = [],
  options: { now?: Date; thresholds?: ReassessmentTimerThresholdsInput } = {},
): ReassessmentNotificationCenterSnapshot {
  const resolvedThresholds = resolveReassessmentTimerThresholds(options.thresholds || {});
  const timers = buildWaitingPatientReassessmentTimers(patients, {
    now: options.now,
    thresholds: resolvedThresholds,
  });
  const alerts = buildReassessmentTimerAlerts(timers, options.now);
  const overdueCount = timers.filter((timer) => timer.isOverdue).length;
  const dueCount = timers.filter(
    (timer) => timer.stage === 'due' || timer.stage === 'upcoming',
  ).length;
  const waitingCount = timers.length;
  const summaryLine =
    overdueCount > 0
      ? `${overdueCount} reassessment${overdueCount === 1 ? '' : 's'} overdue in waiting room`
      : dueCount > 0
        ? `${dueCount} reassessment${dueCount === 1 ? '' : 's'} due soon`
        : waitingCount > 0
          ? `${waitingCount} waiting patient${waitingCount === 1 ? '' : 's'} on reassessment watch`
          : 'No waiting-room reassessment timers active';

  return {
    timers,
    alerts,
    overdueCount,
    dueCount,
    waitingCount,
    summaryLine,
  };
}

const NURSE_CONTACT_EVENT_TYPES = new Set([
  'VitalsUpdated',
  'Triage',
  'ReassessmentReminderCompleted',
  'StaffAssignment',
  'Registration',
  'Reassessment',
]);

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

function minutesSince(timestamp?: string | null, now = new Date()): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function formatTimerLabel(minutes: number | null, { unknownLabel = '—' }: any = {}): string {
  if (minutes === null || !Number.isFinite(minutes)) return unknownLabel;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function reassessmentIntervalForPriority(
  priority: Priority,
  thresholds: ReassessmentTimerThresholds = DEFAULT_REASSESSMENT_TIMER_THRESHOLDS,
): number {
  const resolved = { ...DEFAULT_REASSESSMENT_TIMER_THRESHOLDS, ...thresholds };
  const map: Record<Priority, number> = {
    [Priority.P1]: resolved.reassessP1Min,
    [Priority.P2]: resolved.reassessP2Min,
    [Priority.P3]: resolved.reassessP3Min,
    [Priority.P4]: resolved.reassessP4Min,
    [Priority.P5]: resolved.reassessP5Min,
  };
  return map[priority] ?? resolved.reassessP3Min;
}

export function deriveLastVitalsTime(patient: Patient): string | null {
  const latestVitals = Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
  return patient.vitalsUpdatedAt || latestVitals?.recordedAt || null;
}

export function deriveLastReassessmentTime(patient: Patient): string | null {
  const completedReminders = (patient.reassessmentReminders || [])
    .filter((reminder) => reminder.status === 'completed' && reminder.completedAt)
    .map((reminder) => reminder.completedAt as string);

  const timelineCompleted = (patient.timeline || [])
    .filter((event) => event.type === 'ReassessmentReminderCompleted')
    .map((event) => event.timestamp);

  const candidates = [...completedReminders, ...timelineCompleted];
  if (patient.lastAssessedTime) candidates.push(patient.lastAssessedTime);

  const sorted = candidates
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return sorted[0] || null;
}

export function deriveLastNurseContactTime(patient: Patient): string | null {
  const candidates: string[] = [];

  for (const note of patient.notes || []) {
    if (note.type === 'Nursing' && (note.createdAt || note.timestamp)) {
      candidates.push(String(note.createdAt || note.timestamp));
    }
  }

  for (const event of patient.timeline || []) {
    if (NURSE_CONTACT_EVENT_TYPES.has(String(event.type || '')) && event.timestamp) {
      candidates.push(event.timestamp);
    }
  }

  for (const reminder of patient.reassessmentReminders || []) {
    if (reminder.completedAt) candidates.push(reminder.completedAt);
  }

  if (patient.triageTime) candidates.push(patient.triageTime);

  return (
    candidates
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null
  );
}

export function deriveReassessmentSchedule(
  patient: Patient,
  now = new Date(),
  thresholds: ReassessmentTimerThresholds = DEFAULT_REASSESSMENT_TIMER_THRESHOLDS,
): {
  dueAt: string | null;
  overdueAt: string | null;
  source: ReassessmentTimerSnapshot['dueSource'];
  intervalMinutes: number;
} {
  const resolved = { ...DEFAULT_REASSESSMENT_TIMER_THRESHOLDS, ...thresholds };
  const reminder = activeReassessmentReminders(patient).sort(
    (left: { dueAt: string }, right: { dueAt: string }) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
  )[0];

  if (reminder?.dueAt) {
    const dueAt = reminder.dueAt;
    const overdueAt = new Date(
      new Date(dueAt).getTime() + REASSESSMENT_REMINDER_OVERDUE_MS,
    ).toISOString();
    return {
      dueAt,
      overdueAt,
      source: 'scheduled-reminder',
      intervalMinutes: reassessmentIntervalForPriority(patient.priority, resolved),
    };
  }

  const intervalMinutes = reassessmentIntervalForPriority(patient.priority, resolved);
  const anchor =
    deriveLastReassessmentTime(patient) ||
    deriveLastVitalsTime(patient) ||
    patient.triageTime ||
    patient.arrivalTime;

  if (!anchor) {
    return { dueAt: null, overdueAt: null, source: 'priority-interval', intervalMinutes };
  }

  const dueAt = new Date(new Date(anchor).getTime() + intervalMinutes * 60000).toISOString();
  const overdueAt = new Date(
    new Date(dueAt).getTime() + REASSESSMENT_REMINDER_OVERDUE_MS,
  ).toISOString();

  if (patient.state === PatientState.Waiting) {
    const waitAnchor = patient.arrivalTime;
    const waitDue = new Date(
      new Date(waitAnchor).getTime() + resolved.waitTimeWarningMin * 60000,
    ).toISOString();
    if (new Date(waitDue).getTime() < new Date(dueAt).getTime()) {
      return {
        dueAt: waitDue,
        overdueAt: new Date(
          new Date(waitDue).getTime() + REASSESSMENT_REMINDER_OVERDUE_MS,
        ).toISOString(),
        source: 'wait-threshold',
        intervalMinutes: resolved.waitTimeWarningMin,
      };
    }
  }

  return { dueAt, overdueAt, source: 'priority-interval', intervalMinutes };
}

function resolveTimerStage(
  patient: Patient,
  schedule: ReturnType<typeof deriveReassessmentSchedule>,
  now: Date,
): ReassessmentTimerStage {
  const reminder = nextActiveReminder(patient, now);
  if (reminder?.stage === 'overdue') return 'overdue';
  if (reminder?.stage === 'due') return 'due';
  if (reminder?.stage === 'upcoming') return 'upcoming';

  if (!schedule.dueAt) return 'none';
  const dueMs = new Date(schedule.dueAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(dueMs)) return 'none';
  if (nowMs >= dueMs + REASSESSMENT_REMINDER_OVERDUE_MS) return 'overdue';
  if (nowMs >= dueMs) return 'due';
  if (dueMs - nowMs <= 2 * 60 * 1000) return 'upcoming';
  return 'none';
}

function resolveTimerTone(stage: ReassessmentTimerStage): ReassessmentTimerTone {
  if (stage === 'overdue') return 'critical';
  if (stage === 'due' || stage === 'upcoming') return 'watch';
  return 'stable';
}

export function buildReassessmentTimerSnapshot(
  patient: Patient,
  options: { now?: Date; thresholds?: ReassessmentTimerThresholds } = {},
): ReassessmentTimerSnapshot {
  const now = options.now || new Date();
  const thresholds = options.thresholds || DEFAULT_REASSESSMENT_TIMER_THRESHOLDS;
  const schedule = deriveReassessmentSchedule(patient, now, thresholds);
  const stage = resolveTimerStage(patient, schedule, now);
  const dueMs = schedule.dueAt ? new Date(schedule.dueAt).getTime() : null;
  const nowMs = now.getTime();
  const minutesUntilDue =
    dueMs && Number.isFinite(dueMs) ? Math.round((dueMs - nowMs) / 60000) : null;
  const minutesOverdue =
    dueMs && Number.isFinite(dueMs) && nowMs > dueMs
      ? Math.max(0, Math.round((nowMs - dueMs) / 60000))
      : null;

  const arrivalAgeMinutes = minutesSince(patient.arrivalTime, now);
  const triageAgeMinutes = minutesSince(patient.triageTime, now);
  const lastNurseContactTime = deriveLastNurseContactTime(patient);
  const lastVitalsTime = deriveLastVitalsTime(patient);
  const lastReassessmentTime = deriveLastReassessmentTime(patient);
  const lastNurseContactAgeMinutes = minutesSince(lastNurseContactTime, now);
  const lastVitalsAgeMinutes = minutesSince(lastVitalsTime, now);
  const lastReassessmentAgeMinutes = minutesSince(lastReassessmentTime, now);

  const isOverdue = stage === 'overdue' || Boolean(patient.flags?.includes(PatientFlag.ReassessmentDue));
  const dueInLabel =
    isOverdue && minutesOverdue !== null
      ? `Overdue ${formatTimerLabel(minutesOverdue)}`
      : minutesUntilDue !== null && minutesUntilDue <= 0
        ? 'Due now'
        : minutesUntilDue !== null
          ? `Due in ${formatTimerLabel(Math.max(0, minutesUntilDue))}`
          : '—';

  return {
    patientId: patient.id,
    displayName: patientDisplayName(patient),
    state: patient.state,
    priority: patient.priority,
    arrivalTime: patient.arrivalTime || null,
    triageTime: patient.triageTime || null,
    lastNurseContactTime,
    lastVitalsTime,
    lastReassessmentTime,
    reassessmentDueTime: schedule.dueAt,
    overdueTime: schedule.overdueAt,
    arrivalAgeMinutes,
    triageAgeMinutes,
    lastNurseContactAgeMinutes,
    lastVitalsAgeMinutes,
    lastReassessmentAgeMinutes,
    arrivalAgeLabel: formatTimerLabel(arrivalAgeMinutes),
    triageAgeLabel: formatTimerLabel(triageAgeMinutes),
    lastNurseContactAgeLabel: formatTimerLabel(lastNurseContactAgeMinutes),
    lastVitalsAgeLabel: formatTimerLabel(lastVitalsAgeMinutes),
    lastReassessmentAgeLabel: formatTimerLabel(lastReassessmentAgeMinutes),
    dueInLabel,
    overdueLabel:
      isOverdue && minutesOverdue !== null ? formatTimerLabel(minutesOverdue) : null,
    stage,
    isOverdue,
    intervalMinutes: schedule.intervalMinutes,
    minutesUntilDue,
    minutesOverdue,
    tone: resolveTimerTone(stage),
    dueSource: schedule.source,
  };
}

export function buildWaitingPatientReassessmentTimers(
  patients: Patient[] = [],
  options: { now?: Date; thresholds?: ReassessmentTimerThresholds } = {},
): ReassessmentTimerSnapshot[] {
  const toneRank: Record<ReassessmentTimerTone, number> = { critical: 3, watch: 2, stable: 1 };

  return patients
    .filter((patient) => patient.state === PatientState.Waiting)
    .map((patient) => buildReassessmentTimerSnapshot(patient, options))
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
      const toneDelta = toneRank[right.tone] - toneRank[left.tone];
      if (toneDelta !== 0) return toneDelta;
      return (right.minutesOverdue || 0) - (left.minutesOverdue || 0);
    });
}

export function buildReassessmentTimerAlerts(
  timers: ReassessmentTimerSnapshot[] = [],
  now = new Date(),
): Alert[] {
  return timers
    .filter((timer) => timer.stage === 'due' || timer.stage === 'overdue' || timer.isOverdue)
    .map((timer) => ({
      id: `reassessment-timer-${timer.stage}-${timer.patientId}`,
      type: 'Reassessment',
      severity: timer.stage === 'overdue' || timer.isOverdue ? 'Critical' : 'Warning',
      title:
        timer.stage === 'overdue' || timer.isOverdue
          ? `Reassessment overdue — ${timer.displayName}`
          : `Reassessment due — ${timer.displayName}`,
      message: [
        `Due ${timer.dueInLabel}.`,
        `Last vitals ${timer.lastVitalsAgeLabel} ago.`,
        `Last nurse contact ${timer.lastNurseContactAgeLabel} ago.`,
        timer.lastReassessmentAgeLabel !== '—'
          ? `Last reassessment ${timer.lastReassessmentAgeLabel} ago.`
          : null,
      ]
        .filter(Boolean)
        .join(' '),
      patientId: timer.patientId,
      createdAt: timer.reassessmentDueTime || now.toISOString(),
      dismissed: false,
      source: 'reassessment-timer-engine',
      actionType: 'reassessment',
      metadata: {
        stage: timer.stage,
        dueAt: timer.reassessmentDueTime,
        overdueAt: timer.overdueTime,
        lastVitalsAgeMinutes: timer.lastVitalsAgeMinutes,
        lastNurseContactAgeMinutes: timer.lastNurseContactAgeMinutes,
        lastReassessmentAgeMinutes: timer.lastReassessmentAgeMinutes,
      },
    }));
}

export function selectReassessmentTimerForPatient(
  patient?: Patient | null,
  options: { now?: Date; thresholds?: ReassessmentTimerThresholds } = {},
): ReassessmentTimerSnapshot | null {
  if (!patient) return null;
  return buildReassessmentTimerSnapshot(patient, options);
}
