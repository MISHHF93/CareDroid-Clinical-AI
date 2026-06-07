import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { Workspace, WorkspaceType } from '../workspaces/entities/workspace.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from './entities/organization-membership.entity';
import { TenantProvisioningService } from './tenant-provisioning.service';

describe('TenantProvisioningService', () => {
  let service: TenantProvisioningService;

  const organizationRepository = {
    save: jest.fn(async (row) => row),
  };
  const membershipRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (row) => row),
  };
  const profileRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (row) => row),
  };
  const workspaceRepository = {
    findOne: jest.fn(),
  };
  const platformAssetsService = {
    installPackForOrganization: jest.fn(),
    getRoleProfile: jest.fn(),
  };
  const workspacesService = {
    createWorkspace: jest.fn(),
  };

  const user = { id: 'user-1', role: UserRole.ADMIN } as User;
  const organization = {
    id: 'org-1',
    name: 'North Health',
    slug: 'north-health',
    organizationType: OrganizationType.HOSPITAL,
    country: 'US',
    branding: { displayName: 'North Health' },
    settings: {},
  } as unknown as Organization;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantProvisioningService,
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
        { provide: getRepositoryToken(OrganizationMembership), useValue: membershipRepository },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepository },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepository },
        { provide: PlatformAssetsService, useValue: platformAssetsService },
        { provide: WorkspacesService, useValue: workspacesService },
      ],
    }).compile();

    service = moduleRef.get(TenantProvisioningService);
    jest.clearAllMocks();
    organization.settings = {};
    membershipRepository.findOne.mockResolvedValue({
      userId: user.id,
      organizationId: organization.id,
      role: OrganizationMembershipRole.OWNER,
      roleProfileId: null,
    });
    profileRepository.findOne.mockResolvedValue({
      userId: user.id,
      organizationId: null,
      roleProfileId: null,
    });
    workspaceRepository.findOne.mockResolvedValue(null);
    platformAssetsService.installPackForOrganization.mockResolvedValue({});
    platformAssetsService.getRoleProfile.mockResolvedValue({
      id: 'administrator',
      defaultAiAgentId: 'agent-operations',
    });
    workspacesService.createWorkspace.mockImplementation(async (_user, dto) => ({
      id: `workspace-${dto.type}`,
      name: dto.name,
      type: dto.type,
    }));
  });

  it('provisions tenant, workspaces, roles, packs, agents, and dashboard defaults', async () => {
    const result = await service.provisionOrganization(user, organization);

    expect(result.workflow).toEqual([
      'organization-created',
      'tenant-created',
      'default-workspaces-created',
      'default-roles-created',
      'asset-packs-assigned',
      'ai-agents-assigned',
      'dashboard-configured',
    ]);
    expect(membershipRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ roleProfileId: 'administrator' }),
    );
    expect(profileRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', roleProfileId: 'administrator' }),
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(workspacesService.createWorkspace).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ type: WorkspaceType.EMERGENCY }),
      { organizationId: 'org-1' },
    );
    expect(organizationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          tenant: expect.objectContaining({
            tenantId: 'north-health',
            organizationId: 'org-1',
            status: 'active',
          }),
          enabledAgentIds: expect.arrayContaining(['agent-clinical', 'agent-operations']),
          dashboardLayout: expect.objectContaining({
            sections: expect.arrayContaining([
              'overview',
              'workspaces',
              'assets',
              'integrations',
              'success',
            ]),
          }),
          provisioning: expect.objectContaining({ status: 'configured' }),
          tenantProfile: expect.objectContaining({
            provisioningStatus: 'configured',
            enabledPackIds: expect.arrayContaining(['core-platform']),
          }),
        }),
      }),
    );
  });

  it('does not duplicate existing organization workspaces', async () => {
    workspaceRepository.findOne.mockResolvedValue({ id: 'workspace-emergency' });

    await service.provisionOrganization(user, organization, {
      workspaceSetups: [{ type: WorkspaceType.EMERGENCY, name: 'Emergency' }],
    });

    expect(workspacesService.createWorkspace).not.toHaveBeenCalled();
  });
});
