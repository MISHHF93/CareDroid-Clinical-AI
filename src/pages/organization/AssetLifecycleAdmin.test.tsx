import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssetLifecycleAdmin } from './OrganizationPages';
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
    listAssets: vi.fn(),
    updateAssetLifecycle: vi.fn(),
  },
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getPackProductMap: vi.fn().mockResolvedValue({}),
  },
}));

const assets = [
  {
    id: 'qsofa',
    title: 'qSOFA',
    assetType: 'calculator',
    lifecycle: 'active',
  },
  {
    id: 'agent-clinical',
    title: 'CareDroid',
    assetType: 'ai_agent',
    lifecycle: 'beta',
  },
  {
    id: 'fhir-connector',
    title: 'FHIR Connector',
    assetType: 'integration',
    lifecycle: 'draft',
  },
];

describe('AssetLifecycleAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.listAssets).mockResolvedValue(assets);
    vi.mocked(PlatformAssetsApi.updateAssetLifecycle).mockResolvedValue({});
  });

  it('renders canonical lifecycle states and updates assets through the backend', async () => {
    render(
      <MemoryRouter>
        <AssetLifecycleAdmin />
      </MemoryRouter>
    );

    // Page title is registered into the shell chrome (useRouteChromeRegistration)
    // rather than rendered as a local heading -- rendered here without a real
    // AppShell/RouteChromeProvider, so it falls back to the sr-equivalent testid.
    expect(await screen.findByTestId('cd-page-title-text')).toHaveTextContent(/asset lifecycle/i);
    expect(screen.getByText('CareDroid')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Archived$/i }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /^Archived$/i })[0]);

    await waitFor(() => {
      expect(PlatformAssetsApi.updateAssetLifecycle).toHaveBeenCalledWith('qsofa', 'archived');
    });
    expect(PlatformAssetsApi.listAssets).toHaveBeenCalled();
  });
});
