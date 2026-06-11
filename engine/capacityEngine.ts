import { hasPatientFlag, useEmergencyStore, type EmergencyStoreState } from '../store/emergencyStore';
import { PatientState, type EMSArrival, type Patient } from '../types/emergency';

const CAPACITY_RECALCULATION_INTERVAL_MS = 30_000;

type TimerHandle = number;

interface CapacityEngine {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  runOnce: () => void;
}

export interface CapacityEngineInputs {
  totalActivePatients: number;
  roomOccupancy: {
    occupied: number;
    total: number;
  };
  boardingPatients: number;
  reassessmentQueueLength: number;
  incomingEMSCount: number;
  incomingEMSCriticalCount: number;
  dischargeReadyCount: number;
  dischargesPast60Minutes: number;
}

const isActivePatient = (patient: Patient): boolean =>
  patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased;

const isIncomingEMS = (arrival: EMSArrival): boolean => arrival.status === 'Inbound';

const hasDischargeEventInPast60Minutes = (patient: Patient, now: Date): boolean =>
  patient.timeline.some((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    if (!Number.isFinite(eventTime)) return false;
    if (now.getTime() - eventTime > 60 * 60_000) return false;

    return (
      event.toState === PatientState.Discharge ||
      event.to === PatientState.Discharge ||
      event.summary.toLowerCase().includes('discharged')
    );
  });

export const deriveCapacityEngineInputs = (
  state: EmergencyStoreState,
  now = new Date()
): CapacityEngineInputs => {
  const incomingEMS = state.emsArrivals.filter(isIncomingEMS);

  return {
    totalActivePatients: state.patients.filter(isActivePatient).length,
    roomOccupancy: {
      occupied: state.rooms.filter(
        (room) => room.status === 'Occupied' || room.currentPatientId !== null
      ).length,
      total: state.rooms.length,
    },
    boardingPatients: state.patients.filter((patient) => patient.state === PatientState.Admission)
      .length,
    reassessmentQueueLength: state.patients.filter((patient) =>
      hasPatientFlag(patient, 'ReassessmentDue')
    ).length,
    incomingEMSCount: incomingEMS.length,
    incomingEMSCriticalCount: incomingEMS.filter((arrival) => arrival.severity === 'Critical')
      .length,
    dischargeReadyCount: state.patients.filter(
      (patient) => patient.state === PatientState.Disposition
    ).length,
    dischargesPast60Minutes: state.patients.filter((patient) =>
      hasDischargeEventInPast60Minutes(patient, now)
    ).length,
  };
};

const runCapacityPass = (): void => {
  const store = useEmergencyStore.getState();
  deriveCapacityEngineInputs(store);
  store.updateCapacity();
};

const createCapacityEngine = (): CapacityEngine => {
  let timer: TimerHandle | null = null;

  const stop = (): void => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const start = (): void => {
    if (timer || typeof window === 'undefined') return;

    timer = window.setInterval(runCapacityPass, CAPACITY_RECALCULATION_INTERVAL_MS);
    runCapacityPass();
  };

  return {
    start,
    stop,
    isRunning: () => Boolean(timer),
    runOnce: runCapacityPass,
  };
};

export const capacityIntelligenceEngine: CapacityEngine = createCapacityEngine();

export const runCapacityIntelligence = (): void => capacityIntelligenceEngine.runOnce();

export const startCapacityIntelligence = (): void => capacityIntelligenceEngine.start();

export const stopCapacityIntelligence = (): void => capacityIntelligenceEngine.stop();

export type { CapacityEngine };
