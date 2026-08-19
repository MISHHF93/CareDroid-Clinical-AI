/**
 * Platform-wide visual alarm model.
 *
 * CONTRACT (use everywhere KPIs / lists / badges show risk):
 *
 * 1. Resolve severity: `resolveAlarmSeverity(tone)`
 * 2. Chips / strip metrics: `alarm-kpi` + `data-alarm` via alarmKpiClassNames
 * 3. Cards / widgets: `alarm-surface` + `data-alarm` via alarmSurfaceClassNames
 * 4. Table/list rows: `alarm-row` + `data-alarm` via alarmRowClassNames
 * 5. Inline markers: `alarm-dot` + severity modifier via alarmDotClassNames
 *
 * Severity ladder: critical > urgent > warning > info > ok > neutral (+ ai, a source tag not
 * a severity level -- see note below)
 * Visual system CSS: `src/styles/alarm-system.css` (imported in main.tsx)
 *
 * Surfaces already wired:
 * - OperationalStrip metrics (the live header/EMS/whiteboard chip rail)
 * - AlarmKpi (src/alarm/) -- patient-module metric rail
 * - MetricChip / MetricCard / StatusWidget
 *
 * ChromeStatusChips and AlarmKpiChip (src/components/chrome/) were deleted
 * 2026-08-19 as confirmed dead code -- zero real call sites, superseded by
 * OperationalStrip/AlarmKpi above. StatCard (src/components/data-display/)
 * was deleted the same round for the same reason.
 *
 * HEAL-177 (2026-08-13) — RECONCILED with `src/alarm/types.ts`. Until this round the two
 * files independently defined `resolveAlarmSeverity`/`AlarmSeverity` with disagreeing scales
 * (this file's 5-level critical/warning/info/ok/neutral vs. that file's 7-level
 * critical/urgent/warning/info/ok/neutral/ai) -- most concretely, the tone `'high'` mapped to
 * `'critical'` HERE but `'urgent'` THERE, so the same alert rendered a different
 * clinical-urgency treatment purely depending on which file a component imported from. User
 * chose the 7-level scale as the platform standard (`urgent` sits between `warning` and
 * `critical`, giving clinicians a visual distinction "needs prompt attention" is missing when
 * folded into "needs attention right now"). This file's `AlarmSeverity`/`resolveAlarmSeverity`
 * now match `src/alarm/types.ts` for every tone both files recognize -- confirmed by fixing 2
 * real disagreements, not just adding the new tiers: `'high'` now correctly resolves to
 * `urgent` (was `critical`), and `'live'`/`'operational'` now resolve to `info` (was `ok` --
 * "a computation is actively running on live data" is not the same claim as "this metric is
 * healthy/stable", matching `src/alarm/types.ts`'s own treatment). This file keeps its own
 * broader tone-synonym vocabulary (`red`/`severe`/`elevated`/`orange`/`yellow`/`amber`/
 * `green`/`good`/`ready`/`online`/`active`/`blue`) since upstream callers here use a wider
 * variety of tone strings than `alarm/types.ts`'s callers do -- only the SEVERITY each maps to
 * needed to agree, not the full synonym list.
 *
 * `ai` is carried over as a 7th value for full type parity with `alarm/types.ts`, but it is
 * NOT a severity level -- it marks an alert as recommendation-sourced (deliberately excluded
 * from `isAlarmingSeverity`/`SEVERITY_RANK`'s ladder ordering, styled in a distinct color so it
 * never reads as more/less urgent than the real critical/urgent/warning tiers). Splitting `ai`
 * out into a separate non-severity `source` field on `AlarmItem`/callers is a further, larger
 * refactor of `src/alarm/types.ts` itself (its own existing consumers assume `ai` is a valid
 * `AlarmSeverity`) -- correctly deferred rather than attempted in the same round as fixing the
 * dangerous critical-vs-urgent disagreement.
 */

export type AlarmSeverity = 'critical' | 'urgent' | 'warning' | 'info' | 'ok' | 'neutral' | 'ai';

export type AlarmToneInput =
  | 'critical'
  | 'urgent'
  | 'warning'
  | 'watch'
  | 'info'
  | 'success'
  | 'stable'
  | 'neutral'
  | 'danger'
  | 'error'
  | 'ai'
  | string
  | null
  | undefined;

const SEVERITY_RANK: Record<AlarmSeverity, number> = {
  critical: 5,
  urgent: 4,
  warning: 3,
  info: 2,
  ok: 1,
  neutral: 0,
  // 'ai' is a source tag, not a rung on the urgency ladder -- ranked alongside 'info' so it
  // never outranks a real severity in a sorted list, but isn't literally 0/neutral either.
  ai: 2,
};

/** Normalize any metric/list tone into a platform alarm severity. */
export function resolveAlarmSeverity(tone: AlarmToneInput): AlarmSeverity {
  const t = String(tone || 'neutral').toLowerCase().trim();
  if (t === 'critical' || t === 'danger' || t === 'error' || t === 'red' || t === 'severe') {
    return 'critical';
  }
  if (t === 'urgent' || t === 'high') {
    return 'urgent';
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
  if (
    t === 'info' ||
    t === 'information' ||
    t === 'notice' ||
    t === 'blue' ||
    t === 'live' ||
    t === 'operational'
  ) {
    return 'info';
  }
  if (t === 'ai' || t === 'ai_assistance' || t === 'copilot' || t === 'recommendation') {
    return 'ai';
  }
  if (
    t === 'success' ||
    t === 'stable' ||
    t === 'ok' ||
    t === 'healthy' ||
    t === 'green' ||
    t === 'good' ||
    t === 'ready' ||
    t === 'online' ||
    t === 'active'
  ) {
    return 'ok';
  }
  return 'neutral';
}

export function isAlarmingSeverity(severity: AlarmSeverity): boolean {
  return severity === 'critical' || severity === 'urgent' || severity === 'warning';
}

export function compareAlarmSeverity(a: AlarmSeverity, b: AlarmSeverity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

/** Human phrase for screen readers. */
export function alarmSeverityAriaLabel(severity: AlarmSeverity): string {
  if (severity === 'critical') return 'Critical alarm';
  if (severity === 'urgent') return 'Urgent';
  if (severity === 'warning') return 'Warning';
  if (severity === 'info') return 'Information';
  if (severity === 'ok') return 'Stable';
  if (severity === 'ai') return 'AI recommendation';
  return '';
}

/** Compact badge text for critical/urgent/warning only. */
export function alarmSeverityBadge(severity: AlarmSeverity): string | null {
  if (severity === 'critical') return 'CRIT';
  if (severity === 'urgent') return 'URGENT';
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
