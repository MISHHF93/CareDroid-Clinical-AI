import type { CareDroidCentralNodeSnapshot } from '../../central-node/careDroidCentralNode';
import type { OperationalIntelligenceSnapshot } from '../../operational-intelligence/operationalIntelligence.types';
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

export function buildOperationalAlertMetrics({
  centralSnapshot,
  syncLabel,
  syncTitle,
  syncStale = false,
  syncPulse = false,
  intelligenceSnapshot = null,
}: BuildOperationalAlertMetricsInput): OperationalAlertMetric[] {
  const metrics: OperationalAlertMetric[] = [
    {
      id: 'capacity',
      label: '',
      value: `CAP ${centralSnapshot.capacityStatus.score} ${centralSnapshot.capacityStatus.band}`,
      tone:
        centralSnapshot.operationalSummary?.metrics?.find((metric) => metric.key === 'capacityScore')
          ?.tone || capacityTone(centralSnapshot.capacityStatus.band),
      priority: 0,
    },
    {
      id: 'ems-inbound',
      label: '',
      value: `EMS ${centralSnapshot.emsPressure.inbound}`,
      tone: emsTone(centralSnapshot),
      priority: 1,
    },
    {
      id: 'reassessment-due',
      label: '',
      value: `REA ${centralSnapshot.reassessmentStatus.due}`,
      tone: centralSnapshot.reassessmentStatus.due ? 'critical' : 'success',
      priority: 2,
    },
    {
      id: 'active-alerts',
      label: '',
      value: `ALR ${centralSnapshot.currentDepartmentStatus.activeAlerts}`,
      tone: centralSnapshot.currentDepartmentStatus.activeAlerts ? 'critical' : 'success',
      priority: 3,
    },
    {
      id: 'sync-status',
      label: '',
      value: syncLabel,
      tone: syncStale ? 'warning' : 'success',
      hint: syncTitle,
      priority: 4,
    },
  ];

  if (intelligenceSnapshot?.enabled) {
    metrics.push({
      id: 'operational-intelligence',
      label: '',
      value: `OI ${[
        intelligenceSnapshot.mode.replace('_', ' '),
        intelligenceSnapshot.dataFreshness.visible
          ? intelligenceSnapshot.dataFreshness.status
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}`,
      tone: intelligenceTone(intelligenceSnapshot),
      hint: intelligenceSnapshot.disclaimers.operational,
      priority: 5,
    });
  }

  return metrics;
}

export function buildHeaderOperationalAlertMetrics(
  input: BuildOperationalAlertMetricsInput,
): OperationalAlertMetric[] {
  return buildOperationalAlertMetrics(input).slice(0, MAX_OPERATIONAL_ALERT_METRICS);
}