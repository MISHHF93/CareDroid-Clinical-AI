import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OfflineModeBanner, SyncStatus, registerServiceWorker } from '../components/offline/OfflineSupport';
import offlineService from '../services/offlineService';
import { summarizeOfflineCatalogs } from '../data/offlineMode';
import logger from '../utils/logger';

const OfflineModeContext = createContext(null);

const getInitialOnlineState = () =>
  typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' ? true : navigator.onLine;

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
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({ synced: 0, total: 0 });
  const [catalogSummary, setCatalogSummary] = useState(() => summarizeOfflineCatalogs([]));
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [onlineNoticeDismissed, setOnlineNoticeDismissed] = useState(false);
  const syncInFlightRef = useRef(false);
  const syncServiceRef = useRef(null);

  const refreshOfflineCatalogs = useCallback(async () => {
    const summary = await offlineService.cacheOfflineCatalogs();
    setCatalogSummary(summary);
    setLastSyncAt(summary.lastCachedAt || new Date().toISOString());
    return summary;
  }, []);

  const syncWhenOnline = useCallback(async () => {
    if (syncInFlightRef.current || !getInitialOnlineState()) return;

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
    } catch (error) {
      logger.error('Offline mode sync failed', { error });
      setSyncError('Automatic sync could not complete. Cached data remains available.');
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshOfflineCatalogs]);

  useEffect(() => {
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
  }, [refreshOfflineCatalogs]);

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
      refreshOfflineCatalogs,
      syncWhenOnline,
    }),
    [
      catalogSummary,
      isOnline,
      isSyncing,
      lastSyncAt,
      refreshOfflineCatalogs,
      syncError,
      syncProgress,
      syncStats,
      syncWhenOnline,
    ]
  );

  const showSyncStatus = isSyncing;
  const showBanner = !isOnline || isSyncing || syncError || (!onlineNoticeDismissed && syncProgress === 100);

  return (
    <OfflineModeContext.Provider value={contextValue}>
      {showBanner && (
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
