import {
  PatientFlag,
  PatientState,
  Priority,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationPriority,
  AdministrativeAutomationReviewDecision,
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
  ReviewAdministrativeAutomationInput,
} from '../types/administrativeAutomation';
import { buildContinuousPatientFlowSnapshot } from '../engine/continuousPatientFlowEngine';
import { resolveWhatHappensNext } from './whatHappensNextGuidance';
import { recommendRouting, routingForPriority } from './staffRoutingService';
import { deriveTriagePending } from './arrivalControlLayer';
import { deriveProviderWaitingStatus } from './providerWaitingStatus';
import { logAutomationAuditEvent, AUTOMATION_AUDIT_STATUSES } from '../data/automationAuditTrail';
import {
  ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT,
  CATEGORY_AUTOMATION_IDS,
} from '../config/administrativeAutomationCatalog';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { dispatchAlert } from '../engine/alertEngine';
import { enterTriageQueue, enterWaitingQueue, type QueueAssignmentStore } from './queueAssignment';

const SAFETY_STATEMENT = ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT;

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as { type?: string })?.type === flag,
  );
}

function priorityRank(priority: AdministrativeAutomationPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

function makeTask(
  partial: Omit<AdministrativeAutomationTask, 'humanReviewRequired' | 'aiGenerated'> & {
    aiGenerated?: boolean;
  },
): AdministrativeAutomationTask {
  return Object.freeze({
    // This file builds tasks entirely from deterministic rules over patient
    // state -- no AI call exists anywhere in it. See the same fix in
    // backend/administrative-automation-orchestration.lib.ts for the one
    // implementation that genuinely enriches tasks with real AI output.
    aiGenerated: partial.aiGenerated ?? false,
    humanReviewRequired: true as const,
    automationId: partial.automationId || CATEGORY_AUTOMATION_IDS[partial.category],
    route:
      partial.route ||
      (partial.patientId
        ? `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(partial.patientId)}`
        : CANONICAL_ROUTES.emergencyCommandCenter),
    ...partial,
  });
}

function buildAiPatientSummary(patient: Patient, staff: Staff[], referrals: Referral[]): string {
  const next = resolveWhatHappensNext(patient, { staff, referrals });
  const provider = deriveProviderWaitingStatus(patient, staff);
  return [
    `CareDroid operational summary for ${patientName(patient)} (${patient.priority}, ${patient.state}).`,
    `Chief complaint: ${patient.chiefComplaint || 'not documented'}.`,
    next ? `Predicted next step: ${next.label} — ${next.guidance}` : 'No pending next-step guidance.',
    provider.label ? `Provider status: ${provider.label}.` : '',
    'Human review required before this summary enters the permanent record.',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildRoutingTasks(
  patients: Patient[],
  existing: Map<string, AdministrativeAutomationTask>,
  now: string,
): AdministrativeAutomationTask[] {
  const tasks: AdministrativeAutomationTask[] = [];

  for (const patient of patients) {
    if (patient.state === PatientState.Registration || patient.state === PatientState.Arrival) {
      const id = `auto-route-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') continue;
      tasks.push(
        makeTask({
          id,
          category: 'patient_routing',
          status: 'pending_review',
          patientId: patient.id,
          patientName: patientName(patient),
          title: `Route ${patientName(patient)} to triage`,
          summary: 'Registration complete — automated routing recommends triage queue placement.',
          proposedAction: 'Move patient to triage queue and notify triage nurse.',
          proposedPayload: { targetState: PatientState.Triage, queue: 'pretriage' },
          ownerRole: 'triage_nurse',
          priority: patient.priority === Priority.P1 || patient.priority === Priority.P2 ? 'high' : 'medium',
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    if (patient.state === PatientState.Triage && deriveTriagePending(patient)) {
      const id = `auto-route-waiting-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') continue;
      tasks.push(
        makeTask({
          id,
          category: 'patient_routing',
          status: 'pending_review',
          patientId: patient.id,
          patientName: patientName(patient),
          title: `Advance ${patientName(patient)} to waiting`,
          summary: 'Triage documentation captured — ready for waiting-room or provider queue routing.',
          proposedAction: 'Move patient to waiting queue after triage sign-off.',
          proposedPayload: { targetState: PatientState.Waiting, queue: 'waiting-room' },
          ownerRole: 'triage_nurse',
          priority: 'medium',
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  }

  return tasks;
}

function buildHandoffTasks(patients: Patient[], now: string, existing: Map<string, AdministrativeAutomationTask>): AdministrativeAutomationTask[] {
  return patients
    .filter(
      (patient) =>
        patient.state === PatientState.Disposition ||
        patient.state === PatientState.Admission ||
        hasFlag(patient, PatientFlag.PendingAdmission),
    )
    .filter((patient) => {
      const recentHandoff = (patient.timeline || []).some(
        (event) =>
          event.type === 'Handoff' ||
          event.summary?.toLowerCase().includes('handoff') ||
          event.metadata?.automation === 'documentation-handoff',
      );
      return !recentHandoff;
    })
    .map((patient) => {
      const id = `auto-handoff-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') return null;
      return makeTask({
        id,
        category: 'documentation_handoff',
        status: 'pending_review',
        patientId: patient.id,
        patientName: patientName(patient),
        title: `Draft disposition handoff — ${patientName(patient)}`,
        summary: 'Disposition or admission path active without a structured handoff note.',
        proposedAction: 'Generate structured handoff draft for clinician review and signature.',
        proposedPayload: {
          handoffType: patient.state === PatientState.Admission ? 'admission' : 'disposition',
          template: 'SBAR',
        },
        ownerRole: 'registered_nurse',
        priority: 'high',
        createdAt: now,
        updatedAt: now,
        route: CANONICAL_ROUTES.emergencyHandoffs,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildSummaryTasks(
  patients: Patient[],
  staff: Staff[],
  referrals: Referral[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  return patients
    .filter(
      (patient) =>
        (patient.priority === Priority.P1 || patient.priority === Priority.P2) &&
        patient.state !== PatientState.Discharge,
    )
    .map((patient) => {
      const id = `auto-summary-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') return null;
      const summary = buildAiPatientSummary(patient, staff, referrals);
      return makeTask({
        id,
        category: 'ai_patient_summary',
        status: 'pending_review',
        patientId: patient.id,
        patientName: patientName(patient),
        title: `AI summary ready — ${patientName(patient)}`,
        summary,
        proposedAction: 'Attach reviewed summary to patient record and share with assigned clinician.',
        proposedPayload: { summaryText: summary },
        ownerRole: 'emergency_physician',
        priority: patient.priority === Priority.P1 ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
        route: CANONICAL_ROUTES.emergencyCopilot,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildTriagePrepTasks(
  emsArrivals: EMSArrival[],
  patients: Patient[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  const inbound = emsArrivals.filter((arrival) => arrival.status === 'Inbound');
  return inbound.map((arrival) => {
    const id = `auto-triage-prep-${arrival.id}`;
    if (existing.get(id)?.status === 'pending_review') return null;
    const linkedPatient = patients.find(
      (patient) =>
        patient.mrn === (arrival as EMSArrival & { patientMrn?: string }).patientMrn ||
        patient.emsArrival?.id === arrival.id,
    );
    return makeTask({
      id,
      category: 'triage_preparation',
      status: 'pending_review',
      patientId: linkedPatient?.id,
      patientName: linkedPatient ? patientName(linkedPatient) : arrival.unitName,
      title: `Prepare triage packet — ${arrival.unitName}`,
      summary: `Inbound EMS ETA ${arrival.eta}m · ${arrival.chiefComplaint || 'complaint pending'}`,
      proposedAction: 'Open pre-arrival triage packet, assign receiving nurse, and stage resus if critical.',
      proposedPayload: {
        arrivalId: arrival.id,
        etaMinutes: arrival.eta,
        severity: arrival.severity,
        preArrivalNotification: Boolean(arrival.preArrivalNotification),
      },
      ownerRole: recommendRouting('ems_pre_arrival').primaryRole,
      priority: arrival.severity === 'Critical' ? 'critical' : 'high',
      createdAt: now,
      updatedAt: now,
      route: CANONICAL_ROUTES.emergencyEms,
    });
  }).filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildDepartmentNotificationTasks(
  flowSnapshot: ReturnType<typeof buildContinuousPatientFlowSnapshot>,
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  return flowSnapshot.departments
    .filter((department) => department.congested || department.overloaded)
    .map((department) => {
      const id = `auto-dept-${department.stageId}`;
      if (existing.get(id)?.status === 'pending_review') return null;
      return makeTask({
        id,
        category: 'department_notification',
        status: 'pending_review',
        title: `Notify ${department.stageLabel} — ${department.overloaded ? 'overload' : 'congestion'}`,
        summary: `${department.activePatients} active patients · median ${department.medianWaitMinutes}m wait`,
        proposedAction: `Notify ${department.ownerRole} and rebalance staff for ${department.stageLabel.toLowerCase()}.`,
        proposedPayload: {
          stageId: department.stageId,
          activePatients: department.activePatients,
          medianWaitMinutes: department.medianWaitMinutes,
        },
        ownerRole: department.ownerRole,
        priority: department.overloaded ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
        route: CANONICAL_ROUTES.emergencyQueues,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildStaffAssignmentTasks(
  patients: Patient[],
  staff: Staff[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  return patients
    .filter(
      (patient) =>
        !patient.assignedStaffId &&
        (patient.state === PatientState.Waiting ||
          patient.state === PatientState.Assessment ||
          patient.priority === Priority.P1 ||
          patient.priority === Priority.P2),
    )
    .map((patient) => {
      const id = `auto-assign-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') return null;
      const routing = routingForPriority(patient.priority);
      const candidate = staff.find(
        (member) =>
          member.active !== false &&
          member.status !== 'OffShift' &&
          (member.role === 'MD' || member.role === 'RN' || member.role === 'Attending'),
      );
      return makeTask({
        id,
        category: 'staff_assignment',
        status: 'pending_review',
        patientId: patient.id,
        patientName: patientName(patient),
        title: `Assign owner — ${patientName(patient)}`,
        summary: `${patient.priority} patient in ${patient.state} without assigned clinician.`,
        proposedAction: `Assign ${candidate?.name || routing.primaryRole} as responsible owner.`,
        proposedPayload: {
          proposedStaffId: candidate?.id,
          proposedStaffName: candidate?.name,
          proposedRole: routing.primaryRole,
        },
        ownerRole: routing.primaryRole,
        priority: patient.priority === Priority.P1 ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildQueuePriorityTasks(
  patients: Patient[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  const waiting = patients.filter((patient) => patient.state === PatientState.Waiting);
  const highAcuityWaiting = waiting.filter(
    (patient) => patient.priority === Priority.P1 || patient.priority === Priority.P2,
  );
  if (highAcuityWaiting.length < 2) return [];

  const id = 'auto-queue-priority-waiting';
  if (existing.get(id)?.status === 'pending_review') return [];

  return [
    makeTask({
      id,
      category: 'queue_prioritization',
      status: 'pending_review',
      title: 'Reprioritize waiting queue',
      summary: `${highAcuityWaiting.length} P1/P2 patients waiting while lower-acuity patients are ahead.`,
      proposedAction: 'Surface P1/P2 patients at top of waiting queue and assign provider review.',
      proposedPayload: {
        patientIds: highAcuityWaiting.map((patient) => patient.id),
        recommendedOrder: highAcuityWaiting.map((patient) => ({
          patientId: patient.id,
          priority: patient.priority,
        })),
      },
      ownerRole: 'charge_nurse',
      priority: 'high',
      createdAt: now,
      updatedAt: now,
      route: CANONICAL_ROUTES.emergencyQueues,
    }),
  ];
}

function buildEscalationTasks(
  patients: Patient[],
  alerts: Alert[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  const tasks: AdministrativeAutomationTask[] = [];

  for (const patient of patients) {
    if (
      hasFlag(patient, PatientFlag.ReassessmentDue) ||
      hasFlag(patient, PatientFlag.DeteriorationRisk) ||
      hasFlag(patient, PatientFlag.LongWait)
    ) {
      const id = `auto-escalation-${patient.id}`;
      if (existing.get(id)?.status === 'pending_review') continue;
      const flags = (patient.flags || [])
        .map((entry) => (typeof entry === 'string' ? entry : (entry as { type?: string })?.type))
        .filter(Boolean);
      tasks.push(
        makeTask({
          id,
          category: 'escalation_workflow',
          status: 'pending_review',
          patientId: patient.id,
          patientName: patientName(patient),
          title: `Escalation review — ${patientName(patient)}`,
          summary: `Operational flags: ${flags.join(', ') || 'risk signal detected'}.`,
          proposedAction: 'Launch reassessment, notify charge nurse, and document escalation rationale.',
          proposedPayload: { flags, escalationType: 'clinical_operational' },
          ownerRole: 'charge_nurse',
          priority: hasFlag(patient, PatientFlag.DeteriorationRisk) ? 'critical' : 'high',
          createdAt: now,
          updatedAt: now,
          route: CANONICAL_ROUTES.emergencyAlerts,
        }),
      );
    }
  }

  const unresolvedCritical = alerts.filter(
    (alert) => alert.severity === 'Critical' && !alert.acknowledged && !alert.dismissed,
  );
  if (unresolvedCritical.length > 0) {
    const id = 'auto-escalation-alerts';
    if (existing.get(id)?.status !== 'pending_review') {
      tasks.push(
        makeTask({
          id,
          category: 'escalation_workflow',
          status: 'pending_review',
          title: 'Escalate unresolved critical alerts',
          summary: `${unresolvedCritical.length} critical alert(s) need acknowledgement before next workflow step.`,
          proposedAction: 'Route alerts to charge nurse and attending physician for coordinated response.',
          proposedPayload: { alertIds: unresolvedCritical.map((alert) => alert.id) },
          ownerRole: recommendRouting('critical_alert').primaryRole,
          priority: 'critical',
          createdAt: now,
          updatedAt: now,
          route: CANONICAL_ROUTES.emergencyAlerts,
        }),
      );
    }
  }

  return tasks;
}

export function buildAdministrativeAutomationSnapshot(input: {
  patients?: Patient[];
  staff?: Staff[];
  referrals?: Referral[];
  alerts?: Alert[];
  emsArrivals?: EMSArrival[];
  capacity?: CapacitySnapshot | null;
  existingTasks?: readonly AdministrativeAutomationTask[];
  now?: Date;
} = {}): AdministrativeAutomationSnapshot {
  const now = (input.now || new Date()).toISOString();
  const patients = input.patients || [];
  const staff = input.staff || [];
  const referrals = input.referrals || [];
  const alerts = input.alerts || [];
  const emsArrivals = input.emsArrivals || [];
  const existing = new Map(
    (input.existingTasks || [])
      .filter((task) => task.status !== 'executed' && task.status !== 'dismissed' && task.status !== 'expired')
      .map((task) => [task.id, task]),
  );

  const flowSnapshot = buildContinuousPatientFlowSnapshot({
    patients,
    staff,
    referrals,
    capacity: input.capacity,
    alerts,
    now: input.now || new Date(),
  });

  const generated = [
    ...buildRoutingTasks(patients, existing, now),
    ...buildHandoffTasks(patients, now, existing),
    ...buildSummaryTasks(patients, staff, referrals, now, existing),
    ...buildTriagePrepTasks(emsArrivals, patients, now, existing),
    ...buildDepartmentNotificationTasks(flowSnapshot, now, existing),
    ...buildStaffAssignmentTasks(patients, staff, now, existing),
    ...buildQueuePriorityTasks(patients, now, existing),
    ...buildEscalationTasks(patients, alerts, now, existing),
  ];

  const merged = new Map(existing);
  for (const task of generated) {
    if (!merged.has(task.id)) merged.set(task.id, task);
  }

  const tasks = [...merged.values()].sort(
    (left, right) => priorityRank(left.priority) - priorityRank(right.priority),
  );

  const byCategory = Object.fromEntries(
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
    ).map((category) => [category, tasks.filter((task) => task.category === category).length]),
  ) as Record<AdministrativeAutomationCategory, number>;

  return Object.freeze({
    engineId: 'unified-clinical-workflow-orchestrator',
    generatedAt: now,
    tasks: Object.freeze(tasks),
    metrics: Object.freeze({
      pendingReview: tasks.filter((task) => task.status === 'pending_review').length,
      executedToday: tasks.filter((task) => task.status === 'executed').length,
      overridden: tasks.filter((task) => task.status === 'overridden').length,
      byCategory: Object.freeze(byCategory),
    }),
    safetyStatement: SAFETY_STATEMENT,
  });
}

export type ExecuteAutomationStore = QueueAssignmentStore & {
  assignStaff: (patientId: string, staffId: string) => void;
  addNote: (patientId: string, note: string, staffId?: string) => void;
  escalatePatient?: (patientId: string, input: { staffId: string; staffName?: string }) => void;
};

function executeApprovedTask(
  task: AdministrativeAutomationTask,
  store: ExecuteAutomationStore,
  actorStaffId: string,
): { ok: boolean; detail: string } {
  switch (task.category) {
    case 'patient_routing': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for routing.' };
      const target = task.proposedPayload.targetState as PatientState;
      if (target === PatientState.Triage) {
        enterTriageQueue(store, { patientId, actorId: actorStaffId, source: 'workflow-orchestrator' });
        return { ok: true, detail: 'Patient routed to triage queue.' };
      }
      if (target === PatientState.Waiting) {
        enterWaitingQueue(store, { patientId, actorId: actorStaffId });
        return { ok: true, detail: 'Patient routed to waiting queue.' };
      }
      return { ok: false, detail: 'Unsupported routing target.' };
    }
    case 'staff_assignment': {
      const patientId = task.patientId;
      const staffId = task.proposedPayload.proposedStaffId as string | undefined;
      if (!patientId || !staffId) {
        return { ok: false, detail: 'Staff assignment requires patient and proposed staff.' };
      }
      store.assignStaff(patientId, staffId);
      return { ok: true, detail: `Assigned staff ${task.proposedPayload.proposedStaffName || staffId}.` };
    }
    case 'department_notification': {
      dispatchAlert({
        type: 'Operational',
        severity: task.priority === 'critical' ? 'Critical' : 'Warning',
        title: task.title,
        message: task.summary,
        source: 'unified-workflow-orchestrator',
        metadata: { automationTaskId: task.id, ...task.proposedPayload },
      });
      return { ok: true, detail: 'Department notification dispatched.' };
    }
    case 'documentation_handoff': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for handoff.' };
      const draft = [
        `[Automated handoff draft — clinician review required]`,
        `Patient: ${task.patientName}`,
        `Path: ${task.proposedPayload.handoffType}`,
        `Template: ${task.proposedPayload.template}`,
        task.summary,
      ].join('\n');
      store.addNote(patientId, draft, actorStaffId);
      return { ok: true, detail: 'Handoff draft added to patient notes.' };
    }
    case 'ai_patient_summary': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for summary.' };
      store.addNote(
        patientId,
        `[AI summary — clinician review required]\n${task.proposedPayload.summaryText || task.summary}`,
        actorStaffId,
      );
      return { ok: true, detail: 'AI summary staged in patient notes.' };
    }
    case 'triage_preparation':
    case 'queue_prioritization':
    case 'escalation_workflow': {
      if (task.category === 'escalation_workflow' && task.patientId && store.escalatePatient) {
        store.escalatePatient(task.patientId, { staffId: actorStaffId });
      }
      if (task.category === 'escalation_workflow' && !task.patientId) {
        dispatchAlert({
          type: 'Clinical',
          severity: 'Critical',
          title: task.title,
          message: task.summary,
          source: 'unified-workflow-orchestrator',
          metadata: { automationTaskId: task.id, ...task.proposedPayload },
        });
      }
      return { ok: true, detail: 'Escalation workflow recorded for clinician follow-up.' };
    }
    default:
      return { ok: true, detail: 'Automation recorded without automatic mutation.' };
  }
}

export function reviewAdministrativeAutomationTask(
  tasks: readonly AdministrativeAutomationTask[],
  input: ReviewAdministrativeAutomationInput,
  store: ExecuteAutomationStore,
): { tasks: AdministrativeAutomationTask[]; task: AdministrativeAutomationTask | null; execution?: { ok: boolean; detail: string } } {
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
      overrideReason = input.overrideReason || 'Clinician override';
      break;
    case 'dismiss':
      nextStatus = 'dismissed';
      break;
    default:
      break;
  }

  const auditEntry = logAutomationAuditEvent({
    triggerFired: `Administrative automation review: ${current.category}`,
    conditionsEvaluated: [{ label: 'Human clinician review available', result: true }],
    actionSelected: input.modifiedAction || current.proposedAction,
    user: { id: input.actorStaffId, name: input.actorName || 'Clinician' },
    tenant: { id: 'current-tenant', name: 'CareDroid ED' },
    workspace: { id: 'emergency', name: 'Emergency Department' },
    aiInvolvement: {
      involved: current.aiGenerated,
      summary: current.aiGenerated ? current.summary : 'Rules-based administrative automation.',
    },
    toolCalled: current.automationId || 'unified-clinical-workflow-orchestrator',
    backendEndpoint: '/api/emergency/workflow-orchestration/review',
    status:
      input.decision === 'dismiss' || input.decision === 'override'
        ? AUTOMATION_AUDIT_STATUSES.BLOCKED
        : AUTOMATION_AUDIT_STATUSES.SUCCESS,
    reason: overrideReason || (input.decision === 'dismiss' ? 'Dismissed by clinician' : ''),
    timestamp: reviewedAt,
    reviewer: { required: true, name: input.actorName || input.actorStaffId },
  });

  let execution: { ok: boolean; detail: string } | undefined;
  let finalStatus = nextStatus;

  if (
    (input.decision === 'approve' || input.decision === 'modify') &&
    input.executeOnApprove !== false &&
    nextStatus !== 'dismissed'
  ) {
    execution = executeApprovedTask(
      {
        ...current,
        proposedAction: modifiedAction || current.proposedAction,
      },
      store,
      input.actorStaffId,
    );
    if (execution.ok) finalStatus = 'executed';
  }

  const updated: AdministrativeAutomationTask = Object.freeze({
    ...current,
    status: finalStatus,
    modifiedAction,
    overrideReason,
    reviewedByStaffId: input.actorStaffId,
    reviewedByName: input.actorName,
    reviewedAt,
    updatedAt: reviewedAt,
    auditTrailId: auditEntry.id,
  });

  store.recordWorkflowAction({
    type: 'administrative_automation_reviewed',
    title: `Automation ${input.decision}`,
    summary: `${current.title} — ${execution?.detail || updated.status}`,
    patientId: current.patientId,
    actorStaffId: input.actorStaffId,
    source: 'unified-clinical-workflow-orchestrator',
    metadata: {
      taskId: current.id,
      category: current.category,
      decision: input.decision,
      auditTrailId: auditEntry.id,
      executionOk: execution?.ok ?? false,
      executionDetail: execution?.detail || '',
    },
  });

  const nextTasks = [...tasks];
  nextTasks[index] = updated;
  return { tasks: nextTasks, task: updated, execution };
}

export const UnifiedClinicalWorkflowOrchestrator = Object.freeze({
  buildSnapshot: buildAdministrativeAutomationSnapshot,
  reviewTask: reviewAdministrativeAutomationTask,
});

export default UnifiedClinicalWorkflowOrchestrator;