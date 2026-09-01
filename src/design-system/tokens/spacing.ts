/**
 * Typed mirror of the 4px spacing grid defined in src/styles/cdl-v2/tokens.css.
 * The CSS custom properties remain the single source of truth (dual-theme,
 * cascade-aware); this module exists so JS/TS layout math (row heights,
 * virtualization, canvas/chart layout) doesn't need to parse CSS at runtime.
 * cdlTokenMirror.contract.test.ts asserts these values stay in sync with tokens.css.
 */

export const CDL_SPACING_PX = Object.freeze({
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const);

export type CdlSpacingStep = keyof typeof CDL_SPACING_PX;

/** CSS var reference for a spacing step, e.g. cdlSpaceVar(4) -> 'var(--cdl-space-4)'. */
export function cdlSpaceVar(step: CdlSpacingStep): string {
  const suffix = String(step).replace('.', '-');
  return `var(--cdl-space-${suffix})`;
}

/**
 * Standardized primary workflow card dimensions — the platform-wide contract
 * requested for CEDS/CETS. Mirrors the new --cdl-card-* tokens added to
 * tokens.css alongside this file; no card should hardcode these values.
 */
export const CDL_CARD_DIMENSIONS = Object.freeze({
  minWidthPx: 320,
  maxWidthPx: 400,
  minHeightPx: 220,
  paddingMinPx: 16,
  paddingMaxPx: 24,
  radiusMinPx: 14,
  radiusMaxPx: 18,
});
