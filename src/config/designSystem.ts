/**
 * CareDroid Design System — single programmatic entry for tokens, semantics, and theme config.
 * CSS custom properties remain the runtime source of truth in src/styles/design-system.css.
 */
export { THEME_CONFIG } from './theme.tokens';
export {
  SEMANTIC_COLOR_ROLES,
  OPERATIONAL_TONE_TO_SEMANTIC,
  resolveSemanticColorRole,
  semanticColorForRole,
  metricColorForTone,
  type SemanticColorRole,
} from './semanticColorSystem';
export {
  MEDICAL_THEME,
  MEDICAL_TYPE,
  MEDICAL_CARD,
  medicalTextStyle,
  medicalPanelStyle,
  medicalAccentPanelStyle,
  medicalCardStyle,
} from './medicalTheme.constants';
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

/** Canonical CSS entry points — import design-system.css from main.tsx only. */
export const DESIGN_SYSTEM_CSS_ENTRY = 'src/styles/design-system.css';

/** Role-focused information density presets (maps to CSS custom properties). */
export const DESIGN_DENSITY_PRESETS = Object.freeze({
  compact: Object.freeze({
    gap: 'var(--density-compact-gap)',
    padding: 'var(--density-compact-padding)',
    pageClass: 'density-compact',
  }),
  standard: Object.freeze({
    gap: 'var(--density-standard-gap)',
    padding: 'var(--density-standard-padding)',
    pageClass: 'density-standard',
  }),
  roomy: Object.freeze({
    gap: 'var(--density-roomy-gap)',
    padding: 'var(--density-roomy-padding)',
    pageClass: 'density-roomy',
  }),
});

export type DesignDensityPreset = keyof typeof DESIGN_DENSITY_PRESETS;

export {
  CDL_PRINCIPLES,
  CDL_PAGE_ZONES,
  CDL_EXTENDED_SEMANTIC_ROLES,
  CDL_SEMANTIC_ROLE_ORDER,
  CDL_TONE_TO_SEMANTIC,
  CDL_MOTION,
  CDL_ACCESSIBILITY,
  CDL_ICONOGRAPHY,
  CDL_ROLE_DENSITY,
  CDL_FOUNDATION,
  CDL_COMPONENT_PREFIXES,
  CDL_COMPONENT_STANDARDS,
  CDL_GRID,
  CDL_SHELL,
  CDL_TYPOGRAPHY,
  resolveCdlSemanticRole,
  cdlSemanticSurfaceClass,
  cdlZoneClassName,
  type CdlPageZoneId,
  type CdlSemanticRole,
} from './caredroidDesignLanguage';
