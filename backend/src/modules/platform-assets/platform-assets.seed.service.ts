import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SEED_ASSET_PACKS,
  SEED_PLATFORM_ASSETS,
  SEED_ROLE_PROFILES,
} from './data/platform-asset-seed.data';
import { AssetRegistryService } from './asset-registry.service';
import { AssetPack } from './entities/asset-pack.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';

@Injectable()
export class PlatformAssetsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAssetsSeedService.name);

  constructor(
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(RoleProfile)
    private readonly roleProfileRepository: Repository<RoleProfile>,
    private readonly assetRegistryService: AssetRegistryService,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    const assetCount = await this.assetRepository.count();
    if (assetCount > 0) {
      await this.backfillSeedPacks();
      await this.backfillMissingSeedAssets();
      return;
    }
    this.logger.log('Seeding platform assets, packs, and role profiles…');

    for (const pack of SEED_ASSET_PACKS) {
      await this.packRepository.save(
        this.packRepository.create({
          id: pack.id,
          name: pack.name,
          slug: pack.slug,
          description: pack.description,
          organizationTypes: pack.organizationTypes,
          targetRoles: (pack as any).targetRoles || [],
          assetIds: pack.assetIds,
          requiredDependencies: (pack as any).requiredDependencies || [],
          defaultModules: pack.defaultModules,
          pricingTier: pack.pricingTier,
          salesMetadata: (pack as any).salesMetadata || null,
          isPublished: true,
        }),
      );
    }

    for (const asset of SEED_PLATFORM_ASSETS) {
      await this.saveSeedAsset(asset);
    }

    for (const profile of SEED_ROLE_PROFILES) {
      await this.roleProfileRepository.save(
        this.roleProfileRepository.create({
          id: profile.id,
          label: profile.label,
          intendedRoles: profile.intendedRoles,
          specialties: profile.specialties,
          preferredAssetIds: profile.preferredAssetIds,
          hiddenAssetIds: [],
          defaultDashboard: profile.defaultDashboard,
          defaultAiAgentId: profile.defaultAiAgentId,
          requiredPermissions: [],
        }),
      );
    }

    this.logger.log(
      `Seeded ${SEED_PLATFORM_ASSETS.length} assets, ${SEED_ASSET_PACKS.length} packs, ${SEED_ROLE_PROFILES.length} role profiles`,
    );
  }

  private async backfillMissingSeedAssets() {
    let inserted = 0;
    for (const asset of SEED_PLATFORM_ASSETS) {
      const existing = await this.assetRepository.findOne({ where: { id: asset.id } });
      if (existing) continue;
      await this.saveSeedAsset(asset);
      inserted += 1;
    }
    if (inserted) {
      this.logger.log(`Backfilled ${inserted} missing platform asset registry rows`);
    }
  }

  private async backfillSeedPacks() {
    for (const pack of SEED_ASSET_PACKS) {
      const existing = await this.packRepository.findOne({ where: { id: pack.id } });
      if (!existing) {
        await this.packRepository.save(
          this.packRepository.create({
            id: pack.id,
            name: pack.name,
            slug: pack.slug,
            description: pack.description,
            organizationTypes: pack.organizationTypes,
            targetRoles: (pack as any).targetRoles || [],
            assetIds: pack.assetIds,
            requiredDependencies: (pack as any).requiredDependencies || [],
            defaultModules: pack.defaultModules,
            pricingTier: pack.pricingTier,
            salesMetadata: (pack as any).salesMetadata || null,
            isPublished: true,
          }),
        );
        continue;
      }

      const mergedAssetIds = [...new Set([...(existing.assetIds || []), ...pack.assetIds])];
      if (mergedAssetIds.length !== (existing.assetIds || []).length) {
        existing.assetIds = mergedAssetIds;
        existing.defaultModules = [...new Set([...(existing.defaultModules || []), ...pack.defaultModules])];
        existing.targetRoles = [...new Set([...(existing.targetRoles || []), ...((pack as any).targetRoles || [])])];
        await this.packRepository.save(existing);
      }
    }
  }

  private async saveSeedAsset(asset: (typeof SEED_PLATFORM_ASSETS)[number]) {
    const row = this.assetRepository.create({
      id: asset.id,
      assetType: asset.assetType,
      title: asset.title,
      description: asset.description,
      category: asset.category,
      clinicalSpecialty: asset.specialties?.[0] || null,
      route: asset.route,
      launchType: asset.launchType,
      permissionPolicy: asset.permissionPolicy,
      organizationTypes: asset.organizationTypes,
      roleProfiles: asset.roleProfiles,
      intendedRoles: asset.intendedRoles,
      workspaceTags: asset.workspaceTags,
      specialties: asset.specialties,
      riskLevel: asset.riskLevel,
      backendStatus: asset.backendStatus,
      demoStatus: asset.demoStatus,
      governance: asset.governance,
      lifecycle: asset.lifecycle,
      pricingTier: asset.pricingTier,
      packIds: asset.packIds,
      dependencies: asset.dependencies,
      catalogVersion: asset.catalogVersion,
    });
    this.assetRegistryService.validateAsset(row);
    await this.assetRepository.save(row);
  }
}
