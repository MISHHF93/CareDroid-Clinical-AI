import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CareDroidBrainDashboard from './CareDroidBrainDashboard';

vi.mock('./CareDroidBrainDashboard.css', () => ({}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'user-1', role: 'clinical-admin' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: { role: 'clinical-admin', specialty: 'operations' },
    organization: { id: 'org-1', name: 'CareDroid Health', organizationType: 'health-system' },
    platformContext: {
      entitledPackIds: ['operations', 'ai'],
      availablePacks: [{ id: 'operations', name: 'Operations Pack', enabled: true }],
    },
    memoryFabricContext: {
      organizationMemory: {
        accessibleAssetCount: 18,
        enabledPackCount: 2,
        commonSearches: [{ category: 'bed capacity', count: 9 }],
      },
      roleMemory: {
        preferredAssetIds: ['hospital-command-assistant'],
      },
      userMemory: {
        recentAssets: ['medical-iot-dashboard'],
        savedWorkflows: [{ workflowId: 'capacity-rounding', count: 5 }],
      },
    },
    activity: {
      recentSimulations: [{ scenarioId: 'capacity-surge', count: 3 }],
      failedLaunches: [{ toolId: 'legacy-fleet', count: 2 }],
    },
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: 'ops', name: 'Operations' },
    visibleAssetIds: ['hospital-command-assistant'],
  }),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recentTools: ['hospital-command-assistant', 'medical-iot-dashboard'],
  }),
}));

vi.mock('../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    listProductBuilder: vi.fn(async () => ({
      products: [
        {
          id: 'ops-command',
          name: 'Operations Command',
          slug: 'operations-command',
          description: 'Coordinate hospital operations workflows.',
        },
      ],
    })),
    listAgents: vi.fn(async () => ({
      agents: [{ id: 'agent-1', name: 'Capacity Agent' }],
    })),
  },
}));

describe('CareDroidBrainDashboard', () => {
  it('renders Brain actions and all requested dashboard sections', async () => {
    render(
      <MemoryRouter>
        <CareDroidBrainDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /centralized platform intelligence/i })).toBeVisible();
    expect(screen.getByText(/advisory only/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: /what the brain recommends next/i })).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Platform Knowledge' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Organization Knowledge' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Role Knowledge' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Asset Knowledge' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Automation Knowledge' })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('AI agents')).toBeVisible();
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });
});
