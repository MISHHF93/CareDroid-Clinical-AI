import { useState, useEffect } from 'react';
import {
  OfflineIndicator,
  SyncStatus,
  OfflineWarning,
  useOfflineStatus,
  registerServiceWorker,
} from '../components/offline/OfflineSupport';

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
  const { isOnline, isSyncing, syncProgress, syncStats } = useOfflineStatus();
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const affectedFeatures = !isOnline ? [
    'clinical-tools',
    'emergency-detection',
    'medication-checker',
    'remote-collaboration',
    'document-upload',
  ] : [];

  return (
    <>
      <OfflineIndicator />
      
      {isSyncing && (
        <SyncStatus
          isVisible={true}
          progress={syncProgress}
          itemsSynced={syncStats.synced}
          totalItems={syncStats.total}
        />
      )}

      {!isOnline && !warningDismissed && (
        <OfflineWarning
          isVisible={true}
          affectedFeatures={affectedFeatures}
          onDismiss={() => setWarningDismissed(true)}
        />
      )}

      {children}
    </>
  );
};

export default OfflineProvider;
