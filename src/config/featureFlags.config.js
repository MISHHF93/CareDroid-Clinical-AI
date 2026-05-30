import appConfig from './appConfig';

/**
 * Canonical frontend feature flag projection.
 *
 * `appConfig` parses environment variables; runtime consumers should import
 * this stable projection instead of reading `appConfig.features` directly.
 */
export const FEATURE_FLAGS = Object.freeze({
  enablePushNotifications: appConfig.features.enablePushNotifications,
  enableOfflineMode: appConfig.features.enableOfflineMode,
  enableBiometricAuth: appConfig.features.enableBiometricAuth,
  enableDevAuthBypass: appConfig.features.enableDevAuthBypass,
  enableDemoMode: appConfig.features.enableDemoMode,
  allowLocalDemoAuth: appConfig.features.allowLocalDemoAuth,
  showDemoAuth: appConfig.features.showDemoAuth,
  hideDivisionMode: appConfig.features.hideDivisionMode,
});

export function shouldExposeDemoAuthFlag() {
  return Boolean(
    FEATURE_FLAGS.enableDemoMode ||
      FEATURE_FLAGS.enableDevAuthBypass ||
      FEATURE_FLAGS.showDemoAuth
  );
}
