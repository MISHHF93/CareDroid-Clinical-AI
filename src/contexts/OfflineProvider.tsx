import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FEATURE_FLAGS } from '../config/featureFlags.config';
import {
  OfflineModeBanner,
  SyncStatus,
  registerServiceWorker,
} from '../components/offline/OfflineSupport';
import offlineService from '../services/offlineService';
import { summarizeOfflineCatalogs } from '../data/offlineMode';
import logger from '../utils/logger';

const OfflineModeContext = createContext<any>(null);
const DISABLED_OFFLINE_SUMMARY = summarizeOfflineCatalogs([]);

const getInitialOnlineState = () =>
  typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean'
    ? true
    : navigator.onLine;

async function loadSyncService() {
  const module = await import('../services/syncService');
  return module.default;
}

/**
 * OfflineProvider Component
 *
 * Wraps the entire app to provide offline functionality
 * Place at the top level of your React app
 *
 * Usage:
 * <OfflineProvider>
 *   <App />
 * </OfflineProvider>
 */
export const OfflineProvider = ({ children }) => {
  const offlineModeEnabled = FEATURE_FLAGS.enableOfflineMode;
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({ synced: 0, total: 0 });
  const [catalogSummary, setCatalogSummary] = useState(() => summarizeOfflineCatalogs([]));
  const [lastSyncAt, setLastSyncAt] = useState<any>(null);
  const [syncError, setSyncError] = useState('');
  const [onlineNoticeDismissed, setOnlineNoticeDismissed] = useState(false);
  const syncInFlightRef = useRef(false);
  const syncServiceRef = useRef<any>(null);

  // HEAL-303: called both directly from the mount effect's initializeOfflineMode()
  // (below) and indirectly via syncWhenOnline() (which the 'online' browser event
  // can trigger at any time). syncInFlightRef only guards against two syncWhenOnline()
  // calls overlapping each other, not against the mount effect's direct call
  // overlapping a syncWhenOnline()-triggered one -- with no guard here, a slower call
  // could resolve after a faster one and silently revert catalogSummary/lastSyncAt to
  // stale values.
  const refreshCatalogsTokenRef = useRef(0);

  const refreshOfflineCatalogs = useCallback(async () => {
    const token = ++refreshCatalogsTokenRef.current;
    if (!offlineModeEnabled) {
      if (refreshCatalogsTokenRef.current === token) setCatalogSummary(DISABLED_OFFLINE_SUMMARY);
      return DISABLED_OFFLINE_SUMMARY;
    }

    const summary = await offlineService.cacheOfflineCatalogs();
    if (refreshCatalogsTokenRef.current !== token) return summary;
    setCatalogSummary(summary);
    setLastSyncAt(summary.lastCachedAt || new Date().toISOString());
    return summary;
  }, [offlineModeEnabled]);

  const syncWhenOnline = useCallback(async () => {
    if (!offlineModeEnabled || syncInFlightRef.current || !getInitialOnlineState()) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStats({ synced: 0, total: 4 });
    setSyncError('');

    try {
      await refreshOfflineCatalogs();
      setSyncProgress(60);
      setSyncStats({ synced: 4, total: 4 });
      const syncService = syncServiceRef.current || (await loadSyncService());
      syncServiceRef.current = syncService;
      await syncService.forceSyncNow();
      const latestSummary = await offlineService.getOfflineCatalogSummary();
      setCatalogSummary(latestSummary);
      setLastSyncAt(new Date().toISOString());
      setSyncProgress(100);
      setOnlineNoticeDismissed(false);
    } catch (error: any) {
      logger.error('Offline mode sync failed', { error });
      setSyncError('Automatic sync could not complete. Cached data remains available.');
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [offlineModeEnabled, refreshOfflineCatalogs]);

  useEffect(() => {
    if (!offlineModeEnabled) {
      logger.info('Offline mode is disabled; background sync automation not started');
      return undefined;
    }

    let cancelled = false;

    async function initializeOfflineMode() {
      registerServiceWorker();
      await offlineService.initialize();
      const summary = await offlineService.getOfflineCatalogSummary();
      if (cancelled) return;
      setCatalogSummary(summary);
      setLastSyncAt(summary.lastCachedAt);

      if (summary.readyCount < 4 || getInitialOnlineState()) {
        await refreshOfflineCatalogs();
      }
    }

    initializeOfflineMode().catch((error) => {
      logger.error('Offline mode initialization failed', { error });
      setSyncError('Offline cache could not initialize.');
    });

    loadSyncService()
      .then((syncService) => {
        syncServiceRef.current = syncService;
        syncService.initialize();
      })
      .catch((error) => logger.error('Sync service initialization failed', { error }));

    return () => {
      cancelled = true;
      syncServiceRef.current?.stopAutoSync();
    };
  }, [offlineModeEnabled, refreshOfflineCatalogs]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncWhenOnline();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOnlineNoticeDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWhenOnline]);

  const contextValue = useMemo(
    () => ({
      isOnline,
      isOffline: !isOnline,
      isSyncing,
      syncProgress,
      syncStats,
      catalogSummary,
      lastSyncAt,
      syncError,
      offlineModeEnabled,
      refreshOfflineCatalogs,
      syncWhenOnline,
    }),
    [
      catalogSummary,
      isOnline,
      isSyncing,
      lastSyncAt,
      offlineModeEnabled,
      refreshOfflineCatalogs,
      syncError,
      syncProgress,
      syncStats,
      syncWhenOnline,
    ],
  );

  const showSyncStatus = isSyncing;
  const showBanner =
    !isOnline || isSyncing || syncError || (!onlineNoticeDismissed && syncProgress === 100);
  const showDisabledBanner = !offlineModeEnabled && !isOnline;

  return (
    <OfflineModeContext.Provider value={contextValue}>
      {showDisabledBanner && (
        <section
          className="offline-mode-banner offline-mode-banner--disabled"
          role="alert"
          aria-live="polite"
          aria-label="Offline mode disabled"
        >
          <div className="offline-mode-banner__body">
            <div className="offline-mode-banner__heading">
              <strong>Offline mode disabled</strong>
            </div>
            <p>
              Background sync, service worker registration, and offline catalog caching are disabled
              by feature flag. Reconnect to use live CareDroid data.
            </p>
          </div>
        </section>
      )}

      {!showDisabledBanner && showBanner && (
        <OfflineModeBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          catalogSummary={catalogSummary}
          lastSyncAt={lastSyncAt}
          syncError={syncError}
          onDismiss={() => setOnlineNoticeDismissed(true)}
        />
      )}

      {showSyncStatus && (
        <SyncStatus
          isVisible={true}
          progress={syncProgress}
          itemsSynced={syncStats.synced}
          totalItems={syncStats.total}
        />
      )}

      {children}
    </OfflineModeContext.Provider>
  );
};

export const useOfflineMode = () => {
  const context = useContext(OfflineModeContext);
  if (!context) {
    throw new Error('useOfflineMode must be used within OfflineProvider');
  }
  return context;
};

export default OfflineProvider;
