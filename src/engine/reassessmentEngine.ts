import { useEmergencyStore } from '../store/emergencyStore';
import { dispatchAlert } from './alertEngine';
import { longWaitStatus } from '../utils/longWaitRescue';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../types/emergency';

export const REASSESSMENT_FLAG_TYPES = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.ScoreReassessmentRecommended,
  PatientFlag.ReassessmentDue,
];

const laterStates = [
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
  PatientState.Discharge,
];

export const LONG_WAIT_ALERT_DEDUPE_MINUTES = 15;
const LONG_WAIT_ALERT_SOURCE = 'long-wait-rescue';

type LongWaitAlertPhase = 'warning' | 'critical' | 'lwbs';

export function longWaitAlertBucket(waitMins: number, intervalMinutes = LONG_WAIT_ALERT_DEDUPE_MINUTES): number {
  return Math.floor(Math.max(0, waitMins) / intervalMinutes);
}

export function hasLongWaitAlertForBucket(
  alerts: Alert[],
  patientId: string,
  phase: LongWaitAlertPhase,
  bucket: number,
): boolean {
  return alerts.some((alert) =>
    !alert.dismissed &&
    alert.patientId === patientId &&
    alert.source === LONG_WAIT_ALERT_SOURCE &&
    alert.metadata?.longWaitPhase === phase &&
    alert.metadata?.dedupeBucket === bucket
  );
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function reassessmentThresholdForPriority(priority: Priority, thresholds: ReturnType<typeof useEmergencyStore.getState>['thresholds']): number {
  const priorityThresholds = {
    [Priority.P1]: thresholds.reassessP1Min,
    [Priority.P2]: thresholds.reassessP2Min,
    [Priority.P3]: thresholds.reassessP3Min,
    [Priority.P4]: thresholds.reassessP4Min,
    [Priority.P5]: thresholds.reassessP5Min,
  };
  return priorityThresholds[priority] ?? thresholds.reassessP3Min;
}

function dispatchLongWaitAlert(
  patient: Patient,
  phase: LongWaitAlertPhase,
  title: string,
  message: string,
  waitMins: number,
): void {
  const bucket = longWaitAlertBucket(waitMins);
  dispatchAlert({
    id: `long-wait-${phase}-${patient.id}-${bucket}`,
    type: 'Queue',
    severity: phase === 'warning' ? 'Warning' : 'Critical',
    title,
    message,
    patientId: patient.id,
    source: LONG_WAIT_ALERT_SOURCE,
    metadata: {
      longWaitPhase: phase,
      dedupeBucket: bucket,
      waitMinutes: Math.round(waitMins),
    },
  });
}

export function startReassessmentEngine() {
  return window.setInterval(() => {
    const { patients, addFlag, removeFlag, alerts, emergencySettings, thresholds } =
      useEmergencyStore.getState();
    const now = new Date();

    patients.forEach(patient => {
      const arrivalMins =
        (now.getTime() - new Date(patient.arrivalTime).getTime()) / 60000;
      const latestVitals = patient.vitals[patient.vitals.length - 1];
      const hasFlag = (f: PatientFlag) =>
        patient.flags.includes(f);

      // Rule 1: Long wait rescue in Waiting state
      if (patient.state === PatientState.Waiting) {
        const status = longWaitStatus(patient, now, emergencySettings);
        const waitMins = status.waitMinutesExact;
        const target = status.thresholdMinutes;
        const name = patientName(patient);

        if (waitMins >= status.warningAt && !hasFlag(PatientFlag.LongWait)) {
          addFlag(patient.id, PatientFlag.LongWait);
          dispatchLongWaitAlert(
            patient,
            'warning',
            `Wait threshold — ${name}`,
            `${patient.priority} patient. ${Math.round(waitMins)}min wait. Target: ${target}min`,
            waitMins,
          );
        }

        if (waitMins >= status.criticalAt) {
          const bucket = longWaitAlertBucket(waitMins);
          if (!hasLongWaitAlertForBucket(alerts, patient.id, 'critical', bucket)) {
            dispatchLongWaitAlert(
              patient,
              'critical',
              `Wait critical — ${name}`,
              `${Math.round(waitMins)}min wait. Target exceeded by ${Math.round(waitMins - target)}min`,
              waitMins,
            );
          }
        }

        if (waitMins >= status.lwbsAt) {
          if (!hasFlag(PatientFlag.LWBSRisk)) {
            addFlag(patient.id, PatientFlag.LWBSRisk);
          }
          const bucket = longWaitAlertBucket(waitMins);
          if (!hasLongWaitAlertForBucket(alerts, patient.id, 'lwbs', bucket)) {
            dispatchLongWaitAlert(
              patient,
              'lwbs',
              `LWBS RISK — ${name}`,
              `Patient may leave without being seen. ${Math.round(waitMins)}min wait.`,
              waitMins,
            );
          }
        }
      }

      if (patient.state === PatientState.Waiting && arrivalMins > thresholds.waitTimeWarningMin
          && !hasFlag(PatientFlag.ReassessmentDue)) {
        addFlag(patient.id, PatientFlag.ReassessmentDue);
      }

      if (latestVitals) {
        const vitalRecordedAt = new Date(latestVitals.recordedAt || patient.arrivalTime).getTime();
        const vitalAgeMins = Number.isFinite(vitalRecordedAt)
          ? (now.getTime() - vitalRecordedAt) / 60000
          : arrivalMins;
        const priorityThresholdMins = reassessmentThresholdForPriority(patient.priority, thresholds);
        if (vitalAgeMins > priorityThresholdMins && !hasFlag(PatientFlag.ReassessmentDue)) {
          addFlag(patient.id, PatientFlag.ReassessmentDue);
        }
      }

      // Rule 2: P1/P2 not in Assessment+
      if ([Priority.P1, Priority.P2].includes(patient.priority)
          && !laterStates.includes(patient.state)
          && !hasFlag(PatientFlag.HighRisk)) {
        addFlag(patient.id, PatientFlag.HighRisk);
      }

      // Rule 3: Deterioration signals from vitals
      if (latestVitals) {
        const detFlag = PatientFlag.DeteriorationRisk;
        const isDeteriorating =
          (latestVitals.spo2 !== undefined && latestVitals.spo2 < 94) ||
          (latestVitals.hr !== undefined && (latestVitals.hr > 120 ||
            latestVitals.hr < 50)) ||
          (latestVitals.sbp !== undefined && (latestVitals.sbp < 90 ||
            latestVitals.sbp > 180));
        if (isDeteriorating && !hasFlag(detFlag)) {
          addFlag(patient.id, detFlag);
        }
      }

      // Rule 4: Remove stale flags
      if (patient.state !== PatientState.Waiting &&
          hasFlag(PatientFlag.LongWait)) {
        removeFlag(patient.id, PatientFlag.LongWait);
      }
      if (patient.state !== PatientState.Waiting &&
          hasFlag(PatientFlag.LWBSRisk)) {
        removeFlag(patient.id, PatientFlag.LWBSRisk);
      }
    });
  }, 60000);
}
