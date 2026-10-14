import { SubscriptionTier } from '../modules/subscriptions/entities/subscription.entity';
import {
  ENTITLEMENT_REGISTRY as CANONICAL_ENTITLEMENT_REGISTRY,
  SUBSCRIPTION_TIER_RANK as CANONICAL_SUBSCRIPTION_TIER_RANK,
  getEntitlementRuleForAsset as canonicalGetEntitlementRuleForAsset,
  subscriptionMeetsRequirement as canonicalSubscriptionMeetsRequirement,
} from '../../../lib/entitlements/entitlementRegistry';

export enum EntitlementCategory {
  TOOLS = 'tools',
  CALCULATORS = 'calculators',
  AUTOMATIONS = 'automations',
  SIMULATIONS = 'simulations',
  MAPS = 'maps',
  IOT = 'iot',
  FLEET = 'fleet',
  AI_AGENTS = 'ai-agents',
  GOVERNANCE = 'governance',
}

export enum EntitlementAccessState {
  ALLOWED = 'allowed',
  DISABLED = 'disabled',
  BETA = 'beta',
  EXPERIMENTAL = 'experimental',
  LOCKED = 'locked',
  SUBSCRIPTION_REQUIRED = 'subscription-required',
  ADMIN_ONLY = 'admin-only',
}

export interface EntitlementRule {
  assetIds: string[];
  category: EntitlementCategory;
  featureFlagId: string;
  requiredPlan: SubscriptionTier;
  requiredPackIds: string[];
  adminOnly?: boolean;
}

export const ENTITLEMENT_REGISTRY: EntitlementRule[] =
  CANONICAL_ENTITLEMENT_REGISTRY as unknown as EntitlementRule[];

export const SUBSCRIPTION_TIER_RANK: Record<SubscriptionTier, number> =
  CANONICAL_SUBSCRIPTION_TIER_RANK as Record<SubscriptionTier, number>;

export function getEntitlementRuleForAsset(assetId: string): EntitlementRule | undefined {
  return canonicalGetEntitlementRuleForAsset(assetId) as EntitlementRule | undefined;
}

export function subscriptionMeetsRequirement(
  currentTier: SubscriptionTier | string | undefined,
  requiredTier: SubscriptionTier | string = SubscriptionTier.FREE,
): boolean {
  return canonicalSubscriptionMeetsRequirement(currentTier, requiredTier);
}
