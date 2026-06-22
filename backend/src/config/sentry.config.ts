import * as Sentry from '@sentry/node';
import { getEnvironmentConfig } from './environment.config';

/**
 * Sentry Configuration for Error Tracking
 * Initializes Sentry client with environment-aware settings
 */

export const initSentry = (): void => {
  const config = getEnvironmentConfig();
  const dsn = process.env.SENTRY_DSN;
  const environment = config.server.nodeEnv;
  const release = config.deployment.version || 'unknown';

  if (!dsn) {
    if (environment === 'production') {
      console.warn(
        'SENTRY_DSN not configured. Error tracking disabled. Set SENTRY_DSN environment variable to enable.',
      );
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      // Enable HTTP client/server integration
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express request/error handlers
      new Sentry.Integrations.Express(),
      // Capture unhandled exceptions
      new Sentry.Integrations.OnUncaughtException(),
      // Capture unhandled promise rejections
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    // Capture 100% of transactions in development, 10% in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Capture 100% of errors
    attachStacktrace: true,
    // Maximum breadcrumbs to capture
    maxBreadcrumbs: 50,
    // Denormalize errors in serverless/async contexts
    beforeSend(event, hint) {
      // Filter out certain error types
      if (event.exception) {
        const error = hint.originalException;
        // Don't send validation errors (already logged)
        if (error?.constructor?.name === 'BadRequestException') {
          return null;
        }
      }
      return event;
    },
  });
};

export default Sentry;
