import {
  PatientFlag,
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Room,
  type Staff,
} from '../types/emergency';
import type { EmergencyBoardingMetrics } from '../store/emergencyStore';
import { waitMinutesForWhiteboard } from '../utils/emergencyWhiteboardSorting';
import { formatDepartmentDuration } from '../components/whiteboard/departmentStatusScreenModel';
import {
  ADMISSION_PROBABILITY_ALERT_THRESHOLD,
  scanPatientsForAdmissionAlerts,
  type PatientAdmissionAssessment,
} from './predictiveAdmissionModel';
import {
  scanEmsArrivalsForActivations,
  type PreArrivalActivationAlert,
} from './preArrivalActivationRules';
import { scanProlongedStayAlerts } from './nativeAiCore';
import { predictPostEdOrientation } from './nativeAiCore';

export type OperationalDashboardTone = 'green' | 'amber' | 'red';

export type OperationalDashboardMetricId =
  | 'total-patients'
  | 'waiting-room-count'
  | 'doctors-on-duty'
  | 'nurses-available'
  | 'beds-available'
  | 'critical-patients'
  | 'admissions-today'
  | 'discharges-today'
  | 'average-triage-time'
  | 'er-occupancy'
  | 'boarding-patients'
  | 'average-wait-time'
  | 'pending-bed-assignment';

export type OperationalDashboardMetric = {
  id: OperationalDashboardMetricId;
  label: string;
  value: string | number;
  tone: OperationalDashboardTone;
  detail: string;
  thresholdLabel: string;
};

export type ZoneBedOccupancy = {
  zoneId: string;
  zoneLabel: string;
  occupied: number;
  total: number;
  occupancyPercent: number;
  tone: OperationalDashboardTone;
};

export type PredictiveBedAssignmentAlert = {
  patientId: string;
  patientLabel: string;
  probabilityPercent: number;
  admitScore: number;
  action: string;
};

export type ProlongedStayAlert = {
  patientId: string;
  patientLabel: string;
  probabilityPercent: number;
  predictedHours: number;
  action: string;
};

export type OrientationPredictionAlert = {
  patientId: string;
  patientLabel: string;
  orientation: 'admit' | 'edou' | 'discharge';
  probabilityPercent: number;
};

export type OperationalCommandDashboardSnapshot = {
  metrics: OperationalDashboardMetric[];
  zoneOccupancy: ZoneBedOccupancy[];
  bottleneckLabel: string;
  summaryLine: string;
  updatedAt: string;
  pendingBedAssignments: PredictiveBedAssignmentAlert[];
  prolongedStayAlerts: ProlongedStayAlert[];
  orientationPredictions: OrientationPredictionAlert[];
  chargeNurseAlerts: string[];
  resourceActivations: PreArrivalActivationAlert[];
};

function toneForPendingBedAssignment(count: number): OperationalDashboardTone {
  if (count >= 4) return 'red';
  if (count >= 2) return 'amber';
  return count > 0 ? 'amber' : 'green';
}

function toPredictiveBedAlerts(assessments: PatientAdmissionAssessment[]): PredictiveBedAssignmentAlert[] {
  return assessments.map((assessment) => ({
    patientId: assessment.patientId,
    patientLabel: assessment.patientLabel,
    probabilityPercent: assessment.probabilityPercent,
    admitScore: assessment.admitScore,
    action: 'Pending bed assignment — notify charge nurse and bed management.',
  }));
}

type ZoneBucket = {
  zoneId: string;
  zoneLabel: string;
  occupied: number;
  total: number;
};

const ZONE_ORDER = ['resus', 'treatment', 'isolation', 'waiting'] as const;

function activePatients(patients: Patient[]): Patient[] {
  return patients.filter(
    (patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );
}

function boardingPatients(
  patients: Patient[],
  capacity?: CapacitySnapshot,
  boardingMetrics?: EmergencyBoardingMetrics,
): number {
  if (boardingMetrics?.patientsBoarding?.length) {
    return boardingMetrics.patientsBoarding.length;
  }
  if (capacity?.boardingCount != null) {
    return capacity.boardingCount;
  }
  return patients.filter(
    (patient) =>
      patient.state === PatientState.Admission ||
      patient.state === PatientState.Disposition ||
      patient.flags.includes(PatientFlag.PendingAdmission),
  ).length;
}

function waitingRoomCount(patients: Patient[], capacity?: CapacitySnapshot): number {
  if (capacity?.waitingCount != null) {
    return capacity.waitingCount;
  }
  return patients.filter((patient) => patient.state === PatientState.Waiting).length;
}

function averageWaitMinutes(patients: Patient[], now: Date): number | null {
  const waitingCandidates = activePatients(patients).filter(
    (patient) =>
      patient.state === PatientState.Waiting ||
      patient.state === PatientState.Triage ||
      patient.state === PatientState.Registration,
  );

  if (!waitingCandidates.length) return null;

  const values = waitingCandidates
    .map((patient) => waitMinutesForWhiteboard(patient, now.getTime()))
    .filter((minutes) => minutes >= 0);

  if (!values.length) return null;
  return Math.round(values.reduce((sum, minutes) => sum + minutes, 0) / values.length);
}

function minutesBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return Math.round((endTime - startTime) / 60000);
}

function averageTriageMinutes(patients: Patient[]): number | null {
  const completed = patients
    .map((patient) => minutesBetween(patient.arrivalTime, patient.triageTime))
    .filter((minutes): minutes is number => minutes != null && minutes >= 0);

  if (!completed.length) return null;
  return Math.round(completed.reduce((sum, minutes) => sum + minutes, 0) / completed.length);
}

function countTodayByState(patients: Patient[], state: PatientState, now: Date): number {
  const dayKey = now.toISOString().slice(0, 10);
  return patients.filter((patient) => {
    if (patient.state !== state) return false;
    const referenceTime =
      patient.updatedAt ||
      patient.lastAssessedTime ||
      patient.arrivalTime;
    return Boolean(referenceTime && referenceTime.slice(0, 10) === dayKey);
  }).length;
}

function criticalPatientCount(patients: Patient[], capacity?: CapacitySnapshot): number {
  const activeCritical = activePatients(patients).filter(
    (patient) =>
      patient.priority === 'P1' ||
      patient.priority === 'P2' ||
      patient.flags.includes(PatientFlag.SepsisAlert) ||
      patient.flags.includes(PatientFlag.StrokeCode) ||
      patient.flags.includes(PatientFlag.HighRisk),
  ).length;

  return activeCritical + (capacity?.incomingEMSCriticalCount ?? 0);
}

function countAvailableStaff(staff: Staff[], roles: string[]): number {
  const roleSet = new Set(roles.map((role) => role.toLowerCase()));
  return staff.filter(
    (member) =>
      member.active &&
      (member.status == null || member.status === 'OnShift') &&
      roleSet.has(String(member.role).toLowerCase()),
  ).length;
}

function toneForTotalPatients(count: number): OperationalDashboardTone {
  if (count >= 45) return 'red';
  if (count >= 30) return 'amber';
  return 'green';
}

function toneForWaitingRoom(count: number): OperationalDashboardTone {
  if (count >= 15) return 'red';
  if (count >= 8) return 'amber';
  return 'green';
}

function toneForBoarding(count: number): OperationalDashboardTone {
  if (count >= 6) return 'red';
  if (count >= 3) return 'amber';
  return 'green';
}

function toneForAverageWait(minutes: number | null): OperationalDashboardTone {
  if (minutes == null) return 'green';
  if (minutes >= 90) return 'red';
  if (minutes >= 45) return 'amber';
  return 'green';
}

function toneForDoctorCoverage(count: number, activePatientCount: number): OperationalDashboardTone {
  if (count === 0 && activePatientCount > 0) return 'red';
  if (activePatientCount >= 30 && count < 3) return 'amber';
  return 'green';
}

function toneForNurseCoverage(count: number, activePatientCount: number): OperationalDashboardTone {
  if (count === 0 && activePatientCount > 0) return 'red';
  if (activePatientCount >= 30 && count < 6) return 'amber';
  return 'green';
}

function toneForBedsAvailable(count: number): OperationalDashboardTone {
  if (count <= 0) return 'red';
  if (count <= 4) return 'amber';
  return 'green';
}

function toneForCriticalPatients(count: number): OperationalDashboardTone {
  if (count >= 6) return 'red';
  if (count >= 3) return 'amber';
  return 'green';
}

function toneForAverageTriage(minutes: number | null): OperationalDashboardTone {
  if (minutes == null) return 'green';
  if (minutes >= 20) return 'red';
  if (minutes >= 12) return 'amber';
  return 'green';
}

function toneForErOccupancy(percent: number | null): OperationalDashboardTone {
  if (percent == null) return 'green';
  if (percent >= 95) return 'red';
  if (percent >= 85) return 'amber';
  return 'green';
}

function toneForOccupancyRatio(ratio: number): OperationalDashboardTone {
  if (ratio >= 0.9) return 'red';
  if (ratio >= 0.75) return 'amber';
  return 'green';
}

function zoneBucketForRoom(room: Room): ZoneBucket {
  const type = String(room.type || '').toLowerCase();
  if (type.includes('resus')) {
    return { zoneId: 'resus', zoneLabel: 'Resus', occupied: 0, total: 0 };
  }
  if (type.includes('isol')) {
    return { zoneId: 'isolation', zoneLabel: 'Isolation', occupied: 0, total: 0 };
  }
  if (type.includes('wait')) {
    return { zoneId: 'waiting', zoneLabel: 'Waiting room', occupied: 0, total: 0 };
  }
  return { zoneId: 'treatment', zoneLabel: 'Treatment', occupied: 0, total: 0 };
}

function isRoomOccupied(room: Room): boolean {
  return room.status === 'Occupied' || Boolean(room.patientId || room.currentPatientId);
}

export function buildZoneBedOccupancy(rooms: Room[] = []): ZoneBedOccupancy[] {
  const buckets = new Map<string, ZoneBucket>();

  for (const room of rooms) {
    const bucket = zoneBucketForRoom(room);
    const current = buckets.get(bucket.zoneId) || bucket;
    current.total += 1;
    if (isRoomOccupied(room)) current.occupied += 1;
    buckets.set(bucket.zoneId, current);
  }

  return ZONE_ORDER.filter((zoneId) => buckets.has(zoneId)).map((zoneId) => {
    const entry = buckets.get(zoneId)!;
    const ratio = entry.total ? entry.occupied / entry.total : 0;
    return {
      zoneId: entry.zoneId,
      zoneLabel: entry.zoneLabel,
      occupied: entry.occupied,
      total: entry.total,
      occupancyPercent: entry.total ? Math.round(ratio * 100) : 0,
      tone: toneForOccupancyRatio(ratio),
    };
  });
}

function buildBottleneckLabel(input: {
  waitingRoomCount: number;
  boardingCount: number;
  averageWaitMinutes: number | null;
  zoneOccupancy: ZoneBedOccupancy[];
}): string {
  const saturatedZone = input.zoneOccupancy.find((zone) => zone.tone === 'red');
  if (saturatedZone) {
    return `${saturatedZone.zoneLabel} beds at ${saturatedZone.occupancyPercent}% occupancy`;
  }
  if (input.boardingCount >= 5) return 'Inpatient boarding is slowing ED throughput';
  if (input.waitingRoomCount >= 12) return 'Provider queue bottleneck in the waiting room';
  if ((input.averageWaitMinutes ?? 0) >= 60) return 'Average wait time exceeds one hour';
  return 'Department flow within green thresholds';
}

export function buildOperationalCommandDashboardSnapshot(input: {
  patients?: Patient[];
  rooms?: Room[];
  capacity?: CapacitySnapshot;
  boardingMetrics?: EmergencyBoardingMetrics;
  emsArrivals?: EMSArrival[];
  staff?: Staff[];
  admissionAlertThreshold?: number;
  prolongedStayAlertThreshold?: number;
  now?: Date;
} = {}): OperationalCommandDashboardSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const rooms = input.rooms || [];
  const capacity = input.capacity;
  const staff = input.staff || [];
  const active = activePatients(patients);
  const totalPatients = capacity?.totalPatients ?? active.length;
  const waitingCount = waitingRoomCount(patients, capacity);
  const boardingCount = boardingPatients(patients, capacity, input.boardingMetrics);
  const avgWait = averageWaitMinutes(patients, now);
  const avgTriage = averageTriageMinutes(patients);
  const zoneOccupancy = buildZoneBedOccupancy(rooms);
  const occupiedRooms = capacity?.occupiedRooms ?? rooms.filter(isRoomOccupied).length;
  const maxCapacity = capacity?.maxCapacity ?? rooms.length;
  const availableBeds = capacity?.availableRoomCount ?? Math.max(0, maxCapacity - occupiedRooms);
  const erOccupancyPercent =
    capacity?.occupancyPercent ??
    (maxCapacity > 0 ? Math.round(((capacity?.currentOccupancy ?? occupiedRooms) / maxCapacity) * 100) : null);
  const doctorsOnDuty = countAvailableStaff(staff, ['MD', 'Attending', 'Resident', 'PA']);
  const nursesAvailable = countAvailableStaff(staff, ['RN', 'Nurse', 'TriageNurse', 'ChargeNurse', 'Charge']);
  const criticalCount = criticalPatientCount(patients, capacity);
  const admissionsToday =
    capacity?.admissionPendingCount ?? countTodayByState(patients, PatientState.Admission, now);
  const dischargesToday =
    capacity?.dischargesPast60Minutes != null || capacity?.dischargeReadyCount != null
      ? (capacity?.dischargesPast60Minutes ?? 0) + (capacity?.dischargeReadyCount ?? 0)
      : countTodayByState(patients, PatientState.Discharge, now);

  const admissionThreshold = input.admissionAlertThreshold ?? ADMISSION_PROBABILITY_ALERT_THRESHOLD;
  const elevatedAdmissions = scanPatientsForAdmissionAlerts(patients, {
    alertThreshold: admissionThreshold,
  });
  const pendingBedAssignments = toPredictiveBedAlerts(elevatedAdmissions);
  const prolongedStayThreshold = input.prolongedStayAlertThreshold;
  const prolongedStayAlerts = scanProlongedStayAlerts(patients, {
    alertThreshold: prolongedStayThreshold,
    now: now.getTime(),
  }).map(
    (prediction) => {
      const patient = patients.find((entry) => entry.id === prediction.patientId);
      return {
        patientId: prediction.patientId,
        patientLabel:
          `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || patient?.mrn || prediction.patientId,
        probabilityPercent: prediction.probabilityPercent,
        predictedHours: prediction.predictedHours,
        action: 'Prolonged ED stay risk — initiate bed cleaning / assignment workflow.',
      };
    },
  );
  const orientationPredictions = active
    .map((patient) => {
      const prediction = predictPostEdOrientation(patient);
      const topProbability = prediction.probabilities[prediction.orientation];
      if (topProbability < 50) return null;
      return {
        patientId: patient.id,
        patientLabel: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn,
        orientation: prediction.orientation,
        probabilityPercent: topProbability,
      };
    })
    .filter((entry): entry is OrientationPredictionAlert => Boolean(entry))
    .slice(0, 8);
  const resourceActivations = scanEmsArrivalsForActivations(input.emsArrivals || []);
  const chargeNurseAlerts = [
    ...pendingBedAssignments.map(
      (alert) =>
        `${alert.patientLabel}: admission probability ${alert.probabilityPercent}% — pending bed assignment`,
    ),
    ...prolongedStayAlerts.map(
      (alert) =>
        `${alert.patientLabel}: prolonged stay risk ${alert.probabilityPercent}% (~${alert.predictedHours}h)`,
    ),
    ...orientationPredictions
      .filter((entry) => entry.orientation === 'admit')
      .map(
        (entry) =>
          `${entry.patientLabel}: predicted post-ED orientation Admit (${entry.probabilityPercent}%)`,
      ),
    ...resourceActivations.map((activation) => `${activation.title}: ${activation.summary}`),
  ];

  const metrics: OperationalDashboardMetric[] = [
    {
      id: 'total-patients',
      label: 'Total patients',
      value: totalPatients,
      tone: toneForTotalPatients(totalPatients),
      detail: `${active.length} active on the whiteboard`,
      thresholdLabel: 'Green <30 · Amber 30-44 · Red ≥45',
    },
    {
      id: 'waiting-room-count',
      label: 'Waiting room',
      value: waitingCount,
      tone: toneForWaitingRoom(waitingCount),
      detail: 'Patients in the waiting-room queue',
      thresholdLabel: 'Green <8 · Amber 8-14 · Red ≥15',
    },
    {
      id: 'doctors-on-duty',
      label: 'Doctors on duty',
      value: doctorsOnDuty,
      tone: toneForDoctorCoverage(doctorsOnDuty, active.length),
      detail: 'Active physicians, residents, and PAs on the current shift',
      thresholdLabel: 'Amber when high census has <3 providers',
    },
    {
      id: 'nurses-available',
      label: 'Nurses available',
      value: nursesAvailable,
      tone: toneForNurseCoverage(nursesAvailable, active.length),
      detail: 'Active RN, triage, and charge coverage',
      thresholdLabel: 'Amber when high census has <6 nurses',
    },
    {
      id: 'beds-available',
      label: 'Beds available',
      value: availableBeds,
      tone: toneForBedsAvailable(availableBeds),
      detail: 'Open treatment spaces available for placement',
      thresholdLabel: 'Green >4 · Amber 1-4 · Red 0',
    },
    {
      id: 'critical-patients',
      label: 'Critical patients',
      value: criticalCount,
      tone: toneForCriticalPatients(criticalCount),
      detail: 'P1/P2, high-risk, sepsis, stroke, and critical EMS load',
      thresholdLabel: 'Green <3 · Amber 3-5 · Red ≥6',
    },
    {
      id: 'admissions-today',
      label: 'Admissions today',
      value: admissionsToday,
      tone: toneForPendingBedAssignment(admissionsToday),
      detail: 'Patients requiring inpatient admission or pending admission',
      thresholdLabel: 'Green 0 · Amber 1-3 · Red ≥4',
    },
    {
      id: 'discharges-today',
      label: 'Discharges today',
      value: dischargesToday,
      tone: dischargesToday > 0 ? 'green' : 'amber',
      detail: 'Recent discharges plus patients ready to leave the ED',
      thresholdLabel: 'Green when discharge movement is active',
    },
    {
      id: 'average-triage-time',
      label: 'Average triage time',
      value: avgTriage != null ? formatDepartmentDuration(avgTriage) : '—',
      tone: toneForAverageTriage(avgTriage),
      detail: 'Average door-to-triage time for completed triage events',
      thresholdLabel: 'Green <12m · Amber 12-19m · Red ≥20m',
    },
    {
      id: 'er-occupancy',
      label: 'ER occupancy',
      value: erOccupancyPercent != null ? `${erOccupancyPercent}%` : '—',
      tone: toneForErOccupancy(erOccupancyPercent),
      detail: 'Occupied treatment capacity across configured ED rooms',
      thresholdLabel: 'Green <85% · Amber 85-94% · Red ≥95%',
    },
    {
      id: 'boarding-patients',
      label: 'Boarding patients',
      value: boardingCount,
      tone: toneForBoarding(boardingCount),
      detail: 'Admission / disposition patients holding ED beds',
      thresholdLabel: 'Green <3 · Amber 3-5 · Red ≥6',
    },
    {
      id: 'average-wait-time',
      label: 'Average wait time',
      value: avgWait != null ? formatDepartmentDuration(avgWait) : '—',
      tone: toneForAverageWait(avgWait),
      detail: 'Mean elapsed time since arrival for waiting and pre-provider patients',
      thresholdLabel: 'Green <45m · Amber 45-89m · Red ≥90m',
    },
    {
      id: 'pending-bed-assignment',
      label: 'Pending bed assignment',
      value: pendingBedAssignments.length,
      tone: toneForPendingBedAssignment(pendingBedAssignments.length),
      detail: `Patients with admission probability ≥${admissionThreshold}%`,
      thresholdLabel: 'Green 0 · Amber 1-3 · Red ≥4',
    },
  ];

  const bottleneckLabel = buildBottleneckLabel({
    waitingRoomCount: waitingCount,
    boardingCount,
    averageWaitMinutes: avgWait,
    zoneOccupancy,
  });

  return {
    metrics,
    zoneOccupancy,
    bottleneckLabel,
    summaryLine: [
      `${totalPatients} total`,
      `${waitingCount} waiting`,
      `${boardingCount} boarding`,
      `${availableBeds} beds available`,
      pendingBedAssignments.length
        ? `${pendingBedAssignments.length} pending bed assignment`
        : null,
      avgWait != null ? `${avgWait}m avg wait` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    updatedAt: capacity?.updatedAt || now.toISOString(),
    pendingBedAssignments,
    prolongedStayAlerts,
    orientationPredictions,
    chargeNurseAlerts,
    resourceActivations,
  };
}

export function mapOperationalDashboardPatients(input: {
  patients: Patient[];
  rooms: Room[];
  capacity: CapacitySnapshot;
  boardingMetrics?: EmergencyBoardingMetrics;
  staff?: Staff[];
  now?: Date;
}) {
  return buildOperationalCommandDashboardSnapshot(input);
}
