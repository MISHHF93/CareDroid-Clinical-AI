/**
 * Canonical programmatic theme token projection.
 * CSS custom properties remain the runtime source of truth in
 * `src/styles/theme-tokens.css` and `src/styles/design-tokens.css`.
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
  themePreferenceEnabled: false,
  cssTokenSources: Object.freeze([
    'src/styles/medical-color-layer.css',
    'src/styles/medical-type-layer.css',
    'src/styles/medical-card-layer.css',
    'src/styles/theme-tokens.css',
    'src/styles/design-tokens.css',
    'src/styles/color-normalization.css',
    'src/styles/text-normalization.css',
    'src/styles/surface-normalization.css',
    'src/styles/card-contrast-normalization.css',
  ]),
});
