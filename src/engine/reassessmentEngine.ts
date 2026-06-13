import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

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

export function startReassessmentEngine() {
  return window.setInterval(() => {
    const { patients, addFlag, removeFlag } =
      useEmergencyStore.getState();
    const now = Date.now();

    patients.forEach(patient => {
      const arrivalMins =
        (now - new Date(patient.arrivalTime).getTime()) / 60000;
      const latestVitals = patient.vitals[0];
      const hasFlag = (f: PatientFlag) =>
        patient.flags.includes(f);

      // Rule 1: Long wait in Waiting state
      if (patient.state === PatientState.Waiting && arrivalMins > 45
          && !hasFlag(PatientFlag.ReassessmentDue)) {
        addFlag(patient.id, PatientFlag.ReassessmentDue);
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
    });
  }, 60000);
}
