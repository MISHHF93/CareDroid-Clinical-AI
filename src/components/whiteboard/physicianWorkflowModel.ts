import { PatientFlag, PatientState } from '../../types/emergency';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { PHYSICIAN_SCREEN_WIDGETS } from '../../config/physicianScreenModel';
import { summarizeReferralAwareness } from './referralAwarenessModel';
import { selectProviderWaitVisibilityMetrics } from '../../services/providerWaitVisibilityModel';
import { resolvePhysicianStripMetricIds } from '../../config/emergencyScreenKpiPolicy';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';

/** Operational strip surfaces aligned to PHYSICIAN_SCREEN widgets. */
export const PHYSICIAN_WORKFLOW_SURFACES = Object.freeze([
  PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
  PHYSICIAN_SCREEN_WIDGETS.assignedPatients,
  PHYSICIAN_SCREEN_WIDGETS.providerWaitingQueue,
  PHYSICIAN_SCREEN_WIDGETS.resultsPending,
  PHYSICIAN_SCREEN_WIDGETS.referralsPending,
  PHYSICIAN_SCREEN_WIDGETS.dispositionBoarders,
]);

/** Workflow launchers already in the product (card, palette, document events). */
export const PHYSICIAN_WORKFLOW_LAUNCHERS = Object.freeze([
  Object.freeze({
    id: 'review',
    label: 'Review patient',
    surfaces: ['PatientCard', 'PatientDetailPanel'],
    mechanism: 'selectPatient',
  }),
  Object.freeze({
    id: 'advance',
    label: 'Advance journey',
    surfaces: ['PatientCard', 'PatientDetailPanel'],
    mechanism: 'advancePatientJourneyState',
  }),
  Object.freeze({
    id: 'reassess',
    label: 'Reassessment',
    surfaces: ['PatientCard', 'CommandPalette', 'PhysicianOperationalStrip'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'refer',
    label: 'Referral / consult',
    surfaces: ['PatientCard', 'CommandPalette'],
    mechanism: 'referral-workflow',
  }),
  Object.freeze({
    id: 'discharge',
    label: 'Discharge review',
    surfaces: ['PatientCard', 'CommandPalette', 'Header'],
    mechanism: 'open-patient-discharge',
  }),
  Object.freeze({
    id: 'copilot',
    label: 'ED Copilot',
    surfaces: ['CommandPalette', 'Sidebar', 'PhysicianOperationalStrip'],
    mechanism: 'toggleCopilot',
  }),
  Object.freeze({
    id: 'complaint-workflow',
    label: 'Complaint workflow',
    surfaces: ['PatientDetailPanel', 'PatientCard'],
    mechanism: 'routeComplaint',
  }),
]);

export const PHYSICIAN_NAV_EXCLUDED_IDS = Object.freeze([
  'reception',
  'ems',
  'intake',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'integrations',
  'cosmos',
  'settings',
  'shift',
  'pulse',
]);

export const PHYSICIAN_NAV_ORDER = Object.freeze([
  'whiteboard',
  'patients',
  'copilot',
  'tools',
  'analytics',
  'platform',
  'fleet',
  'simulation',
  'knowledge',
  'ai-center',
]);

function hasPatientFlag(patient, flagType) {
  return (patient?.flags || []).some((flag) => {
    const type = typeof flag === 'string' ? flag : flag?.type;
    return type === flagType;
  });
}

function isBoardingForDisposition(patient) {
  return (
    patient?.state === PatientState.Admission ||
    patient?.state === PatientState.Disposition ||
    hasPatientFlag(patient, PatientFlag.PendingAdmission)
  );
}

function countResultsPendingPatients(patients = [] as any[]) {
  return patients.filter(
    (patient) =>
      patient.state === PatientState.Results ||
      patient.state === PatientState.Orders ||
      hasPatientFlag(patient, PatientFlag.ReassessmentDue),
  ).length;
}

function countAssignedPatients(patients = [] as any[], physicianStaffId: string | null = null) {
  if (!physicianStaffId) {
    return patients.filter(
      (patient) =>
        patient.state !== PatientState.Discharge &&
        patient.state !== PatientState.Deceased &&
        (patient.priority === 'P1' || patient.priority === 'P2'),
    ).length;
  }
  return patients.filter(
    (patient) =>
      patient.assignedStaffId === physicianStaffId &&
      patient.state !== PatientState.Discharge &&
      patient.state !== PatientState.Deceased,
  ).length;
}

export function isPhysicianRole(roleId) {
  return roleId === EMERGENCY_ROLE_IDS.physician;
}

export function shouldShowPhysicianOperationalStrip({
  screenMode = undefined as string | undefined,
  roleId = undefined as string | undefined,
  displayMode = false,
}: any = {}) {
  if (displayMode) return false;
  return screenMode === CARE_DROID_SCREEN_MODES.physician || isPhysicianRole(roleId);
}

/**
 * Physician command strip — assigned patients, provider wait, results, referrals, boarders.
 */
export function selectPhysicianOperationalStrip({
  patients = [] as any[],
  referrals = [] as any[],
  physicianStaffId = null as string | null,
  settings = {} as any,
  visibleSurfaces = null as any,
  stripMetricIds = null as any,
  now = new Date(),
} = {}) {
  const policyMetricIds =
    stripMetricIds || resolvePhysicianStripMetricIds(CARE_DROID_SCREEN_MODES.physician) || [];
  const providerWaitMetrics = selectProviderWaitVisibilityMetrics(patients, {
    settings,
    now,
    surface: 'physician',
  }).map((metric) => ({
    id: metric.id,
    label: metric.label,
    hint: metric.hint,
    value: metric.value,
    surface: PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
    tone: metric.tone || 'neutral',
    whiteboardAction: 'filter-waiting',
    routeKey: 'provider-wait',
  }));

  const assignedCount = countAssignedPatients(patients, physicianStaffId);
  const resultsPending = countResultsPendingPatients(patients);
  const referralSummary = summarizeReferralAwareness(referrals);
  const referralsPending = referralSummary.buckets.pending ?? 0;
  const dispositionBoarders = patients.filter(isBoardingForDisposition).length;

  const clinicalMetrics = [
    {
      id: 'assigned',
      label: physicianStaffId ? 'My patients' : 'Relevant',
      hint: physicianStaffId ? 'Assigned to you' : 'High-priority department patients',
      value: assignedCount,
      surface: PHYSICIAN_SCREEN_WIDGETS.assignedPatients,
      tone: assignedCount >= 6 ? 'warning' : assignedCount ? 'info' : 'neutral',
      whiteboardAction: 'filter-assigned',
      routeKey: 'assigned',
    },
    {
      id: 'results',
      label: 'Results pending',
      hint: 'Orders / results awaiting review',
      value: resultsPending,
      surface: PHYSICIAN_SCREEN_WIDGETS.resultsPending,
      tone: resultsPending >= 4 ? 'warning' : resultsPending ? 'info' : 'neutral',
      whiteboardAction: 'filter-results',
      routeKey: 'results',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      hint: 'Pending consult / transfer queue',
      value: referralsPending,
      surface: PHYSICIAN_SCREEN_WIDGETS.referralsPending,
      tone: referralsPending >= 3 ? 'warning' : referralsPending ? 'info' : 'neutral',
      whiteboardAction: 'filter-referral-pending',
      routeKey: 'referrals',
    },
    {
      id: 'boarders',
      label: 'Boarders',
      hint: 'Admission / disposition boarding',
      value: dispositionBoarders,
      surface: PHYSICIAN_SCREEN_WIDGETS.dispositionBoarders,
      tone: dispositionBoarders ? 'warning' : 'neutral',
      whiteboardAction: 'filter-boarding',
      routeKey: 'boarding',
    },
  ];

  let filteredProviderMetrics = providerWaitMetrics;
  if (policyMetricIds.length) {
    const allowed = new Set(policyMetricIds);
    filteredProviderMetrics = providerWaitMetrics.filter((metric) => allowed.has(metric.id));
  }

  const metrics = [...filteredProviderMetrics, ...clinicalMetrics];

  if (!visibleSurfaces?.length) return metrics;
  const allowed = new Set(visibleSurfaces);
  return metrics.filter((metric) => allowed.has(metric.surface));
}

export function resolvePatientCardWorkflowProfile({
  roleId = undefined as string | undefined,
  screenMode = undefined as string | undefined,
  displayMode = false,
  canMutateWhiteboard = false,
  isRegistrationClerk = false,
}: any = {}) {
  if (displayMode) return 'none';
  if (screenMode === CARE_DROID_SCREEN_MODES.physician || isPhysicianRole(roleId))
    return 'physician';
  if (canMutateWhiteboard && !isRegistrationClerk) return 'charge';
  return 'none';
}

export function physicianCardActionIds(profile) {
  if (profile !== 'physician') return [];
  return ['review', 'advance', 'reassess', 'refer', 'discharge', 'copilot', 'complaint-workflow'];
}
