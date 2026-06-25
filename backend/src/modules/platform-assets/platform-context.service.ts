import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../product-catalog/entities/product.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserWorkspaceState } from '../workspaces/entities/user-workspace-state.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipStatus,
} from '../workspaces/entities/workspace-membership.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { PlatformAssetsService } from './platform-assets.service';
import { User } from '../users/entities/user.entity';
import { EntitlementService } from './entitlement.service';
import { normalizeLifecycleState } from '../subscriptions/subscription-lifecycle.engine';
import { resolveSaasProfileAllowedPacks } from '../user-profile/saas-profile-rbac.config';

@Injectable()
export class PlatformContextService {
  constructor(
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly entitlementService: EntitlementService,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly organizationMembershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(WorkspaceMembership)
    private readonly workspaceMembershipRepository: Repository<WorkspaceMembership>,
    @InjectRepository(UserWorkspaceState)
    private readonly workspaceStateRepository: Repository<UserWorkspaceState>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getContextForUser(user: User) {
    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    let organization: Organization | null = null;
    let membership: OrganizationMembership | null = null;

    if (profile?.organizationId) {
      organization = await this.organizationRepository.findOne({
        where: { id: profile.organizationId },
      });
      membership = await this.organizationMembershipRepository.findOne({
        where: { organizationId: profile.organizationId, userId: user.id },
      });
    }

    const workspaceState = await this.listWorkspaceStateForUser(user);
    const activeWorkspace = workspaceState.workspaces.find(
      (w: { id: string }) => w.id === workspaceState.activeWorkspaceId,
    );
    const enabledToolIds = activeWorkspace?.settings?.enabledToolIds || [];
    const settings = (organization?.settings || {}) as Record<string, any>;
    const assignedProductIds = Array.isArray(settings.enabledProductIds)
      ? settings.enabledProductIds
      : [];
    const assignedProducts = assignedProductIds.length
      ? await this.productRepository.find({ where: { id: In(assignedProductIds) } })
      : [];

    const entitledPackIds = organization
      ? (await this.platformAssetsService.getOrganizationEntitlements(organization.id)).map(
          (row) => row.packId,
        )
      : [];

    const entitledAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
      organizationId: organization?.id,
      roleProfileId: profile?.roleProfileId,
      workspaceEnabledToolIds: enabledToolIds,
    });

    const roleProfile = profile?.roleProfileId
      ? await this.platformAssetsService.getRoleProfile(profile.roleProfileId).catch(() => null)
      : null;

    const packs = organization
      ? await this.platformAssetsService.listPacks({
          organizationType: organization.organizationType,
          publishedOnly: true,
        })
      : await this.platformAssetsService.listPacks({ publishedOnly: true });

    const allAssets = await this.platformAssetsService.listAssets({});
    const accessDecisions = Object.fromEntries(
      allAssets.map((asset) => [
        asset.id,
        this.entitlementService.resolveDecisionFromContext({
          assetId: asset.id,
          asset,
          organization,
          organizationId: organization?.id,
          workspaceId: activeWorkspace?.id,
          userRole: membership?.role,
          subscriptionPlan: user.subscription?.tier,
          subscriptionLifecycleState: normalizeLifecycleState(user.subscription),
          entitledAssetIds,
          entitledPackIds,
          strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
        }),
      ]),
    );

    const aiAgents = allAssets.filter((asset) => asset.assetType === 'ai_agent');
    const entitledAgents = aiAgents.filter(
      (agent) => accessDecisions[agent.id]?.isLaunchable && entitledAssetIds.includes(agent.id),
    );

    const pilotStrict =
      settings.pilotStrictSaasEntitlements === true || settings.strictSaasEntitlements === true;

    return {
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            organizationType: organization.organizationType,
            branding: organization.branding,
            settings: organization.settings,
          }
        : null,
      assignedProductIds,
      assignedProducts: assignedProducts.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        productType: product.productType,
        packIds: product.packIds || [],
      })),
      assignedProductPackIds: Array.isArray(settings.assignedProductPackIds)
        ? settings.assignedProductPackIds
        : [],
      resolvedPackIds: Array.isArray(settings.resolvedPackIds) ? settings.resolvedPackIds : [],
      navigation: settings.navigation || {},
      branding: organization?.branding || settings.branding || {},
      dashboardLayout: settings.dashboardLayout || {},
      workspaceDefaults: Array.isArray(settings.workspaceDefaults)
        ? settings.workspaceDefaults
        : [],
      membership: membership
        ? {
            role: membership.role,
            roleProfileId: membership.roleProfileId,
          }
        : null,
      roleProfile: roleProfile
        ? {
            ...roleProfile,
            allowedPacks: resolveSaasProfileAllowedPacks(profile?.roleProfileId),
          }
        : null,
      entitledPackIds,
      entitledAssetIds,
      assetAccessDecisions: accessDecisions,
      entitledPacks: packs.filter((pack) => entitledPackIds.includes(pack.id)),
      availablePacks: packs,
      aiAgents: entitledAgents,
      defaultAiAgentId: roleProfile?.defaultAiAgentId || entitledAgents[0]?.id || 'agent-clinical',
      workspace: workspaceState,
      legacyToolAliases: enabledToolIds,
      strictSaasEntitlements:
        pilotStrict || this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
    };
  }

  private async listWorkspaceStateForUser(user: User) {
    const memberships = await this.workspaceMembershipRepository.find({
      where: { userId: user.id, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
      order: { createdAt: 'ASC' },
    });
    const state = await this.workspaceStateRepository.findOne({ where: { userId: user.id } });
    const activeMembership =
      memberships.find(
        (workspaceMembership) => workspaceMembership.workspaceId === state?.activeWorkspaceId,
      ) || memberships[0];

    return {
      workspaces: memberships
        .map((workspaceMembership) => workspaceMembership.workspace)
        .filter(Boolean)
        .map((workspace) => {
          const settings = workspace.settings || {};
          return {
            id: workspace.id,
            type: workspace.type,
            name: workspace.name,
            slug: workspace.slug,
            organizationId: workspace.organizationId,
            parentWorkspaceId: workspace.parentWorkspaceId,
            branding: workspace.branding || { displayName: workspace.name },
            settings,
            workspaceProfile: settings.workspaceProfile,
            defaultDashboardWidgets: settings.workspaceProfile?.defaultDashboardWidgets || [],
            defaultFilters: settings.workspaceProfile?.defaultFilters || {},
            restrictedAssets: settings.workspaceProfile?.restrictedAssets || [],
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          };
        }),
      memberships: memberships.map((workspaceMembership) => ({
        id: workspaceMembership.id,
        workspaceId: workspaceMembership.workspaceId,
        userId: workspaceMembership.userId,
        role: workspaceMembership.role,
        permissions: workspaceMembership.permissions || [],
        teams: workspaceMembership.teams || [],
        department: workspaceMembership.department,
        status: workspaceMembership.status,
        joinedAt: workspaceMembership.joinedAt,
        lastAccessedAt: workspaceMembership.lastAccessedAt,
      })),
      activeWorkspaceId: activeMembership?.workspaceId || null,
      recentWorkspaceIds: state?.recentWorkspaceIds || [],
      effectivePermissions: activeMembership?.permissions || [],
      linkedTeams:
        activeMembership?.teams?.map((team) => ({
          teamId: team,
          name: team,
          role: activeMembership.role,
        })) || [],
    };
  }
}
