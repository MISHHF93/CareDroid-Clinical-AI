import { PatientFlag, PatientState } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';

export const CHARGE_NURSE_WORKFLOW_SURFACES = Object.freeze([
  'queues',
  'reassessments',
  'ems',
  'capacity',
  'boarding',
]);

const CHARGE_STRIP_SCREEN_MODES = new Set([
  CARE_DROID_SCREEN_MODES.chargeNurse,
  CARE_DROID_SCREEN_MODES.commandCenter,
]);

function countBoardingPatients(patients = []) {
  return patients.filter(
    (patient) =>
      patient.state === PatientState.Admission ||
      patient.flags?.some((flag) =>
        typeof flag === 'string' ? flag === PatientFlag.PendingAdmission : flag?.type === PatientFlag.PendingAdmission,
      ),
  ).length;
}

function countReassessmentPatients(patients = []) {
  return patients.filter((patient) =>
    patient.flags?.some((flag) => {
      const type = typeof flag === 'string' ? flag : flag?.type;
      return (
        type === PatientFlag.ReassessmentDue ||
        type === PatientFlag.DeteriorationRisk ||
        type === PatientFlag.SepsisAlert
      );
    }),
  ).length;
}

export function shouldShowChargeNurseOperationalStrip({ screenMode, roleId, displayMode = false } = {}) {
  if (displayMode) return false;
  return (
    CHARGE_STRIP_SCREEN_MODES.has(screenMode) || roleId === EMERGENCY_ROLE_IDS.chargeNurse
  );
}

/**
 * Charge nurse command strip metrics — queues, reassessments, EMS, capacity, boarding.
 * Values prefer central-node snapshot; falls back to live patient board counts.
 */
export function selectChargeNurseOperationalStrip({
  patients = [],
  centralSnapshot = null,
  activeEmsArrivals = 0,
} = {}) {
  const queueHealth = centralSnapshot?.queueHealth ?? [];
  const breachedQueues = queueHealth.filter((queue) => queue.breached).length;
  const triageWaiting = patients.filter(
    (patient) =>
      patient.state === PatientState.Triage || patient.state === PatientState.Waiting,
  ).length;
  const queuePressure = breachedQueues || triageWaiting;

  const reassessmentDue =
    centralSnapshot?.reassessmentStatus?.due ?? countReassessmentPatients(patients);
  const emsInbound = centralSnapshot?.emsPressure?.inbound ?? 0;
  const emsSignals = emsInbound + Number(activeEmsArrivals || 0);
  const capacityScore = centralSnapshot?.capacityStatus?.score ?? null;
  const capacityBand = centralSnapshot?.capacityStatus?.band ?? '—';
  const boarders = centralSnapshot?.boardingStatus?.boarders ?? countBoardingPatients(patients);
  const boardingRisk = centralSnapshot?.boardingStatus?.risk ?? 'normal';

  return [
    {
      id: 'queues',
      label: breachedQueues ? 'Queues breached' : 'Queues',
      hint: 'Triage + waiting pressure',
      value: queuePressure,
      surface: 'queues',
      tone: breachedQueues ? 'critical' : triageWaiting >= 8 ? 'warning' : 'neutral',
      whiteboardAction: 'focus-queues',
      routeKey: 'queues',
    },
    {
      id: 'reassessments',
      label: 'Reassessments',
      hint: 'Due on the active board',
      value: reassessmentDue,
      surface: 'reassessments',
      tone: reassessmentDue ? 'warning' : 'neutral',
      whiteboardAction: 'open-reassessment',
      routeKey: 'reassessment',
    },
    {
      id: 'ems',
      label: 'EMS',
      hint: 'Inbound + active arrivals',
      value: emsSignals,
      surface: 'ems',
      tone: emsSignals ? 'info' : 'neutral',
      whiteboardAction: 'filter-ems',
      routeKey: 'ems',
    },
    {
      id: 'capacity',
      label: 'Capacity',
      hint: 'Department capacity score',
      value: capacityScore === null ? capacityBand : `${capacityScore} ${capacityBand}`,
      surface: 'capacity',
      tone:
        capacityBand === 'Red'
          ? 'critical'
          : capacityBand === 'Orange' || capacityBand === 'Yellow'
            ? 'warning'
            : 'success',
      whiteboardAction: 'focus-capacity',
      routeKey: 'capacity',
    },
    {
      id: 'boarding',
      label: 'Boarding',
      hint: `Boarding risk: ${boardingRisk}`,
      value: boarders,
      surface: 'boarding',
      tone: boarders ? 'warning' : 'neutral',
      whiteboardAction: 'filter-boarding',
      routeKey: 'boarding',
    },
  ];
}
