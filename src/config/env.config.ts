import appConfig from './appConfig';
import { FEATURE_FLAGS, shouldExposeDemoAuthFlag } from './featureFlags.config';

/**
 * Canonical frontend environment flag projection.
 * `appConfig` remains the parser/validator; this module exposes stable flags
 * used by auth, API, and feature-gating consumers.
 */
export const ENV_CONFIG = Object.freeze({
  appName: appConfig.app.name,
  appVersion: appConfig.app.version,
  environment: appConfig.app.environment,
  apiUrl: appConfig.api.baseUrl,
  wsUrl: appConfig.api.wsUrl,
  demoMode: FEATURE_FLAGS.enableDemoMode,
  allowLocalDemoAuth: FEATURE_FLAGS.allowLocalDemoAuth,
  enableDevAuthBypass: FEATURE_FLAGS.enableDevAuthBypass,
  showDemoAuth: FEATURE_FLAGS.showDemoAuth,
  hideDivisionMode: FEATURE_FLAGS.hideDivisionMode,
  enablePushNotifications: FEATURE_FLAGS.enablePushNotifications,
  enableOfflineMode: FEATURE_FLAGS.enableOfflineMode,
  enableBiometricAuth: FEATURE_FLAGS.enableBiometricAuth,
});

export function shouldExposeDemoAuth() {
  return shouldExposeDemoAuthFlag();
}
