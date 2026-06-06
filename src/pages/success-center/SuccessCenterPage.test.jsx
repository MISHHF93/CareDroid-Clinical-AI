import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuccessCenterPage from './SuccessCenterPage';
import { fetchSuccessCenterDashboard } from '../../services/successCenterApi';

vi.mock('./SuccessCenterPage.css', () => ({}));

let tenantContext;
let identityContext;
let organizationContext;

vi.mock('../../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext }),
}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => identityContext,
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => organizationContext,
}));

vi.mock('../../services/successCenterApi', () => ({
  fetchSuccessCenterDashboard: vi.fn(),
}));

const successDashboard = {
  organizationId: 'org-1',
  health: {
    score: 86,
    status: 'healthy',
  },
  metrics: {
    adoption: {
      value: 72,
      enabledPackCount: 3,
      enabledAssetCount: 21,
      totalAssetCount: 29,
    },
    activeUsers: { value: 18 },
    assetUsage: {
      value: 144,
      topAssets: [
        {
          id: 'qsofa',
          label: 'qSOFA',
          count: 48,
          assetType: 'calculator',
        },
      ],
    },
    aiUsage: { value: 62 },
    simulationsCompleted: { value: 7 },
    workflowsCompleted: { value: 11 },
  },
  signals: [
    {
      id: 'adoption',
      label: 'Adoption',
      status: 'healthy',
      message: '72% of platform assets are enabled.',
    },
  ],
  sources: {
    usageEvents: 120,
    auditEvents: 30,
  },
};

function renderSuccessCenter() {
  return render(
    <MemoryRouter>
      <SuccessCenterPage />
    </MemoryRouter>
  );
}

describe('SuccessCenterPage', () => {
  beforeEach(() => {
    tenantContext = {
      organizationId: 'org-1',
      organizationName: 'North Memorial',
      workspaceId: 'ed',
    };
    identityContext = {
      organization: { id: 'org-1', name: 'North Memorial' },
      platformContext: {
        assignedProducts: [{ id: 'clinical-command', name: 'Clinical Command' }],
        entitledPacks: [{ id: 'emergency-pack', name: 'Emergency Pack' }],
        entitledAssetIds: ['qsofa', 'news2'],
      },
      workspaces: [
        {
          id: 'ed',
          name: 'Emergency Department',
          settings: { enabledToolIds: ['qsofa'] },
        },
        {
          id: 'icu',
          name: 'ICU',
          settings: { enabledToolIds: [] },
        },
      ],
      activeWorkspace: { id: 'ed', name: 'Emergency Department' },
      roleProfile: { id: 'emergency-physician', label: 'Emergency Physician' },
    };
    organizationContext = {
      organization: { id: 'org-1', name: 'North Memorial' },
      integrations: [{ slug: 'fhir', status: 'enabled' }],
      subscription: { tier: 'enterprise', status: 'active' },
    };

    vi.clearAllMocks();
    fetchSuccessCenterDashboard.mockResolvedValue({
      ok: true,
      data: successDashboard,
      message: '',
    });
  });

  it('renders health score, status, and required value metrics for the tenant organization', async () => {
    renderSuccessCenter();

    expect(await screen.findByRole('heading', { name: /north memorial/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchSuccessCenterDashboard).toHaveBeenCalledWith('org-1', 'month'));
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/adoption score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/workspace adoption/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/asset usage/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ai usage/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/simulation completion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/workflow completion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/onboarding progress/i).length).toBeGreaterThan(0);
    expect(screen.getByText('qSOFA')).toBeInTheDocument();
  });

  it('does not fetch success metrics when tenant and organization context disagree', async () => {
    tenantContext = {
      ...tenantContext,
      organizationId: 'other-org',
    };

    renderSuccessCenter();

    expect(
      await screen.findByText(/tenant context does not match the active organization/i)
    ).toBeInTheDocument();
    expect(fetchSuccessCenterDashboard).not.toHaveBeenCalled();
  });
});
