import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformAsset } from './entities/platform-asset.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { PlatformAssetLifecycle } from './enums/platform-asset.enums';
import { UserPreferencesService } from '../user-profile/user-preferences.service';

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
  const userPreferencesService = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
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
        { provide: UserPreferencesService, useValue: userPreferencesService },
      ],
    }).compile();

    service = module.get(PlatformAssetsService);
    jest.clearAllMocks();
  });

  it('resolves entitled assets from organization packs', async () => {
    entitlementRepo.find.mockResolvedValue([
      { packId: 'emergency-medicine', organizationId: 'org-1' },
    ]);
    packRepo.find.mockResolvedValue([{ id: 'emergency-medicine', assetIds: ['qsofa', 'news2'] }]);

    const ids = await service.resolveEntitledAssetIds({ organizationId: 'org-1' });
    expect(ids).toEqual(expect.arrayContaining(['qsofa', 'news2']));
  });

  it('does not fall back to all active assets for strict organization entitlements', async () => {
    entitlementRepo.find.mockResolvedValue([]);

    const ids = await service.resolveEntitledAssetIds({
      organizationId: 'org-1',
      strictEntitlements: true,
    });

    expect(ids).toEqual([]);
    expect(assetRepo.find).not.toHaveBeenCalled();
  });

  it('narrows entitled assets by workspace scope in strict mode', async () => {
    entitlementRepo.find.mockResolvedValue([
      { packId: 'emergency-medicine', organizationId: 'org-1' },
    ]);
    packRepo.find.mockResolvedValue([
      { id: 'emergency-medicine', assetIds: ['qsofa', 'news2', 'sofa-score'] },
    ]);

    const ids = await service.resolveEntitledAssetIds({
      organizationId: 'org-1',
      workspaceEnabledToolIds: ['sofa-score'],
      strictEntitlements: true,
    });

    expect(ids).toEqual(['sofa-score']);
  });

  it('updates asset lifecycle', async () => {
    assetRepo.findOne.mockResolvedValue({ id: 'qsofa', lifecycle: PlatformAssetLifecycle.ACTIVE });
    assetRepo.save.mockImplementation(async (row) => row);

    const result = await service.updateAssetLifecycle('qsofa', PlatformAssetLifecycle.DEPRECATED);
    expect(result.lifecycle).toBe(PlatformAssetLifecycle.DEPRECATED);
  });
});
