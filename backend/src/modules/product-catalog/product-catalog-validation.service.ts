import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { REQUIRED_SELLABLE_PRODUCT_NAMES } from './data/product-catalog-seed.data';
import { Product } from './entities/product.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { CarePathway } from './entities/care-pathway.entity';

@Injectable()
export class ProductCatalogValidationService {
  private readonly logger = new Logger(ProductCatalogValidationService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(SpecialtyCatalog)
    private readonly specialtyRepository: Repository<SpecialtyCatalog>,
    @InjectRepository(CarePathway)
    private readonly pathwayRepository: Repository<CarePathway>,
  ) {}

  async validateCatalogReferences(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const assets = await this.assetRepository.find();
    const assetIds = new Set(assets.map((a) => a.id));
    const packs = await this.packRepository.find();
    const packMap = new Map(packs.map((p) => [p.id, p]));
    const packagedAssetIds = new Set<string>();

    for (const pack of packs) {
      for (const assetId of pack.assetIds || []) {
        if (!assetIds.has(assetId)) {
          errors.push(`Pack ${pack.slug}: unknown asset ${assetId}`);
        }
        packagedAssetIds.add(assetId);
      }
    }

    const products = await this.productRepository.find();
    const productNames = new Set(products.map((product) => product.name));
    for (const requiredName of REQUIRED_SELLABLE_PRODUCT_NAMES) {
      if (!productNames.has(requiredName)) {
        errors.push(`Missing required sellable product ${requiredName}`);
      }
    }

    for (const product of products) {
      for (const packId of product.packIds || []) {
        if (!packMap.has(packId)) {
          errors.push(`Product ${product.slug}: unknown pack ${packId}`);
        }
      }
      const packAssetUnion = new Set<string>();
      for (const packId of product.packIds || []) {
        packMap.get(packId)?.assetIds?.forEach((id) => packAssetUnion.add(id));
      }
      for (const assetId of product.highlightAssetIds || []) {
        if (!assetIds.has(assetId)) {
          errors.push(`Product ${product.slug}: highlight asset missing ${assetId}`);
        } else if (packAssetUnion.size && !packAssetUnion.has(assetId)) {
          errors.push(`Product ${product.slug}: highlight ${assetId} not in pack union`);
        }
      }
    }

    for (const asset of assets) {
      if (!packagedAssetIds.has(asset.id) && !this.isExplicitlyInternalAsset(asset)) {
        errors.push(`Asset ${asset.id}: not assigned to any pack or marked internal/developer-only`);
      }
    }

    const specialties = await this.specialtyRepository.find();
    for (const row of specialties) {
      for (const id of row.assetIds || []) {
        if (!assetIds.has(id)) errors.push(`Specialty ${row.slug}: missing asset ${id}`);
      }
    }

    const pathways = await this.pathwayRepository.find();
    for (const row of pathways) {
      const ids = [
        ...(row.calculatorAssetIds || []),
        ...(row.protocolAssetIds || []),
        ...(row.workflowAssetIds || []),
        ...(row.simulationAssetIds || []),
        ...(row.aiAgentId ? [row.aiAgentId] : []),
      ];
      for (const id of ids) {
        if (!assetIds.has(id)) errors.push(`Pathway ${row.slug}: missing asset ${id}`);
      }
    }

    if (errors.length) {
      this.logger.warn(`Catalog validation: ${errors.length} issue(s)`);
      errors.slice(0, 10).forEach((e) => this.logger.warn(e));
    }

    return { valid: errors.length === 0, errors };
  }

  private isExplicitlyInternalAsset(asset: PlatformAsset): boolean {
    const governance = asset.governance || {};
    return (
      governance.internal === true ||
      governance.developerOnly === true ||
      governance.adminOnly === true ||
      governance.visibility === 'internal' ||
      governance.visibility === 'developer-only' ||
      governance.visibility === 'admin-only' ||
      governance.audience === 'internal' ||
      governance.audience === 'developer-only' ||
      governance.audience === 'admin-only'
    );
  }
}
