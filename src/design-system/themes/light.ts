/**
 * Descriptor for the 'light' CDL v2 theme (html[data-theme='light'] in
 * src/styles/cdl-v2/theme.css). This module does NOT set colors — the CSS
 * attribute switch is the actual mechanism. It exists so theme-aware UI
 * (a theme picker, a "which mode am I in" indicator) has a typed handle
 * instead of a bare string literal.
 */
export const LIGHT_THEME = Object.freeze({
  id: 'light' as const,
  label: 'Light',
  dataThemeAttr: 'light' as const,
  colorScheme: 'light' as const,
  status: 'shipped' as const,
});
