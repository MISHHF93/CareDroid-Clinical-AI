import appConfig from './appConfig';

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
  demoMode: appConfig.features.enableDemoMode,
  allowLocalDemoAuth: appConfig.features.allowLocalDemoAuth,
  enableDevAuthBypass: appConfig.features.enableDevAuthBypass,
  showDemoAuth: appConfig.features.showDemoAuth,
  hideDivisionMode: appConfig.features.hideDivisionMode,
  enablePushNotifications: appConfig.features.enablePushNotifications,
  enableOfflineMode: appConfig.features.enableOfflineMode,
  enableBiometricAuth: appConfig.features.enableBiometricAuth,
});

export function shouldExposeDemoAuth() {
  return Boolean(
    appConfig.features.enableDemoMode ||
      appConfig.features.enableDevAuthBypass ||
      appConfig.features.showDemoAuth
  );
}
