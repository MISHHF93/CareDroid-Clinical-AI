/**
 * Harmonized patient queue timing — one elapsed/remaining view per queue scenario.
 */
import { buildReassessmentTimerSnapshot } from '../engine/reassessmentTimerEngine';
import { PatientState, type Patient } from '../types/emergency';
import { isInQueueFlow } from './queueReasonVisibility';
import {
  isAwaitingTriage,
  resolveTriageBreachTimer,
  type TriageBreachContext,
} from './triageBreachTimer';
import {
  isAwaitingProvider,
  resolveProviderWaitBreachTimer,
  type ProviderWaitBreachContext,
} from './providerWaitBreachTimer';

export type PatientQueueScenario =
  | 'triage'
  | 'provider-wait'
  | 'reassessment'
  | 'active-care'
  | 'none';

export type PatientQueueTimingTone = 'neutral' | 'info' | 'watch' | 'critical';

export type PatientQueueTimingSnapshot = Readonly<{
  patientId: string;
  isOnline: boolean;
  scenario: PatientQueueScenario;
  scenarioLabel: string;
  elapsedMinutes: number;
  elapsedLabel: string;
  remainingMinutes: number | null;
  remainingLabel: string;
  targetMinutes: number | null;
  tone: PatientQueueTimingTone;
  compactLabel: string;
  rowLabel: string;
  staffDetail: string;
}>;

export type PatientQueueTimingContext = TriageBreachContext &
  ProviderWaitBreachContext & {
    thresholds?: Record<string, unknown>;
  };

const ACTIVE_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Admission,
]);

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function minutesSince(timestamp?: string | null, now = new Date()): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function mapTone(value: string | undefined): PatientQueueTimingTone {
  if (value === 'critical') return 'critical';
  if (value === 'watch' || value === 'warning') return 'watch';
  if (value === 'info') return 'info';
  return 'neutral';
}

function buildRemainingLabel(remainingMinutes: number | null, overdueMinutes: number | null): string {
  if (overdueMinutes != null && overdueMinutes > 0) {
    return `${formatDuration(overdueMinutes)} overdue`;
  }
  if (remainingMinutes == null) return 'In progress';
  if (remainingMinutes <= 0) return 'Due now';
  return `${formatDuration(remainingMinutes)} left`;
}

function fromTriageScenario(
  patient: Patient,
  context: PatientQueueTimingContext,
): PatientQueueTimingSnapshot | null {
  const snapshot = resolveTriageBreachTimer(patient, context);
  if (!snapshot) return null;

  const remainingLabel = buildRemainingLabel(snapshot.remainingMinutes, null);
  const compactLabel = `${snapshot.elapsedLabel} · ${remainingLabel}`;

  return {
    patientId: patient.id,
    isOnline: true,
    scenario: 'triage',
    scenarioLabel: 'Awaiting triage',
    elapsedMinutes: snapshot.elapsedMinutes,
    elapsedLabel: snapshot.elapsedLabel,
    remainingMinutes: snapshot.remainingMinutes,
    remainingLabel,
    targetMinutes: snapshot.targetMinutes,
    tone: mapTone(snapshot.tone),
    compactLabel,
    rowLabel: compactLabel,
    staffDetail: snapshot.staffDetail,
  };
}

function fromProviderScenario(
  patient: Patient,
  context: PatientQueueTimingContext,
): PatientQueueTimingSnapshot | null {
  const snapshot = resolveProviderWaitBreachTimer(patient, context);
  if (!snapshot) return null;

  const overdueMinutes =
    snapshot.phase === 'breached' ? Math.max(0, snapshot.elapsedMinutes - snapshot.targetMinutes) : null;
  const remainingLabel = buildRemainingLabel(snapshot.remainingMinutes, overdueMinutes);
  const compactLabel = `${snapshot.elapsedLabel} · ${remainingLabel}`;

  return {
    patientId: patient.id,
    isOnline: true,
    scenario: 'provider-wait',
    scenarioLabel: 'Awaiting provider',
    elapsedMinutes: snapshot.elapsedMinutes,
    elapsedLabel: snapshot.elapsedLabel,
    remainingMinutes: snapshot.remainingMinutes,
    remainingLabel,
    targetMinutes: snapshot.targetMinutes,
    tone: mapTone(snapshot.tone),
    compactLabel,
    rowLabel: compactLabel,
    staffDetail: snapshot.staffDetail,
  };
}

function fromReassessmentScenario(
  patient: Patient,
  context: PatientQueueTimingContext,
): PatientQueueTimingSnapshot | null {
  if (patient.state !== PatientState.Waiting) return null;

  const timer = buildReassessmentTimerSnapshot(patient, {
    now: context.now,
    thresholds: context.thresholds,
  });
  if (!timer || timer.stage === 'none') return null;

  const overdueMinutes = timer.minutesOverdue ?? (timer.isOverdue ? timer.minutesOverdue : null);
  const remainingLabel = timer.isOverdue
    ? timer.overdueLabel || buildRemainingLabel(null, timer.minutesOverdue)
    : timer.dueInLabel || buildRemainingLabel(timer.minutesUntilDue, null);
  const elapsedMinutes = timer.triageAgeMinutes ?? timer.arrivalAgeMinutes ?? 0;
  const elapsedLabel = timer.triageAgeLabel || timer.arrivalAgeLabel || formatDuration(elapsedMinutes);
  const compactLabel = `${elapsedLabel} · ${remainingLabel}`;

  return {
    patientId: patient.id,
    isOnline: true,
    scenario: 'reassessment',
    scenarioLabel: 'Waiting reassessment',
    elapsedMinutes,
    elapsedLabel,
    remainingMinutes: timer.minutesUntilDue,
    remainingLabel,
    targetMinutes: timer.intervalMinutes,
    tone: timer.isOverdue ? 'critical' : timer.tone === 'critical' ? 'critical' : timer.tone === 'watch' ? 'watch' : 'neutral',
    compactLabel,
    rowLabel: compactLabel,
    staffDetail: `Reassessment ${remainingLabel.toLowerCase()} · last vitals ${timer.lastVitalsAgeLabel} ago`,
  };
}

function fromActiveCareScenario(patient: Patient, now: Date): PatientQueueTimingSnapshot | null {
  if (!ACTIVE_STATES.has(patient.state)) return null;
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) return null;

  const anchor = patient.triageTime || patient.arrivalTime;
  const elapsedMinutes = minutesSince(anchor, now);
  const elapsedLabel = formatDuration(elapsedMinutes);
  const compactLabel = `${elapsedLabel} · In lane`;

  return {
    patientId: patient.id,
    isOnline: true,
    scenario: 'active-care',
    scenarioLabel: patient.state,
    elapsedMinutes,
    elapsedLabel,
    remainingMinutes: null,
    remainingLabel: 'In progress',
    targetMinutes: null,
    tone: 'info',
    compactLabel,
    rowLabel: compactLabel,
    staffDetail: `${elapsedLabel} in ${patient.state}`,
  };
}

export function resolvePatientQueueTiming(
  patient: Patient | null | undefined,
  context: PatientQueueTimingContext = {},
): PatientQueueTimingSnapshot | null {
  if (!patient?.id) return null;
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
    return null;
  }

  const now = context.now || new Date();

  if (isAwaitingTriage(patient)) {
    return fromTriageScenario(patient, context);
  }

  if (isAwaitingProvider(patient)) {
    return fromProviderScenario(patient, context);
  }

  if (patient.state === PatientState.Waiting) {
    const reassessment = fromReassessmentScenario(patient, context);
    if (reassessment) return reassessment;
  }

  if (isInQueueFlow(patient) || ACTIVE_STATES.has(patient.state)) {
    return fromActiveCareScenario(patient, now);
  }

  return null;
}

export function countOnlineQueuePatients(
  patients: Patient[] = [],
  context: PatientQueueTimingContext = {},
): number {
  return patients.filter((patient) => resolvePatientQueueTiming(patient, context)?.isOnline).length;
}

export function buildQueueTimingSummary(
  patients: Patient[] = [],
  context: PatientQueueTimingContext = {},
): Readonly<{ onlineCount: number; breachedCount: number; dueSoonCount: number }> {
  let onlineCount = 0;
  let breachedCount = 0;
  let dueSoonCount = 0;

  for (const patient of patients) {
    const timing = resolvePatientQueueTiming(patient, context);
    if (!timing?.isOnline) continue;
    onlineCount += 1;
    if (timing.tone === 'critical' || timing.remainingLabel.includes('overdue')) {
      breachedCount += 1;
    } else if (timing.tone === 'watch' || (timing.remainingMinutes != null && timing.remainingMinutes <= 10)) {
      dueSoonCount += 1;
    }
  }

  return { onlineCount, breachedCount, dueSoonCount };
}
