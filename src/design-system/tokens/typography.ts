/**
 * Typed mirror of src/styles/cdl-v2/tokens.css typography tokens.
 * See tokens/spacing.ts header for why this mirror exists.
 */

export const CDL_FONT_FAMILY = Object.freeze({
  sans: "'Inter', 'Segoe UI Variable', 'Aptos', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
});

export const CDL_FONT_SIZE_PX = Object.freeze({
  '2xs': 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const);

export type CdlFontSizeStep = keyof typeof CDL_FONT_SIZE_PX;

export const CDL_FONT_WEIGHT = Object.freeze({
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const);

export const CDL_LINE_HEIGHT = Object.freeze({
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.6,
} as const);

export function cdlFontSizeVar(step: CdlFontSizeStep): string {
  return `var(--cdl-text-${step})`;
}
