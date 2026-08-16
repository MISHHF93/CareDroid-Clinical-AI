import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OrganizationContextProvider, useOrganizationContext } from './OrganizationContext';

const mocks = vi.hoisted(() => ({
  userState: {
    authToken: 'token-1',
    isAuthenticated: true,
  },
  identityState: {
    organization: { id: 'org-1', name: 'CareDroid Hospital', branding: { displayName: 'Hospital' } },
    platformContext: { organization: { id: 'org-1', branding: { displayName: 'Hospital' } } },
    refreshPlatformContext: vi.fn(),
  },
  getOrganizationEngine: vi.fn(),
  getCurrentOrganizationEngine: vi.fn(),
  updateOrganizationSettings: vi.fn(),
}));

vi.mock('./UserContext', () => ({
  useUser: () => mocks.userState,
}));

vi.mock('./UserIdentityContext', () => ({
  useUserIdentity: () => mocks.identityState,
}));

vi.mock('../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getOrganizationEngine: (...args) => mocks.getOrganizationEngine(...args),
    getCurrentOrganizationEngine: (...args) => mocks.getCurrentOrganizationEngine(...args),
    updateOrganizationSettings: (...args) => mocks.updateOrganizationSettings(...args),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { warn: vi.fn() },
}));

function Probe() {
  const { branding, integrations, subscription, saveOrganizationSettings } = useOrganizationContext();
  return (
    <div>
      <output data-testid="org-engine">
        {branding?.displayName}:{subscription?.tier}:{integrations.length}
      </output>
      <button type="button" onClick={() => saveOrganizationSettings({ branding: { displayName: 'Next' } })}>
        Save
      </button>
    </div>
  );
}

function RefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { branding, refreshOrganizationEngine } = useOrganizationContext();
  onReady(refreshOrganizationEngine);
  return <output data-testid="org-engine">{branding?.displayName}</output>;
}

describe('OrganizationContextProvider', () => {
  beforeEach(() => {
    mocks.identityState.refreshPlatformContext.mockReset();
    mocks.getCurrentOrganizationEngine.mockReset();
    mocks.getOrganizationEngine.mockReset();
    mocks.updateOrganizationSettings.mockReset();
    mocks.getOrganizationEngine.mockResolvedValue({
      organization: { id: 'org-1', name: 'CareDroid Hospital' },
      branding: { displayName: 'CareDroid Health' },
      subscription: { tier: 'enterprise', status: 'active' },
      integrations: [{ slug: 'fhir', status: 'requested' }],
      supportedOrganizationTypes: ['hospital', 'clinic', 'ems', 'university', 'research_center'],
    });
    mocks.updateOrganizationSettings.mockResolvedValue({
      organization: { id: 'org-1', name: 'CareDroid Hospital' },
      branding: { displayName: 'Next' },
      subscription: { tier: 'enterprise', status: 'active' },
      integrations: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads and exposes the organization engine snapshot', async () => {
    render(
      <OrganizationContextProvider>
        <Probe />
      </OrganizationContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-engine')).toHaveTextContent('CareDroid Health:enterprise:1');
    });
    expect(mocks.getOrganizationEngine).toHaveBeenCalledWith('org-1');
  });

  it('saves organization settings through the engine API', async () => {
    render(
      <OrganizationContextProvider>
        <Probe />
      </OrganizationContextProvider>,
    );

    await screen.findByText(/CareDroid Health/);
    screen.getByRole('button', { name: 'Save' }).click();

    await waitFor(() => {
      expect(mocks.updateOrganizationSettings).toHaveBeenCalledWith('org-1', {
        branding: { displayName: 'Next' },
      });
    });
    expect(mocks.identityState.refreshPlatformContext).toHaveBeenCalled();
  });

  it('HEAL-245: a slower refreshOrganizationEngine() call does not overwrite a faster, more recently-started one', async () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    const engineFor = (displayName: string) => ({
      organization: { id: 'org-1', name: displayName },
      branding: { displayName },
      subscription: { tier: 'enterprise', status: 'active' },
      integrations: [],
    });

    mocks.getOrganizationEngine.mockResolvedValue(engineFor('Initial Org'));

    let refresh: (() => Promise<any>) | null = null;
    render(
      <OrganizationContextProvider>
        <RefreshProbe onReady={(fn) => { refresh = fn; }} />
      </OrganizationContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-engine')).toHaveTextContent('Initial Org');
    });

    // Call A (started first, for the org the user is LEAVING) stays pending
    // on deferredA; call B (started second, for the org the user is
    // switching TO) resolves immediately. Before HEAL-245, whichever
    // response landed last would win -- meaning a slow response for the
    // PREVIOUS organization could overwrite the new one's branding/engine
    // data (and would have pushed the previous org's emergencyOs settings
    // into the shared clinical store).
    const deferredA = deferred<any>();
    mocks.getOrganizationEngine.mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    mocks.getOrganizationEngine.mockResolvedValueOnce(engineFor('New Org'));
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('org-engine')).toHaveTextContent('New Org');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(engineFor('Initial Org'));
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('org-engine')).toHaveTextContent('New Org');
  });
});
