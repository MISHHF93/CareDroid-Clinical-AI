import { hasPatientFlag, useEmergencyStore, type EmergencyStoreState } from '../store/emergencyStore';
import {
  PatientState,
  type CapacityRiskLevel,
  type CapacityScoreDeduction,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Room,
} from '../types/emergency';

export const CAPACITY_RECALCULATION_INTERVAL_MS = 30_000;
const OCCUPANCY_TARGET_PERCENT = 80;
const OCCUPANCY_OVERAGE_DEDUCTION = 5;
const BOARDING_PATIENT_DEDUCTION = 8;
const REASSESSMENT_QUEUE_THRESHOLD = 3;
const REASSESSMENT_QUEUE_DEDUCTION = 10;
const INCOMING_CRITICAL_EMS_DEDUCTION = 5;
const NO_RECENT_DISCHARGE_DEDUCTION = 10;

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
    percent: number;
    overagePatients: number;
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

const minutesSince = (timestamp: string | null, now: Date): number => {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60_000));
};

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
  const occupiedRoomCount = state.rooms.filter(
    (room) => room.status === 'Occupied' || room.currentPatientId !== null
  ).length;
  const roomCount = state.rooms.length;
  const occupancyThreshold = Math.floor(roomCount * (OCCUPANCY_TARGET_PERCENT / 100));

  return {
    totalActivePatients: state.patients.filter(isActivePatient).length,
    roomOccupancy: {
      occupied: occupiedRoomCount,
      total: roomCount,
      percent: roomCount ? Math.round((occupiedRoomCount / roomCount) * 100) : 0,
      overagePatients: Math.max(0, occupiedRoomCount - occupancyThreshold),
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

export const capacityBandForScore = (
  score: number
): { riskLevel: CapacityRiskLevel; label: CapacitySnapshot['label'] } => {
  if (score >= 80) return { riskLevel: 'Green', label: 'Capacity Normal' };
  if (score >= 60) return { riskLevel: 'Yellow', label: 'Capacity Moderate' };
  if (score >= 40) return { riskLevel: 'Orange', label: 'Capacity Strained' };
  return { riskLevel: 'Red', label: 'Capacity Critical' };
};

export const deriveCapacityDeductions = (inputs: CapacityEngineInputs): CapacityScoreDeduction[] => {
  const deductions: CapacityScoreDeduction[] = [];

  if (inputs.roomOccupancy.overagePatients > 0) {
    deductions.push({
      id: 'room-occupancy-over-80',
      label: `${inputs.roomOccupancy.overagePatients} patient${
        inputs.roomOccupancy.overagePatients === 1 ? '' : 's'
      } over 80% room occupancy`,
      value: inputs.roomOccupancy.overagePatients * OCCUPANCY_OVERAGE_DEDUCTION,
    });
  }

  if (inputs.boardingPatients > 0) {
    deductions.push({
      id: 'boarding-patients',
      label: `${inputs.boardingPatients} boarding patient${
        inputs.boardingPatients === 1 ? '' : 's'
      }`,
      value: inputs.boardingPatients * BOARDING_PATIENT_DEDUCTION,
    });
  }

  if (inputs.reassessmentQueueLength > REASSESSMENT_QUEUE_THRESHOLD) {
    deductions.push({
      id: 'reassessment-queue',
      label: `Reassessment queue over ${REASSESSMENT_QUEUE_THRESHOLD} patients`,
      value: REASSESSMENT_QUEUE_DEDUCTION,
    });
  }

  if (inputs.incomingEMSCriticalCount > 0) {
    deductions.push({
      id: 'incoming-critical-ems',
      label: `${inputs.incomingEMSCriticalCount} incoming critical EMS case${
        inputs.incomingEMSCriticalCount === 1 ? '' : 's'
      }`,
      value: inputs.incomingEMSCriticalCount * INCOMING_CRITICAL_EMS_DEDUCTION,
    });
  }

  if (inputs.dischargesPast60Minutes === 0) {
    deductions.push({
      id: 'no-recent-discharges',
      label: 'No discharges in past 60 minutes',
      value: NO_RECENT_DISCHARGE_DEDUCTION,
    });
  }

  return deductions;
};

export const calculateCapacityScore = (deductions: CapacityScoreDeduction[]): number => {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.value, 0);
  return Math.max(0, Math.min(100, 100 - totalDeductions));
};

const availableRoomCount = (rooms: Room[]): number =>
  rooms.filter((room) => room.status === 'Available').length;

export const deriveCapacitySnapshot = (
  state: EmergencyStoreState,
  now = new Date()
): CapacitySnapshot => {
  const inputs = deriveCapacityEngineInputs(state, now);
  const deductions = deriveCapacityDeductions(inputs);
  const score = calculateCapacityScore(deductions);
  const band = capacityBandForScore(score);
  const waitingPatients = state.patients.filter((patient) => patient.state === PatientState.Waiting);

  const longestWaitMinutes = Math.max(
    0,
    ...waitingPatients.map((patient) => minutesSince(patient.arrivalTime, now))
  );
  const averageWaitMinutes = waitingPatients.length
    ? Math.round(
        waitingPatients.reduce(
          (sum, patient) => sum + minutesSince(patient.arrivalTime, now),
          0
        ) / waitingPatients.length
      )
    : 0;

  return {
    id: 'capacity-current',
    generatedAt: now.toISOString(),
    totalActivePatients: inputs.totalActivePatients,
    currentOccupancy: inputs.roomOccupancy.occupied,
    maxCapacity: inputs.roomOccupancy.total,
    occupancyPercent: inputs.roomOccupancy.percent,
    occupancyOveragePatients: inputs.roomOccupancy.overagePatients,
    waitingCount: waitingPatients.length,
    triageCount: state.patients.filter((patient) => patient.state === PatientState.Triage).length,
    assessmentCount: state.patients.filter((patient) => patient.state === PatientState.Assessment)
      .length,
    boardingCount: inputs.boardingPatients,
    admissionPendingCount: state.patients.filter((patient) => hasPatientFlag(patient, 'PendingAdmission'))
      .length,
    dischargePendingCount: inputs.dischargeReadyCount,
    emsInboundCount: inputs.incomingEMSCount,
    isolationRequiredCount: state.patients.filter((patient) => hasPatientFlag(patient, 'Isolation'))
      .length,
    staffedRoomCount: inputs.roomOccupancy.occupied,
    availableRoomCount: availableRoomCount(state.rooms),
    reassessmentDueCount: inputs.reassessmentQueueLength,
    incomingEMSCount: inputs.incomingEMSCount,
    incomingEMSCriticalCount: inputs.incomingEMSCriticalCount,
    dischargeReadyCount: inputs.dischargeReadyCount,
    dischargesPast60Minutes: inputs.dischargesPast60Minutes,
    hasRecentDischarge: inputs.dischargesPast60Minutes > 0,
    longestWaitMinutes,
    averageWaitMinutes,
    riskLevel: band.riskLevel,
    label: band.label,
    deductions,
    score,
  };
};

const runCapacityPass = (): void => {
  const store = useEmergencyStore.getState();
  useEmergencyStore.setState({
    capacity: deriveCapacitySnapshot(store),
  });
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
