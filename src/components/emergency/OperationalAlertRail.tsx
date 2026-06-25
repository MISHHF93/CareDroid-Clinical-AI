import { useMemo } from 'react';
import OperationalStrip from './OperationalStrip';
import {
  buildHeaderOperationalAlertMetrics,
  type BuildOperationalAlertMetricsInput,
} from './operationalAlertRailModel';
import './OperationalAlertRail.css';

type OperationalAlertRailProps = BuildOperationalAlertMetricsInput & {
  ariaLabel?: string;
  className?: string;
  readOnly?: boolean;
};

export default function OperationalAlertRail({
  ariaLabel = 'CareDroid central node live status',
  className = '',
  readOnly = true,
  centralSnapshot,
  syncLabel,
  syncTitle,
  syncStale = false,
  syncPulse = false,
  intelligenceSnapshot = null,
}: OperationalAlertRailProps) {
  const metrics = useMemo(
    () =>
      buildHeaderOperationalAlertMetrics({
        centralSnapshot,
        syncLabel,
        syncTitle,
        syncStale,
        syncPulse,
        intelligenceSnapshot,
      }),
    [centralSnapshot, intelligenceSnapshot, syncLabel, syncPulse, syncStale, syncTitle],
  );

  if (!metrics.length) return null;

  const stripMetrics = metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    tone: metric.tone,
    hint: metric.hint,
    interactive: false,
  }));

  return (
    <div
      className={[
        'operational-alert-rail',
        syncPulse ? 'operational-alert-rail--sync-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <OperationalStrip
        metrics={stripMetrics}
        layout="compact"
        ariaLabel={ariaLabel}
        eyebrow={null}
        readOnly={readOnly}
        metricLabelsUppercase
        className="operational-alert-rail__strip"
      />
    </div>
  );
}