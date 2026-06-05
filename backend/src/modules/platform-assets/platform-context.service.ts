import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../product-catalog/entities/product.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { PlatformAssetsService } from './platform-assets.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { User } from '../users/entities/user.entity';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class PlatformContextService {
  constructor(
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly entitlementService: EntitlementService,
    private readonly workspacesService: WorkspacesService,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
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
      membership = await this.membershipRepository.findOne({
        where: { organizationId: profile.organizationId, userId: user.id },
      });
    }

    const workspaceState = await this.workspacesService.listForUser(user);
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
          userRole: membership?.role,
          subscriptionPlan: user.subscription?.tier,
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
      workspaceDefaults: Array.isArray(settings.workspaceDefaults) ? settings.workspaceDefaults : [],
      membership: membership
        ? {
            role: membership.role,
            roleProfileId: membership.roleProfileId,
          }
        : null,
      roleProfile,
      entitledPackIds,
      entitledAssetIds,
      assetAccessDecisions: accessDecisions,
      entitledPacks: packs.filter((pack) => entitledPackIds.includes(pack.id)),
      availablePacks: packs,
      aiAgents: entitledAgents,
      defaultAiAgentId: roleProfile?.defaultAiAgentId || entitledAgents[0]?.id || 'agent-clinical',
      workspace: workspaceState,
      legacyToolAliases: enabledToolIds,
      strictSaasEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
    };
  }
}
