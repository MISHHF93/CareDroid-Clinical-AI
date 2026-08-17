import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationSettings, PackMarketplace } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { ProductCatalogApi } from '../../services/productCatalogApi';

vi.mock('./OrganizationPages.css', () => ({}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({}),
}));

const identityState = {
  organization: null as any,
  refreshPlatformContext: vi.fn(),
  refreshIdentity: vi.fn(),
  platformContext: null as any,
  account: null,
  preferences: null,
  activeWorkspace: null,
  workspaceState: {},
  roleProfile: null,
};

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => identityState,
}));

const orgContextState = {
  branding: null as any,
  integrations: [] as any[],
  subscription: null as any,
  supportedOrganizationTypes: [] as string[],
  refreshOrganizationEngine: vi.fn(),
  saveOrganizationSettings: vi.fn(),
};

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => orgContextState,
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    createOrganization: vi.fn(),
    setRoleProfile: vi.fn(),
    listPacks: vi.fn(),
    getContext: vi.fn(),
    listRoleProfiles: vi.fn(),
    installPack: vi.fn(),
    removePack: vi.fn(),
    listMarketplacePacks: vi.fn(),
  },
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getPackProductMap: vi.fn(),
  },
}));

function renderSettings() {
  return render(
    <MemoryRouter>
      <OrganizationSettings />
    </MemoryRouter>,
  );
}

function renderMarketplace() {
  return render(
    <MemoryRouter>
      <PackMarketplace />
    </MemoryRouter>,
  );
}

describe('OrganizationSettings double-submit guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identityState.organization = null;
    orgContextState.branding = null;
    orgContextState.subscription = null;
    orgContextState.integrations = [];
    orgContextState.supportedOrganizationTypes = [];
    vi.mocked(PlatformAssetsApi.listPacks).mockResolvedValue([]);
    vi.mocked(PlatformAssetsApi.getContext).mockResolvedValue({});
    vi.mocked(PlatformAssetsApi.listRoleProfiles).mockResolvedValue([]);
  });

  it('calls createOrganization exactly once even when clicked twice rapidly', async () => {
    vi.mocked(PlatformAssetsApi.createOrganization).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as any), 30)),
    );

    renderSettings();

    const button = screen.getByRole('button', { name: /create organization/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/organization created/i)).toBeInTheDocument();
    });
    expect(PlatformAssetsApi.createOrganization).toHaveBeenCalledTimes(1);
  });

  it('calls saveOrganizationSettings exactly once even when "Save organization" is clicked twice rapidly', async () => {
    identityState.organization = { id: 'org-1', name: 'CareDroid Hospital' };
    orgContextState.saveOrganizationSettings.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, data: {} }), 30)),
    );

    renderSettings();

    const button = await screen.findByRole('button', { name: /save organization/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/^Saved\.$/)).toBeInTheDocument();
    });
    expect(orgContextState.saveOrganizationSettings).toHaveBeenCalledTimes(1);
  });

  it('calls setRoleProfile exactly once even when "Save role profile" is clicked twice rapidly', async () => {
    vi.mocked(PlatformAssetsApi.listRoleProfiles).mockResolvedValue([
      { id: 'role-1', label: 'Charge Nurse' },
    ] as any);
    vi.mocked(PlatformAssetsApi.setRoleProfile).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as any), 30)),
    );

    renderSettings();

    const select = await screen.findByDisplayValue('Select role profile');
    fireEvent.change(select, { target: { value: 'role-1' } });

    const button = screen.getByRole('button', { name: /save role profile/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/role profile updated/i)).toBeInTheDocument();
    });
    expect(PlatformAssetsApi.setRoleProfile).toHaveBeenCalledTimes(1);
  });
});

describe('PackMarketplace togglePack in-flight guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identityState.organization = { id: 'org-1', name: 'CareDroid Hospital' };
    identityState.platformContext = { entitledPackIds: [] };
    vi.mocked(PlatformAssetsApi.listMarketplacePacks).mockResolvedValue([
      { id: 'pack-1', name: 'Core Pack', enabled: false, warnings: [] },
    ] as any);
    vi.mocked(ProductCatalogApi.getPackProductMap).mockResolvedValue({});
  });

  it('calls installPack exactly once for a pack even when "Enable pack" is clicked twice rapidly', async () => {
    vi.mocked(PlatformAssetsApi.installPack).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as any), 30)),
    );

    renderMarketplace();

    const button = await screen.findByRole('button', { name: /enable pack/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/pack updated/i)).toBeInTheDocument();
    });
    expect(PlatformAssetsApi.installPack).toHaveBeenCalledTimes(1);
  });
});
