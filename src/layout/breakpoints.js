/** Mobile-first acceptance widths (phones, tablets, desktop smoke). */
export const MOBILE_FIRST_BREAKPOINTS = Object.freeze({
  phone: Object.freeze([320, 360, 375, 390, 412, 430, 480]),
  tablet: Object.freeze([600, 768, 1024]),
  desktop: Object.freeze([1280, 1440, 1920]),
});

export const MOBILE_FIRST_VIEWPORT_WIDTHS = Object.freeze([
  ...MOBILE_FIRST_BREAKPOINTS.phone,
  ...MOBILE_FIRST_BREAKPOINTS.tablet,
  ...MOBILE_FIRST_BREAKPOINTS.desktop,
]);

/** Match CSS `@media (max-width: 900px)` for compact / phone-tablet shell */
export const COMPACT_MEDIA_QUERY = '(max-width: 900px)';

/** Match design-tokens.css --sidebar-width-* */
export const SIDEBAR_WIDTH_EXPANDED_PX = 248;
export const SIDEBAR_WIDTH_COLLAPSED_PX = 58;

/** Split calculator / lab / diagnosis forms — two columns from this width up */
export const SPLIT_FORM_MEDIA_QUERY = '(min-width: 1024px)';

/** Match Dashboard.css narrow tweaks at 600px */
export const NARROW_MEDIA_QUERY = '(max-width: 600px)';

/** Must match `--app-compact-chrome-height` in layout-breakpoints.css / AppShell.css */
export const COMPACT_CHROME_HEIGHT_PX = 52;

/** Landscape compact row — matches AppShell.css */
export const COMPACT_CHROME_HEIGHT_LANDSCAPE_PX = 44;

export function getIsCompactViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}
