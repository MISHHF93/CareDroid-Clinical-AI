import './theme-init.js';
import './styles/theme-tokens.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/theme-legacy-bridge.css';
import './styles/theme-surfaces.css';
import './styles/layout-breakpoints.css';
import appConfig from './config/appConfig';
import logger from './utils/logger';

// Add global error handler first
window.addEventListener('error', (event) => {
  logger.error('Global error', { error: event.error, stack: event.error?.stack });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { reason: event.reason });
});

// Import services for initialization
import CrashReportingService from './services/crashReportingService';
import AnalyticsService from './services/analyticsService';
import { NotificationService } from './services/NotificationService';
import syncService from './services/syncService';
import offlineService from './services/offlineService';

// ================================
// Initialize Crash Reporting (Sentry)
// ================================
if (appConfig.crashReporting.enabled && appConfig.crashReporting.dsn) {
  try {
    CrashReportingService.initialize({
      dsn: appConfig.crashReporting.dsn,
      environment: appConfig.crashReporting.environment,
      tracesSampleRate: appConfig.crashReporting.tracesSampleRate,
      profilesSampleRate: appConfig.crashReporting.profilesSampleRate,
      debug: appConfig.crashReporting.debug,
    });
    logger.info('Sentry crash reporting initialized');
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

// ================================
// Initialize Analytics Service
// ================================
if (appConfig.analytics.enabled) {
  try {
    if (appConfig.analytics.segmentWriteKey) {
      // Initialize with Segment if available
      AnalyticsService.initializeSegment(appConfig.analytics.segmentWriteKey);
    }
    AnalyticsService.trackEvent({
      eventName: 'app_initialized',
      parameters: {
        app_version: appConfig.app.version,
        app_environment: appConfig.app.environment,
      }
    });
    logger.info('Analytics service initialized');
  } catch (error) {
    logger.error('Failed to initialize Analytics', { error });
  }
}

// ================================
// Initialize Notifications
// ================================
if (appConfig.features.enablePushNotifications) {
  // Request notification permission on app start
  NotificationService.requestPermission()
    .then((granted) => {
      if (granted) {
        logger.info('Notification permissions granted');
        NotificationService.registerPushToken().catch(() => {});
      } else {
        logger.info('Notification permissions not granted');
      }
    })
    .catch(error => logger.error('Failed to request notification permission', { error }));
}

// ================================
// Initialize Offline Mode (Dexie + Sync Service)
// ================================
if (appConfig.features.enableOfflineMode) {
  try {
    // Initialize offline storage
    offlineService.initialize()
      .then((success) => {
        if (success) {
          logger.info('Offline storage initialized');
          // Initialize sync service for background synchronization
          syncService.initialize();
          logger.info('Sync service initialized');
        } else {
          logger.error('Failed to initialize offline storage');
        }
      })
      .catch(error => logger.error('Failed to initialize offline mode', { error }));
  } catch (error) {
    logger.error('Failed to initialize offline services', { error });
  }
}

// ================================
// Service Worker Registration
// ================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        logger.info('Service Worker registered', { registration });
        // Set up periodic background sync if offline mode enabled
        if (appConfig.features.enableOfflineMode && 'periodicSync' in registration) {
          registration.periodicSync.register('sync-data', { minInterval: 24 * 60 * 60 * 1000 })
            .then(() => logger.info('Periodic background sync registered'))
            .catch(err => logger.info('Periodic background sync not available', { err }));
        }
      })
      .catch(error => logger.error('Service Worker registration failed', { error }));
  });
}

// ================================
// Global Error Handler (Integrates with Sentry)
// ================================
window.addEventListener('error', (event) => {
  if (appConfig.crashReporting.enabled) {
    try {
      CrashReportingService.captureException(event.error, {
        tags: {
          source: 'uncaught_error'
        }
      });
    } catch (error) {
      logger.error('Failed to report error to Sentry', { error });
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (appConfig.crashReporting.enabled) {
    try {
      CrashReportingService.captureException(event.reason, {
        tags: {
          source: 'unhandled_promise_rejection'
        }
      });
    } catch (error) {
      logger.error('Failed to report rejection to Sentry', { error });
    }
  }
});

// ================================
// Mount React App
// ================================
try {
  const root = document.getElementById('root');
  
  if (!root) {
    document.body.innerHTML = '<div style="padding: 20px; color: red;">ERROR: Root element not found</div>';
  } else {
    logger.info('Root element found, mounting React App');
    
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    logger.info('React App mounted successfully');
  }
} catch (error) {
  logger.error('Failed to mount React app', { error, stack: error?.stack });
  
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; color: red; white-space: pre-wrap; background: #f5f5f5;">
      <h1>Error Loading Application</h1>
      <p>Error: ${error.message}</p>
      <p>Stack: ${error.stack}</p>
      <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">Reload Page</button>
    </div>
  `;
}
