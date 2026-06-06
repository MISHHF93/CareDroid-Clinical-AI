import { SubscriptionStatus, SubscriptionTier } from './entities/subscription.entity';
import {
  canDowngradeSubscription,
  canUpgradeSubscription,
  normalizeLifecycleState,
  resolveLifecycleEntitlement,
  SubscriptionLifecycleState,
} from './subscription-lifecycle.engine';

describe('subscription lifecycle engine', () => {
  it('normalizes requested SaaS states from subscription records', () => {
    expect(normalizeLifecycleState({ status: SubscriptionStatus.ACTIVE })).toBe(
      SubscriptionLifecycleState.ACTIVE,
    );
    expect(normalizeLifecycleState({ status: SubscriptionStatus.PAST_DUE })).toBe(
      SubscriptionLifecycleState.SUSPENDED,
    );
    expect(normalizeLifecycleState({ status: SubscriptionStatus.INCOMPLETE_EXPIRED })).toBe(
      SubscriptionLifecycleState.EXPIRED,
    );
    expect(normalizeLifecycleState({ status: SubscriptionStatus.CANCELED })).toBe(
      SubscriptionLifecycleState.CANCELLED,
    );
    expect(normalizeLifecycleState({ status: SubscriptionStatus.INCOMPLETE })).toBe(
      SubscriptionLifecycleState.PENDING,
    );
  });

  it('expires trial plans after trial end', () => {
    expect(
      normalizeLifecycleState(
        {
          tier: SubscriptionTier.TRIAL,
          status: SubscriptionStatus.ACTIVE,
          trialEnd: new Date('2026-01-01T00:00:00.000Z'),
        },
        new Date('2026-02-01T00:00:00.000Z'),
      ),
    ).toBe(SubscriptionLifecycleState.EXPIRED);
  });

  it('validates upgrade and downgrade paths', () => {
    expect(canUpgradeSubscription(SubscriptionTier.TRIAL, SubscriptionTier.STARTER)).toBe(true);
    expect(canUpgradeSubscription(SubscriptionTier.STARTER, SubscriptionTier.PROFESSIONAL)).toBe(
      true,
    );
    expect(canUpgradeSubscription(SubscriptionTier.PROFESSIONAL, SubscriptionTier.ENTERPRISE)).toBe(
      true,
    );
    expect(canUpgradeSubscription(SubscriptionTier.ENTERPRISE, SubscriptionTier.STARTER)).toBe(
      false,
    );

    expect(
      canDowngradeSubscription(SubscriptionTier.ENTERPRISE, SubscriptionTier.PROFESSIONAL),
    ).toBe(true);
    expect(canDowngradeSubscription(SubscriptionTier.PROFESSIONAL, SubscriptionTier.STARTER)).toBe(
      true,
    );
    expect(canDowngradeSubscription(SubscriptionTier.STARTER, SubscriptionTier.TRIAL)).toBe(false);
  });

  it('blocks entitlements for non-active lifecycle states despite high plan tier', () => {
    const decision = resolveLifecycleEntitlement({
      subscription: {
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.SUSPENDED,
      },
      requiredTier: SubscriptionTier.PROFESSIONAL,
    });

    expect(decision).toMatchObject({
      isEntitled: false,
      state: SubscriptionLifecycleState.SUSPENDED,
      reason: 'subscription-suspended',
      statusLabel: 'Suspended',
    });
  });

  it('allows entitlements when lifecycle is active and plan meets requirement', () => {
    const decision = resolveLifecycleEntitlement({
      subscription: {
        tier: SubscriptionTier.PROFESSIONAL,
        status: SubscriptionStatus.ACTIVE,
      },
      requiredTier: SubscriptionTier.STARTER,
    });

    expect(decision).toMatchObject({
      isEntitled: true,
      state: SubscriptionLifecycleState.ACTIVE,
      reason: 'entitled',
      statusLabel: 'Active',
    });
  });
});
