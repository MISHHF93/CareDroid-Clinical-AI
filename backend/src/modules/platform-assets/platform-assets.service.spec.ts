import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from './platform-assets.service';
import { AssetRegistryService } from './asset-registry.service';
import { PlatformAsset } from './entities/platform-asset.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import {
  EntitlementStatus,
  PlatformAssetLifecycle,
  PricingTier,
} from './enums/platform-asset.enums';
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
  const assetRegistryService = {
    listAssets: jest.fn(),
    getAssetById: jest.fn(),
    updateAssetLifecycle: jest.fn(),
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
        { provide: AssetRegistryService, useValue: assetRegistryService },
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
    assetRegistryService.updateAssetLifecycle.mockResolvedValue({
      id: 'qsofa',
      lifecycle: PlatformAssetLifecycle.DEPRECATED,
    });

    const result = await service.updateAssetLifecycle('qsofa', PlatformAssetLifecycle.DEPRECATED);
    expect(result.lifecycle).toBe(PlatformAssetLifecycle.DEPRECATED);
    expect(assetRegistryService.updateAssetLifecycle).toHaveBeenCalledWith(
      'qsofa',
      PlatformAssetLifecycle.DEPRECATED,
    );
  });

  it('projects marketplace packs with enabled state, assets, dependencies, and role mapping', async () => {
    const corePack = {
      id: 'core-platform',
      name: 'Core Platform',
      slug: 'core-platform',
      assetIds: ['assistant'],
      requiredDependencies: [],
      targetRoles: ['clinician'],
      pricingTier: PricingTier.CORE,
      isPublished: true,
    };
    const emergencyPack = {
      id: 'emergency-department-pack',
      name: 'Emergency Department Pack',
      slug: 'emergency-department-pack',
      description: 'ED pack',
      assetIds: ['qsofa', 'news2'],
      requiredDependencies: ['core-platform'],
      targetRoles: ['emergency physician'],
      defaultModules: ['alerts'],
      organizationTypes: ['hospital'],
      pricingTier: PricingTier.ENTERPRISE,
      isPublished: true,
    };
    packRepo.find
      .mockResolvedValueOnce([corePack, emergencyPack])
      .mockResolvedValueOnce([corePack, emergencyPack]);
    assetRepo.find.mockResolvedValue([
      { id: 'qsofa', title: 'qSOFA', assetType: 'calculator', route: '/tools/calculators' },
      { id: 'news2', title: 'NEWS2', assetType: 'calculator', route: '/tools/calculators' },
    ]);
    roleProfileRepo.find.mockResolvedValue([
      {
        id: 'ed-physician',
        label: 'ED Physician',
        intendedRoles: ['emergency physician'],
        preferredAssetIds: ['qsofa'],
      },
    ]);
    entitlementRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        packId: 'emergency-department-pack',
        status: EntitlementStatus.ENABLED,
      },
    ]);

    const result = await service.listMarketplacePacks({ organizationId: 'org-1' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'emergency-department-pack',
      enabled: true,
      includedAssetCount: 2,
      dependencySummary: { total: 1, enabled: 0, missing: 1 },
    });
    expect(result[0].includedAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'qsofa', title: 'qSOFA' })]),
    );
    expect(result[0].roleMapping).toEqual(
      expect.arrayContaining([expect.objectContaining({ roleProfileId: 'ed-physician' })]),
    );
    expect(result[0].warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'dependency' })]),
    );
  });

  it('rejects installing unpublished packs', async () => {
    packRepo.findOne.mockResolvedValue({
      id: 'emergency-department-pack',
      isPublished: false,
    });

    await expect(
      service.installPackForOrganization('org-1', 'emergency-department-pack'),
    ).rejects.toThrow('Asset pack is not published');
    expect(entitlementRepo.save).not.toHaveBeenCalled();
  });

  it('soft-disables packs and reports dependent pack warnings', async () => {
    packRepo.findOne.mockResolvedValue({
      id: 'core-platform',
      isPublished: true,
    });
    entitlementRepo.findOne.mockResolvedValue({
      id: 'ent-1',
      organizationId: 'org-1',
      packId: 'core-platform',
      status: EntitlementStatus.ENABLED,
    });
    packRepo.find.mockResolvedValue([
      { id: 'core-platform', name: 'Core Platform', requiredDependencies: [] },
      {
        id: 'emergency-department-pack',
        name: 'Emergency Department Pack',
        requiredDependencies: ['core-platform'],
      },
    ]);
    entitlementRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        packId: 'emergency-department-pack',
        status: EntitlementStatus.ENABLED,
      },
    ]);
    entitlementRepo.save.mockImplementation(async (row) => row);

    const result = await service.removePackFromOrganization('org-1', 'core-platform');

    expect(result).toMatchObject({
      removed: true,
      dependentPacks: [expect.objectContaining({ id: 'emergency-department-pack', enabled: true })],
    });
    expect(entitlementRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EntitlementStatus.DISABLED }),
    );
  });
});
