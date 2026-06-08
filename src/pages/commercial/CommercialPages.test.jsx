import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AgentsRegistryPage,
  AssetPacksBuilderPage,
  CarePathwayDetailPage,
  CarePathwaysIndexPage,
  ConfigurationStudioPage,
  HospitalSolutionBuilderPage,
  IntegrationReadinessPage,
  OrganizationOnboardingPage,
  ProductDetailPage,
  ProductsIndexPage,
  ValueTrackingPage,
} from './CommercialPages';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./CommercialPages.css', () => ({}));

const mockIdentity = vi.hoisted(() => ({
  refreshPlatformContext: vi.fn(),
  organization: {
    id: 'org-1',
    name: 'Demo Hospital',
    settings: { enabledProductIds: ['product-emergency-department'] },
    branding: {},
  },
}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: mockIdentity.organization,
    refreshPlatformContext: mockIdentity.refreshPlatformContext,
  }),
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    completeOnboarding: vi.fn(),
    getCarePathway: vi.fn(),
    getProductBuilder: vi.fn(),
    getIntegrationReadiness: vi.fn(),
    getOrganizationValueTracking: vi.fn(),
    listAgents: vi.fn(),
    listCarePathways: vi.fn(),
    listProductBuilder: vi.fn(),
    listAssetPackBuilder: vi.fn(),
    listSpecialties: vi.fn(),
    getHospitalSolutionRecommendation: vi.fn(),
    applyHospitalSolution: vi.fn(),
    requestIntegration: vi.fn(),
    updateOrganizationConfiguration: vi.fn(),
  },
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    listPacks: vi.fn(),
    listRoleProfiles: vi.fn(),
  },
}));

const productGraph = {
  product: {
    id: 'product-emergency-department',
    slug: 'emergency-department-suite',
    name: 'Emergency Flow Intelligence Platform',
    description: 'ED flow intelligence, EMS handoff, triage, bed pressure, and command workflows.',
    packIds: ['emergency-department-pack'],
    targetBuyers: ['ED director'],
    buyerPersona: ['ED Director', 'Chief Medical Officer'],
    decisionMaker: ['ED Director'],
    stakeholders: ['Emergency physicians', 'Triage nurses'],
    outcomes: ['faster risk stratification'],
    expectedOutcomes: ['Reduce triage time', 'standardized triage'],
    targetUsers: ['Emergency physicians'],
    roles: ['Emergency physicians', 'emergency physician', 'triage nurse'],
    workspaces: ['emergency', 'dashboard'],
    pricingTierPlaceholder: 'Enterprise',
  },
  packs: [
    {
      id: 'emergency-department-pack',
      name: 'Emergency Department Pack',
      assetIds: ['qsofa'],
      pricingTier: 'enterprise',
      buyerPersona: ['ED Director', 'Chief Medical Officer'],
      decisionMaker: ['ED Director'],
      stakeholders: ['Emergency physicians', 'Triage nurses'],
      expectedOutcomes: ['standardized triage'],
      roles: ['emergency physician', 'triage nurse'],
      workspaces: ['emergency'],
      assets: [
        {
          id: 'qsofa',
          title: 'qSOFA',
          route: '/tools/calculators/qsofa',
          roles: ['triage nurse'],
          workspaces: ['emergency'],
        },
      ],
    },
  ],
  assets: [
    {
      id: 'qsofa',
      title: 'qSOFA',
      route: '/tools/calculators/qsofa',
      roles: ['triage nurse'],
      workspaces: ['emergency'],
    },
  ],
  roles: ['Emergency physicians', 'emergency physician', 'triage nurse'],
  workspaces: ['emergency', 'dashboard'],
  routes: [{ assetId: 'qsofa', route: '/tools/calculators/qsofa' }],
  backendServices: ['ClinicalTools'],
  outcomeMappings: [
    {
      outcome: 'Reduce triage time',
      product: {
        id: 'product-emergency-department',
        slug: 'emergency-department-suite',
        name: 'Emergency Flow Intelligence Platform',
        description: 'ED flow intelligence, EMS handoff, triage, bed pressure, and command workflows.',
        targetBuyers: ['ED director'],
        buyerPersona: ['ED Director', 'Chief Medical Officer'],
        decisionMaker: ['ED Director'],
        stakeholders: ['Emergency physicians', 'Triage nurses'],
        expectedOutcomes: ['Reduce triage time', 'standardized triage'],
        pricingTierPlaceholder: 'Enterprise',
      },
      packs: [{ id: 'emergency-department-pack', name: 'Emergency Department Pack' }],
      assets: [{ id: 'qsofa', title: 'qSOFA', route: '/tools/calculators/qsofa' }],
    },
  ],
};

const packGraph = {
  id: 'emergency-department-pack',
  name: 'Emergency Department Pack',
  description: 'ED package.',
  assetIds: ['qsofa'],
  requiredDependencies: ['core-platform'],
  pricingTier: 'enterprise',
  buyerPersona: ['ED Director', 'Chief Medical Officer'],
  decisionMaker: ['ED Director'],
  stakeholders: ['Emergency physicians', 'Triage nurses'],
  expectedOutcomes: ['standardized triage'],
  products: [{ id: 'product-emergency-department', name: 'Emergency Flow Intelligence Platform' }],
  assets: [{ id: 'qsofa', title: 'qSOFA', route: '/tools/calculators/qsofa', backendServices: ['ClinicalTools'] }],
};

const onboardingPacks = [
  { id: 'core-platform', name: 'Core Platform' },
  { id: 'emergency-medicine', name: 'Emergency Medicine Pack' },
  { id: 'laboratory-intelligence', name: 'Laboratory Intelligence Pack' },
  { id: 'hospital-operations', name: 'Hospital Operations Pack' },
  { id: 'fleet-logistics', name: 'Fleet Logistics Pack' },
  { id: 'cardiology-pack', name: 'Cardiology Pack' },
];

const roleProfiles = [
  { id: 'emergency-physician', label: 'Emergency physician' },
  { id: 'nurse', label: 'Nurse' },
  { id: 'fleet-operator', label: 'Fleet operator' },
];

const specialtyRows = [
  { id: 'specialty-emergency', slug: 'emergency', name: 'Emergency' },
  { id: 'specialty-operations', slug: 'operations', name: 'Operations' },
  { id: 'specialty-cardiology', slug: 'cardiology', name: 'Cardiology' },
];

const agentRegistryRows = [
  {
    id: 'agent-emergency',
    title: 'Emergency AI',
    description: 'Emergency department support.',
    capabilities: ['Triage assistance', 'Emergency risk scoring'],
    assetAccess: [
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: 'calculator',
        route: '/tools/calculators/qsofa',
      },
    ],
    workspaceAwareness: ['emergency'],
    roleAwareness: ['emergency physician', 'nurse'],
    toolCallingPermissions: ['invoke-risk-scores'],
    canCallTools: true,
  },
];

const carePathwayRows = [
  {
    id: 'pathway-sepsis',
    slug: 'sepsis',
    name: 'Sepsis',
    description: 'Sepsis bundle and deterioration monitoring.',
    calculatorAssetIds: ['qsofa'],
    protocolAssetIds: ['protocol-sepsis'],
    workflowAssetIds: ['workflows'],
    simulationAssetIds: ['sepsis-deterioration'],
    aiAgentId: 'agent-clinical',
    outcomes: ['bundle compliance', 'early recognition'],
  },
];

const carePathwayDetail = {
  ...carePathwayRows[0],
  calculators: [{ id: 'qsofa', title: 'qSOFA', assetType: 'calculator', route: '/tools/calculators/qsofa' }],
  protocols: [{ id: 'protocol-sepsis', title: 'Sepsis Management', assetType: 'protocol', route: '/protocols' }],
  workflows: [{ id: 'workflows', title: 'Workflow Builder', assetType: 'workflow', route: '/workflows' }],
  simulations: [
    {
      id: 'sepsis-deterioration',
      title: 'Sepsis Deterioration',
      assetType: 'simulation',
      route: '/simulation/sepsis-deterioration',
    },
  ],
  aiAgent: { id: 'agent-clinical', title: 'Clinical AI', route: '/assistant' },
  linkedAssetCounts: {
    calculators: 1,
    protocols: 1,
    workflows: 1,
    simulations: 1,
    aiAgents: 1,
  },
};

const integrationReadiness = {
  summary: {
    supported: 1,
    planned: 5,
    demo: 1,
    unavailable: 1,
  },
  integrations: [
    { id: 'fhir', name: 'FHIR', category: 'fhir', status: 'planned', slug: 'fhir-patient' },
    { id: 'hl7', name: 'HL7', category: 'hl7', status: 'planned', slug: 'hl7-adt' },
    { id: 'pacs', name: 'PACS', category: 'pacs', status: 'planned', slug: 'pacs-dicom' },
    {
      id: 'lis',
      name: 'LIS',
      category: 'laboratory',
      status: 'demo',
      slug: 'laboratory-interface',
      linkedAssetId: 'lab-interp',
    },
    { id: 'emr-ehr', name: 'EMR/EHR', category: 'emr_ehr', status: 'unavailable', slug: 'emr-ehr' },
    { id: 'identity-providers', name: 'Identity Providers', category: 'identity', status: 'supported', slug: 'identity-sso' },
    { id: 'government-apis', name: 'Government APIs', category: 'government_apis', status: 'planned', slug: 'government-reporting' },
    { id: 'scheduling-systems', name: 'Scheduling Systems', category: 'scheduling', status: 'planned', slug: 'scheduling' },
  ],
};

const valueTracking = {
  organizationId: 'org-1',
  period: { key: 'month' },
  executiveSummary: {
    enabledPackCount: 4,
    activeUsers: 12,
    totalEngagementEvents: 88,
    outcomeSignalCount: 6,
  },
  categories: {
    clinical: [
      {
        id: 'protocol-adherence',
        label: 'Protocol adherence',
        value: 82,
        unit: 'percent',
        numerator: 41,
        denominator: 50,
        status: 'on-track',
        description: 'Protocol adherence events.',
      },
      {
        id: 'simulation-completion',
        label: 'Simulation completion',
        value: 9,
        unit: 'count',
        status: 'on-track',
        description: 'Completed simulation runs.',
      },
    ],
    operational: [
      {
        id: 'fleet-uptime',
        label: 'Fleet uptime',
        value: 97,
        unit: 'percent',
        status: 'on-track',
        description: 'Fleet availability.',
      },
      {
        id: 'response-times',
        label: 'Response times',
        value: 850,
        unit: 'milliseconds',
        status: 'on-track',
        description: 'Average response time.',
      },
    ],
    executive: [
      {
        id: 'adoption',
        label: 'Adoption',
        value: 29,
        unit: 'percent',
        status: 'watch',
        description: 'Enabled pack adoption.',
      },
      {
        id: 'engagement',
        label: 'Engagement',
        value: 12,
        unit: 'count',
        status: 'on-track',
        description: 'Active users.',
      },
    ],
  },
  sources: {
    auditEvents: 50,
    usageEvents: 38,
    enabledEntitlements: 4,
  },
};

function renderPage(element) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

function elementsContaining(text) {
  const lower = text.toLowerCase();
  return screen.getAllByText((_, element) => element?.textContent?.toLowerCase().includes(lower));
}

function renderCarePathwayDetail(route = '/care-pathways/sepsis') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/care-pathways/:slug" element={<CarePathwayDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderProductDetail(route = '/products/emergency-department-suite') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/products/:slug" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSolutionBuilderRoute(route = '/solution-builder') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/solution-builder" element={<HospitalSolutionBuilderPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderOnboardingPage() {
  const view = renderPage(<OrganizationOnboardingPage />);
  await act(async () => {});
  return view;
}

describe('Commercial builder pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductCatalogApi.listProductBuilder.mockResolvedValue([productGraph]);
    ProductCatalogApi.getProductBuilder.mockResolvedValue(productGraph);
    ProductCatalogApi.listAssetPackBuilder.mockResolvedValue([packGraph]);
    ProductCatalogApi.listAgents.mockResolvedValue(agentRegistryRows);
    ProductCatalogApi.listCarePathways.mockResolvedValue(carePathwayRows);
    ProductCatalogApi.getCarePathway.mockResolvedValue(carePathwayDetail);
    ProductCatalogApi.getIntegrationReadiness.mockResolvedValue(integrationReadiness);
    ProductCatalogApi.getOrganizationValueTracking.mockResolvedValue(valueTracking);
    ProductCatalogApi.requestIntegration.mockResolvedValue({});
    ProductCatalogApi.listSpecialties.mockResolvedValue(specialtyRows);
    ProductCatalogApi.getHospitalSolutionRecommendation.mockResolvedValue({
      recommendedCommercialPlanId: 'enterprise',
      products: [{ id: 'product-emergency-department', name: 'Emergency Flow Intelligence Platform' }],
      packs: [{ id: 'emergency-department-pack', name: 'Emergency Department Pack' }],
      workspaces: [{ id: 'emergency', name: 'Emergency Department' }],
      aiAgents: [{ id: 'agent-emergency', title: 'Emergency AI' }],
      integrations: [{ id: 'fhir-patient', slug: 'fhir-patient', name: 'FHIR Patient' }],
      rationale: [{ type: 'department', message: '1 departments mapped to 1 product lines.' }],
      configurationPatch: {
        enabledProductIds: ['product-emergency-department'],
        enabledPackIds: ['core-platform', 'emergency-department-pack'],
        enabledAgentIds: ['agent-emergency'],
        workspaceDefaults: [{ id: 'emergency', enabledToolIds: ['qsofa'] }],
        integrationsRequested: ['fhir-patient'],
      },
    });
    ProductCatalogApi.applyHospitalSolution.mockResolvedValue({ organizationId: 'org-1' });
    ProductCatalogApi.updateOrganizationConfiguration.mockResolvedValue({});
    ProductCatalogApi.completeOnboarding.mockResolvedValue({
      tenantProfile: {
        organization: {
          name: 'North EMS',
          slug: 'north-ems',
          organizationType: 'ems',
        },
        specialties: ['emergency', 'operations'],
        workspaceDefaults: [{ name: 'EMS Command', type: 'emergency' }],
        workspaces: [{ id: 'workspace-1', name: 'EMS Command', type: 'emergency' }],
        roleProfileId: 'fleet-operator',
        roleAssignments: [],
        installedPackIds: ['core-platform', 'emergency-medicine', 'fleet-logistics'],
        integrationsRequested: ['identity-sso', 'scheduling'],
        branding: { displayName: 'North EMS Command', accentColor: '#00ff88' },
        complianceMode: 'ems',
      },
    });
    PlatformAssetsApi.listPacks.mockResolvedValue(onboardingPacks);
    PlatformAssetsApi.listRoleProfiles.mockResolvedValue(roleProfiles);
  });

  it('renders products as outcome-product-pack-asset graph cards', async () => {
    renderPage(<ProductsIndexPage />);

    expect(await screen.findByRole('heading', { name: /reduce triage time/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /emergency department solution/i })).toHaveAttribute(
      'href',
      '/products/emergency-department-suite'
    );
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('1 packs')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('1 assets')).length).toBeGreaterThan(0);
    expect(elementsContaining('Buyer persona: ED Director, Chief Medical Officer').length).toBeGreaterThan(0);
    expect(elementsContaining('Decision maker: ED Director').length).toBeGreaterThan(0);
    expect(screen.getByText(/emergency department pack/i)).toBeInTheDocument();
    expect(screen.getByText(/qsofa/i)).toBeInTheDocument();
  });

  it('renders product detail role and workspace mappings', async () => {
    renderProductDetail();

    expect(await screen.findByRole('heading', { name: /emergency department solution/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^roles$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^workspaces$/i })).toBeInTheDocument();
    expect(elementsContaining('Stakeholders: Emergency physicians, Triage nurses').length).toBeGreaterThan(0);
    expect(elementsContaining('Expected outcomes: standardized triage').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/triage nurse/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/emergency/i).length).toBeGreaterThan(0);
  });

  it('renders asset pack builder mappings', async () => {
    renderPage(<AssetPacksBuilderPage />);

    expect(await screen.findByRole('heading', { name: /emergency department pack/i })).toBeInTheDocument();
    expect(screen.getByText(/depends on:/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency department solution/i)).toBeInTheDocument();
    expect(elementsContaining('Buyer persona: ED Director, Chief Medical Officer').length).toBeGreaterThan(0);
    expect(elementsContaining('Expected outcomes: standardized triage').length).toBeGreaterThan(0);
    expect(screen.getByText(/tools\/calculators\/qsofa/i)).toBeInTheDocument();
  });

  it('renders AI agent registry details and launch links', async () => {
    renderPage(<AgentsRegistryPage />);

    expect(await screen.findByRole('heading', { name: /emergency ai/i })).toBeInTheDocument();
    expect(screen.getByText(/triage assistance/i)).toBeInTheDocument();
    expect(screen.getByText('qSOFA')).toBeInTheDocument();
    expect(screen.getByText('emergency physician, nurse')).toBeInTheDocument();
    expect(screen.getByText(/invoke-risk-scores/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open agent/i })).toHaveAttribute(
      'href',
      '/assistant?agent=agent-emergency',
    );
  });

  it('renders integration readiness status and requests enablement', async () => {
    renderPage(<IntegrationReadinessPage />);

    expect(await screen.findByRole('heading', { name: /integration readiness center/i })).toBeInTheDocument();
    ['FHIR', 'HL7', 'PACS', 'LIS', 'EMR/EHR', 'Identity Providers', 'Government APIs', 'Scheduling Systems'].forEach(
      (name) => {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      },
    );
    expect(screen.getByText('Supported')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /request enablement/i })[0]);

    await waitFor(() => {
      expect(ProductCatalogApi.requestIntegration).toHaveBeenCalledWith('org-1', 'fhir-patient');
    });
    expect(screen.getByText(/requested: fhir-patient/i)).toBeInTheDocument();
  });

  it('renders value tracking categories and period filter', async () => {
    renderPage(<ValueTrackingPage />);

    expect(await screen.findByRole('heading', { name: /^value tracking$/i })).toBeInTheDocument();
    expect(ProductCatalogApi.getOrganizationValueTracking).toHaveBeenCalledWith('org-1', 'month');
    expect(screen.getByRole('heading', { name: /protocol adherence/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fleet uptime/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /adoption/i })).toBeInTheDocument();
    expect(screen.getByText(/audit events: 50/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/value tracking period/i), {
      target: { value: 'week' },
    });

    await waitFor(() => {
      expect(ProductCatalogApi.getOrganizationValueTracking).toHaveBeenCalledWith('org-1', 'week');
    });
  });

  it('builds and applies a hospital solution recommendation', async () => {
    renderPage(<HospitalSolutionBuilderPage />);

    expect(screen.getByRole('heading', { name: /hospital solution builder/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/hospital type/i), {
      target: { value: 'academic_medical_center' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /laboratory/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /generate recommendation/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.getHospitalSolutionRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          hospitalType: 'academic_medical_center',
          departmentIds: expect.arrayContaining(['emergency', 'laboratory']),
        }),
      );
    });

    expect(await screen.findByText(/recommended caredroid deployment generated/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended plan/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency department solution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/configuration patch preview/i).value).toContain('enabledProductIds');

    fireEvent.click(screen.getByRole('button', { name: /apply to organization/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.applyHospitalSolution).toHaveBeenCalledWith({
        organizationId: 'org-1',
        commercialPlanId: 'enterprise',
        configurationPatch: expect.objectContaining({
          enabledPackIds: ['core-platform', 'emergency-department-pack'],
        }),
      });
    });
    expect(mockIdentity.refreshPlatformContext).toHaveBeenCalled();
  });

  it('renders the /solution-builder route', () => {
    renderSolutionBuilderRoute();

    expect(screen.getByRole('heading', { name: /hospital solution builder/i })).toBeInTheDocument();
  });

  it('renders care pathway index cards with link counts and outcomes', async () => {
    renderPage(<CarePathwaysIndexPage />);

    expect(await screen.findByRole('heading', { name: /sepsis/i })).toBeInTheDocument();
    expect(screen.getByText(/5 linked assets/i)).toBeInTheDocument();
    expect(screen.getByText(/bundle compliance/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start pathway/i })).toHaveAttribute(
      'href',
      '/care-pathways/sepsis',
    );
  });

  it('renders care pathway detail sections and AI guidance', async () => {
    renderCarePathwayDetail();

    expect(await screen.findByRole('heading', { name: /sepsis/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /calculators/i })).toBeInTheDocument();
    expect(screen.getByText('qSOFA')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /protocols/i })).toBeInTheDocument();
    expect(screen.getByText('Sepsis Management')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /simulations/i })).toBeInTheDocument();
    expect(screen.getByText('Sepsis Deterioration')).toBeInTheDocument();
    expect(screen.getByText('Clinical AI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open ai guidance/i })).toHaveAttribute(
      'href',
      '/assistant?agent=agent-clinical',
    );
  });

  it('saves full tenant configuration from configuration studio', async () => {
    renderPage(<ConfigurationStudioPage />);

    expect(await screen.findByRole('button', { name: /emergency department solution/i })).toHaveClass(
      'selected',
    );
    expect(screen.getByRole('heading', { name: /navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /workspaces/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /packs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /permissions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /branding/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ai agents/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dashboards/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /hidden nav ids/i }), {
      target: { value: 'legacy, outcomes' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /primary landing route/i }), {
      target: { value: '/command' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^display name$/i }), {
      target: { value: 'Demo Command' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /accent color/i }), {
      target: { value: '#0055ff' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /logo url/i }), {
      target: { value: '/logo.svg' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /workspace defaults json/i }), {
      target: { value: '[{"name":"Emergency Command","type":"emergency"}]' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /permissions overrides json/i }), {
      target: { value: '{"roles":{"admin":["configure-system"]}}' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /dashboard layout json/i }), {
      target: { value: '{"home":["platform-analytics"]}' },
    });
    fireEvent.click(screen.getByRole('button', { name: /emergency department pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /emergency ai/i }));
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.updateOrganizationConfiguration).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          navigation: {
            hiddenNavIds: ['legacy', 'outcomes'],
            primaryLanding: '/command',
          },
          branding: {
            displayName: 'Demo Command',
            accentColor: '#0055ff',
            logoUrl: '/logo.svg',
          },
          workspaceDefaults: [{ name: 'Emergency Command', type: 'emergency' }],
          permissionsOverrides: { roles: { admin: ['configure-system'] } },
          dashboardLayout: { home: ['platform-analytics'] },
          enabledAgentIds: ['agent-emergency'],
          enabledProductIds: ['product-emergency-department'],
          enabledPackIds: ['emergency-department-pack'],
        }),
      );
    });
    expect(mockIdentity.refreshPlatformContext).toHaveBeenCalled();
  });

  it('renders all seven onboarding steps in the required order', async () => {
    await renderOnboardingPage();

    [
      '1. Organization type',
      '2. Subscription plan',
      '3. Products and asset packs',
      '4. Workspace profile',
      '5. User roles',
      '6. Default workspace',
      '7. Finish setup',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it.each([
    ['hospital', /emergency/i, /emergency/i],
    ['clinic', /cardiology/i, /cardiology/i],
    ['ems', /operations/i, /ems command/i],
  ])('applies editable %s tenant presets', async (type, specialty, workspaceName) => {
    await renderOnboardingPage();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: type } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const specialtyButton = screen.getByRole('button', { name: specialty });
    expect(specialtyButton).toHaveClass('selected');
    fireEvent.click(specialtyButton);
    expect(specialtyButton).not.toHaveClass('selected');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getAllByDisplayValue(workspaceName).length).toBeGreaterThan(0);
  });

  it('reviews and activates the configured tenant profile payload', async () => {
    await renderOnboardingPage();

    const [nameInput, slugInput] = screen.getAllByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'North EMS' } });
    fireEvent.change(slugInput, { target: { value: 'north-ems' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ems' } });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /operations/i })).toHaveClass('selected');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByDisplayValue(/ems command/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByRole('button', { name: /emergency department solution/i });
    fireEvent.click(screen.getByRole('button', { name: /emergency department solution/i }));

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByDisplayValue(/fleet operator/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const brandingInputs = screen.getAllByRole('textbox');
    fireEvent.change(brandingInputs[0], { target: { value: 'North EMS Command' } });
    fireEvent.change(brandingInputs[1], { target: { value: '#00ff88' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('button', { name: /identity-sso/i })).toHaveClass('selected');

    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'North EMS',
          slug: 'north-ems',
          organizationType: 'ems',
          specialties: expect.arrayContaining(['emergency', 'operations']),
          complianceMode: 'ems',
          enabledProductIds: ['product-emergency-department'],
          productIds: ['product-emergency-department'],
          packIds: expect.arrayContaining(['core-platform', 'emergency-medicine', 'fleet-logistics']),
          enabledWorkspaces: expect.arrayContaining(['emergency', 'fleet', 'operations']),
          clientProfile: expect.objectContaining({
            organizationType: 'ems',
            enabledWorkspaces: expect.arrayContaining(['emergency', 'fleet', 'operations']),
            defaultWorkspace: 'emergency',
          }),
          integrationSlugs: expect.arrayContaining(['identity-sso', 'scheduling']),
          branding: expect.objectContaining({
            displayName: 'North EMS Command',
            accentColor: '#00ff88',
          }),
          workspaceSetups: expect.arrayContaining([
            expect.objectContaining({
              name: 'EMS Command',
              emergencyModeEnabled: true,
            }),
          ]),
        }),
      );
    });
    expect(await screen.findByRole('heading', { name: /configured tenant profile/i })).toBeInTheDocument();
    expect(screen.getByText(/North EMS \(ems\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/EMS Command/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/North EMS Command/i)).toBeInTheDocument();
  });
});
