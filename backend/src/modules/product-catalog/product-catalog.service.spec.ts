import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { Product } from './entities/product.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { CarePathway } from './entities/care-pathway.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { ProductCatalogService } from './product-catalog.service';
import { Organization } from '../workspaces/entities/organization.entity';
import {
  REQUIRED_SELLABLE_PRODUCT_NAMES,
  SEED_COMMERCIAL_PLANS,
  SEED_PRODUCTS,
} from './data/product-catalog-seed.data';
import {
  SEED_ASSET_PACKS,
  SEED_PLATFORM_ASSETS,
} from '../platform-assets/data/platform-asset-seed.data';
import {
  IntegrationCategory,
  IntegrationReadinessStatus,
  IntegrationStatus,
} from './enums/product-catalog.enums';

describe('ProductCatalogService', () => {
  let service: ProductCatalogService;
  let platformAssetsService: { [key: string]: jest.Mock };
  let entitlementService: { [key: string]: jest.Mock };

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCatalogService,
        {
          provide: PlatformAssetsService,
          useValue: {
            resolveEntitledAssetIds: jest.fn().mockResolvedValue([]),
            installPackForOrganization: jest.fn().mockResolvedValue({}),
            removePackFromOrganization: jest.fn().mockResolvedValue({ removed: true }),
            getOrganizationEntitlements: jest.fn().mockResolvedValue([]),
            isStrictSaasEntitlementsEnabled: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: EntitlementService,
          useValue: {
            resolveDecisionFromContext: jest.fn(({ assetId, organizationId, entitledAssetIds }) => {
              const launchable = !organizationId || entitledAssetIds?.includes(assetId);
              return {
                assetId,
                state: launchable ? 'allowed' : 'locked',
                isVisible: true,
                isLaunchable: launchable,
                reason: launchable ? 'allowed' : 'asset-not-entitled',
              };
            }),
          },
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(CommercialPlan), useFactory: mockRepo },
        { provide: getRepositoryToken(SpecialtyCatalog), useFactory: mockRepo },
        { provide: getRepositoryToken(CarePathway), useFactory: mockRepo },
        { provide: getRepositoryToken(IntegrationOffering), useFactory: mockRepo },
        { provide: getRepositoryToken(PlatformAsset), useFactory: mockRepo },
        { provide: getRepositoryToken(AssetPack), useFactory: mockRepo },
        { provide: getRepositoryToken(Organization), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ProductCatalogService);
    platformAssetsService = module.get(PlatformAssetsService) as any;
    entitlementService = module.get(EntitlementService) as any;
  });

  it('defines the six canonical SaaS packaging products', () => {
    const productNames = new Set(SEED_PRODUCTS.map((product) => product.name));

    expect(REQUIRED_SELLABLE_PRODUCT_NAMES).toEqual([
      'Emergency Flow Intelligence Platform',
      'Hospital Operations Solution',
      'Medical IoT Solution',
      'Simulation & Training Solution',
      'Governance & Compliance Solution',
      'Research & Education Solution',
    ]);
    REQUIRED_SELLABLE_PRODUCT_NAMES.forEach((name) => {
      expect(productNames.has(name)).toBe(true);
    });
  });

  it('defines the five canonical subscription entitlement plans', () => {
    expect(SEED_COMMERCIAL_PLANS.map((plan) => plan.id)).toEqual([
      'starter',
      'professional',
      'enterprise',
      'academic',
      'government',
    ]);
    SEED_COMMERCIAL_PLANS.forEach((plan) => {
      expect(plan.includedPackIds.length + plan.includedProductIds.length).toBeGreaterThan(0);
    });
  });

  it('keeps Emergency Flow sellable as a starter pilot with flow outcomes', () => {
    const emergency = SEED_PRODUCTS.find((product) => product.id === 'product-emergency-department');

    expect(emergency).toEqual(
      expect.objectContaining({
        name: 'Emergency Flow Intelligence Platform',
        commercialPlanIds: expect.arrayContaining(['starter', 'professional', 'enterprise']),
        pricingTierPlaceholder: 'Starter / Professional / Enterprise',
        readinessLabels: expect.arrayContaining(['standalone-demo-ready', 'starter-pilot-ready']),
        requiredIntegrations: expect.arrayContaining([
          expect.stringMatching(/^Optional EHR patient context/i),
          expect.stringMatching(/^Optional EMS CAD/i),
        ]),
        outcomes: expect.arrayContaining([
          'reduced ED bottlenecks',
          'improved EMS-to-ED handoff coordination',
          'better bed flow and capacity visibility',
          'lower clinician coordination burden',
        ]),
      })
    );
  });

  it('defines buyer and stakeholder metadata for every seeded product and asset pack', () => {
    for (const product of SEED_PRODUCTS) {
      expect(product.buyerPersona.length).toBeGreaterThan(0);
      expect(product.decisionMaker.length).toBeGreaterThan(0);
      expect(product.stakeholders.length).toBeGreaterThan(0);
      expect(product.expectedOutcomes.length).toBeGreaterThan(0);
    }

    for (const pack of SEED_ASSET_PACKS) {
      expect(pack.buyerPersona.length).toBeGreaterThan(0);
      expect(pack.decisionMaker.length).toBeGreaterThan(0);
      expect(pack.stakeholders.length).toBeGreaterThan(0);
      expect(pack.expectedOutcomes.length).toBeGreaterThan(0);
    }
  });

  it('resolves pack ids for product ids', async () => {
    const productRepo = (service as any).productRepository;
    productRepo.find.mockResolvedValue([{ id: 'p1', packIds: ['icu-pack', 'core-platform'] }]);
    const ids = await service.resolvePackIdsForProductIds(['p1']);
    expect(ids).toEqual(expect.arrayContaining(['icu-pack', 'core-platform']));
  });

  it('projects integration readiness across the eight required categories', async () => {
    const integrationRepo = (service as any).integrationRepository;
    integrationRepo.find.mockResolvedValue([
      {
        id: 'int-fhir-patient',
        slug: 'fhir-patient',
        name: 'FHIR Patient & Observation',
        category: IntegrationCategory.FHIR,
        status: IntegrationStatus.ROADMAP,
        docsUrl: '/integrations',
      },
      {
        id: 'int-lab-interface',
        slug: 'laboratory-interface',
        name: 'Laboratory LIS Interface',
        category: IntegrationCategory.LABORATORY,
        status: IntegrationStatus.BETA,
      },
      {
        id: 'int-identity',
        slug: 'identity-sso',
        name: 'Enterprise SSO',
        category: IntegrationCategory.IDENTITY,
        status: IntegrationStatus.AVAILABLE,
      },
    ]);

    const readiness = await service.getIntegrationReadiness();

    expect(readiness.integrations.map((integration) => integration.name)).toEqual([
      'FHIR',
      'HL7',
      'PACS',
      'LIS',
      'EMR/EHR',
      'Identity Providers',
      'Government APIs',
      'Scheduling Systems',
    ]);
    expect(new Set(readiness.integrations.map((integration) => integration.status))).toEqual(
      new Set([
        IntegrationReadinessStatus.PLANNED,
        IntegrationReadinessStatus.DEMO,
        IntegrationReadinessStatus.SUPPORTED,
        IntegrationReadinessStatus.UNAVAILABLE,
      ]),
    );
    expect(readiness.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'FHIR', status: 'planned', sourceStatus: 'roadmap' }),
        expect.objectContaining({ name: 'LIS', status: 'demo', sourceStatus: 'beta' }),
        expect.objectContaining({
          name: 'Identity Providers',
          status: 'supported',
          sourceStatus: 'available',
        }),
        expect.objectContaining({ name: 'EMR/EHR', status: 'unavailable', sourceStatus: null }),
      ]),
    );
    expect(readiness.summary).toMatchObject({
      supported: 1,
      demo: 1,
      planned: 1,
      unavailable: 5,
    });
  });

  it('serializes asset-pack productization metadata on product detail', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.findOne.mockResolvedValue({
      id: 'product-icu',
      slug: 'icu-suite',
      name: 'ICU Suite',
      description: 'Critical care scores and workflows.',
      productType: 'icu',
      packIds: ['icu-pack'],
      highlightAssetIds: ['sofa-score'],
      outcomes: ['critical care standardization'],
      targetBuyers: ['critical care leadership'],
      buyerPersona: ['ICU Medical Director'],
      decisionMaker: ['Chief Medical Officer'],
      stakeholders: ['Intensivists', 'ICU nurses'],
      expectedOutcomes: ['critical care standardization'],
      targetUsers: ['Intensivists', 'ICU nurses'],
      requiredBackendCapabilities: ['Entitlement installation for icu-pack plus core-platform'],
      requiredIntegrations: ['FHIR observations for vitals and labs'],
      aiWorkflows: ['Daily ICU patient summary and timeline synthesis'],
      dashboards: ['ICU command dashboard'],
      pricingTierPlaceholder: 'Enterprise',
      readinessLabels: ['integration-required'],
      complexity: 'medium',
      commercialPlanIds: ['enterprise'],
    });
    packRepo.find.mockResolvedValue([
      {
        id: 'icu-pack',
        name: 'ICU Pack',
        slug: 'icu-pack',
        description: 'Critical care scores and protocols.',
        targetRoles: ['ICU clinician'],
        requiredDependencies: ['core-platform'],
        defaultModules: ['dashboard', 'icu', 'tools'],
        pricingTier: 'enterprise',
        salesMetadata: null,
        buyerPersona: ['ICU Medical Director'],
        decisionMaker: ['Chief Medical Officer'],
        stakeholders: ['Intensivists', 'ICU nurses'],
        expectedOutcomes: ['critical care standardization'],
        assetIds: ['sofa-score'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'sofa-score',
        title: 'SOFA Score',
        description: 'Critical care score.',
        assetType: 'calculator',
        category: 'Calculator',
        route: '/tools/sofa-score',
        launchType: 'route',
        packIds: ['icu-pack'],
      },
    ]);

    const detail = await service.getProductAssets('icu-suite');

    expect(detail.product).toMatchObject({
      slug: 'icu-suite',
      targetUsers: ['Intensivists', 'ICU nurses'],
      buyerPersona: ['ICU Medical Director'],
      decisionMaker: ['Chief Medical Officer'],
      stakeholders: ['Intensivists', 'ICU nurses'],
      expectedOutcomes: ['critical care standardization'],
      requiredBackendCapabilities: ['Entitlement installation for icu-pack plus core-platform'],
      requiredIntegrations: ['FHIR observations for vitals and labs'],
      aiWorkflows: ['Daily ICU patient summary and timeline synthesis'],
      dashboards: ['ICU command dashboard'],
      pricingTierPlaceholder: 'Enterprise',
      readinessLabels: ['integration-required'],
    });
    expect(detail.packs[0]).toMatchObject({
      id: 'icu-pack',
      requiredDependencies: ['core-platform'],
      defaultModules: ['dashboard', 'icu', 'tools'],
      buyerPersona: ['ICU Medical Director'],
      decisionMaker: ['Chief Medical Officer'],
      stakeholders: ['Intensivists', 'ICU nurses'],
      expectedOutcomes: ['critical care standardization'],
    });
  });

  it('hides product assets that are not entitled in organization context', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.findOne.mockResolvedValue({
      id: 'product-icu',
      slug: 'icu-suite',
      name: 'ICU Suite',
      packIds: ['icu-pack'],
      highlightAssetIds: ['sofa-score', 'locked-ai'],
    });
    packRepo.find.mockResolvedValue([
      {
        id: 'icu-pack',
        name: 'ICU Pack',
        slug: 'icu-pack',
        assetIds: ['sofa-score', 'locked-ai'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'sofa-score',
        title: 'SOFA Score',
        assetType: 'calculator',
        packIds: ['icu-pack'],
      },
      {
        id: 'locked-ai',
        title: 'Premium ICU AI',
        assetType: 'ai_agent',
        packIds: ['icu-pack'],
      },
    ]);
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue(['sofa-score']);

    const detail = await service.getProductAssets('icu-suite', 'org-1');

    expect(detail.assets).toEqual([
      expect.objectContaining({
        id: 'sofa-score',
        entitlementStatus: 'entitled',
        isLaunchable: true,
      }),
    ]);
    expect(detail.assetsByType.ai_agent).toBeUndefined();
    expect(detail.assetsByType.calculator[0]).toMatchObject({
      id: 'sofa-score',
      entitlementStatus: 'entitled',
      isLaunchable: true,
    });
    expect(entitlementService.resolveDecisionFromContext).toHaveBeenCalled();
  });

  it('resolves a normalized plan entitlement graph through products, packs, and assets', async () => {
    const planRepo = (service as any).planRepository;
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    planRepo.findOne.mockResolvedValue({
      id: 'professional',
      name: 'Professional',
      description: 'Department deployment.',
      includedProductIds: ['product-cardiology'],
      includedPackIds: ['core-platform'],
      pricingTier: 'standard',
      sortOrder: 2,
    });
    productRepo.find.mockResolvedValue([
      {
        id: 'product-cardiology',
        slug: 'cardiology-suite',
        name: 'Cardiology Suite',
        packIds: ['cardiology-pack'],
        highlightAssetIds: ['grace-acs'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      { id: 'core-platform', name: 'Core Platform', slug: 'core', assetIds: ['qsofa'] },
      {
        id: 'cardiology-pack',
        name: 'Cardiology Pack',
        slug: 'cardiology',
        assetIds: ['grace-acs'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      { id: 'qsofa', title: 'qSOFA', assetType: 'calculator' },
      { id: 'grace-acs', title: 'GRACE ACS', assetType: 'calculator' },
    ]);

    const graph = await service.resolvePlanEntitlementGraph('professional');

    expect(graph.plan).toMatchObject({ id: 'professional', name: 'Professional' });
    expect(graph.productIds).toEqual(['product-cardiology']);
    expect(graph.packIds).toEqual(expect.arrayContaining(['core-platform', 'cardiology-pack']));
    expect(graph.assetIds).toEqual(expect.arrayContaining(['qsofa', 'grace-acs']));
    expect(graph.hierarchy).toMatchObject({
      planId: 'professional',
      productIds: ['product-cardiology'],
    });
  });

  it('builds product graph from products to packs, assets, routes, and backend services', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.find.mockResolvedValue([
      {
        id: 'product-emergency-department',
        slug: 'emergency-department-suite',
        name: 'Emergency Flow Intelligence Platform',
        productType: 'emergency_department',
        packIds: ['emergency-department-pack'],
        highlightAssetIds: ['qsofa'],
        outcomes: ['reduced ED bottlenecks'],
        expectedOutcomes: ['Reduce ED bottlenecks'],
        targetUsers: ['Emergency physicians'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'emergency-department-pack',
        name: 'Emergency Department Pack',
        slug: 'emergency-department-pack',
        assetIds: ['qsofa', 'agent-emergency'],
        requiredDependencies: ['core-platform'],
        targetRoles: ['emergency physician', 'nurse'],
        defaultModules: ['emergency', 'dashboard'],
        pricingTier: 'enterprise',
        expectedOutcomes: ['standardized triage'],
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: 'calculator',
        category: 'Calculator',
        route: '/tools/calculators/qsofa',
        launchType: 'route',
        backendStatus: 'wired',
        packIds: ['emergency-department-pack'],
        intendedRoles: ['triage nurse'],
        workspaceTags: ['emergency'],
      },
      {
        id: 'agent-emergency',
        title: 'Emergency AI',
        assetType: 'ai_agent',
        route: '/assistant',
        backendStatus: 'wired',
        packIds: ['emergency-department-pack'],
        intendedRoles: ['emergency physician'],
        workspaceTags: ['emergency'],
      },
    ]);

    const [graph] = (await service.getProductBuilderGraph()) as any[];

    expect(graph.product.name).toBe('Emergency Flow Intelligence Platform');
    expect(graph.roles).toEqual(
      expect.arrayContaining([
        'Emergency physicians',
        'emergency physician',
        'nurse',
        'triage nurse',
      ]),
    );
    expect(graph.workspaces).toEqual(expect.arrayContaining(['emergency', 'dashboard']));
    expect(graph.packs[0]).toMatchObject({
      id: 'emergency-department-pack',
      roles: expect.arrayContaining(['emergency physician', 'nurse', 'triage nurse']),
      workspaces: expect.arrayContaining(['emergency', 'dashboard']),
      assets: expect.arrayContaining([
        expect.objectContaining({
          id: 'qsofa',
          route: '/tools/calculators/qsofa',
          roles: expect.arrayContaining(['triage nurse']),
          workspaces: expect.arrayContaining(['emergency']),
          backendServices: expect.arrayContaining(['ClinicalTools']),
        }),
      ]),
    });
    expect(graph.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetId: 'qsofa', route: '/tools/calculators/qsofa' }),
      ]),
    );
    expect(graph.backendServices).toEqual(expect.arrayContaining(['ClinicalTools', 'AiModule']));
    expect(graph.outcomeMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: 'Reduce ED bottlenecks',
          product: expect.objectContaining({ name: 'Emergency Flow Intelligence Platform' }),
          packs: expect.arrayContaining([
            expect.objectContaining({ id: 'emergency-department-pack' }),
          ]),
          assets: expect.arrayContaining([
            expect.objectContaining({ id: 'qsofa', title: 'qSOFA' }),
          ]),
        }),
      ]),
    );
  });

  it('surfaces automation assets in the correct product and pack view', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;
    const product = {
      id: 'product-medical-iot',
      slug: 'medical-iot-suite',
      name: 'Medical IoT Solution',
      packIds: ['medical-iot-pack'],
      highlightAssetIds: ['automation-device-offline-maintenance'],
      outcomes: ['device uptime'],
      expectedOutcomes: ['device uptime'],
      targetUsers: ['Biomedical engineers'],
    };
    const pack = SEED_ASSET_PACKS.find((row) => row.id === 'medical-iot-pack');
    const automationAsset = SEED_PLATFORM_ASSETS.find(
      (asset) => asset.id === 'automation-device-offline-maintenance',
    );

    productRepo.findOne.mockResolvedValue(product);
    packRepo.find.mockResolvedValue([pack]);
    assetRepo.find.mockResolvedValue([automationAsset]);

    const graph = (await service.getProductBuilderGraph('medical-iot-suite')) as any;

    expect(graph.product.name).toBe('Medical IoT Solution');
    expect(graph.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'automation-device-offline-maintenance',
          packIds: ['medical-iot-pack'],
          pricingTier: 'enterprise',
          roles: expect.arrayContaining(['biomedical engineer']),
          governance: expect.objectContaining({
            dashboardCard: 'device-automation-queue',
          }),
        }),
      ]),
    );
    expect(graph.packs[0]).toMatchObject({
      id: 'medical-iot-pack',
      assets: expect.arrayContaining([
        expect.objectContaining({ id: 'automation-device-offline-maintenance' }),
      ]),
    });
  });

  it('hides restricted automation from unauthorized roles in organization product views', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;
    const orgRepo = (service as any).organizationRepository;
    const product = {
      id: 'product-governance',
      slug: 'governance-compliance-suite',
      name: 'Governance & Compliance Solution',
      packIds: ['governance-compliance-pack'],
      highlightAssetIds: ['automation-audit-event-review'],
      outcomes: ['audit readiness'],
      expectedOutcomes: ['audit readiness'],
      targetUsers: ['Compliance officers'],
    };
    const pack = SEED_ASSET_PACKS.find((row) => row.id === 'governance-compliance-pack');
    const automationAsset = SEED_PLATFORM_ASSETS.find(
      (asset) => asset.id === 'automation-audit-event-review',
    );

    productRepo.findOne.mockResolvedValue(product);
    packRepo.find.mockResolvedValue([pack]);
    assetRepo.find.mockResolvedValue([automationAsset]);
    orgRepo.findOne.mockResolvedValue({ id: 'org-1' });
    platformAssetsService.resolveEntitledAssetIds.mockResolvedValue([
      'automation-audit-event-review',
    ]);
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([
      { organizationId: 'org-1', packId: 'governance-compliance-pack', status: 'enabled' },
    ]);
    entitlementService.resolveDecisionFromContext.mockImplementation(({ asset, userRole }) => {
      const allowedRoles = asset?.permissionPolicy?.allowedRoles || [];
      const isAllowed = allowedRoles.map((role) => role.toLowerCase()).includes(userRole);
      return {
        assetId: asset.id,
        state: isAllowed ? 'allowed' : 'disabled',
        isVisible: isAllowed,
        isLaunchable: isAllowed,
        reason: isAllowed ? 'allowed' : 'role-hidden',
      };
    });

    const unauthorized = (await service.getProductBuilderGraph(
      'governance-compliance-suite',
      'org-1',
      { userRole: 'student', subscriptionPlan: 'enterprise' },
    )) as any;
    const authorized = (await service.getProductBuilderGraph(
      'governance-compliance-suite',
      'org-1',
      { userRole: 'compliance officer', subscriptionPlan: 'enterprise' },
    )) as any;

    expect(unauthorized.assets).toEqual([]);
    expect(unauthorized.packs).toEqual([]);
    expect(authorized.assets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'automation-audit-event-review' })]),
    );
    expect(authorized.packs[0].assets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'automation-audit-event-review' })]),
    );
  });

  it('builds asset pack graph with product mappings', async () => {
    const productRepo = (service as any).productRepository;
    const packRepo = (service as any).packRepository;
    const assetRepo = (service as any).assetRepository;

    productRepo.find.mockResolvedValue([
      {
        id: 'product-digital-twin',
        slug: 'digital-twin-suite',
        name: 'Digital Twin Suite',
        packIds: ['digital-twin-pack'],
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'digital-twin-pack',
        name: 'Digital Twin Pack',
        slug: 'digital-twin-pack',
        assetIds: ['digital-twin'],
        pricingTier: 'enterprise',
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'digital-twin',
        title: 'Digital Twin',
        assetType: 'dashboard',
        route: '/digital-twin',
        backendStatus: 'wired',
        packIds: ['digital-twin-pack'],
      },
    ]);

    const [pack] = await service.getAssetPackBuilderGraph();

    expect(pack).toMatchObject({
      id: 'digital-twin-pack',
      products: [
        { id: 'product-digital-twin', slug: 'digital-twin-suite', name: 'Digital Twin Suite' },
      ],
      assets: [
        expect.objectContaining({
          id: 'digital-twin',
          route: '/digital-twin',
          backendServices: expect.arrayContaining(['DigitalTwinService']),
        }),
      ],
    });
  });

  it('lists enriched AI agent registry rows', async () => {
    const assetRepo = (service as any).assetRepository;
    assetRepo.find
      .mockResolvedValueOnce([
        {
          id: 'agent-emergency',
          title: 'Emergency AI',
          description: 'Emergency support.',
          assetType: 'ai_agent',
          category: 'AI Agent',
          route: '/assistant',
          launchType: 'registry',
          permissionPolicy: {
            capabilities: ['Triage assistance'],
            assetAccess: ['qsofa'],
            workspaceAwareness: ['emergency'],
            roleAwareness: ['emergency physician'],
            toolCallingPermissions: ['invoke-risk-scores'],
            canCallTools: true,
          },
          workspaceTags: ['emergency'],
          intendedRoles: ['emergency physician'],
          governance: { requiresHumanReview: true },
          lifecycle: 'active',
          pricingTier: 'enterprise',
          packIds: ['emergency-department-pack'],
        },
        {
          id: 'agent-clinical',
          title: 'Clinical AI',
          description: 'Clinical support.',
          assetType: 'ai_agent',
          category: 'AI Agent',
          route: '/assistant',
          launchType: 'registry',
          permissionPolicy: {
            capabilities: ['Clinical reasoning'],
            assetAccess: ['patient-summary-ai'],
            workspaceAwareness: ['icu'],
            roleAwareness: ['hospitalist'],
            toolCallingPermissions: ['read-clinical-context'],
          },
          workspaceTags: ['icu'],
          intendedRoles: ['hospitalist'],
          governance: {},
          lifecycle: 'active',
          pricingTier: 'core',
          packIds: ['core-platform'],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'qsofa',
          title: 'qSOFA',
          assetType: 'calculator',
          category: 'Calculator',
          route: '/tools/calculators/qsofa',
          launchType: 'route',
          riskLevel: 'clinical-decision-support',
        },
        {
          id: 'patient-summary-ai',
          title: 'Patient Summary AI',
          assetType: 'ai_agent',
          category: 'Clinical AI',
          route: '/patients/:patientId/summary',
          launchType: 'route',
          riskLevel: 'clinical-decision-support',
        },
      ]);

    const result = await service.listAgents();

    expect(result.map((agent) => agent.id)).toEqual(['agent-clinical', 'agent-emergency']);
    expect(result[0]).toMatchObject({
      id: 'agent-clinical',
      capabilities: ['Clinical reasoning'],
      workspaceAwareness: ['icu'],
      roleAwareness: ['hospitalist'],
      toolCallingPermissions: ['read-clinical-context'],
      canCallTools: true,
    });
    expect(result[1].assetAccess).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'qsofa',
          title: 'qSOFA',
          route: '/tools/calculators/qsofa',
        }),
      ]),
    );
  });

  it('resolves care pathway sections with linked assets and AI agent detail', async () => {
    const pathwayRepo = (service as any).pathwayRepository;
    const assetRepo = (service as any).assetRepository;

    pathwayRepo.findOne.mockResolvedValue({
      id: 'pathway-sepsis',
      slug: 'sepsis',
      name: 'Sepsis',
      description: 'Sepsis bundle and deterioration monitoring.',
      calculatorAssetIds: ['qsofa'],
      protocolAssetIds: ['protocol-sepsis'],
      workflowAssetIds: ['workflows'],
      simulationAssetIds: ['sepsis-deterioration'],
      aiAgentId: 'agent-clinical',
      outcomes: ['bundle compliance'],
    });
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: 'calculator',
        category: 'Calculator',
        route: '/tools/calculators/qsofa',
      },
      {
        id: 'protocol-sepsis',
        title: 'Sepsis Management',
        assetType: 'protocol',
        category: 'sepsis',
        route: '/protocols',
      },
      {
        id: 'workflows',
        title: 'Workflow Builder',
        assetType: 'workflow',
        route: '/workflows',
      },
      {
        id: 'sepsis-deterioration',
        title: 'Sepsis Deterioration',
        assetType: 'simulation',
        route: '/simulation/sepsis-deterioration',
      },
      {
        id: 'agent-clinical',
        title: 'Clinical AI',
        assetType: 'ai_agent',
        route: '/assistant',
      },
    ]);

    const result = await service.getCarePathwayBySlug('sepsis');

    expect(result.calculators).toEqual([expect.objectContaining({ id: 'qsofa', title: 'qSOFA' })]);
    expect(result.protocols).toEqual([
      expect.objectContaining({ id: 'protocol-sepsis', title: 'Sepsis Management' }),
    ]);
    expect(result.workflows).toEqual([expect.objectContaining({ id: 'workflows' })]);
    expect(result.simulations).toEqual([expect.objectContaining({ id: 'sepsis-deterioration' })]);
    expect(result.aiAgent).toMatchObject({ id: 'agent-clinical', title: 'Clinical AI' });
    expect(result.linkedAssetCounts).toEqual({
      calculators: 1,
      protocols: 1,
      workflows: 1,
      simulations: 1,
      aiAgents: 1,
    });
    expect(result.steps.map((step) => step.type)).toEqual([
      'calculator',
      'protocol',
      'workflow',
      'simulation',
    ]);
  });

  it('reconciles organization entitlements from a commercial plan without disabling manual packs by default', async () => {
    const planRepo = (service as any).planRepository;
    const productRepo = (service as any).productRepository;
    const orgRepo = (service as any).organizationRepository;
    const org = { id: 'org-1', settings: { existing: true } };

    orgRepo.findOne.mockResolvedValue(org);
    planRepo.findOne.mockResolvedValue({
      id: 'enterprise',
      includedPackIds: ['governance-compliance-pack'],
      includedProductIds: ['product-icu'],
    });
    productRepo.find.mockResolvedValue([{ id: 'product-icu', packIds: ['icu-pack'] }]);

    const result = await service.reconcileOrganizationCommercialPlan('org-1', 'enterprise');

    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'governance-compliance-pack',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'icu-pack',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(platformAssetsService.removePackFromOrganization).not.toHaveBeenCalled();
    expect(orgRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          existing: true,
          commercialPlanId: 'enterprise',
          commercialPlanPackIds: expect.arrayContaining([
            'governance-compliance-pack',
            'icu-pack',
            'core-platform',
          ]),
        }),
      }),
    );
    expect(result.targetPackIds).toEqual(
      expect.arrayContaining(['governance-compliance-pack', 'icu-pack', 'core-platform']),
    );
  });

  it('can explicitly disable packs no longer included in a commercial plan', async () => {
    const planRepo = (service as any).planRepository;
    const productRepo = (service as any).productRepository;
    const orgRepo = (service as any).organizationRepository;

    orgRepo.findOne.mockResolvedValue({ id: 'org-1', settings: {} });
    planRepo.findOne.mockResolvedValue({
      id: 'starter',
      includedPackIds: ['core-platform'],
      includedProductIds: [],
    });
    productRepo.find.mockResolvedValue([]);
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([
      { packId: 'core-platform' },
      { packId: 'legacy-pack' },
    ]);

    const result = await service.reconcileOrganizationCommercialPlan('org-1', 'starter', {
      disableRemovedPacks: true,
    });

    expect(platformAssetsService.removePackFromOrganization).toHaveBeenCalledWith(
      'org-1',
      'legacy-pack',
    );
    expect(platformAssetsService.removePackFromOrganization).not.toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(result.disabledPackIds).toEqual(['legacy-pack']);
  });
});
