import { useEmergencyStore } from '../store/emergencyStore';
import { dispatchAlert } from './alertEngine';
import { longWaitStatus } from '../utils/longWaitRescue';
import { evaluateReassessmentDueFlag } from './reassessmentTimerEngine';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../types/emergency';
import { hasPatientFlag, meetsDeteriorationVitalsCriteria } from '../utils/patientVitals';

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

export function syncReassessmentDueFlag(
  patient: Patient,
  now: Date,
  thresholds: ReturnType<typeof useEmergencyStore.getState>['thresholds'],
  addFlag: (patientId: string, flag: PatientFlag) => void,
  removeFlag: (patientId: string, flag: PatientFlag) => void,
): void {
  const hasFlag = (flag: PatientFlag) => hasPatientFlag(patient, flag);
  const { shouldFlag } = evaluateReassessmentDueFlag(patient, { now, thresholds: { thresholds } });

  if (patient.state === PatientState.Waiting && shouldFlag && !hasFlag(PatientFlag.ReassessmentDue)) {
    addFlag(patient.id, PatientFlag.ReassessmentDue);
    return;
  }

  // Only clear once the patient has actually reached active clinical care
  // (laterStates, same set Rule 2 below uses for HighRisk) -- not merely
  // upon leaving Waiting. Smart Intake sets this flag from a real vitals
  // check (backend requiresReassessment()) and moves the patient straight
  // to Triage; a bare `state !== Waiting` check fired on the very next tick
  // for every such patient, silently erasing a genuine, unresolved vitals
  // concern before any clinician had reassessed them.
  if (laterStates.includes(patient.state) && hasFlag(PatientFlag.ReassessmentDue)) {
    removeFlag(patient.id, PatientFlag.ReassessmentDue);
  }
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
      const vitalsList = Array.isArray(patient.vitals) ? patient.vitals : [];
      const latestVitals = vitalsList.at(-1);
      const hasFlag = (f: PatientFlag) => hasPatientFlag(patient, f);

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

      syncReassessmentDueFlag(patient, now, thresholds, addFlag, removeFlag);

      // Rule 2: P1/P2 not in Assessment+
      if ([Priority.P1, Priority.P2].includes(patient.priority)
          && !laterStates.includes(patient.state)
          && !hasFlag(PatientFlag.HighRisk)) {
        addFlag(patient.id, PatientFlag.HighRisk);
      }

      // Rule 3: Deterioration signals from vitals (thresholds shared with the
      // vitals-recording pipeline via meetsDeteriorationVitalsCriteria so the
      // add/clear lifecycle stays symmetric).
      if (latestVitals) {
        const detFlag = PatientFlag.DeteriorationRisk;
        const isDeteriorating = meetsDeteriorationVitalsCriteria(latestVitals);
        if (isDeteriorating) {
          if (!hasFlag(detFlag)) {
            addFlag(patient.id, detFlag);
          }
          if (!hasFlag(PatientFlag.ReassessmentDue)) {
            addFlag(patient.id, PatientFlag.ReassessmentDue);
          }
          if (!hasFlag(PatientFlag.ScoreReassessmentRecommended)) {
            addFlag(patient.id, PatientFlag.ScoreReassessmentRecommended);
          }
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

export function runEmergencyReassessment(now = new Date()): void {
  const { patients, addFlag, removeFlag, emergencySettings, thresholds } =
    useEmergencyStore.getState();

  patients.forEach((patient) => {
    const hasFlag = (f: PatientFlag) => hasPatientFlag(patient, f);

    if (patient.state === PatientState.Waiting) {
      const status = longWaitStatus(patient, now, emergencySettings);
      const waitMins = status.waitMinutesExact;
      const target = status.thresholdMinutes;
      const name = `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;

      if (waitMins >= status.warningAt && !hasFlag(PatientFlag.LongWait)) {
        addFlag(patient.id, PatientFlag.LongWait);
        dispatchAlert({
          id: `long-wait-warning-${patient.id}-${longWaitAlertBucket(waitMins)}`,
          type: 'Queue',
          severity: 'Warning',
          title: `Wait threshold — ${name}`,
          message: `${patient.priority} patient. ${Math.round(waitMins)}min wait. Target: ${target}min`,
          patientId: patient.id,
          source: LONG_WAIT_ALERT_SOURCE,
        });
      }
    }

    syncReassessmentDueFlag(patient, now, thresholds, addFlag, removeFlag);

    if (
      [Priority.P1, Priority.P2].includes(patient.priority) &&
      ![
        PatientState.Assessment,
        PatientState.Orders,
        PatientState.Results,
        PatientState.Disposition,
        PatientState.Admission,
        PatientState.Discharge,
      ].includes(patient.state) &&
      !hasFlag(PatientFlag.HighRisk)
    ) {
      addFlag(patient.id, PatientFlag.HighRisk);
    }

    if (patient.state !== PatientState.Waiting && hasFlag(PatientFlag.LongWait)) {
      removeFlag(patient.id, PatientFlag.LongWait);
    }
  });
}
