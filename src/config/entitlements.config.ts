/**
 * Canonical frontend entitlements and tier access configuration.
 * Re-exports from shared lib/entitlements/entitlementRegistry.
 */
export {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_RANK,
  ENTITLEMENT_CATEGORIES,
  ENTITLEMENT_ACCESS_STATES,
  ENTITLEMENT_REGISTRY,
  getEntitlementRuleForAsset,
  subscriptionMeetsRequirement,
  type SubscriptionTierValue,
  type EntitlementCategoryValue,
  type EntitlementAccessStateValue,
  type EntitlementRule,
} from '../../lib/entitlements/entitlementRegistry';
