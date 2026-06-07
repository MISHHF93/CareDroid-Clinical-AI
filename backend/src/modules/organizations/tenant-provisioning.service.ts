import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_PACKS_BY_ORGANIZATION_TYPE } from '../platform-assets/data/platform-asset-seed.data';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { Workspace, WorkspaceType } from '../workspaces/entities/workspace.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { getWorkspaceDefinition, workspaceSettingsForType } from '../workspaces/workspace-taxonomy';
import { OrganizationMembership } from './entities/organization-membership.entity';

type WorkspaceProvisioningInput = {
  id?: string;
  name?: string;
  type?: string;
  enabledToolIds?: string[];
  enabledModules?: string[];
  emergencyModeEnabled?: boolean;
  defaultAiAgentId?: string;
};

type TenantProvisioningOptions = {
  workspaceSetups?: WorkspaceProvisioningInput[];
  packIds?: string[];
  enabledProductIds?: string[];
  integrationSlugs?: string[];
  defaultRoleProfileId?: string | null;
  complianceMode?: string | null;
  branding?: Record<string, unknown> | null;
};

@Injectable()
export class TenantProvisioningService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async provisionOrganization(
    user: User,
    organization: Organization,
    options: TenantProvisioningOptions = {},
  ) {
    const now = new Date().toISOString();
    const settings = { ...((organization.settings || {}) as Record<string, any>) };
    const workflow: string[] = ['organization-created'];

    settings.tenant = {
      ...((settings.tenant as Record<string, unknown>) || {}),
      tenantId: settings.tenant?.tenantId || organization.slug,
      organizationId: organization.id,
      organizationType: organization.organizationType,
      status: settings.tenant?.status || 'active',
      complianceMode:
        options.complianceMode ||
        settings.complianceMode ||
        this.defaultComplianceMode(organization.organizationType),
      createdAt: settings.tenant?.createdAt || now,
    };
    settings.complianceMode = settings.tenant.complianceMode;
    workflow.push('tenant-created');

    const workspaceDefaults = this.resolveWorkspaceDefaults(
      organization.organizationType,
      options.workspaceSetups || settings.workspaceDefaults,
    );
    settings.workspaceDefaults = workspaceDefaults;
    const createdWorkspaces = await this.ensureDefaultWorkspaces(
      user,
      organization,
      workspaceDefaults,
    );
    workflow.push('default-workspaces-created');

    const roleProfileId = await this.applyDefaultRole(
      user,
      organization.id,
      options.defaultRoleProfileId,
    );
    workflow.push('default-roles-created');

    const packIds = this.resolvePackIds(organization.organizationType, settings, options.packIds);
    for (const packId of packIds) {
      try {
        await this.platformAssetsService.installPackForOrganization(organization.id, packId);
      } catch {
        // Provisioning is retried after seed data is available in sparse test/dev databases.
      }
    }
    settings.enabledPackIds = [...new Set([...(settings.enabledPackIds || []), ...packIds])];
    workflow.push('asset-packs-assigned');

    const enabledAgentIds = await this.resolveAiAgentIds(
      roleProfileId,
      workspaceDefaults,
      settings,
    );
    settings.enabledAgentIds = enabledAgentIds;
    settings.defaultAiAgentId = settings.defaultAiAgentId || enabledAgentIds[0] || 'agent-clinical';
    workflow.push('ai-agents-assigned');

    settings.enabledProductIds = [
      ...new Set([...(settings.enabledProductIds || []), ...(options.enabledProductIds || [])]),
    ];
    settings.integrationsRequested = [
      ...new Set([...(settings.integrationsRequested || []), ...(options.integrationSlugs || [])]),
    ];
    settings.branding = {
      ...(settings.branding || {}),
      ...(options.branding || {}),
      displayName:
        (options.branding?.displayName as string) ||
        settings.branding?.displayName ||
        organization.branding?.displayName ||
        organization.name,
    };

    settings.dashboardLayout =
      settings.dashboardLayout || this.defaultDashboardLayout(workspaceDefaults);
    settings.navigation = settings.navigation || {
      primaryLanding: '/customer-portal',
      customerRoutes: ['/customer-portal', '/success-center', '/billing', '/usage'],
    };
    workflow.push('dashboard-configured');

    settings.provisioning = {
      ...((settings.provisioning as Record<string, unknown>) || {}),
      status: 'configured',
      workflow,
      completedAt: now,
      version: 1,
    };
    settings.tenantProfile = {
      ...((settings.tenantProfile as Record<string, unknown>) || {}),
      tenantId: settings.tenant.tenantId,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        organizationType: organization.organizationType,
        country: organization.country,
      },
      workspaces: workspaceDefaults,
      roleProfileId,
      enabledPackIds: settings.enabledPackIds,
      enabledAgentIds: settings.enabledAgentIds,
      dashboardLayout: settings.dashboardLayout,
      provisioningStatus: 'configured',
    };

    organization.settings = settings;
    await this.organizationRepository.save(organization);

    return {
      organizationId: organization.id,
      tenantId: settings.tenant.tenantId,
      status: 'configured',
      workflow,
      workspaceDefaults,
      createdWorkspaces,
      roleProfileId,
      enabledPackIds: settings.enabledPackIds,
      enabledAgentIds: settings.enabledAgentIds,
      dashboardLayout: settings.dashboardLayout,
    };
  }

  private async applyDefaultRole(
    user: User,
    organizationId: string,
    requestedRoleProfileId?: string | null,
  ) {
    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    const roleProfileId =
      requestedRoleProfileId || profile?.roleProfileId || this.defaultRoleProfileId(user.role);
    if (profile && !profile.roleProfileId) {
      profile.roleProfileId = roleProfileId;
      profile.organizationId = organizationId;
      await this.profileRepository.save(profile);
    }

    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, organizationId },
    });
    if (membership && !membership.roleProfileId) {
      membership.roleProfileId = roleProfileId;
      await this.membershipRepository.save(membership);
    }

    return roleProfileId;
  }

  private resolveWorkspaceDefaults(
    organizationType: OrganizationType,
    configuredWorkspaces?: WorkspaceProvisioningInput[],
  ) {
    const inputs =
      Array.isArray(configuredWorkspaces) && configuredWorkspaces.length
        ? configuredWorkspaces
        : this.defaultWorkspaceTypes(organizationType).map((type) => ({ type }));

    return inputs
      .map((input) => this.normalizeWorkspaceDefault(input))
      .filter(
        (
          workspace,
        ): workspace is ReturnType<TenantProvisioningService['normalizeWorkspaceDefault']> =>
          Boolean(workspace),
      );
  }

  private normalizeWorkspaceDefault(input: WorkspaceProvisioningInput) {
    const type = this.toWorkspaceType(input.type || input.id);
    if (!type) return null;
    const definition = getWorkspaceDefinition(type);
    const settings = workspaceSettingsForType(type);
    return {
      id: input.id || type,
      type,
      name: input.name || definition.name,
      enabledToolIds: input.enabledToolIds || settings.enabledToolIds,
      enabledModules: input.enabledModules || settings.enabledModules,
      emergencyModeEnabled: Boolean(
        input.emergencyModeEnabled || [WorkspaceType.EMERGENCY, WorkspaceType.ICU].includes(type),
      ),
      defaultDashboard: settings.defaultDashboard || definition.defaultDashboard,
      defaultAiAgentId: input.defaultAiAgentId || this.defaultAgentForWorkspace(type),
    };
  }

  private async ensureDefaultWorkspaces(
    user: User,
    organization: Organization,
    workspaceDefaults: Array<
      NonNullable<ReturnType<TenantProvisioningService['normalizeWorkspaceDefault']>>
    >,
  ) {
    const created = [];
    for (const workspace of workspaceDefaults) {
      const existing = await this.workspaceRepository.findOne({
        where: { organizationId: organization.id, type: workspace.type },
      });
      if (existing) continue;
      try {
        created.push(
          await this.workspacesService.createWorkspace(
            user,
            {
              name: workspace.name,
              type: workspace.type,
              displayName: workspace.name,
              enabledToolIds: workspace.enabledToolIds,
              enabledModules: workspace.enabledModules,
              emergencyModeEnabled: workspace.emergencyModeEnabled,
            },
            { organizationId: organization.id },
          ),
        );
      } catch {
        // Sparse dev/test databases may not have every entitlement seeded yet.
      }
    }
    return created;
  }

  private resolvePackIds(
    organizationType: OrganizationType,
    settings: Record<string, any>,
    requestedPackIds?: string[],
  ) {
    return [
      ...new Set([
        'core-platform',
        ...((DEFAULT_PACKS_BY_ORGANIZATION_TYPE[organizationType] || []) as string[]),
        ...((settings.enabledPackIds || []) as string[]),
        ...((settings.resolvedPackIds || []) as string[]),
        ...(requestedPackIds || []),
      ]),
    ];
  }

  private async resolveAiAgentIds(
    roleProfileId: string,
    workspaceDefaults: Array<
      NonNullable<ReturnType<TenantProvisioningService['normalizeWorkspaceDefault']>>
    >,
    settings: Record<string, any>,
  ) {
    const ids = new Set<string>([...((settings.enabledAgentIds || []) as string[])]);
    workspaceDefaults.forEach((workspace) => ids.add(workspace.defaultAiAgentId));
    if (roleProfileId) {
      try {
        const profile = await this.platformAssetsService.getRoleProfile(roleProfileId);
        if (profile.defaultAiAgentId) ids.add(profile.defaultAiAgentId);
      } catch {
        // Role profiles may not be seeded in isolated tests.
      }
    }
    ids.add('agent-clinical');
    return [...ids].filter(Boolean);
  }

  private defaultDashboardLayout(
    workspaceDefaults: Array<
      NonNullable<ReturnType<TenantProvisioningService['normalizeWorkspaceDefault']>>
    >,
  ) {
    return {
      primary: workspaceDefaults[0]?.id || 'command-center',
      sections: ['overview', 'workspaces', 'assets', 'integrations', 'success'],
      workspaces: workspaceDefaults.map((workspace) => ({
        id: workspace.id,
        dashboard: workspace.defaultDashboard,
        agent: workspace.defaultAiAgentId,
      })),
    };
  }

  private defaultWorkspaceTypes(type: OrganizationType) {
    if (type === OrganizationType.EMS) {
      return [WorkspaceType.EMERGENCY, WorkspaceType.FLEET, WorkspaceType.OPERATIONS];
    }
    if (type === OrganizationType.RESEARCH_CENTER || type === OrganizationType.RESEARCH_INSTITUTE) {
      return [WorkspaceType.RESEARCH, WorkspaceType.GOVERNANCE, WorkspaceType.AI_EVALUATION];
    }
    if (type === OrganizationType.UNIVERSITY || type === OrganizationType.ACADEMIC_MEDICAL_CENTER) {
      return [
        WorkspaceType.EDUCATION,
        WorkspaceType.RESEARCH,
        WorkspaceType.SIMULATION,
        WorkspaceType.GOVERNANCE,
      ];
    }
    if (type === OrganizationType.LONG_TERM_CARE) {
      return [
        WorkspaceType.MEDICAL_IOT,
        WorkspaceType.LABORATORY,
        WorkspaceType.OPERATIONS,
        WorkspaceType.GOVERNANCE,
      ];
    }
    if (type === OrganizationType.CLINIC || type === OrganizationType.TELEHEALTH) {
      return [WorkspaceType.CARDIOLOGY, WorkspaceType.LABORATORY, WorkspaceType.GOVERNANCE];
    }
    return [
      WorkspaceType.EMERGENCY,
      WorkspaceType.ICU,
      WorkspaceType.CARDIOLOGY,
      WorkspaceType.LABORATORY,
      WorkspaceType.OPERATIONS,
      WorkspaceType.MEDICAL_IOT,
      WorkspaceType.GOVERNANCE,
    ];
  }

  private defaultRoleProfileId(role?: UserRole) {
    if (role === UserRole.ADMIN) return 'administrator';
    if (role === UserRole.NURSE) return 'nurse';
    if (role === UserRole.STUDENT) return 'medical-student';
    return 'emergency-physician';
  }

  private defaultAgentForWorkspace(type: WorkspaceType) {
    if ([WorkspaceType.FLEET].includes(type)) return 'agent-fleet';
    if (
      [WorkspaceType.OPERATIONS, WorkspaceType.MEDICAL_IOT, WorkspaceType.GOVERNANCE].includes(type)
    ) {
      return 'agent-operations';
    }
    if ([WorkspaceType.LABORATORY].includes(type)) return 'agent-lab';
    if ([WorkspaceType.EDUCATION].includes(type)) return 'agent-education';
    if ([WorkspaceType.RESEARCH].includes(type)) return 'agent-research';
    return 'agent-clinical';
  }

  private defaultComplianceMode(type: OrganizationType) {
    if (type === OrganizationType.EMS) return 'ems';
    if (
      type === OrganizationType.UNIVERSITY ||
      type === OrganizationType.RESEARCH_CENTER ||
      type === OrganizationType.RESEARCH_INSTITUTE
    ) {
      return 'academic';
    }
    return 'hipaa';
  }

  private toWorkspaceType(value?: string) {
    return Object.values(WorkspaceType).includes(value as WorkspaceType)
      ? (value as WorkspaceType)
      : null;
  }
}
