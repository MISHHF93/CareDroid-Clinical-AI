import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { Product } from './entities/product.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { CarePathway } from './entities/care-pathway.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { ProductCatalogService } from './product-catalog.service';

describe('ProductCatalogService', () => {
  let service: ProductCatalogService;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCatalogService,
        {
          provide: PlatformAssetsService,
          useValue: { resolveEntitledAssetIds: jest.fn().mockResolvedValue([]) },
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(CommercialPlan), useFactory: mockRepo },
        { provide: getRepositoryToken(SpecialtyCatalog), useFactory: mockRepo },
        { provide: getRepositoryToken(CarePathway), useFactory: mockRepo },
        { provide: getRepositoryToken(IntegrationOffering), useFactory: mockRepo },
        { provide: getRepositoryToken(PlatformAsset), useFactory: mockRepo },
        { provide: getRepositoryToken(AssetPack), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ProductCatalogService);
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
});
