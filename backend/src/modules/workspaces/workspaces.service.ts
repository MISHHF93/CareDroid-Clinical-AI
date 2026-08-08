import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { LEGACY_TOOL_ID_ALIASES } from '../platform-assets/data/platform-asset-seed.data';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkspacePermissionsService } from '../permissions/workspace-permissions.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import {
  WorkspaceInvitation,
  WorkspaceInvitationStatus,
} from './entities/workspace-invitation.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipRole,
  WorkspaceMembershipStatus,
} from './entities/workspace-membership.entity';
import { Workspace, WorkspaceType } from './entities/workspace.entity';
import { UserWorkspaceState } from './entities/user-workspace-state.entity';
import {
  REQUESTED_WORKSPACE_TYPES,
  getWorkspaceDefinition,
  workspaceRouteKey,
  workspaceSettingsForType,
} from './workspace-taxonomy';
import { WorkspaceSchema } from './workspace.contracts';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private readonly membershipRepository: Repository<WorkspaceMembership>,
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(UserWorkspaceState)
    private readonly stateRepository: Repository<UserWorkspaceState>,
    private readonly permissionsService: WorkspacePermissionsService,
    private readonly auditService: AuditService,
    private readonly platformAssetsService: PlatformAssetsService,
  ) {}

  async listForUser(user: User) {
    await this.ensureDefaultWorkspaces(user);
    const memberships = await this.membershipRepository.find({
      where: { userId: user.id, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
      order: { createdAt: 'ASC' },
    });
    const state = await this.getOrCreateState(user.id, memberships[0]?.workspaceId);
    const activeMembership =
      memberships.find((membership) => membership.workspaceId === state.activeWorkspaceId) ||
      memberships[0];

    if (activeMembership && state.activeWorkspaceId !== activeMembership.workspaceId) {
      state.activeWorkspaceId = activeMembership.workspaceId;
      await this.stateRepository.save(state);
    }

    return {
      workspaces: memberships.map((membership) => this.serializeWorkspace(membership.workspace)),
      memberships: memberships.map((membership) => this.serializeMembership(membership)),
      activeWorkspaceId: activeMembership?.workspaceId || null,
      recentWorkspaceIds: state.recentWorkspaceIds || [],
      effectivePermissions: activeMembership
        ? this.permissionsService.getEffectivePermissions({
            userRole: user.role,
            membershipRole: activeMembership.role,
            explicitPermissions: activeMembership.permissions || [],
          })
        : [],
      linkedTeams:
        activeMembership?.teams?.map((team) => ({
          teamId: team,
          name: team,
          role: activeMembership.role,
        })) || [],
    };
  }

  async getActiveWorkspaceState(user: User) {
    const identity = await this.listForUser(user);
    const activeWorkspace = identity.workspaces.find(
      (workspace) => workspace.id === identity.activeWorkspaceId,
    );
    return { ...identity, activeWorkspace };
  }

  async setActiveWorkspace(
    user: User,
    workspaceId: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, workspaceId, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
    });
    if (!membership) {
      throw new ForbiddenException('You are not an active member of this workspace.');
    }

    const state = await this.getOrCreateState(user.id, workspaceId);
    const recentWorkspaceIds = [
      workspaceId,
      ...(state.recentWorkspaceIds || []).filter((id) => id !== workspaceId),
    ].slice(0, 6);
    state.activeWorkspaceId = workspaceId;
    state.recentWorkspaceIds = recentWorkspaceIds;
    membership.lastAccessedAt = new Date();
    await this.stateRepository.save(state);
    await this.membershipRepository.save(membership);

    await this.auditService.log({
      userId: user.id,
      workspaceId,
      organizationId: membership.workspace?.organizationId,
      action: AuditAction.SECURITY_EVENT,
      resource: `workspace/${workspaceId}`,
      ipAddress,
      userAgent,
      metadata: {
        eventType: 'workspace_switch',
        workspaceId,
        workspaceType: membership.workspace?.type,
      },
    });

    return this.getActiveWorkspaceState(user);
  }

  async createWorkspace(
    user: User,
    dto: CreateWorkspaceDto,
    options: { organizationId?: string | null } = {},
  ) {
    const slug = await this.uniqueSlug(`${dto.type}-${dto.name}-${user.id}`);
    const enabledToolIds = await this.validateEnabledToolIdsForOrganization(
      options.organizationId || null,
      dto.enabledToolIds || workspaceSettingsForType(dto.type).enabledToolIds,
    );
    const defaults = workspaceSettingsForType(dto.type);
    const workspace = this.workspaceRepository.create({
      type: dto.type,
      name: dto.name.trim(),
      slug,
      organizationId: options.organizationId || undefined,
      ownerUserId: user.id,
      branding: {
        displayName: dto.displayName?.trim() || dto.name.trim(),
      },
      settings: {
        ...defaults,
        enabledToolIds,
        enabledModules: dto.enabledModules || defaults.enabledModules,
        emergencyModeEnabled: Boolean(dto.emergencyModeEnabled),
      },
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);
    await this.createMembership(user, savedWorkspace, WorkspaceMembershipRole.OWNER);
    return this.serializeWorkspace(savedWorkspace);
  }

  async getWorkspaceForUser(user: User, workspaceId: string) {
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, workspaceId, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
    });
    if (!membership) {
      throw new NotFoundException('Workspace not found.');
    }
    return {
      workspace: this.serializeWorkspace(membership.workspace),
      membership: this.serializeMembership(membership),
      effectivePermissions: this.permissionsService.getEffectivePermissions({
        userRole: user.role,
        membershipRole: membership.role,
        explicitPermissions: membership.permissions || [],
      }),
    };
  }

  async listMembers(user: User, workspaceId: string) {
    await this.requireManager(user, workspaceId);
    const members = await this.membershipRepository.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
    return { members: members.map((member) => this.serializeMembership(member)) };
  }

  async inviteMember(user: User, workspaceId: string, dto: InviteWorkspaceMemberDto) {
    await this.requireManager(user, workspaceId);
    const invitation = this.invitationRepository.create({
      workspaceId,
      email: dto.email.toLowerCase().trim(),
      role: dto.role,
      invitedByUserId: user.id,
      status: WorkspaceInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return this.invitationRepository.save(invitation);
  }

  async previewInvitation(token: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id: token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new NotFoundException('Invitation is no longer valid.');
    }
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      invitation.status = WorkspaceInvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new NotFoundException('Invitation has expired.');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: invitation.workspaceId },
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      workspaceName: workspace?.name || 'Workspace',
      workspace: workspace ? this.serializeWorkspace(workspace) : null,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(user: User, token: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id: token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid.');
    }
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      invitation.status = WorkspaceInvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired.');
    }

    const normalizedUserEmail = String(user.email || '')
      .toLowerCase()
      .trim();
    if (invitation.email !== normalizedUserEmail) {
      throw new ForbiddenException('This invitation was sent to a different email address.');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: invitation.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    const membershipRole =
      Object.values(WorkspaceMembershipRole).find((role) => role === invitation.role) ||
      WorkspaceMembershipRole.VIEWER;

    const existing = await this.membershipRepository.findOne({
      where: { userId: user.id, workspaceId: invitation.workspaceId },
    });
    if (!existing) {
      await this.createMembership(user, workspace, membershipRole);
    } else if (existing.status !== WorkspaceMembershipStatus.ACTIVE) {
      existing.status = WorkspaceMembershipStatus.ACTIVE;
      existing.role = membershipRole;
      await this.membershipRepository.save(existing);
    }

    invitation.status = WorkspaceInvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    return this.getActiveWorkspaceState(user);
  }

  async updateTools(user: User, workspaceId: string, enabledToolIds: string[]) {
    await this.requireManager(user, workspaceId);
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    const validatedToolIds = await this.validateEnabledToolIdsForOrganization(
      workspace.organizationId,
      enabledToolIds || [],
    );
    workspace.settings = {
      ...(workspace.settings || {}),
      enabledToolIds: validatedToolIds,
    };
    const saved = await this.workspaceRepository.save(workspace);
    return { workspace: this.serializeWorkspace(saved) };
  }

  async getTools(user: User, workspaceId: string) {
    const { workspace, effectivePermissions } = await this.getWorkspaceForUser(user, workspaceId);
    return {
      enabledToolIds: workspace.settings?.enabledToolIds || [],
      effectivePermissions,
    };
  }

  private async ensureDefaultWorkspaces(user: User) {
    const memberships = await this.membershipRepository.find({
      where: { userId: user.id, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
    });

    const defaults = this.defaultWorkspaceDefinitions(user);
    const existingTypes = new Set(
      memberships.map((membership) => membership.workspace?.type).filter(Boolean),
    );
    const missingDefinitions = defaults.filter(
      (definition) => !definition.type || !existingTypes.has(definition.type),
    );
    // Only new users hit this (existing users' defaults are already in existingTypes
    // above), but listForUser is a hot endpoint, so a first-time user's handful of
    // missing workspaces are created concurrently rather than one sequential
    // slug-check + save + membership-insert chain at a time. Safe to parallelize:
    // each definition's slug base includes its own (distinct) workspace type, so
    // there's no collision risk between iterations of this same batch.
    await Promise.all(
      missingDefinitions.map(async (definition) => {
        const workspace = this.workspaceRepository.create({
          ...definition,
          slug: await this.uniqueSlug(`${definition.type}-${user.id}`),
          ownerUserId: user.id,
        });
        const savedWorkspace = await this.workspaceRepository.save(workspace);
        await this.createMembership(user, savedWorkspace, definition.membershipRole);
      }),
    );
  }

  private defaultWorkspaceDefinitions(user: User) {
    const roleWorkspaceRole = this.defaultMembershipRole(user.role);
    return REQUESTED_WORKSPACE_TYPES.map((type) => {
      const definition = getWorkspaceDefinition(type);
      return {
        type,
        name: definition.name,
        branding: {
          displayName: definition.displayName,
          description: definition.description,
        },
        settings: this.settingsForType(type),
        membershipRole:
          definition.preferredMembershipRole ||
          (type === WorkspaceType.FLEET && user.role !== UserRole.ADMIN
            ? WorkspaceMembershipRole.DISPATCHER
            : roleWorkspaceRole),
      };
    });
  }

  private async createMembership(user: User, workspace: Workspace, role: WorkspaceMembershipRole) {
    const membership = this.membershipRepository.create({
      userId: user.id,
      workspaceId: workspace.id,
      role,
      status: WorkspaceMembershipStatus.ACTIVE,
      permissions: this.permissionsService.getWorkspaceRolePermissions(role),
      teams: [],
      department: user.profile?.institution || undefined,
      joinedAt: new Date(),
      lastAccessedAt: new Date(),
    });
    return this.membershipRepository.save(membership);
  }

  private async getOrCreateState(userId: string, fallbackWorkspaceId?: string) {
    let state = await this.stateRepository.findOne({ where: { userId } });
    if (!state) {
      state = this.stateRepository.create({
        userId,
        activeWorkspaceId: fallbackWorkspaceId || undefined,
        recentWorkspaceIds: fallbackWorkspaceId ? [fallbackWorkspaceId] : [],
      });
      state = await this.stateRepository.save(state);
    }
    return state;
  }

  private async requireManager(user: User, workspaceId: string) {
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, workspaceId },
    });
    if (!membership || membership.status !== WorkspaceMembershipStatus.ACTIVE) {
      throw new ForbiddenException('Workspace membership is required.');
    }
    const permissions = this.permissionsService.getEffectivePermissions({
      userRole: user.role,
      membershipRole: membership.role,
      explicitPermissions: membership.permissions || [],
    });
    if (!permissions.includes('MANAGE_WORKSPACE') && !permissions.includes('MANAGE_USERS')) {
      throw new ForbiddenException('Workspace management permission is required.');
    }
    return membership;
  }

  private async validateEnabledToolIdsForOrganization(
    organizationId: string | null | undefined,
    enabledToolIds: string[],
  ) {
    const requestedToolIds = [...new Set(enabledToolIds || [])];
    if (!organizationId || !this.platformAssetsService.isStrictSaasEntitlementsEnabled()) {
      return requestedToolIds;
    }

    const entitledAssetIds = new Set(
      await this.platformAssetsService.resolveEntitledAssetIds({
        organizationId,
        workspaceEnabledToolIds: requestedToolIds,
        strictEntitlements: true,
      }),
    );
    const deniedToolIds = requestedToolIds.filter((toolId) => {
      if (entitledAssetIds.has(toolId)) return false;
      const aliases = LEGACY_TOOL_ID_ALIASES[toolId] || [];
      return !aliases.some((assetId) => entitledAssetIds.has(assetId));
    });

    if (deniedToolIds.length) {
      throw new ForbiddenException(
        `Workspace tools outside organization entitlements: ${deniedToolIds.join(', ')}`,
      );
    }
    return requestedToolIds;
  }

  private settingsForType(type: WorkspaceType) {
    return workspaceSettingsForType(type);
  }

  private defaultDashboardForType(type: WorkspaceType) {
    return workspaceSettingsForType(type).defaultDashboard || 'command';
  }

  private defaultMembershipRole(userRole?: UserRole) {
    if (userRole === UserRole.ADMIN) return WorkspaceMembershipRole.ADMIN;
    if (userRole === UserRole.NURSE) return WorkspaceMembershipRole.NURSE;
    if (userRole === UserRole.PHYSICIAN) return WorkspaceMembershipRole.CLINICIAN;
    return WorkspaceMembershipRole.VIEWER;
  }

  private async uniqueSlug(value: string) {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
    let slug = base || `workspace-${Date.now()}`;
    let suffix = 1;
    while (await this.workspaceRepository.findOne({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`.slice(0, 160);
    }
    return slug;
  }

  // Canonical serializer for the Workspace entity (backend/src/modules/workspaces/
  // workspace.contracts.ts). Previously omitted workspaceKey/routePath/description/
  // assistantContext/defaultDashboard/shortcuts entirely -- a real, confirmed
  // structural disagreement with WorkspaceContextService.buildContext()'s shape
  // for the exact same entity. Both now produce the same fields for the same
  // concept. Validated against WorkspaceSchema so a future edit that reintroduces
  // that drift fails fast (a thrown ZodError) instead of silently shipping.
  private serializeWorkspace(workspace: Workspace) {
    const settings = workspace.settings || this.settingsForType(workspace.type);
    const workspaceKey = settings.workspaceKey || workspaceRouteKey(workspace.type);
    const payload = {
      id: workspace.id,
      workspaceKey,
      type: workspace.type,
      name: workspace.name,
      slug: workspace.slug,
      organizationId: workspace.organizationId,
      parentWorkspaceId: workspace.parentWorkspaceId,
      routePath: `/workspace/${workspaceKey}`,
      description: workspace.branding?.description || settings.workspaceProfile?.description || '',
      assistantContext: settings.assistantContext || '',
      defaultDashboard: settings.defaultDashboard,
      branding: workspace.branding || { displayName: workspace.name },
      settings,
      enabledToolIds: settings.enabledToolIds || [],
      enabledModules: settings.enabledModules || [],
      shortcuts: settings.shortcuts || [],
      workspaceProfile: settings.workspaceProfile,
      defaultDashboardWidgets: settings.workspaceProfile?.defaultDashboardWidgets || [],
      defaultFilters: settings.workspaceProfile?.defaultFilters || {},
      restrictedAssets: settings.workspaceProfile?.restrictedAssets || [],
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
    return WorkspaceSchema.parse(payload);
  }

  private serializeMembership(membership: WorkspaceMembership) {
    return {
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
      permissions: membership.permissions || [],
      teams: membership.teams || [],
      department: membership.department,
      status: membership.status,
      joinedAt: membership.joinedAt,
      lastAccessedAt: membership.lastAccessedAt,
    };
  }
}
