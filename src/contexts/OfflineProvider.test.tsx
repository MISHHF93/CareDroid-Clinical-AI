import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OfflineProvider from './OfflineProvider';

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
        entry.kind === 'protocols' ? { ...entry, stale: true } : entry
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
      </OfflineProvider>
    );

    expect(await screen.findByRole('alert', { name: /offline mode status/i })).toHaveTextContent(
      /offline mode/i
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
      </OfflineProvider>
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
});
