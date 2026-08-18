import { runCareDroidAI } from '../../../../lib/ai/careDroidAI';
import type { CareDroidAIResponse } from '../../../../lib/ai/careDroidAITypes';
import {
  ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT,
  AI_ENRICHED_AUTOMATION_CATEGORIES,
  CATEGORY_AUTOMATION_IDS,
  isAdminAutomationEntitled,
} from '../../../../src/config/administrativeAutomationCatalog';
import {
  patientsNeedingAiEnrichment,
  taskHasAiDecision,
} from '../../../../src/services/administrativeAutomationAiUtils';
import { recommendRouting, routingForPriority } from '../../../../src/services/staffRoutingService';
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
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Staff,
} from '../../../../src/types/emergency';
import { CANONICAL_ROUTES } from '../../../../src/config/routes.config';
import type { TenantContext } from '../tenant-context/tenant-context.types';
import type { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';

const SAFETY_STATEMENT = ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT;

const ROUTES = Object.freeze({
  emergencyWhiteboard: CANONICAL_ROUTES.emergencyWhiteboard,
  emergencyCommandCenter: CANONICAL_ROUTES.emergencyCommandCenter,
  emergencyHandoffs: CANONICAL_ROUTES.emergencyHandoffs,
  emergencyCopilot: CANONICAL_ROUTES.emergencyCopilot,
  emergencyEms: CANONICAL_ROUTES.emergencyEms,
  emergencyQueues: CANONICAL_ROUTES.emergencyQueues,
  emergencyAlerts: CANONICAL_ROUTES.emergencyAlerts,
});

export type AutomationEngineRuntimeContext = {
  entitledAssetIds?: string[];
  strictEntitlements?: boolean;
  subscriptionTier?: string;
  workspaceId?: string;
  tenant?: { id?: string; name?: string };
};

function deriveTriagePending(patient: Patient): boolean {
  if (typeof patient.triagePending === 'boolean') return patient.triagePending;
  return patient.state === PatientState.Triage;
}

function isAutomationEntitled(
  automationId: string,
  context: AutomationEngineRuntimeContext = {},
): boolean {
  return isAdminAutomationEntitled(automationId, context);
}

const STAGE_TARGETS: Record<string, number> = {
  registration: 10,
  triage: 15,
  waiting: 30,
  assessment: 45,
};

export type BackendAdministrativeOrchestrationInput = Readonly<{
  patients: Patient[];
  staff: Staff[];
  referrals: Referral[];
  alerts: Alert[];
  emsArrivals: EMSArrival[];
  capacity?: CapacitySnapshot | null;
  existingTasks?: readonly AdministrativeAutomationTask[];
  now?: Date;
  entitlementContext?: AutomationEngineRuntimeContext;
}>;

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as { type?: string })?.type === flag,
  );
}

function priorityRank(priority: AdministrativeAutomationTask['priority']): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

function makeTask(
  partial: Omit<AdministrativeAutomationTask, 'humanReviewRequired' | 'aiGenerated'> & {
    aiGenerated?: boolean;
  },
): AdministrativeAutomationTask {
  return Object.freeze({
    aiGenerated: partial.aiGenerated ?? true,
    humanReviewRequired: true as const,
    automationId: partial.automationId || CATEGORY_AUTOMATION_IDS[partial.category],
    route:
      partial.route ||
      (partial.patientId
        ? `${ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(partial.patientId)}`
        : ROUTES.emergencyCommandCenter),
    ...partial,
  });
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
          priority:
            patient.priority === Priority.P1 || patient.priority === Priority.P2
              ? 'high'
              : 'medium',
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
          summary:
            'Triage documentation captured — ready for waiting-room or provider queue routing.',
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

function buildHandoffTasks(
  patients: Patient[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  return patients
    .filter(
      (patient) =>
        patient.state === PatientState.Disposition ||
        patient.state === PatientState.Admission ||
        hasFlag(patient, PatientFlag.PendingAdmission),
    )
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
        route: ROUTES.emergencyHandoffs,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildSummaryTasks(
  patients: Patient[],
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
      const summary = [
        `CareDroid operational summary for ${patientName(patient)} (${patient.priority}, ${patient.state}).`,
        `Chief complaint: ${patient.chiefComplaint || 'not documented'}.`,
        'Human review required before this summary enters the permanent record.',
      ].join(' ');
      return makeTask({
        id,
        category: 'ai_patient_summary',
        status: 'pending_review',
        patientId: patient.id,
        patientName: patientName(patient),
        title: `AI summary ready — ${patientName(patient)}`,
        summary,
        proposedAction:
          'Attach reviewed summary to patient record and share with assigned clinician.',
        proposedPayload: { summaryText: summary },
        ownerRole: 'emergency_physician',
        priority: patient.priority === Priority.P1 ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
        route: ROUTES.emergencyCopilot,
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
  return emsArrivals
    .filter((arrival) => arrival.status === 'Inbound')
    .map((arrival) => {
      const id = `auto-triage-prep-${arrival.id}`;
      if (existing.get(id)?.status === 'pending_review') return null;
      const linkedPatient = patients.find((patient) => patient.emsArrival?.id === arrival.id);
      return makeTask({
        id,
        category: 'triage_preparation',
        status: 'pending_review',
        patientId: linkedPatient?.id,
        patientName: linkedPatient ? patientName(linkedPatient) : arrival.unitName,
        title: `Prepare triage packet — ${arrival.unitName}`,
        summary: `Inbound EMS ETA ${arrival.eta}m · ${arrival.chiefComplaint || 'complaint pending'}`,
        proposedAction:
          'Open pre-arrival triage packet, assign receiving nurse, and stage resus if critical.',
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
        route: ROUTES.emergencyEms,
      });
    })
    .filter((task): task is AdministrativeAutomationTask => Boolean(task));
}

function buildDepartmentNotificationTasks(
  patients: Patient[],
  now: string,
  existing: Map<string, AdministrativeAutomationTask>,
): AdministrativeAutomationTask[] {
  const tasks: AdministrativeAutomationTask[] = [];
  const stages = [
    {
      stageId: 'registration',
      state: PatientState.Registration,
      label: 'Registration',
      ownerRole: 'Registration clerk',
    },
    { stageId: 'triage', state: PatientState.Triage, label: 'Triage', ownerRole: 'Triage nurse' },
    {
      stageId: 'waiting',
      state: PatientState.Waiting,
      label: 'Waiting',
      ownerRole: 'Charge nurse',
    },
    {
      stageId: 'assessment',
      state: PatientState.Assessment,
      label: 'Assessment',
      ownerRole: 'Emergency physician',
    },
  ];

  for (const stage of stages) {
    const activePatients = patients.filter((patient) => patient.state === stage.state);
    const target = STAGE_TARGETS[stage.stageId] || 20;
    const congested = activePatients.length >= target;
    const overloaded = activePatients.length >= target * 1.5;
    if (!congested && !overloaded) continue;
    const id = `auto-dept-${stage.stageId}`;
    if (existing.get(id)?.status === 'pending_review') continue;
    tasks.push(
      makeTask({
        id,
        category: 'department_notification',
        status: 'pending_review',
        title: `Notify ${stage.label} — ${overloaded ? 'overload' : 'congestion'}`,
        summary: `${activePatients.length} active patients in ${stage.label.toLowerCase()}.`,
        proposedAction: `Notify ${stage.ownerRole} and rebalance staff for ${stage.label.toLowerCase()}.`,
        proposedPayload: {
          stageId: stage.stageId,
          activePatients: activePatients.length,
          medianWaitMinutes: overloaded ? target * 2 : target,
        },
        ownerRole: stage.ownerRole,
        priority: overloaded ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
        route: ROUTES.emergencyQueues,
      }),
    );
  }
  return tasks;
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
      route: ROUTES.emergencyQueues,
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
          proposedAction:
            'Launch reassessment, notify charge nurse, and document escalation rationale.',
          proposedPayload: { flags, escalationType: 'clinical_operational' },
          ownerRole: 'charge_nurse',
          priority: hasFlag(patient, PatientFlag.DeteriorationRisk) ? 'critical' : 'high',
          createdAt: now,
          updatedAt: now,
          route: ROUTES.emergencyAlerts,
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
          proposedAction:
            'Route alerts to charge nurse and attending physician for coordinated response.',
          proposedPayload: { alertIds: unresolvedCritical.map((alert) => alert.id) },
          ownerRole: recommendRouting('critical_alert').primaryRole,
          priority: 'critical',
          createdAt: now,
          updatedAt: now,
          route: ROUTES.emergencyAlerts,
        }),
      );
    }
  }
  return tasks;
}

export function buildAdministrativeAutomationSnapshot(
  input: BackendAdministrativeOrchestrationInput,
): AdministrativeAutomationSnapshot {
  const now = (input.now || new Date()).toISOString();
  const patients = input.patients || [];
  const staff = input.staff || [];
  const alerts = input.alerts || [];
  const emsArrivals = input.emsArrivals || [];
  const existing = new Map(
    (input.existingTasks || [])
      .filter(
        (task) =>
          task.status !== 'executed' && task.status !== 'dismissed' && task.status !== 'expired',
      )
      .map((task) => [task.id, task]),
  );

  const generated = [
    ...buildRoutingTasks(patients, existing, now),
    ...buildHandoffTasks(patients, now, existing),
    ...buildSummaryTasks(patients, now, existing),
    ...buildTriagePrepTasks(emsArrivals, patients, now, existing),
    ...buildDepartmentNotificationTasks(patients, now, existing),
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

type PatientJourneyAiDecisionBundle = Readonly<{
  patientId: string;
  triage: CareDroidAIResponse;
  intake: CareDroidAIResponse;
  critical: CareDroidAIResponse;
  summary?: CareDroidAIResponse;
  generatedAt: string;
}>;

function buildPatientJourneyAiInput(
  patient: Patient,
  tenant?: TenantContext,
): Record<string, unknown> {
  const vitals = patient.currentVitals || patient.vitals?.at(-1);
  return {
    patientId: patient.id,
    patientName: patientName(patient),
    mrn: patient.mrn,
    age: patient.age,
    sex: patient.sex,
    symptoms: [patient.chiefComplaint || patient.complaint].filter(Boolean),
    chiefComplaint: patient.chiefComplaint || patient.complaint,
    vitals: vitals,
    triageLevel: patient.priority,
    patientState: patient.state,
    operationalFlags: patient.flags || [],
    registrationComplete: patient.state !== PatientState.Arrival,
    triagePending: patient.state === PatientState.Triage,
    organizationId: tenant?.organizationId,
    workspaceId: tenant?.workspaceId,
  };
}

function aiContext(sourceScreen: string, patientId: string, tenant?: TenantContext) {
  return {
    sourceScreen,
    organizationId: tenant?.organizationId,
    workspaceId: tenant?.workspaceId,
    tenant: {
      organizationId: tenant?.organizationId,
      workspaceId: tenant?.workspaceId,
      source: 'backend_administrative_automation',
    },
    unifiedAiNode: {
      nodeId: 'CareDroidUnifiedAINode',
      route: '/api/ai/node',
      capabilitySource: 'patient_journey_ai_decision',
    },
    patientId,
  };
}

function buildEmsPrearrivalAiInput(
  arrival: EMSArrival,
  patient?: Patient,
): Record<string, unknown> {
  const vitals = patient?.currentVitals || patient?.vitals?.at(-1);
  return {
    unitName: arrival.unitName,
    etaMinutes: arrival.eta,
    chiefComplaint: arrival.chiefComplaint || patient?.chiefComplaint,
    severity: arrival.severity,
    symptoms: [arrival.chiefComplaint || patient?.chiefComplaint].filter(Boolean),
    vitals,
    preArrivalNotification: arrival.preArrivalNotification,
    medicationsEnRoute: patient?.emsArrival?.medicationsEnRoute || [],
    patientState: patient?.state,
    operationalFlags: patient?.flags || [],
  };
}

async function evaluateEmsPrearrivalAiDecision(
  arrival: EMSArrival,
  patient: Patient | undefined,
  tenant?: TenantContext,
): Promise<CareDroidAIResponse> {
  return runCareDroidAI({
    intent: 'ems_prearrival_risk_summary',
    input: buildEmsPrearrivalAiInput(arrival, patient),
    context: aiContext('administrative_automation_ems', patient?.id || arrival.id, tenant),
  });
}

async function evaluatePatientJourneyAiDecisions(
  patient: Patient,
  tenant?: TenantContext,
): Promise<PatientJourneyAiDecisionBundle> {
  const input = buildPatientJourneyAiInput(patient, tenant);
  const context = aiContext('administrative_automation_engine', patient.id, tenant);
  const [triage, intake, critical] = await Promise.all([
    runCareDroidAI({ intent: 'triage_recommendation', input, context }),
    runCareDroidAI({ intent: 'patient_intake_assist', input, context }),
    runCareDroidAI({ intent: 'critical_alert_assessment', input, context }),
  ]);
  const summary =
    patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased
      ? await runCareDroidAI({
          intent: 'patient_summary',
          input,
          context,
        })
      : undefined;
  return {
    patientId: patient.id,
    triage,
    intake,
    critical,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function formatAiDecisionSummary(bundle: PatientJourneyAiDecisionBundle): string {
  const triageLevel = bundle.triage.data?.recommendedTriageLevel || 'review required';
  const redFlags = (bundle.critical.redFlags || bundle.triage.redFlags || []).slice(0, 3);
  const missing = Array.isArray(bundle.intake.data?.missingFields)
    ? bundle.intake.data.missingFields.slice(0, 3).join(', ')
    : '';
  return [
    `AI triage advisory: ${triageLevel}.`,
    redFlags.length
      ? `Red flags: ${redFlags.join('; ')}.`
      : 'No critical red flags in submitted data.',
    missing
      ? `Registration gaps: ${missing}.`
      : 'Registration fields appear complete for automated review.',
    'Licensed clinician must confirm before acuity, routing, or orders change.',
  ].join(' ');
}

function hasHighRiskAiSignal(bundle: PatientJourneyAiDecisionBundle): boolean {
  const criticalSeverity = String(bundle.critical.data?.severity || '').toLowerCase();
  if (criticalSeverity === 'critical') return true;
  if ((bundle.critical.redFlags || []).length > 0) return true;
  const triageLevel = String(bundle.triage.data?.recommendedTriageLevel || '').toUpperCase();
  return (
    triageLevel === 'P1' ||
    triageLevel === 'P2' ||
    triageLevel === 'RESUSCITATION' ||
    triageLevel === 'EMERGENT'
  );
}

async function enrichAdministrativeAutomationSnapshotWithAi(
  snapshot: AdministrativeAutomationSnapshot,
  input: {
    patients: Patient[];
    emsArrivals?: EMSArrival[];
    tenant?: TenantContext;
    maxPatients?: number;
  },
): Promise<AdministrativeAutomationSnapshot> {
  const AI_ENRICHED_CATEGORIES = new Set<AdministrativeAutomationCategory>(
    AI_ENRICHED_AUTOMATION_CATEGORIES,
  );
  const patientsById = new Map(input.patients.map((patient) => [patient.id, patient]));
  const decisionCache = new Map<string, PatientJourneyAiDecisionBundle>();
  const candidates = patientsNeedingAiEnrichment(
    snapshot.tasks,
    input.patients,
    input.maxPatients ?? 12,
  );

  await Promise.all(
    candidates.map(async (patient) => {
      decisionCache.set(patient.id, await evaluatePatientJourneyAiDecisions(patient, input.tenant));
    }),
  );

  const enrichedTasks = await Promise.all(
    snapshot.tasks.map(async (task) => {
      if (!AI_ENRICHED_CATEGORIES.has(task.category)) return task;
      if (taskHasAiDecision(task)) return task;

      if (task.category === 'triage_preparation' && task.proposedPayload.arrivalId) {
        const arrival = (input.emsArrivals || []).find(
          (entry) => entry.id === task.proposedPayload.arrivalId,
        );
        if (!arrival) return task;
        const patient = task.patientId ? patientsById.get(task.patientId) : undefined;
        const emsDecision = await evaluateEmsPrearrivalAiDecision(arrival, patient, input.tenant);
        return Object.freeze({
          ...task,
          priority: emsDecision.priority === 'critical' ? 'critical' : task.priority,
          summary: `${task.summary} EMS AI pre-arrival: ${emsDecision.data?.riskLevel || 'review'} — ${(emsDecision.redFlags || []).slice(0, 2).join('; ') || 'no red flags'}. Clinician review required.`,
          proposedPayload: Object.freeze({
            ...task.proposedPayload,
            aiDecision: Object.freeze({
              nodeId: 'CareDroidUnifiedAINode',
              intent: 'ems_prearrival_risk_summary',
              data: emsDecision.data,
              redFlags: emsDecision.redFlags,
              requiresClinicianReview: true,
            }),
          }),
        });
      }

      if (!task.patientId) return task;
      const bundle = decisionCache.get(task.patientId);
      if (!bundle) return task;
      if (task.category === 'escalation_workflow' && !hasHighRiskAiSignal(bundle)) return task;
      const aiSummary = formatAiDecisionSummary(bundle);
      return Object.freeze({
        ...task,
        summary: `${task.summary} ${aiSummary}`,
        proposedPayload: Object.freeze({
          ...task.proposedPayload,
          aiDecision: Object.freeze({
            nodeId: 'CareDroidUnifiedAINode',
            generatedAt: bundle.generatedAt,
            triage: bundle.triage.data,
            intake: bundle.intake.data,
            critical: bundle.critical.data,
            summary: bundle.summary?.data,
            redFlags: [...(bundle.critical.redFlags || []), ...(bundle.triage.redFlags || [])],
            requiresClinicianReview: true,
          }),
        }),
      });
    }),
  );

  return Object.freeze({
    ...snapshot,
    tasks: Object.freeze(enrichedTasks),
  });
}

function filterEntitledAdministrativeTasks(
  tasks: readonly AdministrativeAutomationTask[],
  context: AutomationEngineRuntimeContext,
): AdministrativeAutomationTask[] {
  if (!context.strictEntitlements) return [...tasks];
  return tasks.filter((task) => {
    if (!task.automationId) return true;
    return isAutomationEntitled(task.automationId, context);
  });
}

function finalizeAdministrativeAutomationSnapshot(
  enriched: AdministrativeAutomationSnapshot,
  entitledTasks: AdministrativeAutomationTask[],
): AdministrativeAutomationSnapshot {
  return Object.freeze({
    ...enriched,
    tasks: Object.freeze(entitledTasks),
    metrics: Object.freeze({
      ...enriched.metrics,
      pendingReview: entitledTasks.filter((task) => task.status === 'pending_review').length,
      byCategory: Object.freeze(
        Object.fromEntries(
          Object.entries(enriched.metrics.byCategory).map(([category]) => [
            category,
            entitledTasks.filter((task) => task.category === category).length,
          ]),
        ) as Record<AdministrativeAutomationCategory, number>,
      ),
    }),
  });
}

export async function buildBackendEnrichedAdministrativeAutomationSnapshot(
  input: BackendAdministrativeOrchestrationInput & { tenant?: TenantContext },
): Promise<AdministrativeAutomationSnapshot> {
  const baseSnapshot = buildAdministrativeAutomationSnapshot(input);
  const enriched = await enrichAdministrativeAutomationSnapshotWithAi(baseSnapshot, {
    patients: input.patients,
    emsArrivals: input.emsArrivals,
    tenant: input.tenant,
  });
  const entitlementContext = input.entitlementContext || { strictEntitlements: false };
  const entitledTasks = filterEntitledAdministrativeTasks(enriched.tasks, entitlementContext);
  return finalizeAdministrativeAutomationSnapshot(enriched, entitledTasks);
}

function executeBackendApprovedTask(
  task: AdministrativeAutomationTask,
  patientService: EmergencyPatientService,
  actorStaffId: string,
  organizationId?: string,
): { ok: boolean; detail: string } {
  switch (task.category) {
    case 'patient_routing': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for routing.' };
      const target = task.proposedPayload.targetState as PatientState;
      if (target !== PatientState.Triage && target !== PatientState.Waiting) {
        return { ok: false, detail: 'Unsupported routing target.' };
      }
      patientService.movePatientToState(patientId, target as never, {
        staffId: actorStaffId,
        note: `Approved administrative automation: ${task.title}`,
      });
      return {
        ok: true,
        detail:
          target === PatientState.Triage
            ? 'Patient routed to triage queue.'
            : 'Patient routed to waiting queue.',
      };
    }
    case 'staff_assignment': {
      const patientId = task.patientId;
      const staffId = task.proposedPayload.proposedStaffId as string | undefined;
      if (!patientId || !staffId) {
        return { ok: false, detail: 'Staff assignment requires patient and proposed staff.' };
      }
      patientService.assignStaffToPatient(patientId, staffId, actorStaffId, organizationId);
      return {
        ok: true,
        detail: `Assigned staff ${task.proposedPayload.proposedStaffName || staffId}.`,
      };
    }
    case 'department_notification': {
      patientService.dispatchOperationalAlert({
        severity: task.priority === 'critical' ? 'Critical' : 'Warning',
        title: task.title,
        message: task.summary,
        source: 'backend-workflow-orchestrator',
        metadata: { automationTaskId: task.id, ...task.proposedPayload },
      });
      return { ok: true, detail: 'Department notification dispatched.' };
    }
    case 'documentation_handoff': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for handoff.' };
      const draft = [
        '[Automated handoff draft — clinician review required]',
        `Patient: ${task.patientName}`,
        `Path: ${task.proposedPayload.handoffType}`,
        `Template: ${task.proposedPayload.template}`,
        task.summary,
      ].join('\n');
      patientService.addPatientNote(patientId, draft, actorStaffId);
      return { ok: true, detail: 'Handoff draft added to patient notes.' };
    }
    case 'ai_patient_summary': {
      const patientId = task.patientId;
      if (!patientId) return { ok: false, detail: 'Missing patient for summary.' };
      patientService.addPatientNote(
        patientId,
        `[AI summary — clinician review required]\n${task.proposedPayload.summaryText || task.summary}`,
        actorStaffId,
      );
      return { ok: true, detail: 'AI summary staged in patient notes.' };
    }
    case 'triage_preparation':
    case 'queue_prioritization':
    case 'escalation_workflow': {
      if (task.category === 'escalation_workflow' && task.patientId) {
        patientService.escalatePatient(task.patientId, actorStaffId, organizationId);
      }
      if (task.category === 'escalation_workflow' && !task.patientId) {
        patientService.dispatchOperationalAlert({
          severity: 'Critical',
          title: task.title,
          message: task.summary,
          source: 'backend-workflow-orchestrator',
          metadata: { automationTaskId: task.id, ...task.proposedPayload },
        });
      }
      return { ok: true, detail: 'Escalation workflow recorded for clinician follow-up.' };
    }
    default:
      return { ok: true, detail: 'Automation recorded without automatic mutation.' };
  }
}

export function reviewBackendAdministrativeAutomationWithExecution(
  tasks: readonly AdministrativeAutomationTask[],
  input: ReviewAdministrativeAutomationInput,
  patientService: EmergencyPatientService,
  workflowLogService: WorkflowActionLogService,
  tenant?: TenantContext,
) {
  const index = tasks.findIndex((task) => task.id === input.taskId);
  if (index < 0) return { tasks: [...tasks], task: null as AdministrativeAutomationTask | null };

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

  let execution: { ok: boolean; detail: string } | undefined;
  let finalStatus = nextStatus;
  if (
    (input.decision === 'approve' || input.decision === 'modify') &&
    input.executeOnApprove !== false &&
    nextStatus !== 'dismissed'
  ) {
    execution = executeBackendApprovedTask(
      { ...current, proposedAction: modifiedAction || current.proposedAction },
      patientService,
      input.actorStaffId,
      tenant?.organizationId,
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
    auditTrailId: `audit-${input.taskId}-${Date.now()}`,
  });

  workflowLogService.record({
    type: 'administrative_automation_reviewed',
    title: `Automation ${input.decision}`,
    summary: `${current.title} — ${execution?.detail || updated.status}`,
    patientId: current.patientId,
    actorStaffId: input.actorStaffId,
    source: 'backend-workflow-orchestrator',
    metadata: {
      taskId: current.id,
      category: current.category,
      decision: input.decision,
      tenantId: tenant?.organizationId ?? null,
      workspaceId: tenant?.workspaceId ?? null,
      executionOk: execution?.ok ?? false,
      executionDetail: execution?.detail || '',
    },
  });

  const nextTasks = [...tasks];
  nextTasks[index] = updated;
  return { tasks: nextTasks, task: updated, execution };
}

export function resolveBackendTenantScope(tenant?: TenantContext) {
  return {
    organizationId: tenant?.organizationId || 'default-organization',
    workspaceId: tenant?.workspaceId || 'emergency',
  };
}

export function createBackendAutomationExecutionStore(
  patientService: EmergencyPatientService,
  workflowLogService: WorkflowActionLogService,
  tenant?: Pick<TenantContext, 'organizationId' | 'workspaceId' | 'organizationName'>,
) {
  return {
    patientService,
    workflowLogService,
    tenant,
  };
}
