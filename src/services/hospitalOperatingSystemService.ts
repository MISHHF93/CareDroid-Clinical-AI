import { buildCommandCenterWorkflowActions } from '../config/operationalWorkflow.config';
import {
  listHospitalDepartments,
  resolvePatientJourneyPosition,
  resolvePathBackendEndpoints,
  type HospitalDepartmentId,
  type PatientJourneyPosition,
} from '../config/hospitalOperatingSystemModel';
import {
  ED_JOURNEY_PHASES,
  resolveEdOperatingSurfaceFromPath,
  type EdJourneyPhaseId,
  type EdOperatingPriority,
  type EdOperatingSurfaceDefinition,
  getEdJourneyPhase,
} from '../config/edOperatingSurface.config';
import { resolveApiOperatingSurfaceId } from '../config/operatingSurfaceApiMapping';
import { fetchEmergencyOperatingSurface, type OperatingSurfaceId } from './emergencyOsApi';
import {
  buildFullEmergencyCareJourneySnapshot,
  type EmergencyJourneyStageId,
} from './fullEmergencyCareJourneyService';
import {
  PatientState,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import type { WorkflowSituationBriefProps } from '../pages/emergency/emergencyRouteShared';

export type HospitalPhaseSummary = Readonly<{
  phaseId: EdJourneyPhaseId;
  order: number;
  label: string;
  route: string;
  activeCount: number;
  attentionCount: number;
  stagesActive: number;
  stagesAttention: number;
}>;

export type HospitalDepartmentSummary = Readonly<{
  id: HospitalDepartmentId;
  label: string;
  activePatients: number;
  phaseIds: readonly EdJourneyPhaseId[];
}>;

export type HospitalOperatingSystemSnapshot = Readonly<{
  generatedAt: string;
  journey: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>;
  phases: readonly HospitalPhaseSummary[];
  departments: readonly HospitalDepartmentSummary[];
  activeSurface: EdOperatingSurfaceDefinition | null;
  apiSurfaceId: OperatingSurfaceId | null;
  apiEndpoints: readonly string[];
  metrics: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>['metrics'];
}>;

export type HospitalOperatingContext = Readonly<{
  snapshot: HospitalOperatingSystemSnapshot;
  surface: EdOperatingSurfaceDefinition | null;
  phaseId: EdJourneyPhaseId | null;
  phaseLabel: string | null;
  phaseOrder: number | null;
  ownerRole: string;
  priority: EdOperatingPriority;
  primaryDecision: string;
  defaultNextAction: string;
  threeMinuteRelevant: boolean;
  situationBrief: WorkflowSituationBriefProps | null;
  topActionLabel: string | null;
  topActionRoute: string | null;
  isHospitalRoute: boolean;
}>;

type StoreSlice = Readonly<{
  patients?: Patient[];
  staff?: Staff[];
  emsArrivals?: EMSArrival[];
  alerts?: Alert[];
  capacity?: CapacitySnapshot;
  referrals?: Referral[];
}>;

function attentionTone(metrics: {
  threeMinuteBreaches: number;
  criticalAlerts: number;
  p1p2Patients: number;
  inboundEms: number;
}): WorkflowSituationBriefProps['tone'] {
  if (metrics.threeMinuteBreaches > 0 || metrics.criticalAlerts > 0) return 'critical';
  if (metrics.p1p2Patients > 0 || metrics.inboundEms > 0) return 'warning';
  return 'neutral';
}

function buildSituationBrief(
  surface: EdOperatingSurfaceDefinition,
  snapshot: HospitalOperatingSystemSnapshot,
  topAction: ReturnType<typeof buildCommandCenterWorkflowActions>[number] | null,
): WorkflowSituationBriefProps {
  const metrics = snapshot.metrics;
  const attentionParts: string[] = [];

  if (metrics.threeMinuteBreaches > 0) {
    attentionParts.push(
      `${metrics.threeMinuteBreaches} three-minute breach${metrics.threeMinuteBreaches === 1 ? '' : 'es'}`,
    );
  }
  if (metrics.criticalAlerts > 0) {
    attentionParts.push(
      `${metrics.criticalAlerts} critical alert${metrics.criticalAlerts === 1 ? '' : 's'}`,
    );
  }
  if (metrics.p1p2Patients > 0) {
    attentionParts.push(`${metrics.p1p2Patients} P1/P2`);
  }
  if (metrics.inboundEms > 0) {
    attentionParts.push(`${metrics.inboundEms} inbound EMS`);
  }

  const phaseSummary = snapshot.phases.find((phase) => phase.phaseId === surface.phaseId);
  // Live sweep 2026-08-21: this is a DEPARTMENT-WIDE active-patient count
  // (metrics.activePatients), not a count of anything specific to
  // `surface.label`'s own topic. The previous "${surface.label} — N active
  // patients" phrasing (e.g. "Referrals — 7 active patients") read as if the
  // number described referrals, directly contradicting the page's own
  // referral-specific counters (which correctly showed 0 with no referrals
  // recorded). Rephrased so the department-wide scope is explicit regardless
  // of which surface this renders on.
  const status = `${surface.label} — department has ${metrics.activePatients} active patient${metrics.activePatients === 1 ? '' : 's'}${
    phaseSummary?.activeCount ? ` · ${phaseSummary.activeCount} in ${phaseSummary.label}` : ''
  }`;

  return {
    status,
    attention: attentionParts.length ? attentionParts.join(' · ') : 'No P0 signals on this surface',
    owner: surface.ownerRole,
    nextAction: topAction?.active ? topAction.nextAction : surface.defaultNextAction,
    tone: attentionTone(metrics),
  };
}

function isHospitalOperationalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/emergency') ||
    pathname.startsWith('/reception') ||
    pathname.startsWith('/triage') ||
    pathname.startsWith('/queue') ||
    pathname.startsWith('/intake') ||
    pathname.startsWith('/alerts') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/reports')
  );
}

function countPatientsInPhase(
  patients: Patient[],
  referrals: Referral[],
  phaseId: EdJourneyPhaseId,
): number {
  return patients.filter((patient) => {
    if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
      return false;
    }
    const referral = referrals.find((entry) => entry.patientId === patient.id) ?? null;
    return resolvePatientJourneyPosition(patient, referral).phaseId === phaseId;
  }).length;
}

function buildPhaseSummaries(
  journey: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>,
  patients: Patient[],
  referrals: Referral[],
): readonly HospitalPhaseSummary[] {
  const stageStatusById = Object.fromEntries(
    journey.stages.map((stage) => [stage.id, stage.status]),
  );

  return Object.freeze(
    ED_JOURNEY_PHASES.map((phase) => {
      const stagesActive = phase.stageIds.filter(
        (stageId) => stageStatusById[stageId] === 'active',
      ).length;
      const stagesAttention = phase.stageIds.filter(
        (stageId) => stageStatusById[stageId] === 'attention',
      ).length;
      return Object.freeze({
        phaseId: phase.id,
        order: phase.order,
        label: phase.label,
        route: phase.route,
        activeCount: countPatientsInPhase(patients, referrals, phase.id),
        attentionCount: stagesAttention,
        stagesActive,
        stagesAttention,
      });
    }),
  );
}

function buildDepartmentSummaries(
  patients: Patient[],
  referrals: Referral[],
): readonly HospitalDepartmentSummary[] {
  const counts = new Map<HospitalDepartmentId, number>();

  for (const patient of patients) {
    if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased)
      continue;
    const referral = referrals.find((entry) => entry.patientId === patient.id) ?? null;
    const position = resolvePatientJourneyPosition(patient, referral);
    for (const departmentId of position.departmentIds) {
      counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1);
    }
  }

  return Object.freeze(
    listHospitalDepartments().map((department) =>
      Object.freeze({
        id: department.id,
        label: department.label,
        activePatients: counts.get(department.id) ?? 0,
        phaseIds: department.phaseIds,
      }),
    ),
  );
}

export function buildHospitalOperatingSystemSnapshot(
  options: StoreSlice & { pathname?: string } = {},
): HospitalOperatingSystemSnapshot {
  const patients = options.patients ?? [];
  const referrals = options.referrals ?? [];
  const journey = buildFullEmergencyCareJourneySnapshot({
    patients,
    staff: options.staff,
    emsArrivals: options.emsArrivals,
    alerts: options.alerts,
    capacity: options.capacity,
  });

  const pathname = options.pathname ?? '/';
  const activeSurface = resolveEdOperatingSurfaceFromPath(pathname);
  const apiSurfaceId = resolveApiOperatingSurfaceId(activeSurface?.surfaceId);

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    journey,
    phases: buildPhaseSummaries(journey, patients, referrals),
    departments: buildDepartmentSummaries(patients, referrals),
    activeSurface,
    apiSurfaceId,
    apiEndpoints: resolvePathBackendEndpoints(pathname),
    metrics: journey.metrics,
  });
}

export function buildHospitalOperatingContext(
  options: StoreSlice & { pathname?: string } = {},
): HospitalOperatingContext {
  const pathname = options.pathname ?? '/';
  const snapshot = buildHospitalOperatingSystemSnapshot(options);
  const isHospitalRoute = isHospitalOperationalPath(pathname);
  const surface = snapshot.activeSurface;

  if (!surface) {
    return Object.freeze({
      snapshot,
      surface: null,
      phaseId: null,
      phaseLabel: null,
      phaseOrder: null,
      ownerRole: 'Care team',
      priority: 'P3',
      primaryDecision: '',
      defaultNextAction: '',
      threeMinuteRelevant: false,
      situationBrief: null,
      topActionLabel: null,
      topActionRoute: null,
      isHospitalRoute,
    });
  }

  const commandActions = buildCommandCenterWorkflowActions({
    dispatch: snapshot.journey.liveServiceSummaries.dispatch,
    readiness: snapshot.journey.liveServiceSummaries.readiness,
    metrics: snapshot.metrics,
    staffRouting: snapshot.journey.liveServiceSummaries.staffRouting,
    bottlenecks: snapshot.journey.liveServiceSummaries.bottlenecks,
  });
  const topAction = commandActions.find((action) => action.active) ?? commandActions[0] ?? null;
  const phase = getEdJourneyPhase(surface.phaseId);

  return Object.freeze({
    snapshot,
    surface,
    phaseId: surface.phaseId,
    phaseLabel: phase.label,
    phaseOrder: phase.order,
    ownerRole: surface.ownerRole,
    priority: surface.priority,
    primaryDecision: surface.primaryDecision,
    defaultNextAction: surface.defaultNextAction,
    threeMinuteRelevant: surface.threeMinuteRelevant,
    situationBrief: buildSituationBrief(surface, snapshot, topAction),
    topActionLabel: topAction?.label ?? null,
    topActionRoute: topAction?.route ?? null,
    isHospitalRoute,
  });
}

export function resolvePatientHospitalJourney(
  patient: Patient,
  referrals: Referral[] = [],
): PatientJourneyPosition {
  const referral = referrals.find((entry) => entry.patientId === patient.id) ?? null;
  return resolvePatientJourneyPosition(patient, referral);
}

export async function fetchHospitalSurfaceBackendSnapshot(surfaceId: OperatingSurfaceId) {
  return fetchEmergencyOperatingSurface(surfaceId);
}

export function countPatientsAtJourneyStage(
  patients: Patient[],
  referrals: Referral[],
  stageId: EmergencyJourneyStageId,
): number {
  return patients.filter((patient) => {
    if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
      return false;
    }
    const referral = referrals.find((entry) => entry.patientId === patient.id) ?? null;
    return resolvePatientJourneyPosition(patient, referral).stageId === stageId;
  }).length;
}

export default {
  buildHospitalOperatingSystemSnapshot,
  buildHospitalOperatingContext,
  resolvePatientHospitalJourney,
  fetchHospitalSurfaceBackendSnapshot,
};
