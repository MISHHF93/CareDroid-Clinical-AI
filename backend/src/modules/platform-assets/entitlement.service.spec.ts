import { EntitlementAccessState } from '../../config/entitlements.config';
import { FeatureFlagState } from '../../config/featureFlags.config';
import { SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { UserRole } from '../users/entities/user.entity';
import { EntitlementService } from './entitlement.service';
import { FeatureFlagService } from './feature-flag.service';
import { PlatformAssetLifecycle, PricingTier } from './enums/platform-asset.enums';

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

  it('marks beta lifecycle assets as launchable beta access', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'beta-workflow',
      asset: {
        lifecycle: PlatformAssetLifecycle.BETA,
        pricingTier: PricingTier.CORE,
        packIds: [],
      },
      organization: { id: 'org-1' },
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['beta-workflow'],
      entitledPackIds: [],
    });

    expect(decision).toMatchObject({
      state: FeatureFlagState.BETA,
      isVisible: true,
      isLaunchable: true,
      reason: 'asset-beta',
    });
  });

  it('blocks draft lifecycle assets until promoted', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'draft-calculator',
      asset: {
        lifecycle: PlatformAssetLifecycle.DRAFT,
        pricingTier: PricingTier.CORE,
        packIds: [],
      },
      organization: { id: 'org-1' },
      userRole: UserRole.ADMIN,
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['draft-calculator'],
      entitledPackIds: [],
    });

    expect(decision).toMatchObject({
      state: EntitlementAccessState.DISABLED,
      isVisible: false,
      isLaunchable: false,
      reason: 'asset-draft',
    });
  });

  it('blocks archived lifecycle assets even when otherwise entitled', () => {
    const decision = service.resolveDecisionFromContext({
      assetId: 'old-integration',
      asset: {
        lifecycle: PlatformAssetLifecycle.ARCHIVED,
        pricingTier: PricingTier.CORE,
        packIds: [],
      },
      organization: { id: 'org-1' },
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      entitledAssetIds: ['old-integration'],
      entitledPackIds: [],
    });

    expect(decision).toMatchObject({
      state: EntitlementAccessState.DISABLED,
      isVisible: false,
      isLaunchable: false,
      reason: 'asset-archived',
    });
  });

  it('recognizes all commercial subscription tiers in entitlement decisions', () => {
    const scenarios = [
      {
        subscriptionPlan: SubscriptionTier.STARTER,
        assetId: 'qsofa',
        entitledPackIds: ['core-platform'],
      },
      {
        subscriptionPlan: SubscriptionTier.PROFESSIONAL,
        assetId: 'simulation-suite',
        entitledPackIds: ['research-education'],
      },
      {
        subscriptionPlan: SubscriptionTier.ENTERPRISE,
        assetId: 'digital-twin',
        entitledPackIds: ['hospital-operations'],
      },
      {
        subscriptionPlan: SubscriptionTier.ACADEMIC,
        assetId: 'simulation-suite',
        entitledPackIds: ['research-education'],
      },
      {
        subscriptionPlan: SubscriptionTier.GOVERNMENT,
        assetId: 'regulatory',
        entitledPackIds: ['core-platform'],
        userRole: UserRole.ADMIN,
      },
    ];

    scenarios.forEach((scenario) => {
      const decision = service.resolveDecisionFromContext({
        organization: { id: 'org-1' },
        userRole: scenario.userRole || UserRole.PHYSICIAN,
        assetId: scenario.assetId,
        subscriptionPlan: scenario.subscriptionPlan,
        entitledAssetIds: [scenario.assetId],
        entitledPackIds: scenario.entitledPackIds,
      });

      expect(decision.isLaunchable).toBe(true);
    });
  });
});
