import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import { patientMatchesReassessmentAttention } from './reassessmentVisibilityModel';
import {
  SHIFT_HANDOFF_CLINICAL_ROLES,
  SHIFT_HANDOFF_SIGNAL_IDS,
  auditShiftHandoffSurfaces,
  evaluateShiftHandoffReadability,
} from './shiftHandoffReadabilityAudit';

export {
  SHIFT_HANDOFF_CLINICAL_ROLES,
  SHIFT_HANDOFF_SIGNAL_IDS,
  auditShiftHandoffSurfaces,
  evaluateShiftHandoffReadability,
};

const CLINICAL_HANDOFF_ROLES = new Set(SHIFT_HANDOFF_CLINICAL_ROLES);

function hasFlag(patient, flag) {
  return patient.flags?.some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

export function countWaitingPatients(patients = [] as any[]) {
  return patients.filter((patient) => patient.state === PatientState.Waiting).length;
}

export function countHighRiskPatients(patients = [] as any[]) {
  return patients.filter((patient) => {
    if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
      return false;
    }
    return (
      patient.priority === Priority.P1 ||
      patient.priority === Priority.P2 ||
      hasFlag(patient, PatientFlag.HighRisk) ||
      hasFlag(patient, PatientFlag.DeteriorationRisk) ||
      hasFlag(patient, PatientFlag.SepsisAlert)
    );
  }).length;
}

export function countBoardingPatients(patients = [] as any[]) {
  return patients.filter(
    (patient) =>
      patient.state === PatientState.Admission || hasFlag(patient, PatientFlag.PendingAdmission),
  ).length;
}

export function countReassessmentDuePatients(patients = [] as any[]) {
  return patients.filter(patientMatchesReassessmentAttention).length;
}

export function shouldShowShiftHandoffStrip({
  roleId = undefined as string | undefined,
  displayMode = false,
  isRegistrationClerk = false,
}: any = {}) {
  if (displayMode || isRegistrationClerk) return false;
  return CLINICAL_HANDOFF_ROLES.has(roleId);
}

/**
 * Five-metric shift snapshot for nurse/physician handoff — one glance, one click to filter.
 */
export function selectShiftHandoffMetrics({
  patients = [] as any[],
  emsInbound = 0,
  reassessmentDue = null,
  boarderCount = null,
}: any = {}) {
  const waiting = countWaitingPatients(patients);
  const highRisk = countHighRiskPatients(patients);
  const reassess = reassessmentDue ?? countReassessmentDuePatients(patients);
  const boarders = boarderCount ?? countBoardingPatients(patients);
  const ems = Number(emsInbound) || 0;

  return Object.freeze([
    Object.freeze({
      id: 'waiting',
      label: 'Waiting',
      hint: 'Patients in the waiting room queue',
      value: waiting,
      tone: waiting >= 20 ? 'warning' : waiting > 0 ? 'neutral' : 'success',
      whiteboardAction: 'filter-waiting',
    }),
    Object.freeze({
      id: 'high-risk',
      label: 'High risk',
      hint: 'P1/P2 or deterioration, sepsis, high-risk flags',
      value: highRisk,
      tone: highRisk ? 'critical' : 'success',
      whiteboardAction: 'filter-high-risk',
    }),
    Object.freeze({
      id: 'ems',
      label: 'EMS inbound',
      hint: 'Ambulances inbound or awaiting handoff',
      value: ems,
      tone: ems ? 'info' : 'success',
      whiteboardAction: 'filter-ems',
    }),
    Object.freeze({
      id: 'reassess',
      label: 'Reassess due',
      hint: 'Patients flagged for reassessment',
      value: reassess,
      tone: reassess ? 'warning' : 'success',
      whiteboardAction: 'open-reassessment',
    }),
    Object.freeze({
      id: 'boarders',
      label: 'Boarders',
      hint: 'Patients awaiting inpatient bed',
      value: boarders,
      tone: boarders ? 'warning' : 'success',
      whiteboardAction: 'filter-boarding',
    }),
  ]);
}
