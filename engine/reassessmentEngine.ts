import { createPatientFlag, getPatientFlagType, useEmergencyStore } from '../store/emergencyStore';
import {
  PatientState,
  Priority,
  type JourneyEvent,
  type Patient,
  type PatientFlag,
  type PatientFlagSeverity,
  type PatientFlagType,
} from '../types/emergency';

const REASSESSMENT_INTERVAL_MS = 60_000;

type TimerHandle = number;

interface ReassessmentEngine {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  runOnce: () => void;
}

interface DesiredFlag {
  type: PatientFlagType;
  reason: string;
  severity: PatientFlagSeverity;
}

const MANAGED_FLAG_TYPES = new Set<PatientFlagType>([
  'ReassessmentDue',
  'HighRisk',
  'DeteriorationRisk',
]);

const PRE_ASSESSMENT_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
]);

const isActivePatient = (patient: Patient): boolean =>
  patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased;

const minutesSince = (timestamp: string | null, now: Date): number => {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60_000));
};

const isWaitingPastThreshold = (patient: Patient, now: Date): boolean =>
  patient.state === PatientState.Waiting &&
  minutesSince(patient.triageTime ?? patient.arrivalTime, now) > 45;

const vitalsOverdueThreshold = (priority: Priority): number | null => {
  if (priority === Priority.P1 || priority === Priority.P2) return 30;
  if (priority === Priority.P3) return 60;
  return null;
};

const hasVitalsOverdue = (patient: Patient, now: Date): boolean => {
  const threshold = vitalsOverdueThreshold(patient.priority);
  if (threshold === null) return false;
  return minutesSince(patient.vitals.recordedAt, now) > threshold;
};

const hasPriorityMismatch = (patient: Patient): boolean =>
  (patient.priority === Priority.P1 || patient.priority === Priority.P2) &&
  PRE_ASSESSMENT_STATES.has(patient.state);

const hasDeteriorationSignal = (patient: Patient): boolean => {
  const { hr, spo2, temp, bpSystolic } = patient.vitals;

  return (
    (typeof hr === 'number' && (hr > 120 || hr < 50)) ||
    (typeof spo2 === 'number' && spo2 < 94) ||
    (typeof temp === 'number' && temp > 38.5) ||
    (typeof bpSystolic === 'number' && (bpSystolic < 90 || bpSystolic > 180))
  );
};

const desiredFlagsForPatient = (patient: Patient, now: Date): DesiredFlag[] => {
  const desiredFlags: DesiredFlag[] = [];

  if (isWaitingPastThreshold(patient, now)) {
    desiredFlags.push({
      type: 'ReassessmentDue',
      reason: 'Extended wait',
      severity: 'Warning',
    });
  } else if (hasVitalsOverdue(patient, now)) {
    desiredFlags.push({
      type: 'ReassessmentDue',
      reason: 'Vitals overdue',
      severity: 'Warning',
    });
  }

  if (hasPriorityMismatch(patient)) {
    desiredFlags.push({
      type: 'HighRisk',
      reason: 'High priority not yet assessed',
      severity: 'Critical',
    });
  }

  if (hasDeteriorationSignal(patient)) {
    desiredFlags.push({
      type: 'DeteriorationRisk',
      reason: 'Abnormal vitals',
      severity: 'Critical',
    });
  }

  return desiredFlags;
};

const flagEvent = (
  patient: Patient,
  eventType: JourneyEvent['type'],
  flagType: PatientFlagType,
  timestamp: string,
  reason?: string,
  severity?: PatientFlagSeverity
): JourneyEvent => ({
  id: `reassessment-${patient.id}-${flagType}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  patientId: patient.id,
  type: eventType,
  timestamp,
  summary:
    eventType === 'FlagAdded'
      ? `Added ${flagType} flag from reassessment engine.`
      : `Removed ${flagType} flag from reassessment engine.`,
  metadata: {
    flagType,
    reason: reason ?? null,
    severity: severity ?? null,
  },
});

const sameFlagMetadata = (current: PatientFlag, desired: PatientFlag): boolean =>
  current.type === desired.type &&
  current.reason === desired.reason &&
  current.severity === desired.severity &&
  current.detectedAt === desired.detectedAt;

const reconcileManagedFlags = (
  patient: Patient,
  desiredFlagSpecs: DesiredFlag[],
  detectedAt: string
): { flags: PatientFlag[]; events: JourneyEvent[]; changed: boolean } => {
  const desiredByType = new Map<PatientFlagType, PatientFlag>(
    desiredFlagSpecs.map((spec) => {
      const existing = patient.flags.find((flag) => getPatientFlagType(flag) === spec.type);
      return [
        spec.type,
        createPatientFlag(spec.type, {
          reason: spec.reason,
          severity: spec.severity,
          detectedAt: existing?.detectedAt ?? detectedAt,
        }),
      ];
    })
  );
  const emittedDesiredTypes = new Set<PatientFlagType>();
  const events: JourneyEvent[] = [];

  const nextFlags = patient.flags.flatMap((flag) => {
    const flagType = getPatientFlagType(flag);
    if (!MANAGED_FLAG_TYPES.has(flagType)) return [flag];

    const desiredFlag = desiredByType.get(flagType);
    if (!desiredFlag) {
      events.push(flagEvent(patient, 'FlagRemoved', flagType, detectedAt));
      return [];
    }

    emittedDesiredTypes.add(flagType);
    return [desiredFlag];
  });

  desiredByType.forEach((desiredFlag, flagType) => {
    if (emittedDesiredTypes.has(flagType)) return;
    nextFlags.push(desiredFlag);
    events.push(
      flagEvent(
        patient,
        'FlagAdded',
        flagType,
        detectedAt,
        desiredFlag.reason,
        desiredFlag.severity
      )
    );
  });

  const changed =
    nextFlags.length !== patient.flags.length ||
    nextFlags.some((flag, index) => {
      const currentFlag = patient.flags[index];
      return !currentFlag || !sameFlagMetadata(currentFlag, flag);
    });

  return {
    flags: nextFlags,
    events,
    changed,
  };
};

const runReassessmentPass = (): void => {
  const now = new Date();
  const detectedAt = now.toISOString();
  const store = useEmergencyStore.getState();

  store.patients.filter(isActivePatient).forEach((patient) => {
    const desiredFlags = desiredFlagsForPatient(patient, now);
    const reconciliation = reconcileManagedFlags(patient, desiredFlags, detectedAt);

    if (!reconciliation.changed) return;

    store.updatePatient(patient.id, {
      flags: reconciliation.flags,
      timeline: [...patient.timeline, ...reconciliation.events],
    });
  });

  useEmergencyStore.getState().updateCapacity();
};

const createReassessmentEngine = (): ReassessmentEngine => {
  let timer: TimerHandle | null = null;

  const stop = (): void => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const start = (): void => {
    if (timer || typeof window === 'undefined') return;

    timer = window.setInterval(runReassessmentPass, REASSESSMENT_INTERVAL_MS);
    runReassessmentPass();
  };

  return {
    start,
    stop,
    isRunning: () => Boolean(timer),
    runOnce: runReassessmentPass,
  };
};

export const reassessmentEngine: ReassessmentEngine = createReassessmentEngine();

export const runEmergencyReassessment = (): void => reassessmentEngine.runOnce();

export const startEmergencyReassessment = (): void => reassessmentEngine.start();

export const stopEmergencyReassessment = (): void => reassessmentEngine.stop();

export type { ReassessmentEngine };
