import { AssetDependencyGraphService, ASSET_DEPENDENCY_ISSUE_TYPES } from './asset-dependency-graph.service';
import { PlatformAssetType } from '../platform-assets/enums/platform-asset.enums';
import { IntegrationCategory, IntegrationStatus, ProductType } from './enums/product-catalog.enums';

describe('AssetDependencyGraphService', () => {
  const service = new AssetDependencyGraphService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('builds product to pack to asset to route to service to integration chains', () => {
    const graph = service.buildGraph(
      [
        {
          id: 'product-emergency',
          slug: 'emergency',
          name: 'Emergency Department Solution',
          productType: ProductType.EMERGENCY_DEPARTMENT,
          packIds: ['emergency-pack'],
          highlightAssetIds: [],
        } as any,
      ],
      [
        {
          id: 'emergency-pack',
          slug: 'emergency-pack',
          name: 'Emergency Department Pack',
          assetIds: ['qsofa'],
          requiredDependencies: [],
        } as any,
      ],
      [
        {
          id: 'qsofa',
          title: 'qSOFA',
          assetType: PlatformAssetType.CALCULATOR,
          route: '/tools/calculators/qsofa',
          dependencies: [],
          backendStatus: 'wired',
        } as any,
      ],
      [
        {
          id: 'int-fhir',
          slug: 'fhir',
          name: 'FHIR',
          category: IntegrationCategory.FHIR,
          status: IntegrationStatus.AVAILABLE,
          linkedAssetId: 'qsofa',
        } as any,
      ],
    );

    expect(graph.chains).toHaveLength(1);
    expect(graph.chains[0]).toMatchObject({
      product: { id: 'product-emergency', name: 'Emergency Department Solution' },
      assetPack: { id: 'emergency-pack', name: 'Emergency Department Pack' },
      asset: { id: 'qsofa', title: 'qSOFA' },
      route: '/tools/calculators/qsofa',
      backendServices: expect.arrayContaining(['backend:wired', 'ClinicalTools']),
      integrations: [expect.objectContaining({ id: 'int-fhir', name: 'FHIR' })],
    });
    expect(graph.summary).toMatchObject({
      products: 1,
      assetPacks: 1,
      assets: 1,
      chains: 1,
      routes: 1,
      integrations: 1,
      issues: 0,
    });
  });

  it('detects missing dependencies, duplicate dependencies, and orphan assets', () => {
    const graph = service.buildGraph(
      [
        {
          id: 'product-emergency',
          slug: 'emergency',
          name: 'Emergency Department Solution',
          productType: ProductType.EMERGENCY_DEPARTMENT,
          packIds: ['emergency-pack', 'emergency-pack', 'missing-pack'],
          highlightAssetIds: ['missing-highlight'],
        } as any,
      ],
      [
        {
          id: 'emergency-pack',
          slug: 'emergency-pack',
          name: 'Emergency Department Pack',
          assetIds: ['qsofa', 'qsofa', 'missing-asset'],
          requiredDependencies: ['missing-required'],
        } as any,
      ],
      [
        {
          id: 'qsofa',
          title: 'qSOFA',
          assetType: PlatformAssetType.CALCULATOR,
          route: '/tools/calculators/qsofa',
          dependencies: ['missing-dependency', 'missing-dependency'],
        } as any,
        {
          id: 'orphan',
          title: 'Orphan Asset',
          assetType: PlatformAssetType.TOOL,
          route: '/orphan',
          dependencies: [],
        } as any,
      ],
      [],
    );

    expect(graph.issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining([
        ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
        ASSET_DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY,
        ASSET_DEPENDENCY_ISSUE_TYPES.ORPHAN_ASSET,
      ]),
    );
    expect(graph.issueCounts).toMatchObject({
      'missing-dependency': expect.any(Number),
      'duplicate-dependency': expect.any(Number),
      'orphan-asset': 1,
    });
    expect(graph.issues.map((issue) => issue.detail).join(' ')).toContain('missing asset missing-asset');
    expect(graph.issues.map((issue) => issue.detail).join(' ')).toContain('Orphan Asset');
  });
});
