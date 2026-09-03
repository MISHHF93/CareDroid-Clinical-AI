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
  parseApiResponse: async (response, { fallback = {} }: { fallback?: any } = {}) => {
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

function RefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { hasTenantContext, tenantContext, refreshTenantContext } = useTenantContext();
  onReady(refreshTenantContext);
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
      user: { id: 'dev-demo-user', role: 'physician', isDevAuthBypass: true } as any,
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

  it('HEAL-244: a slower refreshTenantContext() call does not overwrite a faster, more recently-started one', async () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    const jsonResponse = (organizationId: string, workspaceId: string) =>
      new Response(
        JSON.stringify({
          organizationId,
          workspaceId,
          userId: 'user-1',
          role: 'physician',
          subscriptionPlan: 'institutional',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    mocks.apiFetch.mockResolvedValue(jsonResponse('org-1', 'workspace-1'));

    let refresh: (() => Promise<any>) | null = null;
    render(
      <TenantContextProvider>
        <RefreshProbe
          onReady={(fn) => {
            refresh = fn;
          }}
        />
      </TenantContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-probe')).toHaveTextContent('org-1:workspace-1');
    });

    // Call A (started first) stays pending on deferredA; call B (started
    // second, resolves immediately) must win regardless of resolution
    // order -- before HEAL-244, whichever /api/tenant/context response
    // landed last would win and could point the app at the wrong
    // organization's data.
    const deferredA = deferred<Response>();
    mocks.apiFetch.mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    mocks.apiFetch.mockResolvedValueOnce(jsonResponse('org-2', 'workspace-2'));
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('tenant-probe')).toHaveTextContent('org-2:workspace-2');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(jsonResponse('org-1', 'workspace-1'));
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('tenant-probe')).toHaveTextContent('org-2:workspace-2');
  });
});
