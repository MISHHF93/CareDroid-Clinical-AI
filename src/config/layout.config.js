/**
 * Canonical layout and scroll behavior configuration.
 *
 * CSS owns rendering details; this module provides the programmatic contract
 * used by shell code and tests.
 */
export {
  COMPACT_CHROME_HEIGHT_LANDSCAPE_PX,
  COMPACT_CHROME_HEIGHT_PX,
  COMPACT_MEDIA_QUERY,
  MOBILE_FIRST_BREAKPOINTS,
  MOBILE_FIRST_VIEWPORT_WIDTHS,
  NARROW_MEDIA_QUERY,
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
  SPLIT_FORM_MEDIA_QUERY,
  getIsCompactViewport,
} from '../layout/breakpoints.js';

export const LAYOUT_SCROLL_CONTRACT = Object.freeze({
  viewportOwner: 'AppShell',
  primaryScrollContainer: '.app-shell-page-body',
  mainContentRole: 'MainContent',
  sidebarScrollContainer: '.sidebar-content',
  localScrollAllowedFor: Object.freeze(['chat', 'tables', 'maps', 'drawers']),
  normalPagesCreateViewportScrollShells: false,
});
