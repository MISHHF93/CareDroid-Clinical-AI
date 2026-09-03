/**
 * Canonical Hospital Operating System model — bridges patient states, journey stages,
 * ED phases, participating departments, routes, and backend API endpoints into one map.
 */
import { resolveOperationalStage } from '../../lib/patient-orchestration/resolveOperationalStage';
import type { EdOperationalStage } from '../../lib/patient-orchestration/orchestrationTypes';
import { DEPARTMENTS } from '../lib/users/hospitalNetwork';
import {
  FULL_EMERGENCY_CARE_JOURNEY,
  SAAS_SERVICE_JOURNEY_MODULES,
  type EmergencyJourneyStageId,
} from '../services/fullEmergencyCareJourneyService';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import { PatientState, type Patient, type Referral } from '../types/emergency';
import { resolveWorkflowRouteForState } from './unifiedPatientWorkflowModel';
import {
  ED_JOURNEY_PHASES,
  ED_OPERATING_SURFACES,
  type EdJourneyPhaseId,
  getEdJourneyPhase,
  resolveEdOperatingSurfaceFromPath,
} from './edOperatingSurface.config';
import { getPageApiBinding } from './pageApiBinding.registry';
import { resolveApiOperatingSurfaceId } from './operatingSurfaceApiMapping';

export type HospitalDepartmentId =
  | 'dispatch'
  | 'ems'
  | 'registration'
  | 'triage'
  | 'nursing'
  | 'physician'
  | 'diagnostics'
  | 'patient-flow'
  | 'inpatient'
  | 'quality'
  | 'administration';

export type HospitalDepartmentParticipation = Readonly<{
  id: HospitalDepartmentId;
  label: string;
  phaseIds: readonly EdJourneyPhaseId[];
  stageIds: readonly EmergencyJourneyStageId[];
}>;

export type PatientJourneyPosition = Readonly<{
  stageId: EmergencyJourneyStageId;
  stageLabel: string;
  stageOrder: number;
  phaseId: EdJourneyPhaseId;
  phaseLabel: string;
  phaseOrder: number;
  operationalStage: EdOperationalStage;
  operationalOverlays: readonly EdOperationalStage[];
  departmentIds: readonly HospitalDepartmentId[];
  route: string;
  apiEndpoints: readonly string[];
}>;

const OPERATIONAL_STAGE_TO_JOURNEY_STAGE: Readonly<
  Record<EdOperationalStage, EmergencyJourneyStageId>
> = Object.freeze({
  arrival: 'patient-arrival',
  waiting_intake: 'rapid-intake',
  triage_handoff: 'triage',
  physician_assessment: 'clinical-action',
  observation_reassessment: 'treatment-observation',
  results_review: 'diagnostics',
  deterioration_concern: 'clinical-action',
  referral_boarding_transfer: 'disposition',
  discharge_workflow: 'handoff-reporting',
});

const PATIENT_STATE_TO_JOURNEY_STAGE: Readonly<
  Partial<Record<PatientState, EmergencyJourneyStageId>>
> = Object.freeze({
  [PatientState.Arrival]: 'patient-arrival',
  [PatientState.Registration]: 'rapid-intake',
  [PatientState.Triage]: 'triage',
  [PatientState.Waiting]: 'triage',
  [PatientState.Assessment]: 'clinical-action',
  [PatientState.Orders]: 'diagnostics',
  [PatientState.Results]: 'diagnostics',
  [PatientState.Disposition]: 'disposition',
  [PatientState.Admission]: 'disposition',
  [PatientState.Discharge]: 'handoff-reporting',
  [PatientState.Deceased]: 'outcome-tracking',
});

const STAGE_BY_ID = Object.freeze(
  Object.fromEntries(FULL_EMERGENCY_CARE_JOURNEY.map((stage) => [stage.id, stage])),
) as Record<EmergencyJourneyStageId, (typeof FULL_EMERGENCY_CARE_JOURNEY)[number]>;

const PHASE_BY_STAGE = Object.freeze(
  Object.fromEntries(
    ED_JOURNEY_PHASES.flatMap((phase) => phase.stageIds.map((stageId) => [stageId, phase.id])),
  ),
) as Record<EmergencyJourneyStageId, EdJourneyPhaseId>;

const STAGE_DEPARTMENTS: Partial<Record<EmergencyJourneyStageId, readonly HospitalDepartmentId[]>> =
  Object.freeze({
    'emergency-event': ['dispatch'],
    'emergency-call': ['dispatch'],
    'dispatcher-triage': ['dispatch'],
    'ambulance-dispatch': ['dispatch', 'ems'],
    'ems-en-route': ['ems'],
    'ems-arrival-scene': ['ems'],
    'prehospital-care': ['ems'],
    'hospital-pre-arrival': ['ems', 'nursing'],
    'ed-readiness': ['patient-flow', 'nursing'],
    'patient-arrival': ['registration', 'triage'],
    'rapid-intake': ['registration'],
    triage: ['triage'],
    'ai-chief-review': ['physician', 'triage'],
    'clinical-action': ['nursing', 'physician'],
    diagnostics: ['diagnostics', 'physician'],
    'treatment-observation': ['nursing', 'physician'],
    disposition: ['physician', 'patient-flow', 'inpatient'],
    'handoff-reporting': ['nursing', 'patient-flow'],
    'outcome-tracking': ['quality', 'administration'],
    'analytics-feedback': ['quality', 'administration'],
  });

export const HOSPITAL_OPERATING_DEPARTMENTS = Object.freeze([
  Object.freeze({
    id: 'dispatch',
    label: DEPARTMENTS.EMERGENCY,
    phaseIds: ['pre-arrival'],
    stageIds: ['emergency-event', 'emergency-call', 'dispatcher-triage', 'ambulance-dispatch'],
  }),
  Object.freeze({
    id: 'ems',
    label: 'EMS / Prehospital',
    phaseIds: ['pre-arrival'],
    stageIds: [
      'ambulance-dispatch',
      'ems-en-route',
      'ems-arrival-scene',
      'prehospital-care',
      'hospital-pre-arrival',
    ],
  }),
  Object.freeze({
    id: 'registration',
    label: DEPARTMENTS.REGISTRATION,
    phaseIds: ['arrival-intake'],
    stageIds: ['patient-arrival', 'rapid-intake'],
  }),
  Object.freeze({
    id: 'triage',
    label: DEPARTMENTS.TRIAGE,
    phaseIds: ['arrival-intake', 'triage-assessment'],
    stageIds: ['triage', 'ai-chief-review'],
  }),
  Object.freeze({
    id: 'nursing',
    label: 'Bedside Nursing',
    phaseIds: ['triage-assessment', 'diagnostics-treatment'],
    stageIds: ['clinical-action', 'treatment-observation', 'handoff-reporting'],
  }),
  Object.freeze({
    id: 'physician',
    label: 'Emergency Physician',
    phaseIds: ['triage-assessment', 'diagnostics-treatment', 'disposition-handoff'],
    stageIds: [
      'ai-chief-review',
      'clinical-action',
      'diagnostics',
      'treatment-observation',
      'disposition',
    ],
  }),
  Object.freeze({
    id: 'diagnostics',
    label: `${DEPARTMENTS.LABORATORY} / ${DEPARTMENTS.RADIOLOGY} / ${DEPARTMENTS.PHARMACY}`,
    phaseIds: ['diagnostics-treatment'],
    stageIds: ['diagnostics'],
  }),
  Object.freeze({
    id: 'patient-flow',
    label: DEPARTMENTS.PATIENT_FLOW,
    phaseIds: ['pre-arrival', 'disposition-handoff'],
    stageIds: ['ed-readiness', 'disposition', 'handoff-reporting'],
  }),
  Object.freeze({
    id: 'inpatient',
    label: 'Inpatient / ICU',
    phaseIds: ['disposition-handoff'],
    stageIds: ['disposition', 'handoff-reporting'],
  }),
  Object.freeze({
    id: 'quality',
    label: 'Quality & Safety',
    phaseIds: ['reporting-analytics'],
    stageIds: ['outcome-tracking', 'analytics-feedback'],
  }),
  Object.freeze({
    id: 'administration',
    label: DEPARTMENTS.ADMINISTRATION,
    phaseIds: ['reporting-analytics'],
    stageIds: ['analytics-feedback'],
  }),
]) as readonly HospitalDepartmentParticipation[];

export function getJourneyStageDefinition(stageId: EmergencyJourneyStageId) {
  return STAGE_BY_ID[stageId];
}

export function getJourneyPhaseForStage(stageId: EmergencyJourneyStageId): EdJourneyPhaseId {
  return PHASE_BY_STAGE[stageId] ?? 'triage-assessment';
}

export function getJourneyStageForPatientState(
  state: PatientState,
  options: { triagePending?: boolean } = {},
): EmergencyJourneyStageId {
  if (state === PatientState.Waiting && !options.triagePending) {
    return 'treatment-observation';
  }
  return PATIENT_STATE_TO_JOURNEY_STAGE[state] ?? 'clinical-action';
}

export function getJourneyStageForOperationalStage(
  stage: EdOperationalStage,
): EmergencyJourneyStageId {
  return OPERATIONAL_STAGE_TO_JOURNEY_STAGE[stage] ?? 'clinical-action';
}

export function resolveDepartmentsForStage(
  stageId: EmergencyJourneyStageId,
): readonly HospitalDepartmentId[] {
  return STAGE_DEPARTMENTS[stageId] ?? ['nursing'];
}

export function resolveStageBackendEndpoints(stageId: EmergencyJourneyStageId): readonly string[] {
  const stage = STAGE_BY_ID[stageId];
  if (!stage) return [];

  const endpoints = new Set<string>();
  const normalizedRoute = stage.route.split('?')[0];

  for (const surface of ED_OPERATING_SURFACES) {
    if (!surface.journeyStageIds.includes(stageId)) continue;
    const apiSurfaceId = resolveApiOperatingSurfaceId(surface.surfaceId);
    if (apiSurfaceId) {
      endpoints.add(`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/${apiSurfaceId}`);
    }
    const binding = getPageApiBinding(surface.surfaceId);
    binding?.endpoints.forEach((endpoint) => endpoints.add(endpoint));
  }

  const routeSurface = ED_OPERATING_SURFACES.find((surface) => {
    const binding = getPageApiBinding(surface.surfaceId);
    return binding?.path.split('?')[0] === normalizedRoute;
  });
  routeSurface?.journeyStageIds.includes(stageId);
  if (routeSurface) {
    const binding = getPageApiBinding(routeSurface.surfaceId);
    binding?.endpoints.forEach((endpoint) => endpoints.add(endpoint));
  }

  const serviceModules = stage.serviceModules;
  for (const module of SAAS_SERVICE_JOURNEY_MODULES) {
    if (!module.stageIds.includes(stageId) && !serviceModules.includes(module.id)) continue;
    module.connectedRoutes.forEach((route) => {
      const surface = ED_OPERATING_SURFACES.find((candidate) => {
        const binding = getPageApiBinding(candidate.surfaceId);
        return binding?.path.split('?')[0] === route.split('?')[0];
      });
      if (!surface) return;
      const apiSurfaceId = resolveApiOperatingSurfaceId(surface.surfaceId);
      if (apiSurfaceId) {
        endpoints.add(`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/${apiSurfaceId}`);
      }
      getPageApiBinding(surface.surfaceId)?.endpoints.forEach((endpoint) =>
        endpoints.add(endpoint),
      );
    });
  }

  if (stageId === 'triage' || stageId === 'rapid-intake') {
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.triageAssist);
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.queues);
  }
  if (stageId === 'patient-arrival' || stageId === 'rapid-intake') {
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.receptionSnapshot);
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.receptionHandoff);
  }
  if (stageId === 'diagnostics') {
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.patientFlow);
  }
  if (stageId === 'disposition' || stageId === 'handoff-reporting') {
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.referrals);
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.boarding);
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration);
  }
  if (stageId === 'outcome-tracking' || stageId === 'analytics-feedback') {
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.analytics);
    endpoints.add(EMERGENCY_OS_API_ENDPOINTS.journey);
  }

  return Object.freeze([...endpoints]);
}

export function resolvePatientJourneyPosition(
  patient: Patient,
  referral?: Referral | null,
): PatientJourneyPosition {
  const { primary, overlays } = resolveOperationalStage(patient, referral);
  const stageId = getJourneyStageForOperationalStage(primary);
  const stage = STAGE_BY_ID[stageId];
  const phaseId = getJourneyPhaseForStage(stageId);
  const phase = getEdJourneyPhase(phaseId);

  return Object.freeze({
    stageId,
    stageLabel: stage?.label ?? stageId,
    stageOrder: stage?.order ?? 0,
    phaseId,
    phaseLabel: phase.label,
    phaseOrder: phase.order,
    operationalStage: primary,
    operationalOverlays: overlays,
    departmentIds: resolveDepartmentsForStage(stageId),
    route: resolveWorkflowRouteForState(patient.state, patient.id),
    apiEndpoints: resolveStageBackendEndpoints(stageId),
  });
}

export function resolvePathBackendEndpoints(pathname: string): readonly string[] {
  const surface = resolveEdOperatingSurfaceFromPath(pathname);
  if (!surface) return [];

  const endpoints = new Set<string>();
  const apiSurfaceId = resolveApiOperatingSurfaceId(surface.surfaceId);
  if (apiSurfaceId) {
    endpoints.add(`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/${apiSurfaceId}`);
  }
  getPageApiBinding(surface.surfaceId)?.endpoints.forEach((endpoint) => endpoints.add(endpoint));
  surface.journeyStageIds.forEach((stageId) => {
    resolveStageBackendEndpoints(stageId).forEach((endpoint) => endpoints.add(endpoint));
  });

  return Object.freeze([...endpoints]);
}

export function listHospitalDepartments(): readonly HospitalDepartmentParticipation[] {
  return HOSPITAL_OPERATING_DEPARTMENTS;
}

export function listJourneyPhases() {
  return ED_JOURNEY_PHASES;
}
