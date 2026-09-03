import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

describe('OfflineProvider feature gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setNavigatorOnline(false);
  });

  it('does not initialize hidden offline automation when offline mode is disabled', async () => {
    const initializeOfflineService = vi.fn().mockResolvedValue(true);
    const initializeSyncService = vi.fn();
    const stopAutoSync = vi.fn();
    const registerServiceWorker = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../config/featureFlags.config', () => ({
      FEATURE_FLAGS: {
        enableOfflineMode: false,
      },
    }));
    vi.doMock('../services/offlineService', () => ({
      default: {
        initialize: initializeOfflineService,
        getOfflineCatalogSummary: vi.fn(),
        cacheOfflineCatalogs: vi.fn(),
      },
    }));
    vi.doMock('../services/syncService', () => ({
      default: {
        initialize: initializeSyncService,
        stopAutoSync,
        forceSyncNow: vi.fn(),
      },
    }));
    vi.doMock('../components/offline/OfflineSupport', async (importOriginal) => {
      const actual = (await importOriginal()) as object;
      return {
        ...actual,
        registerServiceWorker,
      };
    });

    const { default: OfflineProvider } = await import('./OfflineProvider');

    render(
      <OfflineProvider>
        <div>CareDroid route content</div>
      </OfflineProvider>,
    );

    expect(await screen.findByRole('alert', { name: /offline mode disabled/i })).toHaveTextContent(
      /background sync, service worker registration, and offline catalog caching are disabled/i,
    );
    expect(screen.getByText(/CareDroid route content/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(registerServiceWorker).not.toHaveBeenCalled();
      expect(initializeOfflineService).not.toHaveBeenCalled();
      expect(initializeSyncService).not.toHaveBeenCalled();
    });
  });
});
