import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationIntelligenceProfile } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: {
      id: 'org-1',
      name: 'Demo Hospital',
      organizationType: 'hospital',
      slug: 'demo-hospital',
    },
    entitledPackIds: ['core-platform'],
    platformContext: {
      entitledPackIds: ['core-platform'],
      defaultAiAgentId: 'agent-clinical',
      availablePacks: [
        { id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] },
        {
          id: 'simulation-training-pack',
          name: 'Simulation Training Pack',
          assetIds: ['simulation-suite'],
          workspaceIds: ['education'],
          organizationTypes: ['hospital'],
        },
      ],
    },
  }),
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Demo Hospital',
      organizationType: 'hospital',
      slug: 'demo-hospital',
    },
    tenant: { tenantId: 'demo-hospital' },
    subscription: { tier: 'enterprise' },
    integrations: [],
  }),
}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspaceId: 'emergency',
    activeWorkspace: { id: 'emergency', name: 'Emergency' },
    workspaces: [{ id: 'emergency', name: 'Emergency', toolIds: ['qsofa'] }],
    visibleAssetIds: ['qsofa'],
    recommendations: [],
  }),
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getOrganizationAnalytics: vi.fn(),
    getCustomerSuccessDashboard: vi.fn(),
    getTenantAdministration: vi.fn(),
    listMarketplacePacks: vi.fn(),
  },
}));

const analytics = {
  enabledPackIds: ['core-platform'],
  dashboards: {
    adoption: {
      enabledPackCount: 1,
      enabledAssetCount: 4,
      totalAssetCount: 12,
      adoptionScore: 33,
    },
    engagement: {
      aiUsageCount: 0,
      simulationCompletionCount: 0,
      dashboardEngagementCount: 0,
    },
    underusedAssets: [
      {
        id: 'unused-tool',
        label: 'Unused Tool',
        count: 0,
        metadata: { route: '/tools/unused-tool', assetType: 'workflow' },
      },
    ],
    topAssets: [{ id: 'qsofa', label: 'qSOFA', count: 18 }],
  },
  dimensions: {
    assetUsage: [{ id: 'qsofa', label: 'qSOFA', count: 18 }],
    aiUsage: [],
    workspaceUsage: [{ id: 'emergency', label: 'Emergency', count: 10 }],
  },
};

const customerSuccess = {
  health: { score: 46, status: 'at-risk', retentionRisk: 'high' },
  metrics: {
    adoption: { value: 33, enabledPackCount: 1, enabledAssetCount: 4, totalAssetCount: 12 },
    activeUsers: { value: 9 },
    assetUsage: { value: 18 },
    aiUsage: { value: 0 },
    simulationsCompleted: { value: 0 },
    workflowsCompleted: { value: 0 },
  },
};

describe('OrganizationIntelligenceProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.getOrganizationAnalytics).mockResolvedValue(analytics);
    vi.mocked(PlatformAssetsApi.getCustomerSuccessDashboard).mockResolvedValue(customerSuccess);
    vi.mocked(PlatformAssetsApi.getTenantAdministration).mockResolvedValue({
      profile: { id: 'org-1', name: 'Demo Hospital', organizationType: 'hospital' },
      departments: ['emergency', 'icu'],
      workspaces: [{ id: 'education', name: 'Education', enabledToolIds: [] }],
    });
    vi.mocked(PlatformAssetsApi.listMarketplacePacks).mockResolvedValue([
      { id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] },
      {
        id: 'simulation-training-pack',
        name: 'Simulation Training Pack',
        assetIds: ['simulation-suite'],
        workspaceIds: ['education'],
        organizationTypes: ['hospital'],
      },
    ]);
  });

  it('renders organization profile, recommendations, and adaptation signals', async () => {
    render(
      <MemoryRouter>
        <OrganizationIntelligenceProfile />
      </MemoryRouter>
    );

    // Page title is registered into the shell chrome (useRouteChromeRegistration)
    // rather than rendered as a local heading -- rendered here without a real
    // AppShell/RouteChromeProvider, so it falls back to the sr-equivalent testid.
    expect(await screen.findByTestId('cd-page-title-text')).toHaveTextContent(/organization intelligence/i);
    expect(screen.getByText(/Organization Intelligence Profile for Demo Hospital/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /missing packs/i })).toBeInTheDocument();
    expect(screen.getByText(/Enable Simulation Training Pack/i)).toBeInTheDocument();
    expect(screen.getByText(/Activate Unused Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch workflow playbooks/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule simulation practice/i)).toBeInTheDocument();
    expect(screen.getByText(/Automate follow-up for qSOFA/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduce AI assistant workflows/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /platform adaptation signals/i })).toBeInTheDocument();
    expect(PlatformAssetsApi.getOrganizationAnalytics).toHaveBeenCalledWith('org-1');
    expect(PlatformAssetsApi.getCustomerSuccessDashboard).toHaveBeenCalledWith('org-1', 'month');
    expect(PlatformAssetsApi.getTenantAdministration).toHaveBeenCalledWith('org-1');
  });
});
