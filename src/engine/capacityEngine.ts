import { useEmergencyStore } from '../store/emergencyStore';
import { dispatchAlert } from './alertEngine';
import {
  PatientFlag,
  PatientState,
  Priority,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Room,
} from '../types/emergency';
import { calculateEmergencyOsCapacity } from '../../lib/emergency-os/logic';
import { hasPatientFlag as patientHasFlag } from '../utils/patientVitals';


type CrisisBand = 'Orange' | 'Red';
type TimestampSource = 'timeline' | 'lastAssessedTime' | 'arrivalTime' | 'unknown';

const ACTIVE_CRITICAL_EMS_STATUSES = new Set(['Inbound', 'Dispatched', 'EnRoute', 'En route']);

export type CapacityCrisisFactor = {
  id: 'boarding' | 'occupancy' | 'reassessment' | 'discharge' | 'ems';
  label: string;
  detail: string;
  points: number;
  percent: number;
  source: 'snapshot' | 'approximation';
};

export type CapacityCrisisBoardingPatient = {
  patient: Patient;
  name: string;
  targetDepartment: string;
  boardingMinutes: number;
  timestampSource: TimestampSource;
};

export type CapacityCrisisDischargePatient = {
  patient: Patient;
  name: string;
  sinceTime: string;
  dispositionMinutes: number;
  timestampSource: TimestampSource;
};

export type CapacityCrisisEmsInbound = {
  id: string;
  label: string;
  etaMinutes: number | null;
  complaint: string;
  severity: string;
};

export type CapacityCrisisState = {
  active: boolean;
  band: CrisisBand | null;
  score: number;
  boardingPatients: CapacityCrisisBoardingPatient[];
  dischargeReady: CapacityCrisisDischargePatient[];
  reassessmentQueue: number;
  criticalEmsInbound: CapacityCrisisEmsInbound[];
  factors: CapacityCrisisFactor[];
  documentation: string[];
};

export type CapacityCrisisInput = {
  capacity?: CapacitySnapshot | null;
  patients?: Patient[];
  rooms?: Room[];
  referrals?: Referral[];
  emsArrivals?: Array<Partial<EMSArrival> & Record<string, unknown>>;
  emsIncomingPatients?: Array<Record<string, unknown>>;
  now?: Date;
};

export function calculateCapacity(): CapacitySnapshot {
  const { patients, rooms, thresholds } = useEmergencyStore.getState();

  const total = patients.filter(p =>
    ![PatientState.Discharge].includes(p.state)).length;
  const boarding = patients.filter(p =>
    p.state === PatientState.Admission).length;
  const reassessmentDue = patients.filter((p) =>
    hasPatientFlag(p, PatientFlag.ReassessmentDue)).length;
  const occupied = rooms.filter(r =>
    r.status === 'Occupied').length;
  const maxRooms = rooms.length || 15;
  const result = calculateEmergencyOsCapacity({
    totalPatients: total,
    occupiedRooms: occupied,
    totalRooms: maxRooms,
    boardingCount: boarding,
    reassessmentDue,
    waitingCount: patients.filter((patient) => patient.state === PatientState.Waiting).length,
    dischargeReadyCount: patients.filter((patient) => patient.state === PatientState.Disposition).length,
    criticalEmsInboundCount: patients.filter(
      (patient) =>
        hasPatientFlag(patient, PatientFlag.EMSArrival) &&
        (patient.priority === Priority.P1 || patient.priority === Priority.P2),
    ).length,
    thresholds: {
      warningPercent: thresholds.capacityWarningPct * 100,
      orangePercent: thresholds.capacityOrangePct * 100,
      criticalPercent: thresholds.capacityRedPct * 100,
    },
  });

  return {
    score: result.score,
    band: result.band,
    label: `${result.band} capacity`,
    riskLevel: result.band,
    totalPatients: total,
    occupiedRooms: occupied,
    boardingCount: boarding,
    reassessmentDue,
    currentOccupancy: occupied,
    maxCapacity: maxRooms,
    occupancyPercent: result.occupancyPercent,
    waitingCount: result.waitingCount,
    dischargeReadyCount: result.dischargeReadyCount,
    incomingEMSCriticalCount: result.criticalEmsInboundCount,
    deductions: result.factors.map((factor) => ({
      id: factor.id,
      label: factor.label,
      value: factor.points,
    })),
    updatedAt: result.updatedAt,
  };
}

export function isCapacityCrisis(capacity?: Pick<CapacitySnapshot, 'band' | 'riskLevel'> | null): boolean {
  return crisisBand(capacity) !== null;
}

export function deriveCapacityCrisisState(input: CapacityCrisisInput = {}): CapacityCrisisState {
  const capacity = input.capacity;
  const patients = input.patients || [];
  const rooms = input.rooms || [];
  const referrals = input.referrals || [];
  const now = input.now || new Date();
  const band = crisisBand(capacity);
  const boardingPatients = deriveBoardingPatients(patients, referrals, now);
  const dischargeReady = deriveDischargeReadyPatients(patients, now);
  const reassessmentQueue = Math.max(
    numericCapacityValue(capacity, ['reassessmentQueueLength', 'reassessmentDueCount', 'reassessmentDue']),
    patients.filter((patient) => hasPatientFlag(patient, PatientFlag.ReassessmentDue)).length,
  );
  const criticalEmsInbound = deriveCriticalEmsInbound(input.emsArrivals || [], input.emsIncomingPatients || []);
  const factors = deriveCapacityCrisisBreakdown({
    capacity,
    patients,
    rooms,
    boardingPatients,
    dischargeReady,
    reassessmentQueue,
    criticalEmsInbound,
  });
  const documentation = [
    'Score breakdown uses snapshot deductions when present; otherwise deductions are approximated from the local capacity-engine formula and visible store state.',
    'Discharge-ready patients are patients in Disposition for more than 30 minutes; timestamp fallback is latest Disposition timeline event, then last assessed time, then arrival time.',
  ];

  if (factors.some((factor) => factor.source === 'approximation')) {
    documentation.push(
      `Approximate deductions: boarding 8 pts per patient, occupancy points above ${Math.round(useEmergencyStore.getState().thresholds.capacityOrangePct * 100)}%, reassessment backlog 10 pts when above 3, discharge backlog 5 pts per ready patient, critical EMS 6 pts each.`,
    );
  }

  return {
    active: band !== null,
    band,
    score: capacity?.score ?? 100,
    boardingPatients,
    dischargeReady,
    reassessmentQueue,
    criticalEmsInbound,
    factors,
    documentation,
  };
}

export function deriveCapacityCrisisBreakdown(input: {
  capacity?: CapacitySnapshot | null;
  patients?: Patient[];
  rooms?: Room[];
  boardingPatients?: CapacityCrisisBoardingPatient[];
  dischargeReady?: CapacityCrisisDischargePatient[];
  reassessmentQueue?: number;
  criticalEmsInbound?: CapacityCrisisEmsInbound[];
}): CapacityCrisisFactor[] {
  const capacity = input.capacity;
  const patients = input.patients || [];
  const rooms = input.rooms || [];
  const boardingCount = input.boardingPatients?.length ?? patients.filter(isBoardingPatient).length;
  const dischargeReadyCount =
    input.dischargeReady?.length ?? patients.filter((patient) => patient.state === PatientState.Disposition).length;
  const reassessmentQueue =
    input.reassessmentQueue ?? Math.max(numericCapacityValue(capacity, ['reassessmentDueCount', 'reassessmentDue']), 0);
  const criticalEmsCount =
    input.criticalEmsInbound?.length ?? numericCapacityValue(capacity, ['incomingEMSCriticalCount']);
  const occupancyPct = occupancyPercent(capacity, rooms);
  const { thresholds } = useEmergencyStore.getState();
  const occupancyOrangePct = thresholds.capacityOrangePct * 100;

  const fallbackFactors: CapacityCrisisFactor[] = [
    buildFactor('boarding', 'Boarding', `${boardingCount} patient${boardingCount === 1 ? '' : 's'}`, boardingCount * 8),
    buildFactor(
      'occupancy',
      'Room occupancy',
      `${Math.round(occupancyPct)}%`,
      Math.max(0, Math.round(occupancyPct - occupancyOrangePct)),
    ),
    buildFactor(
      'reassessment',
      'Reassessment queue',
      `${reassessmentQueue} patient${reassessmentQueue === 1 ? '' : 's'}`,
      reassessmentQueue > 3 ? 10 : 0,
    ),
    buildFactor(
      'discharge',
      'Disposition backlog',
      `${dischargeReadyCount} discharge-ready`,
      dischargeReadyCount * 5,
    ),
    buildFactor(
      'ems',
      'Critical EMS inbound',
      `${criticalEmsCount} inbound`,
      criticalEmsCount * 6,
    ),
  ];

  return fallbackFactors.map((factor) => mergeSnapshotDeduction(factor, capacity));
}

export function runCapacityIntelligence(): void {
  const snapshot = calculateCapacity();
  useEmergencyStore.getState().setCapacity(snapshot);
}

export function startCapacityEngine() {
  const update = () => {
    const snapshot = calculateCapacity();
    useEmergencyStore.getState().setCapacity(snapshot);
    if (snapshot.band === 'Orange' || snapshot.band === 'Red') {
      dispatchAlert({
        id: 'cap-' + Date.now(),
        severity: snapshot.band === 'Red' ? 'Critical':'Warning',
        title: 'Capacity ' + snapshot.band,
        message: `Score ${snapshot.score} — ${snapshot.band} zone`,
        source: 'capacity-engine',
      });
    }
  };
  update();
  return window.setInterval(update, 30000);
}

function crisisBand(capacity?: Pick<CapacitySnapshot, 'band' | 'riskLevel'> | null): CrisisBand | null {
  const band = capacity?.band || capacity?.riskLevel;
  return band === 'Orange' || band === 'Red' ? band : null;
}

function deriveBoardingPatients(patients: Patient[], referrals: Referral[], now: Date): CapacityCrisisBoardingPatient[] {
  return patients.filter(isBoardingPatient).map((patient) => {
    const timestamp = latestStateTimestamp(patient, PatientState.Admission);
    return {
      patient,
      name: patientDisplayName(patient),
      targetDepartment: targetDepartment(patient, referrals),
      boardingMinutes: minutesSince(timestamp.value, now),
      timestampSource: timestamp.source,
    };
  });
}

function deriveDischargeReadyPatients(patients: Patient[], now: Date): CapacityCrisisDischargePatient[] {
  return patients
    .filter((patient) => patient.state === PatientState.Disposition)
    .map((patient) => {
      const timestamp = latestStateTimestamp(patient, PatientState.Disposition);
      return {
        patient,
        name: patientDisplayName(patient),
        sinceTime: timestamp.value,
        dispositionMinutes: minutesSince(timestamp.value, now),
        timestampSource: timestamp.source,
      };
    })
    .filter((patient) => patient.dispositionMinutes > 30);
}

function isBoardingPatient(patient: Patient): boolean {
  return patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission);
}

function hasPatientFlag(patient: Patient, flag: PatientFlag): boolean {
  return patientHasFlag(patient, flag);
}

function latestStateTimestamp(patient: Patient, state: PatientState): { value: string; source: TimestampSource } {
  const timelineEvent = [...(patient.timeline || [])].reverse().find((event) => {
    const metadataToState = event.metadata?.toState;
    return event.to === state || event.toState === state || metadataToState === state || event.summary?.includes(state);
  });
  if (timelineEvent?.timestamp) return { value: timelineEvent.timestamp, source: 'timeline' };
  if (patient.lastAssessedTime) return { value: patient.lastAssessedTime, source: 'lastAssessedTime' };
  if (patient.arrivalTime) return { value: patient.arrivalTime, source: 'arrivalTime' };
  return { value: new Date(0).toISOString(), source: 'unknown' };
}

function patientDisplayName(patient: Patient): string {
  return patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.id;
}

function targetDepartment(patient: Patient, referrals: Referral[]): string {
  return (
    patient.referral?.targetDepartment ||
    patient.referral?.service ||
    referrals.find((referral) => referral.patientId === patient.id)?.targetDepartment ||
    referrals.find((referral) => referral.patientId === patient.id)?.service ||
    'Admitting team'
  );
}

function minutesSince(timestamp: string, now: Date): number {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function deriveCriticalEmsInbound(
  emsArrivals: Array<Partial<EMSArrival> & Record<string, unknown>>,
  emsIncomingPatients: Array<Record<string, unknown>>,
): CapacityCrisisEmsInbound[] {
  const arrivals = emsArrivals
    .filter((arrival) => isActiveCriticalEms(arrival))
    .map((arrival) => ({
      id: String(arrival.id || arrival.unitId || `ems-${arrival.unitName || arrival.unitNumber || 'arrival'}`),
      label: String(arrival.unitName || arrival.unitNumber || arrival.id || 'EMS inbound'),
      etaMinutes: numberValue(arrival.eta ?? arrival.etaMinutes),
      complaint: String(arrival.chiefComplaint || arrival.prearrivalComplaint || arrival.complaint || 'Complaint unavailable'),
      severity: String(arrival.severity || arrival.priority || arrival.acuity || 'Critical'),
    }));
  const incoming = emsIncomingPatients
    .filter((arrival) => isActiveCriticalEms(arrival))
    .map((arrival, index) => ({
      id: String(arrival.id || `ems-incoming-${index}`),
      label: String(arrival.unitName || arrival.unitNumber || arrival.callSign || arrival.id || 'EMS inbound'),
      etaMinutes: numberValue(arrival.eta ?? arrival.etaMinutes ?? arrival.etaMins),
      complaint: String(arrival.chiefComplaint || arrival.prearrivalComplaint || arrival.complaint || arrival.reason || 'Complaint unavailable'),
      severity: String(arrival.severity || arrival.priority || arrival.acuity || 'Critical'),
    }));

  return [...arrivals, ...incoming].sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
}

function isActiveCriticalEms(arrival: Record<string, unknown>): boolean {
  const status = String(arrival.status || 'Inbound');
  const severity = String(arrival.severity || arrival.priority || arrival.acuity || '').toLowerCase();
  const isActive = ACTIVE_CRITICAL_EMS_STATUSES.has(status);
  const isCritical =
    severity === 'critical' ||
    severity === Priority.P1.toLowerCase() ||
    severity === 'immediate' ||
    severity === 'resuscitation';
  return isActive && isCritical;
}

function occupancyPercent(capacity: CapacitySnapshot | null | undefined, rooms: Room[]): number {
  if (rooms.length) {
    return (rooms.filter((room) => room.status === 'Occupied').length / rooms.length) * 100;
  }

  const snapshotPct = capacity?.occupancyPercent;
  if (typeof snapshotPct === 'number') return snapshotPct <= 1 ? snapshotPct * 100 : snapshotPct;

  const occupied = capacity?.occupiedRooms ?? capacity?.currentOccupancy;
  const total = capacity?.maxCapacity ?? capacity?.staffedRoomCount;
  if (typeof occupied === 'number' && typeof total === 'number' && total > 0) {
    return (occupied / total) * 100;
  }

  return 0;
}

function numericCapacityValue(capacity: CapacitySnapshot | null | undefined, keys: Array<keyof CapacitySnapshot>): number {
  for (const key of keys) {
    const value = capacity?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildFactor(
  id: CapacityCrisisFactor['id'],
  label: string,
  detail: string,
  points: number,
): CapacityCrisisFactor {
  const normalizedPoints = Math.max(0, Math.round(points));
  return {
    id,
    label,
    detail: `${label}: ${detail} (-${normalizedPoints} pts)`,
    points: normalizedPoints,
    percent: Math.min(100, Math.round((normalizedPoints / 30) * 100)),
    source: 'approximation',
  };
}

function mergeSnapshotDeduction(factor: CapacityCrisisFactor, capacity?: CapacitySnapshot | null): CapacityCrisisFactor {
  const deduction = capacity?.deductions?.find((item) =>
    `${item.id} ${item.label}`.toLowerCase().includes(factor.id === 'ems' ? 'ems' : factor.id),
  );
  if (!deduction) return factor;
  const points = Math.abs(Math.round(deduction.value));
  return {
    ...factor,
    detail: `${deduction.label} (-${points} pts)`,
    points,
    percent: Math.min(100, Math.round((points / 30) * 100)),
    source: 'snapshot',
  };
}
