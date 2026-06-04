import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformAsset } from './entities/platform-asset.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { PlatformAssetLifecycle } from './enums/platform-asset.enums';

describe('PlatformAssetsService', () => {
  let service: PlatformAssetsService;

  const assetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };
  const packRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const entitlementRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((row) => row),
  };
  const roleProfileRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const profileRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAssetsService,
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
        { provide: getRepositoryToken(OrganizationEntitlement), useValue: entitlementRepo },
        { provide: getRepositoryToken(RoleProfile), useValue: roleProfileRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
      ],
    }).compile();

    service = module.get(PlatformAssetsService);
    jest.clearAllMocks();
  });

  it('resolves entitled assets from organization packs', async () => {
    entitlementRepo.find.mockResolvedValue([{ packId: 'emergency-medicine', organizationId: 'org-1' }]);
    packRepo.find.mockResolvedValue([
      { id: 'emergency-medicine', assetIds: ['qsofa', 'news2'] },
    ]);

    const ids = await service.resolveEntitledAssetIds({ organizationId: 'org-1' });
    expect(ids).toEqual(expect.arrayContaining(['qsofa', 'news2']));
  });

  it('updates asset lifecycle', async () => {
    assetRepo.findOne.mockResolvedValue({ id: 'qsofa', lifecycle: PlatformAssetLifecycle.ACTIVE });
    assetRepo.save.mockImplementation(async (row) => row);

    const result = await service.updateAssetLifecycle('qsofa', PlatformAssetLifecycle.DEPRECATED);
    expect(result.lifecycle).toBe(PlatformAssetLifecycle.DEPRECATED);
  });
});
