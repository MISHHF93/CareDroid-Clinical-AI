import {
  AUTOMATION_COMMERCIAL_ASSETS,
  SEED_ASSET_PACKS,
  SEED_PLATFORM_ASSETS,
} from './data/platform-asset-seed.data';

describe('automation commercialization seed metadata', () => {
  const automationIds = AUTOMATION_COMMERCIAL_ASSETS.map((asset) => asset.id);

  it('assigns every automation to at least one commercial asset pack', () => {
    for (const asset of AUTOMATION_COMMERCIAL_ASSETS) {
      expect(asset.packIds?.length).toBeGreaterThan(0);
      for (const packId of asset.packIds || []) {
        const pack = SEED_ASSET_PACKS.find((row) => row.id === packId);
        expect(pack).toBeDefined();
        expect(pack?.assetIds).toContain(asset.id);
      }
    }
  });

  it('assigns every automation to a subscription tier and entitlement-ready asset row', () => {
    for (const assetId of automationIds) {
      const seededAsset = SEED_PLATFORM_ASSETS.find((asset) => asset.id === assetId);

      expect(seededAsset).toBeDefined();
      expect(seededAsset?.pricingTier).toBeTruthy();
      expect(seededAsset?.packIds?.length).toBeGreaterThan(0);
      expect(seededAsset?.permissionPolicy).toMatchObject({
        allowedRoles: expect.any(Array),
      });
    }
  });

  it('keeps high-risk clinical automations human-review gated', () => {
    const highRiskAutomations = SEED_PLATFORM_ASSETS.filter(
      (asset) => automationIds.includes(asset.id) && asset.riskLevel === 'high-risk',
    );

    expect(highRiskAutomations.map((asset) => asset.id)).toEqual(
      expect.arrayContaining([
        'automation-news2-clinician-notification',
        'automation-potassium-lab-workflow',
      ]),
    );
    highRiskAutomations.forEach((asset) => {
      expect(asset.governance).toMatchObject({
        requiresHumanReview: true,
        auditRequired: true,
      });
    });
  });
});
