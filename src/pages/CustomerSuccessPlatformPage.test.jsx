import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CustomerSuccessPlatformPage from './CustomerSuccessPlatformPage';

vi.mock('./CustomerSuccessPlatformPage.css', () => ({}));

vi.mock('../services/successCenterApi', () => ({
  fetchSuccessCenterDashboard: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      health: { score: 82, status: 'healthy', retentionRisk: 'low' },
      metrics: {
        adoption: { value: 75, enabledAssetCount: 12, totalAssetCount: 16 },
        activeUsers: { value: 42 },
        assetUsage: {
          value: 128,
          topAssets: [{ id: 'whiteboard', label: 'Emergency Whiteboard', count: 48 }],
        },
        aiUsage: { value: 31 },
        simulationsCompleted: { value: 9 },
        workflowsCompleted: { value: 17 },
        underusedProducts: [],
      },
      signals: [{ id: 'adoption', label: 'Adoption', status: 'healthy', message: '75% coverage.' }],
      period: { key: 'month' },
    },
    message: '',
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1', name: 'Demo Hospital' },
    platformContext: { assignedProducts: [{}], entitledPacks: [{}] },
    workspaces: [{ id: 'ed', name: 'Emergency', settings: { enabledToolIds: ['whiteboard'] } }],
    activeWorkspace: { id: 'ed' },
    roleProfile: { id: 'nurse', label: 'Nurse' },
  }),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    integrations: [{ status: 'requested' }],
    subscription: { status: 'active' },
  }),
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext: { organizationId: 'org-1' } }),
}));

describe('CustomerSuccessPlatformPage', () => {
  it('renders customer success platform capabilities and KPIs', async () => {
    render(
      <MemoryRouter>
        <CustomerSuccessPlatformPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /demo hospital/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/customer success platform/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /onboarding progress/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /adoption metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /feature utilization/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /customer health/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /support tracking/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /renewal readiness/i })).toBeInTheDocument();
    expect(screen.getAllByText(/customer health score/i).length).toBeGreaterThan(0);
  });
});
