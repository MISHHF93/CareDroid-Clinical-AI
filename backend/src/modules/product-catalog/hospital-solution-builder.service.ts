import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DepartmentId,
  departmentName,
  normalizeDepartmentId,
} from '../platform-assets/department-taxonomy';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import {
  ServiceLineId,
  serviceLineIdsForDepartment,
  serviceLineName,
} from '../platform-assets/service-line-taxonomy';
import { OrganizationsService } from '../organizations/organizations.service';
import { User } from '../users/entities/user.entity';
import {
  ApplyHospitalSolutionDto,
  HospitalSolutionRecommendationDto,
} from './dto/hospital-solution-builder.dto';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';
import { CommercialPlanId, ProductType } from './enums/product-catalog.enums';
import { ProductCatalogService } from './product-catalog.service';

const SERVICE_LINE_PRODUCT_MAP: Partial<Record<ServiceLineId, string[]>> = {
  'emergency-medicine': ['product-emergency-department'],
  'critical-care': ['product-icu'],
  cardiology: ['product-cardiology'],
  'laboratory-medicine': ['product-laboratory'],
  operations: [
    'product-hospital-operations',
    'product-digital-twin',
    'product-medical-iot',
    'product-fleet-ems',
    'product-governance',
  ],
  education: ['product-simulation-training'],
  research: ['product-research'],
};

const SERVICE_LINE_AGENT_MAP: Partial<Record<ServiceLineId, string[]>> = {
  'emergency-medicine': ['agent-emergency', 'agent-clinical'],
  'critical-care': ['agent-clinical'],
  cardiology: ['agent-clinical'],
  'laboratory-medicine': ['agent-lab'],
  operations: ['agent-operations', 'agent-fleet', 'agent-governance'],
  education: ['agent-education'],
  research: ['agent-research'],
  neurology: ['agent-clinical'],
  pediatrics: ['agent-clinical'],
  surgery: ['agent-clinical'],
};

const BASE_INTEGRATIONS = ['fhir-patient', 'hl7-adt', 'identity-sso'];
const SERVICE_LINE_INTEGRATION_MAP: Partial<Record<ServiceLineId, string[]>> = {
  'laboratory-medicine': ['laboratory-interface'],
  operations: ['scheduling'],
  education: ['scheduling'],
  research: ['identity-sso'],
};

const DEFAULT_DEPARTMENT_IDS: DepartmentId[] = ['emergency', 'icu', 'laboratory', 'operations'];

function normalizeId(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

@Injectable()
export class HospitalSolutionBuilderService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
    private readonly productCatalogService: ProductCatalogService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async recommend(input: HospitalSolutionRecommendationDto) {
    const hospitalType = normalizeId(input.hospitalType || 'hospital');
    const departmentIds = this.normalizeDepartmentIds(input.departmentIds);
    const serviceLineIds = this.resolveServiceLineIds(departmentIds);
    const selectedPackIds = unique(input.assetPackIds || []);
    const selectedWorkspaceIds = this.normalizeOptionalIds(input.workspaceIds);
    const selectedAgentIds = unique(input.aiAgentIds || []);
    const selectedIntegrationSlugs = unique(input.integrationSlugs || []);
    const goals = unique(input.goals || []);

    const recommendedCommercialPlanId = this.recommendCommercialPlan(
      hospitalType,
      departmentIds,
      serviceLineIds,
      selectedPackIds,
      goals,
    );
    const productIds = unique([
      ...serviceLineIds.flatMap((serviceLineId) => SERVICE_LINE_PRODUCT_MAP[serviceLineId] || []),
      ...this.productIdsForHospitalType(hospitalType),
    ]);
    const products = productIds.length
      ? await this.productRepository.find({
          where: { id: In(productIds) },
          order: { sortOrder: 'ASC' },
        })
      : [];
    const packIds = unique([
      'core-platform',
      ...products.flatMap((product) => product.packIds || []),
      ...selectedPackIds,
    ]);
    const packs = packIds.length
      ? await this.packRepository.find({ where: { id: In(packIds) }, order: { name: 'ASC' } })
      : [];
    const assetIds = unique(packs.flatMap((pack) => pack.assetIds || []));
    const assets = assetIds.length
      ? await this.assetRepository.find({ where: { id: In(assetIds) }, order: { title: 'ASC' } })
      : [];
    const agentIds = unique([
      'agent-clinical',
      ...serviceLineIds.flatMap((serviceLineId) => SERVICE_LINE_AGENT_MAP[serviceLineId] || []),
      ...selectedAgentIds,
    ]);
    const agents = (await this.productCatalogService.listAgents()).filter((agent: any) =>
      agentIds.includes(agent.id),
    );
    const integrationSlugs = unique([
      ...BASE_INTEGRATIONS,
      ...serviceLineIds.flatMap(
        (serviceLineId) => SERVICE_LINE_INTEGRATION_MAP[serviceLineId] || [],
      ),
      ...selectedIntegrationSlugs,
    ]);
    const integrations = integrationSlugs.length
      ? await this.integrationRepository.find({
          where: { slug: In(integrationSlugs) },
          order: { sortOrder: 'ASC' },
        })
      : [];
    const workspaceDefaults = this.buildWorkspaceDefaults(
      unique([...departmentIds, ...selectedWorkspaceIds]),
      packs,
      assets,
      agents,
    );
    const configurationPatch = {
      tenantProfile: {
        hospitalType,
        departmentIds,
        serviceLineIds,
        goals,
      },
      enabledProductIds: products.map((product) => product.id),
      enabledPackIds: packs.map((pack) => pack.id),
      enabledAgentIds: agents.map((agent: any) => agent.id),
      workspaceDefaults,
      integrationsRequested: integrations.map((integration) => integration.slug),
      dashboardLayout: {
        primary: workspaceDefaults[0]?.id || 'command-center',
        sections: ['overview', 'workspaces', 'assets', 'integrations'],
      },
      navigation: {
        primaryLanding: '/dashboard',
        hiddenNavIds: [],
      },
      permissionsOverrides: {},
    };

    return {
      organizationProfile: {
        organizationId: input.organizationId || null,
        hospitalType,
        departmentIds,
        serviceLineIds,
        goals,
      },
      recommendedCommercialPlanId,
      products: products.map((product) => this.serializeProduct(product, departmentIds)),
      packs: packs.map((pack) => this.serializePack(pack)),
      assets: assets.map((asset) => this.serializeAsset(asset)),
      workspaces: workspaceDefaults,
      aiAgents: agents.map((agent: any) => ({
        id: agent.id,
        title: agent.title,
        description: agent.description,
        workspaceAwareness: agent.workspaceAwareness || [],
        assetAccessIds: (agent.assetAccess || []).map((asset: any) => asset.id || asset),
      })),
      integrations: integrations.map((integration) => ({
        id: integration.id,
        slug: integration.slug,
        name: integration.name,
        category: integration.category,
        status: integration.status,
        linkedAssetId: integration.linkedAssetId,
        reason: this.integrationReason(integration.slug),
      })),
      configurationPatch,
      entitlementPlan: {
        commercialPlanId: recommendedCommercialPlanId,
        targetPackIds: packs.map((pack) => pack.id),
      },
      rationale: this.buildRationale(
        hospitalType,
        departmentIds,
        serviceLineIds,
        products,
        packs,
        integrations,
      ),
    };
  }

  async apply(user: User, dto: ApplyHospitalSolutionDto) {
    const recommendation =
      dto.recommendation || (await this.recommend({ organizationId: dto.organizationId }));
    const configurationPatch =
      dto.configurationPatch ||
      (recommendation.configurationPatch as Record<string, unknown>) ||
      {};
    const commercialPlanId =
      dto.commercialPlanId ||
      (recommendation.recommendedCommercialPlanId as string | undefined) ||
      CommercialPlanId.ENTERPRISE;

    const [configuration, entitlementPlan] = await Promise.all([
      this.organizationsService.updateConfiguration(user, dto.organizationId, configurationPatch),
      this.productCatalogService.reconcileOrganizationCommercialPlan(
        dto.organizationId,
        commercialPlanId,
        {
          disableRemovedPacks: false,
        },
      ),
    ]);

    return {
      organizationId: dto.organizationId,
      commercialPlanId,
      configuration,
      entitlementPlan,
      appliedConfigurationPatch: configurationPatch,
    };
  }

  private normalizeDepartmentIds(values?: string[]) {
    const normalized = unique(
      (values || DEFAULT_DEPARTMENT_IDS)
        .map((value) => normalizeDepartmentId(value))
        .filter((departmentId): departmentId is DepartmentId => Boolean(departmentId)),
    );
    return normalized.length ? normalized : DEFAULT_DEPARTMENT_IDS;
  }

  private normalizeOptionalIds(values?: string[]) {
    return unique(
      (values || [])
        .map((value) => normalizeDepartmentId(value))
        .filter((departmentId): departmentId is DepartmentId => Boolean(departmentId)),
    );
  }

  private resolveServiceLineIds(departmentIds: string[]) {
    return unique(
      departmentIds.flatMap((departmentId) => serviceLineIdsForDepartment(departmentId)),
    );
  }

  private productIdsForHospitalType(hospitalType: string) {
    if (['academic_medical_center', 'university'].includes(hospitalType)) {
      return ['product-research', 'product-simulation-training'];
    }
    if (['government', 'public_sector'].includes(hospitalType)) {
      return ['product-governance', 'product-digital-twin'];
    }
    if (hospitalType === 'ems') return ['product-fleet-ems', 'product-emergency-department'];
    return ['product-hospital-operations'];
  }

  private recommendCommercialPlan(
    hospitalType: string,
    departmentIds: string[],
    serviceLineIds: string[],
    selectedPackIds: string[],
    goals: string[],
  ): CommercialPlanId {
    const strategicSignals = new Set([
      ...departmentIds,
      ...serviceLineIds,
      ...goals.map(normalizeId),
      ...selectedPackIds,
    ]);
    if (
      ['government', 'public_sector'].includes(hospitalType) ||
      strategicSignals.has('administration')
    ) {
      return CommercialPlanId.GOVERNMENT;
    }
    if (['academic_medical_center', 'university', 'research_institute'].includes(hospitalType)) {
      return CommercialPlanId.ACADEMIC;
    }
    if (
      strategicSignals.has('operations') ||
      strategicSignals.has('icu') ||
      strategicSignals.has('critical-care') ||
      strategicSignals.has('biomedical-engineering') ||
      strategicSignals.has('digital-twin-pack') ||
      departmentIds.length >= 4
    ) {
      return CommercialPlanId.ENTERPRISE;
    }
    return departmentIds.length <= 1 ? CommercialPlanId.STARTER : CommercialPlanId.PROFESSIONAL;
  }

  private buildWorkspaceDefaults(
    workspaceIds: string[],
    packs: AssetPack[],
    assets: PlatformAsset[],
    agents: any[],
  ) {
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    return workspaceIds.map((workspaceId) => {
      const enabledToolIds = unique(
        packs
          .flatMap((pack) => pack.assetIds || [])
          .filter((assetId) => {
            const asset = assetsById.get(assetId);
            return (
              !asset?.workspaceTags?.length ||
              asset.workspaceTags.some((workspaceTag) => normalizeId(workspaceTag) === workspaceId)
            );
          }),
      ).slice(0, 24);
      const defaultAgent = agents.find((agent) =>
        (agent.workspaceAwareness || []).includes(workspaceId),
      );
      return {
        id: workspaceId,
        name: departmentName(workspaceId),
        type: workspaceId,
        enabledToolIds,
        defaultAiAgentId: defaultAgent?.id || agents[0]?.id || 'agent-clinical',
        enabledModules: unique(['dashboard', workspaceId, 'tools']),
        emergencyModeEnabled: ['emergency', 'icu'].includes(workspaceId),
      };
    });
  }

  private serializeProduct(product: Product, departmentIds: string[]) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      productType: product.productType,
      packIds: product.packIds || [],
      expectedOutcomes: product.expectedOutcomes || [],
      reason: this.productReason(product, departmentIds),
    };
  }

  private serializePack(pack: AssetPack) {
    return {
      id: pack.id,
      slug: pack.slug,
      name: pack.name,
      description: pack.description,
      requiredDependencies: pack.requiredDependencies || [],
      pricingTier: pack.pricingTier,
      assetIds: pack.assetIds || [],
    };
  }

  private serializeAsset(asset: PlatformAsset) {
    return {
      id: asset.id,
      title: asset.title,
      assetType: asset.assetType,
      route: asset.route,
      packIds: asset.packIds || [],
      workspaceTags: asset.workspaceTags || [],
    };
  }

  private productReason(product: Product, departmentIds: string[]) {
    const productType = product.productType as ProductType | string;
    if (productType === ProductType.EMERGENCY_DEPARTMENT) return 'Selected emergency coverage.';
    if (productType === ProductType.ICU) return 'Selected critical care coverage.';
    if (productType === ProductType.HOSPITAL_OPERATIONS)
      return 'Hospital-wide operations visibility.';
    if (departmentIds.includes(String(productType)))
      return `Selected ${this.titleize(productType)} department.`;
    return 'Included by hospital type and deployment goals.';
  }

  private integrationReason(slug: string) {
    if (slug.includes('fhir')) return 'FHIR clinical context exchange.';
    if (slug.includes('hl7')) return 'ADT and operational event ingestion.';
    if (slug.includes('laboratory')) return 'Lab result interpretation and escalation.';
    if (slug.includes('identity')) return 'Enterprise identity and SSO readiness.';
    return 'Requested integration for the deployment.';
  }

  private buildRationale(
    hospitalType: string,
    departmentIds: string[],
    serviceLineIds: string[],
    products: Product[],
    packs: AssetPack[],
    integrations: IntegrationOffering[],
  ) {
    return [
      {
        type: 'hospital-type',
        message: `${this.titleize(hospitalType)} profile selected.`,
      },
      {
        type: 'department',
        message: `${departmentIds.length} departments mapped through ${serviceLineIds.length} canonical service lines to ${products.length} product lines.`,
      },
      {
        type: 'service-line',
        message: `Service lines: ${serviceLineIds.map(serviceLineName).join(', ') || 'none'}.`,
      },
      {
        type: 'packs',
        message: `${packs.length} asset packs define the launchable asset footprint.`,
      },
      {
        type: 'integrations',
        message: `${integrations.length} integrations prepared for implementation planning.`,
      },
    ];
  }

  private titleize(value: string) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
