import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { Product } from './entities/product.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { CarePathway } from './entities/care-pathway.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { ProductCatalogService } from './product-catalog.service';
import { Organization } from '../workspaces/entities/organization.entity';

describe('ProductCatalogService', () => {
  let service: ProductCatalogService;
  let platformAssetsService: { [key: string]: jest.Mock };
  let entitlementService: { [key: string]: jest.Mock };

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCatalogService,
        {
          provide: PlatformAssetsService,
          useValue: {
            resolveEntitledAssetIds: jest.fn().mockResolvedValue([]),
            installPackForOrganization: jest.fn().mockResolvedValue({}),
            removePackFromOrganization: jest.fn().mockResolvedValue({ removed: true }),
            getOrganizationEntitlements: jest.fn().mockResolvedValue([]),
            isStrictSaasEntitlementsEnabled: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: EntitlementService,
          useValue: {
            resolveDecisionFromContext: jest.fn(({ assetId, organizationId, entitledAssetIds }) => {
              const launchable = !organizationId || entitledAssetIds?.includes(assetId);
              return {
                assetId,
                state: launchable ? 'allowed' : 'locked',
                isVisible: true,
                isLaunchable: launchable,
                reason: launchable ? 'allowed' : 'asset-not-entitled',
              };
            }),
          },
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(CommercialPlan), useFactory: mockRepo },
        { provide: getRepositoryToken(SpecialtyCatalog), useFactory: mockRepo },
        { provide: getRepositoryToken(CarePathway), useFactory: mockRepo },
        { provide: getRepositoryToken(IntegrationOffering), useFactory: mockRepo },
        { provide: getRepositoryToken(PlatformAsset), useFactory: mockRepo },
        { provide: getRepositoryToken(AssetPack), useFactory: mockRepo },
        { provide: getRepositoryToken(Organization), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ProductCatalogService);
    platformAssetsService = module.get(PlatformAssetsService) as any;
    entitlementService = module.get(EntitlementService) as any;
  });

  it('resolves pack ids for product ids', async () => {
    const productRepo = (service as any).productRepository;
    productRepo.find.mockResolvedValue([{ id: 'p1', packIds: ['icu-pack', 'core-platform'] }]);
    const ids = await service.resolvePackIdsForProductIds(['p1']);
    expect(ids).toEqual(expect.arrayContaining(['icu-pack', 'core-platform']));
  });

  it('serializes asset-pack productization metadata on product detail', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.findOne.mockResolvedValue({
      id: 'product-icu',
      slug: 'icu-suite',
      name: 'ICU Suite',
      description: 'Critical care scores and workflows.',
      productType: 'icu',
      packIds: ['icu-pack'],
      highlightAssetIds: ['sofa-score'],
      outcomes: ['critical care standardization'],
      targetBuyers: ['critical care leadership'],
      targetUsers: ['Intensivists', 'ICU nurses'],
      requiredBackendCapabilities: ['Entitlement installation for icu-pack plus core-platform'],
      requiredIntegrations: ['FHIR observations for vitals and labs'],
      aiWorkflows: ['Daily ICU patient summary and timeline synthesis'],
      dashboards: ['ICU command dashboard'],
      pricingTierPlaceholder: 'Enterprise',
      readinessLabels: ['integration-required'],
      complexity: 'medium',
      commercialPlanIds: ['enterprise'],
    });
    packRepo.find.mockResolvedValue([
      {
        id: 'icu-pack',
        name: 'ICU Pack',
        slug: 'icu-pack',
        description: 'Critical care scores and protocols.',
        targetRoles: ['ICU clinician'],
        requiredDependencies: ['core-platform'],
        defaultModules: ['dashboard', 'icu', 'tools'],
        pricingTier: 'enterprise',
        salesMetadata: null,
        assetIds: ['sofa-score'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'sofa-score',
        title: 'SOFA Score',
        description: 'Critical care score.',
        assetType: 'calculator',
        category: 'Calculator',
        route: '/tools/sofa-score',
        launchType: 'route',
        packIds: ['icu-pack'],
      },
    ]);

    const detail = await service.getProductAssets('icu-suite');

    expect(detail.product).toMatchObject({
      slug: 'icu-suite',
      targetUsers: ['Intensivists', 'ICU nurses'],
      requiredBackendCapabilities: ['Entitlement installation for icu-pack plus core-platform'],
      requiredIntegrations: ['FHIR observations for vitals and labs'],
      aiWorkflows: ['Daily ICU patient summary and timeline synthesis'],
      dashboards: ['ICU command dashboard'],
      pricingTierPlaceholder: 'Enterprise',
      readinessLabels: ['integration-required'],
    });
    expect(detail.packs[0]).toMatchObject({
      id: 'icu-pack',
      requiredDependencies: ['core-platform'],
      defaultModules: ['dashboard', 'icu', 'tools'],
    });
  });

  it('keeps marketplace product assets visible with entitlement status for organization context', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.findOne.mockResolvedValue({
      id: 'product-icu',
      slug: 'icu-suite',
      name: 'ICU Suite',
      packIds: ['icu-pack'],
      highlightAssetIds: ['sofa-score', 'locked-ai'],
    });
    packRepo.find.mockResolvedValue([
      {
        id: 'icu-pack',
        name: 'ICU Pack',
        slug: 'icu-pack',
        assetIds: ['sofa-score', 'locked-ai'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'sofa-score',
        title: 'SOFA Score',
        assetType: 'calculator',
        packIds: ['icu-pack'],
      },
      {
        id: 'locked-ai',
        title: 'Premium ICU AI',
        assetType: 'ai_agent',
        packIds: ['icu-pack'],
      },
    ]);
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['sofa-score']);

    const detail = await service.getProductAssets('icu-suite', 'org-1');

    expect(detail.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sofa-score',
          entitlementStatus: 'entitled',
          isLaunchable: true,
        }),
        expect.objectContaining({
          id: 'locked-ai',
          entitlementStatus: 'locked',
          isLaunchable: false,
        }),
      ]),
    );
    expect(detail.assetsByType.ai_agent[0]).toMatchObject({
      id: 'locked-ai',
      entitlementStatus: 'locked',
      isLaunchable: false,
    });
    expect(entitlementService.resolveDecisionFromContext).toHaveBeenCalled();
  });

  it('builds product graph from products to packs, assets, routes, and backend services', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.find.mockResolvedValue([
      {
        id: 'product-emergency-department',
        slug: 'emergency-department-suite',
        name: 'Emergency Department Suite',
        productType: 'emergency_department',
        packIds: ['emergency-department-pack'],
        highlightAssetIds: ['qsofa'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'emergency-department-pack',
        name: 'Emergency Department Pack',
        slug: 'emergency-department-pack',
        assetIds: ['qsofa', 'agent-emergency'],
        requiredDependencies: ['core-platform'],
        pricingTier: 'enterprise',
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: 'calculator',
        category: 'Calculator',
        route: '/tools/calculators/qsofa',
        launchType: 'route',
        backendStatus: 'wired',
        packIds: ['emergency-department-pack'],
      },
      {
        id: 'agent-emergency',
        title: 'Emergency AI',
        assetType: 'ai_agent',
        route: '/assistant',
        backendStatus: 'wired',
        packIds: ['emergency-department-pack'],
      },
    ]);

    const [graph] = (await service.getProductBuilderGraph()) as any[];

    expect(graph.product.name).toBe('Emergency Department Suite');
    expect(graph.packs[0]).toMatchObject({
      id: 'emergency-department-pack',
      assets: expect.arrayContaining([
        expect.objectContaining({
          id: 'qsofa',
          route: '/tools/calculators/qsofa',
          backendServices: expect.arrayContaining(['ClinicalTools']),
        }),
      ]),
    });
    expect(graph.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetId: 'qsofa', route: '/tools/calculators/qsofa' }),
      ]),
    );
    expect(graph.backendServices).toEqual(expect.arrayContaining(['ClinicalTools', 'AiModule']));
  });

  it('builds asset pack graph with product mappings', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.find.mockResolvedValue([
      {
        id: 'product-digital-twin',
        slug: 'digital-twin-suite',
        name: 'Digital Twin Suite',
        packIds: ['digital-twin-pack'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'digital-twin-pack',
        name: 'Digital Twin Pack',
        slug: 'digital-twin-pack',
        assetIds: ['digital-twin'],
        pricingTier: 'enterprise',
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'digital-twin',
        title: 'Digital Twin',
        assetType: 'dashboard',
        route: '/digital-twin',
        backendStatus: 'wired',
        packIds: ['digital-twin-pack'],
      },
    ]);

    const [pack] = await service.getAssetPackBuilderGraph();

    expect(pack).toMatchObject({
      id: 'digital-twin-pack',
      products: [{ id: 'product-digital-twin', slug: 'digital-twin-suite', name: 'Digital Twin Suite' }],
      assets: [
        expect.objectContaining({
          id: 'digital-twin',
          route: '/digital-twin',
          backendServices: expect.arrayContaining(['DigitalTwinService']),
        }),
      ],
    });
  });

  it('reconciles organization entitlements from a commercial plan without disabling manual packs by default', async () => {
    const planRepo = (service as any).planRepository;
    const productRepo = (service as any).productRepository;
    const orgRepo = (service as any).organizationRepository;
    const org = { id: 'org-1', settings: { existing: true } };

    orgRepo.findOne.mockResolvedValue(org);
    planRepo.findOne.mockResolvedValue({
      id: 'enterprise',
      includedPackIds: ['governance-compliance-pack'],
      includedProductIds: ['product-icu'],
    });
    productRepo.find.mockResolvedValue([{ id: 'product-icu', packIds: ['icu-pack'] }]);

    const result = await service.reconcileOrganizationCommercialPlan('org-1', 'enterprise');

    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'governance-compliance-pack',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith('org-1', 'icu-pack');
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(platformAssetsService.removePackFromOrganization).not.toHaveBeenCalled();
    expect(orgRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          existing: true,
          commercialPlanId: 'enterprise',
          commercialPlanPackIds: expect.arrayContaining([
            'governance-compliance-pack',
            'icu-pack',
            'core-platform',
          ]),
        }),
      }),
    );
    expect(result.targetPackIds).toEqual(
      expect.arrayContaining(['governance-compliance-pack', 'icu-pack', 'core-platform']),
    );
  });

  it('can explicitly disable packs no longer included in a commercial plan', async () => {
    const planRepo = (service as any).planRepository;
    const productRepo = (service as any).productRepository;
    const orgRepo = (service as any).organizationRepository;

    orgRepo.findOne.mockResolvedValue({ id: 'org-1', settings: {} });
    planRepo.findOne.mockResolvedValue({
      id: 'starter',
      includedPackIds: ['core-platform'],
      includedProductIds: [],
    });
    productRepo.find.mockResolvedValue([]);
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([
      { packId: 'core-platform' },
      { packId: 'legacy-pack' },
    ]);

    const result = await service.reconcileOrganizationCommercialPlan('org-1', 'starter', {
      disableRemovedPacks: true,
    });

    expect(platformAssetsService.removePackFromOrganization).toHaveBeenCalledWith(
      'org-1',
      'legacy-pack',
    );
    expect(platformAssetsService.removePackFromOrganization).not.toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(result.disabledPackIds).toEqual(['legacy-pack']);
  });
});
