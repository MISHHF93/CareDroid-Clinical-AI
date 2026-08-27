import { useMemo, type ReactNode } from 'react';
import type { CareDroidScreenMode } from '../../config/careDroidScreenModes';
import { resolveAlarmSeverity, shouldPulse, type AlarmSeverity } from '../../alarm/types';
import OperationalStrip from './OperationalStrip';
import {
  buildHeaderOperationalAlertMetrics,
  type BuildOperationalAlertMetricsInput,
} from './operationalAlertRailModel';
import './OperationalAlertRail.css';

/**
 * Header-only status capsule -- deliberately NOT AlarmKpi. AlarmKpi is a
 * stacked stat-card (badge+label crammed on one line, value below) shared
 * with the Patients page metrics rail; in the header's narrow slim bar that
 * layout truncated labels mid-word ("Triage que…") and duplicated severity
 * signal twice (a colored card fill AND a text "WARN"/"CRIT" badge).
 * This is a single-row capsule instead: a status dot carries severity,
 * the value leads (what you'd scan for first), the label trails and is
 * the only thing allowed to truncate. Scoped to the header only -- the
 * Patients page rail and everywhere else AlarmKpi is used are untouched.
 *
 * Naming note: avoid "pill"/"chip"/"badge"/"tag"/"header"/"action"/
 * "control"/"toolbar"/"filter" as class-name substrings -- visual-
 * consistency.css has several `.app-shell [class*="…"]` wide-net
 * normalization rules targeting exactly those words with higher
 * specificity than a single custom class, which silently overrode this
 * component's white-space/max-width the first time around (confirmed via
 * a live cascade query, not guessed). "capsule" avoids all of them.
 */
function KpiCapsule({
  severity,
  value,
  label,
  hint,
}: {
  severity: AlarmSeverity;
  value: ReactNode;
  label: ReactNode;
  hint?: string;
}) {
  const pulse = shouldPulse(severity, false);
  // Full text always reachable on hover/focus, even when the label
  // truncates -- the pill's fixed max-width means a long label can be
  // clipped visually, but nothing here should require it to read the value.
  const title = [String(value), String(label), hint].filter(Boolean).join(' — ');
  return (
    <div
      className={[
        'cdl-kpi-capsule',
        `cdl-kpi-capsule--${severity}`,
        pulse ? 'cdl-kpi-capsule--pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-severity={severity}
      title={title}
    >
      <span className="cdl-kpi-capsule__dot" aria-hidden="true" />
      <span className="cdl-kpi-capsule__value">{value}</span>
      <span className="cdl-kpi-capsule__label">{label}</span>
    </div>
  );
}

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
          'cdl-kpi-capsule-rail',
          syncPulse ? 'operational-alert-rail--sync-pulse' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={ariaLabel}
      >
        {metrics.map((metric) => (
          <KpiCapsule
            key={metric.id}
            severity={resolveAlarmSeverity(metric.tone)}
            value={metric.value}
            label={metric.label}
            hint={metric.hint}
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
