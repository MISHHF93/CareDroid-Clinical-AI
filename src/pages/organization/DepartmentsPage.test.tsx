import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DepartmentsPage } from './OrganizationPages';
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
    listDepartments: vi.fn(),
    getOrganizationAnalytics: vi.fn(),
    listPacks: vi.fn(),
    getContext: vi.fn(),
    listRoleProfiles: vi.fn(),
  },
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getPackProductMap: vi.fn().mockResolvedValue({}),
  },
}));

const departmentGraph = {
  departments: [
    {
      id: 'emergency',
      name: 'Emergency',
      assetCount: 1,
      packCount: 1,
      userCount: 1,
      packs: [
        {
          id: 'emergency-department-pack',
          name: 'Emergency Department Pack',
          assetIds: ['qsofa'],
          enabled: true,
        },
      ],
      assets: [
        {
          id: 'qsofa',
          title: 'qSOFA',
          assetType: 'calculator',
          route: '/tools/calculators/qsofa',
          primaryDepartment: 'emergency',
          secondaryDepartments: ['icu'],
          recommendedRoles: ['emergency physician'],
          requiredPermissions: ['use-calculators'],
        },
      ],
      users: [
        {
          userId: 'user-1',
          displayName: 'Dr. Rivera',
          role: 'admin',
          roleProfileId: 'emergency-physician',
          specialty: 'Emergency',
        },
      ],
    },
    {
      id: 'icu',
      name: 'ICU',
      assetCount: 1,
      packCount: 0,
      userCount: 0,
      packs: [],
      assets: [],
      users: [],
    },
  ],
};

describe('DepartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.listDepartments).mockResolvedValue(departmentGraph);
  });

  it('renders department-to-asset mappings with packs, assets, roles, permissions, and users', async () => {
    render(
      <MemoryRouter>
        <DepartmentsPage />
      </MemoryRouter>,
    );

    // Page title is registered into the shell chrome (useRouteChromeRegistration)
    // rather than rendered as a local heading -- rendered here without a real
    // AppShell/RouteChromeProvider, so it falls back to the sr-equivalent testid.
    expect(await screen.findByTestId('cd-page-title-text')).toHaveTextContent(/departments/i);
    expect(screen.getByRole('button', { name: /emergency/i })).toBeInTheDocument();
    expect(screen.getByText('Emergency Department Pack')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /qsofa/i })).toHaveAttribute(
      'href',
      '/tools/calculators/qsofa',
    );
    expect(screen.getByText(/roles: emergency physician/i)).toBeInTheDocument();
    expect(screen.getByText(/permissions: use-calculators/i)).toBeInTheDocument();
    expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    expect(PlatformAssetsApi.listDepartments).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });
});
