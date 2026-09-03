import {
  PATIENT_JOURNEY_STATE_BY_ID,
  PATIENT_JOURNEY_STATE_IDS,
} from '../data/patientJourneyEngine';
import { dispatchAlert } from './alertEngine';
import { resolveWhatHappensNext } from '../services/whatHappensNextGuidance';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Alert,
  type CapacitySnapshot,
  type JourneyEvent,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import { hasPatientFlag } from '../utils/patientVitals';
import { longWaitStatus } from '../utils/longWaitRescue';
import { useEmergencyStore } from '../store/emergencyStore';

export type PatientJourneyStateId = (typeof PATIENT_JOURNEY_STATE_IDS)[number];

export type PatientFlowBottleneckStatus =
  | 'clear'
  | 'watch'
  | 'congestion'
  | 'overload'
  | 'handoff-delay';

export type PatientFlowDetectionType =
  | 'prolonged_waiting'
  | 'department_congestion'
  | 'department_overload'
  | 'delayed_handoff';

export type PatientFlowPatientSnapshot = Readonly<{
  patientId: string;
  patientName: string;
  mrn: string;
  priority: Priority | string;
  workflowStateId: PatientJourneyStateId;
  workflowStateLabel: string;
  clinicalState: PatientState;
  ownerRole: string;
  ownerName: string | null;
  ownerStaffId: string | null;
  waitMinutes: number;
  stageWaitMinutes: number;
  targetMinutes: number;
  bottleneckStatus: PatientFlowBottleneckStatus;
  bottleneckReason: string | null;
  predictedNextStep: string | null;
  predictedNextStepId: string | null;
  aiRecommendation: string | null;
  updatedAt: string;
}>;

export type PatientFlowDepartmentSnapshot = Readonly<{
  stageId: PatientJourneyStateId;
  stageLabel: string;
  activePatients: number;
  waitingPatients: number;
  medianWaitMinutes: number;
  targetMinutes: number;
  bottleneckStatus: PatientFlowBottleneckStatus;
  ownerRole: string;
  congested: boolean;
  overloaded: boolean;
}>;

export type PatientFlowDetection = Readonly<{
  id: string;
  type: PatientFlowDetectionType;
  severity: 'watch' | 'warning' | 'critical';
  title: string;
  message: string;
  stageId?: PatientJourneyStateId;
  stageLabel?: string;
  patientId?: string;
  ownerRole: string;
  recommendedAction: string;
}>;

export type PatientFlowAiRecommendation = Readonly<{
  id: string;
  patientId?: string;
  stageId?: PatientJourneyStateId;
  action: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}>;

export type ContinuousPatientFlowSnapshot = Readonly<{
  engineId: 'continuous-patient-flow-engine';
  generatedAt: string;
  patients: readonly PatientFlowPatientSnapshot[];
  departments: readonly PatientFlowDepartmentSnapshot[];
  detections: readonly PatientFlowDetection[];
  aiRecommendations: readonly PatientFlowAiRecommendation[];
  metrics: Readonly<{
    trackedPatients: number;
    congestedDepartments: number;
    overloadedDepartments: number;
    prolongedWaits: number;
    delayedHandoffs: number;
    activeDetections: number;
  }>;
}>;

export type ContinuousPatientFlowInput = {
  patients?: Patient[];
  staff?: Staff[];
  referrals?: Referral[];
  capacity?: CapacitySnapshot | null;
  alerts?: Alert[];
  emergencySettings?: Record<string, unknown>;
  now?: Date;
};

const FLOW_ALERT_SOURCE = 'continuous-patient-flow';
const FLOW_ALERT_DEDUPE_MINUTES = 10;

const STAGE_OWNER_ROLES: Record<PatientJourneyStateId, string> = {
  arrival: 'Registration clerk',
  registration: 'Registration clerk',
  triage: 'Triage nurse',
  waiting: 'Charge nurse',
  assessment: 'Emergency physician',
  orders: 'Emergency physician',
  results: 'Emergency physician',
  reassessment: 'Registered nurse',
  disposition: 'Patient flow coordinator',
  admission: 'Patient flow coordinator',
  discharge: 'Registered nurse',
  'follow-up': 'Care coordinator',
};

const PATIENT_STATE_TO_WORKFLOW: Partial<Record<PatientState, PatientJourneyStateId>> = {
  [PatientState.Arrival]: 'arrival',
  [PatientState.Registration]: 'registration',
  [PatientState.Triage]: 'triage',
  [PatientState.Waiting]: 'waiting',
  [PatientState.Assessment]: 'assessment',
  [PatientState.Orders]: 'orders',
  [PatientState.Results]: 'results',
  [PatientState.Disposition]: 'disposition',
  [PatientState.Admission]: 'admission',
  [PatientState.Discharge]: 'discharge',
};

const HANDOFF_PRONE_STAGES = new Set<PatientJourneyStateId>([
  'triage',
  'waiting',
  'results',
  'disposition',
  'admission',
]);

function patientDisplayName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function minutesSince(value: string | null | undefined, now: Date): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function readTimelineState(event: JourneyEvent): PatientState | null {
  const candidate =
    (event.metadata?.toState as PatientState | undefined) ||
    (event.metadata?.to as PatientState | undefined) ||
    (event.to as PatientState | undefined);
  return candidate || null;
}

export function resolveWorkflowStateForPatient(patient: Patient): PatientJourneyStateId {
  if (hasPatientFlag(patient, PatientFlag.ReassessmentDue)) return 'reassessment';
  if (
    patient.state === PatientState.Disposition &&
    hasPatientFlag(patient, PatientFlag.PendingAdmission)
  ) {
    return 'admission';
  }
  if (patient.state === PatientState.Discharge) {
    return patient.timeline?.some((event) => event.type === 'FollowUpScheduled')
      ? 'follow-up'
      : 'discharge';
  }
  return PATIENT_STATE_TO_WORKFLOW[patient.state] || 'waiting';
}

export function resolveStageEnteredAt(
  patient: Patient,
  workflowStateId: PatientJourneyStateId,
  now: Date,
): string {
  const timeline = [...(patient.timeline || [])].reverse();
  for (const event of timeline) {
    const toState = readTimelineState(event);
    if (toState && PATIENT_STATE_TO_WORKFLOW[toState] === workflowStateId) {
      return event.timestamp;
    }
  }

  if (workflowStateId === 'triage' && patient.triageTime) return patient.triageTime;
  if (workflowStateId === 'assessment' && patient.lastAssessedTime) return patient.lastAssessedTime;
  if (
    workflowStateId === 'registration' &&
    (patient as Patient & { registrationTime?: string }).registrationTime
  ) {
    return (patient as Patient & { registrationTime?: string }).registrationTime!;
  }
  return patient.arrivalTime || now.toISOString();
}

function resolveOwner(
  patient: Patient,
  workflowStateId: PatientJourneyStateId,
  staff: Staff[],
): { ownerRole: string; ownerName: string | null; ownerStaffId: string | null } {
  const defaultRole = STAGE_OWNER_ROLES[workflowStateId] || 'Charge nurse';
  if (!patient.assignedStaffId) {
    return { ownerRole: defaultRole, ownerName: null, ownerStaffId: null };
  }
  const assigned = staff.find((member) => member.id === patient.assignedStaffId);
  return {
    ownerRole: assigned?.role || defaultRole,
    ownerName: assigned?.name || null,
    ownerStaffId: patient.assignedStaffId,
  };
}

function bottleneckForPatient(
  patient: Patient,
  workflowStateId: PatientJourneyStateId,
  stageWaitMinutes: number,
  targetMinutes: number,
  ownerStaffId: string | null,
): { status: PatientFlowBottleneckStatus; reason: string | null } {
  const overTarget = Math.max(0, stageWaitMinutes - targetMinutes);
  const isHighAcuity = patient.priority === Priority.P1 || patient.priority === Priority.P2;

  if (
    HANDOFF_PRONE_STAGES.has(workflowStateId) &&
    stageWaitMinutes >= Math.max(15, targetMinutes * 0.75) &&
    !ownerStaffId
  ) {
    return {
      status: 'handoff-delay',
      reason: `${PATIENT_JOURNEY_STATE_BY_ID[workflowStateId].label} waiting ${stageWaitMinutes}m without assigned owner.`,
    };
  }

  if (
    stageWaitMinutes >= targetMinutes * 2 ||
    (isHighAcuity && stageWaitMinutes >= targetMinutes * 1.25)
  ) {
    return {
      status: 'overload',
      reason: `${PATIENT_JOURNEY_STATE_BY_ID[workflowStateId].label} exceeded operational threshold by ${overTarget}m.`,
    };
  }

  if (
    stageWaitMinutes >= targetMinutes * 1.5 ||
    (isHighAcuity && stageWaitMinutes >= targetMinutes)
  ) {
    return {
      status: 'congestion',
      reason: `${PATIENT_JOURNEY_STATE_BY_ID[workflowStateId].label} running ${overTarget}m over target.`,
    };
  }

  if (stageWaitMinutes >= targetMinutes || overTarget > 0) {
    return {
      status: 'watch',
      reason: `${PATIENT_JOURNEY_STATE_BY_ID[workflowStateId].label} approaching stage target.`,
    };
  }

  return { status: 'clear', reason: null };
}

function severityFromBottleneck(
  status: PatientFlowBottleneckStatus,
): 'watch' | 'warning' | 'critical' {
  if (status === 'overload' || status === 'handoff-delay') return 'critical';
  if (status === 'congestion') return 'warning';
  if (status === 'watch') return 'watch';
  return 'watch';
}

function detectionTypeForBottleneck(
  status: PatientFlowBottleneckStatus,
): PatientFlowDetectionType | null {
  if (status === 'handoff-delay') return 'delayed_handoff';
  if (status === 'overload') return 'department_overload';
  if (status === 'congestion') return 'department_congestion';
  if (status === 'watch') return 'prolonged_waiting';
  return null;
}

export function buildPatientFlowPatientSnapshot(
  patient: Patient,
  context: ContinuousPatientFlowInput,
): PatientFlowPatientSnapshot | null {
  const now = context.now || new Date();
  if (patient.state === PatientState.Deceased) return null;

  const workflowStateId = resolveWorkflowStateForPatient(patient);
  const workflowMeta = PATIENT_JOURNEY_STATE_BY_ID[workflowStateId];
  const stageEnteredAt = resolveStageEnteredAt(patient, workflowStateId, now);
  const stageWaitMinutes = minutesSince(stageEnteredAt, now);
  const waitMinutes = minutesSince(patient.arrivalTime, now);
  const targetMinutes = workflowMeta?.targetMinutes || 30;
  const owner = resolveOwner(patient, workflowStateId, context.staff || []);
  const bottleneck = bottleneckForPatient(
    patient,
    workflowStateId,
    stageWaitMinutes,
    targetMinutes,
    owner.ownerStaffId,
  );
  const nextStep = resolveWhatHappensNext(patient, {
    referrals: context.referrals,
    staff: context.staff,
    now,
  });

  return Object.freeze({
    patientId: patient.id,
    patientName: patientDisplayName(patient),
    mrn: patient.mrn,
    priority: patient.priority,
    workflowStateId,
    workflowStateLabel: workflowMeta?.label || workflowStateId,
    clinicalState: patient.state,
    ownerRole: owner.ownerRole,
    ownerName: owner.ownerName,
    ownerStaffId: owner.ownerStaffId,
    waitMinutes,
    stageWaitMinutes,
    targetMinutes,
    bottleneckStatus: bottleneck.status,
    bottleneckReason: bottleneck.reason,
    predictedNextStep: nextStep?.label || null,
    predictedNextStepId: nextStep?.stepId || null,
    aiRecommendation: nextStep?.guidance || null,
    updatedAt: now.toISOString(),
  });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function buildDepartmentSnapshots(
  patientSnapshots: PatientFlowPatientSnapshot[],
): PatientFlowDepartmentSnapshot[] {
  return PATIENT_JOURNEY_STATE_IDS.map((stageId) => {
    const stagePatients = patientSnapshots.filter((entry) => entry.workflowStateId === stageId);
    const waits = stagePatients.map((entry) => entry.stageWaitMinutes);
    const targetMinutes = PATIENT_JOURNEY_STATE_BY_ID[stageId]?.targetMinutes || 30;
    const medianWaitMinutes = median(waits);
    const congested =
      stagePatients.length >= 5 ||
      medianWaitMinutes > targetMinutes ||
      stagePatients.some((entry) => entry.bottleneckStatus === 'congestion');
    const overloaded =
      stagePatients.length >= 10 ||
      medianWaitMinutes > targetMinutes * 1.5 ||
      stagePatients.some(
        (entry) =>
          entry.bottleneckStatus === 'overload' || entry.bottleneckStatus === 'handoff-delay',
      );

    let bottleneckStatus: PatientFlowBottleneckStatus = 'clear';
    if (overloaded) bottleneckStatus = 'overload';
    else if (congested) bottleneckStatus = 'congestion';
    else if (medianWaitMinutes >= targetMinutes) bottleneckStatus = 'watch';

    return Object.freeze({
      stageId,
      stageLabel: PATIENT_JOURNEY_STATE_BY_ID[stageId].label,
      activePatients: stagePatients.length,
      waitingPatients: stagePatients.filter((entry) => entry.bottleneckStatus !== 'clear').length,
      medianWaitMinutes,
      targetMinutes,
      bottleneckStatus,
      ownerRole: STAGE_OWNER_ROLES[stageId],
      congested,
      overloaded,
    });
  }).filter((entry) => entry.activePatients > 0 || entry.congested || entry.overloaded);
}

function buildDetections(
  patientSnapshots: PatientFlowPatientSnapshot[],
  departments: PatientFlowDepartmentSnapshot[],
): PatientFlowDetection[] {
  const detections: PatientFlowDetection[] = [];

  for (const patient of patientSnapshots) {
    const type = detectionTypeForBottleneck(patient.bottleneckStatus);
    if (!type || patient.bottleneckStatus === 'clear') continue;
    detections.push(
      Object.freeze({
        id: `flow-${type}-${patient.patientId}`,
        type,
        severity: severityFromBottleneck(patient.bottleneckStatus),
        title: `${patient.workflowStateLabel} — ${patient.patientName}`,
        message: patient.bottleneckReason || `${patient.patientName} needs flow review.`,
        stageId: patient.workflowStateId,
        stageLabel: patient.workflowStateLabel,
        patientId: patient.patientId,
        ownerRole: patient.ownerRole,
        recommendedAction:
          patient.aiRecommendation ||
          patient.predictedNextStep ||
          `Review ${patient.workflowStateLabel.toLowerCase()} queue and assign next owner.`,
      }),
    );
  }

  for (const department of departments) {
    if (!department.congested && !department.overloaded) continue;
    detections.push(
      Object.freeze({
        id: `flow-department-${department.stageId}`,
        type: department.overloaded ? 'department_overload' : 'department_congestion',
        severity: department.overloaded ? 'critical' : 'warning',
        title: `${department.stageLabel} ${department.overloaded ? 'overload' : 'congestion'}`,
        message: `${department.activePatients} active · median ${department.medianWaitMinutes}m · target ${department.targetMinutes}m`,
        stageId: department.stageId,
        stageLabel: department.stageLabel,
        ownerRole: department.ownerRole,
        recommendedAction: `Open ${department.stageLabel.toLowerCase()} workflow and rebalance staff ownership.`,
      }),
    );
  }

  return detections.sort((left, right) => {
    const rank = { critical: 0, warning: 1, watch: 2 };
    return (rank[left.severity] ?? 9) - (rank[right.severity] ?? 9);
  });
}

function buildAiRecommendations(
  patientSnapshots: PatientFlowPatientSnapshot[],
): PatientFlowAiRecommendation[] {
  return patientSnapshots
    .filter((entry) => entry.aiRecommendation || entry.predictedNextStep)
    .sort((left, right) => {
      const rank: Record<PatientFlowBottleneckStatus, number> = {
        overload: 0,
        'handoff-delay': 1,
        congestion: 2,
        watch: 3,
        clear: 4,
      };
      return rank[left.bottleneckStatus] - rank[right.bottleneckStatus];
    })
    .slice(0, 12)
    .map((entry, index) =>
      Object.freeze({
        id: `flow-ai-${entry.patientId}-${index}`,
        patientId: entry.patientId,
        stageId: entry.workflowStateId,
        action: entry.predictedNextStep || 'Review patient workflow',
        rationale:
          entry.aiRecommendation ||
          entry.bottleneckReason ||
          'Continuous flow monitoring flagged this patient.',
        priority:
          entry.bottleneckStatus === 'overload' || entry.bottleneckStatus === 'handoff-delay'
            ? 'high'
            : entry.bottleneckStatus === 'congestion'
              ? 'medium'
              : 'low',
      }),
    );
}

export function buildContinuousPatientFlowSnapshot(
  input: ContinuousPatientFlowInput = {},
): ContinuousPatientFlowSnapshot {
  const now = input.now || new Date();
  const activePatients = (input.patients || []).filter(
    (patient) =>
      patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );
  const patientSnapshots = activePatients
    .map((patient) => buildPatientFlowPatientSnapshot(patient, { ...input, now }))
    .filter((entry): entry is PatientFlowPatientSnapshot => Boolean(entry));
  const departments = buildDepartmentSnapshots(patientSnapshots);
  const detections = buildDetections(patientSnapshots, departments);
  const aiRecommendations = buildAiRecommendations(patientSnapshots);

  return Object.freeze({
    engineId: 'continuous-patient-flow-engine',
    generatedAt: now.toISOString(),
    patients: Object.freeze(patientSnapshots),
    departments: Object.freeze(departments),
    detections: Object.freeze(detections),
    aiRecommendations: Object.freeze(aiRecommendations),
    metrics: Object.freeze({
      trackedPatients: patientSnapshots.length,
      congestedDepartments: departments.filter((entry) => entry.congested).length,
      overloadedDepartments: departments.filter((entry) => entry.overloaded).length,
      prolongedWaits: detections.filter((entry) => entry.type === 'prolonged_waiting').length,
      delayedHandoffs: detections.filter((entry) => entry.type === 'delayed_handoff').length,
      activeDetections: detections.length,
    }),
  });
}

export function flowAlertBucket(
  waitMins: number,
  intervalMinutes = FLOW_ALERT_DEDUPE_MINUTES,
): number {
  return Math.floor(Math.max(0, waitMins) / intervalMinutes);
}

function hasFlowAlertForDetection(alerts: Alert[], detectionId: string, bucket: number): boolean {
  return alerts.some(
    (alert) =>
      !alert.dismissed &&
      alert.source === FLOW_ALERT_SOURCE &&
      alert.metadata?.detectionId === detectionId &&
      alert.metadata?.dedupeBucket === bucket,
  );
}

function notifyDetections(
  snapshot: ContinuousPatientFlowSnapshot,
  patients: Patient[],
  alerts: Alert[],
  emergencySettings: Record<string, unknown> | undefined,
  now: Date,
): void {
  for (const detection of snapshot.detections) {
    if (detection.severity === 'watch') continue;
    const bucket = flowAlertBucket(now.getTime() / 60000);
    if (hasFlowAlertForDetection(alerts, detection.id, bucket)) continue;

    dispatchAlert({
      id: `flow-alert-${detection.id}-${bucket}`,
      type: 'Queue',
      severity: detection.severity === 'critical' ? 'Critical' : 'Warning',
      title: detection.title,
      message: detection.message,
      patientId: detection.patientId,
      source: FLOW_ALERT_SOURCE,
      metadata: {
        detectionId: detection.id,
        detectionType: detection.type,
        dedupeBucket: bucket,
        ownerRole: detection.ownerRole,
        recommendedAction: detection.recommendedAction,
      },
    });
  }

  for (const patient of patients) {
    if (patient.state !== PatientState.Waiting) continue;
    const status = longWaitStatus(patient, now, emergencySettings);
    if (status.phase === 'none') continue;
    const bucket = flowAlertBucket(status.waitMinutesExact);
    const detectionId = `long-wait-flow-${patient.id}`;
    if (hasFlowAlertForDetection(alerts, detectionId, bucket)) continue;
    if (
      status.phase === 'warning' &&
      snapshot.patients.some(
        (entry) => entry.patientId === patient.id && entry.bottleneckStatus !== 'clear',
      )
    ) {
      continue;
    }
    dispatchAlert({
      id: `flow-long-wait-${patient.id}-${bucket}`,
      type: 'Queue',
      severity: status.phase === 'critical' || status.phase === 'lwbs' ? 'Critical' : 'Warning',
      title: `Flow wait — ${patientDisplayName(patient)}`,
      message: `${Math.round(status.waitMinutesExact)}m wait in ${patient.state}. Target ${status.thresholdMinutes}m.`,
      patientId: patient.id,
      source: FLOW_ALERT_SOURCE,
      metadata: {
        detectionId,
        detectionType: 'prolonged_waiting',
        dedupeBucket: bucket,
        longWaitPhase: status.phase,
      },
    });
  }
}

export function runContinuousPatientFlowTick(now = new Date()): ContinuousPatientFlowSnapshot {
  const {
    patients,
    staff,
    referrals,
    capacity,
    alerts,
    emergencySettings,
    setPatientFlowSnapshot,
  } = useEmergencyStore.getState();

  const snapshot = buildContinuousPatientFlowSnapshot({
    patients,
    staff,
    referrals,
    capacity,
    alerts,
    emergencySettings,
    now,
  });

  setPatientFlowSnapshot(snapshot);
  notifyDetections(snapshot, patients, alerts, emergencySettings, now);
  return snapshot;
}

export function startContinuousPatientFlowEngine(intervalMs = 30_000): number {
  runContinuousPatientFlowTick();
  return window.setInterval(() => runContinuousPatientFlowTick(), intervalMs);
}
