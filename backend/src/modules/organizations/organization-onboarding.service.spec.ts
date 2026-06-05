import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { CommercialPlan } from '../product-catalog/entities/commercial-plan.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationOnboardingService } from './organization-onboarding.service';

describe('OrganizationOnboardingService', () => {
  let service: OrganizationOnboardingService;
  let organizationRepository: { [key: string]: jest.Mock };
  let productRepository: { [key: string]: jest.Mock };
  let platformAssetsService: { [key: string]: jest.Mock };
  let workspacesService: { [key: string]: jest.Mock };

  const mockRepo = () => ({
    create: jest.fn((entity) => entity),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'org-1', ...entity })),
  });

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
            getOrganizationEntitlements: jest.fn().mockResolvedValue([
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

    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith('org-1', 'core-platform');
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith('org-1', 'emergency-medicine');
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith('org-1', 'fleet-logistics');
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith('org-1', 'enterprise-governance');
    expect(workspacesService.createWorkspace).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        name: 'EMS Command',
        emergencyModeEnabled: true,
      }),
      { organizationId: 'org-1' },
    );

    const saveCalls = organizationRepository.save.mock.calls;
    const persistedOrganization = saveCalls[saveCalls.length - 1][0];
    expect(persistedOrganization.settings).toEqual(
      expect.objectContaining({
        tenantProfile: expect.objectContaining({
          organization: expect.objectContaining({ slug: 'north-ems' }),
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
        installedPackIds: expect.arrayContaining(['core-platform', 'emergency-medicine', 'fleet-logistics']),
        tenantProfile: expect.objectContaining({
          workspaces: expect.arrayContaining([expect.objectContaining({ name: 'EMS Command' })]),
          integrationsRequested: ['identity-sso'],
        }),
      }),
    );
  });
});
