/**
 * Typed mirror of src/styles/cdl-v2/theme.css semantic color roles.
 *
 * Deliberately does NOT hardcode hex values — theme.css defines a different
 * value per role under html[data-theme='light'] vs. html[data-theme='dark'],
 * switched by a single data-theme attribute on <html>. A hardcoded hex here
 * would be wrong in one of the two modes. Use cdlColorVar() to get a
 * var(--cdl-*) reference that resolves correctly under either theme.
 */

export const CDL_SEMANTIC_TONES = Object.freeze([
  'critical',
  'urgent',
  'warning',
  'info',
  'ok',
  'ai',
  'ops',
  'neutral',
] as const);

export type CdlSemanticTone = (typeof CDL_SEMANTIC_TONES)[number];

export type CdlColorRole = 'text' | 'bg' | 'border';

/** e.g. cdlColorVar('critical', 'bg') -> 'var(--cdl-critical-bg)' */
export function cdlColorVar(tone: CdlSemanticTone, role?: CdlColorRole): string {
  return role ? `var(--cdl-${tone}-${role})` : `var(--cdl-${tone})`;
}

export const CDL_SURFACE_VAR = Object.freeze({
  page: 'var(--cdl-surface-page)',
  card: 'var(--cdl-surface-card)',
  muted: 'var(--cdl-surface-muted)',
  inset: 'var(--cdl-surface-inset)',
  elevated: 'var(--cdl-surface-elevated)',
});

export const CDL_INK_VAR = Object.freeze({
  primary: 'var(--cdl-ink)',
  muted: 'var(--cdl-ink-muted)',
  subtle: 'var(--cdl-ink-subtle)',
  disabled: 'var(--cdl-ink-disabled)',
  inverse: 'var(--cdl-ink-inverse)',
});

export const CDL_ACUITY_VAR = Object.freeze({
  P1: 'var(--cdl-acuity-p1)',
  P2: 'var(--cdl-acuity-p2)',
  P3: 'var(--cdl-acuity-p3)',
  P4: 'var(--cdl-acuity-p4)',
  P5: 'var(--cdl-acuity-p5)',
});
