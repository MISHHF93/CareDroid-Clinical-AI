import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserPreferencesService } from '../user-profile/user-preferences.service';
import { LEGACY_TOOL_ID_ALIASES } from './data/platform-asset-seed.data';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { EntitlementStatus, PlatformAssetLifecycle } from './enums/platform-asset.enums';

@Injectable()
export class PlatformAssetsService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly userPreferencesService: UserPreferencesService,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
    @InjectRepository(RoleProfile)
    private readonly roleProfileRepository: Repository<RoleProfile>,
  ) {}

  async listAssets(params: {
    query?: string;
    assetType?: string;
    packId?: string;
    lifecycle?: string;
  }) {
    const rows = await this.assetRepository.find({ order: { title: 'ASC' } });
    return rows.filter((row) => {
      if (params.assetType && params.assetType !== 'all' && row.assetType !== params.assetType) {
        return false;
      }
      if (params.packId && !row.packIds?.includes(params.packId)) return false;
      if (params.lifecycle && row.lifecycle !== params.lifecycle) return false;
      if (!params.query?.trim()) return true;
      const q = params.query.trim().toLowerCase();
      return [row.id, row.title, row.category, ...(row.packIds || [])]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  async listPacks(params: { organizationType?: string; publishedOnly?: boolean }) {
    const rows = await this.packRepository.find({ order: { name: 'ASC' } });
    return rows.filter((pack) => {
      if (params.publishedOnly && !pack.isPublished) return false;
      if (
        params.organizationType &&
        pack.organizationTypes?.length &&
        !pack.organizationTypes.includes(params.organizationType as any)
      ) {
        return false;
      }
      return true;
    });
  }

  async getPack(packId: string) {
    const pack = await this.packRepository.findOne({ where: { id: packId } });
    if (!pack) throw new NotFoundException(`Asset pack not found: ${packId}`);
    return pack;
  }

  async listRoleProfiles() {
    return this.roleProfileRepository.find({ order: { label: 'ASC' } });
  }

  async getRoleProfile(id: string) {
    const profile = await this.roleProfileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Role profile not found: ${id}`);
    return profile;
  }

  async getOrganizationEntitlements(organizationId: string) {
    return this.entitlementRepository.find({
      where: { organizationId, status: EntitlementStatus.ENABLED },
    });
  }

  isStrictSaasEntitlementsEnabled() {
    return process.env.CAREDROID_STRICT_SAAS_ENTITLEMENTS === 'true';
  }

  async resolveEntitledAssetIds(params: {
    organizationId?: string | null;
    roleProfileId?: string | null;
    workspaceEnabledToolIds?: string[];
    strictEntitlements?: boolean;
  }): Promise<string[]> {
    const entitled = new Set<string>();
    const strictEntitlements = params.strictEntitlements ?? this.isStrictSaasEntitlementsEnabled();
    const hasOrganizationScope = Boolean(params.organizationId);

    if (params.organizationId) {
      const entitlements = await this.getOrganizationEntitlements(params.organizationId);
      const packIds = entitlements.map((row) => row.packId);
      if (packIds.length) {
        const packs = await this.packRepository.find({ where: { id: In(packIds) } });
        packs.forEach((pack) => pack.assetIds?.forEach((id) => entitled.add(id)));
      }
    }

    if (params.workspaceEnabledToolIds?.length) {
      const workspaceAssetIds = new Set<string>();
      for (const legacyId of params.workspaceEnabledToolIds) {
        const aliases = LEGACY_TOOL_ID_ALIASES[legacyId] || [legacyId];
        aliases.forEach((id) => workspaceAssetIds.add(id));
      }
      if (strictEntitlements && hasOrganizationScope) {
        if (entitled.size) {
          for (const id of [...entitled]) {
            if (!workspaceAssetIds.has(id)) entitled.delete(id);
          }
        }
      } else {
        workspaceAssetIds.forEach((id) => entitled.add(id));
      }
    }

    if (params.roleProfileId) {
      const profile = await this.roleProfileRepository.findOne({
        where: { id: params.roleProfileId },
      });
      profile?.hiddenAssetIds?.forEach((id) => entitled.delete(id));
    }

    if (!entitled.size && !(strictEntitlements && hasOrganizationScope)) {
      const active = await this.assetRepository.find({
        where: { lifecycle: PlatformAssetLifecycle.ACTIVE },
      });
      active.forEach((row) => entitled.add(row.id));
    }

    return [...entitled];
  }

  async updateAssetLifecycle(assetId: string, lifecycle: PlatformAssetLifecycle) {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`Asset not found: ${assetId}`);
    asset.lifecycle = lifecycle;
    return this.assetRepository.save(asset);
  }

  async installPackForOrganization(organizationId: string, packId: string) {
    await this.getPack(packId);
    const existing = await this.entitlementRepository.findOne({
      where: { organizationId, packId },
    });
    if (existing) {
      existing.status = EntitlementStatus.ENABLED;
      return this.entitlementRepository.save(existing);
    }
    return this.entitlementRepository.save(
      this.entitlementRepository.create({
        organizationId,
        packId,
        status: EntitlementStatus.ENABLED,
      }),
    );
  }

  async updateUserPinnedAssets(userId: string, assetIds: string[]) {
    const prefs = await this.userPreferencesService.getPreferences(userId);
    const toolPreferences = { ...(prefs.toolPreferences || {}) };
    toolPreferences.pinnedAssetIds = [...new Set(assetIds || [])];
    toolPreferences.pinnedToolIds = toolPreferences.pinnedAssetIds;
    return this.userPreferencesService.updatePreferences(userId, { toolPreferences });
  }

  async updateUserHiddenAssets(userId: string, assetIds: string[]) {
    const prefs = await this.userPreferencesService.getPreferences(userId);
    const toolPreferences = { ...(prefs.toolPreferences || {}) };
    toolPreferences.hiddenAssetIds = [...new Set(assetIds || [])];
    toolPreferences.hiddenToolIds = toolPreferences.hiddenAssetIds;
    return this.userPreferencesService.updatePreferences(userId, { toolPreferences });
  }

  async getAssetById(assetId: string) {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`Asset not found: ${assetId}`);
    return asset;
  }

  async updateUserRoleProfile(userId: string, roleProfileId: string) {
    await this.getRoleProfile(roleProfileId);
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('User profile not found');
    profile.roleProfileId = roleProfileId;
    await this.profileRepository.save(profile);
    return { roleProfileId };
  }

  async removePackFromOrganization(organizationId: string, packId: string) {
    const existing = await this.entitlementRepository.findOne({
      where: { organizationId, packId },
    });
    if (!existing) return { removed: false };
    existing.status = EntitlementStatus.DISABLED;
    await this.entitlementRepository.save(existing);
    return { removed: true };
  }
}
