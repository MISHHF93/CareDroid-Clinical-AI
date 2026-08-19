/**
 * Canonical CareDroid medical palette for JS/TS inline styles.
 * Prefer CSS --cdl-* / --medical-* / --app-* tokens. Values mirror CDL v2 color.css.
 *
 * Every value below is wrapped in `var(--app-*, <original light value>)` --
 * these are inline JS styles (CommandPalette, PatientDetailPanel, QuickIntake,
 * WhoNextPanel, several calculators/dashboards, 24 consumers total), so unlike
 * CSS classes they never picked up `html[data-theme='dark']`'s overrides at
 * all: this whole module was a plain hardcoded light palette, the same bug
 * class medicalThemeAudit.test.ts has already caught 3 times in CSS files
 * (HEAL-212/214/317) but had never been checked for in this JS constants
 * file. Confirmed live: CommandPalette rendered as a stark white modal over
 * an otherwise fully dark UI. The fallback (2nd arg) is unchanged from the
 * original hardcoded value, so light mode renders pixel-identical to before.
 */
export const MEDICAL_THEME = Object.freeze({
  surfacePage: 'var(--app-bg, #f8fafc)',
  surfaceCard: 'var(--app-panel-bg, #ffffff)',
  surfaceMuted: 'var(--app-surface-muted, #f1f5f9)',
  surfaceInset: 'var(--app-surface-muted, #f1f5f9)',
  border: 'var(--app-border-subtle, #e2e8f0)',
  borderInput: 'var(--app-input-border, #cbd5e1)',
  ink: 'var(--app-fg, #111827)',
  // Align with CSS --cdl-ink-muted / --medical-ink-muted (WCAG AA on Medical Light)
  inkMuted: 'var(--app-fg-muted, #475569)',
  inkSubtle: 'var(--app-fg-muted, #475569)',
  inkDisabled: 'var(--app-disabled, #d1d5db)',
  accent: 'var(--app-accent, #0ea5e9)',
  accentSoft: 'var(--app-accent-interactive, #38bdf8)',
  accentHover: 'var(--app-accent-hover, #0284c7)',
  accentTint: 'var(--app-hover, rgba(14, 165, 233, 0.12))',
  accentTintStrong: 'rgba(14, 165, 233, 0.18)',
  accentBorder: 'rgba(14, 165, 233, 0.45)',
  onAccent: 'var(--app-accent-contrast, #ffffff)',
  overlay: 'rgba(17, 24, 39, 0.4)',
  // Clinical depth elevation (CDL v2 elev-2 / elev-4)
  shadow: 'var(--app-shadow-1, 0 2px 6px hsl(222 47% 11% / 0.06), 0 1px 2px hsl(222 47% 11% / 0.04))',
  shadowModal: 'var(--app-shadow-2, 0 16px 40px hsl(222 47% 11% / 0.14), 0 4px 12px hsl(222 47% 11% / 0.06))',
  // Solid semantic inks for text-on-white (WCAG AA large ≥3:1 / normal ≥4.5:1)
  danger: 'var(--app-danger, #991b1b)',
  warning: 'var(--app-warning, #b45309)',
  warningTint: '#fffbeb',
  warningBorder: 'var(--app-warning, #b45309)',
  success: 'var(--app-success, #047857)',
  successTint: '#ecfdf5',
  successBorder: 'var(--app-success, #059669)',
  criticalTint: '#fef2f2',
  criticalBorder: 'var(--app-danger, #dc2626)',
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