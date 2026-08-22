import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
  ReviewAdministrativeAutomationInput,
} from '../../../../src/types/administrativeAutomation';
import {
  PatientFlag,
  PatientState,
  Priority,
  type CapacitySnapshot,
  type Patient,
  type Referral,
  type Staff,
} from '../../../../src/types/emergency';

const SAFETY_STATEMENT =
  'Administrative automations are advisory until a licensed clinician approves, modifies, or overrides each task. All actions are audit-logged.';

const STAGE_OWNER_ROLES: Record<string, string> = {
  arrival: 'Registration clerk',
  registration: 'Registration clerk',
  triage: 'Triage nurse',
  waiting: 'Charge nurse',
  assessment: 'Emergency physician',
  orders: 'Emergency physician',
  results: 'Emergency physician',
  reassessment: 'Registered nurse',
  disposition: 'Charge nurse',
  admission: 'Bed coordinator',
  discharge: 'Discharge nurse',
  'follow-up': 'Care coordinator',
};

const PATIENT_STATE_TO_WORKFLOW: Partial<Record<PatientState, string>> = {
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

const STAGE_TARGETS: Record<string, number> = {
  arrival: 5,
  registration: 10,
  triage: 15,
  waiting: 30,
  assessment: 45,
  orders: 30,
  results: 60,
  reassessment: 30,
  disposition: 45,
  admission: 60,
  discharge: 45,
  'follow-up': 120,
};

export type BackendPatientFlowSnapshot = Readonly<{
  engineId: 'continuous-patient-flow-engine';
  generatedAt: string;
  patients: readonly Record<string, unknown>[];
  departments: readonly Record<string, unknown>[];
  detections: readonly Record<string, unknown>[];
  aiRecommendations: readonly Record<string, unknown>[];
  metrics: Readonly<{
    trackedPatients: number;
    congestedDepartments: number;
    overloadedDepartments: number;
    prolongedWaits: number;
    delayedHandoffs: number;
    activeDetections: number;
  }>;
}>;

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as { type?: string })?.type === flag,
  );
}

function minutesSince(iso: string | undefined, now: Date): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
}

function resolveWorkflowState(patient: Patient): string {
  if (hasFlag(patient, PatientFlag.ReassessmentDue)) return 'reassessment';
  if (
    patient.state === PatientState.Disposition &&
    hasFlag(patient, PatientFlag.PendingAdmission)
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

function bottleneckStatus(
  stageWaitMinutes: number,
  targetMinutes: number,
  priority: Priority,
): string {
  const isHighAcuity = priority === Priority.P1 || priority === Priority.P2;
  if (
    stageWaitMinutes >= targetMinutes * 2 ||
    (isHighAcuity && stageWaitMinutes >= targetMinutes * 1.25)
  ) {
    return 'overload';
  }
  if (
    stageWaitMinutes >= targetMinutes * 1.5 ||
    (isHighAcuity && stageWaitMinutes >= targetMinutes)
  ) {
    return 'congestion';
  }
  if (stageWaitMinutes >= targetMinutes) return 'watch';
  return 'clear';
}

export function buildBackendPatientFlowSnapshot(
  input: {
    patients?: Patient[];
    staff?: Staff[];
    referrals?: Referral[];
    capacity?: CapacitySnapshot | null;
    now?: Date;
  } = {},
): BackendPatientFlowSnapshot {
  const now = input.now || new Date();
  const staff = input.staff || [];
  const activePatients = (input.patients || []).filter(
    (patient) =>
      patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );

  const patients = activePatients.map((patient) => {
    const workflowStateId = resolveWorkflowState(patient);
    const targetMinutes = STAGE_TARGETS[workflowStateId] || 30;
    const stageWaitMinutes = minutesSince(patient.arrivalTime, now);
    const assigned = staff.find((member) => member.id === patient.assignedStaffId);
    const status = bottleneckStatus(stageWaitMinutes, targetMinutes, patient.priority);

    return Object.freeze({
      patientId: patient.id,
      patientName: patientName(patient),
      mrn: patient.mrn,
      priority: patient.priority,
      workflowStateId,
      workflowStateLabel: workflowStateId.replace(/-/g, ' '),
      clinicalState: patient.state,
      ownerRole: assigned?.role || STAGE_OWNER_ROLES[workflowStateId] || 'Charge nurse',
      ownerName: assigned?.name || null,
      ownerStaffId: patient.assignedStaffId || null,
      waitMinutes: stageWaitMinutes,
      stageWaitMinutes,
      targetMinutes,
      bottleneckStatus: status,
      bottleneckReason:
        status === 'clear'
          ? null
          : `${workflowStateId} running ${Math.max(0, stageWaitMinutes - targetMinutes)}m over target.`,
      predictedNextStep: null,
      predictedNextStepId: null,
      aiRecommendation: null,
      updatedAt: now.toISOString(),
    });
  });

  const detections = patients
    .filter((entry) => entry.bottleneckStatus !== 'clear')
    .map((entry) =>
      Object.freeze({
        id: `flow-${entry.bottleneckStatus}-${entry.patientId}`,
        type: entry.bottleneckStatus === 'overload' ? 'department_overload' : 'prolonged_waiting',
        severity: entry.bottleneckStatus === 'overload' ? 'critical' : 'warning',
        title: `${entry.workflowStateLabel} — ${entry.patientName}`,
        message: entry.bottleneckReason || `${entry.patientName} needs flow review.`,
        stageId: entry.workflowStateId,
        stageLabel: entry.workflowStateLabel,
        patientId: entry.patientId,
        ownerRole: entry.ownerRole,
        recommendedAction: 'Review patient workflow and assign accountable owner.',
      }),
    );

  const departmentMap = new Map<string, { count: number; waits: number[] }>();
  for (const entry of patients) {
    const bucket = departmentMap.get(entry.workflowStateId) || { count: 0, waits: [] };
    bucket.count += 1;
    bucket.waits.push(entry.stageWaitMinutes);
    departmentMap.set(entry.workflowStateId, bucket);
  }

  const departments = [...departmentMap.entries()].map(([stageId, bucket]) => {
    const targetMinutes = STAGE_TARGETS[stageId] || 30;
    const medianWaitMinutes = bucket.waits.length
      ? Math.round(bucket.waits.sort((a, b) => a - b)[Math.floor(bucket.waits.length / 2)])
      : 0;
    const congested = bucket.count >= 5 || medianWaitMinutes > targetMinutes;
    const overloaded = bucket.count >= 10 || medianWaitMinutes > targetMinutes * 1.5;
    return Object.freeze({
      stageId,
      stageLabel: stageId.replace(/-/g, ' '),
      activePatients: bucket.count,
      waitingPatients: bucket.count,
      medianWaitMinutes,
      targetMinutes,
      bottleneckStatus: overloaded ? 'overload' : congested ? 'congestion' : 'clear',
      ownerRole: STAGE_OWNER_ROLES[stageId] || 'Charge nurse',
      congested,
      overloaded,
    });
  });

  return Object.freeze({
    engineId: 'continuous-patient-flow-engine',
    generatedAt: now.toISOString(),
    patients: Object.freeze(patients),
    departments: Object.freeze(departments),
    detections: Object.freeze(detections),
    aiRecommendations: Object.freeze([]),
    metrics: Object.freeze({
      trackedPatients: patients.length,
      congestedDepartments: departments.filter((entry) => entry.congested).length,
      overloadedDepartments: departments.filter((entry) => entry.overloaded).length,
      prolongedWaits: detections.filter((entry) => entry.type === 'prolonged_waiting').length,
      delayedHandoffs: 0,
      activeDetections: detections.length,
    }),
  });
}

function makeTask(
  partial: Omit<AdministrativeAutomationTask, 'humanReviewRequired' | 'aiGenerated'> & {
    aiGenerated?: boolean;
  },
): AdministrativeAutomationTask {
  return Object.freeze({
    // Deterministic-rule generator, no AI call anywhere in this file --
    // see the identical fix in administrative-automation-orchestration.lib.ts.
    aiGenerated: partial.aiGenerated ?? false,
    humanReviewRequired: true as const,
    automationId: partial.automationId,
    route: partial.route || '/emergency/command-center',
    ...partial,
  });
}

function buildRoutingTasks(patients: Patient[], now: string): AdministrativeAutomationTask[] {
  const tasks: AdministrativeAutomationTask[] = [];
  for (const patient of patients) {
    if (patient.state === PatientState.Registration || patient.state === PatientState.Arrival) {
      tasks.push(
        makeTask({
          id: `auto-route-${patient.id}`,
          category: 'patient_routing',
          status: 'pending_review',
          patientId: patient.id,
          patientName: patientName(patient),
          title: `Route ${patientName(patient)} to triage`,
          summary: 'Registration complete — automated routing recommends triage queue placement.',
          proposedAction: 'Move patient to triage queue and notify triage nurse.',
          proposedPayload: { targetState: PatientState.Triage, queue: 'pretriage' },
          ownerRole: 'triage_nurse',
          priority:
            patient.priority === Priority.P1 || patient.priority === Priority.P2
              ? 'high'
              : 'medium',
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  }
  return tasks;
}

function buildEscalationTasks(patients: Patient[], now: string): AdministrativeAutomationTask[] {
  return patients
    .filter((patient) => hasFlag(patient, PatientFlag.ReassessmentDue))
    .map((patient) =>
      makeTask({
        id: `auto-escalate-${patient.id}`,
        category: 'escalation_workflow',
        status: 'pending_review',
        patientId: patient.id,
        patientName: patientName(patient),
        title: `Escalate reassessment — ${patientName(patient)}`,
        summary: 'Reassessment due flag active without documented completion.',
        proposedAction: 'Open reassessment workflow and notify assigned clinician.',
        proposedPayload: { flag: PatientFlag.ReassessmentDue },
        ownerRole: 'registered_nurse',
        priority: 'high',
        createdAt: now,
        updatedAt: now,
      }),
    );
}

/** @deprecated Use `buildBackendEnrichedAdministrativeAutomationSnapshot` for full parity. */
export function buildBackendAdministrativeAutomationSnapshot(
  input: {
    patients?: Patient[];
    existingTasks?: readonly AdministrativeAutomationTask[];
    now?: Date;
  } = {},
): AdministrativeAutomationSnapshot {
  const now = (input.now || new Date()).toISOString();
  const patients = input.patients || [];
  const existing = new Map(
    (input.existingTasks || [])
      .filter((task) => !['executed', 'dismissed', 'expired'].includes(task.status))
      .map((task) => [task.id, task]),
  );

  const generated = [
    ...buildRoutingTasks(patients, now),
    ...buildEscalationTasks(patients, now),
  ].filter((task) => !existing.has(task.id));

  const tasks = Object.freeze([...existing.values(), ...generated]);
  const byCategory = Object.freeze(
    (
      [
        'patient_routing',
        'documentation_handoff',
        'ai_patient_summary',
        'triage_preparation',
        'department_notification',
        'staff_assignment',
        'queue_prioritization',
        'escalation_workflow',
      ] as AdministrativeAutomationCategory[]
    ).reduce(
      (acc, category) => {
        acc[category] = tasks.filter((task) => task.category === category).length;
        return acc;
      },
      {} as Record<AdministrativeAutomationCategory, number>,
    ),
  );

  return Object.freeze({
    engineId: 'unified-clinical-workflow-orchestrator',
    generatedAt: now,
    tasks,
    metrics: Object.freeze({
      pendingReview: tasks.filter((task) => task.status === 'pending_review').length,
      executedToday: tasks.filter((task) => task.status === 'executed').length,
      overridden: tasks.filter((task) => task.status === 'overridden').length,
      byCategory,
    }),
    safetyStatement: SAFETY_STATEMENT,
  });
}

export function reviewBackendAdministrativeAutomationTask(
  tasks: readonly AdministrativeAutomationTask[],
  input: ReviewAdministrativeAutomationInput,
): { tasks: AdministrativeAutomationTask[]; task: AdministrativeAutomationTask | null } {
  const index = tasks.findIndex((task) => task.id === input.taskId);
  if (index < 0) return { tasks: [...tasks], task: null };

  const current = tasks[index];
  const reviewedAt = new Date().toISOString();
  let nextStatus = current.status;
  let modifiedAction = current.modifiedAction;
  let overrideReason = current.overrideReason;

  switch (input.decision) {
    case 'approve':
      nextStatus = 'approved';
      break;
    case 'modify':
      nextStatus = 'modified';
      modifiedAction = input.modifiedAction || current.proposedAction;
      break;
    case 'override':
      nextStatus = 'overridden';
      overrideReason = input.overrideReason || 'Clinician override recorded.';
      break;
    case 'dismiss':
      nextStatus = 'dismissed';
      break;
    default:
      break;
  }

  const updated: AdministrativeAutomationTask = Object.freeze({
    ...current,
    status: nextStatus,
    modifiedAction,
    overrideReason,
    reviewedByStaffId: input.actorStaffId,
    reviewedByName: input.actorName,
    reviewedAt,
    updatedAt: reviewedAt,
    auditTrailId: `audit-${input.taskId}-${Date.now()}`,
  });

  const nextTasks = [...tasks];
  nextTasks[index] = updated;
  return { tasks: nextTasks, task: updated };
}
