import { DEFAULT_EMERGENCY_CTAS_TARGETS } from '../config/emergencySettings.config';
import {
  patientHasHighRiskComplaintFlags,
  patientNeedsRapidReview,
} from './highRiskComplaintFlags';
import {
  PatientState,
  Priority,
  type Alert,
  type Patient,
} from '../types/emergency';

export type ProviderWaitBreachPhase = 'on-track' | 'approaching-threshold' | 'breached';

export type ProviderWaitBreachTone = 'neutral' | 'info' | 'watch' | 'critical';

export type ProviderWaitBreachSettings = {
  defaultTargetMinutes: number;
  warningMinutes: number;
  warningRatio: number;
  ctasTargets: Record<string, number>;
  highRiskWaitExceptionsEnabled: boolean;
  highRiskProviderWaitMinutes: number | null;
};

export type ProviderWaitBreachSnapshot = {
  patientId: string;
  elapsedMinutes: number;
  elapsedLabel: string;
  targetMinutes: number;
  warningMinutes: number;
  remainingMinutes: number | null;
  phase: ProviderWaitBreachPhase;
  label: string;
  shortLabel: string;
  tone: ProviderWaitBreachTone;
  staffDetail: string;
  highRiskException: boolean;
  priority: Priority | null;
};

export type ProviderWaitBreachBoardSummary = {
  awaitingProviderCount: number;
  onTrackCount: number;
  approachingThresholdCount: number;
  breachedCount: number;
  highRiskExceptionCount: number;
  longestElapsedMinutes: number;
  longestElapsedLabel: string;
  defaultTargetMinutes: number;
  warningMinutes: number;
};

export type ProviderWaitBreachContext = {
  now?: Date;
  settings?: Record<string, unknown>;
  defaultTargetMinutes?: number;
  warningMinutes?: number;
  warningRatio?: number;
  highRiskWaitExceptionsEnabled?: boolean;
  highRiskProviderWaitMinutes?: number | null;
};

const DEFAULT_TARGET_MINUTES = 30;
const DEFAULT_WARNING_RATIO = 0.8;
const HIGH_RISK_PRIORITIES = new Set<Priority>([Priority.P1, Priority.P2]);

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

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCtasTargets(thresholds: Record<string, unknown>): Record<string, number> {
  const raw = (thresholds.ctasTargets || {}) as Record<string, unknown>;
  return {
    P1: readNumber(raw.P1, DEFAULT_EMERGENCY_CTAS_TARGETS.P1),
    P2: readNumber(raw.P2, DEFAULT_EMERGENCY_CTAS_TARGETS.P2),
    P3: readNumber(raw.P3, DEFAULT_EMERGENCY_CTAS_TARGETS.P3),
    P4: readNumber(raw.P4, DEFAULT_EMERGENCY_CTAS_TARGETS.P4),
    P5: readNumber(raw.P5, DEFAULT_EMERGENCY_CTAS_TARGETS.P5),
  };
}

export function resolveProviderWaitBreachSettings(
  settings: Record<string, unknown> = {},
  overrides: Pick<
    ProviderWaitBreachContext,
    | 'defaultTargetMinutes'
    | 'warningMinutes'
    | 'warningRatio'
    | 'highRiskWaitExceptionsEnabled'
    | 'highRiskProviderWaitMinutes'
  > = {},
): ProviderWaitBreachSettings {
  const thresholds = (settings.thresholds || {}) as Record<string, unknown>;
  const emergencySettings = (settings.emergencySettings || settings) as Record<string, unknown>;
  const nestedThresholds = (emergencySettings.thresholds || thresholds) as Record<string, unknown>;

  const defaultTargetMinutes = readNumber(
    overrides.defaultTargetMinutes ??
      nestedThresholds.providerTargetMinutes ??
      thresholds.providerTargetMinutes ??
      settings.providerTargetMinutes ??
      DEFAULT_TARGET_MINUTES,
    DEFAULT_TARGET_MINUTES,
  );
  const warningRatio = readNumber(
    overrides.warningRatio ??
      nestedThresholds.providerWarningRatio ??
      thresholds.providerWarningRatio ??
      settings.providerWarningRatio ??
      DEFAULT_WARNING_RATIO,
    DEFAULT_WARNING_RATIO,
  );
  const derivedWarning = Math.max(1, Math.round(defaultTargetMinutes * warningRatio));
  const warningMinutes = readNumber(
    overrides.warningMinutes ??
      nestedThresholds.providerWarningMinutes ??
      thresholds.providerWarningMinutes ??
      settings.providerWarningMinutes ??
      derivedWarning,
    derivedWarning,
  );

  const highRiskWaitExceptionsEnabled =
    overrides.highRiskWaitExceptionsEnabled ??
    nestedThresholds.highRiskWaitExceptionsEnabled ??
    thresholds.highRiskWaitExceptionsEnabled ??
    settings.highRiskWaitExceptionsEnabled ??
    true;

  const highRiskRaw =
    overrides.highRiskProviderWaitMinutes ??
    nestedThresholds.highRiskProviderWaitMinutes ??
    thresholds.highRiskProviderWaitMinutes ??
    settings.highRiskProviderWaitMinutes ??
    null;
  const highRiskProviderWaitMinutes =
    highRiskRaw == null || highRiskRaw === ''
      ? null
      : readNumber(highRiskRaw, readNumber(DEFAULT_EMERGENCY_CTAS_TARGETS.P2, 15));

  return {
    defaultTargetMinutes:
      Number.isFinite(defaultTargetMinutes) && defaultTargetMinutes > 0
        ? defaultTargetMinutes
        : DEFAULT_TARGET_MINUTES,
    warningMinutes:
      Number.isFinite(warningMinutes) && warningMinutes > 0
        ? warningMinutes
        : derivedWarning,
    warningRatio: Number.isFinite(warningRatio) ? warningRatio : DEFAULT_WARNING_RATIO,
    ctasTargets: readCtasTargets(nestedThresholds),
    highRiskWaitExceptionsEnabled: Boolean(highRiskWaitExceptionsEnabled),
    highRiskProviderWaitMinutes:
      highRiskProviderWaitMinutes != null && highRiskProviderWaitMinutes > 0
        ? highRiskProviderWaitMinutes
        : null,
  };
}

export function qualifiesHighRiskProviderWaitException(
  patient: Patient,
  settings: ProviderWaitBreachSettings,
): boolean {
  if (!settings.highRiskWaitExceptionsEnabled) return false;
  if (patientHasHighRiskComplaintFlags(patient)) return true;
  if (patientNeedsRapidReview(patient)) return true;
  if (patient.priority && HIGH_RISK_PRIORITIES.has(patient.priority)) return true;
  return false;
}

export function resolvePatientProviderWaitTargetMinutes(
  patient: Patient,
  settings: ProviderWaitBreachSettings,
): { targetMinutes: number; warningMinutes: number; highRiskException: boolean } {
  const priorityTarget =
    patient.priority != null
      ? settings.ctasTargets[patient.priority] ?? settings.defaultTargetMinutes
      : settings.defaultTargetMinutes;
  let targetMinutes = priorityTarget <= 0 ? 1 : priorityTarget;
  const highRiskException = qualifiesHighRiskProviderWaitException(patient, settings);

  if (highRiskException) {
    const exceptionTarget =
      settings.highRiskProviderWaitMinutes ??
      readNumber(settings.ctasTargets.P2, DEFAULT_EMERGENCY_CTAS_TARGETS.P2);
    targetMinutes = Math.min(targetMinutes, exceptionTarget <= 0 ? 1 : exceptionTarget);
  }

  const derivedWarning = Math.max(1, Math.round(targetMinutes * settings.warningRatio));
  const warningMinutes = Math.min(
    settings.warningMinutes > 0 ? Math.min(settings.warningMinutes, targetMinutes - 1) : derivedWarning,
    Math.max(1, targetMinutes - 1),
  );

  return { targetMinutes, warningMinutes, highRiskException };
}

export function isAwaitingProvider(patient: Patient | null | undefined): boolean {
  if (!patient?.triageTime) return false;
  if (patient.state !== PatientState.Waiting) return false;
  if (patient.lastAssessedTime) return false;
  return true;
}

function resolvePhase(
  elapsedMinutes: number,
  targetMinutes: number,
  warningMinutes: number,
): { phase: ProviderWaitBreachPhase; label: string; shortLabel: string; tone: ProviderWaitBreachTone } {
  if (elapsedMinutes >= targetMinutes) {
    return {
      phase: 'breached',
      label: 'Provider wait breached',
      shortLabel: 'Breached',
      tone: 'critical',
    };
  }
  if (elapsedMinutes >= warningMinutes) {
    return {
      phase: 'approaching-threshold',
      label: 'Approaching provider wait threshold',
      shortLabel: 'Approaching',
      tone: 'watch',
    };
  }
  return {
    phase: 'on-track',
    label: 'Provider wait on track',
    shortLabel: 'On track',
    tone: 'neutral',
  };
}

export function resolveTriageToProviderElapsedMinutes(
  patient: Patient,
  now = new Date(),
): number {
  if (!patient.triageTime) return 0;
  if (patient.lastAssessedTime) {
    return minutesSince(patient.triageTime, new Date(patient.lastAssessedTime));
  }
  return minutesSince(patient.triageTime, now);
}

export function resolveProviderWaitBreachTimer(
  patient: Patient,
  context: ProviderWaitBreachContext = {},
): ProviderWaitBreachSnapshot | null {
  if (!isAwaitingProvider(patient)) return null;

  const now = context.now || new Date();
  const settings = resolveProviderWaitBreachSettings(context.settings || {}, context);
  const thresholds = resolvePatientProviderWaitTargetMinutes(patient, settings);
  const elapsedMinutes = resolveTriageToProviderElapsedMinutes(patient, now);
  const phaseMeta = resolvePhase(
    elapsedMinutes,
    thresholds.targetMinutes,
    thresholds.warningMinutes,
  );
  const remainingMinutes = Math.max(0, thresholds.targetMinutes - elapsedMinutes);
  const exceptionNote = thresholds.highRiskException
    ? ' · high-risk wait exception applied'
    : '';

  return {
    patientId: patient.id,
    elapsedMinutes,
    elapsedLabel: formatDuration(elapsedMinutes),
    targetMinutes: thresholds.targetMinutes,
    warningMinutes: thresholds.warningMinutes,
    remainingMinutes: phaseMeta.phase === 'breached' ? 0 : remainingMinutes,
    phase: phaseMeta.phase,
    label: phaseMeta.label,
    shortLabel: phaseMeta.shortLabel,
    tone: phaseMeta.tone,
    staffDetail: `${formatDuration(elapsedMinutes)} since triage · target ${thresholds.targetMinutes}m · warning ${thresholds.warningMinutes}m${exceptionNote}`,
    highRiskException: thresholds.highRiskException,
    priority: patient.priority ?? null,
  };
}

export function shouldSurfaceProviderWaitBreach(
  snapshot: ProviderWaitBreachSnapshot | null | undefined,
): boolean {
  return Boolean(snapshot && snapshot.phase !== 'on-track');
}

export function summarizeProviderWaitBreachBoard(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): ProviderWaitBreachBoardSummary {
  const settings = resolveProviderWaitBreachSettings(context.settings || {}, context);
  const awaiting = patients.filter(isAwaitingProvider);
  const snapshots = awaiting
    .map((patient) => resolveProviderWaitBreachTimer(patient, context))
    .filter((snapshot): snapshot is ProviderWaitBreachSnapshot => Boolean(snapshot));

  const breachedCount = snapshots.filter((snapshot) => snapshot.phase === 'breached').length;
  const approachingThresholdCount = snapshots.filter(
    (snapshot) => snapshot.phase === 'approaching-threshold',
  ).length;
  const onTrackCount = snapshots.filter((snapshot) => snapshot.phase === 'on-track').length;
  const highRiskExceptionCount = snapshots.filter(
    (snapshot) =>
      snapshot.highRiskException &&
      (snapshot.phase === 'approaching-threshold' || snapshot.phase === 'breached'),
  ).length;
  const longestElapsedMinutes = snapshots.length
    ? Math.max(...snapshots.map((snapshot) => snapshot.elapsedMinutes))
    : 0;

  return {
    awaitingProviderCount: awaiting.length,
    onTrackCount,
    approachingThresholdCount,
    breachedCount,
    highRiskExceptionCount,
    longestElapsedMinutes,
    longestElapsedLabel: formatDuration(longestElapsedMinutes),
    defaultTargetMinutes: settings.defaultTargetMinutes,
    warningMinutes: settings.warningMinutes,
  };
}

export function summarizeProviderWaitBreachAnalytics(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): {
  summary: ProviderWaitBreachBoardSummary;
  breachedPatients: Array<{ patient: Patient; snapshot: ProviderWaitBreachSnapshot }>;
  approachingPatients: Array<{ patient: Patient; snapshot: ProviderWaitBreachSnapshot }>;
  highRiskExceptionPatients: Array<{ patient: Patient; snapshot: ProviderWaitBreachSnapshot }>;
} {
  const summary = summarizeProviderWaitBreachBoard(patients, context);

  const breachedPatients = patients
    .filter(isAwaitingProvider)
    .map((patient) => ({ patient, snapshot: resolveProviderWaitBreachTimer(patient, context)! }))
    .filter((entry) => entry.snapshot?.phase === 'breached');

  const approachingPatients = patients
    .filter(isAwaitingProvider)
    .map((patient) => ({ patient, snapshot: resolveProviderWaitBreachTimer(patient, context)! }))
    .filter((entry) => entry.snapshot?.phase === 'approaching-threshold');

  const highRiskExceptionPatients = patients
    .filter(isAwaitingProvider)
    .map((patient) => ({ patient, snapshot: resolveProviderWaitBreachTimer(patient, context)! }))
    .filter(
      (entry) =>
        entry.snapshot?.highRiskException &&
        (entry.snapshot.phase === 'approaching-threshold' || entry.snapshot.phase === 'breached'),
    );

  return {
    summary,
    breachedPatients,
    approachingPatients,
    highRiskExceptionPatients,
  };
}

export const PROVIDER_WAIT_BREACH_SURFACES = Object.freeze([
  'charge-nurse',
  'whiteboard',
  'waiting-room-board',
  'command-center',
]);

export type ProviderWaitBreachAttentionRow = {
  patientId: string;
  displayName: string;
  phase: ProviderWaitBreachPhase;
  elapsedLabel: string;
  label: string;
  tone: ProviderWaitBreachTone;
  remainingMinutes: number | null;
  highRiskException: boolean;
  targetMinutes: number;
};

export type ProviderWaitBreachAttentionSnapshot = {
  summary: ProviderWaitBreachBoardSummary;
  rows: ProviderWaitBreachAttentionRow[];
  previewRows: ProviderWaitBreachAttentionRow[];
};

const PHASE_RANK: Record<ProviderWaitBreachPhase, number> = {
  breached: 2,
  'approaching-threshold': 1,
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

export function sortPatientsForProviderWaitBreachAttention(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): Patient[] {
  return [...patients]
    .filter(isAwaitingProvider)
    .map((patient) => ({
      patient,
      snapshot: resolveProviderWaitBreachTimer(patient, context),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: ProviderWaitBreachSnapshot } =>
        Boolean(entry.snapshot && shouldSurfaceProviderWaitBreach(entry.snapshot)),
    )
    .sort(
      (left, right) =>
        PHASE_RANK[right.snapshot.phase] - PHASE_RANK[left.snapshot.phase] ||
        Number(right.snapshot.highRiskException) - Number(left.snapshot.highRiskException) ||
        right.snapshot.elapsedMinutes - left.snapshot.elapsedMinutes,
    )
    .map((entry) => entry.patient);
}

export function buildProviderWaitBreachAttentionSnapshot(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): ProviderWaitBreachAttentionSnapshot {
  const summary = summarizeProviderWaitBreachBoard(patients, context);
  const rows = sortPatientsForProviderWaitBreachAttention(patients, context).map((patient) => {
    const snapshot = resolveProviderWaitBreachTimer(patient, context)!;
    return {
      patientId: patient.id,
      displayName: patientDisplayName(patient),
      phase: snapshot.phase,
      elapsedLabel: snapshot.elapsedLabel,
      label: snapshot.label,
      tone: snapshot.tone,
      remainingMinutes: snapshot.remainingMinutes,
      highRiskException: snapshot.highRiskException,
      targetMinutes: snapshot.targetMinutes,
    };
  });

  return {
    summary,
    rows,
    previewRows: rows.slice(0, 4),
  };
}

export type ProviderWaitBreachAlert = Alert;

export function buildProviderWaitBreachAlerts(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): Alert[] {
  const now = context.now || new Date();
  const snapshot = buildProviderWaitBreachAttentionSnapshot(patients, context);
  const alerts: Alert[] = [];

  if (snapshot.summary.breachedCount >= 3) {
    alerts.push({
      id: 'provider-wait-breach-board',
      type: 'Operational',
      severity: 'Critical',
      title: 'Provider wait breaches',
      message: `${snapshot.summary.breachedCount} patients breached triage-to-provider thresholds · longest ${snapshot.summary.longestElapsedLabel}`,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'provider-wait-breach-timer',
      metadata: { advisoryOnly: true },
    });
  } else if (snapshot.summary.breachedCount > 0) {
    alerts.push({
      id: 'provider-wait-breach-board',
      type: 'Operational',
      severity: 'Warning',
      title: 'Provider wait breached',
      message: `${snapshot.summary.breachedCount} patient${snapshot.summary.breachedCount === 1 ? '' : 's'} exceeded triage-to-provider target`,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'provider-wait-breach-timer',
      metadata: { advisoryOnly: true },
    });
  }

  snapshot.previewRows.slice(0, 2).forEach((row) => {
    alerts.push({
      id: `provider-wait-breach-${row.patientId}`,
      type: 'Operational',
      severity: row.phase === 'breached' ? 'Critical' : 'Warning',
      title: row.label,
      message: `${row.displayName} · ${row.elapsedLabel} elapsed · target ${row.targetMinutes}m${row.highRiskException ? ' · high-risk exception' : ''}`,
      patientId: row.patientId,
      createdAt: now.toISOString(),
      dismissed: false,
      source: 'provider-wait-breach-timer',
      actionType: 'VIEW_PATIENT',
      actionLabel: 'Review patient',
      metadata: {
        advisoryOnly: true,
        highRiskException: row.highRiskException,
        phase: row.phase,
      },
    });
  });

  return alerts;
}

export type ProviderWaitBreachTimerStore = {
  patients?: Patient[];
  settings?: Record<string, unknown>;
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/** Broadcast provider wait breach snapshot to connected operational surfaces. */
export function syncProviderWaitBreachOperationalSurfaces(
  store: ProviderWaitBreachTimerStore,
  options: { patientId?: string; source?: string } = {},
): ProviderWaitBreachAttentionSnapshot {
  const snapshot = buildProviderWaitBreachAttentionSnapshot(store.patients || [], {
    settings: store.settings,
  });

  store.dispatchWebSocketEvent?.({
    type: 'provider_wait_breach_sync',
    payload: {
      patientId: options.patientId || null,
      source: options.source || 'provider-wait-breach-timer',
      surfaces: [...PROVIDER_WAIT_BREACH_SURFACES],
      summary: snapshot.summary,
      rows: snapshot.rows.map((row) => ({
        patientId: row.patientId,
        displayName: row.displayName,
        phase: row.phase,
        elapsedLabel: row.elapsedLabel,
        label: row.label,
        tone: row.tone,
        remainingMinutes: row.remainingMinutes,
        highRiskException: row.highRiskException,
        targetMinutes: row.targetMinutes,
      })),
      generatedAt: new Date().toISOString(),
    },
  });

  return snapshot;
}
