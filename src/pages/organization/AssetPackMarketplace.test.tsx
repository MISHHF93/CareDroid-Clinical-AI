import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PackMarketplace } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1', organizationType: 'hospital' },
    platformContext: { entitledPackIds: [] },
    refreshPlatformContext: vi.fn(),
  }),
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    branding: {},
    integrations: [],
    subscription: {},
    supportedOrganizationTypes: [],
    refreshOrganizationEngine: vi.fn(),
    saveOrganizationSettings: vi.fn(),
    tenant: {},
  }),
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    listMarketplacePacks: vi.fn(),
    installPack: vi.fn(),
    removePack: vi.fn(),
  },
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getPackProductMap: vi.fn().mockResolvedValue({}),
  },
}));

const marketplacePack = {
  id: 'emergency-department-pack',
  name: 'Emergency Department Pack',
  description: 'ED risk stratification and triage workflows.',
  pricingTier: 'enterprise',
  enabled: false,
  includedAssetCount: 2,
  includedAssets: [
    { id: 'qsofa', title: 'qSOFA', type: 'calculator', route: '/tools/calculators' },
    { id: 'news2', title: 'NEWS2', type: 'calculator', route: '/tools/calculators' },
  ],
  dependencies: [{ id: 'core-platform', name: 'Core Platform', enabled: false }],
  roleMapping: [{ roleProfileId: 'ed-physician', label: 'ED Physician' }],
  defaultModules: ['dashboard', 'alerts'],
  organizationTypes: ['hospital', 'ems'],
  warnings: [{ type: 'dependency', message: 'Requires Core Platform.' }],
};

describe('PackMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.listMarketplacePacks).mockResolvedValue([marketplacePack]);
    vi.mocked(PlatformAssetsApi.installPack).mockResolvedValue({});
    vi.mocked(PlatformAssetsApi.removePack).mockResolvedValue({});
  });

  it('renders marketplace pack details from the backend projection', async () => {
    render(
      <MemoryRouter>
        <PackMarketplace />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /emergency department pack/i })).toBeInTheDocument();
    expect(screen.getByText(/Core Platform missing/i)).toBeInTheDocument();
    expect(screen.getByText('ED Physician')).toBeInTheDocument();
    expect(screen.getByText('qSOFA')).toBeInTheDocument();
    expect(screen.getByText(/Requires Core Platform/i)).toBeInTheDocument();
  });

  it('enables packs for the current organization', async () => {
    render(
      <MemoryRouter>
        <PackMarketplace />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /enable pack/i }));

    await waitFor(() => {
      expect(PlatformAssetsApi.installPack).toHaveBeenCalledWith('org-1', 'emergency-department-pack');
    });
  });
});
