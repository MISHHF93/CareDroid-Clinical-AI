import {
  PatientFlag,
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Room,
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
  admissionAlertThreshold?: number;
  prolongedStayAlertThreshold?: number;
  now?: Date;
} = {}): OperationalCommandDashboardSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const rooms = input.rooms || [];
  const capacity = input.capacity;
  const active = activePatients(patients);
  const totalPatients = capacity?.totalPatients ?? active.length;
  const waitingCount = waitingRoomCount(patients, capacity);
  const boardingCount = boardingPatients(patients, capacity, input.boardingMetrics);
  const avgWait = averageWaitMinutes(patients, now);
  const zoneOccupancy = buildZoneBedOccupancy(rooms);

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
  now?: Date;
}) {
  return buildOperationalCommandDashboardSnapshot(input);
}