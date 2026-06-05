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

export interface AssetAccessRecord {
  assetId: string;
  accessState: AssetAccessState;
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
    const prefs = await this.userPreferencesService.getPreferences(user.id);
    const pinned = new Set([
      ...(prefs.toolPreferences?.pinnedAssetIds || []),
      ...(prefs.toolPreferences?.pinnedToolIds || []),
    ]);
    const userHidden = new Set([
      ...(ctx.roleProfile?.hiddenAssetIds || []),
      ...(prefs.toolPreferences?.hiddenAssetIds || []),
      ...(prefs.toolPreferences?.hiddenToolIds || []),
    ]);

    const dbAssets = await this.platformAssetsService.listAssets({});
    const assetById = new Map(dbAssets.map((a) => [a.id, a]));

    const ids =
      assetIds?.length > 0
        ? assetIds
        : [...new Set([...entitled, ...dbAssets.map((a) => a.id)])];

    const access: AssetAccessRecord[] = ids.map((assetId) =>
      this.resolveAccess(assetId, {
        user,
        entitled,
        hidden: userHidden,
        asset: assetById.get(assetId),
        hasOrganization: Boolean(ctx.organization?.id),
        strictEntitlements: Boolean(ctx.strictSaasEntitlements),
        workspaceEnabled,
      }),
    );

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
    },
  ): AssetAccessRecord {
    const reasons: string[] = [];
    const { user, entitled, hidden, asset, hasOrganization, strictEntitlements, workspaceEnabled } =
      params;

    if (hidden.has(assetId)) {
      return { assetId, accessState: AssetAccessState.HIDDEN, reasons: ['user-hidden'] };
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.ADMIN_ONLY) {
      if (user.role !== UserRole.ADMIN) {
        return {
          assetId,
          accessState: AssetAccessState.REQUIRES_ADMIN,
          reasons: ['admin-only-lifecycle'],
        };
      }
      reasons.push('admin-lifecycle-override');
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.DRAFT) {
      if (user.role !== UserRole.ADMIN) {
        return { assetId, accessState: AssetAccessState.HIDDEN, reasons: ['draft'] };
      }
    }

    if (asset?.governance?.requiresHumanReview && user.role === UserRole.STUDENT) {
      return {
        assetId,
        accessState: AssetAccessState.REQUIRES_REVIEW,
        reasons: ['human-review-required'],
      };
    }

    if (asset?.backendStatus === BackendAssetStatus.UNSUPPORTED) {
      return {
        assetId,
        accessState: AssetAccessState.UNSUPPORTED,
        reasons: ['no-backend-executor'],
      };
    }

    if (
      asset?.demoStatus === 'demo' ||
      asset?.backendStatus === BackendAssetStatus.DEMO
    ) {
      if (hasOrganization && (strictEntitlements || entitled.size > 0) && !entitled.has(assetId)) {
        return {
          assetId,
          accessState: AssetAccessState.LOCKED,
          reasons: ['pack-not-enabled'],
        };
      }
      return {
        assetId,
        accessState: AssetAccessState.DEMO_ONLY,
        reasons: ['demo-labeled'],
      };
    }

    if (hasOrganization && (strictEntitlements || entitled.size > 0) && !entitled.has(assetId)) {
      return {
        assetId,
        accessState: AssetAccessState.LOCKED,
        reasons: ['not-in-entitled-packs'],
      };
    }

    if (workspaceEnabled.size > 0 && !workspaceEnabled.has(assetId)) {
      return {
        assetId,
        accessState: AssetAccessState.RESTRICTED,
        reasons: ['workspace-not-enabled'],
      };
    }

    if (asset?.lifecycle === PlatformAssetLifecycle.DEPRECATED) {
      return {
        assetId,
        accessState: AssetAccessState.RESTRICTED,
        reasons: ['deprecated'],
      };
    }

    return { assetId, accessState: AssetAccessState.ALLOWED, reasons };
  }

  private resolveWorkspaceAssetIds(enabledToolIds: string[]) {
    const resolved = new Set<string>();
    for (const legacyId of enabledToolIds || []) {
      const aliases = LEGACY_TOOL_ID_ALIASES[legacyId] || [legacyId];
      aliases.forEach((id) => resolved.add(id));
    }
    return [...resolved];
  }
}
