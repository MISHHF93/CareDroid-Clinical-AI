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

function SettingsCheckedProbe() {
  const { isLoading, hasCheckedOrganizationSettings } = useOrganizationContext();
  return (
    <output data-testid="settings-status">
      {isLoading ? 'loading' : 'idle'}:{hasCheckedOrganizationSettings ? 'checked' : 'unchecked'}
    </output>
  );
}

function SaveSettingsProbe({ onReady }: { onReady: (save: (updates: any) => Promise<any>) => void }) {
  const { branding, saveOrganizationSettings } = useOrganizationContext();
  onReady(saveOrganizationSettings);
  return <output data-testid="org-branding">{branding?.displayName}</output>;
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

  it('HEAL-296: a slower saveOrganizationSettings() call does not overwrite a faster, more recently-started one', async () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    const engineWithBranding = (displayName: string) => ({
      organization: { id: 'org-1', name: 'CareDroid Hospital' },
      branding: { displayName },
      subscription: { tier: 'enterprise', status: 'active' },
      integrations: [],
    });

    mocks.getOrganizationEngine.mockResolvedValue(engineWithBranding('CareDroid Health'));

    let save: ((updates: any) => Promise<any>) | null = null;
    render(
      <OrganizationContextProvider>
        <SaveSettingsProbe onReady={(fn) => { save = fn; }} />
      </OrganizationContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-branding')).toHaveTextContent('CareDroid Health');
    });

    // Save A (a slower first click) stays pending on deferredA; save B (a
    // faster, more recent second click) resolves immediately. Before
    // HEAL-296, whichever response landed last would win regardless of
    // which was actually started more recently.
    const deferredA = deferred<any>();
    mocks.updateOrganizationSettings.mockImplementationOnce(() => deferredA.promise);
    const saveA = save!({ branding: { displayName: 'Stale Name' } });

    mocks.updateOrganizationSettings.mockResolvedValueOnce(engineWithBranding('Fresh Name'));
    const saveB = save!({ branding: { displayName: 'Fresh Name' } });
    await saveB;
    await waitFor(() => {
      expect(screen.getByTestId('org-branding')).toHaveTextContent('Fresh Name');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(engineWithBranding('Stale Name'));
    await saveA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('org-branding')).toHaveTextContent('Fresh Name');
  });

  describe('HEAL-314: hasCheckedOrganizationSettings', () => {
    it('resolves to checked once the initial engine fetch settles, distinct from isLoading', async () => {
      function deferred<T>() {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>((r) => {
          resolve = r;
        });
        return { promise, resolve };
      }
      const gate = deferred<any>();
      mocks.getOrganizationEngine.mockImplementationOnce(() => gate.promise);

      render(
        <OrganizationContextProvider>
          <SettingsCheckedProbe />
        </OrganizationContextProvider>,
      );

      // While the fetch is in flight: loading, and not yet checked -- a
      // consumer gating a decision on "do we know the real settings yet"
      // must NOT treat isLoading:false-before-the-effect-fires as an answer.
      await waitFor(() => {
        expect(screen.getByTestId('settings-status')).toHaveTextContent('loading:unchecked');
      });

      gate.resolve({
        organization: { id: 'org-1', name: 'CareDroid Hospital' },
        branding: { displayName: 'CareDroid Health' },
        subscription: { tier: 'enterprise', status: 'active' },
        integrations: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId('settings-status')).toHaveTextContent('idle:checked');
      });
    });

    it('resolves to checked immediately for an unauthenticated session, which never enters isLoading at all', async () => {
      mocks.userState.isAuthenticated = false;
      mocks.userState.authToken = '';

      render(
        <OrganizationContextProvider>
          <SettingsCheckedProbe />
        </OrganizationContextProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('settings-status')).toHaveTextContent('idle:checked');
      });

      mocks.userState.isAuthenticated = true;
      mocks.userState.authToken = 'token-1';
    });
  });
});
