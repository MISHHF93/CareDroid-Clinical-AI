import appConfig from './appConfig';
import {
  FEATURE_FLAG_CATEGORIES as SHARED_FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_STATES as SHARED_FEATURE_FLAG_STATES,
} from '../../lib/featureFlags/constants';
import {
  FEATURE_FLAG_REGISTRY,
  normalizeFeatureFlagState,
  getFeatureFlagForAsset,
  type FeatureFlagDefinition,
} from '../../lib/featureFlags/featureFlagRegistry';

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
  enableSimulationMode: appConfig.features.enableSimulationMode,
  allowLocalDemoAuth: appConfig.features.allowLocalDemoAuth,
  showDemoAuth: appConfig.features.showDemoAuth,
  hideDivisionMode: appConfig.features.hideDivisionMode,
  platformEntitlements: appConfig.features.platformEntitlements,
  singleWorkspaceModel: appConfig.features.singleWorkspaceModel,
  commercialSurfaces: appConfig.features.commercialSurfaces,
  strictSaasEntitlements: appConfig.features.strictSaasEntitlements,
  assetAwareNavigation: appConfig.features.assetAwareNavigation,
  orgScopedPlatformReads: appConfig.features.orgScopedPlatformReads,
});

export const FEATURE_FLAG_STATES = SHARED_FEATURE_FLAG_STATES;
export const FEATURE_FLAG_CATEGORIES = SHARED_FEATURE_FLAG_CATEGORIES;

export const FEATURE_FLAG_STATE_LABELS = Object.freeze({
  [FEATURE_FLAG_STATES.ENABLED]: 'Enabled',
  [FEATURE_FLAG_STATES.DISABLED]: 'Disabled',
  [FEATURE_FLAG_STATES.BETA]: 'Beta',
  [FEATURE_FLAG_STATES.EXPERIMENTAL]: 'Experimental',
  [FEATURE_FLAG_STATES.LOCKED]: 'Locked',
  [FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED]: 'Subscription required',
  [FEATURE_FLAG_STATES.ADMIN_ONLY]: 'Admin only',
});

export { FEATURE_FLAG_REGISTRY, normalizeFeatureFlagState, getFeatureFlagForAsset };
export type { FeatureFlagDefinition };

export function buildFeatureFlagStateMap(overrides: any = {}) {
  return Object.fromEntries(
    FEATURE_FLAG_REGISTRY.map((flag) => [
      flag.id,
      normalizeFeatureFlagState(overrides[flag.id] || flag.defaultState),
    ]),
  );
}

export function getFeatureFlagsByCategory(stateMap = buildFeatureFlagStateMap()) {
  return Object.values(FEATURE_FLAG_CATEGORIES).map((category) => ({
    category,
    flags: FEATURE_FLAG_REGISTRY.filter((flag) => flag.category === category).map((flag) => ({
      ...flag,
      state: normalizeFeatureFlagState(stateMap[flag.id] || flag.defaultState),
    })),
  }));
}

export function summarizeFeatureFlags(stateMap = buildFeatureFlagStateMap()) {
  const flags = FEATURE_FLAG_REGISTRY.map((flag) => ({
    ...flag,
    state: normalizeFeatureFlagState(stateMap[flag.id] || flag.defaultState),
  }));
  const stateCounts = Object.values(FEATURE_FLAG_STATES).reduce<Record<string, number>>(
    (acc, state) => {
      acc[state] = flags.filter((flag) => flag.state === state).length;
      return acc;
    },
    {},
  );
  const categoryCounts = Object.values(FEATURE_FLAG_CATEGORIES).reduce<Record<string, number>>(
    (acc, category) => {
      acc[category] = flags.filter((flag) => flag.category === category).length;
      return acc;
    },
    {},
  );

  return {
    total: flags.length,
    stateCounts,
    categoryCounts,
    liveRolloutCount: flags.filter((flag) =>
      (
        [
          FEATURE_FLAG_STATES.ENABLED,
          FEATURE_FLAG_STATES.BETA,
          FEATURE_FLAG_STATES.EXPERIMENTAL,
        ] as readonly string[]
      ).includes(flag.state),
    ).length,
    unavailableCount: flags.filter((flag) =>
      (
        [
          FEATURE_FLAG_STATES.DISABLED,
          FEATURE_FLAG_STATES.LOCKED,
          FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED,
          FEATURE_FLAG_STATES.ADMIN_ONLY,
        ] as readonly string[]
      ).includes(flag.state),
    ).length,
    hiddenOrDisabledCount: flags.filter((flag) =>
      ([FEATURE_FLAG_STATES.DISABLED, FEATURE_FLAG_STATES.LOCKED] as readonly string[]).includes(
        flag.state,
      ),
    ).length,
  };
}

export function shouldExposeDemoAuthFlag() {
  return Boolean(
    FEATURE_FLAGS.enableDemoMode || FEATURE_FLAGS.enableDevAuthBypass || FEATURE_FLAGS.showDemoAuth,
  );
}
