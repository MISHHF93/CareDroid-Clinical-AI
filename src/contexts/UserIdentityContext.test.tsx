import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserIdentityProvider, useUserIdentity } from './UserIdentityContext';

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  fetchOperationalProfile: vi.fn(),
  fetchMemoryFabricContext: vi.fn(),
}));

vi.mock('./ThemeContext', () => ({
  useTheme: () => ({ preference: 'light' }),
}));

vi.mock('./ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    favorites: [],
    pinned: [],
    recentTools: [],
    hiddenTools: [],
    profileSettings: {},
  }),
}));

vi.mock('./UserContext', () => ({
  useUser: () => ({
    user: { id: 'user-1', email: 'doc@example.com' },
    isAuthenticated: true,
    authToken: 'token-1',
  }),
}));

vi.mock('./TenantContext', () => ({
  useTenantContext: () => ({ refreshTenantContext: vi.fn() }),
}));

vi.mock('./WorkspaceContext', () => ({
  useWorkspace: () => ({ workspaces: [], activeWorkspaceId: 'emergency', setActiveWorkspaceId: vi.fn() }),
}));

vi.mock('../services/userIdentityApi', () => ({
  UserIdentityApi: {
    fetchOperationalProfile: (...args: any[]) => mocks.fetchOperationalProfile(...args),
    switchWorkspace: vi.fn(),
    updatePreferences: vi.fn(),
    updateOperationalProfile: vi.fn(),
    recordActivity: vi.fn(),
  },
}));

vi.mock('../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getContext: (...args: any[]) => mocks.getContext(...args),
  },
}));

vi.mock('../config/workspace.config', () => ({
  readLocalClientProfile: () => ({}),
}));

vi.mock('../services/memoryApi', () => ({
  fetchMemoryFabricContext: (...args: any[]) => mocks.fetchMemoryFabricContext(...args),
  LOCAL_MEMORY_FABRIC_CONTEXT: { source: 'local' },
}));

vi.mock('../data/assetEntitlements', () => ({
  setPlatformEntitlementContext: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  default: { warn: vi.fn() },
}));

vi.mock('../config/demoPersonaModel', () => ({
  enrichDemoIdentityFallback: (_user: unknown, profile: unknown) => profile,
}));

function RefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { organization, refreshPlatformContext } = useUserIdentity();
  onReady(refreshPlatformContext);
  return <output data-testid="platform-org">{(organization as any)?.id || 'none'}</output>;
}

function IdentityRefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { saasProfile, refreshIdentity } = useUserIdentity();
  onReady(refreshIdentity);
  return <output data-testid="identity-role">{(saasProfile as any)?.role || 'none'}</output>;
}

function contextFor(id: string) {
  return {
    organization: { id, name: id },
    roleProfile: null,
    entitledAssetIds: [`${id}-asset`],
    entitledPackIds: [`${id}-pack`],
  };
}

function profileFor(role: string) {
  return {
    ok: true,
    data: {
      userId: 'user-1',
      workspace: { workspaces: [], activeWorkspaceId: 'emergency' },
      saasProfile: { role },
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('UserIdentityProvider', () => {
  beforeEach(() => {
    mocks.getContext.mockReset();
    mocks.fetchOperationalProfile.mockReset();
    mocks.fetchMemoryFabricContext.mockReset();
    mocks.fetchOperationalProfile.mockResolvedValue({ ok: false, data: null, message: 'unavailable' });
    mocks.fetchMemoryFabricContext.mockResolvedValue({ ok: true, source: 'server' });
    mocks.getContext.mockResolvedValue(contextFor('org-initial'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Regression coverage (HEAL-289): refreshPlatformContext() is invoked concurrently
  // from several independent triggers (identity bootstrap, a manual "Refresh platform
  // context" button, createOrganization/saveOrganization, togglePack, onboarding submit).
  // Before this fix, whichever PlatformAssetsApi.getContext() response landed LAST won,
  // even if it was the STALER of two overlapping calls -- a just-enabled pack's
  // entitledPackIds could silently "revert" itself with no error and no visible cause.
  it('a slower refreshPlatformContext() call does not overwrite a faster, more recently-started one', async () => {
    let refresh: (() => Promise<any>) | null = null;
    render(
      <UserIdentityProvider>
        <RefreshProbe onReady={(fn) => { refresh = fn; }} />
      </UserIdentityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('platform-org')).toHaveTextContent('org-initial');
    });

    // Call A (started first) stays pending on deferredA; call B (started second)
    // resolves immediately.
    const deferredA = deferred<any>();
    mocks.getContext.mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    mocks.getContext.mockResolvedValueOnce(contextFor('org-new'));
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('platform-org')).toHaveTextContent('org-new');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(contextFor('org-initial'));
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('platform-org')).toHaveTextContent('org-new');
  });

  // Regression coverage: refreshIdentity() is invoked concurrently from
  // several independent triggers (the identity-bootstrap effect, and manual
  // callers such as OrganizationPages.tsx's saveRoleProfile). Before this
  // fix, whichever fetchOperationalProfile() response landed LAST won, even
  // if it was the STALER of two overlapping calls -- switching a role
  // profile could silently "revert" to the pre-switch role with no error.
  it('a slower refreshIdentity() call does not overwrite a faster, more recently-started one', async () => {
    mocks.fetchOperationalProfile.mockResolvedValue(profileFor('student'));

    let refresh: (() => Promise<any>) | null = null;
    render(
      <UserIdentityProvider>
        <IdentityRefreshProbe onReady={(fn) => { refresh = fn; }} />
      </UserIdentityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('identity-role')).toHaveTextContent('student');
    });

    const deferredA = deferred<any>();
    mocks.fetchOperationalProfile.mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    mocks.fetchOperationalProfile.mockResolvedValueOnce(profileFor('physician'));
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('identity-role')).toHaveTextContent('physician');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(profileFor('student'));
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('identity-role')).toHaveTextContent('physician');
  });
});
