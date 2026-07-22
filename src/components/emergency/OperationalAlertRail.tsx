import { useMemo } from 'react';
import type { CareDroidScreenMode } from '../../config/careDroidScreenModes';
import { AlarmKpi } from '../../alarm';
import { resolveAlarmSeverity } from '../../alarm/types';
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
  screenMode?: CareDroidScreenMode | null;
  /** header = readable KPI chips in the slim top bar */
  variant?: 'header' | 'default';
};

export default function OperationalAlertRail({
  ariaLabel = 'Department live status',
  className = '',
  readOnly = true,
  centralSnapshot,
  syncLabel,
  syncTitle,
  syncStale = false,
  syncPulse = false,
  intelligenceSnapshot = null,
  screenMode = null,
  variant = 'default',
}: OperationalAlertRailProps) {
  const isHeader = variant === 'header';

  const metrics = useMemo(
    () =>
      buildHeaderOperationalAlertMetrics({
        centralSnapshot,
        syncLabel,
        syncTitle,
        syncStale,
        syncPulse,
        intelligenceSnapshot,
        screenMode,
      }),
    [
      centralSnapshot,
      intelligenceSnapshot,
      screenMode,
      syncLabel,
      syncPulse,
      syncStale,
      syncTitle,
    ],
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

  if (isHeader) {
    return (
      <div
        className={[
          'operational-alert-rail',
          'operational-alert-rail--header',
          'cdl-alarm-kpi-rail',
          syncPulse ? 'operational-alert-rail--sync-pulse' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={ariaLabel}
      >
        {metrics.map((metric) => (
          <AlarmKpi
            key={metric.id}
            severity={resolveAlarmSeverity(metric.tone)}
            value={metric.value}
            label={metric.label}
            size="sm"
            className="operational-alert-rail__kpi"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={[
        'operational-alert-rail',
        isHeader ? 'operational-alert-rail--header' : '',
        syncPulse ? 'operational-alert-rail--sync-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <OperationalStrip
        metrics={stripMetrics}
        screenMode={screenMode as any}
        layout={'compact' as any}
        ariaLabel={ariaLabel as any}
        eyebrow={null}
        readOnly={readOnly as any}
        metricLabelsUppercase={false as any}
        className={[
          'operational-alert-rail__strip',
          isHeader ? 'operational-alert-rail__strip--header' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
