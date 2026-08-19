import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserPreferencesService } from '../user-profile/user-preferences.service';
import { AssetRegistryService } from './asset-registry.service';
import { LEGACY_TOOL_ID_ALIASES } from './data/platform-asset-seed.data';
import { resolveSaasProfileAllowedPacks } from '../user-profile/saas-profile-rbac.config';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { EntitlementStatus, PlatformAssetLifecycle } from './enums/platform-asset.enums';
import { getEnvironmentConfig } from '../../config/environment.config';

const MARKETPLACE_PACK_IDS = [
  'emergency-department-pack',
  'icu-pack',
  'cardiology-pack',
  'laboratory-intelligence',
  'medical-iot-pack',
  'fleet-logistics',
  'simulation-training-pack',
  'governance-compliance-pack',
  'research-education',
  'digital-twin-pack',
];

@Injectable()
export class PlatformAssetsService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly assetRegistryService: AssetRegistryService,
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
    type?: string;
    packId?: string;
    lifecycle?: string;
    lifecycleStatus?: string;
  }) {
    return this.assetRegistryService.listAssets(params);
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

  async listMarketplacePacks(params: {
    organizationId?: string | null;
    organizationType?: string;
    publishedOnly?: boolean;
  }) {
    const allPacks = await this.listPacks({
      publishedOnly: params.publishedOnly ?? true,
    });
    const packs = allPacks
      .filter((pack) => MARKETPLACE_PACK_IDS.includes(pack.id))
      .sort((a, b) => MARKETPLACE_PACK_IDS.indexOf(a.id) - MARKETPLACE_PACK_IDS.indexOf(b.id));
    const dependencyPacks = await this.packRepository.find({ order: { name: 'ASC' } });
    return this.projectMarketplacePacks(packs, params.organizationId, dependencyPacks);
  }

  async getMarketplacePack(packId: string, params: { organizationId?: string | null } = {}) {
    const pack = await this.getPack(packId);
    const dependencyPacks = await this.packRepository.find({ order: { name: 'ASC' } });
    const [projection] = await this.projectMarketplacePacks(
      [pack],
      params.organizationId,
      dependencyPacks,
    );
    return projection;
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
    return getEnvironmentConfig().runtime.strictSaasEntitlements;
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

      const allowedPacks = resolveSaasProfileAllowedPacks(params.roleProfileId);
      if (allowedPacks.length && entitled.size && strictEntitlements && hasOrganizationScope) {
        const packs = await this.packRepository.find({ where: { id: In(allowedPacks) } });
        const allowedAssetIds = new Set<string>();
        packs.forEach((pack) => pack.assetIds?.forEach((id) => allowedAssetIds.add(id)));
        for (const id of [...entitled]) {
          if (!allowedAssetIds.has(id)) entitled.delete(id);
        }
      }
    }

    if (!entitled.size && !(strictEntitlements && hasOrganizationScope)) {
      const active = await this.assetRepository.find({
        where: { lifecycle: In([PlatformAssetLifecycle.ACTIVE, PlatformAssetLifecycle.BETA]) },
      });
      active.forEach((row) => entitled.add(row.id));
    }

    return [...entitled];
  }

  async updateAssetLifecycle(assetId: string, lifecycle: PlatformAssetLifecycle) {
    return this.assetRegistryService.updateAssetLifecycle(assetId, lifecycle);
  }

  async installPackForOrganization(organizationId: string, packId: string) {
    const pack = await this.getPack(packId);
    if (!pack.isPublished) {
      throw new BadRequestException(`Asset pack is not published: ${packId}`);
    }
    const dependencyState = await this.resolvePackDependencyState(pack, organizationId);
    const existing = await this.entitlementRepository.findOne({
      where: { organizationId, packId },
    });
    if (existing) {
      existing.status = EntitlementStatus.ENABLED;
      const entitlement = await this.entitlementRepository.save(existing);
      return { ...entitlement, dependencies: dependencyState };
    }

    // HEAL-347.30: findOne-then-create had a TOCTOU gap -- two concurrent
    // installs of the same pack (a double-click on "Apply solution", or
    // reconcileOrganizationCommercialPlan's pack loop racing a manual
    // install) could both read "no existing row" and both attempt
    // .create()+.save(); the loser hit an uncaught QueryFailedError (500)
    // from the (organizationId, packId) unique index instead of the
    // idempotent "already enabled" result. orIgnore()+read-back is the same
    // pattern already established for this exact race shape elsewhere in
    // this codebase (sentinel-inbound.service.ts's HEAL-311 fix).
    await this.entitlementRepository
      .createQueryBuilder()
      .insert()
      .into(OrganizationEntitlement)
      .values({ organizationId, packId, status: EntitlementStatus.ENABLED })
      .orIgnore()
      .execute();

    const entitlement = await this.entitlementRepository.findOneOrFail({
      where: { organizationId, packId },
    });
    return { ...entitlement, dependencies: dependencyState };
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
    return this.assetRegistryService.getAssetById(assetId);
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
    const pack = await this.getPack(packId);
    const existing = await this.entitlementRepository.findOne({
      where: { organizationId, packId },
    });
    const dependentPacks = await this.findEnabledDependents(organizationId, pack.id);
    if (!existing) {
      return { removed: false, dependentPacks };
    }
    existing.status = EntitlementStatus.DISABLED;
    await this.entitlementRepository.save(existing);
    return { removed: true, dependentPacks };
  }

  private async projectMarketplacePacks(
    packs: AssetPack[],
    organizationId?: string | null,
    dependencyPacks: AssetPack[] = packs,
  ) {
    const [assets, roleProfiles, entitlements] = await Promise.all([
      this.assetRepository.find(),
      this.roleProfileRepository.find({ order: { label: 'ASC' } }),
      organizationId
        ? this.entitlementRepository.find({ where: { organizationId } })
        : Promise.resolve([]),
    ]);
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const packById = new Map(dependencyPacks.map((pack) => [pack.id, pack]));
    const entitlementByPack = new Map(entitlements.map((row) => [row.packId, row]));
    const enabledPackIds = new Set(
      entitlements
        .filter((row) => row.status === EntitlementStatus.ENABLED)
        .map((row) => row.packId),
    );

    return packs.map((pack) => {
      const entitlement = entitlementByPack.get(pack.id);
      const includedAssets = (pack.assetIds || []).map((assetId) => {
        const asset = assetById.get(assetId);
        return {
          id: assetId,
          title: asset?.title || assetId,
          type: asset?.assetType,
          category: asset?.category,
          route: asset?.route,
          lifecycle: asset?.lifecycle,
          riskLevel: asset?.riskLevel,
          intendedRoles: asset?.intendedRoles || [],
          workspaceTags: asset?.workspaceTags || [],
        };
      });
      const dependencies = (pack.requiredDependencies || []).map((dependencyId) => {
        const dependency = packById.get(dependencyId);
        const dependencyEntitlement = entitlementByPack.get(dependencyId);
        return {
          id: dependencyId,
          name: dependency?.name || dependencyId,
          enabled: enabledPackIds.has(dependencyId),
          status: dependencyEntitlement?.status || 'not_installed',
        };
      });
      const roleMapping = this.resolvePackRoleMapping(pack, roleProfiles);
      const dependentPacks = dependencyPacks
        .filter((candidate) => candidate.requiredDependencies?.includes(pack.id))
        .map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          enabled: enabledPackIds.has(candidate.id),
        }));

      return {
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        description: pack.description,
        organizationTypes: pack.organizationTypes || [],
        pricingTier: pack.pricingTier,
        isPublished: pack.isPublished,
        assetIds: pack.assetIds || [],
        includedAssets,
        includedAssetCount: includedAssets.length,
        requiredDependencies: pack.requiredDependencies || [],
        dependencies,
        dependencySummary: {
          total: dependencies.length,
          enabled: dependencies.filter((dependency) => dependency.enabled).length,
          missing: dependencies.filter((dependency) => !dependency.enabled).length,
        },
        defaultModules: pack.defaultModules || [],
        targetRoles: pack.targetRoles || [],
        roleMapping,
        salesMetadata: pack.salesMetadata || {},
        entitlement: entitlement || null,
        enabled: entitlement?.status === EntitlementStatus.ENABLED,
        status: entitlement?.status || 'available',
        dependentPacks,
        warnings: this.marketplaceWarnings(pack, dependencies, dependentPacks),
      };
    });
  }

  private resolvePackRoleMapping(pack: AssetPack, roleProfiles: RoleProfile[]) {
    const packRoles = new Set((pack.targetRoles || []).map((role) => role.toLowerCase()));
    return roleProfiles
      .map((profile) => {
        const roleMatches = (profile.intendedRoles || []).filter((role) =>
          packRoles.has(String(role).toLowerCase()),
        );
        const preferredAssets = (profile.preferredAssetIds || []).filter((assetId) =>
          (pack.assetIds || []).includes(assetId),
        );
        if (!roleMatches.length && !preferredAssets.length) return null;
        return {
          roleProfileId: profile.id,
          label: profile.label,
          intendedRoles: profile.intendedRoles || [],
          matchedRoles: roleMatches,
          preferredAssetIds: preferredAssets,
          defaultDashboard: profile.defaultDashboard,
          defaultAiAgentId: profile.defaultAiAgentId,
        };
      })
      .filter(Boolean);
  }

  private marketplaceWarnings(
    pack: AssetPack,
    dependencies: Array<{ enabled: boolean; name: string }>,
    dependentPacks: Array<{ enabled: boolean; name: string }>,
  ) {
    const warnings: Array<{ type: string; message: string }> = [];
    const missingDependencies = dependencies.filter((dependency) => !dependency.enabled);
    if (missingDependencies.length) {
      warnings.push({
        type: 'dependency',
        message: `Requires ${missingDependencies.map((dependency) => dependency.name).join(', ')}.`,
      });
    }
    const enabledDependents = dependentPacks.filter((dependency) => dependency.enabled);
    if (enabledDependents.length) {
      warnings.push({
        type: 'dependent-pack',
        message: `Used by ${enabledDependents.map((dependency) => dependency.name).join(', ')}.`,
      });
    }
    if (!pack.isPublished) {
      warnings.push({ type: 'unpublished', message: 'This pack is not published.' });
    }
    return warnings;
  }

  private async resolvePackDependencyState(pack: AssetPack, organizationId: string) {
    if (!pack.requiredDependencies?.length) return [];
    const entitlements = await this.entitlementRepository.find({ where: { organizationId } });
    const enabled = new Set(
      entitlements
        .filter((row) => row.status === EntitlementStatus.ENABLED)
        .map((row) => row.packId),
    );
    const dependencies = await this.packRepository.find({
      where: { id: In(pack.requiredDependencies) },
    });
    const dependencyById = new Map(dependencies.map((dependency) => [dependency.id, dependency]));
    return pack.requiredDependencies.map((dependencyId) => ({
      id: dependencyId,
      name: dependencyById.get(dependencyId)?.name || dependencyId,
      enabled: enabled.has(dependencyId),
    }));
  }

  private async findEnabledDependents(organizationId: string, packId: string) {
    const [packs, entitlements] = await Promise.all([
      this.packRepository.find(),
      this.entitlementRepository.find({
        where: { organizationId, status: EntitlementStatus.ENABLED },
      }),
    ]);
    const enabled = new Set(entitlements.map((row) => row.packId));
    return packs
      .filter((pack) => pack.requiredDependencies?.includes(packId))
      .map((pack) => ({ id: pack.id, name: pack.name, enabled: enabled.has(pack.id) }));
  }
}
