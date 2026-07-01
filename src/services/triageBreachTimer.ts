import { deriveTriagePending } from './arrivalControlLayer';
import {
  PatientState,
  type Alert,
  type Patient,
} from '../types/emergency';

export type TriageBreachPhase = 'on-track' | 'breach-risk' | 'breached';

export type TriageBreachTone = 'neutral' | 'info' | 'watch' | 'critical';

export type TriageBreachSettings = {
  targetMinutes: number;
  warningMinutes: number;
  warningRatio: number;
};

export type TriageBreachSnapshot = {
  patientId: string;
  elapsedMinutes: number;
  elapsedLabel: string;
  targetMinutes: number;
  warningMinutes: number;
  remainingMinutes: number | null;
  phase: TriageBreachPhase;
  label: string;
  shortLabel: string;
  tone: TriageBreachTone;
  staffDetail: string;
};

export type TriageBreachBoardSummary = {
  awaitingTriageCount: number;
  onTrackCount: number;
  breachRiskCount: number;
  breachedCount: number;
  longestElapsedMinutes: number;
  longestElapsedLabel: string;
  targetMinutes: number;
  warningMinutes: number;
};

export type TriageBreachContext = {
  now?: Date;
  settings?: Record<string, unknown>;
  targetMinutes?: number;
  warningMinutes?: number;
  warningRatio?: number;
};

const DEFAULT_TARGET_MINUTES = 10;
const DEFAULT_WARNING_RATIO = 0.8;

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

export function resolveTriageBreachSettings(
  settings: Record<string, unknown> = {},
  overrides: Pick<TriageBreachContext, 'targetMinutes' | 'warningMinutes' | 'warningRatio'> = {},
): TriageBreachSettings {
  const thresholds = (settings.thresholds || {}) as Record<string, unknown>;
  const emergencySettings = (settings.emergencySettings || settings) as Record<string, unknown>;
  const nestedThresholds = (emergencySettings.thresholds || thresholds) as Record<string, unknown>;

  const targetMinutes = Number(
    overrides.targetMinutes ??
      nestedThresholds.triageTargetMinutes ??
      thresholds.triageTargetMinutes ??
      settings.triageTargetMinutes ??
      DEFAULT_TARGET_MINUTES,
  );
  const warningRatio = Number(
    overrides.warningRatio ??
      nestedThresholds.triageWarningRatio ??
      thresholds.triageWarningRatio ??
      settings.triageWarningRatio ??
      DEFAULT_WARNING_RATIO,
  );
  const derivedWarning = Math.max(1, Math.round(targetMinutes * warningRatio));
  const warningMinutes = Number(
    overrides.warningMinutes ??
      nestedThresholds.triageWarningMinutes ??
      thresholds.triageWarningMinutes ??
      settings.triageWarningMinutes ??
      derivedWarning,
  );

  return {
    targetMinutes: Number.isFinite(targetMinutes) && targetMinutes > 0 ? targetMinutes : DEFAULT_TARGET_MINUTES,
    warningMinutes:
      Number.isFinite(warningMinutes) && warningMinutes > 0
        ? Math.min(warningMinutes, targetMinutes - 1)
        : derivedWarning,
    warningRatio: Number.isFinite(warningRatio) ? warningRatio : DEFAULT_WARNING_RATIO,
  };
}

export function isAwaitingTriage(patient: Patient | null | undefined): boolean {
  if (!patient?.arrivalTime) return false;
  if (patient.triageTime) return false;
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
    return false;
  }
  return (
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration ||
    patient.state === PatientState.Triage ||
    deriveTriagePending(patient)
  );
}

function resolvePhase(
  elapsedMinutes: number,
  settings: TriageBreachSettings,
): { phase: TriageBreachPhase; label: string; shortLabel: string; tone: TriageBreachTone } {
  if (elapsedMinutes >= settings.targetMinutes) {
    return {
      phase: 'breached',
      label: 'Triage breached',
      shortLabel: 'Breached',
      tone: 'critical',
    };
  }
  if (elapsedMinutes >= settings.warningMinutes) {
    return {
      phase: 'breach-risk',
      label: 'Triage breach risk',
      shortLabel: 'At risk',
      tone: 'watch',
    };
  }
  return {
    phase: 'on-track',
    label: 'Triage on track',
    shortLabel: 'On track',
    tone: 'neutral',
  };
}

export function resolveArrivalToTriageElapsedMinutes(
  patient: Patient,
  now = new Date(),
): number {
  if (patient.triageTime) {
    return minutesSince(patient.arrivalTime, new Date(patient.triageTime));
  }
  return minutesSince(patient.arrivalTime, now);
}

export function resolveTriageBreachTimer(
  patient: Patient,
  context: TriageBreachContext = {},
): TriageBreachSnapshot | null {
  if (!isAwaitingTriage(patient)) return null;

  const now = context.now || new Date();
  const settings = resolveTriageBreachSettings(context.settings || {}, context);
  const elapsedMinutes = resolveArrivalToTriageElapsedMinutes(patient, now);
  const phaseMeta = resolvePhase(elapsedMinutes, settings);
  const remainingMinutes = Math.max(0, settings.targetMinutes - elapsedMinutes);

  return {
    patientId: patient.id,
    elapsedMinutes,
    elapsedLabel: formatDuration(elapsedMinutes),
    targetMinutes: settings.targetMinutes,
    warningMinutes: settings.warningMinutes,
    remainingMinutes: phaseMeta.phase === 'breached' ? 0 : remainingMinutes,
    phase: phaseMeta.phase,
    label: phaseMeta.label,
    shortLabel: phaseMeta.shortLabel,
    tone: phaseMeta.tone,
    staffDetail: `${formatDuration(elapsedMinutes)} since arrival · target ${settings.targetMinutes}m · warning ${settings.warningMinutes}m`,
  };
}

export function shouldSurfaceTriageBreach(
  snapshot: TriageBreachSnapshot | null | undefined,
): boolean {
  return Boolean(snapshot && snapshot.phase !== 'on-track');
}

export function summarizeTriageBreachBoard(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): TriageBreachBoardSummary {
  const settings = resolveTriageBreachSettings(context.settings || {}, context);
  const awaiting = patients.filter(isAwaitingTriage);
  const snapshots = awaiting
    .map((patient) => resolveTriageBreachTimer(patient, context))
    .filter((snapshot): snapshot is TriageBreachSnapshot => Boolean(snapshot));

  const breachedCount = snapshots.filter((snapshot) => snapshot.phase === 'breached').length;
  const breachRiskCount = snapshots.filter((snapshot) => snapshot.phase === 'breach-risk').length;
  const onTrackCount = snapshots.filter((snapshot) => snapshot.phase === 'on-track').length;
  const longestElapsedMinutes = snapshots.length
    ? Math.max(...snapshots.map((snapshot) => snapshot.elapsedMinutes))
    : 0;

  return {
    awaitingTriageCount: awaiting.length,
    onTrackCount,
    breachRiskCount,
    breachedCount,
    longestElapsedMinutes,
    longestElapsedLabel: formatDuration(longestElapsedMinutes),
    targetMinutes: settings.targetMinutes,
    warningMinutes: settings.warningMinutes,
  };
}

export function summarizeTriageBreachAnalytics(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): {
  summary: TriageBreachBoardSummary;
  breachedPatients: Array<{ patient: Patient; snapshot: TriageBreachSnapshot }>;
  breachRiskPatients: Array<{ patient: Patient; snapshot: TriageBreachSnapshot }>;
  completedWithinTargetCount: number;
  completedBreachedCount: number;
} {
  const summary = summarizeTriageBreachBoard(patients, context);
  const settings = resolveTriageBreachSettings(context.settings || {}, context);

  const breachedPatients = patients
    .filter(isAwaitingTriage)
    .map((patient) => ({ patient, snapshot: resolveTriageBreachTimer(patient, context)! }))
    .filter((entry) => entry.snapshot?.phase === 'breached');

  const breachRiskPatients = patients
    .filter(isAwaitingTriage)
    .map((patient) => ({ patient, snapshot: resolveTriageBreachTimer(patient, context)! }))
    .filter((entry) => entry.snapshot?.phase === 'breach-risk');

  const completed = patients.filter((patient) => patient.triageTime && patient.arrivalTime);
  let completedWithinTargetCount = 0;
  let completedBreachedCount = 0;
  completed.forEach((patient) => {
    const elapsed = resolveArrivalToTriageElapsedMinutes(patient);
    if (elapsed >= settings.targetMinutes) completedBreachedCount += 1;
    else completedWithinTargetCount += 1;
  });

  return {
    summary,
    breachedPatients,
    breachRiskPatients,
    completedWithinTargetCount,
    completedBreachedCount,
  };
}

export const TRIAGE_BREACH_SURFACES = Object.freeze([
  'reception-dashboard',
  'waiting-room-board',
  'whiteboard',
  'analytics',
  'command-center',
]);

export type TriageBreachAttentionRow = {
  patientId: string;
  displayName: string;
  phase: TriageBreachPhase;
  elapsedLabel: string;
  label: string;
  tone: TriageBreachTone;
  remainingMinutes: number | null;
};

export type TriageBreachAttentionSnapshot = {
  summary: TriageBreachBoardSummary;
  rows: TriageBreachAttentionRow[];
  previewRows: TriageBreachAttentionRow[];
};

const PHASE_RANK: Record<TriageBreachPhase, number> = {
  breached: 2,
  'breach-risk': 1,
  'on-track': 0,
};

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

export function sortPatientsForTriageBreachAttention(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): Patient[] {
  return [...patients]
    .filter(isAwaitingTriage)
    .map((patient) => ({
      patient,
      snapshot: resolveTriageBreachTimer(patient, context),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: TriageBreachSnapshot } =>
        Boolean(entry.snapshot && shouldSurfaceTriageBreach(entry.snapshot)),
    )
    .sort(
      (left, right) =>
        PHASE_RANK[right.snapshot.phase] - PHASE_RANK[left.snapshot.phase] ||
        right.snapshot.elapsedMinutes - left.snapshot.elapsedMinutes,
    )
    .map((entry) => entry.patient);
}

export function buildTriageBreachAttentionSnapshot(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): TriageBreachAttentionSnapshot {
  const summary = summarizeTriageBreachBoard(patients, context);
  const rows = sortPatientsForTriageBreachAttention(patients, context).map((patient) => {
    const snapshot = resolveTriageBreachTimer(patient, context)!;
    return {
      patientId: patient.id,
      displayName: patientDisplayName(patient),
      phase: snapshot.phase,
      elapsedLabel: snapshot.elapsedLabel,
      label: snapshot.label,
      tone: snapshot.tone,
      remainingMinutes: snapshot.remainingMinutes,
    };
  });

  return {
    summary,
    rows,
    previewRows: rows.slice(0, 4),
  };
}

export type TriageBreachTimerStore = {
  patients?: Patient[];
  settings?: Record<string, unknown>;
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/** Broadcast triage breach snapshot to connected operational surfaces. */
export function syncTriageBreachOperationalSurfaces(
  store: TriageBreachTimerStore,
  options: { patientId?: string; source?: string } = {},
): TriageBreachAttentionSnapshot {
  const snapshot = buildTriageBreachAttentionSnapshot(store.patients || [], {
    settings: store.settings,
  });

  store.dispatchWebSocketEvent?.({
    type: 'triage_breach_sync',
    payload: {
      patientId: options.patientId || null,
      source: options.source || 'triage-breach-timer',
      surfaces: [...TRIAGE_BREACH_SURFACES],
      summary: snapshot.summary,
      rows: snapshot.rows.map((row) => ({
        patientId: row.patientId,
        displayName: row.displayName,
        phase: row.phase,
        elapsedLabel: row.elapsedLabel,
        label: row.label,
        tone: row.tone,
        remainingMinutes: row.remainingMinutes,
      })),
      generatedAt: new Date().toISOString(),
    },
  });

  return snapshot;
}

export function buildTriageBreachAlerts(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): Alert[] {
  const now = context.now || new Date();
  const snapshot = buildTriageBreachAttentionSnapshot(patients, context);
  const alerts: Alert[] = [];

  if (snapshot.summary.breachedCount >= 3) {
    alerts.push({
      id: 'triage-breach-board',
      type: 'Operational',
      severity: 'Critical',
      title: 'Triage time breaches',
      message: `${snapshot.summary.breachedCount} patients breached door-to-triage target · longest ${snapshot.summary.longestElapsedLabel}`,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'triage-breach-timer',
      metadata: { advisoryOnly: true },
    });
  } else if (snapshot.summary.breachedCount > 0) {
    alerts.push({
      id: 'triage-breach-board',
      type: 'Operational',
      severity: 'Warning',
      title: 'Triage time breached',
      message: `${snapshot.summary.breachedCount} patient${snapshot.summary.breachedCount === 1 ? '' : 's'} exceeded door-to-triage target`,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'triage-breach-timer',
      metadata: { advisoryOnly: true },
    });
  } else if (snapshot.summary.breachRiskCount >= 2) {
    alerts.push({
      id: 'triage-breach-risk',
      type: 'Operational',
      severity: 'Warning',
      title: 'Triage breach risk',
      message: `${snapshot.summary.breachRiskCount} patients approaching door-to-triage threshold`,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'triage-breach-timer',
      metadata: { advisoryOnly: true },
    });
  }

  return alerts;
}
