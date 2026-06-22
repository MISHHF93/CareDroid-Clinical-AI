import type { CareDroidCentralNodeSnapshot } from '../../central-node/careDroidCentralNode';
import { summarizeReferralAwareness } from '../whiteboard/referralAwarenessModel';
import { summarizeEmsAwareness } from '../whiteboard/emsAwarenessModel';
import { formatDepartmentDuration } from './departmentStatusScreenModel';
import { summarizeLwbsRiskBoard } from '../../services/lwbsRiskLayer';
import {
  summarizeTriageBreachBoard,
  type TriageBreachBoardSummary,
} from '../../services/triageBreachTimer';
import {
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Staff,
} from '../../types/emergency';
import type { EmergencyBoardingMetrics } from '../../store/emergencyStore';
import type { OperationalIntelligenceSnapshot } from '../../operational-intelligence/operationalIntelligence.types';

export type CommandCenterTone = 'stable' | 'info' | 'watch' | 'warning' | 'critical';

export type CommandCenterMetricId =
  | 'waiting-room-occupancy'
  | 'avg-wait-triage'
  | 'avg-wait-provider'
  | 'ems-offload-delays'
  | 'boarding-duration'
  | 'referrals-backlog'
  | 'lwbs-risk';

export type CommandCenterMetric = {
  id: CommandCenterMetricId;
  label: string;
  value: string | number;
  tone: CommandCenterTone;
  detail: string;
};

export type CommandCenterHourlyArrival = {
  hour: string;
  count: number;
};

export type CommandCenterCrowdingForecast = {
  available: boolean;
  label: string;
  detail: string;
  tone: CommandCenterTone;
};

export type CommandCenterSystemHealth = {
  label: string;
  freshness: string;
  source: string;
  tone: CommandCenterTone;
  detail: string;
};

export type CommandCenterThroughputSnapshot = {
  metrics: CommandCenterMetric[];
  hourlyArrivals: CommandCenterHourlyArrival[];
  peakHourLabel: string;
  crowdingForecast: CommandCenterCrowdingForecast;
  systemHealth: CommandCenterSystemHealth;
  summaryLine: string;
  updatedAt: string | null;
};

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function capacityTone(band: string | undefined): CommandCenterTone {
  if (band === 'Red') return 'critical';
  if (band === 'Orange') return 'warning';
  if (band === 'Yellow') return 'watch';
  return 'stable';
}

function isAwaitingTriage(patient: Patient): boolean {
  return (
    patient.state === PatientState.Triage ||
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration
  );
}

function isAwaitingProvider(patient: Patient): boolean {
  return patient.state === PatientState.Waiting && !patient.lastAssessedTime;
}

function computeAverageMinutes(patients: Patient[], selector: (patient: Patient) => number, now: Date): number | null {
  if (!patients.length) return null;
  const values = patients.map(selector).filter((value) => value > 0);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatFreshnessLabel(timestamp: string | null | undefined): string {
  if (!timestamp) return 'Unknown';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'Unknown';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return 'Now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  return `${Math.round(elapsedMinutes / 60)}h ago`;
}

function buildHourlyArrivals(
  patients: Patient[],
  analyticsHourly: CommandCenterHourlyArrival[] = [],
): CommandCenterHourlyArrival[] {
  if (analyticsHourly.length) return analyticsHourly;
  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    count: patients.filter(
      (patient) => new Date(patient.arrivalTime).getHours() === hour,
    ).length,
  }));
}

function buildPeakHourLabel(hourlyArrivals: CommandCenterHourlyArrival[]): string {
  const peak = [...hourlyArrivals].sort((left, right) => right.count - left.count)[0];
  if (!peak || peak.count <= 0) return 'No arrivals yet';
  return `${peak.hour} · ${peak.count} arrivals`;
}

function buildCrowdingForecast(input: {
  capacity?: CapacitySnapshot;
  centralSnapshot?: CareDroidCentralNodeSnapshot;
  bragPeakBand?: string | null;
  bragDetail?: string | null;
}): CommandCenterCrowdingForecast {
  if (input.bragPeakBand) {
    const band = String(input.bragPeakBand);
    return {
      available: true,
      label: band,
      detail: input.bragDetail || '10-hour BRAG crowding forecast — human review required',
      tone:
        /red|black|critical/i.test(band)
          ? 'critical'
          : /amber|orange|yellow|watch/i.test(band)
            ? 'warning'
            : 'stable',
    };
  }

  const band = input.capacity?.band || input.centralSnapshot?.capacityStatus.band;
  const score = input.capacity?.score ?? input.centralSnapshot?.capacityStatus.score;
  const breachedQueues = input.centralSnapshot?.queueHealth.filter((queue) => queue.breached).length ?? 0;

  if (band && score != null) {
    return {
      available: true,
      label: `${score} · ${band}`,
      detail:
        breachedQueues > 0
          ? `Rule-based crowding outlook · ${breachedQueues} queue breach${breachedQueues === 1 ? '' : 'es'}`
          : 'Rule-based crowding outlook from capacity engine',
      tone: capacityTone(band),
    };
  }

  return {
    available: false,
    label: 'Not available',
    detail: 'Crowding forecast will appear when capacity or BRAG signals are connected',
    tone: 'stable',
  };
}

function buildSystemHealth(input: {
  centralSnapshot?: CareDroidCentralNodeSnapshot;
  intelligenceSnapshot?: OperationalIntelligenceSnapshot | null;
  analyticsSource?: string | null;
}): CommandCenterSystemHealth {
  const syncTimestamp =
    input.centralSnapshot?.sync.lastSyncedAt || input.centralSnapshot?.generatedAt || null;
  const freshness = formatFreshnessLabel(syncTimestamp);
  const source =
    input.centralSnapshot?.sync.source === 'backend-snapshot'
      ? 'Backend central node'
      : 'Local operational snapshot';
  const stale = Boolean(input.centralSnapshot?.sync.stale);
  const modelHealth = input.intelligenceSnapshot?.modelHealth?.status;
  const analyticsLabel = input.analyticsSource ? ` · analytics ${input.analyticsSource}` : '';

  let tone: CommandCenterTone = stale ? 'warning' : 'stable';
  if (modelHealth === 'degraded' || modelHealth === 'critical') tone = 'critical';
  else if (modelHealth === 'watch') tone = 'watch';

  return {
    label: stale ? 'Data aging' : 'Data fresh',
    freshness,
    source,
    tone,
    detail: `${source}${analyticsLabel}${modelHealth ? ` · OI ${modelHealth}` : ''}`,
  };
}

function buildSummaryLine(
  waitingCount: number,
  triageSummary: TriageBreachBoardSummary,
  referralsPending: number,
  lwbsElevated: number,
  forecast: CommandCenterCrowdingForecast,
): string {
  return [
    `${waitingCount} waiting`,
    triageSummary.awaitingTriageCount
      ? `${triageSummary.awaitingTriageCount} awaiting triage`
      : null,
    referralsPending ? `${referralsPending} referrals backlog` : null,
    lwbsElevated ? `${lwbsElevated} elevated LWBS risk` : null,
    forecast.available ? `${forecast.label} crowding outlook` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function buildCommandCenterThroughputSnapshot(input: {
  patients?: Patient[];
  capacity?: CapacitySnapshot;
  referrals?: Referral[];
  emsArrivals?: EMSArrival[];
  staff?: Staff[];
  rooms?: Array<{ id: string }>;
  boardingMetrics?: EmergencyBoardingMetrics;
  emergencySettings?: Record<string, unknown>;
  centralSnapshot?: CareDroidCentralNodeSnapshot;
  intelligenceSnapshot?: OperationalIntelligenceSnapshot | null;
  hourlyArrivals?: CommandCenterHourlyArrival[];
  analyticsSource?: string | null;
  bragPeakBand?: string | null;
  bragDetail?: string | null;
  now?: Date;
  updatedAt?: string | null;
  offloadTargetMinutes?: number;
} = {}): CommandCenterThroughputSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const capacity = input.capacity;
  const referrals = input.referrals || [];
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const waitingCount =
    capacity?.waitingCount ??
    input.centralSnapshot?.currentDepartmentStatus.waitingPatients ??
    waitingPatients.length;
  const maxCapacity =
    capacity?.maxCapacity ??
    capacity?.staffedRoomCount ??
    input.centralSnapshot?.capacityStatus.totalPatients ??
    null;

  const triageSummary = summarizeTriageBreachBoard(patients, {
    settings: { emergencySettings: input.emergencySettings },
  });
  const triageCandidates = patients.filter(isAwaitingTriage);
  const avgTriageWait =
    computeAverageMinutes(
      triageCandidates,
      (patient) => minutesSince(patient.arrivalTime, now),
      now,
    ) ??
    (triageSummary.awaitingTriageCount && triageSummary.longestElapsedMinutes
      ? Math.round(triageSummary.longestElapsedMinutes * 0.6)
      : null);

  const providerCandidates = patients.filter(isAwaitingProvider);
  const avgProviderWait =
    computeAverageMinutes(
      providerCandidates,
      (patient) => minutesSince(patient.triageTime || patient.arrivalTime, now),
      now,
    ) ?? input.centralSnapshot?.currentDepartmentStatus.averageWait ?? null;

  const emsAwareness = summarizeEmsAwareness(input.emsArrivals || [], now.getTime(), {
    patients,
    staff: input.staff,
    rooms: input.rooms,
    offloadTargetMinutes: input.offloadTargetMinutes ?? 15,
  });
  const offloadCount = emsAwareness.delayedOffloadCount || emsAwareness.awaitingHandoff;
  const longestOffload = emsAwareness.longestOffloadMinutes;

  const boardingMetrics = input.boardingMetrics;
  const longestBoarding = boardingMetrics?.patientsBoarding.reduce(
    (max, patient) => Math.max(max, Number(patient.boardingMinutes || patient.boardTimeMinutes || 0)),
    0,
  );
  const medianBoarding = boardingMetrics?.medianBoardTimeMinutes ?? 0;
  const boardingValue =
    medianBoarding > 0
      ? formatDepartmentDuration(medianBoarding)
      : longestBoarding
        ? formatDepartmentDuration(longestBoarding)
        : input.centralSnapshot?.boardingStatus.boarders
          ? `${input.centralSnapshot.boardingStatus.boarders} boarders`
          : '—';

  const referralSummary = summarizeReferralAwareness(referrals);
  const referralsPending =
    referralSummary.buckets.pending ||
    input.centralSnapshot?.referralStatus.pending ||
    0;

  const lwbsCounts = summarizeLwbsRiskBoard(patients, {
    waitingPatientCount: waitingCount,
  });
  const lwbsElevated = lwbsCounts.elevated + lwbsCounts.high + lwbsCounts.medium;

  const hourlyArrivals = buildHourlyArrivals(patients, input.hourlyArrivals);
  const peakHourLabel = buildPeakHourLabel(hourlyArrivals);
  const crowdingForecast = buildCrowdingForecast({
    capacity,
    centralSnapshot: input.centralSnapshot,
    bragPeakBand: input.bragPeakBand,
    bragDetail: input.bragDetail,
  });
  const systemHealth = buildSystemHealth({
    centralSnapshot: input.centralSnapshot,
    intelligenceSnapshot: input.intelligenceSnapshot,
    analyticsSource: input.analyticsSource,
  });

  const metrics: CommandCenterMetric[] = [
    {
      id: 'waiting-room-occupancy',
      label: 'Waiting room occupancy',
      value: maxCapacity ? `${waitingCount} / ${maxCapacity}` : waitingCount,
      tone:
        waitingCount >= 20
          ? 'critical'
          : waitingCount >= 12
            ? 'warning'
            : waitingCount >= 6
              ? 'watch'
              : 'stable',
      detail: maxCapacity
        ? 'Patients waiting vs staffed treatment capacity'
        : 'Patients currently in the waiting room queue',
    },
    {
      id: 'avg-wait-triage',
      label: 'Average wait to triage',
      value: avgTriageWait != null ? formatDepartmentDuration(avgTriageWait) : '—',
      tone:
        avgTriageWait != null && avgTriageWait >= triageSummary.targetMinutes
          ? 'critical'
          : avgTriageWait != null && avgTriageWait >= triageSummary.warningMinutes
            ? 'warning'
            : avgTriageWait
              ? 'watch'
              : 'stable',
      detail: `Target ${triageSummary.targetMinutes}m · ${triageSummary.awaitingTriageCount} awaiting triage`,
    },
    {
      id: 'avg-wait-provider',
      label: 'Average wait to provider',
      value: avgProviderWait != null ? formatDepartmentDuration(avgProviderWait) : '—',
      tone:
        avgProviderWait != null && avgProviderWait >= 120
          ? 'critical'
          : avgProviderWait != null && avgProviderWait >= 60
            ? 'warning'
            : avgProviderWait
              ? 'watch'
              : 'stable',
      detail: `${providerCandidates.length} patients awaiting first provider contact`,
    },
    {
      id: 'ems-offload-delays',
      label: 'EMS offload delays',
      value: offloadCount,
      tone:
        (longestOffload ?? 0) >= (input.offloadTargetMinutes ?? 15)
          ? 'critical'
          : offloadCount
            ? 'warning'
            : 'stable',
      detail: longestOffload != null
        ? `Longest offload ${formatDepartmentDuration(longestOffload)} · ${emsAwareness.inboundCount} inbound`
        : `${emsAwareness.inboundCount} inbound ambulance units`,
    },
    {
      id: 'boarding-duration',
      label: 'Boarding duration',
      value: boardingValue,
      tone:
        longestBoarding >= 480 || medianBoarding >= 360
          ? 'critical'
          : longestBoarding >= 240 || medianBoarding >= 180
            ? 'warning'
            : boardingMetrics?.patientsBoarding.length
              ? 'watch'
              : 'stable',
      detail: `${boardingMetrics?.patientsBoarding.length ?? input.centralSnapshot?.boardingStatus.boarders ?? 0} boarding · median ${formatDepartmentDuration(medianBoarding)}`,
    },
    {
      id: 'referrals-backlog',
      label: 'Referrals backlog',
      value: referralsPending,
      tone: referralsPending >= 8 ? 'warning' : referralsPending ? 'watch' : 'stable',
      detail: `${referralSummary.buckets.delayed} delayed · ${referralSummary.buckets.accepted} accepted awaiting action`,
    },
    {
      id: 'lwbs-risk',
      label: 'LWBS risk',
      value: lwbsElevated,
      tone:
        lwbsCounts.elevated >= 2
          ? 'critical'
          : lwbsCounts.high + lwbsCounts.elevated >= 1
            ? 'warning'
            : lwbsElevated
              ? 'watch'
              : 'stable',
      detail: `Advisory only · ${lwbsCounts.elevated} elevated · ${lwbsCounts.high} high · ${lwbsCounts.medium} medium`,
    },
  ];

  return {
    metrics,
    hourlyArrivals,
    peakHourLabel,
    crowdingForecast,
    systemHealth,
    summaryLine: buildSummaryLine(
      waitingCount,
      triageSummary,
      referralsPending,
      lwbsCounts.elevated + lwbsCounts.high,
      crowdingForecast,
    ),
    updatedAt:
      input.updatedAt ??
      capacity?.updatedAt ??
      input.centralSnapshot?.generatedAt ??
      now.toISOString(),
  };
}

export function filterCommandCenterThroughputSnapshot(
  snapshot: CommandCenterThroughputSnapshot,
  visibleMetricIds: readonly CommandCenterMetricId[],
): CommandCenterThroughputSnapshot {
  const allowed = new Set(visibleMetricIds);
  return {
    ...snapshot,
    metrics: snapshot.metrics.filter((metric) => allowed.has(metric.id)),
  };
}
