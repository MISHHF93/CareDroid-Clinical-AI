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

type SeedPlatformAsset = (typeof SEED_PLATFORM_ASSETS)[number];

const SEED_ASSET_SYNC_FIELDS: Array<keyof PlatformAsset> = [
  'assetType',
  'title',
  'description',
  'category',
  'clinicalSpecialty',
  'route',
  'launchType',
  'permissionPolicy',
  'organizationTypes',
  'roleProfiles',
  'intendedRoles',
  'workspaceTags',
  'specialties',
  'primaryDepartment',
  'secondaryDepartments',
  'recommendedRoles',
  'requiredPermissions',
  'riskLevel',
  'backendStatus',
  'demoStatus',
  'governance',
  'pricingTier',
  'packIds',
  'dependencies',
  'catalogVersion',
];

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
      await this.backfillSeedAssets();
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
          buyerPersona: (pack as any).buyerPersona || [],
          decisionMaker: (pack as any).decisionMaker || [],
          stakeholders: (pack as any).stakeholders || [],
          expectedOutcomes: (pack as any).expectedOutcomes || [],
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

  private async backfillSeedAssets() {
    let inserted = 0;
    let repaired = 0;
    for (const asset of SEED_PLATFORM_ASSETS) {
      const existing = await this.assetRepository.findOne({ where: { id: asset.id } });
      if (!existing) {
        await this.saveSeedAsset(asset);
        inserted += 1;
        continue;
      }

      const repairedAsset = this.mergeSeedAsset(existing, asset);
      this.assetRegistryService.validateAsset(repairedAsset);
      if (this.seedAssetChanged(existing, repairedAsset)) {
        await this.assetRepository.save(repairedAsset);
        repaired += 1;
      }
    }
    if (inserted) {
      this.logger.log(`Backfilled ${inserted} missing platform asset registry rows`);
    }
    if (repaired) {
      this.logger.log(`Repaired ${repaired} stale platform asset registry rows`);
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
            buyerPersona: (pack as any).buyerPersona || [],
            decisionMaker: (pack as any).decisionMaker || [],
            stakeholders: (pack as any).stakeholders || [],
            expectedOutcomes: (pack as any).expectedOutcomes || [],
            isPublished: true,
          }),
        );
        continue;
      }

      const mergedAssetIds = [...new Set([...(existing.assetIds || []), ...pack.assetIds])];
      let changed = false;
      if (mergedAssetIds.length !== (existing.assetIds || []).length) {
        existing.assetIds = mergedAssetIds;
        existing.defaultModules = [
          ...new Set([...(existing.defaultModules || []), ...pack.defaultModules]),
        ];
        existing.targetRoles = [
          ...new Set([...(existing.targetRoles || []), ...((pack as any).targetRoles || [])]),
        ];
        changed = true;
      }
      const buyerFields: Array<keyof typeof existing> = [
        'buyerPersona',
        'decisionMaker',
        'stakeholders',
        'expectedOutcomes',
      ];
      for (const field of buyerFields) {
        if (!(existing[field] as string[] | undefined)?.length) {
          (existing as any)[field] = (pack as any)[field] || [];
          changed = true;
        }
      }
      if ((pack as any).salesMetadata && !existing.salesMetadata) {
        existing.salesMetadata = (pack as any).salesMetadata;
        changed = true;
      }
      if (changed) {
        await this.packRepository.save(existing);
      }
    }
  }

  private createSeedAssetRow(asset: SeedPlatformAsset) {
    return this.assetRepository.create({
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
      primaryDepartment: asset.primaryDepartment,
      secondaryDepartments: asset.secondaryDepartments,
      recommendedRoles: asset.recommendedRoles,
      requiredPermissions: asset.requiredPermissions,
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
  }

  private mergeSeedAsset(existing: PlatformAsset, asset: SeedPlatformAsset) {
    const seedRow = this.createSeedAssetRow(asset);
    return this.assetRepository.create({
      ...existing,
      ...seedRow,
      lifecycle: existing.lifecycle || seedRow.lifecycle,
      packIds: [...new Set([...(existing.packIds || []), ...(seedRow.packIds || [])])],
      dependencies: [
        ...new Set([...(existing.dependencies || []), ...(seedRow.dependencies || [])]),
      ],
    });
  }

  private seedAssetChanged(existing: PlatformAsset, repaired: PlatformAsset) {
    return SEED_ASSET_SYNC_FIELDS.some(
      (field) =>
        JSON.stringify(existing[field] ?? null) !== JSON.stringify(repaired[field] ?? null),
    );
  }

  private async saveSeedAsset(asset: SeedPlatformAsset) {
    const row = this.createSeedAssetRow(asset);
    this.assetRegistryService.validateAsset(row);
    await this.assetRepository.save(row);
  }
}
