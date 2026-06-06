import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerPortalPage from './CustomerPortalPage';
import { fetchCustomerPortalAdministration } from '../../services/customerPortalApi';
import { fetchBillingOverview } from '../../services/subscriptionApi';

vi.mock('./CustomerPortalPage.css', () => ({}));

let tenantContext;
let identityContext;
let organizationContext;
let userContext;

vi.mock('../../contexts/UserContext', () => ({
  Permission: {
    CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM',
    MANAGE_SUBSCRIPTIONS: 'MANAGE_SUBSCRIPTIONS',
    MANAGE_USERS: 'MANAGE_USERS',
    MANAGE_INTEGRATIONS: 'MANAGE_INTEGRATIONS',
  },
  useUser: () => userContext,
}));

vi.mock('../../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext }),
}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => identityContext,
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => organizationContext,
}));

vi.mock('../../services/customerPortalApi', () => ({
  fetchCustomerPortalAdministration: vi.fn(),
}));

vi.mock('../../services/subscriptionApi', () => ({
  createCustomerPortalSession: vi.fn(),
  fetchBillingOverview: vi.fn(),
}));

const adminModel = {
  profile: {
    id: 'org-1',
    name: 'North Memorial',
    organizationType: 'hospital',
    country: 'US',
    tenantId: 'north-memorial',
    complianceMode: 'hipaa',
  },
  branding: { displayName: 'North Memorial CareDroid' },
  workspaces: [
    { id: 'ed', name: 'Emergency Department', type: 'emergency' },
    { id: 'icu', name: 'ICU', type: 'icu' },
  ],
  users: [
    {
      membershipId: 'member-1',
      userId: 'user-1',
      displayName: 'Dr. Rivera',
      membershipRole: 'owner',
      roleProfileId: 'emergency-physician',
    },
  ],
  integrations: [
    { slug: 'fhir', name: 'FHIR', status: 'enabled' },
    { slug: 'identity-sso', name: 'Identity SSO', status: 'requested' },
  ],
  subscriptions: { current: { tier: 'enterprise', status: 'active' } },
  noCodeConfiguration: {
    enabledProductIds: ['product-command-center'],
    enabledPackIds: ['emergency-department-pack'],
  },
};

function renderPortal() {
  return render(
    <MemoryRouter>
      <CustomerPortalPage />
    </MemoryRouter>
  );
}

describe('CustomerPortalPage', () => {
  beforeEach(() => {
    tenantContext = {
      organizationId: 'org-1',
      organizationName: 'North Memorial',
      workspaceId: 'ed',
      userId: 'user-1',
      role: 'admin',
      subscriptionPlan: 'enterprise',
    };
    identityContext = {
      organization: { id: 'org-1', name: 'North Memorial' },
      platformContext: {
        assignedProducts: [
          {
            id: 'product-command-center',
            name: 'Command Center',
            productType: 'platform',
          },
        ],
        entitledPacks: [
          {
            id: 'emergency-department-pack',
            name: 'Emergency Department Pack',
            assetIds: ['qsofa'],
          },
        ],
        entitledAssetIds: ['qsofa'],
      },
      workspaces: adminModel.workspaces,
      activeWorkspace: { id: 'ed', name: 'Emergency Department' },
      roleProfile: { label: 'Emergency Physician' },
      entitledAssetIds: ['qsofa'],
      refreshPlatformContext: vi.fn(),
    };
    organizationContext = {
      organization: { id: 'org-1', name: 'North Memorial' },
      tenant: { tenantId: 'north-memorial', complianceMode: 'hipaa' },
      branding: { displayName: 'North Memorial CareDroid' },
      integrations: adminModel.integrations,
      subscription: { tier: 'enterprise', status: 'active' },
      refreshOrganizationEngine: vi.fn(),
    };
    userContext = {
      user: { id: 'user-1', role: 'admin' },
      hasAnyPermission: vi.fn(() => true),
    };

    vi.clearAllMocks();
    fetchCustomerPortalAdministration.mockResolvedValue({
      ok: true,
      data: adminModel,
      message: '',
    });
    fetchBillingOverview.mockResolvedValue({
      ok: true,
      data: {
        status: 'active',
        currentPlan: {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Enterprise deployment.',
        },
      },
      message: '',
    });
  });

  it('renders every customer portal section from the current tenant organization', async () => {
    renderPortal();

    expect(await screen.findByRole('heading', { name: /north memorial caredroid/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchCustomerPortalAdministration).toHaveBeenCalledWith('org-1'));
    expect(screen.getByRole('heading', { name: /subscription overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /enabled products/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /enabled asset packs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /organization profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /workspaces/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /invoices/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /support requests/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /release notes/i })).toBeInTheDocument();
    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Emergency Department Pack')).toBeInTheDocument();
    expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    expect(screen.getByText('FHIR')).toBeInTheDocument();
  });

  it('does not request portal administration when tenant context conflicts with organization context', async () => {
    tenantContext = {
      ...tenantContext,
      organizationId: 'other-org',
    };

    renderPortal();

    expect(
      await screen.findByText(/tenant context does not match the active organization/i)
    ).toBeInTheDocument();
    expect(fetchCustomerPortalAdministration).not.toHaveBeenCalled();
  });
});
