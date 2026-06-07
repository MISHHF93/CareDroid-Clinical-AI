import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlatformAdminPage from './PlatformAdminPage';

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({
    tenantContext: {
      organizationId: 'org-platform',
      organizationName: 'North Memorial',
      workspaceId: 'emergency',
      role: 'owner',
      userId: 'user-1',
    },
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-platform', name: 'North Memorial' },
    platformContext: {
      organization: { id: 'org-platform', name: 'North Memorial' },
      assignedProducts: [{ id: 'clinical-os', name: 'Clinical OS' }],
      entitledPacks: [{ id: 'emergency-pack', name: 'Emergency Pack' }],
      entitledAssetIds: ['asset-1', 'asset-2', 'asset-3'],
      subscription: { tier: 'enterprise', status: 'active' },
    },
    workspaces: [{ id: 'emergency' }, { id: 'icu' }],
  }),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    organization: { id: 'org-platform', name: 'North Memorial' },
    subscription: { tier: 'enterprise', status: 'active' },
    users: [{ id: 'user-1' }, { id: 'user-2' }],
    integrations: [{ slug: 'fhir', status: 'enabled' }],
  }),
}));

describe('PlatformAdminPage', () => {
  it('renders the unified SaaS concept chain and required overviews', () => {
    render(
      <MemoryRouter>
        <PlatformAdminPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /north memorial/i })).toBeInTheDocument();
    const chain = within(screen.getByLabelText(/saas operating system chain/i));
    expect(chain.getByText('Organization')).toBeInTheDocument();
    expect(chain.getByText('Subscription')).toBeInTheDocument();
    expect(chain.getByText('Products')).toBeInTheDocument();
    expect(chain.getByText('Asset Packs')).toBeInTheDocument();
    expect(chain.getByText('Assets')).toBeInTheDocument();
    expect(chain.getByText('Workspaces')).toBeInTheDocument();
    expect(chain.getByText('Users')).toBeInTheDocument();
    expect(chain.getByText('AI Agents')).toBeInTheDocument();
    expect(chain.getByText('Automations')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /organization overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /product overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /asset overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /automation overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tenant overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /health overview/i })).toBeInTheDocument();
  });
});
