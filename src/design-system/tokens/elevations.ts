/**
 * Typed mirror of src/styles/cdl-v2/tokens.css elevation steps.
 * Shadow VALUES differ between light and dark (see theme.css) — components
 * must use cdlElevationVar(), never a hardcoded shadow string, so dark mode
 * gets its own (stronger, non-tinted) shadow set automatically.
 */

export const CDL_ELEVATION_STEPS = Object.freeze([0, 1, 2, 3, 4] as const);

export type CdlElevationStep = (typeof CDL_ELEVATION_STEPS)[number];

export function cdlElevationVar(step: CdlElevationStep): string {
  return `var(--cdl-elev-${step})`;
}
