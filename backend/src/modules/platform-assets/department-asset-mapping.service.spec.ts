import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { DepartmentAssetMappingService } from './department-asset-mapping.service';
import { DEPARTMENT_TAXONOMY } from './department-taxonomy';
import { EntitlementStatus, PlatformAssetType } from './enums/platform-asset.enums';

describe('DepartmentAssetMappingService', () => {
  let service: DepartmentAssetMappingService;
  const assetRepo = { find: jest.fn() };
  const packRepo = { find: jest.fn() };
  const roleProfileRepo = { find: jest.fn() };
  const membershipRepo = { find: jest.fn() };
  const profileRepo = { find: jest.fn() };
  const entitlementRepo = { find: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DepartmentAssetMappingService,
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
        { provide: getRepositoryToken(RoleProfile), useValue: roleProfileRepo },
        { provide: getRepositoryToken(OrganizationMembership), useValue: membershipRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: getRepositoryToken(OrganizationEntitlement), useValue: entitlementRepo },
      ],
    }).compile();

    service = moduleRef.get(DepartmentAssetMappingService);
    jest.clearAllMocks();
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: PlatformAssetType.CALCULATOR,
        category: 'Calculator',
        route: '/tools/calculators/qsofa',
        primaryDepartment: 'emergency',
        secondaryDepartments: ['icu'],
        recommendedRoles: ['emergency physician'],
        requiredPermissions: ['use-calculators'],
        packIds: ['emergency-department-pack'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'emergency-department-pack',
        name: 'Emergency Department Pack',
        slug: 'emergency-department-pack',
        assetIds: ['qsofa'],
        targetRoles: ['emergency physician'],
        defaultModules: ['emergency'],
      },
    ]);
    roleProfileRepo.find.mockResolvedValue([
      {
        id: 'emergency-physician',
        label: 'Emergency Physician',
        intendedRoles: ['emergency physician'],
        specialties: ['Emergency'],
      },
    ]);
    membershipRepo.find.mockResolvedValue([
      {
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'admin',
        roleProfileId: 'emergency-physician',
      },
    ]);
    profileRepo.find.mockResolvedValue([
      {
        userId: 'user-1',
        fullName: 'Dr. Rivera',
        specialty: 'Emergency',
        roleProfileId: 'emergency-physician',
      },
    ]);
    entitlementRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        packId: 'emergency-department-pack',
        status: EntitlementStatus.ENABLED,
      },
    ]);
  });

  it('returns every required department with mapped packs, assets, and users', async () => {
    const graph = await service.getDepartmentGraph({ organizationId: 'org-1' });
    const emergency = graph.departments.find((department) => department.id === 'emergency');

    expect(graph.taxonomy).toHaveLength(16);
    expect(graph.taxonomy.map((department) => department.name)).toEqual(
      DEPARTMENT_TAXONOMY.map((department) => department.name),
    );
    expect(emergency).toMatchObject({
      name: 'Emergency',
      assetCount: 1,
      packCount: 1,
      userCount: 1,
    });
    expect(emergency?.packs).toEqual([
      expect.objectContaining({ id: 'emergency-department-pack', enabled: true }),
    ]);
    expect(emergency?.assets).toEqual([
      expect.objectContaining({
        id: 'qsofa',
        primaryDepartment: 'emergency',
        requiredPermissions: ['use-calculators'],
        enabled: true,
      }),
    ]);
    expect(emergency?.users).toEqual([
      expect.objectContaining({ userId: 'user-1', displayName: 'Dr. Rivera' }),
    ]);
  });
});
