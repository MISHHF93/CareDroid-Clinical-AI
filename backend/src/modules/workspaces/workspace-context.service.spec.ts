import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Organization } from './entities/organization.entity';
import { WorkspaceType } from './entities/workspace.entity';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspaceContextService', () => {
  let service: WorkspaceContextService;

  const workspacesService = {
    getActiveWorkspaceState: jest.fn(),
    listForUser: jest.fn(),
    getWorkspaceForUser: jest.fn(),
  };
  const platformAssetsService = {
    getOrganizationEntitlements: jest.fn(),
    resolveEntitledAssetIds: jest.fn(),
    listAssets: jest.fn(),
    isStrictSaasEntitlementsEnabled: jest.fn(),
  };
  const entitlementService = {
    resolveDecisionFromContext: jest.fn(),
  };
  const organizationRepository = {
    findOne: jest.fn(),
  };

  const user = {
    id: 'user-1',
    role: UserRole.PHYSICIAN,
    subscription: { tier: 'enterprise' },
  } as User;
  const emergencyWorkspace = {
    id: 'workspace-1',
    type: WorkspaceType.EMERGENCY,
    name: 'Emergency Workspace',
    organizationId: 'org-1',
    branding: { displayName: 'Emergency' },
    settings: {
      workspaceKey: 'emergency',
      enabledToolIds: ['qsofa', 'news2'],
      recommendedAssetIds: ['qsofa'],
      assistantContext: 'Emergency context',
      shortcuts: [
        {
          id: 'qsofa',
          label: 'qSOFA',
          path: '/tools/calculators',
          description: 'Open qSOFA scoring.',
          assetId: 'qsofa',
        },
      ],
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspaceContextService,
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: PlatformAssetsService, useValue: platformAssetsService },
        { provide: EntitlementService, useValue: entitlementService },
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
      ],
    }).compile();

    service = moduleRef.get(WorkspaceContextService);
    jest.clearAllMocks();
    workspacesService.getActiveWorkspaceState.mockResolvedValue({
      workspaces: [emergencyWorkspace],
      memberships: [
        {
          id: 'membership-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: 'clinician',
          status: 'active',
        },
      ],
      activeWorkspaceId: 'workspace-1',
      effectivePermissions: ['ACCESS_TOOLS'],
      activeWorkspace: emergencyWorkspace,
    });
    organizationRepository.findOne.mockResolvedValue({
      id: 'org-1',
      name: 'CareDroid Hospital',
      slug: 'care',
      organizationType: 'hospital',
    });
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([{ packId: 'emergency' }]);
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['qsofa', 'news2']);
    platformAssetsService.listAssets.mockResolvedValue([
      { id: 'qsofa', title: 'qSOFA', route: '/tools/calculators' },
      { id: 'news2', title: 'NEWS2', route: '/tools/calculators' },
      { id: 'locked', title: 'Locked', route: '/locked' },
    ]);
    platformAssetsService.isStrictSaasEntitlementsEnabled.mockReturnValue(true);
    entitlementService.resolveDecisionFromContext.mockImplementation(({ assetId }) => ({
      assetId,
      isLaunchable: assetId !== 'locked',
    }));
  });

  it('returns active workspace context with visible assets, recommendations, assistant context, and shortcuts', async () => {
    const context = await service.getCurrentContext(user);

    expect(context.workspace).toMatchObject({
      id: 'workspace-1',
      workspaceKey: 'emergency',
      assistantContext: 'Emergency context',
    });
    expect(context.visibleAssetIds).toEqual(['qsofa', 'news2']);
    expect(context.recommendations).toEqual(
      expect.arrayContaining([expect.objectContaining({ assetId: 'qsofa', reason: 'workspace' })]),
    );
    // Regression guard (2026-08-08): shortcuts now live ONLY at context.workspace.shortcuts,
    // not duplicated at the envelope root -- see workspace.contracts.ts's
    // WorkspaceContextEnvelopeSchema for the full canonical-shape rationale.
    expect(context.workspace.shortcuts).toEqual([expect.objectContaining({ id: 'qsofa' })]);
    expect((context as Record<string, unknown>).shortcuts).toBeUndefined();
    expect(platformAssetsService.resolveEntitledAssetIds).toHaveBeenCalledWith({
      organizationId: 'org-1',
      workspaceEnabledToolIds: ['qsofa', 'news2'],
    });
  });

  it('does not throw when membership.department/joinedAt/lastAccessedAt are null', async () => {
    // Regression (HEAL-077): these WorkspaceMembership columns are declared
    // `nullable: true` in the entity (workspace-membership.entity.ts) -- a
    // user genuinely may have no department, and joinedAt/lastAccessedAt are
    // unset until backfilled/first access. TypeORM returns `null` for an
    // unset nullable column, not `undefined`. WorkspaceContextEnvelopeSchema
    // previously declared these fields `.optional()` only, which accepts a
    // missing/undefined key but still rejects an explicit `null` value --
    // this reproduced a real 500 (ZodError) on GET /api/workspaces/context
    // for any membership row with an unset department/joinedAt/lastAccessedAt.
    workspacesService.getActiveWorkspaceState.mockResolvedValue({
      workspaces: [emergencyWorkspace],
      memberships: [
        {
          id: 'membership-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: 'clinician',
          status: 'active',
          department: null,
          joinedAt: null,
          lastAccessedAt: null,
        },
      ],
      activeWorkspaceId: 'workspace-1',
      effectivePermissions: ['ACCESS_TOOLS'],
      activeWorkspace: emergencyWorkspace,
    });

    const context = await service.getCurrentContext(user);

    expect(context.membership).toMatchObject({
      id: 'membership-1',
      department: null,
      joinedAt: null,
      lastAccessedAt: null,
    });
  });
});
