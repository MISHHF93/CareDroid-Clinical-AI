/**
 * CareDroid semantic color system — every color carries operational meaning.
 * Decorative palette use is discouraged; prefer these tokens in TS and CSS (--semantic-*).
 */
import { MEDICAL_THEME, MEDICAL_TYPE } from './medicalTheme.constants';

export const SEMANTIC_COLOR_ROLES = Object.freeze({
  critical: Object.freeze({
    label: 'Life-threatening / timer breach',
    fg: MEDICAL_TYPE.statusCritical,
    bg: 'var(--semantic-critical-bg)',
    border: 'var(--semantic-critical-border)',
    cssVar: '--semantic-critical',
  }),
  urgent: Object.freeze({
    label: 'Urgent / escalation pending',
    fg: MEDICAL_TYPE.statusHigh,
    bg: 'var(--semantic-urgent-bg)',
    border: 'var(--semantic-urgent-border)',
    cssVar: '--semantic-urgent',
  }),
  attention: Object.freeze({
    label: 'Attention required',
    fg: MEDICAL_TYPE.statusWarning,
    bg: 'var(--semantic-attention-bg)',
    border: 'var(--semantic-attention-border)',
    cssVar: '--semantic-attention',
  }),
  healthy: Object.freeze({
    label: 'Completed / healthy / available',
    fg: MEDICAL_TYPE.statusSuccess,
    bg: 'var(--semantic-healthy-bg)',
    border: 'var(--semantic-healthy-border)',
    cssVar: '--semantic-healthy',
  }),
  information: Object.freeze({
    label: 'Information / navigation / AI assistance',
    fg: MEDICAL_TYPE.statusInfo,
    bg: 'var(--semantic-information-bg)',
    border: 'var(--semantic-information-border)',
    cssVar: '--semantic-information',
  }),
  inactive: Object.freeze({
    label: 'Inactive / historical / secondary',
    fg: MEDICAL_THEME.inkMuted,
    bg: 'var(--semantic-inactive-bg)',
    border: 'var(--semantic-inactive-border)',
    cssVar: '--semantic-inactive',
  }),
});

export type SemanticColorRole = keyof typeof SEMANTIC_COLOR_ROLES;

/** Maps operational KPI/alert tones to semantic roles. */
export const OPERATIONAL_TONE_TO_SEMANTIC: Readonly<Record<string, SemanticColorRole>> =
  Object.freeze({
    critical: 'critical',
    warning: 'attention',
    watch: 'attention',
    urgent: 'urgent',
    high: 'urgent',
    stable: 'healthy',
    success: 'healthy',
    info: 'information',
    neutral: 'inactive',
  });

export function resolveSemanticColorRole(
  tone: string | undefined,
  fallback: SemanticColorRole = 'inactive',
): SemanticColorRole {
  if (!tone) return fallback;
  return OPERATIONAL_TONE_TO_SEMANTIC[tone] || fallback;
}

export function semanticColorForRole(role: SemanticColorRole) {
  return SEMANTIC_COLOR_ROLES[role];
}

export function metricColorForTone(tone: string | undefined): string | undefined {
  const role = resolveSemanticColorRole(tone);
  if (role === 'inactive') return undefined;
  return SEMANTIC_COLOR_ROLES[role].fg;
}

/** Maps SaaS/platform health check statuses to semantic roles. */
export function healthCheckStatusToSemanticRole(
  status: string | undefined,
): SemanticColorRole {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'healthy' || normalized === 'ok') return 'healthy';
  if (normalized === 'critical' || normalized === 'failed' || normalized === 'error') {
    return 'critical';
  }
  if (normalized === 'warning' || normalized === 'warn' || normalized === 'degraded') {
    return 'attention';
  }
  return 'inactive';
}

/** Maps health statuses to StatusWidget / StatusBadge tone keys. */
export function healthCheckStatusToWidgetTone(status: string | undefined): string {
  const role = healthCheckStatusToSemanticRole(status);
  if (role === 'healthy') return 'success';
  if (role === 'critical') return 'critical';
  if (role === 'attention') return 'warning';
  return 'neutral';
}