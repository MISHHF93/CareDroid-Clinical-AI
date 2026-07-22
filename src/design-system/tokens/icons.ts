/**
 * Icon tokens for CEDS. This module intentionally re-exports the existing
 * icon registry (src/navigation/iconRegistry.ts, already consumed by 30+
 * files) rather than defining a second icon set — see DESIGN_SYSTEM.md.
 * It adds only the sizing/tone scale from src/styles/cdl-v2/icon.css, which
 * had no TS mirror before this file.
 */
export * from '../../navigation/iconRegistry';

export const CDL_ICON_SIZE_PX = Object.freeze({
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const);

export type CdlIconSizeStep = keyof typeof CDL_ICON_SIZE_PX;

export const CDL_ICON_STROKE_WIDTH = 1.85;

export function cdlIconSizeVar(step: CdlIconSizeStep): string {
  return `var(--cdl-icon-${step})`;
}
