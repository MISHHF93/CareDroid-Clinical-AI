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
});
