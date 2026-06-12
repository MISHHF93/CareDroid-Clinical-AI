import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetRegistryService } from './asset-registry.service';
import { SEED_PLATFORM_ASSETS } from './data/platform-asset-seed.data';
import { AssetPack } from './entities/asset-pack.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { PlatformAssetsSeedService } from './platform-assets.seed.service';

describe('PlatformAssetsSeedService', () => {
  const assetRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  const packRepo = {
    findOne: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  const roleProfileRepo = {
    save: jest.fn(async (row) => row),
    create: jest.fn((row) => row),
  };
  const assetRegistryService = {
    validateAsset: jest.fn(),
  };

  let service: PlatformAssetsSeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAssetsSeedService,
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
        { provide: getRepositoryToken(RoleProfile), useValue: roleProfileRepo },
        { provide: AssetRegistryService, useValue: assetRegistryService },
      ],
    }).compile();

    service = module.get(PlatformAssetsSeedService);
    jest.clearAllMocks();
  });

  it('repairs existing seed assets that predate the registry metadata migration', async () => {
    const abgSeed = SEED_PLATFORM_ASSETS.find((asset) => asset.id === 'abg-interpreter');
    expect(abgSeed).toBeTruthy();

    assetRepo.count.mockResolvedValue(1);
    assetRepo.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id !== 'abg-interpreter') return null;
      return {
        id: 'abg-interpreter',
        assetType: abgSeed!.assetType,
        title: abgSeed!.title,
        description: abgSeed!.description,
        category: abgSeed!.category,
        route: abgSeed!.route,
        lifecycle: abgSeed!.lifecycle,
        pricingTier: abgSeed!.pricingTier,
        packIds: ['legacy-pack'],
        dependencies: [],
        catalogVersion: '0.9.0',
        organizationTypes: [],
        workspaceTags: [],
        intendedRoles: [],
        primaryDepartment: null,
        recommendedRoles: [],
        requiredPermissions: [],
      };
    });
    packRepo.findOne.mockResolvedValue({
      id: 'existing-pack',
      assetIds: [],
      defaultModules: [],
      targetRoles: [],
      buyerPersona: [],
      decisionMaker: [],
      stakeholders: [],
      expectedOutcomes: [],
      salesMetadata: null,
    });

    await service.seedIfEmpty();

    const repairedAbgRow = assetRepo.save.mock.calls
      .map(([row]) => row)
      .find((row) => row.id === 'abg-interpreter');
    expect(repairedAbgRow).toMatchObject({
      id: 'abg-interpreter',
      organizationTypes: abgSeed!.organizationTypes,
      workspaceTags: abgSeed!.workspaceTags,
      intendedRoles: abgSeed!.intendedRoles,
      primaryDepartment: abgSeed!.primaryDepartment,
      recommendedRoles: abgSeed!.recommendedRoles,
      requiredPermissions: abgSeed!.requiredPermissions,
      catalogVersion: abgSeed!.catalogVersion,
    });
    expect(repairedAbgRow.packIds).toEqual(
      expect.arrayContaining(['legacy-pack', ...abgSeed!.packIds]),
    );
    expect(assetRegistryService.validateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'abg-interpreter' }),
    );
  });
});
