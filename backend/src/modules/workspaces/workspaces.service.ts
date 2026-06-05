import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
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

const WORKSPACE_TOOL_PRESETS: Record<WorkspaceType, string[]> = {
  [WorkspaceType.PERSONAL]: [
    'calculators',
    'drug-check',
    'lab-interp',
    'protocols',
    'diagnosis-assistant',
  ],
  [WorkspaceType.HOSPITAL]: [
    'calculators',
    'drug-check',
    'lab-interp',
    'protocols',
    'hospital-map',
    'medical-iot',
  ],
  [WorkspaceType.EMERGENCY]: [
    'emergency-protocols',
    'trauma-score',
    'sofa-score',
    'hospital-map',
    'fleet-live-map',
  ],
  [WorkspaceType.FLEET]: [
    'fleet-dashboard',
    'fleet-live-map',
    'route-optimizer',
    'predictive-maintenance',
  ],
  [WorkspaceType.RESEARCH]: [
    'guideline-rag',
    'ai-explainability',
    'clinical-audit',
    'differential-ai',
  ],
  [WorkspaceType.ADMIN]: ['audit-logs', 'analytics', 'team-management', 'system-config'],
};

const WORKSPACE_MODULE_PRESETS: Record<WorkspaceType, string[]> = {
  [WorkspaceType.PERSONAL]: ['dashboard', 'assistant', 'tools', 'calculators'],
  [WorkspaceType.HOSPITAL]: ['dashboard', 'patients', 'maps', 'medical-iot', 'notifications'],
  [WorkspaceType.EMERGENCY]: ['dashboard', 'alerts', 'fleet', 'maps', 'audit'],
  [WorkspaceType.FLEET]: ['fleet', 'live-tracking', 'operations'],
  [WorkspaceType.RESEARCH]: ['rag', 'research', 'assistant'],
  [WorkspaceType.ADMIN]: ['admin', 'audit', 'analytics', 'settings'],
};

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
    const workspace = this.workspaceRepository.create({
      type: dto.type,
      name: dto.name.trim(),
      slug,
      organizationId: options.organizationId || null,
      ownerUserId: user.id,
      branding: {
        displayName: dto.displayName?.trim() || dto.name.trim(),
      },
      settings: {
        defaultDashboard: this.defaultDashboardForType(dto.type),
        enabledToolIds: dto.enabledToolIds || WORKSPACE_TOOL_PRESETS[dto.type] || [],
        enabledModules: dto.enabledModules || WORKSPACE_MODULE_PRESETS[dto.type] || [],
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

  async updateTools(user: User, workspaceId: string, enabledToolIds: string[]) {
    await this.requireManager(user, workspaceId);
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    workspace.settings = {
      ...(workspace.settings || {}),
      enabledToolIds: [...new Set(enabledToolIds || [])],
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
    const existing = await this.membershipRepository.count({
      where: { userId: user.id, status: WorkspaceMembershipStatus.ACTIVE },
    });
    if (existing > 0) return;

    const defaults = this.defaultWorkspaceDefinitions(user);
    for (const definition of defaults) {
      const workspace = this.workspaceRepository.create({
        ...definition,
        slug: await this.uniqueSlug(`${definition.type}-${user.id}`),
        ownerUserId: user.id,
      });
      const savedWorkspace = await this.workspaceRepository.save(workspace);
      await this.createMembership(user, savedWorkspace, definition.membershipRole);
    }
  }

  private defaultWorkspaceDefinitions(user: User) {
    const roleWorkspaceRole = this.defaultMembershipRole(user.role);
    const definitions: Array<Partial<Workspace> & { membershipRole: WorkspaceMembershipRole }> = [
      {
        type: WorkspaceType.PERSONAL,
        name: 'Personal Clinical Workspace',
        branding: { displayName: 'Personal Clinical Workspace' },
        settings: this.settingsForType(WorkspaceType.PERSONAL),
        membershipRole: WorkspaceMembershipRole.OWNER,
      },
      {
        type: WorkspaceType.HOSPITAL,
        name: 'Hospital Operations Workspace',
        branding: { displayName: 'Hospital Operations' },
        settings: this.settingsForType(WorkspaceType.HOSPITAL),
        membershipRole: roleWorkspaceRole,
      },
      {
        type: WorkspaceType.EMERGENCY,
        name: 'Emergency Response Workspace',
        branding: { displayName: 'Emergency Response' },
        settings: this.settingsForType(WorkspaceType.EMERGENCY),
        membershipRole: roleWorkspaceRole,
      },
      {
        type: WorkspaceType.FLEET,
        name: 'Fleet Command Workspace',
        branding: { displayName: 'Fleet Command' },
        settings: this.settingsForType(WorkspaceType.FLEET),
        membershipRole:
          user.role === UserRole.ADMIN
            ? WorkspaceMembershipRole.ADMIN
            : WorkspaceMembershipRole.DISPATCHER,
      },
      {
        type: WorkspaceType.RESEARCH,
        name: 'Research Workspace',
        branding: { displayName: 'Research Workspace' },
        settings: this.settingsForType(WorkspaceType.RESEARCH),
        membershipRole: WorkspaceMembershipRole.RESEARCHER,
      },
    ];

    if (user.role === UserRole.ADMIN) {
      definitions.push({
        type: WorkspaceType.ADMIN,
        name: 'Admin Workspace',
        branding: { displayName: 'Admin Workspace' },
        settings: this.settingsForType(WorkspaceType.ADMIN),
        membershipRole: WorkspaceMembershipRole.ADMIN,
      });
    }

    return definitions;
  }

  private async createMembership(user: User, workspace: Workspace, role: WorkspaceMembershipRole) {
    const membership = this.membershipRepository.create({
      userId: user.id,
      workspaceId: workspace.id,
      role,
      status: WorkspaceMembershipStatus.ACTIVE,
      permissions: this.permissionsService.getWorkspaceRolePermissions(role),
      teams: [],
      department: user.profile?.institution || null,
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
        activeWorkspaceId: fallbackWorkspaceId || null,
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

  private settingsForType(type: WorkspaceType) {
    return {
      defaultDashboard: this.defaultDashboardForType(type),
      enabledToolIds: WORKSPACE_TOOL_PRESETS[type] || [],
      enabledModules: WORKSPACE_MODULE_PRESETS[type] || [],
      emergencyModeEnabled: type === WorkspaceType.EMERGENCY,
    };
  }

  private defaultDashboardForType(type: WorkspaceType) {
    const dashboards: Record<WorkspaceType, string> = {
      [WorkspaceType.PERSONAL]: 'command',
      [WorkspaceType.HOSPITAL]: 'operations',
      [WorkspaceType.EMERGENCY]: 'operations',
      [WorkspaceType.FLEET]: 'fleet',
      [WorkspaceType.RESEARCH]: 'research',
      [WorkspaceType.ADMIN]: 'admin',
    };
    return dashboards[type] || 'command';
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

  private serializeWorkspace(workspace: Workspace) {
    return {
      id: workspace.id,
      type: workspace.type,
      name: workspace.name,
      slug: workspace.slug,
      organizationId: workspace.organizationId,
      parentWorkspaceId: workspace.parentWorkspaceId,
      branding: workspace.branding || { displayName: workspace.name },
      settings: workspace.settings || this.settingsForType(workspace.type),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
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
