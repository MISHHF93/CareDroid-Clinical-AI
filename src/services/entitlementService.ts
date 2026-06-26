import { FEATURE_FLAG_STATES } from '../config/featureFlags.config';
import {
  ENTITLEMENT_ACCESS_STATES,
  SUBSCRIPTION_TIERS,
  getEntitlementRuleForAsset,
  subscriptionMeetsRequirement,
} from '../config/entitlements.config';
import { getFeatureFlagForAsset, resolveFeatureFlagState } from './featureFlagService';

const ADMIN_ROLES = new Set(['admin', 'owner']);

export function resolveEntitlementDecision(tool: any = {}, context: any = {}, userRole = 'student') {
  const assetId = tool.id || tool.canonicalInventoryId;
  const serverDecision = context?.assetAccessDecisions?.[assetId];
  if (serverDecision) {
    return {
      ...serverDecision,
      accessState: serverDecision.state,
      reasons: [serverDecision.reason].filter(Boolean),
    };
  }

  const rule = getEntitlementRuleForAsset(assetId);
  const featureFlag = rule?.featureFlagId
    ? { id: rule.featureFlagId }
    : getFeatureFlagForAsset(assetId);
  const rolloutState = resolveFeatureFlagState(featureFlag?.id, context);
  const base = {
    assetId,
    rolloutState,
    featureFlagId: featureFlag?.id,
    requiredPlan: rule?.requiredPlan,
    requiredPacks: rule?.requiredPackIds || [],
  };

  if (rolloutState === FEATURE_FLAG_STATES.DISABLED) {
    return {
      ...base,
      state: ENTITLEMENT_ACCESS_STATES.DISABLED,
      accessState: ENTITLEMENT_ACCESS_STATES.DISABLED,
      isVisible: false,
      isLaunchable: false,
      reason: 'feature-disabled',
      reasons: ['feature-disabled'],
    };
  }
  if (rolloutState === FEATURE_FLAG_STATES.LOCKED) {
    return lockedDecision(base, 'feature-locked');
  }
  if (rolloutState === FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED) {
    return subscriptionDecision(base, 'feature-subscription-required');
  }

  const role = userRole || context?.membership?.role || context?.tenant?.role;
  if ((rule?.adminOnly || rolloutState === FEATURE_FLAG_STATES.ADMIN_ONLY) && !ADMIN_ROLES.has(role)) {
    return {
      ...base,
      state: ENTITLEMENT_ACCESS_STATES.ADMIN_ONLY,
      accessState: ENTITLEMENT_ACCESS_STATES.ADMIN_ONLY,
      isVisible: true,
      isLaunchable: false,
      reason: 'admin-only',
      reasons: ['admin-only'],
    };
  }

  const hasOrganization = Boolean(context?.organization?.id);
  const currentPlan =
    context?.subscriptionPlan ||
    context?.tenant?.subscriptionPlan ||
    context?.subscription?.tier ||
    SUBSCRIPTION_TIERS.FREE;
  if (
    hasOrganization &&
    !subscriptionMeetsRequirement(currentPlan as any, (rule?.requiredPlan || SUBSCRIPTION_TIERS.FREE) as any)
  ) {
    return subscriptionDecision(base, 'subscription-required');
  }

  const entitledAssetIds = new Set(context?.entitledAssetIds || []);
  const entitledPackIds = new Set(context?.entitledPackIds || []);
  const missingPack = rule?.requiredPackIds?.find((packId) => !entitledPackIds.has(packId));
  const strict = Boolean(context?.strictSaasEntitlements);
  if (hasOrganization && ((strict && !entitledAssetIds.has(assetId)) || missingPack)) {
    return lockedDecision(base, missingPack ? 'pack-required' : 'asset-not-entitled');
  }

  const state =
    rolloutState === FEATURE_FLAG_STATES.BETA || rolloutState === FEATURE_FLAG_STATES.EXPERIMENTAL
      ? rolloutState
      : ENTITLEMENT_ACCESS_STATES.ALLOWED;

  return {
    ...base,
    state,
    accessState: state,
    isVisible: true,
    isLaunchable: true,
    reason: state === rolloutState ? `rollout-${state}` : 'allowed',
    reasons: state === ENTITLEMENT_ACCESS_STATES.ALLOWED ? [] : [`rollout-${state}`],
  };
}

function lockedDecision(base, reason) {
  return {
    ...base,
    state: ENTITLEMENT_ACCESS_STATES.LOCKED,
    accessState: ENTITLEMENT_ACCESS_STATES.LOCKED,
    isVisible: true,
    isLaunchable: false,
    reason,
    reasons: [reason],
  };
}

function subscriptionDecision(base, reason) {
  return {
    ...base,
    state: ENTITLEMENT_ACCESS_STATES.SUBSCRIPTION_REQUIRED,
    accessState: ENTITLEMENT_ACCESS_STATES.SUBSCRIPTION_REQUIRED,
    isVisible: true,
    isLaunchable: false,
    reason,
    reasons: [reason],
  };
}

export const EntitlementService = Object.freeze({
  resolveEntitlementDecision,
});
