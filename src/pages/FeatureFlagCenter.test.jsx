import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeatureFlagCenter from './FeatureFlagCenter';
import { PlatformAssetsApi } from '../services/platformAssetsApi';

const refreshPlatformContext = vi.fn();

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({
    tenantContext: {
      organizationId: 'org-1',
      organizationName: 'Demo Hospital',
    },
  }),
}));

vi.mock('../contexts/UserContext', () => ({
  Permission: {
    CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM',
  },
  useUser: () => ({
    hasPermission: (permission) => permission === 'CONFIGURE_SYSTEM',
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    platformContext: { organization: { id: 'org-1' } },
    refreshPlatformContext,
  }),
}));

vi.mock('../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getFeatureFlags: vi.fn(),
    updateFeatureFlag: vi.fn(),
  },
}));

function buildFlagModel(state = 'enabled') {
  return {
    organizationId: 'org-1',
    organizationName: 'Demo Hospital',
    supportedScopes: ['tenant', 'workspace', 'role', 'beta', 'internal'],
    workspaces: [{ id: 'emergency', name: 'Emergency' }],
    roles: ['owner', 'admin'],
    flags: [
      {
        id: 'ai-clinical-copilot',
        name: 'AI Clinical Copilot',
        category: 'AI',
        defaultState: 'enabled',
        state,
        owner: 'CareDroid',
        route: '/assistant',
        description: 'Assistant rollout.',
        rolloutNotes: 'Default-on for authenticated users.',
        assetIds: ['assistant'],
        scopes: {
          tenant: state,
          beta: null,
          internal: null,
          workspaces: {},
          roles: {},
        },
      },
    ],
  };
}

describe('FeatureFlagCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlatformAssetsApi.getFeatureFlags.mockResolvedValue(buildFlagModel());
    PlatformAssetsApi.updateFeatureFlag.mockResolvedValue(buildFlagModel('disabled'));
  });

  it('loads tenant feature flags and updates a scoped flag without deployment', async () => {
    render(<FeatureFlagCenter />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /feature flag center/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Demo Hospital')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tenant flags/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workspace flags/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /role flags/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /beta flags/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /internal flags/i })).toBeInTheDocument();

    const card = screen.getByRole('heading', { name: 'AI Clinical Copilot' }).closest('.feature-flag-card');
    await userEvent.click(within(card).getByRole('button', { name: 'Disabled' }));

    await waitFor(() => {
      expect(PlatformAssetsApi.updateFeatureFlag).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          scope: 'tenant',
          flagId: 'ai-clinical-copilot',
          state: 'disabled',
        }),
      );
    });
    expect(refreshPlatformContext).toHaveBeenCalled();
  });
});
