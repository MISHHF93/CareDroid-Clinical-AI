import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SystemConfigProvider, useSystemConfig } from './SystemConfigContext';
import configService from '../services/configService';

const mockUserState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock('./UserContext', () => ({
  useUser: () => mockUserState,
}));

vi.mock('../services/configService', () => ({
  default: {
    getSystemConfig: vi.fn(),
    getAIRemainingQueries: vi.fn(),
    getAvailableTools: vi.fn(),
    getCurrentSubscription: vi.fn(),
  },
}));

function ConfigProbe() {
  const { loading, configDegraded, aiUsage } = useSystemConfig();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="degraded">{String(configDegraded)}</span>
      <span data-testid="remaining">{aiUsage.remaining}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <SystemConfigProvider>
      <ConfigProbe />
    </SystemConfigProvider>
  );
}

function RefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { aiUsage, refresh } = useSystemConfig();
  onReady(refresh);
  return <output data-testid="remaining">{aiUsage.remaining}</output>;
}

describe('SystemConfigProvider API polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.isAuthenticated = false;
    mockUserState.isLoading = false;
  });

  it('uses defaults without calling protected config endpoints before sign-in', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(configService.getSystemConfig).not.toHaveBeenCalled();
    expect(configService.getAIRemainingQueries).not.toHaveBeenCalled();
    expect(screen.getByTestId('degraded')).toHaveTextContent('false');
    expect(screen.getByTestId('remaining')).toHaveTextContent('10');
  });

  it('does not keep polling usage after a degraded authenticated load', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    mockUserState.isAuthenticated = true;
    vi.mocked(configService.getSystemConfig).mockResolvedValue({
      rag: { enabled: false },
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getAIRemainingQueries).mockResolvedValue({
      remaining: 10,
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getAvailableTools).mockResolvedValue({
      tools: [],
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getCurrentSubscription).mockResolvedValue({
      tier: 'free',
      status: 'active',
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('degraded')).toHaveTextContent('true'));

    expect(configService.getAIRemainingQueries).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

    setIntervalSpy.mockRestore();
  });

  // Regression coverage (HEAL-302): refresh() (loadSystemConfig) is wired to
  // an identical "Retry connection" onClick in 2 independently-mounted
  // components (SessionChromeBar, SidebarChromeControls) that render
  // simultaneously whenever configDegraded is true, plus an auth-change
  // effect that also calls it automatically. Before this fix, whichever
  // response landed LAST won, even if it was the STALER of two overlapping
  // calls.
  it('a slower refresh() call does not overwrite a faster, more recently-started one', async () => {
    mockUserState.isAuthenticated = true;
    vi.mocked(configService.getSystemConfig).mockResolvedValue({ rag: { enabled: false } });
    vi.mocked(configService.getAvailableTools).mockResolvedValue({ tools: [] });
    vi.mocked(configService.getCurrentSubscription).mockResolvedValue({ tier: 'free', status: 'active' });
    vi.mocked(configService.getAIRemainingQueries).mockResolvedValue({ remaining: 5 });

    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    let refresh: (() => Promise<any>) | null = null;
    render(
      <SystemConfigProvider>
        <RefreshProbe onReady={(fn) => { refresh = fn; }} />
      </SystemConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('remaining')).toHaveTextContent('5');
    });

    // Call A (started first) stays pending on deferredA; call B (started
    // second) resolves immediately.
    const deferredA = deferred<any>();
    vi.mocked(configService.getAIRemainingQueries).mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    vi.mocked(configService.getAIRemainingQueries).mockResolvedValueOnce({ remaining: 222 });
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('remaining')).toHaveTextContent('222');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve({ remaining: 111 });
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('remaining')).toHaveTextContent('222');
  });
});
