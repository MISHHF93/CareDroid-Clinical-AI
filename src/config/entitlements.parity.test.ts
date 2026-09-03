import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type EntitlementRuleShape = {
  assetIds: string[];
  featureFlagId: string;
  requiredPlan: string;
  requiredPackIds: string[];
};

function extractRegistryRules(source: string): EntitlementRuleShape[] {
  const rules: EntitlementRuleShape[] = [];
  const blockPattern =
    /\{\s*assetIds:\s*\[([\s\S]*?)\],\s*category:[\s\S]*?featureFlagId:\s*['"]([^'"]+)['"][\s\S]*?requiredPlan:\s*(?:SUBSCRIPTION_TIERS\.|SubscriptionTier\.)?([A-Z_]+)[\s\S]*?requiredPackIds:\s*\[([\s\S]*?)\]/g;

  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(source)) !== null) {
    const assetIds = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
    const requiredPackIds = [...match[4].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
    rules.push({
      assetIds,
      featureFlagId: match[2],
      requiredPlan: match[3].toLowerCase(),
      requiredPackIds,
    });
  }
  return rules;
}

function normalizePlan(plan: string): string {
  if (plan === 'enterprise') return 'institutional';
  return plan;
}

describe('entitlements registry parity', () => {
  const frontendSource = readFileSync(
    path.join(process.cwd(), 'src/config/entitlements.config.ts'),
    'utf8',
  );
  const backendSource = readFileSync(
    path.join(process.cwd(), 'backend/src/config/entitlements.config.ts'),
    'utf8',
  );

  const frontendRules = extractRegistryRules(frontendSource);
  const backendRules = extractRegistryRules(backendSource);

  it('includes predictive analytics assets on both registries', () => {
    for (const assetId of [
      'admission-prediction',
      'journey-prediction',
      'command-predictive-alerts',
      'predictive-analytics-dashboard',
    ]) {
      expect(
        frontendRules.some((rule) => rule.assetIds.includes(assetId)),
        assetId,
      ).toBe(true);
      expect(
        backendRules.some((rule) => rule.assetIds.includes(assetId)),
        assetId,
      ).toBe(true);
    }
  });

  it('includes patient experience and EMS pre-arrival assets on both registries', () => {
    for (const assetId of [
      'patient-whiteboard',
      'ems-pre-arrival',
      'pre-arrival-activation',
      'trauma-team-activation',
    ]) {
      expect(
        frontendRules.some((rule) => rule.assetIds.includes(assetId)),
        assetId,
      ).toBe(true);
      expect(
        backendRules.some((rule) => rule.assetIds.includes(assetId)),
        assetId,
      ).toBe(true);
    }
  });

  it('keeps shared asset entitlement metadata aligned', () => {
    const sharedAssets = [
      'fleet-dashboard',
      'agent-clinical',
      'calculators',
      'simulation-suite',
      'ems-pre-arrival',
    ];

    for (const assetId of sharedAssets) {
      const frontendRule = frontendRules.find((rule) => rule.assetIds.includes(assetId));
      const backendRule = backendRules.find((rule) => rule.assetIds.includes(assetId));
      expect(frontendRule, `frontend missing ${assetId}`).toBeTruthy();
      expect(backendRule, `backend missing ${assetId}`).toBeTruthy();
      expect(backendRule?.featureFlagId).toBe(frontendRule?.featureFlagId);
      expect(normalizePlan(backendRule?.requiredPlan || '')).toBe(
        normalizePlan(frontendRule?.requiredPlan || ''),
      );
      expect(backendRule?.requiredPackIds).toEqual(frontendRule?.requiredPackIds);
    }
  });
});
