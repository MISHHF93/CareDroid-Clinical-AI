import type { CareDroidCentralNodeSnapshot } from '../../central-node/careDroidCentralNode';
import type { CareDroidScreenMode } from '../../config/careDroidScreenModes';
import { filterOperationalMetricsByScreenMode } from '../../config/emergencyScreenKpiPolicy';
import type { OperationalIntelligenceSnapshot } from '../../operational-intelligence/operationalIntelligence.types';
import {
  isPilotStationKpiPolicyActive,
  PILOT_STATION_KPI_LIMIT,
  resolveCompactHeaderMetricLabel,
  resolvePilotHeaderOperationalMetricKeys,
} from '../../config/stationKpiPolicy';
import { MAX_WHITEBOARD_ALERT_METRICS } from '../whiteboard/whiteboardAlertRailModel';

export const MAX_OPERATIONAL_ALERT_METRICS = MAX_WHITEBOARD_ALERT_METRICS;

export type OperationalAlertMetric = {
  id: string;
  label: string;
  value: string | number;
  tone: 'critical' | 'warning' | 'info' | 'success' | 'neutral';
  hint?: string;
  priority: number;
};

export type BuildOperationalAlertMetricsInput = {
  centralSnapshot: CareDroidCentralNodeSnapshot;
  syncLabel: string;
  syncTitle?: string;
  syncStale?: boolean;
  syncPulse?: boolean;
  screenMode?: CareDroidScreenMode | null;
  intelligenceSnapshot?: Pick<
    OperationalIntelligenceSnapshot,
    'enabled' | 'mode' | 'dataFreshness' | 'anomalies' | 'disclaimers'
  > | null;
};

function capacityTone(band: string): OperationalAlertMetric['tone'] {
  if (band === 'Red') return 'critical';
  if (band === 'Orange' || band === 'Yellow') return 'warning';
  return 'success';
}

function emsTone(snapshot: CareDroidCentralNodeSnapshot): OperationalAlertMetric['tone'] {
  if (snapshot.emsPressure.status === 'critical') return 'critical';
  if (snapshot.emsPressure.inbound) return 'warning';
  return 'success';
}

function intelligenceTone(
  snapshot: NonNullable<BuildOperationalAlertMetricsInput['intelligenceSnapshot']>,
): OperationalAlertMetric['tone'] {
  if (snapshot.dataFreshness.status === 'stale') return 'warning';
  if (snapshot.anomalies.length) return 'critical';
  return 'success';
}

function mapOperationalSummaryTone(tone?: string): OperationalAlertMetric['tone'] {
  if (tone === 'critical') return 'critical';
  if (tone === 'warning' || tone === 'watch') return 'warning';
  if (tone === 'success' || tone === 'stable') return 'success';
  if (tone === 'info') return 'info';
  return 'neutral';
}

function buildSyncStatusMetric(
  input: BuildOperationalAlertMetricsInput,
  priority: number,
): OperationalAlertMetric {
  return {
    id: 'sync-status',
    label: 'Sync',
    value: input.syncLabel,
    tone: input.syncStale ? 'warning' : 'success',
    hint: input.syncTitle,
    priority,
  };
}

function buildPilotHeaderOperationalAlertMetrics(
  input: BuildOperationalAlertMetricsInput,
  screenMode: CareDroidScreenMode,
): OperationalAlertMetric[] {
  const allowedKeys = resolvePilotHeaderOperationalMetricKeys(screenMode);
  if (!allowedKeys?.length) return [];

  const summaryMetrics = filterOperationalMetricsByScreenMode(
    input.centralSnapshot.operationalSummary?.metrics || [],
    screenMode,
  );
  const metricsByKey = new Map(summaryMetrics.map((metric) => [metric.key, metric]));
  const metrics: OperationalAlertMetric[] = [];

  for (const key of allowedKeys.slice(0, PILOT_STATION_KPI_LIMIT)) {
    const metric = metricsByKey.get(key as Parameters<typeof metricsByKey.get>[0]);
    if (!metric) continue;
    metrics.push({
      id: key,
      label: resolveCompactHeaderMetricLabel(key, metric.label),
      value: metric.value,
      tone: mapOperationalSummaryTone(metric.tone),
      hint: metric.source,
      priority: metrics.length,
    });
  }

  if (input.syncStale) {
    metrics.push(buildSyncStatusMetric(input, metrics.length));
  }

  return metrics;
}

export function buildOperationalAlertMetrics({
  centralSnapshot,
  syncLabel,
  syncTitle,
  syncStale = false,
  syncPulse = false,
  screenMode = null,
  intelligenceSnapshot = null,
}: BuildOperationalAlertMetricsInput): OperationalAlertMetric[] {
  if (isPilotStationKpiPolicyActive() && screenMode) {
    const pilotMetrics = buildPilotHeaderOperationalAlertMetrics(
      {
        centralSnapshot,
        syncLabel,
        syncTitle,
        syncStale,
        syncPulse,
        screenMode,
        intelligenceSnapshot,
      },
      screenMode,
    );
    if (pilotMetrics.length) return pilotMetrics;
  }

  // Readable label + value pairs (never cram everything into value with empty labels).
  const metrics: OperationalAlertMetric[] = [
    {
      id: 'capacity',
      label: 'Capacity',
      value: `${centralSnapshot.capacityStatus.score} ${centralSnapshot.capacityStatus.band}`,
      tone:
        centralSnapshot.operationalSummary?.metrics?.find((metric) => metric.key === 'capacityScore')
          ?.tone || capacityTone(centralSnapshot.capacityStatus.band),
      priority: 0,
    },
    {
      id: 'ems-inbound',
      label: 'EMS',
      value: String(centralSnapshot.emsPressure.inbound),
      tone: emsTone(centralSnapshot),
      priority: 1,
    },
    {
      id: 'reassessment-due',
      label: 'Reassess',
      value: String(centralSnapshot.reassessmentStatus.due),
      tone: centralSnapshot.reassessmentStatus.due ? 'critical' : 'success',
      priority: 2,
    },
    {
      id: 'active-alerts',
      label: 'Alerts',
      value: String(centralSnapshot.currentDepartmentStatus.activeAlerts),
      tone: centralSnapshot.currentDepartmentStatus.activeAlerts ? 'critical' : 'success',
      priority: 3,
    },
    {
      id: 'sync-status',
      label: 'Sync',
      value: syncLabel,
      tone: syncStale ? 'warning' : 'success',
      hint: syncTitle,
      priority: 4,
    },
  ];

  if (intelligenceSnapshot?.enabled) {
    const modeLabel = intelligenceSnapshot.mode.replace(/_/g, ' ');
    metrics.push({
      id: 'operational-intelligence',
      label: 'Intel',
      // Was `${mode} · ${freshness}` (e.g. "rule based · stale") -- multi-word
      // and could run long, the same cramped-pill mismatch as the Sync pill's
      // "POLLING stale" bug. Freshness alone is the short, sibling-matching
      // value; mode moves into the hover tooltip instead.
      value: intelligenceSnapshot.dataFreshness.visible ? intelligenceSnapshot.dataFreshness.status : modeLabel,
      tone: intelligenceTone(intelligenceSnapshot),
      hint: [`Mode: ${modeLabel}`, intelligenceSnapshot.disclaimers.operational].filter(Boolean).join('. '),
      priority: 5,
    });
  }

  return metrics;
}

/** Hard cap for metrics inside the slim header top bar (readability over density). */
export const MAX_HEADER_STRIP_METRICS = 3;

export function buildHeaderOperationalAlertMetrics(
  input: BuildOperationalAlertMetricsInput,
): OperationalAlertMetric[] {
  if (isPilotStationKpiPolicyActive() && input.screenMode) {
    return buildPilotHeaderOperationalAlertMetrics(input, input.screenMode).slice(
      0,
      MAX_HEADER_STRIP_METRICS,
    );
  }

  // Prefer the most actionable signals; drop sync unless stale so the strip stays readable.
  const all = buildOperationalAlertMetrics(input);
  const primary = all.filter((metric) => metric.id !== 'sync-status' || input.syncStale);
  return primary.slice(0, MAX_HEADER_STRIP_METRICS);
}