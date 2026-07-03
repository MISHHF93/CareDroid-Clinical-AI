/**
 * Crash reporting — breadcrumbs, structured crash payloads, and backend ingestion.
 */
import appConfig from '../config/appConfig';
import { OBSERVABILITY_CONTRACT } from '../config/observabilityModel';
import { apiFetch } from './apiClient';
import observabilityService from './observabilityService';
import logger from '../utils/logger';

type Breadcrumb = Readonly<{
  timestamp: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}>;

const BREADCRUMB_LIMIT = 40;
const SESSION_KEY = 'caredroid_session_id';

class CrashReportingService {
  private initialized = false;
  private config: Record<string, unknown> = {};
  private breadcrumbs: Breadcrumb[] = [];

  initialize(config: Record<string, unknown>) {
    this.config = config;
    this.initialized = true;
    logger.info('Crash reporting service initialized', {
      environment: config.environment,
      dsnConfigured: Boolean(config.dsn),
    });
  }

  captureException(error: Error, context?: Record<string, unknown>) {
    const payload = this.buildCrashPayload(error, context);
    logger.error('Exception captured', error, context);
    observabilityService.recordError({
      name: error.name,
      message: error.message,
      source: 'crash-reporting',
      metadata: context,
    });
    void this.submitCrash(payload);
  }

  captureMessage(message: string, level: string = 'error', context?: Record<string, unknown>) {
    if (!this.initialized && level !== 'error') return;
    logger.warn(message, { level, ...context });
    observabilityService.recordEvent({
      category: 'error',
      name: 'captured_message',
      severity: level === 'critical' ? 'critical' : level === 'warning' ? 'warn' : 'error',
      message,
      metadata: context,
    });
  }

  setUser(userId: string, email?: string, name?: string) {
    if (!this.initialized) return;
    sessionStorage.setItem('analytics_user', JSON.stringify({ userId, email, name }));
  }

  clearUser() {
    sessionStorage.removeItem('analytics_user');
  }

  addBreadcrumb(message: string, category: string = 'default', data?: Record<string, unknown>) {
    const breadcrumb = Object.freeze({
      timestamp: new Date().toISOString(),
      category,
      message,
      data,
    });
    this.breadcrumbs = [breadcrumb, ...this.breadcrumbs].slice(0, BREADCRUMB_LIMIT);
    logger.debug(`[${category}] ${message}`, data);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getBreadcrumbs(): readonly Breadcrumb[] {
    return this.breadcrumbs;
  }

  private buildCrashPayload(error: Error, context?: Record<string, unknown>) {
    return {
      id: `crash-${Date.now()}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack ? error.stack.split('\n') : [],
      },
      breadcrumbs: this.breadcrumbs.map((item) => `${item.category}: ${item.message}`),
      componentStack: String(context?.componentStack || ''),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      correlationId: observabilityService.getCorrelationId(),
      environment: appConfig.app.environment,
      metadata: context || {},
    };
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'session-server';
    try {
      const existing = window.localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const generated =
        window.crypto?.randomUUID?.() ||
        `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(SESSION_KEY, generated);
      return generated;
    } catch {
      return `session-${Date.now()}`;
    }
  }

  private async submitCrash(payload: Record<string, unknown>) {
    try {
      await apiFetch(OBSERVABILITY_CONTRACT.crashEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      logger.debug('Crash payload retained locally; backend ingest unavailable');
    }
  }
}

const crashReportingService = new CrashReportingService();
export default crashReportingService;