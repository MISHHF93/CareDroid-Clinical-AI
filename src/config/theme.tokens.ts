/**
 * Canonical programmatic theme token projection.
 * CSS custom properties remain the runtime source of truth in
 * `src/styles/design-system.css` (single entry; layers listed below).
 */
export {
  DESIGN_BREAKPOINTS,
  DESIGN_BREAKPOINTS_PX,
  DESIGN_CARD_PADDING,
  DESIGN_ELEVATION,
  DESIGN_MEDIA_QUERIES,
  DESIGN_RADII,
  DESIGN_SPACING,
  DESIGN_TOUCH_TARGETS,
  DESIGN_TYPOGRAPHY,
} from '../layout/designTokens';

export const THEME_CONFIG = Object.freeze({
  standardTheme: 'light',
  themePreferenceEnabled: true,
  cssEntry: 'src/styles/design-system.css',
  cssTokenSources: Object.freeze([
    'src/styles/primitives.css',
    'src/styles/tokens.css',
    'src/styles/design-tokens.css',
    'src/styles/theme-tokens.css',
    'src/styles/medical-color-layer.css',
    'src/styles/medical-type-layer.css',
    'src/styles/medical-card-layer.css',
    'src/styles/design-system-bridge.css',
    'src/styles/theme-legacy-bridge.css',
    'src/styles/color-normalization.css',
    'src/styles/text-normalization.css',
    'src/styles/surface-normalization.css',
    'src/styles/card-contrast-normalization.css',
    'src/styles/profile-surface-normalization.css',
    'src/styles/visual-consistency.css',
  ]),
});
