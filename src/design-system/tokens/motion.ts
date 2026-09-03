/**
 * Typed mirror of src/styles/cdl-v2/tokens.css motion tokens.
 * All durations collapse to 0ms under prefers-reduced-motion — that's a CSS
 * media query in tokens.css, invisible to these JS values; any JS-driven
 * animation (not CSS transition) must check matchMedia itself.
 */

export const CDL_DURATION_MS = Object.freeze({
  instant: 0,
  fast: 80,
  normal: 150,
  slow: 250,
  slower: 400,
} as const);

export type CdlDurationStep = keyof typeof CDL_DURATION_MS;

export const CDL_EASING = Object.freeze({
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const);

export function cdlDurationVar(step: CdlDurationStep): string {
  return `var(--cdl-duration-${step})`;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}
