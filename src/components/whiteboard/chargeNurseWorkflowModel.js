import { PatientFlag, PatientState } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { CHARGE_NURSE_SCREEN_WIDGETS } from '../../config/chargeNurseScreenModel';
import { summarizeProviderWaitBreachBoard } from '../../services/providerWaitBreachTimer';
import { summarizeEmsAwareness } from './emsAwarenessModel';
import { summarizeReferralAwareness } from './referralAwarenessModel';

/** Operational strip surfaces aligned to CHARGE_NURSE_SCREEN widgets. */
export const CHARGE_NURSE_WORKFLOW_SURFACES = Object.freeze([
  CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
  CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
  CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  CHARGE_NURSE_SCREEN_WIDGETS.emsInbound,
  CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays,
  CHARGE_NURSE_SCREEN_WIDGETS.boarders,
  CHARGE_NURSE_SCREEN_WIDGETS.referralsPending,
  CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
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
 * Charge nurse command strip metrics — queue health, reassessment, provider wait,
 * EMS inbound, offload, boarders, referrals, and capacity.
 * Values prefer central-node snapshot; falls back to live patient board counts.
 */
export function selectChargeNurseOperationalStrip({
  patients = [],
  centralSnapshot = null,
  activeEmsArrivals = 0,
  emsArrivals = [],
  referrals = [],
  settings = {},
  visibleSurfaces = null,
  kpiMetricIds = null,
  now = new Date(),
} = {}) {
  const queueHealth = centralSnapshot?.queueHealth ?? [];
  const breachedQueues = queueHealth.filter((queue) => queue.breached).length;
  const waitingCount =
    centralSnapshot?.currentDepartmentStatus?.waitingPatients ??
    patients.filter((patient) => patient.state === PatientState.Waiting).length;
  const triageWaiting = patients.filter(
    (patient) =>
      patient.state === PatientState.Triage || patient.state === PatientState.Waiting,
  ).length;
  const queuePressure = breachedQueues || triageWaiting;

  const reassessmentDue =
    centralSnapshot?.reassessmentStatus?.due ?? countReassessmentPatients(patients);
  const providerWaitBreach = summarizeProviderWaitBreachBoard(patients, { settings, now });
  const providerWaitBreaches = providerWaitBreach.breachedCount;
  const emsInbound = centralSnapshot?.emsPressure?.inbound ?? 0;
  const emsAwareness = summarizeEmsAwareness(emsArrivals, now.getTime(), { patients });
  const emsSignals = emsInbound + Number(activeEmsArrivals || 0);
  const offloadDelays =
    centralSnapshot?.emsPressure?.delayedOffload ??
    emsAwareness.delayedOffloadCount ??
    emsAwareness.awaitingHandoff ??
    0;
  const capacityScore = centralSnapshot?.capacityStatus?.score ?? null;
  const capacityBand = centralSnapshot?.capacityStatus?.band ?? '—';
  const boarders = centralSnapshot?.boardingStatus?.boarders ?? countBoardingPatients(patients);
  const boardingRisk = centralSnapshot?.boardingStatus?.risk ?? 'normal';
  const referralSummary = summarizeReferralAwareness(referrals);
  const referralsPending =
    centralSnapshot?.referralStatus?.pending ?? referralSummary.buckets.pending ?? 0;

  const metrics = [
    {
      id: 'waiting-count',
      label: 'Waiting',
      hint: 'Patients in the waiting room queue',
      value: waitingCount,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
      tone:
        waitingCount >= 12
          ? 'critical'
          : waitingCount >= 6
            ? 'warning'
            : 'neutral',
      whiteboardAction: 'filter-waiting',
      routeKey: 'waiting',
    },
    {
      id: 'queues',
      label: breachedQueues ? 'Queues breached' : 'Queue health',
      hint: 'Triage + waiting pressure',
      value: queuePressure,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
      tone: breachedQueues ? 'critical' : triageWaiting >= 8 ? 'warning' : 'neutral',
      whiteboardAction: 'focus-queues',
      routeKey: 'queues',
    },
    {
      id: 'reassessments',
      label: 'Reassessments',
      hint: 'Due on the active board',
      value: reassessmentDue,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
      tone: reassessmentDue ? 'warning' : 'neutral',
      whiteboardAction: 'open-reassessment',
      routeKey: 'reassessment',
    },
    {
      id: 'provider-wait',
      label: 'Provider wait',
      hint: `${providerWaitBreach.approachingThresholdCount} approaching · triage-to-provider CTAS thresholds`,
      value: providerWaitBreaches,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
      tone:
        providerWaitBreaches >= 3
          ? 'critical'
          : providerWaitBreaches
            ? 'warning'
            : 'neutral',
      whiteboardAction: 'filter-waiting',
      routeKey: 'waiting',
    },
    {
      id: 'ems',
      label: 'EMS inbound',
      hint: 'Inbound + active arrivals',
      value: emsSignals,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.emsInbound,
      tone: emsSignals ? 'info' : 'neutral',
      whiteboardAction: 'filter-ems',
      routeKey: 'ems',
    },
    {
      id: 'offload',
      label: 'Offload delays',
      hint: 'Units awaiting handoff completion',
      value: offloadDelays,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays,
      tone:
        (emsAwareness.longestOffloadMinutes ?? 0) >= 15
          ? 'critical'
          : offloadDelays
            ? 'warning'
            : 'neutral',
      whiteboardAction: 'focus-ems-offload',
      routeKey: 'ems-offload',
    },
    {
      id: 'boarding',
      label: 'Boarders',
      hint: `Boarding risk: ${boardingRisk}`,
      value: boarders,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.boarders,
      tone: boarders ? 'warning' : 'neutral',
      whiteboardAction: 'filter-boarding',
      routeKey: 'boarding',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      hint: 'Pending consult / transfer queue',
      value: referralsPending,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.referralsPending,
      tone: referralsPending >= 5 ? 'critical' : referralsPending ? 'warning' : 'neutral',
      whiteboardAction: 'filter-referral-pending',
      routeKey: 'referrals',
    },
    {
      id: 'capacity',
      label: 'Capacity',
      hint: 'Department capacity score',
      value: capacityScore === null ? capacityBand : `${capacityScore} ${capacityBand}`,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
      tone:
        capacityBand === 'Red'
          ? 'critical'
          : capacityBand === 'Orange' || capacityBand === 'Yellow'
            ? 'warning'
            : 'success',
      whiteboardAction: 'focus-capacity',
      routeKey: 'capacity',
    },
  ];

  let filtered = metrics;
  if (kpiMetricIds?.length) {
    const allowedKpis = new Set(kpiMetricIds);
    filtered = filtered.filter((metric) => allowedKpis.has(metric.id));
  } else if (visibleSurfaces?.length) {
    const allowed = new Set(visibleSurfaces);
    filtered = filtered.filter((metric) => allowed.has(metric.surface));
  }
  return filtered;
}
