/**
 * Platform-wide visual alarm model.
 *
 * CONTRACT (use everywhere KPIs / lists / badges show risk):
 *
 * 1. Resolve severity: `resolveAlarmSeverity(tone)`
 * 2. Chips / strip metrics: `alarm-kpi` + `data-alarm` via AlarmKpiChip or alarmKpiClassNames
 * 3. Cards / widgets: `alarm-surface` + `data-alarm` via alarmSurfaceClassNames
 * 4. Table/list rows: `alarm-row` + `data-alarm` via alarmRowClassNames
 * 5. Inline markers: `alarm-dot` + severity modifier via alarmDotClassNames
 *
 * Severity ladder: critical > warning > info > ok > neutral
 * Visual system CSS: `src/styles/alarm-system.css` (imported in main.tsx)
 *
 * Surfaces already wired:
 * - Chrome context KPIs (ChromeStatusChips / AlarmKpiChip)
 * - OperationalStrip metrics
 * - MetricChip / MetricCard / StatusWidget / StatCard
 *
 * KNOWN DUPLICATE, NOT YET RECONCILED (found 2026-08-12, repo-wide export-collision audit):
 * `src/alarm/types.ts` independently defines its OWN `resolveAlarmSeverity`/`AlarmSeverity`
 * with a different 7-level scale (critical/urgent/warning/info/ok/neutral/ai vs. this file's
 * 5-level critical/warning/info/ok/neutral) -- most concretely, the tone `'high'` maps to
 * `'critical'` HERE but to `'urgent'` THERE. Both files are live, both are imported by 15+
 * real components split roughly evenly between them (PatientCard, ChromeStatusChips,
 * CareDroidPrimitives, AlarmDock, AlarmBanner, AlarmKpi, OperationalStrip, and more). The same
 * tone string can render a different clinical-urgency treatment purely depending on which file
 * a given component happens to import from. This needs a deliberate consolidation decision
 * (which 5-vs-7-level scale wins, and migrating every call site) -- do not merge unilaterally;
 * flagged in docs/architecture/CARE_DROID_MASTER_BACKLOG.md for a dedicated round.
 */

export type AlarmSeverity = 'critical' | 'warning' | 'info' | 'ok' | 'neutral';

export type AlarmToneInput =
  | 'critical'
  | 'warning'
  | 'watch'
  | 'info'
  | 'success'
  | 'stable'
  | 'neutral'
  | 'danger'
  | 'error'
  | string
  | null
  | undefined;

const SEVERITY_RANK: Record<AlarmSeverity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  ok: 1,
  neutral: 0,
};

/** Normalize any metric/list tone into a platform alarm severity. */
export function resolveAlarmSeverity(tone: AlarmToneInput): AlarmSeverity {
  const t = String(tone || 'neutral').toLowerCase().trim();
  if (
    t === 'critical' ||
    t === 'danger' ||
    t === 'error' ||
    t === 'high' ||
    t === 'red' ||
    t === 'severe'
  ) {
    return 'critical';
  }
  if (
    t === 'warning' ||
    t === 'watch' ||
    t === 'attention' ||
    t === 'elevated' ||
    t === 'orange' ||
    t === 'yellow' ||
    t === 'amber'
  ) {
    return 'warning';
  }
  if (t === 'info' || t === 'information' || t === 'notice' || t === 'blue') return 'info';
  if (
    t === 'success' ||
    t === 'stable' ||
    t === 'ok' ||
    t === 'healthy' ||
    t === 'green' ||
    t === 'good' ||
    t === 'live' ||
    t === 'ready' ||
    t === 'online' ||
    t === 'active'
  ) {
    return 'ok';
  }
  return 'neutral';
}

export function isAlarmingSeverity(severity: AlarmSeverity): boolean {
  return severity === 'critical' || severity === 'warning';
}

export function compareAlarmSeverity(a: AlarmSeverity, b: AlarmSeverity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

/** Human phrase for screen readers. */
export function alarmSeverityAriaLabel(severity: AlarmSeverity): string {
  if (severity === 'critical') return 'Critical alarm';
  if (severity === 'warning') return 'Warning';
  if (severity === 'info') return 'Information';
  if (severity === 'ok') return 'Stable';
  return '';
}

/** Compact badge text for critical/warning only. */
export function alarmSeverityBadge(severity: AlarmSeverity): string | null {
  if (severity === 'critical') return 'CRIT';
  if (severity === 'warning') return 'WARN';
  return null;
}

/** CSS class names for a KPI chip using the shared alarm system. */
export function alarmKpiClassNames(
  tone: AlarmToneInput,
  options: { pulse?: boolean; size?: 'sm' | 'md' } = {},
): string {
  const severity = resolveAlarmSeverity(tone);
  return [
    'alarm-kpi',
    `alarm-kpi--${severity}`,
    isAlarmingSeverity(severity) ? 'alarm-kpi--alarming' : '',
    severity === 'critical' || options.pulse ? 'alarm-kpi--pulse' : '',
    options.size === 'sm' ? 'alarm-kpi--sm' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** CSS class names for metric cards / status widgets. */
export function alarmSurfaceClassNames(tone: AlarmToneInput): string {
  const severity = resolveAlarmSeverity(tone);
  return [
    'alarm-surface',
    `alarm-surface--${severity}`,
    isAlarmingSeverity(severity) ? 'alarm-surface--alarming' : '',
    severity === 'critical' ? 'alarm-surface--pulse' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function alarmRowClassNames(tone: AlarmToneInput): string {
  const severity = resolveAlarmSeverity(tone);
  return [
    'alarm-row',
    `alarm-row--${severity}`,
    isAlarmingSeverity(severity) ? 'alarm-row--alarming' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function alarmDotClassNames(tone: AlarmToneInput): string {
  const severity = resolveAlarmSeverity(tone);
  return ['alarm-dot', `alarm-dot--${severity}`].join(' ');
}

/** data-alarm + data-tone attrs for any element. */
export function alarmDataAttrs(tone: AlarmToneInput): {
  'data-alarm': AlarmSeverity;
  'data-tone': string;
} {
  const severity = resolveAlarmSeverity(tone);
  return {
    'data-alarm': severity,
    'data-tone': String(tone || 'neutral'),
  };
}
