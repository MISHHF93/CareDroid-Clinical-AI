import {
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_STATES,
  normalizeFeatureFlagState,
} from '../config/featureFlags.config';

export function getFeatureFlagForAsset(assetId) {
  return FEATURE_FLAG_REGISTRY.find((flag) => flag.assetIds?.includes(assetId));
}

export function resolveFeatureFlagState(featureFlagId, context = {}) {
  if (!featureFlagId) return FEATURE_FLAG_STATES.ENABLED;
  const flag = FEATURE_FLAG_REGISTRY.find((item) => item.id === featureFlagId);
  const overrides =
    context?.organization?.settings?.featureFlagOverrides ||
    context?.organization?.settings?.featureFlags ||
    context?.featureFlagOverrides ||
    {};

  return normalizeFeatureFlagState(overrides[featureFlagId] || flag?.defaultState);
}

export function resolveFeatureFlagStateForAsset(assetId, context = {}) {
  return resolveFeatureFlagState(getFeatureFlagForAsset(assetId)?.id, context);
}

export function isFeatureFlagLaunchable(state) {
  return [FEATURE_FLAG_STATES.ENABLED, FEATURE_FLAG_STATES.BETA, FEATURE_FLAG_STATES.EXPERIMENTAL].includes(
    state
  );
}

export const FeatureFlagService = Object.freeze({
  getFeatureFlagForAsset,
  resolveFeatureFlagState,
  resolveFeatureFlagStateForAsset,
  isFeatureFlagLaunchable,
});
