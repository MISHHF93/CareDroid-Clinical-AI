import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { CommercialPlan } from '../product-catalog/entities/commercial-plan.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationOnboardingService } from './organization-onboarding.service';

describe('OrganizationOnboardingService', () => {
  let service: OrganizationOnboardingService;
  let organizationRepository: { [key: string]: jest.Mock };
  let membershipRepository: { [key: string]: jest.Mock };
  let productRepository: { [key: string]: jest.Mock };
  let platformAssetsService: { [key: string]: jest.Mock };
  let workspacesService: { [key: string]: jest.Mock };

  const mockRepo = () => {
    let lastInsertValues: any = null;
    const insertQueryBuilder: any = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((values: any) => {
        lastInsertValues = values;
        return insertQueryBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    return {
      create: jest.fn((entity) => entity),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(async () => lastInsertValues),
      save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'org-1', ...entity })),
      createQueryBuilder: jest.fn(() => insertQueryBuilder),
    };
  };

  const user = { id: 'user-1' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationOnboardingService,
        { provide: getRepositoryToken(Organization), useFactory: mockRepo },
        { provide: getRepositoryToken(OrganizationMembership), useFactory: mockRepo },
        { provide: getRepositoryToken(UserProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(CommercialPlan), useFactory: mockRepo },
        {
          provide: PlatformAssetsService,
          useValue: {
            getOrganizationEntitlements: jest
              .fn()
              .mockResolvedValue([
                { packId: 'core-platform' },
                { packId: 'emergency-medicine' },
                { packId: 'fleet-logistics' },
                { packId: 'enterprise-governance' },
              ]),
            installPackForOrganization: jest.fn().mockResolvedValue({}),
            updateUserRoleProfile: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: WorkspacesService,
          useValue: {
            createWorkspace: jest.fn().mockResolvedValue({
              id: 'workspace-1',
              name: 'EMS Command',
              type: 'emergency',
              settings: {
                enabledToolIds: ['emergency-protocols'],
                enabledModules: ['dashboard', 'fleet'],
                emergencyModeEnabled: true,
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(OrganizationOnboardingService);
    organizationRepository = module.get(getRepositoryToken(Organization)) as any;
    membershipRepository = module.get(getRepositoryToken(OrganizationMembership)) as any;
    productRepository = module.get(getRepositoryToken(Product)) as any;
    platformAssetsService = module.get(PlatformAssetsService) as any;
    workspacesService = module.get(WorkspacesService) as any;

    organizationRepository.findOne.mockResolvedValue(null);
    const profileRepository = module.get(getRepositoryToken(UserProfile)) as any;
    const planRepository = module.get(getRepositoryToken(CommercialPlan)) as any;
    profileRepository.findOne.mockResolvedValue({ userId: user.id });
    planRepository.findOne.mockResolvedValue({
      id: 'enterprise',
      includedPackIds: ['enterprise-governance'],
      includedProductIds: ['product-plan'],
    });
    productRepository.find
      .mockResolvedValueOnce([{ id: 'product-plan', packIds: ['hospital-operations'] }])
      .mockResolvedValueOnce([{ id: 'product-ems', packIds: ['fleet-logistics'] }]);
  });

  it('persists and returns a configured tenant profile from products, packs, workspaces, and compliance settings', async () => {
    const result = await service.completeOnboarding(user, {
      name: 'North EMS',
      slug: 'north-ems',
      organizationType: OrganizationType.EMS,
      country: 'US',
      specialties: ['emergency', 'operations'],
      departments: ['Emergency', 'Operations'],
      packIds: ['emergency-medicine'],
      productIds: ['product-ems'],
      enabledProductIds: ['product-ems'],
      commercialPlanId: 'enterprise' as any,
      integrationSlugs: ['identity-sso'],
      defaultRoleProfileId: 'fleet-operator',
      roleAssignments: [{ email: 'lead@example.com', roleProfileId: 'fleet-operator' }],
      complianceMode: 'ems',
      branding: {
        displayName: 'North EMS Command',
        accentColor: '#00ff88',
      },
      workspaceSetups: [
        {
          name: 'EMS Command',
          type: 'emergency',
          enabledToolIds: ['emergency-protocols'],
          enabledModules: ['dashboard', 'fleet'],
          emergencyModeEnabled: true,
        },
      ],
    });

    const orgId = result.organization.id;
    expect(orgId).toEqual(expect.any(String));
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      orgId,
      'core-platform',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      orgId,
      'emergency-medicine',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      orgId,
      'fleet-logistics',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      orgId,
      'enterprise-governance',
    );
    expect(workspacesService.createWorkspace).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        name: 'EMS Command',
        emergencyModeEnabled: true,
      }),
      { organizationId: orgId },
    );

    const saveCalls = organizationRepository.save.mock.calls;
    const persistedOrganization = saveCalls[saveCalls.length - 1][0];
    expect(persistedOrganization.settings).toEqual(
      expect.objectContaining({
        tenantProfile: expect.objectContaining({
          organization: expect.objectContaining({ slug: 'north-ems' }),
          specialties: ['emergency', 'operations'],
          departments: ['Emergency', 'Operations'],
          productIds: ['product-ems'],
          complianceMode: 'ems',
          branding: expect.objectContaining({ displayName: 'North EMS Command' }),
          roleAssignments: [{ email: 'lead@example.com', roleProfileId: 'fleet-operator' }],
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'configured',
        complianceMode: 'ems',
        branding: expect.objectContaining({ accentColor: '#00ff88' }),
        installedPackIds: expect.arrayContaining([
          'core-platform',
          'emergency-medicine',
          'fleet-logistics',
        ]),
        tenantProfile: expect.objectContaining({
          workspaces: expect.arrayContaining([expect.objectContaining({ name: 'EMS Command' })]),
          integrationsRequested: ['identity-sso'],
        }),
      }),
    );
  });

  it('ignores a self-assigned defaultRoleProfileId from a user without role-assignment permission (HEAL-200 regression guard)', async () => {
    // Reproduces the exact escalation path HEAL-196 closed on the dedicated
    // PATCH platform/me/role-profile and PATCH /profile/me endpoints, found
    // here as a third, ungated call site: any authenticated user (no role
    // set at all, i.e. below even UserRole.STUDENT's privileges) could
    // previously onboard a throwaway org with defaultRoleProfileId:
    // 'administrator' and silently escalate their own GLOBAL roleProfileId
    // -- which AuthorizationGuard reads for every request platform-wide, not
    // just within the new org -- to hospital-administrator-level access
    // (READ_PHI, VIEW_AUDIT_LOGS, MANAGE_USERS, VIEW_GOVERNANCE).
    const unprivilegedUser = { id: 'user-1' } as User;

    const result = await service.completeOnboarding(unprivilegedUser, {
      name: 'Shadow Org',
      slug: 'shadow-org',
      organizationType: OrganizationType.HOSPITAL,
      defaultRoleProfileId: 'administrator',
    } as any);

    expect(platformAssetsService.updateUserRoleProfile).not.toHaveBeenCalled();
    expect(result.tenantProfile.roleProfileId).toBeNull();
  });

  it('applies defaultRoleProfileId when the onboarding user has role-assignment permission', async () => {
    const adminUser = { id: 'admin-1', role: UserRole.ADMIN } as User;

    const result = await service.completeOnboarding(adminUser, {
      name: 'Legit Org',
      slug: 'legit-org',
      organizationType: OrganizationType.HOSPITAL,
      defaultRoleProfileId: 'administrator',
    } as any);

    expect(platformAssetsService.updateUserRoleProfile).toHaveBeenCalledWith(
      'admin-1',
      'administrator',
    );
    expect(result.tenantProfile.roleProfileId).toBe('administrator');
  });

  it('rejects onboarding when a concurrent request wins the race for the same slug (TOCTOU regression guard)', async () => {
    // The findOne() pre-check at the top of completeOnboarding() only
    // catches a slug collision that already existed BEFORE this call
    // started. It cannot see a second request that passed its own findOne()
    // check in the same narrow window and committed first. Simulate that:
    // this call's orIgnore() insert is a no-op (someone else's row already
    // holds the slug), so the read-back must return the winner's row, not
    // this call's candidate -- and completeOnboarding must reject with the
    // same clean error a synchronous duplicate would get, not silently
    // proceed to create a membership/workspaces/packs against someone
    // else's organization.
    const winningOrg = { id: 'winner-org-id', name: 'Other Org', slug: 'north-ems' };
    organizationRepository.createQueryBuilder.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    });
    organizationRepository.findOneOrFail.mockResolvedValue(winningOrg);

    await expect(
      service.completeOnboarding(user, {
        name: 'North EMS',
        slug: 'north-ems',
        organizationType: OrganizationType.EMS,
      } as any),
    ).rejects.toThrow('Organization slug already exists: north-ems');

    expect(membershipRepository.save).not.toHaveBeenCalled();
  });
});
