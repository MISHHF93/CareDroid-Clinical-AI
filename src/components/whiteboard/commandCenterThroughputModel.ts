import type { CareDroidCentralNodeSnapshot } from '../../central-node/careDroidCentralNode';
import { summarizeReferralAwareness } from '../whiteboard/referralAwarenessModel';
import { formatDepartmentDuration } from './departmentStatusScreenModel';
import { summarizeLwbsRiskBoard } from '../../services/lwbsRiskLayer';
import {
  summarizeTriageBreachBoard,
  type TriageBreachBoardSummary,
} from '../../services/triageBreachTimer';
import { buildProviderWaitVisibilitySnapshot } from '../../services/providerWaitVisibilityModel';
import { buildEmsOffloadVisibilitySnapshot } from '../../services/emsOffloadVisibilityModel';
import { buildTriageBreachVisibilitySnapshot } from '../../services/triageBreachVisibilityModel';
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
import {
  buildCrowdLevelSnapshot,
  type CrowdLevelSnapshot,
} from '../../engine/crowdLevelEngine';

export type CommandCenterTone = 'stable' | 'info' | 'watch' | 'warning' | 'critical';

export type CommandCenterTrendDirection = 'up' | 'down' | 'flat';

export type CommandCenterMetricTrend = {
  direction: CommandCenterTrendDirection;
  label: string;
};

export type CommandCenterMetricId =
  | 'triage-awaiting'
  | 'longest-untriaged-wait'
  | 'triage-approaching-breach'
  | 'triage-breached'
  | 'rapid-review-flags'
  | 'provider-awaiting'
  | 'longest-provider-wait'
  | 'provider-approaching-breach'
  | 'provider-breached'
  | 'waiting-count'
  | 'waiting-room-occupancy'
  | 'longest-wait'
  | 'avg-wait-triage'
  | 'avg-wait-provider'
  | 'ems-inbound'
  | 'ems-offload-delays'
  | 'offload-duration'
  | 'handoff-pending'
  | 'boarding-duration'
  | 'referrals-backlog'
  | 'capacity-score'
  | 'crowd-level'
  | 'lwbs-risk';

export type CommandCenterMetric = {
  id: CommandCenterMetricId;
  label: string;
  value: string | number;
  tone: CommandCenterTone;
  detail: string;
  trend?: CommandCenterMetricTrend;
};

export type CommandCenterTrendIndicator = {
  id: string;
  label: string;
  value: string;
  direction: CommandCenterTrendDirection;
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
  crowdLevel: CrowdLevelSnapshot;
  systemHealth: CommandCenterSystemHealth;
  trendIndicators: CommandCenterTrendIndicator[];
  summaryLine: string;
  updatedAt: string | null;
};

export const COMMAND_CENTER_METRIC_DISPLAY_ORDER: readonly CommandCenterMetricId[] = Object.freeze([
  'triage-awaiting',
  'longest-untriaged-wait',
  'triage-approaching-breach',
  'triage-breached',
  'rapid-review-flags',
  'provider-awaiting',
  'longest-provider-wait',
  'avg-wait-provider',
  'provider-approaching-breach',
  'provider-breached',
  'waiting-count',
  'longest-wait',
  'avg-wait-triage',
  'avg-wait-provider',
  'ems-inbound',
  'ems-offload-delays',
  'offload-duration',
  'handoff-pending',
  'boarding-duration',
  'referrals-backlog',
  'capacity-score',
  'crowd-level',
]);

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

function compareTrendDirection(
  current: number,
  previous: number,
  higherIsWorse = true,
): CommandCenterTrendDirection {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current === previous) {
    return 'flat';
  }
  if (current > previous) return higherIsWorse ? 'up' : 'down';
  return higherIsWorse ? 'down' : 'up';
}

function trendTone(direction: CommandCenterTrendDirection, higherIsWorse = true): CommandCenterTone {
  if (direction === 'flat') return 'info';
  const worsening = (direction === 'up' && higherIsWorse) || (direction === 'down' && !higherIsWorse);
  return worsening ? 'warning' : 'stable';
}

function buildMetricTrend(
  current: number,
  previous: number,
  higherIsWorse = true,
): CommandCenterMetricTrend | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined;
  const direction = compareTrendDirection(current, previous, higherIsWorse);
  const delta = current - previous;
  const prefix = delta > 0 ? '+' : '';
  return {
    direction,
    label: `${prefix}${delta} vs prior`,
  };
}

function buildTrendIndicators(input: {
  hourlyArrivals: CommandCenterHourlyArrival[];
  waitTrend?: Array<{ date: string; avgWaitMinutes: number }>;
  dailyVolume?: Array<{ date: string; count: number }>;
  waitingCount: number;
  longestWaitMinutes: number;
  capacityScore?: number | null;
  crowdPressureScore?: number;
  now?: Date;
}): CommandCenterTrendIndicator[] {
  const trends: CommandCenterTrendIndicator[] = [];
  const now = input.now || new Date();
  const hourly = input.hourlyArrivals || [];
  const currentHour = now.getHours();
  const currentHourCount = hourly[currentHour]?.count ?? 0;
  const previousHourCount = hourly[(currentHour + 23) % 24]?.count ?? 0;
  const hourDirection = compareTrendDirection(currentHourCount, previousHourCount, true);
  trends.push({
    id: 'hourly-arrivals',
    label: 'Arrivals this hour',
    value: String(currentHourCount),
    direction: hourDirection,
    tone: trendTone(hourDirection, true),
    detail: `Prior hour ${previousHourCount} · ${String(currentHour).padStart(2, '0')}:00 window`,
  });

  const waitTrend = input.waitTrend || [];
  if (waitTrend.length >= 2) {
    const last = waitTrend[waitTrend.length - 1];
    const prev = waitTrend[waitTrend.length - 2];
    const direction = compareTrendDirection(last.avgWaitMinutes, prev.avgWaitMinutes, true);
    trends.push({
      id: 'wait-trend',
      label: 'Average wait trend',
      value: formatDepartmentDuration(last.avgWaitMinutes),
      direction,
      tone: trendTone(direction, true),
      detail: `${prev.date}: ${prev.avgWaitMinutes}m → ${last.date}: ${last.avgWaitMinutes}m`,
    });
  }

  const dailyVolume = input.dailyVolume || [];
  if (dailyVolume.length >= 2) {
    const last = dailyVolume[dailyVolume.length - 1];
    const prev = dailyVolume[dailyVolume.length - 2];
    const direction = compareTrendDirection(last.count, prev.count, true);
    trends.push({
      id: 'daily-volume',
      label: 'Daily arrival volume',
      value: String(last.count),
      direction,
      tone: trendTone(direction, true),
      detail: `${prev.date}: ${prev.count} → ${last.date}: ${last.count}`,
    });
  }

  if (input.capacityScore != null) {
    trends.push({
      id: 'capacity-pressure',
      label: 'Capacity pressure',
      value: String(input.capacityScore),
      direction:
        input.capacityScore >= 80 ? 'up' : input.capacityScore <= 40 ? 'down' : 'flat',
      tone:
        input.capacityScore >= 80
          ? 'critical'
          : input.capacityScore >= 60
            ? 'warning'
            : 'stable',
      detail: `Crowd pressure ${input.crowdPressureScore ?? '—'} · waiting ${input.waitingCount}`,
    });
  }

  if (input.longestWaitMinutes > 0) {
    trends.push({
      id: 'longest-wait-signal',
      label: 'Longest active wait',
      value: formatDepartmentDuration(input.longestWaitMinutes),
      direction:
        input.longestWaitMinutes >= 120
          ? 'up'
          : input.longestWaitMinutes <= 30
            ? 'down'
            : 'flat',
      tone:
        input.longestWaitMinutes >= 120
          ? 'critical'
          : input.longestWaitMinutes >= 60
            ? 'warning'
            : 'stable',
      detail: 'Longest wait among active waiting-room patients',
    });
  }

  return trends;
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
  crowdLevel?: CrowdLevelSnapshot;
}): CommandCenterCrowdingForecast {
  if (input.crowdLevel) {
    const bragSuffix = input.bragPeakBand
      ? ` · BRAG peak ${input.bragPeakBand}${input.bragDetail ? ` (${input.bragDetail})` : ''}`
      : '';
    return {
      available: true,
      label: input.crowdLevel.staffLabel,
      detail: `${input.crowdLevel.detail} · pressure ${input.crowdLevel.signals.pressureScore}${bragSuffix}`,
      tone: input.crowdLevel.tone,
    };
  }
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
  waitTrend?: Array<{ date: string; avgWaitMinutes: number }>;
  dailyVolume?: Array<{ date: string; count: number }>;
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
  const triageVisibility = buildTriageBreachVisibilitySnapshot(patients, {
    settings: { emergencySettings: input.emergencySettings },
    now,
  });
  const providerVisibility = buildProviderWaitVisibilitySnapshot(patients, {
    settings: { emergencySettings: input.emergencySettings },
    now,
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

  const emsVisibility = buildEmsOffloadVisibilitySnapshot(input.emsArrivals || [], {
    patients,
    staff: input.staff,
    rooms: input.rooms,
    now,
    offloadTargetMinutes: input.offloadTargetMinutes ?? 15,
  });
  const offloadCount = emsVisibility.offloadDelaysCount || emsVisibility.handoffPendingCount;
  const longestOffload = emsVisibility.longestOffloadMinutes;

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
  const longestWaitMinutes =
    capacity?.longestWaitMinutes ??
    input.centralSnapshot?.currentDepartmentStatus.longestWait ??
    waitingPatients.reduce(
      (max, patient) =>
        Math.max(max, minutesSince(patient.triageTime || patient.arrivalTime, now)),
      0,
    );
  const breachedQueues = input.centralSnapshot?.queueHealth.filter((queue) => queue.breached).length ?? 0;
  const crowdLevel = buildCrowdLevelSnapshot({
    patients,
    capacity,
    emsArrivals: input.emsArrivals || [],
    emsOffloadDelays: offloadCount,
    queueBreaches: breachedQueues,
    settings: input.emergencySettings,
    now,
  });
  const crowdingForecast = buildCrowdingForecast({
    capacity,
    centralSnapshot: input.centralSnapshot,
    bragPeakBand: input.bragPeakBand,
    bragDetail: input.bragDetail,
    crowdLevel,
  });
  const systemHealth = buildSystemHealth({
    centralSnapshot: input.centralSnapshot,
    intelligenceSnapshot: input.intelligenceSnapshot,
    analyticsSource: input.analyticsSource,
  });

  const waitTrend = input.waitTrend || [];
  const priorAvgWait =
    waitTrend.length >= 2 ? waitTrend[waitTrend.length - 2].avgWaitMinutes : null;
  const currentAvgWait =
    waitTrend.length >= 1 ? waitTrend[waitTrend.length - 1].avgWaitMinutes : null;

  const metrics: CommandCenterMetric[] = [
    {
      id: 'triage-awaiting',
      label: 'Awaiting triage',
      value: triageVisibility.awaitingTriageCount,
      tone:
        triageVisibility.awaitingTriageCount >= 4
          ? 'critical'
          : triageVisibility.awaitingTriageCount >= 2
            ? 'warning'
            : triageVisibility.awaitingTriageCount
              ? 'watch'
              : 'stable',
      detail: 'Patients waiting for triage nurse review',
    },
    {
      id: 'longest-untriaged-wait',
      label: 'Longest untriaged wait',
      value: triageVisibility.awaitingTriageCount
        ? triageVisibility.longestUntriagedWaitLabel
        : '—',
      tone:
        triageVisibility.breachedCount
          ? 'critical'
          : triageVisibility.approachingBreachCount
            ? 'warning'
            : triageVisibility.awaitingTriageCount
              ? 'watch'
              : 'stable',
      detail: `Door-to-triage target ${triageSummary.targetMinutes}m · warning ${triageSummary.warningMinutes}m`,
    },
    {
      id: 'triage-approaching-breach',
      label: 'Approaching breach',
      value: triageVisibility.approachingBreachCount,
      tone: triageVisibility.approachingBreachCount ? 'warning' : 'stable',
      detail: `Within ${triageSummary.warningMinutes}m of ${triageSummary.targetMinutes}m target`,
    },
    {
      id: 'triage-breached',
      label: 'Triage breached',
      value: triageVisibility.breachedCount,
      tone:
        triageVisibility.breachedCount >= 3
          ? 'critical'
          : triageVisibility.breachedCount
            ? 'warning'
            : 'stable',
      detail: triageVisibility.breachedCount
        ? `Longest ${triageSummary.longestElapsedLabel}`
        : `Target ${triageSummary.targetMinutes}m`,
    },
    {
      id: 'rapid-review-flags',
      label: 'Rapid-review flags',
      value: triageVisibility.rapidReviewFlags,
      tone: triageVisibility.rapidReviewFlags ? 'warning' : 'stable',
      detail: 'High-risk complaint flags needing rapid review',
    },
    {
      id: 'provider-awaiting',
      label: 'Awaiting clinician',
      value: providerVisibility.awaitingClinicianCount,
      tone:
        providerVisibility.awaitingClinicianCount >= 6
          ? 'critical'
          : providerVisibility.awaitingClinicianCount >= 3
            ? 'warning'
            : providerVisibility.awaitingClinicianCount
              ? 'watch'
              : 'stable',
      detail: 'Patients waiting for first clinician contact',
    },
    {
      id: 'longest-provider-wait',
      label: 'Longest provider wait',
      value: providerVisibility.awaitingClinicianCount
        ? providerVisibility.longestProviderWaitLabel
        : '—',
      tone:
        providerVisibility.breachedCount
          ? 'critical'
          : providerVisibility.approachingThresholdCount
            ? 'warning'
            : providerVisibility.awaitingClinicianCount
              ? 'watch'
              : 'stable',
      detail: `CTAS thresholds · default target ${providerVisibility.summary.defaultTargetMinutes}m`,
    },
    {
      id: 'provider-approaching-breach',
      label: 'Approaching threshold',
      value: providerVisibility.approachingThresholdCount,
      tone: providerVisibility.approachingThresholdCount ? 'warning' : 'stable',
      detail: `Within ${providerVisibility.summary.warningMinutes}m of patient CTAS target`,
    },
    {
      id: 'provider-breached',
      label: 'Provider wait breached',
      value: providerVisibility.breachedCount,
      tone:
        providerVisibility.breachedCount >= 3
          ? 'critical'
          : providerVisibility.breachedCount
            ? 'warning'
            : 'stable',
      detail: providerVisibility.breachedCount
        ? `Longest ${providerVisibility.summary.longestElapsedLabel}`
        : `Default target ${providerVisibility.summary.defaultTargetMinutes}m`,
    },
    {
      id: 'waiting-count',
      label: 'Waiting count',
      value: waitingCount,
      tone:
        waitingCount >= 20
          ? 'critical'
          : waitingCount >= 12
            ? 'warning'
            : waitingCount >= 6
              ? 'watch'
              : 'stable',
      detail: maxCapacity
        ? `${waitingCount} of ${maxCapacity} staffed capacity in queue`
        : 'Patients currently in the waiting room queue',
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
      detail: 'Longest active wait — no patient identifiers',
      trend: buildMetricTrend(
        longestWaitMinutes,
        capacity?.averageWaitMinutes ?? avgProviderWait ?? longestWaitMinutes,
        true,
      ),
    },
    {
      id: 'avg-wait-triage',
      label: 'Wait to triage',
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
      trend:
        priorAvgWait != null && avgTriageWait != null
          ? buildMetricTrend(avgTriageWait, priorAvgWait, true)
          : undefined,
    },
    {
      id: 'avg-wait-provider',
      label: 'Average provider wait',
      value:
        providerVisibility.averageProviderWaitMinutes != null
          ? formatDepartmentDuration(providerVisibility.averageProviderWaitMinutes)
          : avgProviderWait != null
            ? formatDepartmentDuration(avgProviderWait)
            : '—',
      tone:
        avgProviderWait != null && avgProviderWait >= 120
          ? 'critical'
          : avgProviderWait != null && avgProviderWait >= 60
            ? 'warning'
            : avgProviderWait
              ? 'watch'
              : 'stable',
      detail: `${providerCandidates.length} patients awaiting first provider contact`,
      trend:
        currentAvgWait != null && avgProviderWait != null
          ? buildMetricTrend(avgProviderWait, currentAvgWait, true)
          : undefined,
    },
    {
      id: 'ems-inbound',
      label: 'EMS inbound',
      value: emsVisibility.inboundCount,
      tone: emsVisibility.inboundCount >= 3 ? 'warning' : emsVisibility.inboundCount ? 'info' : 'stable',
      detail: 'Ambulance units en route to the department',
      trend: buildMetricTrend(emsVisibility.inboundCount, emsVisibility.inboundCount, true),
    },
    {
      id: 'ems-offload-delays',
      label: 'Offload delays',
      value: emsVisibility.offloadDelaysCount,
      tone:
        (longestOffload ?? 0) >= (input.offloadTargetMinutes ?? 15)
          ? 'critical'
          : offloadCount
            ? 'warning'
            : 'stable',
      detail: longestOffload != null
        ? `Longest offload ${formatDepartmentDuration(longestOffload)}`
        : 'Units past offload target',
      trend: buildMetricTrend(offloadCount, emsVisibility.handoffPendingCount, true),
    },
    {
      id: 'offload-duration',
      label: 'Offload duration',
      value: emsVisibility.offloadDurationLabel,
      tone:
        longestOffload >= (input.offloadTargetMinutes ?? 15)
          ? 'critical'
          : emsVisibility.averageOffloadMinutes >= 10
            ? 'warning'
            : emsVisibility.handoffPendingCount
              ? 'watch'
              : 'stable',
      detail: `Average ${formatDepartmentDuration(emsVisibility.averageOffloadMinutes)} · target ${emsVisibility.offloadTargetMinutes}m`,
      trend: buildMetricTrend(
        emsVisibility.averageOffloadMinutes,
        longestOffload,
        true,
      ),
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
      trend: buildMetricTrend(
        emsVisibility.handoffPendingCount,
        emsVisibility.handoffPendingCount,
        true,
      ),
    },
    {
      id: 'boarding-duration',
      label: 'Boarding burden',
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
      trend: buildMetricTrend(
        boardingMetrics?.patientsBoarding.length ??
          input.centralSnapshot?.boardingStatus.boarders ??
          0,
        input.centralSnapshot?.boardingStatus.boarders ?? 0,
        true,
      ),
    },
    {
      id: 'referrals-backlog',
      label: 'Referral backlog',
      value: referralsPending,
      tone: referralsPending >= 8 ? 'warning' : referralsPending ? 'watch' : 'stable',
      detail: `${referralSummary.buckets.delayed} delayed · ${referralSummary.buckets.accepted} accepted awaiting action`,
      trend: buildMetricTrend(
        referralsPending,
        input.centralSnapshot?.referralStatus.pending ?? referralsPending,
        true,
      ),
    },
    {
      id: 'capacity-score',
      label: 'Capacity score',
      value: capacity ? `${capacity.score} · ${capacity.band}` : '—',
      tone: capacityTone(capacity?.band),
      detail: capacity
        ? `Department capacity score ${capacity.score}/100`
        : 'Capacity unavailable',
    },
    {
      id: 'crowd-level',
      label: 'Crowd level',
      value: crowdLevel.staffLabel,
      tone: crowdLevel.tone,
      detail: crowdLevel.detail,
      trend: {
        direction:
          crowdLevel.signals.pressureScore >= 70
            ? 'up'
            : crowdLevel.signals.pressureScore <= 35
              ? 'down'
              : 'flat',
        label: `Pressure ${crowdLevel.signals.pressureScore}`,
      },
    },
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
      detail: 'Legacy occupancy ratio — prefer waiting count for command decisions',
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

  const trendIndicators = buildTrendIndicators({
    hourlyArrivals,
    waitTrend: input.waitTrend,
    dailyVolume: input.dailyVolume,
    waitingCount,
    longestWaitMinutes,
    capacityScore: capacity?.score ?? input.centralSnapshot?.capacityStatus.score ?? null,
    crowdPressureScore: crowdLevel.signals.pressureScore,
    now,
  });

  return {
    metrics,
    hourlyArrivals,
    peakHourLabel,
    crowdingForecast,
    crowdLevel,
    systemHealth,
    trendIndicators,
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

export function sortCommandCenterMetrics(
  metrics: CommandCenterMetric[],
): CommandCenterMetric[] {
  const order = new Map(
    COMMAND_CENTER_METRIC_DISPLAY_ORDER.map((id, index) => [id, index]),
  );
  return [...metrics].sort(
    (left, right) =>
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
