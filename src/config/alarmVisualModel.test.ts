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
    expect(resolveAlarmSeverity('warning')).toBe('warning');
    expect(resolveAlarmSeverity('watch')).toBe('warning');
    expect(resolveAlarmSeverity('success')).toBe('ok');
    expect(resolveAlarmSeverity('stable')).toBe('ok');
    expect(resolveAlarmSeverity(undefined)).toBe('neutral');
  });

  // HEAL-177: reconciled with src/alarm/types.ts's 7-level scale (the platform standard the
  // user picked). 'high' previously (wrongly) matched 'critical' here while alarm/types.ts
  // already correctly resolved it to 'urgent' -- the same alert rendered a different
  // clinical-urgency treatment purely depending on which file a component imported from.
  it('maps "high"/"urgent" to the urgent tier, not critical (was the core cross-file disagreement)', () => {
    expect(resolveAlarmSeverity('high')).toBe('urgent');
    expect(resolveAlarmSeverity('urgent')).toBe('urgent');
    expect(resolveAlarmSeverity('High')).toBe('urgent');
  });

  it('treats "live"/"operational" as informational status, not "all-clear stable" (2nd disagreement fixed alongside "high")', () => {
    // A computation actively running on live data is not the same claim as "this metric is
    // healthy" -- matches src/alarm/types.ts's own treatment (operational/live -> info).
    expect(resolveAlarmSeverity('live')).toBe('info');
    expect(resolveAlarmSeverity('operational')).toBe('info');
  });

  it('resolves the "ai" tone to a distinct, non-severity tier', () => {
    expect(resolveAlarmSeverity('ai')).toBe('ai');
    expect(resolveAlarmSeverity('copilot')).toBe('ai');
    expect(resolveAlarmSeverity('recommendation')).toBe('ai');
    // 'ai' is a source tag, not a rung on the urgency ladder.
    expect(isAlarmingSeverity('ai')).toBe(false);
  });

  it('ranks urgent between warning and critical, and treats it as alarming', () => {
    expect(compareAlarmSeverity('critical', 'urgent')).toBeLessThan(0);
    expect(compareAlarmSeverity('urgent', 'warning')).toBeLessThan(0);
    expect(isAlarmingSeverity('urgent')).toBe(true);
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
    const { alarmSurfaceClassNames, alarmSeverityBadge, resolveAlarmSeverity } =
      await import('./alarmVisualModel');
    expect(resolveAlarmSeverity('danger')).toBe('critical');
    expect(resolveAlarmSeverity('Red')).toBe('critical');
    expect(resolveAlarmSeverity('Yellow')).toBe('warning');
    expect(alarmSeverityBadge('critical')).toBe('CRIT');
    expect(alarmSeverityBadge('urgent')).toBe('URGENT');
    expect(alarmSurfaceClassNames('critical')).toContain('alarm-surface--critical');
    expect(alarmSurfaceClassNames('high')).toContain('alarm-surface--urgent');
  });

  it('builds kpi class names for urgent without the critical-only pulse animation', () => {
    const classes = alarmKpiClassNames('high');
    expect(classes).toContain('alarm-kpi--urgent');
    expect(classes).toContain('alarm-kpi--alarming');
    expect(classes).not.toContain('alarm-kpi--pulse');
  });
});
