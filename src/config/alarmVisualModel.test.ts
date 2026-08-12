import { describe, expect, it } from 'vitest';
import {
  alarmKpiClassNames,
  alarmRowClassNames,
  alarmSeverityAriaLabel,
  compareAlarmSeverity,
  isAlarmingSeverity,
  resolveAlarmSeverity,
} from './alarmVisualModel';

describe('alarmVisualModel', () => {
  it('maps tones to severities', () => {
    expect(resolveAlarmSeverity('critical')).toBe('critical');
    expect(resolveAlarmSeverity('high')).toBe('critical');
    expect(resolveAlarmSeverity('warning')).toBe('warning');
    expect(resolveAlarmSeverity('watch')).toBe('warning');
    expect(resolveAlarmSeverity('success')).toBe('ok');
    expect(resolveAlarmSeverity('stable')).toBe('ok');
    expect(resolveAlarmSeverity(undefined)).toBe('neutral');
  });

  it('recognizes the full-word "information" tone, not just "info" (metric-card audit regression)', () => {
    // SaasHealthCenter.tsx and OperationalDiagnosticsPanel.tsx pass tone="information" to
    // MetricCard -- only the abbreviation "info" was recognized here, so those cards silently
    // rendered as plain neutral/gray instead of the intended info-blue styling.
    expect(resolveAlarmSeverity('information')).toBe('info');
    expect(resolveAlarmSeverity('Information')).toBe('info');
  });

  it('ranks critical above warning', () => {
    expect(compareAlarmSeverity('critical', 'warning')).toBeLessThan(0);
    expect(isAlarmingSeverity('critical')).toBe(true);
    expect(isAlarmingSeverity('ok')).toBe(false);
  });

  it('builds kpi class names with pulse for critical', () => {
    const classes = alarmKpiClassNames('critical');
    expect(classes).toContain('alarm-kpi');
    expect(classes).toContain('alarm-kpi--critical');
    expect(classes).toContain('alarm-kpi--alarming');
    expect(classes).toContain('alarm-kpi--pulse');
  });

  it('builds row class names for lists', () => {
    expect(alarmRowClassNames('warning')).toContain('alarm-row--warning');
    expect(alarmSeverityAriaLabel('critical')).toBe('Critical alarm');
  });

  it('maps danger/red/band colors and surface helpers', async () => {
    const { alarmSurfaceClassNames, alarmSeverityBadge, resolveAlarmSeverity } = await import(
      './alarmVisualModel'
    );
    expect(resolveAlarmSeverity('danger')).toBe('critical');
    expect(resolveAlarmSeverity('Red')).toBe('critical');
    expect(resolveAlarmSeverity('Yellow')).toBe('warning');
    expect(alarmSeverityBadge('critical')).toBe('CRIT');
    expect(alarmSurfaceClassNames('critical')).toContain('alarm-surface--critical');
  });
});
