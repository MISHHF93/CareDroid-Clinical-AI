import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OfflineProvider, { useOfflineMode } from './OfflineProvider';

vi.mock('../config/featureFlags.config', () => ({
  FEATURE_FLAGS: {
    enableOfflineMode: true,
  },
}));

const { freshSummary, staleSummary } = vi.hoisted(() => {
  const baseSummary = {
    entries: [
      {
        kind: 'tools',
        label: 'Cached tools',
        count: 270,
        cachedAt: '2026-05-31T00:00:00.000Z',
        stale: false,
      },
      {
        kind: 'calculators',
        label: 'Cached calculators',
        count: 80,
        cachedAt: '2026-05-31T00:00:00.000Z',
        stale: false,
      },
      {
        kind: 'simulations',
        label: 'Cached simulations',
        count: 12,
        cachedAt: '2026-05-31T00:00:00.000Z',
        stale: false,
      },
      {
        kind: 'protocols',
        label: 'Cached protocols',
        count: 7,
        cachedAt: '2026-05-31T00:00:00.000Z',
        stale: false,
      },
    ],
    totalItems: 369,
    staleCount: 0,
    readyCount: 4,
    lastCachedAt: '2026-05-31T00:00:00.000Z',
  };

  return {
    freshSummary: baseSummary,
    staleSummary: {
      ...baseSummary,
      staleCount: 1,
      entries: baseSummary.entries.map((entry) =>
        entry.kind === 'protocols' ? { ...entry, stale: true } : entry,
      ),
    },
  };
});

vi.mock('../services/offlineService', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(true),
    getOfflineCatalogSummary: vi.fn().mockResolvedValue(staleSummary),
    cacheOfflineCatalogs: vi.fn().mockResolvedValue(freshSummary),
  },
}));

vi.mock('../services/syncService', () => ({
  default: {
    initialize: vi.fn(),
    stopAutoSync: vi.fn(),
    forceSyncNow: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../components/offline/OfflineSupport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/offline/OfflineSupport')>();
  return {
    ...actual,
    registerServiceWorker: vi.fn().mockResolvedValue(undefined),
  };
});

function RefreshProbe({ onReady }: { onReady: (refresh: () => Promise<any>) => void }) {
  const { catalogSummary, refreshOfflineCatalogs } = useOfflineMode();
  onReady(refreshOfflineCatalogs);
  return <output data-testid="total-items">{catalogSummary.totalItems}</output>;
}

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

describe('OfflineProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNavigatorOnline(false);
  });

  it('shows an offline banner with cached catalog counts and stale labels', async () => {
    render(
      <OfflineProvider>
        <div>CareDroid route content</div>
      </OfflineProvider>,
    );

    expect(await screen.findByRole('alert', { name: /offline mode status/i })).toHaveTextContent(
      /offline mode/i,
    );
    const catalogs = screen.getByRole('list', { name: /cached offline catalogs/i });
    expect(within(catalogs).getByText(/cached tools/i)).toBeInTheDocument();
    expect(within(catalogs).getByText(/cached calculators/i)).toBeInTheDocument();
    expect(within(catalogs).getByText(/cached simulations/i)).toBeInTheDocument();
    expect(within(catalogs).getByText(/cached protocols/i)).toBeInTheDocument();
    expect(within(catalogs).getByText(/stale/i)).toBeInTheDocument();
    expect(screen.getByText(/CareDroid route content/i)).toBeInTheDocument();
  });

  it('syncs automatically when the browser comes online', async () => {
    const offlineService = (await import('../services/offlineService')).default;
    const syncService = (await import('../services/syncService')).default;

    render(
      <OfflineProvider>
        <div>CareDroid route content</div>
      </OfflineProvider>,
    );

    await screen.findByRole('alert', { name: /offline mode status/i });

    setNavigatorOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(offlineService.cacheOfflineCatalogs).toHaveBeenCalled();
      expect(syncService.forceSyncNow).toHaveBeenCalled();
    });
  });

  // Regression coverage (HEAL-303): refreshOfflineCatalogs() is called both
  // directly from the mount effect's initializeOfflineMode() and indirectly
  // via syncWhenOnline() (triggered by the browser 'online' event, at any
  // time). Before this fix, whichever offlineService.cacheOfflineCatalogs()
  // response landed LAST won, even if it was the STALER of two overlapping
  // calls.
  it('a slower refreshOfflineCatalogs() call does not overwrite a faster, more recently-started one', async () => {
    const offlineService = (await import('../services/offlineService')).default;

    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    let refresh: (() => Promise<any>) | null = null;
    render(
      <OfflineProvider>
        <RefreshProbe
          onReady={(fn) => {
            refresh = fn;
          }}
        />
      </OfflineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('369');
    });

    // Call A (started first) stays pending on deferredA; call B (started
    // second) resolves immediately.
    const deferredA = deferred<any>();
    vi.mocked(offlineService.cacheOfflineCatalogs).mockImplementationOnce(() => deferredA.promise);
    const refreshA = refresh!();

    vi.mocked(offlineService.cacheOfflineCatalogs).mockResolvedValueOnce({
      ...freshSummary,
      totalItems: 999,
    });
    const refreshB = refresh!();
    await refreshB;
    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('999');
    });

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve({ ...freshSummary, totalItems: 111 });
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('total-items')).toHaveTextContent('999');
  });
});
