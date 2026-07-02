/**
 * Canonical color schema registry — single source for TS/TSX inline styles.
 * CSS should prefer --app-* / --medical-* / --semantic-* from design-system.css.
 */
import { MEDICAL_CARD, MEDICAL_THEME, MEDICAL_TYPE, medicalAccentPanelStyle } from './medicalTheme.constants';

/** CSS custom property names (use in style objects as `var(--app-fg-muted)`). */
export const COLOR_CSS_VARS = Object.freeze({
  fg: 'var(--app-fg)',
  fgMuted: 'var(--app-fg-muted)',
  fgSubtle: 'var(--medical-ink-subtle)',
  surfacePage: 'var(--app-bg)',
  surfaceCard: 'var(--app-surface-1)',
  surfaceMuted: 'var(--app-surface-muted)',
  border: 'var(--app-panel-border)',
  accent: 'var(--app-accent-interactive)',
  accentTint: 'var(--medical-accent-tint)',
  accentBorder: 'var(--medical-accent-border)',
  danger: 'var(--app-danger)',
  success: 'var(--app-success)',
  warning: 'var(--app-warning)',
  info: 'var(--app-info)',
  onAccent: 'var(--app-on-solid)',
  semanticCritical: 'var(--semantic-critical)',
  semanticHealthy: 'var(--semantic-healthy)',
  semanticInformation: 'var(--semantic-information)',
  semanticAi: 'var(--semantic-ai-assistance)',
});

/** Ready-made inline style fragments for common UI patterns. */
export const COLOR_INLINE_STYLES = Object.freeze({
  textMuted: { color: COLOR_CSS_VARS.fgMuted },
  textBody: { color: COLOR_CSS_VARS.fg },
  textDanger: { color: COLOR_CSS_VARS.danger },
  textSuccess: { color: COLOR_CSS_VARS.semanticHealthy },
  textLink: { color: COLOR_CSS_VARS.accent },
  accentPanel: medicalAccentPanelStyle,
  successPanel: {
    background: MEDICAL_CARD.success.bg,
    border: `1px solid ${MEDICAL_CARD.success.border}`,
    color: MEDICAL_CARD.success.fg,
    borderRadius: 12,
  },
  dangerPanel: {
    background: MEDICAL_CARD.critical.bg,
    border: `1px solid ${MEDICAL_CARD.critical.border}`,
    color: MEDICAL_CARD.critical.fg,
    borderRadius: 12,
  },
  guidelineBadge: {
    background: COLOR_CSS_VARS.accentTint,
    border: `1px solid ${COLOR_CSS_VARS.accentBorder}`,
    color: COLOR_CSS_VARS.semanticInformation,
  },
});

/** Hex literals for charts/tests — mirrors theme-tokens.css. */
export const CHART_PALETTE = Object.freeze({
  critical: MEDICAL_THEME.danger,
  high: MEDICAL_TYPE.statusHigh,
  moderate: MEDICAL_TYPE.statusWarning,
  low: MEDICAL_THEME.success,
  criticalBg: MEDICAL_THEME.criticalTint,
  highBg: '#fff7ed',
  moderateBg: '#fffbeb',
  lowBg: MEDICAL_THEME.successTint,
});