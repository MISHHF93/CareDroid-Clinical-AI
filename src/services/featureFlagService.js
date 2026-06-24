import {
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_STATES,
  normalizeFeatureFlagState,
} from '../config/featureFlags.config';
import { SUBSCRIPTION_TIERS, subscriptionMeetsRequirement } from '../config/entitlements.config';
import { getSuiteFeatureEntitlement } from '../config/suiteFeatureEntitlements.config';

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

function resolveContextRole(context = {}) {
  return (
    context.role ||
    context.saasRole ||
    context.membership?.role ||
    context.roleProfile?.id ||
    context.tenant?.role ||
    'student'
  );
}

function roleAllowedForFeature(entitlement, role) {
  if (!entitlement?.rolePermissions?.length) return true;
  if (entitlement.rolePermissions.includes('*')) return true;
  return entitlement.rolePermissions.includes(role);
}

function packsSatisfied(entitlement, context = {}) {
  const entitledPackIds = new Set(context.entitledPackIds || []);
  const required = entitlement?.requiredPackIds || [];
  if (!required.length) return true;
  if (!context.organization?.id && !context.tenant?.id) return true;
  return required.every((packId) => entitledPackIds.has(packId));
}

export function evaluateFeatureAccess(featureId, context = {}) {
  const entitlement = getSuiteFeatureEntitlement(featureId);
  const featureFlagId = entitlement?.featureFlagId;
  const rolloutState = resolveFeatureFlagState(featureFlagId, context);
  const role = resolveContextRole(context);
  const currentPlan =
    context.subscriptionPlan ||
    context.organization?.subscriptionPlan ||
    context.tenant?.subscriptionPlan ||
    context.subscription?.tier ||
    SUBSCRIPTION_TIERS.FREE;

  const base = {
    featureId,
    featureFlagId,
    rolloutState,
    role,
    auditCategory: entitlement?.auditCategory || 'feature-access',
    requiredPlan: entitlement?.requiredPlan || SUBSCRIPTION_TIERS.FREE,
    requiredPackIds: entitlement?.requiredPackIds || [],
  };

  if (!isFeatureFlagLaunchable(rolloutState)) {
    return {
      ...base,
      enabled: false,
      visible: rolloutState !== FEATURE_FLAG_STATES.DISABLED,
      launchable: false,
      reason: `rollout-${rolloutState}`,
    };
  }

  if (!roleAllowedForFeature(entitlement, role)) {
    return {
      ...base,
      enabled: false,
      visible: true,
      launchable: false,
      reason: 'role-denied',
    };
  }

  if (
    (context.organization?.id || context.tenant?.id) &&
    !subscriptionMeetsRequirement(currentPlan, entitlement?.requiredPlan || SUBSCRIPTION_TIERS.FREE)
  ) {
    return {
      ...base,
      enabled: false,
      visible: true,
      launchable: false,
      reason: 'subscription-required',
    };
  }

  if (!packsSatisfied(entitlement, context)) {
    return {
      ...base,
      enabled: false,
      visible: true,
      launchable: false,
      reason: 'pack-required',
    };
  }

  return {
    ...base,
    enabled: true,
    visible: true,
    launchable: true,
    reason: 'allowed',
  };
}

export const FeatureFlagService = Object.freeze({
  getFeatureFlagForAsset,
  resolveFeatureFlagState,
  resolveFeatureFlagStateForAsset,
  isFeatureFlagLaunchable,
  evaluateFeatureAccess,
});
