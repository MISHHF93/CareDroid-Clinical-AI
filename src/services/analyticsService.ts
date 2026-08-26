/**
 * Analytics Service for CareDroid-AI
 * Tracks user behavior, feature usage, and application performance
 */

import { apiFetch } from './apiClient';
import { getTenantContext } from './tenantContextStore';
import logger from '../utils/logger';

const PRIVACY_BLOCKLIST = new Set([
  'userId',
  'email',
  'name',
  'patientId',
  'patientName',
  'mrn',
  'note',
  'notes',
  'message',
  'queryText',
  'freeText',
  'rawInput',
]);

export class AnalyticsService {
  private userIdHash: string | null = null;
  private sessionId: string;
  private enabled: boolean = true;
  private queue = [] as any[];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeAnalytics();
  }

  private initializeAnalytics() {
    const optOut = localStorage.getItem('analytics_opt_out');
    if (optOut === 'true') {
      this.enabled = false;
      logger.info('Analytics disabled by user');
      return;
    }

    // Flush events periodically
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, 30000);
  }

  initializeSegment(writeKey: string) {
    if ((window as any).analytics) {
      logger.info('Segment already initialized');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://cdn.segment.com/analytics.js/v1/${writeKey}/analytics.min.js`;
    document.head.appendChild(script);

    logger.info('Segment analytics initialized');
  }

  trackEvent(event: any) {
    if (!this.enabled) return;

    const eventName = event.eventName || event.event;
    const tenantProperties = this.getTenantAnalyticsProperties();
    const parameters = {
      ...this.sanitizeProperties(event.parameters || event.properties || {}),
      ...tenantProperties,
    };
    const timestamp = event.timestamp || new Date().toISOString();
    const userIdHash =
      event.userIdHash || this.hashIdentifier(event.userId) || this.userIdHash || undefined;

    const enrichedEvent = {
      ...this.sanitizeProperties(event),
      ...tenantProperties,
      eventName,
      parameters,
      timestamp,
      ...(userIdHash ? { userIdHash } : {}),
      sessionId: event.sessionId || this.sessionId,
    };

    this.queue.push(enrichedEvent);

    // Send to Segment if available
    if ((window as any).analytics && eventName) {
      (window as any).analytics.track(eventName, parameters);
    }

    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  trackPageView(pageName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    const event = {
      eventName: 'page_view',
      parameters: {
        page: pageName,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        ...properties,
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.trackEvent(event);

    if ((window as any).analytics) {
      (window as any).analytics.page(pageName, event.parameters);
    }
  }

  setUser(properties: any) {
    if (!this.enabled) return;

    this.userIdHash = this.hashIdentifier(properties.userId);

    if ((window as any).analytics && this.userIdHash) {
      (window as any).analytics.identify(this.userIdHash, {
        role: properties.role,
      });
    }
  }

  getUserId(): string | null {
    return this.userIdHash;
  }

  getUserIdHash(): string | null {
    return this.userIdHash;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async flush() {
    if (this.queue.length === 0) return;

    const eventsToFlush = [...this.queue];
    this.queue = [] as any[];

    try {
      const response = await apiFetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: eventsToFlush,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        // Re-queue on failure
        this.queue = [...eventsToFlush, ...this.queue];
      }
    } catch (_error: any) {
      // Re-queue on error
      this.queue = [...eventsToFlush, ...this.queue];
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  optOut() {
    this.enabled = false;
    localStorage.setItem('analytics_opt_out', 'true');
  }

  optIn() {
    this.enabled = true;
    localStorage.removeItem('analytics_opt_out');
  }

  resetSession() {
    this.sessionId = this.generateSessionId();
    this.userIdHash = null;
    this.flush();
  }

  private hashIdentifier(value: unknown): string | null {
    const input = String(value || '').trim();
    if (!input) return null;
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `anon-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  private sanitizeProperties(input: any): Record<string, any> {
    if (!input || typeof input !== 'object') return {};
    return Object.fromEntries(
      Object.entries(input).filter(([key, value]) => {
        if (PRIVACY_BLOCKLIST.has(key)) return false;
        if (['parameters', 'properties'].includes(key)) return false;
        return ['string', 'number', 'boolean'].includes(typeof value) || value == null;
      })
    );
  }

  private getTenantAnalyticsProperties(): Record<string, any> {
    const tenant = getTenantContext();
    if (!tenant) return {};

    return this.sanitizeProperties({
      organizationId: tenant.organizationId,
      workspaceId: tenant.workspaceId,
      role: tenant.role,
      subscriptionPlan: tenant.subscriptionPlan,
      tenantSource: tenant.source,
      isDemoTenant: tenant.isDemoTenant,
    });
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
