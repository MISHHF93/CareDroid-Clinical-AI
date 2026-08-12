import { describe, expect, it } from 'vitest';
import {
  ENTITLEMENT_ACCESS_STATES,
  ENTITLEMENT_CATEGORIES,
  ENTITLEMENT_REGISTRY,
  SUBSCRIPTION_TIERS,
  getEntitlementRuleForAsset,
  subscriptionMeetsRequirement,
} from './entitlements.config';

describe('entitlements.config', () => {
  it('covers requested access states and product categories', () => {
    expect(Object.values(ENTITLEMENT_ACCESS_STATES)).toEqual([
      'allowed',
      'disabled',
      'beta',
      'experimental',
      'locked',
      'subscription-required',
      'admin-only',
    ]);
    for (const category of Object.values(ENTITLEMENT_CATEGORIES)) {
      expect(ENTITLEMENT_REGISTRY.some((rule) => rule.category === category), category).toBe(true);
    }
  });

  it('resolves asset requirements and subscription tier ordering', () => {
    expect(getEntitlementRuleForAsset('simulation-suite')).toMatchObject({
      category: ENTITLEMENT_CATEGORIES.SIMULATIONS,
      requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
      requiredPackIds: ['research-education'],
    });
    expect(subscriptionMeetsRequirement('institutional', 'professional' as any)).toBe(true);
    expect(subscriptionMeetsRequirement('free', 'professional' as any)).toBe(false);
  });

  it('recognizes every real backend SubscriptionTier value, not just the 3 originally covered here', () => {
    // Regression: this frontend copy used to only define free/professional/institutional, so a
    // real 'enterprise'/'government'/'trial'/'starter'/'academic' subscription context (all real
    // backend SubscriptionTier values -- see backend/src/modules/subscriptions/entities/
    // subscription.entity.ts) fell back to rank -1 and was silently denied entitlements it
    // should have had.
    expect(subscriptionMeetsRequirement('enterprise', 'professional' as any)).toBe(true);
    expect(subscriptionMeetsRequirement('government', 'institutional' as any)).toBe(true);
    expect(subscriptionMeetsRequirement('academic', 'professional' as any)).toBe(true);
    expect(subscriptionMeetsRequirement('trial', 'professional' as any)).toBe(false);
    expect(subscriptionMeetsRequirement('starter', 'professional' as any)).toBe(false);
  });
});
