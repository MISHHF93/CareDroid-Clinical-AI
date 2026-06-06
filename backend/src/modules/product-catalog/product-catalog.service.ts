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
import {
  IntegrationCategory,
  IntegrationReadinessStatus,
  IntegrationStatus,
} from './enums/product-catalog.enums';

const AGENT_REGISTRY_ORDER = [
  'agent-clinical',
  'agent-emergency',
  'agent-lab',
  'agent-operations',
  'agent-fleet',
  'agent-governance',
  'agent-research',
  'agent-education',
];

const OUTCOME_NORMALIZATION_RULES = [
  {
    label: 'Reduce triage time',
    matches: ['triage', 'risk stratification', 'emergency'],
  },
  {
    label: 'Improve sepsis detection',
    matches: ['sepsis', 'deterioration'],
  },
  {
    label: 'Improve protocol adherence',
    matches: ['protocol', 'pathway adherence', 'audit readiness', 'bundle compliance', 'acs pathway'],
  },
  {
    label: 'Improve simulation readiness',
    matches: ['simulation', 'competency', 'scenario', 'training'],
  },
  {
    label: 'Improve asset visibility',
    matches: ['asset visibility', 'capacity visibility', 'operations command', 'fleet visibility'],
  },
  {
    label: 'Improve device uptime',
    matches: ['device uptime', 'maintenance', 'telemetry'],
  },
];

const INTEGRATION_READINESS_CATALOG = [
  { id: 'fhir', name: 'FHIR', category: IntegrationCategory.FHIR },
  { id: 'hl7', name: 'HL7', category: IntegrationCategory.HL7 },
  { id: 'pacs', name: 'PACS', category: IntegrationCategory.PACS },
  { id: 'lis', name: 'LIS', category: IntegrationCategory.LABORATORY },
  { id: 'emr-ehr', name: 'EMR/EHR', category: IntegrationCategory.EMR_EHR },
  { id: 'identity-providers', name: 'Identity Providers', category: IntegrationCategory.IDENTITY },
  { id: 'government-apis', name: 'Government APIs', category: IntegrationCategory.GOVERNMENT_APIS },
  { id: 'scheduling-systems', name: 'Scheduling Systems', category: IntegrationCategory.SCHEDULING },
] as const;

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
      const productPacks = productPackIds
        .map((packId) => packMap.get(packId))
        .filter(Boolean) as AssetPack[];
      const roles = this.resolveProductRoles(product, productPacks, productAssets);
      const workspaces = this.resolveProductWorkspaces(productPacks, productAssets);
      const outcomeMappings = this.resolveProductOutcomeMappings(product, productPacks, productAssets);

      return {
        product: {
          ...this.serializeProduct(product),
          roles,
          workspaces,
        },
        packs: productPackIds.map((packId) =>
          this.serializeBuilderPack(packMap.get(packId), product.id, assetMap, context, options),
        ),
        assets: productAssets.map((asset) =>
          this.serializeBuilderAsset(asset, context, options, productPackIds),
        ),
        roles,
        workspaces,
        outcomeMappings,
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
        buyerPersona: p.buyerPersona || [],
        decisionMaker: p.decisionMaker || [],
        stakeholders: p.stakeholders || [],
        expectedOutcomes: p.expectedOutcomes || [],
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
      ...(pathway.aiAgentId ? [pathway.aiAgentId] : []),
    ];
    const assets = allIds.length
      ? await this.assetRepository.find({ where: { id: In(allIds) } })
      : [];
    const assetMap = new Map(assets.map((a) => [a.id, this.serializeAsset(a)]));
    const calculators = this.serializePathwayAssets(pathway.calculatorAssetIds, assetMap);
    const protocols = this.serializePathwayAssets(pathway.protocolAssetIds, assetMap);
    const workflows = this.serializePathwayAssets(pathway.workflowAssetIds, assetMap);
    const simulations = this.serializePathwayAssets(pathway.simulationAssetIds, assetMap);
    const aiAgent = pathway.aiAgentId ? assetMap.get(pathway.aiAgentId) || { id: pathway.aiAgentId } : null;

    return {
      ...pathway,
      calculators,
      protocols,
      workflows,
      simulations,
      aiAgent,
      sections: {
        calculators,
        protocols,
        workflows,
        simulations,
      },
      linkedAssetCounts: {
        calculators: calculators.length,
        protocols: protocols.length,
        workflows: workflows.length,
        simulations: simulations.length,
        aiAgents: aiAgent ? 1 : 0,
      },
      steps: this.buildPathwaySteps(pathway, assetMap),
    };
  }

  async listAgents() {
    const rows = await this.assetRepository.find({
      where: { assetType: PlatformAssetType.AI_AGENT },
      order: { title: 'ASC' },
    });
    const registryRows = rows
      .filter((agent) => AGENT_REGISTRY_ORDER.includes(agent.id))
      .sort((a, b) => AGENT_REGISTRY_ORDER.indexOf(a.id) - AGENT_REGISTRY_ORDER.indexOf(b.id));
    const accessAssetIds = [
      ...new Set(registryRows.flatMap((agent) => this.agentAssetAccessIds(agent))),
    ];
    const accessAssets = accessAssetIds.length
      ? await this.assetRepository.find({ where: { id: In(accessAssetIds) }, order: { title: 'ASC' } })
      : [];
    const assetById = new Map(accessAssets.map((asset) => [asset.id, asset]));

    return registryRows.map((agent) => {
      const policy = this.agentPolicy(agent);
      const assetAccessIds = this.agentAssetAccessIds(agent);
      return {
        id: agent.id,
        title: agent.title,
        description: agent.description,
        route: agent.route || '/assistant',
        launchType: agent.launchType,
        category: agent.category,
        gatewayNote: 'Common assistant gateway',
        capabilities: this.stringArray(policy.capabilities),
        assetAccessIds,
        assetAccess: assetAccessIds.map((assetId) => {
          const asset = assetById.get(assetId);
          return {
            id: assetId,
            title: asset?.title || assetId,
            assetType: asset?.assetType,
            category: asset?.category,
            route: asset?.route,
            launchType: asset?.launchType,
            riskLevel: asset?.riskLevel,
          };
        }),
        workspaceAwareness: this.stringArray(policy.workspaceAwareness || agent.workspaceTags),
        roleAwareness: this.stringArray(policy.roleAwareness || agent.intendedRoles),
        toolCallingPermissions: this.stringArray(policy.toolCallingPermissions),
        canCallTools: policy.canCallTools !== false,
        permissionPolicy: agent.permissionPolicy || {},
        governance: agent.governance || {},
        lifecycle: agent.lifecycle,
        pricingTier: agent.pricingTier,
        packIds: agent.packIds || [],
      };
    });
  }

  async listIntegrations(category?: string) {
    const rows = await this.integrationRepository.find({ order: { sortOrder: 'ASC' } });
    if (!category) return rows;
    return rows.filter((r) => r.category === category);
  }

  async getIntegrationReadiness() {
    const rows = await this.integrationRepository.find({ order: { sortOrder: 'ASC' } });
    const byCategory = new Map<string, IntegrationOffering>();
    for (const row of rows) {
      if (!byCategory.has(row.category)) byCategory.set(row.category, row);
    }

    const integrations = INTEGRATION_READINESS_CATALOG.map((item) => {
      const offering = byCategory.get(item.category);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        status: this.toReadinessStatus(offering?.status),
        sourceStatus: offering?.status || null,
        offeringId: offering?.id || null,
        slug: offering?.slug || null,
        description: offering?.description || null,
        docsUrl: offering?.docsUrl || null,
        linkedAssetId: offering?.linkedAssetId || null,
      };
    });

    return {
      integrations,
      statuses: Object.values(IntegrationReadinessStatus),
      summary: Object.values(IntegrationReadinessStatus).reduce(
        (acc, status) => ({
          ...acc,
          [status]: integrations.filter((item) => item.status === status).length,
        }),
        {} as Record<string, number>,
      ),
      generatedAt: new Date().toISOString(),
    };
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

  private serializePathwayAssets(
    ids: string[] = [],
    assetMap: Map<string, ReturnType<typeof this.serializeAsset>>,
  ) {
    return ids.map((id) => assetMap.get(id) || { id });
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
      roles: this.resolvePackRoles(pack, assets),
      workspaces: this.resolvePackWorkspaces(pack, assets),
      pricingTier: pack.pricingTier,
      salesMetadata: pack.salesMetadata,
      buyerPersona: pack.buyerPersona || [],
      decisionMaker: pack.decisionMaker || [],
      stakeholders: pack.stakeholders || [],
      expectedOutcomes: pack.expectedOutcomes || [],
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
      roles: this.resolveAssetRoles(asset),
      workspaces: this.resolveAssetWorkspaces(asset),
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
      buyerPersona: product.buyerPersona || [],
      decisionMaker: product.decisionMaker || [],
      stakeholders: product.stakeholders || [],
      expectedOutcomes: product.expectedOutcomes || [],
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
      roles: this.resolveAssetRoles(asset),
      workspaces: this.resolveAssetWorkspaces(asset),
    };
  }

  private resolveProductRoles(
    product: Product,
    packs: AssetPack[],
    assets: PlatformAsset[],
  ): string[] {
    return this.uniqueStrings([
      ...(product.targetUsers || []),
      ...packs.flatMap((pack) => this.resolvePackRoles(pack, [])),
      ...assets.flatMap((asset) => this.resolveAssetRoles(asset)),
    ]);
  }

  private resolveProductWorkspaces(packs: AssetPack[], assets: PlatformAsset[]): string[] {
    return this.uniqueStrings([
      ...packs.flatMap((pack) => this.resolvePackWorkspaces(pack, [])),
      ...assets.flatMap((asset) => this.resolveAssetWorkspaces(asset)),
    ]);
  }

  private resolveProductOutcomeMappings(
    product: Product,
    packs: AssetPack[],
    assets: PlatformAsset[],
  ) {
    const sourceOutcomes = this.uniqueStrings([
      ...(product.outcomes || []),
      ...(product.expectedOutcomes || []),
      ...packs.flatMap((pack) => pack.expectedOutcomes || []),
      ...packs.flatMap((pack) =>
        Array.isArray((pack.salesMetadata as any)?.outcomes)
          ? ((pack.salesMetadata as any).outcomes as string[])
          : [],
      ),
    ]);
    const outcomes = this.normalizeOutcomeLabels(sourceOutcomes);
    return outcomes.map((outcome) => ({
      outcome,
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
      },
      packs: packs.map((pack) => ({
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
        description: pack.description,
        assetIds: pack.assetIds || [],
      })),
      assets: assets.map((asset) => this.serializeAsset(asset)),
    }));
  }

  private toReadinessStatus(status?: IntegrationStatus | string | null): IntegrationReadinessStatus {
    if (status === IntegrationStatus.AVAILABLE) return IntegrationReadinessStatus.SUPPORTED;
    if (status === IntegrationStatus.BETA) return IntegrationReadinessStatus.DEMO;
    if (status === IntegrationStatus.ROADMAP) return IntegrationReadinessStatus.PLANNED;
    return IntegrationReadinessStatus.UNAVAILABLE;
  }

  private normalizeOutcomeLabels(outcomes: string[]): string[] {
    const normalized = new Set<string>();
    for (const outcome of outcomes) {
      const lower = outcome.toLowerCase();
      const matched = OUTCOME_NORMALIZATION_RULES.filter((rule) =>
        rule.matches.some((match) => lower.includes(match)),
      );
      if (matched.length) {
        matched.forEach((rule) => normalized.add(rule.label));
      } else if (outcome.trim()) {
        normalized.add(outcome);
      }
    }
    return [...normalized];
  }

  private resolvePackRoles(pack: AssetPack, assets: PlatformAsset[]): string[] {
    return this.uniqueStrings([
      ...(pack.targetRoles || []),
      ...assets.flatMap((asset) => this.resolveAssetRoles(asset)),
    ]);
  }

  private resolvePackWorkspaces(pack: AssetPack, assets: PlatformAsset[]): string[] {
    return this.uniqueStrings([
      ...(pack.defaultModules || []),
      ...assets.flatMap((asset) => this.resolveAssetWorkspaces(asset)),
    ]);
  }

  private resolveAssetRoles(asset: PlatformAsset): string[] {
    return this.uniqueStrings([...(asset.intendedRoles || []), ...(asset.roleProfiles || [])]);
  }

  private resolveAssetWorkspaces(asset: PlatformAsset): string[] {
    return this.uniqueStrings(asset.workspaceTags || []);
  }

  private uniqueStrings(values: unknown[]): string[] {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())))];
  }

  private agentPolicy(agent: PlatformAsset): Record<string, any> {
    return agent.permissionPolicy && typeof agent.permissionPolicy === 'object'
      ? agent.permissionPolicy
      : {};
  }

  private agentAssetAccessIds(agent: PlatformAsset): string[] {
    return this.stringArray(this.agentPolicy(agent).assetAccess);
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
