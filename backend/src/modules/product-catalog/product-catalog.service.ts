import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { PlatformAssetType } from '../platform-assets/enums/platform-asset.enums';
import { CarePathway } from './entities/care-pathway.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';

@Injectable()
export class ProductCatalogService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CommercialPlan)
    private readonly planRepository: Repository<CommercialPlan>,
    @InjectRepository(SpecialtyCatalog)
    private readonly specialtyRepository: Repository<SpecialtyCatalog>,
    @InjectRepository(CarePathway)
    private readonly pathwayRepository: Repository<CarePathway>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    private readonly platformAssetsService: PlatformAssetsService,
  ) {}

  async getPackToProductMap(): Promise<Record<string, { slug: string; name: string }[]>> {
    const products = await this.productRepository.find();
    const map: Record<string, { slug: string; name: string }[]> = {};
    for (const product of products) {
      for (const packId of product.packIds || []) {
        if (!map[packId]) map[packId] = [];
        map[packId].push({ slug: product.slug, name: product.name });
      }
    }
    return map;
  }

  async listProducts(publishedOnly = true) {
    const rows = await this.productRepository.find({ order: { sortOrder: 'ASC' } });
    return publishedOnly ? rows.filter((r) => r.isPublished) : rows;
  }

  async getProductBySlug(slug: string) {
    const product = await this.productRepository.findOne({ where: { slug } });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  async getProductAssets(slug: string, organizationId?: string) {
    const product = await this.getProductBySlug(slug);
    const packs = await this.packRepository.find({
      where: { id: In(product.packIds) },
    });
    const assetIdSet = new Set<string>();
    product.highlightAssetIds?.forEach((id) => assetIdSet.add(id));
    packs.forEach((pack) => pack.assetIds?.forEach((id) => assetIdSet.add(id)));

    let entitledIds: Set<string> | null = null;
    if (organizationId) {
      const entitled = await this.platformAssetsService.resolveEntitledAssetIds({
        organizationId,
      });
      entitledIds = new Set(entitled);
    }

    const assets = await this.assetRepository.find({
      where: { id: In([...assetIdSet]) },
      order: { title: 'ASC' },
    });

    const filtered = entitledIds
      ? assets.filter((a) => entitledIds!.has(a.id))
      : assets;

    return {
      product: this.serializeProduct(product),
      packs: packs.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
      })),
      assets: filtered.map((a) => this.serializeAsset(a)),
      assetsByType: this.groupAssetsByType(filtered),
    };
  }

  async listCommercialPlans() {
    return this.planRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async getCommercialPlan(id: string) {
    const plan = await this.planRepository.findOne({ where: { id: id as any } });
    if (!plan) throw new NotFoundException(`Commercial plan not found: ${id}`);
    const products = plan.includedProductIds?.length
      ? await this.productRepository.find({ where: { id: In(plan.includedProductIds) } })
      : [];
    return { ...plan, products: products.map((p) => this.serializeProduct(p)) };
  }

  async listSpecialties() {
    return this.specialtyRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async getSpecialtyBySlug(slug: string) {
    const specialty = await this.specialtyRepository.findOne({ where: { slug } });
    if (!specialty) throw new NotFoundException(`Specialty not found: ${slug}`);
    const assets = specialty.assetIds?.length
      ? await this.assetRepository.find({ where: { id: In(specialty.assetIds) } })
      : [];
    return {
      ...specialty,
      assets: assets.map((a) => this.serializeAsset(a)),
    };
  }

  async listCarePathways() {
    return this.pathwayRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async getCarePathwayBySlug(slug: string) {
    const pathway = await this.pathwayRepository.findOne({ where: { slug } });
    if (!pathway) throw new NotFoundException(`Care pathway not found: ${slug}`);
    const allIds = [
      ...(pathway.calculatorAssetIds || []),
      ...(pathway.protocolAssetIds || []),
      ...(pathway.workflowAssetIds || []),
      ...(pathway.simulationAssetIds || []),
    ];
    const assets = allIds.length
      ? await this.assetRepository.find({ where: { id: In(allIds) } })
      : [];
    const assetMap = new Map(assets.map((a) => [a.id, this.serializeAsset(a)]));
    return {
      ...pathway,
      steps: this.buildPathwaySteps(pathway, assetMap),
    };
  }

  async listAgents() {
    const rows = await this.assetRepository.find({
      where: { assetType: PlatformAssetType.AI_AGENT },
      order: { title: 'ASC' },
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      route: a.route || '/assistant',
      launchType: a.launchType,
      category: a.category,
      gatewayNote: 'Common assistant gateway',
    }));
  }

  async listIntegrations(category?: string) {
    const rows = await this.integrationRepository.find({ order: { sortOrder: 'ASC' } });
    if (!category) return rows;
    return rows.filter((r) => r.category === category);
  }

  async resolvePackIdsForProductIds(productIds: string[]): Promise<string[]> {
    if (!productIds?.length) return [];
    const products = await this.productRepository.find({ where: { id: In(productIds) } });
    const packIds = new Set<string>();
    products.forEach((p) => p.packIds?.forEach((id) => packIds.add(id)));
    return [...packIds];
  }

  async resolvePackIdsForPlan(planId: string): Promise<string[]> {
    const plan = await this.getCommercialPlan(planId);
    const packIds = new Set<string>(plan.includedPackIds || []);
    const fromProducts = await this.resolvePackIdsForProductIds(plan.includedProductIds || []);
    fromProducts.forEach((id) => packIds.add(id));
    return [...packIds];
  }

  private buildPathwaySteps(
    pathway: CarePathway,
    assetMap: Map<string, ReturnType<typeof this.serializeAsset>>,
  ) {
    const steps: Array<{ type: string; assetId: string; asset: unknown }> = [];
    pathway.calculatorAssetIds?.forEach((id) => {
      steps.push({ type: 'calculator', assetId: id, asset: assetMap.get(id) || { id } });
    });
    pathway.protocolAssetIds?.forEach((id) => {
      steps.push({ type: 'protocol', assetId: id, asset: assetMap.get(id) || { id } });
    });
    pathway.workflowAssetIds?.forEach((id) => {
      steps.push({ type: 'workflow', assetId: id, asset: assetMap.get(id) || { id } });
    });
    pathway.simulationAssetIds?.forEach((id) => {
      steps.push({ type: 'simulation', assetId: id, asset: assetMap.get(id) || { id } });
    });
    return steps;
  }

  private groupAssetsByType(assets: PlatformAsset[]) {
    const groups: Record<string, typeof assets> = {};
    for (const asset of assets) {
      const key = asset.assetType || 'tool';
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    }
    return Object.fromEntries(
      Object.entries(groups).map(([type, rows]) => [
        type,
        rows.map((a) => this.serializeAsset(a)),
      ]),
    );
  }

  private serializeProduct(product: Product) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      productType: product.productType,
      packIds: product.packIds,
      highlightAssetIds: product.highlightAssetIds,
      outcomes: product.outcomes,
      targetBuyers: product.targetBuyers,
      complexity: product.complexity,
      commercialPlanIds: product.commercialPlanIds,
    };
  }

  private serializeAsset(asset: PlatformAsset) {
    return {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      assetType: asset.assetType,
      category: asset.category,
      route: asset.route,
      launchType: asset.launchType,
      packIds: asset.packIds,
    };
  }
}
