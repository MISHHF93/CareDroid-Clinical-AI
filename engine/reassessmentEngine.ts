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
const P1_P2_SCORE_STALE_MINUTES = 120;

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

export const REASSESSMENT_FLAG_TYPES: readonly PatientFlagType[] = [
  'ReassessmentDue',
  'HighRisk',
  'DeteriorationRisk',
  'ScoreReassessmentRecommended',
];

const MANAGED_FLAG_TYPES = new Set<PatientFlagType>(REASSESSMENT_FLAG_TYPES);

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

const emergencySettings = () => useEmergencyStore.getState().emergencySettings;

const latestStateTimestamp = (patient: Patient, state: PatientState): string | null => {
  const event = [...patient.timeline].reverse().find((item) => {
    const stateTarget = item.toState || item.to;
    return stateTarget === state || item.summary.toLowerCase().includes(`to ${state.toLowerCase()}`);
  });

  if (event?.timestamp) return event.timestamp;
  if (state === PatientState.Arrival) return patient.arrivalTime;
  if (state === PatientState.Triage) return patient.triageTime;
  if (state === patient.state) return patient.triageTime ?? patient.arrivalTime;
  return null;
};

const isWaitingPastThreshold = (patient: Patient, now: Date): boolean =>
  patient.state === PatientState.Waiting &&
  minutesSince(latestStateTimestamp(patient, PatientState.Waiting), now) >
    (emergencySettings()?.thresholds?.waitWarningMinutes || 45);

const vitalsOverdueThreshold = (priority: Priority): number | null => {
  const intervals = emergencySettings()?.thresholds?.reassessmentIntervals || {};
  if (priority === Priority.P1) return intervals.P1 || 15;
  if (priority === Priority.P2) return intervals.P2 || 30;
  if (priority === Priority.P3) return intervals.P3 || 60;
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

const latestScoreTimestamp = (patient: Patient): string | null => {
  const event = [...patient.timeline]
    .reverse()
    .find((item) => item.type === 'SCORE' || item.type === 'ClinicalScoreSaved');
  return event?.timestamp ?? null;
};

const scoreStalenessMinutes = (patient: Patient, now: Date): number | null => {
  const timestamp = latestScoreTimestamp(patient);
  if (!timestamp) return null;
  return minutesSince(timestamp, now);
};

const hasStaleScore = (patient: Patient, now: Date): boolean => {
  if (patient.priority !== Priority.P1 && patient.priority !== Priority.P2) return false;
  const ageMinutes = scoreStalenessMinutes(patient, now);
  return ageMinutes !== null && ageMinutes > P1_P2_SCORE_STALE_MINUTES;
};

const deteriorationReasons = (patient: Patient): string[] => {
  const { hr, spo2, temp, bpSystolic } = patient.vitals;
  const reasons: string[] = [];

  if (typeof hr === 'number' && (hr > 120 || hr < 50)) reasons.push(`HR ${hr}`);
  if (typeof spo2 === 'number' && spo2 < 94) reasons.push(`SpO2 ${spo2}%`);
  if (typeof temp === 'number' && temp > 38.5) reasons.push(`Temp ${temp}C`);
  if (typeof bpSystolic === 'number' && (bpSystolic < 90 || bpSystolic > 180)) {
    reasons.push(`SBP ${bpSystolic}`);
  }

  const backendDetails = useEmergencyStore.getState().patientBackendDetails?.[patient.id]?.data;
  const criticalLabs = Array.isArray(backendDetails?.labs)
    ? backendDetails.labs.filter((lab: any) => lab?.isCritical)
    : [];
  criticalLabs.slice(0, 3).forEach((lab: any) => {
    const result = [lab.name, lab.value, lab.unit]
      .filter((item) => item !== undefined && item !== null && item !== '')
      .join(' ');
    reasons.push(`Critical lab ${result || 'reported'}`);
  });

  return reasons;
};

const hasDeteriorationSignal = (patient: Patient): boolean => {
  return deteriorationReasons(patient).length > 0;
};

const desiredFlagsForPatient = (patient: Patient, now: Date): DesiredFlag[] => {
  const desiredFlags: DesiredFlag[] = [];
  const reassessmentReasons: string[] = [];

  if (isWaitingPastThreshold(patient, now)) {
    reassessmentReasons.push(
      `Waiting more than ${emergencySettings()?.thresholds?.waitWarningMinutes || 45} minutes`
    );
  }

  if (hasVitalsOverdue(patient, now)) {
    const threshold = vitalsOverdueThreshold(patient.priority);
    reassessmentReasons.push(`${patient.priority} vitals overdue more than ${threshold} minutes`);
  }

  if (reassessmentReasons.length) {
    desiredFlags.push({
      type: 'ReassessmentDue',
      reason: reassessmentReasons.join('; '),
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
      reason: `Abnormal vitals: ${deteriorationReasons(patient).join(', ')}`,
      severity: 'Critical',
    });
  }

  if (hasStaleScore(patient, now)) {
    const ageMinutes = scoreStalenessMinutes(patient, now);
    desiredFlags.push({
      type: 'ScoreReassessmentRecommended',
      reason: `Score reassessment recommended; latest score is ${ageMinutes} minutes old`,
      severity: 'Warning',
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
