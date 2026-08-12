/**
 * Unified CareDroid alarm contract — single severity + surface vocabulary
 * for dock, banner, rail, toast, KPI, and inline alerts.
 *
 * KNOWN DUPLICATE, NOT YET RECONCILED (found 2026-08-12, repo-wide export-collision audit):
 * `src/config/alarmVisualModel.ts` independently defines its OWN `resolveAlarmSeverity`/
 * `AlarmSeverity` with a different 5-level scale (critical/warning/info/ok/neutral, no
 * urgent/ai tier) -- most concretely, the tone `'high'` maps to `'urgent'` HERE but to
 * `'critical'` THERE. Both files are live, both imported by 15+ real components split
 * roughly evenly between them. The same tone string can render a different clinical-urgency
 * treatment purely depending on which file a given component happens to import from. Needs a
 * deliberate consolidation decision -- do not merge unilaterally; flagged in
 * docs/architecture/CARE_DROID_MASTER_BACKLOG.md for a dedicated round.
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
