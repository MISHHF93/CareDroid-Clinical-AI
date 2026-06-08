import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { EntitlementService } from './entitlement.service';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformContextService } from './platform-context.service';

describe('PlatformContextService', () => {
  const platformAssetsService = {
    getOrganizationEntitlements: jest.fn(),
    resolveEntitledAssetIds: jest.fn(),
    getRoleProfile: jest.fn(),
    listPacks: jest.fn(),
    listAssets: jest.fn(),
    isStrictSaasEntitlementsEnabled: jest.fn(),
  };
  const entitlementService = {
    resolveDecisionFromContext: jest.fn(),
  };
  const workspacesService = {
    listForUser: jest.fn(),
  };
  const profileRepository = { findOne: jest.fn() };
  const organizationRepository = { findOne: jest.fn() };
  const membershipRepository = { findOne: jest.fn() };
  const productRepository = { find: jest.fn() };

  let service: PlatformContextService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformContextService,
        { provide: PlatformAssetsService, useValue: platformAssetsService },
        { provide: EntitlementService, useValue: entitlementService },
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepository },
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
        { provide: getRepositoryToken(OrganizationMembership), useValue: membershipRepository },
        { provide: getRepositoryToken(Product), useValue: productRepository },
      ],
    }).compile();

    service = moduleRef.get(PlatformContextService);
    jest.clearAllMocks();
    profileRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-1',
      roleProfileId: 'emergency-physician',
    });
    organizationRepository.findOne.mockResolvedValue({
      id: 'org-1',
      name: 'Demo Hospital',
      slug: 'demo-hospital',
      organizationType: 'hospital',
      branding: { displayName: 'Demo Command' },
      settings: {
        enabledProductIds: ['product-emergency-department'],
        assignedProductPackIds: ['emergency-department-pack'],
        resolvedPackIds: ['core-platform', 'emergency-department-pack'],
        navigation: { hiddenNavIds: ['legacy'] },
        dashboardLayout: { home: ['platform-analytics'] },
        workspaceDefaults: [{ name: 'Emergency Command', type: 'emergency' }],
      },
    });
    membershipRepository.findOne.mockResolvedValue({
      role: 'admin',
      roleProfileId: 'emergency-physician',
    });
    productRepository.find.mockResolvedValue([
      {
        id: 'product-emergency-department',
        slug: 'emergency-department-suite',
        name: 'Emergency Flow Intelligence Platform',
        productType: 'emergency_department',
        packIds: ['emergency-department-pack'],
      },
    ]);
    workspacesService.listForUser.mockResolvedValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: [{ id: 'workspace-1', settings: { enabledToolIds: ['qsofa'] } }],
    });
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([
      { packId: 'core-platform' },
      { packId: 'emergency-department-pack' },
    ]);
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue([
      'dashboard',
      'qsofa',
      'agent-emergency',
    ]);
    platformAssetsService.getRoleProfile.mockResolvedValue({ defaultAiAgentId: 'agent-emergency' });
    platformAssetsService.listPacks.mockResolvedValue([
      { id: 'core-platform' },
      { id: 'emergency-department-pack' },
    ]);
    platformAssetsService.listAssets.mockResolvedValue([
      { id: 'dashboard', assetType: 'dashboard' },
      { id: 'agent-emergency', assetType: 'ai_agent' },
    ]);
    platformAssetsService.isStrictSaasEntitlementsEnabled.mockReturnValue(true);
    entitlementService.resolveDecisionFromContext.mockReturnValue({
      isLaunchable: true,
      isVisible: true,
      state: 'allowed',
    });
  });

  it('exposes organization product assignments and tenant-aware settings', async () => {
    const context = await service.getContextForUser({ id: 'user-1' } as User);

    expect(context.assignedProducts).toEqual([
      expect.objectContaining({
        id: 'product-emergency-department',
        name: 'Emergency Flow Intelligence Platform',
        packIds: ['emergency-department-pack'],
      }),
    ]);
    expect(context.assignedProductPackIds).toEqual(['emergency-department-pack']);
    expect(context.resolvedPackIds).toEqual(['core-platform', 'emergency-department-pack']);
    expect(context.navigation).toEqual({ hiddenNavIds: ['legacy'] });
    expect(context.dashboardLayout).toEqual({ home: ['platform-analytics'] });
    expect(context.workspaceDefaults).toEqual([{ name: 'Emergency Command', type: 'emergency' }]);
    expect(context.defaultAiAgentId).toBe('agent-emergency');
  });
});
