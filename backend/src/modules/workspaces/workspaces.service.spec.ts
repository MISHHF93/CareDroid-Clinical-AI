import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkspacePermissionsService } from '../permissions/workspace-permissions.service';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipRole,
  WorkspaceMembershipStatus,
} from './entities/workspace-membership.entity';
import { UserWorkspaceState } from './entities/user-workspace-state.entity';
import { Workspace, WorkspaceType } from './entities/workspace.entity';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService strict entitlements', () => {
  let service: WorkspacesService;

  const workspaceRepository = {
    create: jest.fn((row) => ({ id: 'workspace-1', ...row })),
    save: jest.fn(async (row) => row),
    findOne: jest.fn(),
  };
  const membershipRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
    findOne: jest.fn(),
  };
  const invitationRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  let statePendingInsertValues: any = null;
  const stateInsertQueryBuilder: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn((values: any) => {
      statePendingInsertValues = values;
      return stateInsertQueryBuilder;
    }),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const stateRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(async () => statePendingInsertValues),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
    createQueryBuilder: jest.fn(() => stateInsertQueryBuilder),
  };
  const permissionsService = {
    getEffectivePermissions: jest.fn().mockReturnValue(['MANAGE_WORKSPACE']),
    getWorkspaceRolePermissions: jest.fn().mockReturnValue(['MANAGE_WORKSPACE']),
  };
  const auditService = { log: jest.fn() };
  const platformAssetsService = {
    isStrictSaasEntitlementsEnabled: jest.fn().mockReturnValue(true),
    resolveEntitledAssetIds: jest.fn(),
  };

  const user = {
    id: 'user-1',
    role: UserRole.ADMIN,
    profile: { institution: 'CareDroid' },
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepository },
        { provide: getRepositoryToken(WorkspaceMembership), useValue: membershipRepository },
        { provide: getRepositoryToken(WorkspaceInvitation), useValue: invitationRepository },
        { provide: getRepositoryToken(UserWorkspaceState), useValue: stateRepository },
        { provide: WorkspacePermissionsService, useValue: permissionsService },
        { provide: AuditService, useValue: auditService },
        { provide: PlatformAssetsService, useValue: platformAssetsService },
      ],
    }).compile();

    service = module.get(WorkspacesService);
    jest.clearAllMocks();
    workspaceRepository.create.mockImplementation((row) => ({ id: 'workspace-1', ...row }));
    workspaceRepository.save.mockImplementation(async (row) => row);
    workspaceRepository.findOne.mockResolvedValue(null);
    membershipRepository.create.mockImplementation((row) => row);
    membershipRepository.save.mockImplementation(async (row) => row);
    permissionsService.getEffectivePermissions.mockReturnValue(['MANAGE_WORKSPACE']);
    permissionsService.getWorkspaceRolePermissions.mockReturnValue(['MANAGE_WORKSPACE']);
    platformAssetsService.isStrictSaasEntitlementsEnabled.mockReturnValue(true);
  });

  it('rejects organization workspace creation when enabled tools are not entitled', async () => {
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['qsofa']);

    await expect(
      service.createWorkspace(
        user,
        {
          name: 'Emergency',
          type: WorkspaceType.EMERGENCY,
          enabledToolIds: ['qsofa', 'locked-tool'],
        },
        { organizationId: 'org-1' },
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(platformAssetsService.resolveEntitledAssetIds).toHaveBeenCalledWith({
      organizationId: 'org-1',
      workspaceEnabledToolIds: ['qsofa', 'locked-tool'],
      strictEntitlements: true,
    });
    expect(workspaceRepository.save).not.toHaveBeenCalled();
  });

  it('allows organization workspace creation when requested tools are entitled', async () => {
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['qsofa', 'news2']);

    const result = await service.createWorkspace(
      user,
      {
        name: 'Emergency',
        type: WorkspaceType.EMERGENCY,
        enabledToolIds: ['qsofa', 'news2'],
      },
      { organizationId: 'org-1' },
    );

    expect(result.settings.enabledToolIds).toEqual(['qsofa', 'news2']);
    expect(workspaceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        settings: expect.objectContaining({ enabledToolIds: ['qsofa', 'news2'] }),
      }),
    );
  });

  it('rejects workspace tool updates outside organization entitlements', async () => {
    membershipRepository.findOne.mockResolvedValue({
      userId: user.id,
      workspaceId: 'workspace-1',
      role: WorkspaceMembershipRole.OWNER,
      status: WorkspaceMembershipStatus.ACTIVE,
      permissions: ['MANAGE_WORKSPACE'],
    });
    workspaceRepository.findOne.mockResolvedValue({
      id: 'workspace-1',
      type: WorkspaceType.EMERGENCY,
      name: 'Emergency',
      organizationId: 'org-1',
      settings: { enabledToolIds: ['qsofa'] },
    });
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['qsofa']);

    await expect(
      service.updateTools(user, 'workspace-1', ['qsofa', 'locked-tool']),
    ).rejects.toThrow(ForbiddenException);

    expect(workspaceRepository.save).not.toHaveBeenCalled();
  });

  it('does not enforce organization entitlements for personal workspaces', async () => {
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue([]);

    await service.createWorkspace(user, {
      name: 'Personal',
      type: WorkspaceType.PERSONAL,
      enabledToolIds: ['offline-tool'],
    });

    expect(platformAssetsService.resolveEntitledAssetIds).not.toHaveBeenCalled();
    expect(workspaceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: undefined,
        settings: expect.objectContaining({ enabledToolIds: ['offline-tool'] }),
      }),
    );
  });

  describe('getOrCreateState() TOCTOU race (private, exercised directly)', () => {
    // getOrCreateState() is called on every listForUser()/getActiveWorkspaceState()
    // call (i.e. every session/workspace load). It's private and its only
    // caller (listForUser) drags in unrelated membership/default-workspace
    // machinery, so it's exercised directly here to isolate the race fix
    // itself -- same reasoning as testing a private helper's caller-facing
    // behavior without re-mocking that helper's whole call graph.
    beforeEach(() => {
      statePendingInsertValues = null;
    });

    it('creates state via orIgnore()+read-back when none exists yet', async () => {
      stateRepository.findOne.mockResolvedValue(null);

      const state = await (service as any).getOrCreateState('user-1', 'workspace-1');

      expect(stateRepository.createQueryBuilder).toHaveBeenCalled();
      expect(state).toEqual(
        expect.objectContaining({ userId: 'user-1', activeWorkspaceId: 'workspace-1' }),
      );
    });

    it('returns the already-existing row on a losing concurrent create instead of a second duplicate', async () => {
      stateRepository.findOne.mockResolvedValue(null);
      const winningRow = {
        id: 'existing-state-id',
        userId: 'user-1',
        activeWorkspaceId: 'workspace-other',
        recentWorkspaceIds: ['workspace-other'],
      };
      stateInsertQueryBuilder.execute.mockImplementationOnce(async () => {
        // orIgnore() means execute() never actually stores our candidate.
      });
      stateRepository.findOneOrFail.mockResolvedValueOnce(winningRow);

      const state = await (service as any).getOrCreateState('user-1', 'workspace-1');

      expect(state).toBe(winningRow);
      expect(state.activeWorkspaceId).toBe('workspace-other');
    });

    it('does not attempt to create state that already exists', async () => {
      const existing = { id: 'state-1', userId: 'user-1', activeWorkspaceId: 'workspace-1' };
      stateRepository.findOne.mockResolvedValue(existing);

      const state = await (service as any).getOrCreateState('user-1', 'workspace-1');

      expect(state).toBe(existing);
      expect(stateRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
