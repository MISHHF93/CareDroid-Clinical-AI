/**
 * Canonical configuration barrel — import configuration contracts from here.
 *
 * Layering:
 *   import.meta.env → appConfig → featureFlags → env.config → consumers
 *   unified-navigation.config → navigation.config (compat)
 *   theme.tokens + caredroidDesignLanguage → designSystem
 *   emergencyPermissionRegistry ← emergencyRolePermissions
 */
export {
  CANONICAL_CONFIGURATION_CONTRACT,
  CANONICAL_CONFIGURATION_DOMAINS,
  CANONICAL_CONFIGURATION_REGISTRY,
  CANONICAL_ENV_VAR_REGISTRY,
  getCanonicalConfigurationEntry,
  listCanonicalConfigurationByDomain,
  type CanonicalConfigurationDomain,
  type CanonicalConfigurationEntry,
  type CanonicalConfigurationLayer,
  type CanonicalEnvVarEntry,
} from './canonicalConfigurationModel';

export { ENV_CONFIG, shouldExposeDemoAuth } from './env.config';
export { FEATURE_FLAGS, FEATURE_FLAG_REGISTRY } from './featureFlags.config';
export { AUTH_CONFIG } from './auth.config';
export {
  SECURITY_CONTRACT,
  SECURITY_ENGINE_ID,
  BACKEND_PERMISSION_KEYS,
  normalizePermission,
  expandPermissionAliases,
  Permission,
} from './security';
export { API_ROUTES, normalizeApiPath } from './api.config';
export { CANONICAL_ROUTES, ROUTE_RECORDS, getRouteAliasTarget } from './routes.config';
export { NAVIGATION_ITEMS, getVisibleNavigation } from './unified-navigation.config';
export { THEME_CONFIG, DESIGN_SYSTEM_CSS_ENTRY } from './designSystem';
export { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
export { PLATFORM_COHESION_CONTRACT, PLATFORM_COHESION_ENGINE_ID } from './platformCohesionModel';
