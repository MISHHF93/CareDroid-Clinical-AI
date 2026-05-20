/**
 * Design token constants — mirror CSS custom properties in design-tokens.css.
 * Use for tests, matchMedia, and programmatic layout; prefer CSS vars in stylesheets.
 *
 * @see src/styles/design-tokens.css
 * @see docs/design-tokens-audit.md
 */

/** Semantic breakpoint tiers (px). */
export const DESIGN_BREAKPOINTS = Object.freeze({
  mobile: Object.freeze({ min: 0, max: 767 }),
  tablet: Object.freeze({ min: 768, max: 1279 }),
  desktop: Object.freeze({ min: 1280, max: 1919 }),
  wide: Object.freeze({ min: 1920, max: null }),
});

export const DESIGN_BREAKPOINTS_PX = Object.freeze({
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1279,
  desktopMin: 1280,
  desktopMax: 1919,
  wideMin: 1920,
  splitFormMin: 1024,
  compactShellMax: 900,
  narrowMax: 600,
  touchEnforceMax: 640,
});

/** @deprecated Use DESIGN_BREAKPOINTS — kept for mobile-first QA imports */
export { MOBILE_FIRST_BREAKPOINTS, MOBILE_FIRST_VIEWPORT_WIDTHS } from './breakpoints.js';

export const DESIGN_SPACING = Object.freeze({
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
});

export const DESIGN_TYPOGRAPHY = Object.freeze({
  heading: 'var(--text-heading)',
  body: 'var(--text-body)',
  caption: 'var(--text-caption)',
});

export const DESIGN_TOUCH_TARGETS = Object.freeze({
  minPx: 44,
  comfortablePx: 48,
  min: 'var(--touch-target-min)',
  comfortable: 'var(--touch-target-comfortable)',
});

/** Media query strings aligned with design-tokens.css tiers */
export const DESIGN_MEDIA_QUERIES = Object.freeze({
  mobile: `(max-width: ${DESIGN_BREAKPOINTS_PX.mobileMax}px)`,
  tablet: `(min-width: ${DESIGN_BREAKPOINTS_PX.tabletMin}px) and (max-width: ${DESIGN_BREAKPOINTS_PX.tabletMax}px)`,
  tabletUp: `(min-width: ${DESIGN_BREAKPOINTS_PX.tabletMin}px)`,
  desktop: `(min-width: ${DESIGN_BREAKPOINTS_PX.desktopMin}px)`,
  wide: `(min-width: ${DESIGN_BREAKPOINTS_PX.wideMin}px)`,
  touchEnforce: `(max-width: ${DESIGN_BREAKPOINTS_PX.touchEnforceMax}px)`,
});
