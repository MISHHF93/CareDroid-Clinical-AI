import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { PlatformAssetLifecycle } from '../platform-assets/enums/platform-asset.enums';
import { REQUIRED_SELLABLE_PRODUCT_NAMES } from './data/product-catalog-seed.data';
import { CarePathway } from './entities/care-pathway.entity';
import { Product } from './entities/product.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { ProductCatalogValidationService } from './product-catalog-validation.service';

describe('ProductCatalogValidationService', () => {
  let service: ProductCatalogValidationService;
  const productRepo = { find: jest.fn() };
  const packRepo = { find: jest.fn() };
  const assetRepo = { find: jest.fn() };
  const specialtyRepo = { find: jest.fn() };
  const pathwayRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCatalogValidationService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(SpecialtyCatalog), useValue: specialtyRepo },
        { provide: getRepositoryToken(CarePathway), useValue: pathwayRepo },
      ],
    }).compile();

    service = module.get(ProductCatalogValidationService);
    jest.clearAllMocks();
    productRepo.find.mockResolvedValue(
      REQUIRED_SELLABLE_PRODUCT_NAMES.map((name, index) => ({
        id: `product-${index}`,
        slug: name.toLowerCase().replace(/\W+/g, '-'),
        name,
        packIds: ['core-platform'],
        highlightAssetIds: [],
      })),
    );
    packRepo.find.mockResolvedValue([{ id: 'core-platform', slug: 'core-platform', assetIds: ['dashboard'] }]);
    assetRepo.find.mockResolvedValue([{ id: 'dashboard', lifecycle: PlatformAssetLifecycle.ACTIVE }]);
    specialtyRepo.find.mockResolvedValue([]);
    pathwayRepo.find.mockResolvedValue([]);
  });

  it('passes when assets are assigned to packs', async () => {
    const result = await service.validateCatalogReferences();
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('fails when an asset is not assigned to a pack', async () => {
    assetRepo.find.mockResolvedValue([
      { id: 'dashboard', lifecycle: PlatformAssetLifecycle.ACTIVE },
      { id: 'orphan-tool', lifecycle: PlatformAssetLifecycle.ACTIVE },
    ]);

    const result = await service.validateCatalogReferences();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Asset orphan-tool: not assigned to any pack or marked internal/developer-only',
    );
  });

  it('allows unpacked assets explicitly marked internal or developer-only', async () => {
    assetRepo.find.mockResolvedValue([
      { id: 'dashboard', lifecycle: PlatformAssetLifecycle.ACTIVE },
      { id: 'admin-panel', lifecycle: PlatformAssetLifecycle.ADMIN_ONLY },
      {
        id: 'developer-console',
        lifecycle: PlatformAssetLifecycle.ACTIVE,
        governance: { developerOnly: true },
      },
    ]);

    const result = await service.validateCatalogReferences();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
