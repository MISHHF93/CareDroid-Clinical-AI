import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { PlatformAssetType } from '../platform-assets/enums/platform-asset.enums';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { Organization } from '../workspaces/entities/organization.entity';
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
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly entitlementService: EntitlementService,
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

  async getProductBuilderGraph(
    slug?: string,
    organizationId?: string,
    options: { userRole?: string; subscriptionPlan?: string } = {},
  ) {
    const products = slug
      ? [await this.getProductBySlug(slug)]
      : await this.productRepository.find({ order: { sortOrder: 'ASC' } });

    const packIds = [...new Set(products.flatMap((product) => product.packIds || []))];
    const packs = packIds.length
      ? await this.packRepository.find({ where: { id: In(packIds) }, order: { name: 'ASC' } })
      : [];
    const packMap = new Map(packs.map((pack) => [pack.id, pack]));

    const assetIds = [
      ...new Set([
        ...products.flatMap((product) => product.highlightAssetIds || []),
        ...packs.flatMap((pack) => pack.assetIds || []),
      ]),
    ];
    const assets = assetIds.length
      ? await this.assetRepository.find({ where: { id: In(assetIds) }, order: { title: 'ASC' } })
      : [];
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

    const context = await this.buildBuilderAccessContext(organizationId);

    const productGraphs = products.map((product) => {
      const productPackIds = product.packIds || [];
      const productAssetIds = new Set<string>(product.highlightAssetIds || []);
      productPackIds.forEach((packId) => {
        packMap.get(packId)?.assetIds?.forEach((assetId) => productAssetIds.add(assetId));
      });

      const productAssets = [...productAssetIds]
        .map((assetId) => assetMap.get(assetId))
        .filter(Boolean) as PlatformAsset[];

      return {
        product: this.serializeProduct(product),
        packs: productPackIds.map((packId) =>
          this.serializeBuilderPack(packMap.get(packId), product.id, assetMap, context, options),
        ),
        assets: productAssets.map((asset) =>
          this.serializeBuilderAsset(asset, context, options, productPackIds),
        ),
        routes: productAssets
          .filter((asset) => asset.route)
          .map((asset) => ({
            assetId: asset.id,
            title: asset.title,
            route: asset.route,
            launchType: asset.launchType,
          })),
        backendServices: [
          ...new Set(productAssets.flatMap((asset) => this.resolveBackendServices(asset))),
        ],
      };
    });

    return slug ? productGraphs[0] : productGraphs;
  }

  async getAssetPackBuilderGraph(
    organizationId?: string,
    options: { userRole?: string; subscriptionPlan?: string } = {},
  ) {
    const [products, packs] = await Promise.all([
      this.productRepository.find({ order: { sortOrder: 'ASC' } }),
      this.packRepository.find({ order: { name: 'ASC' } }),
    ]);
    const assetIds = [...new Set(packs.flatMap((pack) => pack.assetIds || []))];
    const assets = assetIds.length
      ? await this.assetRepository.find({ where: { id: In(assetIds) }, order: { title: 'ASC' } })
      : [];
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const productMap = new Map<string, Product[]>();

    products.forEach((product) => {
      product.packIds?.forEach((packId) => {
        productMap.set(packId, [...(productMap.get(packId) || []), product]);
      });
    });

    const context = await this.buildBuilderAccessContext(organizationId);

    return packs.map((pack) => ({
      ...this.serializeBuilderPack(pack, undefined, assetMap, context, options),
      products: (productMap.get(pack.id) || []).map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
      })),
    }));
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

  async getProductAssets(
    slug: string,
    organizationId?: string,
    options: { userRole?: string; subscriptionPlan?: string } = {},
  ) {
    const product = await this.getProductBySlug(slug);
    const packs = await this.packRepository.find({
      where: { id: In(product.packIds) },
    });
    const assetIdSet = new Set<string>();
    product.highlightAssetIds?.forEach((id) => assetIdSet.add(id));
    packs.forEach((pack) => pack.assetIds?.forEach((id) => assetIdSet.add(id)));

    let organization: Organization | null = null;
    let entitledAssetIds: string[] = [];
    let entitledPackIds: string[] = [];
    if (organizationId) {
      organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
      entitledAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
        organizationId,
      });
      entitledPackIds = (await this.platformAssetsService.getOrganizationEntitlements(organizationId)).map(
        (row) => row.packId,
      );
    }

    const assets = await this.assetRepository.find({
      where: { id: In([...assetIdSet]) },
      order: { title: 'ASC' },
    });

    const serializedAssets = assets.map((asset) => {
      const access = this.entitlementService.resolveDecisionFromContext({
        assetId: asset.id,
        asset,
        organization,
        organizationId,
        userRole: options.userRole,
        subscriptionPlan: options.subscriptionPlan,
        entitledAssetIds,
        entitledPackIds,
        strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
      });
      return {
        ...this.serializeAsset(asset),
        access,
        entitlementStatus: access.isLaunchable ? 'entitled' : access.state,
        isVisible: access.isVisible,
        isLaunchable: access.isLaunchable,
      };
    });

    return {
      product: this.serializeProduct(product),
      packs: packs.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        targetRoles: p.targetRoles,
        requiredDependencies: p.requiredDependencies,
        defaultModules: p.defaultModules,
        pricingTier: p.pricingTier,
        salesMetadata: p.salesMetadata,
      })),
      assets: serializedAssets,
      assetsByType: this.groupSerializedAssetsByType(serializedAssets),
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

  async reconcileOrganizationCommercialPlan(
    organizationId: string,
    commercialPlanId: string,
    options: { disableRemovedPacks?: boolean } = {},
  ) {
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const targetPackIds = new Set(await this.resolvePackIdsForPlan(commercialPlanId));
    targetPackIds.add('core-platform');

    const installedPackIds: string[] = [];
    const failedPackIds: string[] = [];
    for (const packId of targetPackIds) {
      try {
        await this.platformAssetsService.installPackForOrganization(organizationId, packId);
        installedPackIds.push(packId);
      } catch {
        failedPackIds.push(packId);
      }
    }

    const disabledPackIds: string[] = [];
    if (options.disableRemovedPacks) {
      const current = await this.platformAssetsService.getOrganizationEntitlements(organizationId);
      for (const entitlement of current) {
        if (!targetPackIds.has(entitlement.packId) && entitlement.packId !== 'core-platform') {
          const result = await this.platformAssetsService.removePackFromOrganization(
            organizationId,
            entitlement.packId,
          );
          if (result.removed) disabledPackIds.push(entitlement.packId);
        }
      }
    }

    org.settings = {
      ...(org.settings || {}),
      commercialPlanId,
      commercialPlanReconciledAt: new Date().toISOString(),
      commercialPlanPackIds: [...targetPackIds],
    };
    await this.organizationRepository.save(org);

    return {
      organizationId,
      commercialPlanId,
      targetPackIds: [...targetPackIds],
      installedPackIds,
      failedPackIds,
      disabledPackIds,
    };
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
      Object.entries(groups).map(([type, rows]) => [type, rows.map((a) => this.serializeAsset(a))]),
    );
  }

  private groupSerializedAssetsByType(assets: Array<Record<string, any>>) {
    const groups: Record<string, typeof assets> = {};
    for (const asset of assets) {
      const key = asset.assetType || 'tool';
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    }
    return groups;
  }

  private async buildBuilderAccessContext(organizationId?: string) {
    if (!organizationId) {
      return {
        organization: null as Organization | null,
        entitledAssetIds: [] as string[],
        entitledPackIds: [] as string[],
      };
    }

    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    const entitledAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
      organizationId,
    });
    const entitledPackIds = (
      await this.platformAssetsService.getOrganizationEntitlements(organizationId)
    ).map((row) => row.packId);

    return { organization, entitledAssetIds, entitledPackIds };
  }

  private serializeBuilderPack(
    pack: AssetPack | undefined,
    productId: string | undefined,
    assetMap: Map<string, PlatformAsset>,
    context: {
      organization: Organization | null;
      entitledAssetIds: string[];
      entitledPackIds: string[];
    },
    options: { userRole?: string; subscriptionPlan?: string },
  ) {
    if (!pack) {
      return {
        id: null,
        missing: true,
        assets: [],
      };
    }

    const assets = (pack.assetIds || [])
      .map((assetId) => assetMap.get(assetId))
      .filter(Boolean) as PlatformAsset[];

    return {
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      description: pack.description,
      productId,
      organizationTypes: pack.organizationTypes,
      targetRoles: pack.targetRoles,
      assetIds: pack.assetIds,
      requiredDependencies: pack.requiredDependencies,
      defaultModules: pack.defaultModules,
      pricingTier: pack.pricingTier,
      salesMetadata: pack.salesMetadata,
      isPublished: pack.isPublished,
      assets: assets.map((asset) =>
        this.serializeBuilderAsset(asset, context, options, [pack.id]),
      ),
    };
  }

  private serializeBuilderAsset(
    asset: PlatformAsset,
    context: {
      organization: Organization | null;
      entitledAssetIds: string[];
      entitledPackIds: string[];
    },
    options: { userRole?: string; subscriptionPlan?: string },
    fallbackPackIds: string[] = [],
  ) {
    const packIds = asset.packIds?.length ? asset.packIds : fallbackPackIds;
    const access = this.entitlementService.resolveDecisionFromContext({
      assetId: asset.id,
      asset,
      organization: context.organization,
      organizationId: context.organization?.id,
      userRole: options.userRole,
      subscriptionPlan: options.subscriptionPlan,
      entitledAssetIds: context.entitledAssetIds,
      entitledPackIds: context.entitledPackIds,
      strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
    });

    return {
      ...this.serializeAsset(asset),
      packIds,
      dependencies: asset.dependencies,
      backendStatus: asset.backendStatus,
      demoStatus: asset.demoStatus,
      lifecycle: asset.lifecycle,
      pricingTier: asset.pricingTier,
      governance: asset.governance,
      route: asset.route,
      backendServices: this.resolveBackendServices(asset),
      access,
      isLaunchable: access.isLaunchable,
    };
  }

  private resolveBackendServices(asset: PlatformAsset): string[] {
    const services = new Set<string>();

    if (asset.backendStatus) services.add(`backend:${asset.backendStatus}`);
    if (asset.assetType === PlatformAssetType.AI_AGENT || asset.route === '/assistant') {
      services.add('AiModule');
    }
    if (asset.route?.startsWith('/tools') || asset.assetType === PlatformAssetType.CALCULATOR) {
      services.add('ClinicalTools');
    }
    if (asset.assetType === PlatformAssetType.MAP || asset.id.includes('twin')) {
      services.add('DigitalTwinService');
    }
    if (asset.assetType === PlatformAssetType.IOT || asset.id.includes('device')) {
      services.add('PlatformAssetsService');
    }
    if (asset.assetType === PlatformAssetType.FLEET || asset.id.includes('fleet')) {
      services.add('FleetOperations');
    }
    if (asset.assetType === PlatformAssetType.GOVERNANCE || asset.id.includes('audit')) {
      services.add('PlatformGovernanceService');
    }

    if (!services.size) services.add('PlatformAssetsService');
    return [...services];
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
      targetUsers: product.targetUsers,
      requiredBackendCapabilities: product.requiredBackendCapabilities,
      requiredIntegrations: product.requiredIntegrations,
      aiWorkflows: product.aiWorkflows,
      dashboards: product.dashboards,
      pricingTierPlaceholder: product.pricingTierPlaceholder,
      readinessLabels: product.readinessLabels,
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
