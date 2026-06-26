import { PatientFlag, PatientState } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { CHARGE_NURSE_SCREEN_WIDGETS } from '../../config/chargeNurseScreenModel';
import { selectProviderWaitVisibilityMetrics } from '../../services/providerWaitVisibilityModel';
import { selectTriageBreachVisibilityMetrics } from '../../services/triageBreachVisibilityModel';
import { selectEmsOffloadVisibilityMetrics } from '../../services/emsOffloadVisibilityModel';
import { selectWaitingRoomSafetyEscalationMetrics } from '../../services/waitingRoomSafetyEscalationVisibilityModel';
import { summarizeEmsAwareness } from './emsAwarenessModel';
import { summarizeReferralAwareness } from './referralAwarenessModel';
import { buildCrowdLevelSnapshot, crowdLevelToneToOperationalTone } from '../../engine/crowdLevelEngine';

/** Operational strip surfaces aligned to CHARGE_NURSE_SCREEN widgets. */
export const CHARGE_NURSE_WORKFLOW_SURFACES = Object.freeze([
  CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
  CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
  CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation,
  CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
  CHARGE_NURSE_SCREEN_WIDGETS.emsInbound,
  CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays,
  CHARGE_NURSE_SCREEN_WIDGETS.boarders,
  CHARGE_NURSE_SCREEN_WIDGETS.referralsPending,
  CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
  CHARGE_NURSE_SCREEN_WIDGETS.crowdLevel,
]);

const CHARGE_STRIP_SCREEN_MODES = new Set([
  CARE_DROID_SCREEN_MODES.chargeNurse,
  CARE_DROID_SCREEN_MODES.commandCenter,
]);

function countBoardingPatients(patients = [] as any[]) {
  return patients.filter(
    (patient) =>
      patient.state === PatientState.Admission ||
      patient.flags?.some((flag) =>
        typeof flag === 'string' ? flag === PatientFlag.PendingAdmission : flag?.type === PatientFlag.PendingAdmission,
      ),
  ).length;
}

function countReassessmentPatients(patients = [] as any[]) {
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

export function shouldShowChargeNurseOperationalStrip({ screenMode = (undefined as string | undefined), roleId = (undefined as string | undefined), displayMode = false }: any = {}) {
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
  patients = ([] as any[]),
  centralSnapshot = null as any,
  activeEmsArrivals = 0,
  emsArrivals = ([] as any[]),
  referrals = ([] as any[]),
  capacity = (undefined as any),
  settings = {} as any,
  visibleSurfaces = null as any,
  kpiMetricIds = null as any,
  workflowLogs = [] as any[],
  alerts = [] as any[],
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
  const offloadTargetMinutes =
    Number(settings?.thresholds?.emsOffloadTargetMinutes ?? settings?.thresholds?.emsOffloadTargetMin ?? 15) ||
    15;

  const crowdLevel = buildCrowdLevelSnapshot({
    patients,
    capacity:
      capacity ||
      (centralSnapshot?.capacityStatus
        ? {
            score: centralSnapshot.capacityStatus.score,
            band: centralSnapshot.capacityStatus.band,
            waitingCount,
            updatedAt: centralSnapshot.generatedAt || new Date().toISOString(),
            totalPatients: patients.length,
            occupiedRooms: 0,
            boardingCount: boarders,
            reassessmentDue,
          }
        : null),
    emsArrivals,
    emsInbound: emsSignals,
    emsOffloadDelays: offloadDelays,
    queueBreaches: breachedQueues,
    settings,
    now,
  });

  const triageBreachMetrics = selectTriageBreachVisibilityMetrics(patients, {
    settings,
    now,
    surface: 'chargeNurse',
  }).map((metric) => ({
    id: metric.id,
    label: metric.label,
    hint: metric.hint,
    value: metric.value,
    surface: CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
    tone: metric.tone || 'neutral',
    whiteboardAction: 'filter-pretriage',
    routeKey: 'pretriage',
  }));

  const providerWaitBreachMetrics = selectProviderWaitVisibilityMetrics(patients, {
    settings,
    now,
    surface: 'chargeNurse',
  }).map((metric) => ({
    id: metric.id,
    label: metric.label,
    hint: metric.hint,
    value: metric.value,
    surface: CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
    tone: metric.tone || 'neutral',
    whiteboardAction: 'filter-waiting',
    routeKey: 'waiting',
  }));

  const emsOffloadMetrics = selectEmsOffloadVisibilityMetrics(emsArrivals, {
    patients,
    now,
    offloadTargetMinutes,
    surface: 'chargeNurse',
  }).map((metric) => ({
    id: metric.id,
    label: metric.label,
    hint: metric.hint,
    value: metric.value,
    surface: CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
    tone: metric.tone || 'neutral',
    whiteboardAction: metric.id === 'offload-delays' ? 'focus-ems-offload' : 'filter-ems',
    routeKey: metric.id === 'offload-delays' ? 'ems-offload' : 'ems',
  }));

  const safetyEscalationMetrics = selectWaitingRoomSafetyEscalationMetrics(patients, {
    workflowLogs,
    alerts,
    now,
    surface: 'chargeNurse',
    communicationOverdueMinutes:
      Number(settings?.thresholds?.communicationOverdueMinutes ?? 30) || 30,
  }).map((metric) => ({
    id: metric.id,
    label: metric.label,
    hint: metric.hint,
    value: metric.value,
    surface: CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation,
    tone: metric.tone || 'neutral',
    whiteboardAction: 'filter-waiting',
    routeKey: 'waiting',
  }));

  const metrics = [
    ...triageBreachMetrics,
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
    ...providerWaitBreachMetrics,
    ...safetyEscalationMetrics,
    ...emsOffloadMetrics,
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
    {
      id: 'crowd-level',
      label: 'Crowd level',
      hint: crowdLevel.detail,
      value: crowdLevel.staffLabel,
      surface: CHARGE_NURSE_SCREEN_WIDGETS.crowdLevel,
      tone: crowdLevelToneToOperationalTone(crowdLevel.tone),
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
