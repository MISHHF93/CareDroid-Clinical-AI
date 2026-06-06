import { HospitalSolutionBuilderService } from './hospital-solution-builder.service';
import { ProductType } from './enums/product-catalog.enums';

describe('HospitalSolutionBuilderService', () => {
  const productRows = [
    {
      id: 'product-emergency-department',
      slug: 'emergency-department-suite',
      name: 'Emergency Department Solution',
      description: 'ED support.',
      productType: ProductType.EMERGENCY_DEPARTMENT,
      packIds: ['emergency-department-pack'],
      expectedOutcomes: ['Reduce triage time'],
      sortOrder: 1,
    },
    {
      id: 'product-hospital-operations',
      slug: 'hospital-operations-solution',
      name: 'Hospital Operations Solution',
      description: 'Operations command.',
      productType: ProductType.HOSPITAL_OPERATIONS,
      packIds: ['hospital-operations'],
      expectedOutcomes: ['Improve asset visibility'],
      sortOrder: 2,
    },
    {
      id: 'product-icu',
      slug: 'icu-suite',
      name: 'ICU Suite',
      description: 'Critical care support.',
      productType: ProductType.ICU,
      packIds: ['icu-pack'],
      expectedOutcomes: ['Improve sepsis detection'],
      sortOrder: 3,
    },
  ] as any[];

  const packRows = [
    {
      id: 'core-platform',
      slug: 'core-platform',
      name: 'Core Platform',
      description: 'Base platform.',
      assetIds: ['dashboard', 'agent-clinical'],
      requiredDependencies: [],
      pricingTier: 'core',
    },
    {
      id: 'emergency-department-pack',
      slug: 'emergency-department-pack',
      name: 'Emergency Department Pack',
      description: 'ED assets.',
      assetIds: ['qsofa', 'agent-emergency'],
      requiredDependencies: ['core-platform'],
      pricingTier: 'enterprise',
    },
    {
      id: 'hospital-operations',
      slug: 'hospital-operations',
      name: 'Hospital Operations Pack',
      description: 'Operations assets.',
      assetIds: ['digital-operations-center'],
      requiredDependencies: ['core-platform'],
      pricingTier: 'enterprise',
    },
    {
      id: 'icu-pack',
      slug: 'icu-pack',
      name: 'ICU Pack',
      description: 'ICU assets.',
      assetIds: ['sofa-score'],
      requiredDependencies: ['core-platform'],
      pricingTier: 'enterprise',
    },
  ] as any[];

  const assetRows = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      assetType: 'dashboard',
      route: '/dashboard',
      packIds: ['core-platform'],
      workspaceTags: [],
    },
    {
      id: 'agent-clinical',
      title: 'Clinical AI',
      assetType: 'ai_agent',
      route: '/assistant',
      packIds: ['core-platform'],
      workspaceTags: ['emergency', 'icu'],
    },
    {
      id: 'qsofa',
      title: 'qSOFA',
      assetType: 'calculator',
      route: '/tools/calculators/qsofa',
      packIds: ['emergency-department-pack'],
      workspaceTags: ['emergency'],
    },
    {
      id: 'agent-emergency',
      title: 'Emergency AI',
      assetType: 'ai_agent',
      route: '/assistant',
      packIds: ['emergency-department-pack'],
      workspaceTags: ['emergency'],
    },
    {
      id: 'digital-operations-center',
      title: 'Digital Operations Center',
      assetType: 'dashboard',
      route: '/operations-center',
      packIds: ['hospital-operations'],
      workspaceTags: ['operations'],
    },
    {
      id: 'sofa-score',
      title: 'SOFA',
      assetType: 'calculator',
      route: '/tools/calculators/sofa',
      packIds: ['icu-pack'],
      workspaceTags: ['icu'],
    },
  ] as any[];

  const integrationRows = [
    {
      id: 'fhir-patient',
      slug: 'fhir-patient',
      name: 'FHIR Patient',
      category: 'fhir',
      status: 'available',
    },
    {
      id: 'hl7-adt',
      slug: 'hl7-adt',
      name: 'HL7 ADT',
      category: 'hl7',
      status: 'available',
    },
    {
      id: 'identity-sso',
      slug: 'identity-sso',
      name: 'Identity SSO',
      category: 'identity',
      status: 'available',
    },
    {
      id: 'laboratory-interface',
      slug: 'laboratory-interface',
      name: 'Laboratory Interface',
      category: 'laboratory',
      status: 'available',
    },
    {
      id: 'scheduling',
      slug: 'scheduling',
      name: 'Scheduling',
      category: 'scheduling',
      status: 'available',
    },
  ] as any[];

  function buildService() {
    const productRepository = {
      find: jest.fn().mockResolvedValue(productRows),
    };
    const packRepository = {
      find: jest.fn().mockResolvedValue(packRows),
    };
    const assetRepository = {
      find: jest.fn().mockResolvedValue(assetRows),
    };
    const integrationRepository = {
      find: jest.fn().mockResolvedValue(integrationRows),
    };
    const productCatalogService = {
      listAgents: jest.fn().mockResolvedValue([
        {
          id: 'agent-clinical',
          title: 'Clinical AI',
          description: 'Clinical support.',
          workspaceAwareness: ['emergency', 'icu'],
          assetAccess: [{ id: 'qsofa' }],
        },
        {
          id: 'agent-emergency',
          title: 'Emergency AI',
          description: 'ED support.',
          workspaceAwareness: ['emergency'],
          assetAccess: [{ id: 'qsofa' }],
        },
        {
          id: 'agent-lab',
          title: 'Laboratory AI',
          description: 'Lab support.',
          workspaceAwareness: ['laboratory'],
          assetAccess: [{ id: 'lab-interp' }],
        },
        {
          id: 'agent-operations',
          title: 'Operations AI',
          description: 'Operations support.',
          workspaceAwareness: ['operations', 'biomedical-engineering'],
          assetAccess: [{ id: 'digital-operations-center' }],
        },
        {
          id: 'agent-education',
          title: 'Education AI',
          description: 'Education support.',
          workspaceAwareness: ['education'],
          assetAccess: [{ id: 'simulation-suite' }],
        },
        {
          id: 'agent-governance',
          title: 'Governance AI',
          description: 'Governance support.',
          workspaceAwareness: ['administration'],
          assetAccess: [{ id: 'audit-logs' }],
        },
      ]),
      reconcileOrganizationCommercialPlan: jest.fn().mockResolvedValue({ commercialPlanId: 'enterprise' }),
    };
    const organizationsService = {
      updateConfiguration: jest.fn().mockResolvedValue({ tenant: { organizationId: 'org-1' } }),
    };

    const service = new HospitalSolutionBuilderService(
      productRepository as any,
      packRepository as any,
      assetRepository as any,
      integrationRepository as any,
      productCatalogService as any,
      organizationsService as any,
    );

    return { service, productCatalogService, organizationsService };
  }

  it('maps hospital departments to a recommended deployment and configuration patch', async () => {
    const { service } = buildService();

    const recommendation = await service.recommend({
      organizationId: 'org-1',
      hospitalType: 'hospital',
      departmentIds: ['emergency', 'icu', 'operations'],
      integrationSlugs: ['identity-sso'],
    });

    expect(recommendation.recommendedCommercialPlanId).toBe('enterprise');
    expect(recommendation.products.map((product: any) => product.id)).toEqual(
      expect.arrayContaining([
        'product-emergency-department',
        'product-hospital-operations',
        'product-icu',
      ]),
    );
    expect(recommendation.configurationPatch.enabledPackIds).toEqual(
      expect.arrayContaining(['core-platform', 'emergency-department-pack', 'icu-pack']),
    );
    expect(recommendation.configurationPatch.workspaceDefaults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'emergency',
          enabledToolIds: expect.arrayContaining(['qsofa']),
          defaultAiAgentId: 'agent-clinical',
        }),
      ]),
    );
  });

  it('normalizes department aliases through the canonical taxonomy and service lines', async () => {
    const { service } = buildService();

    const recommendation = await service.recommend({
      organizationId: 'org-1',
      hospitalType: 'hospital',
      departmentIds: ['medical_iot', 'lab', 'simulation', 'governance'],
      workspaceIds: ['medical_iot'],
    });

    expect(recommendation.organizationProfile.departmentIds).toEqual([
      'biomedical-engineering',
      'laboratory',
      'education',
      'administration',
    ]);
    expect(recommendation.organizationProfile.serviceLineIds).toEqual(
      expect.arrayContaining(['operations', 'laboratory-medicine', 'education', 'research']),
    );
    expect(recommendation.integrations.map((integration: any) => integration.slug)).toEqual(
      expect.arrayContaining(['laboratory-interface', 'scheduling']),
    );
    expect(recommendation.aiAgents.map((agent: any) => agent.id)).toEqual(
      expect.arrayContaining(['agent-lab', 'agent-operations', 'agent-education', 'agent-governance']),
    );
    expect(recommendation.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'biomedical-engineering',
          name: 'Biomedical Engineering',
          defaultAiAgentId: 'agent-operations',
        }),
      ]),
    );
    expect(recommendation.rationale).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'service-line',
          message: expect.stringContaining('Operations'),
        }),
      ]),
    );
  });

  it('applies a recommended patch through organization configuration and plan reconciliation', async () => {
    const { service, productCatalogService, organizationsService } = buildService();
    const patch = {
      enabledProductIds: ['product-emergency-department'],
      enabledPackIds: ['core-platform', 'emergency-department-pack'],
      enabledAgentIds: ['agent-clinical'],
    };

    const result = await service.apply({ id: 'user-1' } as any, {
      organizationId: 'org-1',
      commercialPlanId: 'enterprise',
      configurationPatch: patch,
    });

    expect(organizationsService.updateConfiguration).toHaveBeenCalledWith(
      { id: 'user-1' },
      'org-1',
      patch,
    );
    expect(productCatalogService.reconcileOrganizationCommercialPlan).toHaveBeenCalledWith(
      'org-1',
      'enterprise',
      { disableRemovedPacks: false },
    );
    expect(result.appliedConfigurationPatch).toBe(patch);
  });
});
