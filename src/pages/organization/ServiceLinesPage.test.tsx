import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceLinesPage } from './OrganizationPages';
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
    listServiceLines: vi.fn(),
    getOrganizationAnalytics: vi.fn(),
    listDepartments: vi.fn(),
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

const serviceLineGraph = {
  serviceLines: [
    {
      id: 'emergency-medicine',
      name: 'Emergency Medicine',
      departmentCount: 1,
      packCount: 1,
      assetCount: 1,
      departments: [
        {
          id: 'emergency',
          name: 'Emergency',
          packCount: 1,
          assetCount: 1,
        },
      ],
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
          departmentIds: ['emergency'],
          packIds: ['emergency-department-pack'],
        },
      ],
    },
    {
      id: 'critical-care',
      name: 'Critical Care',
      departmentCount: 3,
      packCount: 0,
      assetCount: 0,
      departments: [],
      packs: [],
      assets: [],
    },
  ],
};

describe('ServiceLinesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.listServiceLines).mockResolvedValue(serviceLineGraph);
  });

  it('renders service-line mappings with departments, packs, and assets', async () => {
    render(
      <MemoryRouter>
        <ServiceLinesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /service lines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emergency medicine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /critical care/i })).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
    expect(screen.getByText('Emergency Department Pack')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /qsofa/i })).toHaveAttribute(
      'href',
      '/tools/calculators/qsofa',
    );
    expect(PlatformAssetsApi.listServiceLines).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });
});
