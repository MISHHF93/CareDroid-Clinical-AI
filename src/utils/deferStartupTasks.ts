/**
 * Heavy services initialized after first paint (keeps main bundle off critical path).
 */

import appConfig from '../config/appConfig';
import { FEATURE_FLAGS } from '../config/featureFlags.config';
import logger from './logger';
import observabilityService from '../services/observabilityService';
import { runAfterFirstPaint } from './deferStartup';

export function scheduleDeferredStartupTasks() {
  runAfterFirstPaint(() => {
    observabilityService.startDiagnosticsHeartbeat();
  });

  runAfterFirstPaint(async () => {
    const { flushPendingSecurityAudits } = await import('../services/securityAuditService');
    void flushPendingSecurityAudits();
  });

  runAfterFirstPaint(async () => {
    const [{ default: CrashReportingService }, { default: AnalyticsService }, { NotificationService }] =
      await Promise.all([
        import('../services/crashReportingService'),
        import('../services/analyticsService'),
        import('../services/NotificationService'),
      ]);

    if (appConfig.crashReporting.enabled && appConfig.crashReporting.dsn) {
      try {
        CrashReportingService.initialize({
          dsn: appConfig.crashReporting.dsn,
          environment: appConfig.crashReporting.environment,
          tracesSampleRate: appConfig.crashReporting.tracesSampleRate,
          profilesSampleRate: appConfig.crashReporting.profilesSampleRate,
          debug: appConfig.crashReporting.debug,
        });
        logger.info('Sentry crash reporting initialized (deferred)');
      } catch (error: any) {
        logger.error('Failed to initialize Sentry', { error });
      }
    }

    if (appConfig.analytics.enabled) {
      try {
        if (appConfig.analytics.segmentWriteKey) {
          AnalyticsService.initializeSegment(appConfig.analytics.segmentWriteKey);
        }
        AnalyticsService.trackEvent({
          eventName: 'app_initialized',
          parameters: {
            app_version: appConfig.app.version,
            app_environment: appConfig.app.environment,
          },
        });
      } catch (error: any) {
        logger.error('Failed to initialize Analytics', { error });
      }
    }

    if (FEATURE_FLAGS.enablePushNotifications) {
      NotificationService.requestPermission()
        .then((granted) => {
          if (granted) {
            NotificationService.registerPushToken().catch((error) =>
              logger.warn('Failed to register push token', { error }),
            );
          }
        })
        .catch((error) => logger.error('Failed to request notification permission', { error }));
    }
  });

  if (FEATURE_FLAGS.enableOfflineMode) {
    runAfterFirstPaint(async () => {
      const [{ default: offlineService }, { default: syncService }] = await Promise.all([
        import('../services/offlineService'),
        import('../services/syncService'),
      ]);
      try {
        const success = await offlineService.initialize();
        if (success) {
          syncService.initialize();
          logger.info('Offline + sync initialized (deferred)');
        }
      } catch (error: any) {
        logger.error('Failed to initialize offline mode', { error });
      }
    }, 100);
  }
}
