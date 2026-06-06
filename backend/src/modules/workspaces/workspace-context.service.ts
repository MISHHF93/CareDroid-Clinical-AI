import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { normalizeLifecycleState } from '../subscriptions/subscription-lifecycle.engine';
import { User } from '../users/entities/user.entity';
import { Organization } from './entities/organization.entity';
import { WorkspaceType } from './entities/workspace.entity';
import { WorkspacesService } from './workspaces.service';
import {
  getWorkspaceDefinition,
  workspaceRouteKey,
  workspaceSettingsForType,
} from './workspace-taxonomy';

@Injectable()
export class WorkspaceContextService {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly entitlementService: EntitlementService,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async getCurrentContext(user: User) {
    const workspaceState = await this.workspacesService.getActiveWorkspaceState(user);
    if (!workspaceState.activeWorkspace) {
      throw new NotFoundException('Active workspace not found.');
    }
    return this.buildContext(user, workspaceState, workspaceState.activeWorkspace);
  }

  async getContextForWorkspace(user: User, workspaceId: string) {
    const [workspaceState, workspaceResult] = await Promise.all([
      this.workspacesService.listForUser(user),
      this.workspacesService.getWorkspaceForUser(user, workspaceId),
    ]);
    return this.buildContext(user, workspaceState, workspaceResult.workspace, {
      explicitMembership: workspaceResult.membership,
      explicitPermissions: workspaceResult.effectivePermissions,
    });
  }

  private async buildContext(
    user: User,
    workspaceState: any,
    workspace: any,
    options: { explicitMembership?: any; explicitPermissions?: string[] } = {},
  ) {
    const settings = {
      ...workspaceSettingsForType(workspace.type),
      ...(workspace.settings || {}),
    };
    const workspaceKey = settings.workspaceKey || workspaceRouteKey(workspace.type);
    const definition = getWorkspaceDefinition(workspace.type || workspaceKey);
    const membership =
      options.explicitMembership ||
      workspaceState.memberships?.find(
        (row: { workspaceId: string }) => row.workspaceId === workspace.id,
      );
    const effectivePermissions =
      options.explicitPermissions || workspaceState.effectivePermissions || [];
    const organization = workspace.organizationId
      ? await this.organizationRepository.findOne({ where: { id: workspace.organizationId } })
      : null;
    const enabledToolIds = settings.enabledToolIds || [];
    const entitledPackIds = organization
      ? (await this.platformAssetsService.getOrganizationEntitlements(organization.id)).map(
          (row) => row.packId,
        )
      : [];
    const visibleAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
      organizationId: organization?.id,
      workspaceEnabledToolIds: enabledToolIds,
    });
    const assets = await this.platformAssetsService.listAssets({});
    const visibleAssetSet = new Set(visibleAssetIds);
    const assetAccessDecisions = Object.fromEntries(
      assets.map((asset) => [
        asset.id,
        this.entitlementService.resolveDecisionFromContext({
          assetId: asset.id,
          asset,
          organization,
          organizationId: organization?.id,
          userRole: membership?.role || user.role,
          subscriptionPlan: user.subscription?.tier,
          subscriptionLifecycleState: normalizeLifecycleState(user.subscription),
          entitledAssetIds: visibleAssetIds,
          entitledPackIds,
          strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
        }),
      ]),
    );
    const recommendations = [
      ...new Set([...(settings.recommendedAssetIds || []), ...visibleAssetIds.slice(0, 12)]),
    ]
      .filter((assetId) => visibleAssetSet.has(assetId))
      .slice(0, 12)
      .map((assetId) => {
        const asset = assets.find((candidate) => candidate.id === assetId);
        return {
          assetId,
          title: asset?.title || assetId,
          route: asset?.route,
          reason: settings.recommendedAssetIds?.includes(assetId) ? 'workspace' : 'entitlement',
        };
      });
    const shortcuts = (settings.shortcuts || [])
      .filter((shortcut) => !shortcut.assetId || visibleAssetSet.has(shortcut.assetId))
      .slice(0, 8);

    return {
      workspace: {
        ...workspace,
        workspaceKey,
        routePath: `/workspace/${workspaceKey}`,
        description: workspace.branding?.description || definition.description,
        assistantContext: settings.assistantContext || definition.assistantContext,
        defaultDashboard: settings.defaultDashboard,
      },
      workspaceState,
      membership,
      effectivePermissions,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            organizationType: organization.organizationType,
            branding: organization.branding,
          }
        : null,
      enabledToolIds,
      visibleAssetIds,
      entitledPackIds,
      assetAccessDecisions,
      recommendations,
      assistantContext: settings.assistantContext || definition.assistantContext,
      shortcuts,
      workspaceTypes: Object.values(WorkspaceType),
    };
  }
}
