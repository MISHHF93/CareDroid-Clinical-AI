/**
 * Crash Reporting Service for CareDroid-AI
 * Simplified implementation for error tracking
 * In production, integrate with Sentry by installing @sentry/react
 */
import logger from '../utils/logger';

class CrashReportingService {
  private initialized: boolean = false;
  private config: any = {};

  initialize(config: any) {
    this.config = config;
    this.initialized = true;
    logger.info('Crash reporting service initialized');
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;
    logger.error('Exception captured', { message: error.message, context });
  }

  captureMessage(message: string, level: string = 'error') {
    if (!this.initialized) return;
    logger.warn(`[${level}] ${message}`);
  }

  setUser(userId: string, email?: string, name?: string) {
    if (!this.initialized) return;
    sessionStorage.setItem('analytics_user', JSON.stringify({ userId, email, name }));
  }

  clearUser() {
    sessionStorage.removeItem('analytics_user');
  }

  addBreadcrumb(message: string, category: string = 'default', data?: Record<string, any>) {
    if (!this.initialized) return;
    logger.debug(`[${category}] ${message}`, { data });
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

const crashReportingService = new CrashReportingService();
export default crashReportingService;
