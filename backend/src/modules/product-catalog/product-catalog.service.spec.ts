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
    productRepo.find.mockResolvedValue([
      { id: 'p1', packIds: ['icu-pack', 'core-platform'] },
    ]);
    const ids = await service.resolvePackIdsForProductIds(['p1']);
    expect(ids).toEqual(expect.arrayContaining(['icu-pack', 'core-platform']));
  });
});
