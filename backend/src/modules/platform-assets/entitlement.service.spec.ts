import { EntitlementAccessState } from '../../config/entitlements.config';
import { FeatureFlagState } from '../../config/featureFlags.config';
import { SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { UserRole } from '../users/entities/user.entity';
import { EntitlementService } from './entitlement.service';
import { FeatureFlagService } from './feature-flag.service';

describe('EntitlementService', () => {
  let service: EntitlementService;

  beforeEach(() => {
    service = new EntitlementService({} as any, {} as any, new FeatureFlagService());
  });

  it('blocks rollout-disabled features before paid entitlement checks', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'dispatch-ai',
      organization: {
        id: 'org-1',
        settings: { featureFlagOverrides: { 'fleet-command': FeatureFlagState.DISABLED } },
      },
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['dispatch-ai'],
      entitledPackIds: ['fleet-logistics'],
    });

    expect(decision).toMatchObject({
      state: EntitlementAccessState.DISABLED,
      isVisible: false,
      isLaunchable: false,
      reason: 'feature-disabled',
    });
  });

  it('marks monetized access as subscription-required when rollout is enabled', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'simulation-suite',
      organization: { id: 'org-1' },
      subscriptionPlan: SubscriptionTier.FREE,
      entitledAssetIds: ['simulation-suite'],
      entitledPackIds: ['research-education'],
    });

    expect(decision).toMatchObject({
      state: EntitlementAccessState.SUBSCRIPTION_REQUIRED,
      isVisible: true,
      isLaunchable: false,
      reason: 'subscription-required',
      requiredPlan: SubscriptionTier.PROFESSIONAL,
    });
  });

  it('requires packs when subscription is sufficient but entitlement is missing', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'digital-twin',
      organization: { id: 'org-1' },
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['digital-twin'],
      entitledPackIds: [],
    });

    expect(decision).toMatchObject({
      state: EntitlementAccessState.LOCKED,
      isLaunchable: false,
      reason: 'pack-required',
    });
  });

  it('allows admin-only governance for admin roles only', () => {
    const memberDecision = service.resolveDecisionFromContext({
      assetId: 'regulatory',
      organization: { id: 'org-1' },
      userRole: UserRole.PHYSICIAN,
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['regulatory'],
      entitledPackIds: ['core-platform'],
    });

    const adminDecision = service.resolveDecisionFromContext({
      assetId: 'regulatory',
      organization: { id: 'org-1' },
      userRole: UserRole.ADMIN,
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['regulatory'],
      entitledPackIds: ['core-platform'],
    });

    expect(memberDecision.state).toBe(EntitlementAccessState.ADMIN_ONLY);
    expect(memberDecision.isLaunchable).toBe(false);
    expect(adminDecision.isLaunchable).toBe(true);
  });
});
