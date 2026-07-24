import { Injectable } from '@nestjs/common';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AssetAccessState,
  BackendAssetStatus,
  PlatformAssetLifecycle,
} from './enums/platform-asset.enums';
import { PlatformAsset } from './entities/platform-asset.entity';
import { PlatformAssetsService } from './platform-assets.service';
import { UserPreferencesService } from '../user-profile/user-preferences.service';
import { PlatformContextService } from './platform-context.service';
import { LEGACY_TOOL_ID_ALIASES } from './data/platform-asset-seed.data';
import { SaasAssetAccessState } from '../user-profile/saas-profile.constants';

export interface AssetAccessRecord {
  assetId: string;
  accessState: AssetAccessState;
  effectiveAccessState: SaasAssetAccessState;
  priority: number;
  priorityReason: 'pinned' | 'workspace-recommended' | 'role-recommended' | 'recent' | 'permitted';
  reasons: string[];
}

@Injectable()
export class AssetAccessService {
  constructor(
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly platformContextService: PlatformContextService,
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  async getUserAssetAccess(user: User, assetIds?: string[]) {
    const ctx = await this.platformContextService.getContextForUser(user);
    const entitled = new Set(ctx.entitledAssetIds || []);
    const workspaceEnabled = new Set(this.resolveWorkspaceAssetIds(ctx.legacyToolAliases || []));
    const activeWorkspace = ctx.workspace?.workspaces?.find(
      (workspace: { id: string }) => workspace.id === ctx.workspace?.activeWorkspaceId,
    );
    const workspaceRecommended = new Set(
      this.resolveWorkspaceAssetIds(activeWorkspace?.settings?.recommendedAssetIds || []),
    );
    const roleRecommended = new Set<string>((ctx.roleProfile?.preferredAssetIds || []) as string[]);
    const prefs = await this.userPreferencesService.getPreferences(user.id);
    const pinned = new Set([
      ...(prefs.toolPreferences?.pinnedAssetIds || []),
      ...(prefs.toolPreferences?.pinnedToolIds || []),
      ...(prefs.toolPreferences?.saasProfile?.pinnedAssets || []),
    ]);
    const userHidden = new Set([
      ...(ctx.roleProfile?.hiddenAssetIds || []),
      ...(prefs.toolPreferences?.hiddenAssetIds || []),
      ...(prefs.toolPreferences?.hiddenToolIds || []),
      ...(prefs.toolPreferences?.saasProfile?.hiddenAssets || []),
    ]);
    const recent = new Set([
      ...(prefs.toolPreferences?.recentAssetIds || []),
      ...(prefs.toolPreferences?.recentToolIds || []),
      ...(prefs.toolPreferences?.saasProfile?.recentAssets || []),
    ]);

    const dbAssets = await this.platformAssetsService.listAssets({});
    const assetById = new Map(dbAssets.map((a) => [a.id, a]));

    const ids =
      assetIds && assetIds.length > 0
        ? assetIds
        : [...new Set([...entitled, ...dbAssets.map((a) => a.id)])];

    const access: AssetAccessRecord[] = ids
      .map((assetId) =>
        this.resolveAccess(assetId, {
          user,
          entitled,
          hidden: userHidden,
          asset: assetById.get(assetId),
          hasOrganization: Boolean(ctx.organization?.id),
          strictEntitlements: Boolean(ctx.strictSaasEntitlements),
          workspaceEnabled,
          pinned,
          workspaceRecommended,
          roleRecommended,
          recent,
        }),
      )
      .sort((a, b) => a.priority - b.priority || a.assetId.localeCompare(b.assetId));

    return {
      organization: ctx.organization,
      workspace: ctx.workspace?.activeWorkspaceId,
      roleProfile: ctx.roleProfile,
      entitledAssetIds: [...entitled],
      entitledPackIds: ctx.entitledPackIds,
      pinnedAssetIds: [...pinned],
      hiddenAssetIds: [...userHidden],
      access,
      accessByAssetId: Object.fromEntries(access.map((row) => [row.assetId, row.accessState])),
      effectiveAccessByAssetId: Object.fromEntries(
        access.map((row) => [row.assetId, row.effectiveAccessState]),
      ),
    };
  }

  resolveAccess(
    assetId: string,
    params: {
      user: User;
      entitled: Set<string>;
      hidden: Set<string>;
      asset?: PlatformAsset;
      hasOrganization: boolean;
      strictEntitlements: boolean;
      workspaceEnabled: Set<string>;
      pinned: Set<string>;
      workspaceRecommended: Set<string>;
      roleRecommended: Set<string>;
      recent: Set<string>;
    },
  ): AssetAccessRecord {
    const reasons: string[] = [];
    const {
      user,
      entitled,
      hidden,
      asset,
      hasOrganization,
      strictEntitlements,
      workspaceEnabled,
      pinned,
      workspaceRecommended,
      roleRecommended,
      recent,
    } = params;
    const decorate = (accessState: AssetAccessState, stateReasons: string[]): AssetAccessRecord => {
      const priority = this.resolvePriority(assetId, {
        accessState,
        pinned,
        workspaceRecommended,
        roleRecommended,
        recent,
      });
      return {
        assetId,
        accessState,
        effectiveAccessState: this.toSaasAccessState(accessState, priority.priorityReason),
        priority: priority.priority,
        priorityReason: priority.priorityReason,
        reasons: stateReasons,
      };
    };

    if (hidden.has(assetId)) {
      return decorate(AssetAccessState.HIDDEN, ['user-hidden']);
    }

    if (this.isAdminOnlyAsset(asset)) {
      if (user.role !== UserRole.ADMIN) {
        return decorate(AssetAccessState.REQUIRES_ADMIN, ['admin-only-policy']);
      }
      reasons.push('admin-lifecycle-override');
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.DRAFT) {
      return decorate(AssetAccessState.HIDDEN, ['draft']);
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.ARCHIVED) {
      return decorate(AssetAccessState.HIDDEN, ['archived']);
    }

    if (asset?.governance?.requiresHumanReview && user.role === UserRole.STUDENT) {
      return decorate(AssetAccessState.REQUIRES_REVIEW, ['human-review-required']);
    }

    if (asset?.backendStatus === BackendAssetStatus.UNSUPPORTED) {
      return decorate(AssetAccessState.UNSUPPORTED, ['no-backend-executor']);
    }

    if (asset?.demoStatus === 'demo' || asset?.backendStatus === BackendAssetStatus.DEMO) {
      if (hasOrganization && (strictEntitlements || entitled.size > 0) && !entitled.has(assetId)) {
        return decorate(AssetAccessState.LOCKED, ['pack-not-enabled']);
      }
      return decorate(AssetAccessState.DEMO_ONLY, ['demo-labeled']);
    }

    if (hasOrganization && (strictEntitlements || entitled.size > 0) && !entitled.has(assetId)) {
      return decorate(AssetAccessState.LOCKED, ['not-in-entitled-packs']);
    }

    if (workspaceEnabled.size > 0 && !workspaceEnabled.has(assetId)) {
      return decorate(AssetAccessState.RESTRICTED, ['workspace-not-enabled']);
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.DEPRECATED) {
      return decorate(AssetAccessState.RESTRICTED, ['deprecated']);
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.BETA) {
      return decorate(AssetAccessState.ALLOWED, [...reasons, 'beta']);
    }

    return decorate(AssetAccessState.ALLOWED, reasons);
  }

  private isAdminOnlyAsset(asset?: PlatformAsset) {
    const governance = asset?.governance || {};
    const permissionPolicy = asset?.permissionPolicy || {};
    return (
      governance.adminOnly === true ||
      governance.visibility === 'admin-only' ||
      governance.audience === 'admin-only' ||
      permissionPolicy.adminOnly === true
    );
  }

  private resolveWorkspaceAssetIds(enabledToolIds: string[]) {
    const resolved = new Set<string>();
    for (const legacyId of enabledToolIds || []) {
      const aliases = LEGACY_TOOL_ID_ALIASES[legacyId] || [legacyId];
      aliases.forEach((id) => resolved.add(id));
    }
    return [...resolved];
  }

  private resolvePriority(
    assetId: string,
    params: {
      accessState: AssetAccessState;
      pinned: Set<string>;
      workspaceRecommended: Set<string>;
      roleRecommended: Set<string>;
      recent: Set<string>;
    },
  ) {
    if (
      params.accessState !== AssetAccessState.ALLOWED &&
      params.accessState !== AssetAccessState.DEMO_ONLY
    ) {
      return { priority: 900, priorityReason: 'permitted' as const };
    }
    if (params.pinned.has(assetId)) return { priority: 10, priorityReason: 'pinned' as const };
    if (params.workspaceRecommended.has(assetId)) {
      return { priority: 20, priorityReason: 'workspace-recommended' as const };
    }
    if (params.roleRecommended.has(assetId)) {
      return { priority: 30, priorityReason: 'role-recommended' as const };
    }
    if (params.recent.has(assetId)) return { priority: 40, priorityReason: 'recent' as const };
    return { priority: 50, priorityReason: 'permitted' as const };
  }

  private toSaasAccessState(
    accessState: AssetAccessState,
    priorityReason: AssetAccessRecord['priorityReason'],
  ): SaasAssetAccessState {
    if (accessState === AssetAccessState.HIDDEN) return 'hidden';
    if (accessState === AssetAccessState.LOCKED) return 'locked';
    if (
      accessState === AssetAccessState.RESTRICTED ||
      accessState === AssetAccessState.REQUIRES_ADMIN ||
      accessState === AssetAccessState.REQUIRES_REVIEW
    ) {
      return 'restricted';
    }
    if (accessState === AssetAccessState.DEMO_ONLY) return 'demo-only';
    if (accessState === AssetAccessState.UNSUPPORTED) return 'unsupported';
    if (priorityReason === 'pinned') return 'pinned';
    if (priorityReason === 'workspace-recommended' || priorityReason === 'role-recommended') {
      return 'recommended';
    }
    return 'visible';
  }
}
