import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  AssetPacksBuilderPage,
  ConfigurationStudioPage,
  OrganizationOnboardingPage,
  ProductsIndexPage,
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
    listProductBuilder: vi.fn(),
    listAssetPackBuilder: vi.fn(),
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
    name: 'Emergency Department Suite',
    description: 'ED risk stratification and triage workflows.',
    packIds: ['emergency-department-pack'],
    targetBuyers: ['ED director'],
    pricingTierPlaceholder: 'Enterprise',
  },
  packs: [
    {
      id: 'emergency-department-pack',
      name: 'Emergency Department Pack',
      assetIds: ['qsofa'],
      pricingTier: 'enterprise',
      assets: [{ id: 'qsofa', title: 'qSOFA', route: '/tools/calculators/qsofa' }],
    },
  ],
  assets: [{ id: 'qsofa', title: 'qSOFA', route: '/tools/calculators/qsofa' }],
  routes: [{ assetId: 'qsofa', route: '/tools/calculators/qsofa' }],
  backendServices: ['ClinicalTools'],
};

const packGraph = {
  id: 'emergency-department-pack',
  name: 'Emergency Department Pack',
  description: 'ED package.',
  assetIds: ['qsofa'],
  requiredDependencies: ['core-platform'],
  pricingTier: 'enterprise',
  products: [{ id: 'product-emergency-department', name: 'Emergency Department Suite' }],
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

function renderPage(element) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
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
    ProductCatalogApi.listAssetPackBuilder.mockResolvedValue([packGraph]);
    ProductCatalogApi.updateOrganizationConfiguration.mockResolvedValue({});
    ProductCatalogApi.completeOnboarding.mockResolvedValue({});
    PlatformAssetsApi.listPacks.mockResolvedValue(onboardingPacks);
    PlatformAssetsApi.listRoleProfiles.mockResolvedValue(roleProfiles);
  });

  it('renders products as product-pack-asset-route-service graph cards', async () => {
    renderPage(<ProductsIndexPage />);

    expect(await screen.findByRole('heading', { name: /emergency department suite/i })).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('1 packs')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('1 assets')).length).toBeGreaterThan(0);
    expect(screen.getByText(/clinicaltools/i)).toBeInTheDocument();
  });

  it('renders asset pack builder mappings', async () => {
    renderPage(<AssetPacksBuilderPage />);

    expect(await screen.findByRole('heading', { name: /emergency department pack/i })).toBeInTheDocument();
    expect(screen.getByText(/depends on:/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency department suite/i)).toBeInTheDocument();
    expect(screen.getByText(/tools\/calculators\/qsofa/i)).toBeInTheDocument();
  });

  it('saves selected products from configuration studio', async () => {
    renderPage(<ConfigurationStudioPage />);

    expect(await screen.findByRole('button', { name: /emergency department suite/i })).toHaveClass(
      'selected',
    );
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.updateOrganizationConfiguration).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          enabledProductIds: ['product-emergency-department'],
        }),
      );
    });
  });

  it('renders all nine onboarding steps in the required order', async () => {
    await renderOnboardingPage();

    [
      '1. Organization type',
      '2. Departments',
      '3. Workspaces',
      '4. User roles',
      '5. Asset packs',
      '6. Integrations',
      '7. Branding',
      '8. Compliance mode',
      '9. Review and activate',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it.each([
    ['hospital', /emergency/i, /clinical operations/i],
    ['clinic', /pharmacy/i, /clinic workspace/i],
    ['ems', /operations/i, /ems command/i],
  ])('applies editable %s tenant presets', async (type, department, workspaceName) => {
    await renderOnboardingPage();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: type } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const departmentButton = screen.getByRole('button', { name: department });
    expect(departmentButton).toHaveClass('selected');
    fireEvent.click(departmentButton);
    expect(departmentButton).not.toHaveClass('selected');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByDisplayValue(workspaceName)).toBeInTheDocument();
  });

  it('reviews and activates the configured tenant profile payload', async () => {
    await renderOnboardingPage();

    const [nameInput, slugInput] = screen.getAllByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'North EMS' } });
    fireEvent.change(slugInput, { target: { value: 'north-ems' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ems' } });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByRole('button', { name: /emergency department suite/i });
    fireEvent.click(screen.getByRole('button', { name: /emergency department suite/i }));

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const brandingInputs = screen.getAllByRole('textbox');
    fireEvent.change(brandingInputs[0], { target: { value: 'North EMS Command' } });
    fireEvent.change(brandingInputs[1], { target: { value: '#00ff88' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('button', { name: /ems operations/i })).toHaveClass('selected');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('heading', { name: /review and activate/i })).toBeInTheDocument();
    expect(screen.getByText(/North EMS \(ems\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/EMS Command/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/North EMS Command/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'North EMS',
          slug: 'north-ems',
          organizationType: 'ems',
          complianceMode: 'ems',
          enabledProductIds: ['product-emergency-department'],
          productIds: ['product-emergency-department'],
          packIds: expect.arrayContaining(['core-platform', 'emergency-medicine', 'fleet-logistics']),
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
  });
});
