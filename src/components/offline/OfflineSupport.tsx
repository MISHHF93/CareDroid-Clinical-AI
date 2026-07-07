import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../services/apiClient';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { makeBulkSyncDisabledResponse } from '../../services/disabledBackendMocks';
import { reportApiError } from '../../services/apiErrorHandling';
import './OfflineSupport.css';
import logger from '../../utils/logger';

/**
 * OfflineIndicator Component
 * 
 * Banner showing network status at top of app
 * Appears when connection is lost
 */
export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Auto-hide success message after 3 seconds
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'offline-indicator-online' : 'offline-indicator-offline'}`}>
      <div className="offline-indicator-content">
        <span className="offline-indicator-icon">
          {isOnline ? '✓' : '⚠️'}
        </span>
        <span className="offline-indicator-text">
          {isOnline ? 'You are back online' : 'You are offline - Some features may be limited'}
        </span>
      </div>
      {isOnline && (
        <button
          className="offline-indicator-close"
          onClick={() => setShowIndicator(false)}
          aria-label="Close notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export const OfflineModeBanner = ({
  isOnline = true,
  isSyncing = false,
  catalogSummary,
  lastSyncAt,
  syncError,
  onDismiss,
}) => {
  const shouldShow = !isOnline || isSyncing || Boolean(syncError);
  if (!shouldShow) return null;

  const entries = catalogSummary?.entries || [];
  const staleCount = catalogSummary?.staleCount || 0;
  const totalItems = catalogSummary?.totalItems || 0;
  const statusLabel = !isOnline
    ? 'Offline mode'
    : syncError
      ? 'Offline sync needs attention'
      : isSyncing
        ? 'Syncing offline cache'
        : 'Offline cache ready';

  return (
    <section
      className={[
        'offline-mode-banner',
        !isOnline ? 'offline-mode-banner--offline' : '',
        syncError ? 'offline-mode-banner--error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={!isOnline || syncError ? 'alert' : 'status'}
      aria-live="polite"
      aria-label="Offline mode status"
    >
      <div className="offline-mode-banner__body">
        <div className="offline-mode-banner__heading">
          <strong>{statusLabel}</strong>
          {staleCount > 0 && <span className="offline-mode-banner__stale">Stale data</span>}
        </div>
        <p>
          {isOnline
            ? 'Refreshing cached CareDroid data and syncing queued work.'
            : `Network unavailable. ${totalItems} cached tools, calculators, simulations, and protocols remain available.`}
        </p>
        {syncError && <p className="offline-mode-banner__error">{syncError}</p>}
        {entries.length > 0 && (
          <ul className="offline-mode-banner__catalogs" aria-label="Cached offline catalogs">
            {entries.map((entry) => (
              <li key={entry.kind}>
                <span>{entry.label}</span>
                <strong>{entry.count}</strong>
                {entry.stale && <em>stale</em>}
              </li>
            ))}
          </ul>
        )}
        {lastSyncAt && (
          <small>Last offline sync: {new Date(lastSyncAt).toLocaleString()}</small>
        )}
      </div>
      {onDismiss && isOnline && !isSyncing && (
        <button type="button" className="offline-mode-banner__close" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </section>
  );
};

/**
 * SyncStatus Component
 * 
 * Shows progress of data synchronization when reconnecting
 */
export const SyncStatus = ({ isVisible = false, progress = 0, itemsSynced = 0, totalItems = 0 }) => {
  if (!isVisible) return null;

  const isComplete = progress === 100;

  return (
    <div className={`sync-status ${isComplete ? 'sync-status-complete' : 'sync-status-syncing'}`}>
      <div className="sync-status-content">
        <div className="sync-status-left">
          {isComplete ? (
            <>
              <span className="sync-status-icon">✓</span>
              <div className="sync-status-text">
                <h4>Sync Complete</h4>
                <p>All {itemsSynced} items synchronized</p>
              </div>
            </>
          ) : (
            <>
              <div className="sync-status-spinner"></div>
              <div className="sync-status-text">
                <h4>Syncing Data</h4>
                <p>{itemsSynced} of {totalItems} items ({progress}%)</p>
              </div>
            </>
          )}
        </div>

        <div className="sync-status-bar">
          <div className="sync-progress-bar">
            <div
              className="sync-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * OfflineWarning Component
 * 
 * Alert banner showing which features are unavailable offline
 * Appears when critical features aren't accessible
 */
export const OfflineWarning = ({
  isVisible = false,
  affectedFeatures = [] as any[],
  onDismiss,
}) => {
  if (!isVisible) return null;

  const featureNames = {
    'clinical-tools': 'Clinical Decision Support',
    'emergency-detection': 'Emergency Detection System',
    'lab-analysis': 'Lab Result Analysis',
    'medication-checker': 'Medication Checker',
    'remote-collaboration': 'Team Collaboration',
    'document-upload': 'Document Upload',
  };

  return (
    <div className="offline-warning">
      <div className="offline-warning-header">
        <span className="offline-warning-icon">⚠️</span>
        <h3>Limited Functionality</h3>
        <button
          className="offline-warning-close"
          onClick={onDismiss}
          aria-label="Close warning"
        >
          ✕
        </button>
      </div>

      <div className="offline-warning-content">
        <p className="offline-warning-text">
          You are offline. The following features are unavailable or limited:
        </p>

        {affectedFeatures.length > 0 && (
          <ul className="offline-warning-features">
            {affectedFeatures.map((feature) => (
              <li key={feature}>
                <span className="warning-feature-icon">○</span>
                <span>{featureNames[feature] || feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="offline-warning-note">
          <strong>Available Offline:</strong> View cached conversations, review past encounters, 
          read downloaded guidelines, and prepare notes. Your work will sync when you reconnect.
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing offline status and caching
 * 
 * Returns online status, sync state, and methods for caching
 */
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({ synced: 0, total: 0 });
  const dbRef = useRef<any>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const db = await openIndexedDB();
        dbRef.current = db;
      } catch (error: any) {
        logger.error('Failed to initialize offline database', { error });
      }
    };

    initDB();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Cache data locally for offline access
   */
  const cacheData = useCallback(async (storeName, data) => {
    if (!dbRef.current) return false;

    try {
      const transaction = dbRef.current.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.put({ ...data, cachedAt: Date.now() });
      return true;
    } catch (error: any) {
      logger.error('Error caching data', { error });
      return false;
    }
  }, []);

  /**
   * Retrieve cached data
   */
  const getCachedData = useCallback(async (storeName, key) => {
    if (!dbRef.current) return null;

    try {
      const transaction = dbRef.current.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      return await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      logger.error('Error retrieving cached data', { error });
      return null;
    }
  }, []);

  /**
   * Sync data when connection is restored
   */
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Example: Sync conversations
      if (!isBackendCapabilityEnabled('bulkSync')) {
        const fallback = makeBulkSyncDisabledResponse(syncStats.total || 0);
        logger.info('Bulk sync API not available — keeping offline changes queued');
        reportApiError({
          title: 'Offline sync queued',
          message: fallback.message,
          endpoint: '/api/sync',
        });
        setSyncStats((prev) => ({
          ...prev,
          total: fallback.total,
          synced: fallback.synced,
        }));
        return;
      }

      const response = await apiFetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ timestamp: localStorage.getItem('lastSyncTime') || 0 }),
      });

      if (!response.ok) throw new Error('Sync failed');

      const { items, total } = await response.json();

      // Process sync in batches to show progress
      for (let i = 0; i < items.length; i++) {
        await cacheData('conversations', items[i]);
        setSyncStats({ synced: i + 1, total });
        setSyncProgress(Math.round(((i + 1) / total) * 100));
      }

      localStorage.setItem('lastSyncTime', String(Date.now()));
    } catch (error: any) {
      logger.error('Sync error', { error });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  }, [isOnline, isSyncing, cacheData, syncStats.total]);

  return {
    isOnline,
    isSyncing,
    syncProgress,
    syncStats,
    cacheData,
    getCachedData,
    syncData,
  };
};

/**
 * Initialize IndexedDB for offline storage
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CareDroidDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;

      // Create object stores
      const stores = ['conversations', 'encounters', 'guidelines', 'users', 'pending-sync'];

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

/**
 * Monitor data to cache
 */
export const useCacheMonitor = () => {
  const { cacheData } = useOfflineStatus();

  const cacheConversation = useCallback((conversation) => {
    return cacheData('conversations', conversation);
  }, [cacheData]);

  const cacheEncounter = useCallback((encounter) => {
    return cacheData('encounters', encounter);
  }, [cacheData]);

  const cacheGuideline = useCallback((guideline) => {
    return cacheData('guidelines', guideline);
  }, [cacheData]);

  return {
    cacheConversation,
    cacheEncounter,
    cacheGuideline,
  };
};

/**
 * Service Worker Registration
 * Call this once in your app initialization
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('Service Worker registered', { registration });
      return registration;
    } catch (error: any) {
      logger.error('Service Worker registration failed', { error });
    }
  }
};
