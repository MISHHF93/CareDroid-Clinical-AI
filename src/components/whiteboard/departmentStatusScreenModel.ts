import { PatientState, Priority, type CapacitySnapshot, type EMSArrival, type Patient, type Referral, type Staff } from '../../types/emergency';
import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import { summarizeDeteriorationWatchBoard } from '../../services/waitingRoomDeteriorationWatch';
import { summarizeLwbsRiskBoard } from '../../services/lwbsRiskLayer';
import {
  QUEUE_REASON_DEFINITIONS,
  summarizeQueueReasonBoard,
  type QueueReasonId,
} from '../../services/queueReasonVisibility';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import { summarizeProviderWaitBreachBoard } from '../../services/providerWaitBreachTimer';
import { buildEmsOffloadVisibilitySnapshot } from '../../services/emsOffloadVisibilityModel';
import { summarizeEmsAwareness } from './emsAwarenessModel';
import { summarizeReferralAwareness } from './referralAwarenessModel';
import { patientMatchesReassessmentAttention } from './reassessmentVisibilityModel';

export type DepartmentStatusTone = 'stable' | 'info' | 'watch' | 'warning' | 'critical';

export type DepartmentStatusMetricId =
  | 'waiting-count'
  | 'longest-wait'
  | 'triage-pending'
  | 'triage-breached'
  | 'provider-wait-breached'
  | 'reassessments-due'
  | 'lwbs-elevated'
  | 'deterioration-watch'
  | 'queue-pressure'
  | 'ems-inbound'
  | 'offload-delays'
  | 'offload-duration'
  | 'handoff-pending'
  | 'boarders'
  | 'referrals-pending'
  | 'capacity-status';

export type DepartmentStatusMetric = {
  id: DepartmentStatusMetricId;
  label: string;
  value: string | number;
  tone: DepartmentStatusTone;
  detail: string;
};

export type DepartmentStatusSnapshot = {
  metrics: DepartmentStatusMetric[];
  updatedAt: string | null;
  summaryLine: string;
};

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function formatDepartmentDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function capacityTone(band: string | undefined): DepartmentStatusTone {
  if (band === 'Red') return 'critical';
  if (band === 'Orange') return 'warning';
  if (band === 'Yellow') return 'watch';
  return 'stable';
}

function isBoardingPatient(patient: Patient): boolean {
  return patient.state === PatientState.Admission || patient.state === PatientState.Disposition;
}

export function buildDepartmentStatusSnapshot(input: {
  patients?: Patient[];
  capacity?: CapacitySnapshot;
  emsArrivals?: EMSArrival[];
  referrals?: Referral[];
  staff?: Staff[];
  rooms?: Array<{ id: string }>;
  now?: Date;
  updatedAt?: string | null;
  offloadTargetMinutes?: number;
  emergencySettings?: Record<string, unknown>;
} = {}): DepartmentStatusSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const capacity = input.capacity;
  const referrals = input.referrals || [];
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const triagePendingPatients = patients.filter((patient) => patient.state === PatientState.Triage);
  const arrivalControl = buildArrivalControlSummary(patients);
  const triagePending = Math.max(
    triagePendingPatients.length,
    Number(arrivalControl.triagePending) || 0,
  );
  const reassessmentsDue = patients.filter(patientMatchesReassessmentAttention).length;
  const triageBreach = summarizeTriageBreachBoard(patients, {
    settings: { emergencySettings: input.emergencySettings },
  });
  const providerWaitBreach = summarizeProviderWaitBreachBoard(patients, {
    settings: { emergencySettings: input.emergencySettings },
    now,
  });
  const lwbsCounts = summarizeLwbsRiskBoard(patients);
  const lwbsElevated = lwbsCounts.elevated + lwbsCounts.high;
  const deteriorationCounts = summarizeDeteriorationWatchBoard(patients, {
    emsArrivals: input.emsArrivals,
  });
  const deteriorationWatch =
    deteriorationCounts['review-needed'] + deteriorationCounts['urgent-review'];
  const queueReasonCounts = summarizeQueueReasonBoard(patients, {
    referrals: input.referrals,
    staff: input.staff,
  });
  const topQueueReason = (Object.entries(queueReasonCounts) as Array<[QueueReasonId, number]>)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])[0];
  const topQueueReasonDef = topQueueReason
    ? QUEUE_REASON_DEFINITIONS.find((reason) => reason.id === topQueueReason[0])
    : null;
  const boarders =
    capacity?.boardingCount ?? patients.filter(isBoardingPatient).length;
  const referralSummary = summarizeReferralAwareness(referrals);
  const referralsPending = referralSummary.buckets.pending;
  const emsAwareness = summarizeEmsAwareness(input.emsArrivals || [], now.getTime(), {
    patients,
    staff: input.staff,
    rooms: input.rooms,
    offloadTargetMinutes: input.offloadTargetMinutes,
  });
  const emsVisibility = buildEmsOffloadVisibilitySnapshot(input.emsArrivals || [], {
    patients,
    staff: input.staff,
    rooms: input.rooms,
    now,
    offloadTargetMinutes: input.offloadTargetMinutes ?? 15,
  });
  const longestWaitMinutes =
    capacity?.longestWaitMinutes ??
    waitingPatients.reduce(
      (max, patient) =>
        Math.max(max, minutesSince(patient.triageTime || patient.arrivalTime, now)),
      0,
    );

  const metrics: DepartmentStatusMetric[] = [
    {
      id: 'waiting-count',
      label: 'Waiting',
      value: waitingPatients.length,
      tone: waitingPatients.length >= 12 ? 'critical' : waitingPatients.length >= 6 ? 'warning' : 'stable',
      detail: 'Patients in the waiting room queue',
    },
    {
      id: 'longest-wait',
      label: 'Longest wait',
      value: formatDepartmentDuration(longestWaitMinutes),
      tone:
        longestWaitMinutes >= 120
          ? 'critical'
          : longestWaitMinutes >= 60
            ? 'warning'
            : longestWaitMinutes >= 30
              ? 'watch'
              : 'stable',
      detail: 'Longest active wait duration — no patient identifiers',
    },
    {
      id: 'triage-pending',
      label: 'Triage pending',
      value: triagePending,
      tone: triagePending >= 4 ? 'critical' : triagePending >= 2 ? 'warning' : triagePending ? 'watch' : 'stable',
      detail: 'Patients awaiting triage nurse review',
    },
    {
      id: 'reassessments-due',
      label: 'Reassessments due',
      value: reassessmentsDue,
      tone: reassessmentsDue >= 5 ? 'critical' : reassessmentsDue >= 2 ? 'warning' : reassessmentsDue ? 'watch' : 'stable',
      detail: 'Patients flagged for reassessment',
    },
    {
      id: 'triage-breached',
      label: 'Triage breached',
      value: triageBreach.breachedCount,
      tone:
        triageBreach.breachedCount >= 3
          ? 'critical'
          : triageBreach.breachedCount
            ? 'warning'
            : 'stable',
      detail: `Door-to-triage target ${triageBreach.targetMinutes}m · longest ${triageBreach.longestElapsedLabel}`,
    },
    {
      id: 'provider-wait-breached',
      label: 'Provider wait breached',
      value: providerWaitBreach.breachedCount,
      tone:
        providerWaitBreach.breachedCount >= 3
          ? 'critical'
          : providerWaitBreach.breachedCount
            ? 'warning'
            : 'stable',
      detail: `${providerWaitBreach.approachingThresholdCount} approaching · CTAS triage-to-provider thresholds`,
    },
    {
      id: 'lwbs-elevated',
      label: 'LWBS risk elevated',
      value: lwbsElevated,
      tone: lwbsElevated >= 3 ? 'critical' : lwbsElevated ? 'warning' : 'stable',
      detail: 'Advisory waiting-room leave-without-being-seen risk signals',
    },
    {
      id: 'deterioration-watch',
      label: 'Deterioration watch',
      value: deteriorationWatch,
      tone: deteriorationWatch >= 2 ? 'critical' : deteriorationWatch ? 'warning' : 'stable',
      detail: 'Patients needing staff re-review in the waiting room',
    },
    {
      id: 'queue-pressure',
      label: 'Queue pressure',
      value: topQueueReason ? topQueueReason[1] : 0,
      tone:
        topQueueReason && topQueueReason[1] >= 5
          ? 'warning'
          : topQueueReason
            ? 'watch'
            : 'stable',
      detail: topQueueReasonDef
        ? `${topQueueReasonDef.label} — aggregate count only`
        : 'No dominant queue reason detected',
    },
    {
      id: 'ems-inbound',
      label: 'EMS inbound',
      value: emsAwareness.inboundCount,
      tone:
        emsAwareness.soonestEtaMinutes !== null && emsAwareness.soonestEtaMinutes <= 10
          ? 'critical'
          : emsAwareness.inboundCount
            ? 'info'
            : 'stable',
      detail: emsAwareness.soonestEtaLabel
        ? `Next arrival ${emsAwareness.soonestEtaLabel}`
        : 'Ambulance units en route',
    },
    {
      id: 'offload-delays',
      label: 'Offload delays',
      value: emsVisibility.offloadDelaysCount,
      tone:
        (emsVisibility.longestOffloadMinutes ?? 0) >= (input.offloadTargetMinutes ?? 15)
          ? 'critical'
          : emsVisibility.offloadDelaysCount
            ? 'warning'
            : 'stable',
      detail:
        emsVisibility.longestOffloadMinutes != null
          ? `Longest offload ${formatDepartmentDuration(emsVisibility.longestOffloadMinutes)}`
          : 'Units past offload target',
    },
    {
      id: 'offload-duration',
      label: 'Offload duration',
      value: emsVisibility.offloadDurationLabel,
      tone:
        emsVisibility.longestOffloadMinutes >= (input.offloadTargetMinutes ?? 15)
          ? 'critical'
          : emsVisibility.averageOffloadMinutes >= 10
            ? 'warning'
            : emsVisibility.handoffPendingCount
              ? 'watch'
              : 'stable',
      detail: `Average ${formatDepartmentDuration(emsVisibility.averageOffloadMinutes)} · target ${emsVisibility.offloadTargetMinutes}m`,
    },
    {
      id: 'handoff-pending',
      label: 'Handoff pending',
      value: emsVisibility.handoffPendingCount,
      tone:
        emsVisibility.handoffPendingCount >= 2
          ? 'warning'
          : emsVisibility.handoffPendingCount
            ? 'watch'
            : 'stable',
      detail: 'Crews on scene awaiting triage handoff completion',
    },
    {
      id: 'boarders',
      label: 'Boarders',
      value: boarders,
      tone: boarders >= 8 ? 'critical' : boarders >= 4 ? 'warning' : boarders ? 'watch' : 'stable',
      detail: 'Admission boarding patients in department',
    },
    {
      id: 'referrals-pending',
      label: 'Referrals pending',
      value: referralsPending,
      tone: referralsPending >= 5 ? 'warning' : referralsPending ? 'watch' : 'stable',
      detail: 'Specialty referrals awaiting response',
    },
    {
      id: 'capacity-status',
      label: 'Capacity',
      value: capacity ? `${capacity.score} · ${capacity.band}` : '—',
      tone: capacityTone(capacity?.band),
      detail: capacity ? `Department capacity score ${capacity.score}/100` : 'Capacity unavailable',
    },
  ];

  const summaryLine = [
    `${waitingPatients.length} waiting`,
    `${triagePending} triage pending`,
    triageBreach.breachedCount ? `${triageBreach.breachedCount} triage breached` : null,
    `${emsAwareness.inboundCount} EMS inbound`,
    emsAwareness.delayedOffloadCount ? `${emsAwareness.delayedOffloadCount} offload delays` : null,
    capacity ? `${capacity.band} capacity` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    metrics,
    updatedAt: input.updatedAt || capacity?.updatedAt || now.toISOString(),
    summaryLine,
  };
}

export function filterDepartmentStatusSnapshot(
  snapshot: DepartmentStatusSnapshot,
  visibleMetricIds: readonly DepartmentStatusMetricId[],
): DepartmentStatusSnapshot {
  const allowed = new Set(visibleMetricIds);
  const metrics = snapshot.metrics.filter((metric) => allowed.has(metric.id));
  if (!metrics.length) {
    return { ...snapshot, metrics: [], summaryLine: 'Operational metrics unavailable' };
  }

  const metricValue = (id: DepartmentStatusMetricId) =>
    metrics.find((metric) => metric.id === id)?.value;

  const waitingCount = metricValue('waiting-count');
  const triagePending = metricValue('triage-pending');
  const reassessmentsDue = metricValue('reassessments-due');
  const emsInbound = Number(metricValue('ems-inbound') ?? 0);
  const offloadDelays = Number(metricValue('offload-delays') ?? 0);
  const boarders = Number(metricValue('boarders') ?? 0);
  const referralsPending = Number(metricValue('referrals-pending') ?? 0);
  const capacityValue = metricValue('capacity-status');
  const capacityBand =
    capacityValue != null
      ? String(capacityValue).split('·').pop()?.trim() || ''
      : '';

  const summaryLine = [
    waitingCount != null ? `${waitingCount} waiting` : null,
    triagePending != null ? `${triagePending} triage pending` : null,
    reassessmentsDue != null && Number(reassessmentsDue) > 0
      ? `${reassessmentsDue} reassess due`
      : null,
    emsInbound ? `${emsInbound} EMS inbound` : null,
    offloadDelays ? `${offloadDelays} offload delays` : null,
    boarders ? `${boarders} boarders` : null,
    referralsPending ? `${referralsPending} referrals pending` : null,
    capacityBand ? `${capacityBand} capacity` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    ...snapshot,
    metrics,
    summaryLine: summaryLine || snapshot.summaryLine,
  };
}

export function shouldUseDepartmentStatusScreen(displayMode = false): boolean {
  return Boolean(displayMode);
}
