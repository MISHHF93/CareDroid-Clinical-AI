import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserWorkspaceState } from '../workspaces/entities/user-workspace-state.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipRole,
  WorkspaceMembershipStatus,
} from '../workspaces/entities/workspace-membership.entity';
import { Workspace, WorkspaceType } from '../workspaces/entities/workspace.entity';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  const profileRepository = { findOne: jest.fn() };
  const organizationRepository = { findOne: jest.fn() };
  const organizationMembershipRepository = { findOne: jest.fn() };
  const workspaceRepository = { findOne: jest.fn() };
  const workspaceMembershipRepository = { findOne: jest.fn() };
  const workspaceStateRepository = { findOne: jest.fn() };
  const subscriptionRepository = { findOne: jest.fn() };

  const user = {
    id: 'user-1',
    role: UserRole.PHYSICIAN,
  } as User;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantContextService,
        { provide: getRepositoryToken(UserProfile), useValue: profileRepository },
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
        {
          provide: getRepositoryToken(OrganizationMembership),
          useValue: organizationMembershipRepository,
        },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepository },
        { provide: getRepositoryToken(WorkspaceMembership), useValue: workspaceMembershipRepository },
        { provide: getRepositoryToken(UserWorkspaceState), useValue: workspaceStateRepository },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepository },
      ],
    }).compile();

    service = moduleRef.get(TenantContextService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    profileRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-1',
    });
    organizationRepository.findOne.mockResolvedValue({
      id: 'org-1',
      name: 'Demo Hospital',
    });
    organizationMembershipRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'owner',
    });
    workspaceStateRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
    });
    workspaceMembershipRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      role: WorkspaceMembershipRole.CLINICIAN,
      status: WorkspaceMembershipStatus.ACTIVE,
      permissions: ['USE_AI_CHAT'],
      workspace: {
        id: 'workspace-1',
        name: 'Clinical Workspace',
        type: WorkspaceType.HOSPITAL,
        organizationId: 'org-1',
      },
    });
    subscriptionRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      tier: SubscriptionTier.INSTITUTIONAL,
    });
  });

  it('resolves canonical tenant context from profile, active workspace, and subscription', async () => {
    const context = await service.resolveForRequest(user, {});

    expect(context).toMatchObject({
      organizationId: 'org-1',
      organizationName: 'Demo Hospital',
      workspaceId: 'workspace-1',
      workspaceName: 'Clinical Workspace',
      userId: 'user-1',
      role: UserRole.PHYSICIAN,
      subscriptionPlan: SubscriptionTier.INSTITUTIONAL,
      organizationRole: 'owner',
      workspaceRole: WorkspaceMembershipRole.CLINICIAN,
      workspacePermissions: ['USE_AI_CHAT'],
    });
  });

  it('rejects tenant headers that do not match authenticated user identity', async () => {
    await expect(
      service.resolveForRequest(user, {
        'x-caredroid-user-id': 'other-user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a workspace outside the resolved organization', async () => {
    workspaceMembershipRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      role: WorkspaceMembershipRole.CLINICIAN,
      status: WorkspaceMembershipStatus.ACTIVE,
      permissions: [],
      workspace: {
        id: 'workspace-1',
        name: 'Other Workspace',
        organizationId: 'org-2',
      },
    });

    await expect(service.resolveForRequest(user, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
