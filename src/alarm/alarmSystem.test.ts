import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alarmAriaRole,
  resolveAlarmSeverity,
  shouldPulse,
  ALARM_SEVERITIES,
} from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stylesRoot = join(__dirname, '../styles/cdl-v2');

describe('CDL v2 alarm system', () => {
  it('resolves legacy and lifecycle tones to unified severities', () => {
    expect(resolveAlarmSeverity('danger')).toBe('critical');
    expect(resolveAlarmSeverity('high')).toBe('urgent');
    expect(resolveAlarmSeverity('attention')).toBe('warning');
    expect(resolveAlarmSeverity('informational')).toBe('info');
    expect(resolveAlarmSeverity('success')).toBe('ok');
    expect(resolveAlarmSeverity('copilot')).toBe('ai');
    expect(resolveAlarmSeverity('unknown-xyz')).toBe('neutral');
  });

  it('uses alert role only for high-attention severities', () => {
    expect(alarmAriaRole('critical')).toBe('alert');
    expect(alarmAriaRole('urgent')).toBe('alert');
    expect(alarmAriaRole('warning')).toBe('alert');
    expect(alarmAriaRole('info')).toBe('status');
    expect(alarmAriaRole('ok')).toBe('status');
  });

  it('pulses only unacknowledged critical alarms', () => {
    expect(shouldPulse('critical', false)).toBe(true);
    expect(shouldPulse('critical', true)).toBe(false);
    expect(shouldPulse('warning', false)).toBe(false);
  });

  it('ships a closed severity vocabulary', () => {
    expect(ALARM_SEVERITIES).toEqual([
      'critical',
      'urgent',
      'warning',
      'info',
      'ok',
      'neutral',
      'ai',
    ]);
  });

  it('defines CDL v2 foundation token files', () => {
    for (const name of ['tokens.css', 'color.css', 'shell.css', 'elevation.css', 'alarm.css', 'compat.css', 'index.css']) {
      const css = readFileSync(join(stylesRoot, name), 'utf8');
      expect(css.length).toBeGreaterThan(40);
    }
  });

  it('defines elevation levels 0–4 and critical alarm tokens', () => {
    const tokens = readFileSync(join(stylesRoot, 'tokens.css'), 'utf8');
    const color = readFileSync(join(stylesRoot, 'color.css'), 'utf8');
    const alarm = readFileSync(join(stylesRoot, 'alarm.css'), 'utf8');
    expect(tokens).toContain('--cdl-elev-0');
    expect(tokens).toContain('--cdl-elev-4');
    expect(color).toContain('--cdl-critical');
    expect(color).toContain('--cdl-ai');
    expect(alarm).toContain('data-severity');
    expect(alarm).toContain('cdl-alarm-dock');
    expect(alarm).toContain('prefers-reduced-motion');
  });

  it('compat aliases legacy alarm and shell variables', () => {
    const compat = readFileSync(join(stylesRoot, 'compat.css'), 'utf8');
    expect(compat).toContain('--alarm-critical: var(--cdl-critical)');
    expect(compat).toContain('--shell-header-height: var(--cdl-header-height)');
    expect(compat).toContain('--semantic-critical: var(--cdl-critical)');
  });
});
