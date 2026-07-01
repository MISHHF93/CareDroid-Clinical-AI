/**
 * Canonical CareDroid medical palette for JS/TS inline styles.
 * CSS should prefer --medical-* / --app-* tokens from medical-color-layer.css.
 */
export const MEDICAL_THEME = Object.freeze({
  surfacePage: '#f8fafc',
  surfaceCard: '#ffffff',
  surfaceMuted: '#f1f5f9',
  surfaceInset: '#f1f5f9',
  border: '#e2e8f0',
  borderInput: '#cbd5e1',
  ink: '#111827',
  inkMuted: '#64748b',
  inkSubtle: '#94a3b8',
  inkDisabled: '#d1d5db',
  accent: '#0ea5e9',
  accentSoft: '#38bdf8',
  accentHover: '#0284c7',
  accentTint: 'rgba(14, 165, 233, 0.12)',
  accentTintStrong: 'rgba(14, 165, 233, 0.18)',
  accentBorder: 'rgba(14, 165, 233, 0.45)',
  onAccent: '#ffffff',
  overlay: 'rgba(17, 24, 39, 0.32)',
  shadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
  shadowModal: '0 20px 48px rgba(15, 23, 42, 0.12)',
  danger: '#ef4444',
  success: '#22c55e',
  successTint: '#ecfdf5',
  successBorder: '#166534',
  criticalTint: '#fef2f2',
  criticalBorder: '#7f1d1d',
});

/** Text roles for inline TSX styles — mirrors --medical-text-* CSS tokens. */
export const MEDICAL_TYPE = Object.freeze({
  heading: MEDICAL_THEME.ink,
  body: MEDICAL_THEME.ink,
  muted: MEDICAL_THEME.inkMuted,
  subtle: MEDICAL_THEME.inkSubtle,
  disabled: MEDICAL_THEME.inkDisabled,
  placeholder: MEDICAL_THEME.inkSubtle,
  link: MEDICAL_THEME.accent,
  linkHover: MEDICAL_THEME.accentHover,
  onAccent: MEDICAL_THEME.onAccent,
  statusCritical: '#b91c1c',
  statusHigh: '#c2410c',
  statusWarning: '#b45309',
  statusInfo: '#0284c7',
  statusSuccess: '#15803d',
});

export const medicalTextStyle = Object.freeze({
  heading: { color: MEDICAL_TYPE.heading },
  body: { color: MEDICAL_TYPE.body },
  muted: { color: MEDICAL_TYPE.muted },
  subtle: { color: MEDICAL_TYPE.subtle, fontSize: 12 },
  caption: { color: MEDICAL_TYPE.subtle, fontSize: 13 },
  link: { color: MEDICAL_TYPE.link, fontWeight: 700 as const },
});

export const medicalPanelStyle = Object.freeze({
  border: `1px solid ${MEDICAL_THEME.border}`,
  background: MEDICAL_THEME.surfaceCard,
  color: MEDICAL_THEME.ink,
  borderRadius: 12,
});

export const medicalAccentPanelStyle = Object.freeze({
  border: `1px solid ${MEDICAL_THEME.accentBorder}`,
  background: MEDICAL_THEME.accentTint,
  color: MEDICAL_THEME.ink,
  borderRadius: 12,
});

/** Card surface contracts — always pair background with readable foreground. */
export const MEDICAL_CARD = Object.freeze({
  default: Object.freeze({
    bg: MEDICAL_THEME.surfaceCard,
    fg: MEDICAL_THEME.ink,
    fgMuted: MEDICAL_THEME.inkMuted,
    fgSubtle: MEDICAL_THEME.inkSubtle,
    border: MEDICAL_THEME.border,
  }),
  muted: Object.freeze({
    bg: MEDICAL_THEME.surfaceMuted,
    fg: MEDICAL_THEME.ink,
    fgMuted: MEDICAL_THEME.inkMuted,
    border: MEDICAL_THEME.border,
  }),
  accent: Object.freeze({
    bg: MEDICAL_THEME.accentTint,
    fg: MEDICAL_THEME.ink,
    fgMuted: MEDICAL_THEME.inkMuted,
    border: MEDICAL_THEME.accentBorder,
  }),
  solid: Object.freeze({
    bg: MEDICAL_THEME.accent,
    fg: MEDICAL_THEME.onAccent,
    border: MEDICAL_THEME.accent,
  }),
  success: Object.freeze({
    bg: MEDICAL_THEME.successTint,
    fg: MEDICAL_TYPE.statusSuccess,
    border: MEDICAL_THEME.successBorder,
  }),
  critical: Object.freeze({
    bg: MEDICAL_THEME.criticalTint,
    fg: MEDICAL_TYPE.statusCritical,
    border: MEDICAL_THEME.criticalBorder,
  }),
});

export const medicalCardStyle = Object.freeze({
  default: {
    background: MEDICAL_CARD.default.bg,
    color: MEDICAL_CARD.default.fg,
    border: `1px solid ${MEDICAL_CARD.default.border}`,
    borderRadius: 12,
  },
  muted: {
    background: MEDICAL_CARD.muted.bg,
    color: MEDICAL_CARD.muted.fg,
    border: `1px solid ${MEDICAL_CARD.muted.border}`,
    borderRadius: 12,
  },
  accent: {
    background: MEDICAL_CARD.accent.bg,
    color: MEDICAL_CARD.accent.fg,
    border: `1px solid ${MEDICAL_CARD.accent.border}`,
    borderRadius: 12,
  },
});