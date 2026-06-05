import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SEED_ASSET_PACKS,
  SEED_PLATFORM_ASSETS,
  SEED_ROLE_PROFILES,
} from './data/platform-asset-seed.data';
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
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    const assetCount = await this.assetRepository.count();
    if (assetCount > 0) {
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
      await this.assetRepository.save(
        this.assetRepository.create({
          id: asset.id,
          assetType: asset.assetType,
          title: asset.title,
          category: asset.category,
          route: asset.route,
          launchType: 'registry',
          permissionPolicy: {},
          organizationTypes: [],
          roleProfiles: [],
          intendedRoles: [],
          workspaceTags: [],
          specialties: [],
          riskLevel: 'clinical-decision-support',
          backendStatus: 'partial',
          demoStatus: 'demo',
          governance: {
            clinicalRiskLevel: 'clinical-decision-support',
            requiresHumanReview: true,
            auditRequired: true,
            validationStatus: 'demo',
          },
          lifecycle: asset.lifecycle,
          pricingTier: asset.pricingTier,
          packIds: asset.packIds,
          dependencies: [],
          catalogVersion: '1.0.0',
        }),
      );
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
}
