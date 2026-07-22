/**
 * Typed mirror of src/styles/cdl-v2/tokens.css radius tokens.
 * See tokens/spacing.ts header for why this mirror exists.
 */

export const CDL_RADIUS_PX = Object.freeze({
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const);

export type CdlRadiusStep = keyof typeof CDL_RADIUS_PX;

export function cdlRadiusVar(step: CdlRadiusStep): string {
  return `var(--cdl-radius-${step})`;
}
