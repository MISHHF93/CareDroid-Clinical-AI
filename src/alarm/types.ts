/**
 * Unified CareDroid alarm contract — single severity + surface vocabulary
 * for dock, banner, rail, toast, KPI, and inline alerts.
 *
 * HEAL-177 (2026-08-13): `src/config/alarmVisualModel.ts` (the chrome/KPI-strip/metric-card
 * alarm system) independently defined its own `resolveAlarmSeverity`/`AlarmSeverity` with a
 * disagreeing 5-level scale until this round -- most concretely, the tone `'high'` mapped to
 * `'critical'` there but `'urgent'` here, so the same alert rendered a different
 * clinical-urgency treatment depending on which file a component imported from. That file's
 * severity resolution now matches this one for every tone both recognize (its own broader
 * tone-synonym vocabulary is unchanged, only the resulting severity had to agree) and its CSS
 * (`src/styles/alarm-system.css`) now has real `urgent`/`ai` tiers reusing this design
 * system's own already-approved `--cdl-urgent-*`/`--cdl-ai-*` color tokens. Still open, lower
 * risk, correctly deferred: `ai` here is carried as a 7th `AlarmSeverity` value even though
 * it's really a source tag (recommendation-sourced), not a severity level -- splitting it into
 * a separate non-severity field on `AlarmItem` and this file's own consumers is a further,
 * larger refactor of this canonical file, not attempted in the same round as fixing the
 * critical-vs-urgent disagreement.
 */

export const ALARM_SEVERITIES = [
  'critical',
  'urgent',
  'warning',
  'info',
  'ok',
  'neutral',
  'ai',
] as const;

export type AlarmSeverity = (typeof ALARM_SEVERITIES)[number];

export const ALARM_SURFACES = ['dock', 'banner', 'rail', 'toast', 'inline', 'history', 'kpi'] as const;

export type AlarmSurface = (typeof ALARM_SURFACES)[number];

export type AlarmAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export type AlarmItem = {
  id: string;
  severity: AlarmSeverity;
  title: string;
  message?: string;
  owner?: string;
  patientId?: string;
  department?: string;
  source?: string;
  recommendedAction?: string;
  aiExplanation?: string;
  acknowledged?: boolean;
  createdAt?: string;
  actions?: AlarmAction[];
};

/** Map legacy tones / lifecycle tiers into AlarmSeverity. */
export function resolveAlarmSeverity(input: string | null | undefined): AlarmSeverity {
  const raw = String(input || '')
    .trim()
    .toLowerCase();
  switch (raw) {
    case 'critical':
    case 'danger':
    case 'life-threatening':
      return 'critical';
    case 'urgent':
    case 'high':
      return 'urgent';
    case 'warning':
    case 'attention':
    case 'medium':
    case 'watch':
      return 'warning';
    case 'info':
    case 'information':
    case 'informational':
    case 'notice':
      return 'info';
    case 'ok':
    case 'success':
    case 'healthy':
    case 'stable':
    case 'resolved':
      return 'ok';
    case 'ai':
    case 'ai_assistance':
    case 'copilot':
    case 'recommendation':
      return 'ai';
    case 'neutral':
    case 'inactive':
    default:
      if (raw === 'operational' || raw === 'live') return 'info';
      return raw && (ALARM_SEVERITIES as readonly string[]).includes(raw)
        ? (raw as AlarmSeverity)
        : 'neutral';
  }
}

export function alarmAriaRole(severity: AlarmSeverity): 'alert' | 'status' {
  return severity === 'critical' || severity === 'urgent' || severity === 'warning'
    ? 'alert'
    : 'status';
}

export function shouldPulse(severity: AlarmSeverity, acknowledged?: boolean): boolean {
  return severity === 'critical' && !acknowledged;
}
