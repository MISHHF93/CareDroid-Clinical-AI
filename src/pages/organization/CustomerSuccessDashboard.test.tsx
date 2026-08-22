import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CustomerSuccessDashboard } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1', name: 'Demo Hospital' },
  }),
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    branding: {},
    integrations: [],
    subscription: {},
    tenant: {},
    supportedOrganizationTypes: [],
    refreshOrganizationEngine: vi.fn(),
    saveOrganizationSettings: vi.fn(),
  }),
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getCustomerSuccessDashboard: vi.fn(),
  },
}));

const dashboard = {
  health: { score: 82, status: 'healthy', retentionRisk: 'low' },
  metrics: {
    adoption: { value: 75, enabledPackCount: 3, enabledAssetCount: 12, totalAssetCount: 16 },
    activeUsers: { value: 42 },
    assetUsage: {
      value: 128,
      topAssets: [{ id: 'qsofa', label: 'qSOFA', count: 24, assetType: 'calculator' }],
    },
    aiUsage: { value: 31 },
    simulationsCompleted: { value: 9 },
    workflowsCompleted: { value: 17 },
    underusedProducts: [
      {
        id: 'product-lab',
        slug: 'laboratory',
        name: 'Laboratory',
        enabledAssetCount: 4,
        usageCount: 0,
        expectedOutcomes: ['Improve turnaround time'],
      },
    ],
  },
  signals: [
    {
      id: 'adoption',
      label: 'Adoption',
      status: 'healthy',
      message: '75% of platform assets are enabled through current packs.',
    },
  ],
  sources: { usageEvents: 12, auditEvents: 5, enabledEntitlements: 3, products: 6 },
};

describe('CustomerSuccessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.getCustomerSuccessDashboard).mockResolvedValue(dashboard);
  });

  it('renders customer health, usage metrics, and underused products', async () => {
    render(
      <BrowserRouter>
        <CustomerSuccessDashboard />
      </BrowserRouter>
    );

    // Page title is registered into the shell chrome (useRouteChromeRegistration)
    // rather than rendered as a local heading -- rendered here without a real
    // AppShell/RouteChromeProvider, so it falls back to the sr-equivalent testid.
    expect(await screen.findByTestId('cd-page-title-text')).toHaveTextContent(/customer success/i);
    expect(screen.getByRole('heading', { name: /health score/i })).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /active users/i })).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ai usage/i })).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('qSOFA')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /underused products/i })).toBeInTheDocument();
    expect(screen.getByText('Laboratory')).toBeInTheDocument();
    expect(PlatformAssetsApi.getCustomerSuccessDashboard).toHaveBeenCalledWith('org-1', 'month');
  });
});
