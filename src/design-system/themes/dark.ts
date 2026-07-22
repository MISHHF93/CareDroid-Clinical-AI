/**
 * Descriptor for the 'dark' CDL v2 theme (html[data-theme='dark'] in
 * src/styles/cdl-v2/theme.css). See light.ts for why this module exists.
 */
export const DARK_THEME = Object.freeze({
  id: 'dark' as const,
  label: 'Dark',
  dataThemeAttr: 'dark' as const,
  colorScheme: 'dark' as const,
  status: 'shipped' as const,
});
