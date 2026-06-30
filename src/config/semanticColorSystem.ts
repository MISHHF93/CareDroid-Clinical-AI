/**
 * CareDroid semantic color system — every color carries operational meaning.
 * Decorative palette use is discouraged; prefer these tokens in TS and CSS (--semantic-*).
 */
import { MEDICAL_THEME, MEDICAL_TYPE } from './medicalTheme.constants';

export const SEMANTIC_COLOR_ROLES = Object.freeze({
  critical: Object.freeze({
    label: 'Life-threatening / timer breach',
    fg: MEDICAL_TYPE.statusCritical,
    bg: MEDICAL_THEME.criticalTint,
    border: MEDICAL_THEME.criticalBorder,
    cssVar: '--semantic-critical',
  }),
  urgent: Object.freeze({
    label: 'Urgent / escalation pending',
    fg: MEDICAL_TYPE.statusHigh,
    bg: '#fff7ed',
    border: '#c2410c',
    cssVar: '--semantic-urgent',
  }),
  attention: Object.freeze({
    label: 'Attention required',
    fg: MEDICAL_TYPE.statusWarning,
    bg: '#fffbeb',
    border: '#b45309',
    cssVar: '--semantic-attention',
  }),
  healthy: Object.freeze({
    label: 'Completed / healthy / available',
    fg: MEDICAL_TYPE.statusSuccess,
    bg: MEDICAL_THEME.successTint,
    border: MEDICAL_THEME.successBorder,
    cssVar: '--semantic-healthy',
  }),
  information: Object.freeze({
    label: 'Information / navigation / AI assistance',
    fg: MEDICAL_TYPE.statusInfo,
    bg: MEDICAL_THEME.accentTint,
    border: MEDICAL_THEME.accentBorder,
    cssVar: '--semantic-information',
  }),
  inactive: Object.freeze({
    label: 'Inactive / historical / secondary',
    fg: MEDICAL_THEME.inkMuted,
    bg: MEDICAL_THEME.surfaceMuted,
    border: MEDICAL_THEME.border,
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