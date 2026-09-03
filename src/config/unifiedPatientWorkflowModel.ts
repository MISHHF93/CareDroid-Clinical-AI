/**
 * Canonical step-based patient workflow — one map from arrival through discharge.
 * All intake paths, state transitions, and automation triggers derive from here.
 */
import { VALID_TRANSITIONS } from '../engine/journeyEngine';
import { PatientState } from '../types/emergency';
import { CANONICAL_ROUTES } from './routes.config';
import type { EdJourneyPhaseId } from './edOperatingSurface.config';
import type { WorkflowAutomationTriggerEvent } from './unifiedWorkflowAutomationModel';

export type PatientWorkflowStepId =
  | 'arrival'
  | 'registration'
  | 'triage'
  | 'waiting'
  | 'assessment'
  | 'orders'
  | 'results'
  | 'disposition'
  | 'admission'
  | 'discharge';

export type PatientWorkflowContextField =
  | 'patientId'
  | 'encounterId'
  | 'chiefComplaint'
  | 'arrivalReason'
  | 'triageAssist'
  | 'assignedStaffId'
  | 'referralId'
  | 'journeyTraceId';

export type PatientWorkflowStep = Readonly<{
  id: PatientWorkflowStepId;
  order: number;
  label: string;
  patientState: PatientState;
  phaseId: EdJourneyPhaseId;
  ownerRole: string;
  route: string;
  nextStepIds: readonly PatientWorkflowStepId[];
  contextFields: readonly PatientWorkflowContextField[];
  automationEvent: WorkflowAutomationTriggerEvent;
  primaryAction: string;
  clicksSavedEstimate: number;
}>;

export const PATIENT_WORKFLOW_STEPS = Object.freeze([
  Object.freeze({
    id: 'arrival',
    order: 1,
    label: 'Arrival',
    patientState: PatientState.Arrival,
    phaseId: 'arrival-intake',
    ownerRole: 'registration_clerk',
    route: CANONICAL_ROUTES.emergencyReception,
    nextStepIds: ['registration'],
    contextFields: ['patientId', 'chiefComplaint', 'arrivalReason'],
    automationEvent: 'patient_created',
    primaryAction: 'Capture arrival signal',
    clicksSavedEstimate: 0,
  }),
  Object.freeze({
    id: 'registration',
    order: 2,
    label: 'Registration & intake',
    patientState: PatientState.Registration,
    phaseId: 'arrival-intake',
    ownerRole: 'registration_clerk',
    route: CANONICAL_ROUTES.emergencyReception,
    nextStepIds: ['triage'],
    contextFields: ['patientId', 'encounterId', 'chiefComplaint', 'arrivalReason', 'triageAssist'],
    automationEvent: 'patient_created',
    primaryAction: 'Complete intake & hand off to triage',
    clicksSavedEstimate: 3,
  }),
  Object.freeze({
    id: 'triage',
    order: 3,
    label: 'Triage',
    patientState: PatientState.Triage,
    phaseId: 'triage-assessment',
    ownerRole: 'triage_nurse',
    route: CANONICAL_ROUTES.emergencyQueues,
    nextStepIds: ['waiting', 'assessment'],
    contextFields: ['patientId', 'encounterId', 'triageAssist', 'assignedStaffId'],
    automationEvent: 'journey_state_changed',
    primaryAction: 'Confirm acuity & route to care',
    clicksSavedEstimate: 2,
  }),
  Object.freeze({
    id: 'waiting',
    order: 4,
    label: 'Waiting for provider',
    patientState: PatientState.Waiting,
    phaseId: 'triage-assessment',
    ownerRole: 'patient_flow_coordinator',
    route: CANONICAL_ROUTES.emergencyQueues,
    nextStepIds: ['assessment'],
    contextFields: ['patientId', 'assignedStaffId'],
    automationEvent: 'patient_flow_updated',
    primaryAction: 'Assign provider & advance to assessment',
    clicksSavedEstimate: 1,
  }),
  Object.freeze({
    id: 'assessment',
    order: 5,
    label: 'Clinical assessment',
    patientState: PatientState.Assessment,
    phaseId: 'triage-assessment',
    ownerRole: 'emergency_physician',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    nextStepIds: ['orders', 'disposition'],
    contextFields: ['patientId', 'encounterId', 'assignedStaffId', 'triageAssist'],
    automationEvent: 'journey_state_changed',
    primaryAction: 'Begin assessment or order diagnostics',
    clicksSavedEstimate: 2,
  }),
  Object.freeze({
    id: 'orders',
    order: 6,
    label: 'Diagnostics orders',
    patientState: PatientState.Orders,
    phaseId: 'diagnostics-treatment',
    ownerRole: 'emergency_physician',
    route: CANONICAL_ROUTES.emergencyDiagnostics,
    nextStepIds: ['results'],
    contextFields: ['patientId', 'encounterId'],
    automationEvent: 'journey_state_changed',
    primaryAction: 'Track orders to results',
    clicksSavedEstimate: 1,
  }),
  Object.freeze({
    id: 'results',
    order: 7,
    label: 'Results review',
    patientState: PatientState.Results,
    phaseId: 'diagnostics-treatment',
    ownerRole: 'emergency_physician',
    route: CANONICAL_ROUTES.emergencyDiagnostics,
    nextStepIds: ['assessment', 'disposition'],
    contextFields: ['patientId', 'encounterId'],
    automationEvent: 'journey_state_changed',
    primaryAction: 'Review results & decide next step',
    clicksSavedEstimate: 1,
  }),
  Object.freeze({
    id: 'disposition',
    order: 8,
    label: 'Disposition decision',
    patientState: PatientState.Disposition,
    phaseId: 'disposition-handoff',
    ownerRole: 'emergency_physician',
    route: CANONICAL_ROUTES.emergencyReferrals,
    nextStepIds: ['admission', 'discharge'],
    contextFields: ['patientId', 'referralId'],
    automationEvent: 'boarding_started',
    primaryAction: 'Admit, transfer, or discharge',
    clicksSavedEstimate: 2,
  }),
  Object.freeze({
    id: 'admission',
    order: 9,
    label: 'Admission / boarding',
    patientState: PatientState.Admission,
    phaseId: 'disposition-handoff',
    ownerRole: 'patient_flow_coordinator',
    route: CANONICAL_ROUTES.emergencyBoarding,
    nextStepIds: ['discharge'],
    contextFields: ['patientId', 'referralId'],
    automationEvent: 'boarding_started',
    primaryAction: 'Complete boarding handoff',
    clicksSavedEstimate: 2,
  }),
  Object.freeze({
    id: 'discharge',
    order: 10,
    label: 'Discharge & reporting',
    patientState: PatientState.Discharge,
    phaseId: 'reporting-analytics',
    ownerRole: 'registered_nurse',
    route: CANONICAL_ROUTES.emergencyHandoffs,
    nextStepIds: [],
    contextFields: ['patientId', 'encounterId'],
    automationEvent: 'workflow_log_created',
    primaryAction: 'Complete discharge summary & handoff',
    clicksSavedEstimate: 3,
  }),
]) as readonly PatientWorkflowStep[];

const STEP_BY_STATE = Object.freeze(
  Object.fromEntries(PATIENT_WORKFLOW_STEPS.map((step) => [step.patientState, step])),
) as Partial<Record<PatientState, PatientWorkflowStep>>;

const STEP_BY_ID = Object.freeze(
  Object.fromEntries(PATIENT_WORKFLOW_STEPS.map((step) => [step.id, step])),
) as Record<PatientWorkflowStepId, PatientWorkflowStep>;

export function resolveWorkflowStepForState(state: PatientState): PatientWorkflowStep | null {
  return STEP_BY_STATE[state] || null;
}

export function getWorkflowStep(stepId: PatientWorkflowStepId): PatientWorkflowStep {
  return STEP_BY_ID[stepId];
}

export function listPatientWorkflowSteps(): readonly PatientWorkflowStep[] {
  return PATIENT_WORKFLOW_STEPS;
}

export function resolveLegalNextStates(currentState: PatientState): readonly PatientState[] {
  return VALID_TRANSITIONS[currentState] || [];
}

export function resolveWorkflowRouteForState(state: PatientState, patientId?: string): string {
  const step = resolveWorkflowStepForState(state);
  const base = step?.route || CANONICAL_ROUTES.emergencyWhiteboard;
  if (!patientId) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}patient=${encodeURIComponent(patientId)}`;
}

export function estimateWorkflowClicksSaved(
  fromState: PatientState,
  toState: PatientState,
): number {
  const fromStep = resolveWorkflowStepForState(fromState);
  const toStep = resolveWorkflowStepForState(toState);
  if (!fromStep || !toStep) return 0;
  if (toStep.order <= fromStep.order) return 0;
  return PATIENT_WORKFLOW_STEPS.filter(
    (step) => step.order > fromStep.order && step.order <= toStep.order,
  ).reduce((sum, step) => sum + step.clicksSavedEstimate, 0);
}

export const UNIFIED_PATIENT_WORKFLOW_CONTRACT = Object.freeze({
  engineId: 'unified-patient-workflow',
  stepCount: PATIENT_WORKFLOW_STEPS.length,
  canonicalHandoff: 'completeIntakeHandoff',
  canonicalTransition: 'advancePatientWorkflow',
  canonicalNavigation: 'patientWorkflowNavigation',
  humanOversightRequired: true,
  contextCarryFields: Object.freeze([
    'patientId',
    'encounterId',
    'chiefComplaint',
    'arrivalReason',
    'triageAssist',
    'assignedStaffId',
    'referralId',
  ] as const),
});
