import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantContextProvider, TenantRequired, useTenantContext } from './TenantContext';
import { clearTenantContext, getTenantContext } from '../services/tenantContextStore';

const mocks = vi.hoisted(() => ({
  userState: {
    user: { id: 'user-1', role: 'physician' },
    authToken: 'token-1',
    isAuthenticated: true,
    isLoading: false,
    isDevAuthBypass: false,
  },
  apiFetch: vi.fn(),
}));

vi.mock('./UserContext', () => ({
  useUser: () => mocks.userState,
}));

vi.mock('../services/apiClient', () => ({
  apiFetch: (...args) => mocks.apiFetch(...args),
  getApiErrorMessage: (_error, response) => `Request failed (${response?.status || 0})`,
  parseApiResponse: async (response, { fallback: any = {} } = {}) => {
    const body = await response.text();
    return body ? JSON.parse(body) : fallback;
  },
}));

vi.mock('../utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function Probe() {
  const { hasTenantContext, tenantContext } = useTenantContext();
  return (
    <output data-testid="tenant-probe">
      {hasTenantContext ? tenantContext.organizationId : 'missing'}:
      {tenantContext?.workspaceId || 'missing'}
    </output>
  );
}

describe('TenantContextProvider', () => {
  beforeEach(() => {
    clearTenantContext();
    mocks.userState = {
      user: { id: 'user-1', role: 'physician' },
      authToken: 'token-1',
      isAuthenticated: true,
      isLoading: false,
      isDevAuthBypass: false,
    };
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: 'physician',
          subscriptionPlan: 'institutional',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
  });

  afterEach(() => {
    clearTenantContext();
    vi.clearAllMocks();
  });

  it('resolves and stores backend tenant context for authenticated users', async () => {
    render(
      <TenantContextProvider>
        <Probe />
      </TenantContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-probe')).toHaveTextContent('org-1:workspace-1');
    });
    expect(getTenantContext()).toMatchObject({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      subscriptionPlan: 'institutional',
    });
  });

  it('blocks authenticated feature UI when tenant context is incomplete', async () => {
    mocks.apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ userId: 'user-1', role: 'physician' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(
      <TenantContextProvider>
        <TenantRequired>
          <div>Protected dashboard</div>
        </TenantRequired>
      </TenantContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Tenant context required');
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Select an organization/workspace or retry',
    );
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });

  it('uses explicit demo tenant context for demo auth when backend is unavailable', async () => {
    mocks.userState = {
      ...mocks.userState,
      user: { id: 'dev-demo-user', role: 'physician', isDevAuthBypass: true },
      isDevAuthBypass: true,
    };
    mocks.apiFetch.mockRejectedValue(new Error('backend unavailable'));

    render(
      <TenantContextProvider>
        <TenantRequired>
          <Probe />
        </TenantRequired>
      </TenantContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-probe')).toHaveTextContent(
        'demo-organization:demo-workspace',
      );
    });
  });
});
