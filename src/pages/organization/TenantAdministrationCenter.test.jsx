import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TenantAdministrationCenter } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

const refreshPlatformContext = vi.fn();

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1', name: 'Demo Hospital', slug: 'demo-hospital' },
    refreshPlatformContext,
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

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getPackProductMap: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getTenantAdministration: vi.fn(),
    updateTenantAdministration: vi.fn(),
    getOrganizationAnalytics: vi.fn(),
    listDepartments: vi.fn(),
    listServiceLines: vi.fn(),
    listPacks: vi.fn(),
    getContext: vi.fn(),
    listRoleProfiles: vi.fn(),
  },
}));

const tenantAdmin = {
  profile: {
    id: 'org-1',
    name: 'Demo Hospital',
    organizationType: 'hospital',
    country: 'US',
    tenantId: 'demo-hospital',
    complianceMode: 'hipaa',
  },
  departments: ['emergency', 'icu'],
  workspaces: [{ id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa'] }],
  users: [
    {
      membershipId: 'membership-1',
      userId: 'user-1',
      displayName: 'Dr. Rivera',
      membershipRole: 'owner',
      roleProfileId: 'emergency-physician',
      specialty: 'Emergency Medicine',
    },
  ],
  roles: {
    membershipRoles: ['owner', 'admin', 'member'],
    roleProfiles: [
      {
        id: 'emergency-physician',
        label: 'Emergency Physician',
        requiredPermissions: ['USE_CALCULATORS'],
      },
    ],
  },
  permissions: {
    catalog: [{ id: 'CONFIGURE_SYSTEM', description: 'Configure system', category: 'System' }],
    overrides: { owner: ['CONFIGURE_SYSTEM'] },
  },
  branding: {
    displayName: 'Demo Care',
    logoUrl: 'https://cdn.example.com/logo.svg',
    faviconUrl: 'https://cdn.example.com/favicon.ico',
    primaryColor: '#0f766e',
    accentColor: '#2563eb',
    theme: 'light',
    loginTitle: 'Demo Care Login',
    loginSubtitle: 'Use your hospital credentials.',
    loginBackgroundImageUrl: 'https://cdn.example.com/login.jpg',
    dashboardTitle: 'Demo Care Command',
    dashboardSubtitle: 'Your branded command center.',
    dashboardLogoUrl: 'https://cdn.example.com/dashboard-logo.svg',
  },
  integrations: [
    { slug: 'hl7', name: 'HL7', category: 'ehr', status: 'enabled' },
    { slug: 'fhir', name: 'FHIR', category: 'ehr', status: 'requested' },
  ],
  subscriptions: {
    current: { tier: 'enterprise', status: 'active', source: 'organization-settings' },
  },
  noCodeConfiguration: {
    integrationsRequested: ['fhir'],
  },
  supportedOrganizationTypes: ['hospital', 'clinic'],
};

describe('TenantAdministrationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlatformAssetsApi.getTenantAdministration.mockResolvedValue(tenantAdmin);
    PlatformAssetsApi.updateTenantAdministration.mockResolvedValue(tenantAdmin);
  });

  it('renders tenant-scoped administration sections', async () => {
    render(
      <MemoryRouter>
        <TenantAdministrationCenter />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /tenant administration center/i })).toBeInTheDocument();
    expect(screen.getByText(/Tenant: demo-hospital/i)).toBeInTheDocument();
    expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    expect(screen.getByText('Emergency Physician')).toBeInTheDocument();
    expect(screen.getByText('HL7')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://cdn.example.com/logo.svg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Demo Care Login')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Demo Care Command')).toBeInTheDocument();
    expect(PlatformAssetsApi.getTenantAdministration).toHaveBeenCalledWith('org-1');
  });

  it('saves no-code tenant administration updates', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TenantAdministrationCenter />
      </MemoryRouter>,
    );

    const nameInput = await screen.findByDisplayValue('Demo Hospital');
    await user.clear(nameInput);
    await user.type(nameInput, 'CareDroid Tenant');
    await user.click(screen.getByRole('button', { name: /save tenant administration/i }));

    await waitFor(() => {
      expect(PlatformAssetsApi.updateTenantAdministration).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          name: 'CareDroid Tenant',
          branding: expect.objectContaining({
            displayName: 'Demo Care',
            logoUrl: 'https://cdn.example.com/logo.svg',
            faviconUrl: 'https://cdn.example.com/favicon.ico',
            theme: 'light',
            loginTitle: 'Demo Care Login',
            dashboardTitle: 'Demo Care Command',
          }),
          departments: ['emergency', 'icu'],
          integrations: ['hl7'],
          integrationsRequested: ['fhir'],
          workspaceDefaults: [{ id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa'] }],
          permissionsOverrides: { owner: ['CONFIGURE_SYSTEM'] },
        }),
      );
    });
    expect(refreshPlatformContext).toHaveBeenCalled();
    expect(screen.getByText('Tenant administration saved.')).toBeInTheDocument();
  });
});
