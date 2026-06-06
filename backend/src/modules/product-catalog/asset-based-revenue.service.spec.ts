import {
  SEED_COMMERCIAL_PLANS,
  SEED_INTEGRATION_OFFERINGS,
  SEED_PRODUCTS,
} from './data/product-catalog-seed.data';
import {
  SEED_ASSET_PACKS,
  SEED_PLATFORM_ASSETS,
} from '../platform-assets/data/platform-asset-seed.data';
import { SERVICE_LINE_TAXONOMY } from '../platform-assets/service-line-taxonomy';
import { AssetBasedRevenueService } from './asset-based-revenue.service';

describe('AssetBasedRevenueService', () => {
  const matrix = AssetBasedRevenueService.buildRevenueArchitectureMatrix({
    products: SEED_PRODUCTS as any,
    packs: SEED_ASSET_PACKS as any,
    assets: SEED_PLATFORM_ASSETS as any,
    plans: SEED_COMMERCIAL_PLANS as any,
    integrations: SEED_INTEGRATION_OFFERINGS as any,
  });

  it('projects the full organization-to-asset revenue hierarchy', () => {
    expect(matrix.hierarchy).toBe('Organization -> Subscription -> Products -> Asset Packs -> Assets');
    expect(matrix.summary.assets).toBe(SEED_PLATFORM_ASSETS.length);
    expect(matrix.summary.assetPacks).toBe(SEED_ASSET_PACKS.length);
    expect(matrix.summary.products).toBeGreaterThanOrEqual(SEED_PRODUCTS.length);
    expect(matrix.summary.rows).toBeGreaterThan(SEED_PLATFORM_ASSETS.length);
  });

  it('gives every asset a complete commercial model row', () => {
    expect(matrix.validationIssues).toEqual([]);

    const rowsByAssetId = new Map<string, typeof matrix.rows>();
    for (const row of matrix.rows) {
      rowsByAssetId.set(row.assetId, [...(rowsByAssetId.get(row.assetId) || []), row]);
    }

    for (const asset of SEED_PLATFORM_ASSETS) {
      const rows = rowsByAssetId.get(asset.id) || [];
      expect({ assetId: asset.id, rowCount: rows.length }).toEqual({
        assetId: asset.id,
        rowCount: expect.any(Number),
      });
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((row) => row.department && row.serviceLine)).toBe(true);
      expect(rows.some((row) => row.buyer.length > 0)).toBe(true);
      expect(rows.some((row) => row.assetPackId && row.productId)).toBe(true);
      expect(rows.some((row) => row.roles.length > 0)).toBe(true);
      expect(rows.some((row) => row.outcomes.length > 0)).toBe(true);
      expect(rows.some((row) => row.subscriptionTiers.length > 0)).toBe(true);
    }
  });

  it('links every asset pack to a product or the core platform foundation', () => {
    const productIdsByPackId = new Map<string, Set<string>>();
    for (const row of matrix.rows) {
      const productIds = productIdsByPackId.get(row.assetPackId) || new Set<string>();
      productIds.add(row.productId);
      productIdsByPackId.set(row.assetPackId, productIds);
    }

    for (const pack of SEED_ASSET_PACKS) {
      expect(productIdsByPackId.get(pack.id)?.size || 0).toBeGreaterThan(0);
    }
  });

  it('keeps rows inside the canonical department and service-line taxonomies', () => {
    const serviceLineNames = new Set<string>(SERVICE_LINE_TAXONOMY.map((serviceLine) => serviceLine.name));

    for (const row of matrix.rows) {
      expect(row.department).toBeTruthy();
      expect(serviceLineNames.has(row.serviceLine)).toBe(true);
    }
  });
});
