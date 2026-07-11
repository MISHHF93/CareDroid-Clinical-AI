import { useMemo } from 'react';
import {
  compareAlarmSeverity,
  resolveAlarmSeverity,
} from '../../config/alarmVisualModel';
import { buildHeaderOperationalAlertMetrics } from '../emergency/operationalAlertRailModel';
import useHeaderOperationalMetrics from '../../hooks/useHeaderOperationalMetrics';
import AlarmKpiChip from './AlarmKpiChip';
import '../../styles/alarm-system.css';

/**
 * Context-bar department KPIs (max 3) with platform visual alarms.
 * Critical/warning chips pulse and show CRIT/WARN badges.
 */
export default function ChromeStatusChips() {
  const metricsInput = useHeaderOperationalMetrics();

  const metrics = useMemo(() => {
    if (!metricsInput.showOperationalStrip) return [];
    const built = buildHeaderOperationalAlertMetrics({
      centralSnapshot: metricsInput.centralSnapshot,
      syncLabel: metricsInput.syncLabel,
      syncTitle: metricsInput.syncTitle,
      syncStale: metricsInput.syncStale,
      syncPulse: metricsInput.syncPulse,
      intelligenceSnapshot: metricsInput.intelligenceSnapshot,
      screenMode: metricsInput.screenMode,
    });
    // Surface worst alarms first so critical KPIs are never truncated out of view.
    return [...built].sort((a, b) =>
      compareAlarmSeverity(resolveAlarmSeverity(a.tone), resolveAlarmSeverity(b.tone)),
    );
  }, [metricsInput]);

  if (!metrics.length) return null;

  const hasCritical = metrics.some((m) => resolveAlarmSeverity(m.tone) === 'critical');

  return (
    <ul
      className="alarm-kpi-rail chrome-status-chips"
      aria-label="Department status"
      {...(hasCritical ? { 'aria-live': 'assertive' as const } : {})}
    >
      {metrics.map((metric) => (
        <AlarmKpiChip
          key={metric.id}
          id={metric.id}
          label={metric.label}
          value={metric.value}
          tone={metric.tone}
          hint={metric.hint}
          as="li"
        />
      ))}
    </ul>
  );
}
