import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertNoDuplicateAssetIds,
  assertValidAssetRegistryMetadata,
  normalizeAssetLifecycle,
  normalizeRegistryType,
  platformAssetToRegistryMetadata,
} from './asset-registry.schema';
import { PlatformAsset } from './entities/platform-asset.entity';
import { PlatformAssetLifecycle } from './enums/platform-asset.enums';

export type AssetRegistryListParams = {
  query?: string;
  assetType?: string;
  type?: string;
  packId?: string;
  lifecycle?: string;
  lifecycleStatus?: string;
};

export type PlatformAssetRegistryProjection = PlatformAsset & {
  assetId: string;
  type: string;
  lifecycleStatus: string;
  subscriptionTier: string;
  demoLiveStatus: string;
};

@Injectable()
export class AssetRegistryService {
  constructor(
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
  ) {}

  async listAssets(params: AssetRegistryListParams = {}): Promise<PlatformAssetRegistryProjection[]> {
    const rows = await this.assetRepository.find({ order: { title: 'ASC' } });
    return rows
      .map((row) => this.toRegistryProjection(row))
      .filter((row) => this.matchesFilters(row, params));
  }

  async getAssetById(assetId: string): Promise<PlatformAssetRegistryProjection> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`Asset not found: ${assetId}`);
    return this.toRegistryProjection(asset);
  }

  async updateAssetLifecycle(assetId: string, lifecycle: PlatformAssetLifecycle | string) {
    const normalizedLifecycle = normalizeAssetLifecycle(lifecycle);
    if (!normalizedLifecycle) {
      throw new BadRequestException(`Unsupported lifecycle status: ${lifecycle}`);
    }

    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`Asset not found: ${assetId}`);
    asset.lifecycle = normalizedLifecycle as PlatformAssetLifecycle;
    const saved = await this.assetRepository.save(asset);
    return this.toRegistryProjection(saved);
  }

  validateAsset(asset: PlatformAsset) {
    const metadata = platformAssetToRegistryMetadata(asset);
    assertValidAssetRegistryMetadata(metadata, asset.id);
    return metadata;
  }

  validateAssets(assets: PlatformAsset[]) {
    assertNoDuplicateAssetIds(assets.map((asset) => asset.id));
    return assets.map((asset) => this.validateAsset(asset));
  }

  toRegistryProjection(asset: PlatformAsset): PlatformAssetRegistryProjection {
    const metadata = platformAssetToRegistryMetadata(asset);
    assertValidAssetRegistryMetadata(metadata, asset.id);
    return {
      ...asset,
      assetId: metadata.assetId,
      type: metadata.type,
      lifecycleStatus: metadata.lifecycleStatus,
      subscriptionTier: metadata.subscriptionTier,
      demoLiveStatus: metadata.demoStatus,
    };
  }

  private matchesFilters(asset: PlatformAssetRegistryProjection, params: AssetRegistryListParams) {
    const requestedType = params.type || params.assetType;
    if (requestedType && requestedType !== 'all') {
      const normalizedRequestedType = normalizeRegistryType(requestedType);
      const normalizedAssetType = normalizeRegistryType(asset.assetType);
      if (
        requestedType !== asset.assetType &&
        normalizedRequestedType !== normalizeRegistryType(asset.type) &&
        normalizedRequestedType !== normalizedAssetType
      ) {
        return false;
      }
    }

    if (params.packId && !asset.packIds?.includes(params.packId)) return false;

    const requestedLifecycle = params.lifecycleStatus || params.lifecycle;
    if (requestedLifecycle) {
      const lifecycle = normalizeAssetLifecycle(requestedLifecycle);
      if (lifecycle !== asset.lifecycle) return false;
    }

    if (!params.query?.trim()) return true;
    const q = params.query.trim().toLowerCase();
    return [
      asset.id,
      asset.assetId,
      asset.title,
      asset.category,
      asset.type,
      asset.assetType,
      ...(asset.packIds || []),
      ...(asset.workspaceTags || []),
      ...(asset.intendedRoles || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  }
}
