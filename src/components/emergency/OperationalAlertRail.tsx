import { useMemo } from 'react';
import type { CareDroidScreenMode } from '../../config/careDroidScreenModes';
import { shouldForceCompactOperationalStrip } from '../../config/practitionerCleanup.config';
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
  screenMode = null,
}: OperationalAlertRailProps) {
  const dense = shouldForceCompactOperationalStrip();

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

  return (
    <div
      className={[
        'operational-alert-rail',
        dense ? 'operational-alert-rail--dense' : '',
        syncPulse ? 'operational-alert-rail--sync-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <OperationalStrip
        metrics={stripMetrics}
        screenMode={screenMode as any}
        layout={"compact" as any}
        ariaLabel={ariaLabel as any}
        eyebrow={null}
        readOnly={readOnly as any}
        metricLabelsUppercase={!dense as any}
        className="operational-alert-rail__strip"
      />
    </div>
  );
}