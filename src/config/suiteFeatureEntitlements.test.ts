import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_TIERS } from './entitlements.config';
import { SUITE_FEATURE_ENTITLEMENTS } from './suiteFeatureEntitlements.config';
import { evaluateFeatureAccess } from '../services/featureFlagService';

describe('suiteFeatureEntitlements', () => {
  it('uses defined subscription tiers for every suite feature', () => {
    const validTiers = new Set(Object.values(SUBSCRIPTION_TIERS));
    for (const [featureId, config] of Object.entries(SUITE_FEATURE_ENTITLEMENTS)) {
      expect(validTiers.has(config.requiredPlan), `${featureId} has invalid requiredPlan`).toBe(true);
    }
  });

  it('requires institutional plan for native_ai_drift_monitoring', () => {
    const accessContext = {
      entitledPackIds: ['emergency-department-pack', 'analytics-pack'],
      role: 'admin',
      organization: { id: 'org-1' },
    };

    const professional = evaluateFeatureAccess('native_ai_drift_monitoring', {
      ...accessContext,
      subscriptionPlan: 'professional',
    });
    expect(professional.enabled).toBe(false);
    expect(professional.reason).toBe('subscription-required');

    const institutional = evaluateFeatureAccess('native_ai_drift_monitoring', {
      ...accessContext,
      subscriptionPlan: 'institutional',
    });
    expect(institutional.enabled).toBe(true);
  });
});