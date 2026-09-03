/**
 * Legacy queue-style notification service.
 *
 * The active app-facing notification client is `src/services/NotificationService.ts`.
 * This compatibility service is retained for cost/recommendation queue tests and must not be
 * used for new product notification routing until `/api/notifications/send/:channel` exists.
 */

import { resolveApiRoot } from '../../config/api.config';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { recordAutomationBlocked } from '../../services/automationAuditLogger';
import { makeNotificationSendDisabledResponse } from '../../services/disabledBackendMocks';
import { reportApiError } from '../../services/apiErrorHandling';

const getDefaultApiBaseUrl = () => resolveApiRoot();

export const LEGACY_NOTIFICATION_SERVICE_STATUS = Object.freeze({
  activeClient: false,
  replacement: 'src/services/NotificationService.ts',
  blockedCapability: 'notificationSendChannel',
});

class NotificationService {
  apiBaseUrl: string;
  notificationQueue: any[];
  notificationHistory: any[];
  preferences: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    costAlerts: boolean;
    recommendationAlerts: boolean;
    emergencyAlerts: boolean;
    dailyDigest: boolean;
  };
  isProcessing: boolean;
  userId?: any;
  token?: string;

  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || getDefaultApiBaseUrl();
    this.notificationQueue = [] as any[];
    this.notificationHistory = [] as any[];
    this.preferences = {
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      costAlerts: true,
      recommendationAlerts: true,
      emergencyAlerts: true,
      dailyDigest: false,
    };
    this.isProcessing = false;
  }

  /**
   * Initialize notification service with user preferences
   */
  async initialize(userId, token) {
    this.userId = userId;
    this.token = token;

    try {
      // Load user preferences
      const response = await fetch(`${this.apiBaseUrl}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const prefs = await response.json();
        this.preferences = { ...this.preferences, ...prefs };
      }
    } catch (error: any) {
      reportApiError({
        title: 'Notification preferences load failed',
        message: 'Unable to load notification preferences.',
        error,
        endpoint: '/api/notifications/preferences',
      });
    }
  }

  /**
   * Send cost alert notification
   */
  async sendCostAlert(toolId, currentCost, limitCost, alertType = 'APPROACHING') {
    const notification = {
      id: `alert-${Date.now()}`,
      type: 'COST_ALERT',
      alertType, // 'APPROACHING' (80%), 'EXCEEDED' (100%), 'CRITICAL' (>150%)
      toolId,
      currentCost,
      limitCost,
      percentage: Math.round((currentCost / limitCost) * 100),
      timestamp: new Date(),
      channels: [] as any[],
    };

    // Determine which channels to use
    if (this.preferences.emailEnabled && this.preferences.costAlerts) {
      notification.channels.push('email');
    }
    if (this.preferences.smsEnabled && alertType === 'CRITICAL') {
      notification.channels.push('sms');
    }
    if (this.preferences.inAppEnabled) {
      notification.channels.push('inApp');
    }

    return this.queueNotification(notification);
  }

  /**
   * Send recommendation notification
   */
  async sendRecommendationAlert(recommendations, reason = 'usage_pattern') {
    const notification = {
      id: `rec-${Date.now()}`,
      type: 'RECOMMENDATION_ALERT',
      recommendations,
      reason, // 'usage_pattern', 'cost_saving', 'clinical_need'
      timestamp: new Date(),
      channels: [] as any[],
    };

    if (this.preferences.emailEnabled && this.preferences.recommendationAlerts) {
      notification.channels.push('email');
    }
    if (this.preferences.inAppEnabled) {
      notification.channels.push('inApp');
    }

    return this.queueNotification(notification);
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyAlert(message, severity = 'high') {
    const notification = {
      id: `emerg-${Date.now()}`,
      type: 'EMERGENCY_ALERT',
      message,
      severity, // 'low', 'high', 'critical'
      timestamp: new Date(),
      channels: ['inApp'], // Always send in-app
    };

    if (this.preferences.emailEnabled && this.preferences.emergencyAlerts) {
      notification.channels.push('email');
    }
    if (this.preferences.smsEnabled && severity === 'critical') {
      notification.channels.push('sms');
    }

    return this.queueNotification(notification);
  }

  /**
   * Queue notification for sending
   */
  async queueNotification(notification) {
    this.notificationQueue.push(notification);

    // Process immediately if small queue
    if (this.notificationQueue.length <= 3 && !this.isProcessing) {
      this.processQueue();
    }

    return notification.id;
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        await this.sendNotification(notification);
      }
    } catch (error: any) {
      reportApiError({
        title: 'Notification queue processing failed',
        message: 'Unable to process the notification queue.',
        error,
        endpoint: 'local:notification-queue',
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send notification via all configured channels
   */
  async sendNotification(notification) {
    const results = {
      notificationId: notification.id,
      channels: {},
      timestamp: new Date(),
    };

    for (const channel of notification.channels) {
      try {
        const result = await this.sendViaChannel(channel, notification);
        results.channels[channel] = result;
      } catch (error: any) {
        reportApiError({
          title: 'Notification delivery failed',
          message: `Unable to send notification through ${channel}.`,
          error,
          endpoint: `/api/notifications/send/${channel}`,
        });
        results.channels[channel] = { success: false, error: error.message };
      }
    }

    // Add to history
    this.notificationHistory.push({
      ...notification,
      results,
      sentAt: new Date(),
    });

    // Keep history limited to last 100
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(-100);
    }

    return results;
  }

  /**
   * Send notification via specific channel
   */
  async sendViaChannel(channel, notification) {
    if (!isBackendCapabilityEnabled('notificationSendChannel')) {
      const error = new Error(`Server send channel "${channel}" is not available.`);
      const fallback = makeNotificationSendDisabledResponse(channel);
      await recordAutomationBlocked({
        triggerFired: 'Queue-style notification send requested',
        conditionsEvaluated: [
          { label: 'Notification send-channel backend capability enabled', result: false },
        ],
        actionSelected: `Send notification through ${channel}`,
        toolCalled: 'notification-queue',
        backendEndpoint: `/api/notifications/send/${channel}`,
        reason: error.message,
      });
      reportApiError({
        title: 'Notification channel unavailable',
        message: fallback.message,
        error,
        endpoint: `/api/notifications/send/${channel}`,
      });
      return fallback;
    }

    const payload = this.buildChannelPayload(channel, notification);

    const response = await fetch(`${this.apiBaseUrl}/notifications/send/${channel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Channel ${channel} returned ${response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  }

  /**
   * Build payload for specific channel
   */
  buildChannelPayload(channel, notification) {
    const base = {
      userId: this.userId,
      notificationId: notification.id,
      timestamp: notification.timestamp,
    };

    switch (notification.type) {
      case 'COST_ALERT':
        return {
          ...base,
          subject: `Cost Alert: ${notification.toolId}`,
          body: this.formatCostAlertMessage(notification),
          data: {
            type: notification.type,
            alertType: notification.alertType,
            toolId: notification.toolId,
            percentage: notification.percentage,
          },
        };

      case 'RECOMMENDATION_ALERT':
        return {
          ...base,
          subject: 'Clinical Recommendations',
          body: this.formatRecommendationMessage(notification),
          data: {
            type: notification.type,
            recommendations: notification.recommendations,
          },
        };

      case 'EMERGENCY_ALERT':
        return {
          ...base,
          subject: `?? Emergency Alert`,
          body: notification.message,
          priority: notification.severity === 'critical' ? 'high' : 'normal',
          data: {
            type: notification.type,
            severity: notification.severity,
          },
        };

      default:
        return base;
    }
  }

  /**
   * Format cost alert message
   */
  formatCostAlertMessage(notification) {
    const { alertType, toolId, currentCost, limitCost, percentage } = notification;

    switch (alertType) {
      case 'APPROACHING':
        return `Tool ${toolId} cost is approaching limit: $${currentCost.toFixed(
          2,
        )} / $${limitCost.toFixed(2)} (${percentage}%)`;

      case 'EXCEEDED':
        return `?? Tool ${toolId} cost has exceeded limit: $${currentCost.toFixed(
          2,
        )} / $${limitCost.toFixed(2)} (${percentage}%)`;

      case 'CRITICAL':
        return `?? CRITICAL: Tool ${toolId} cost is critically high: $${currentCost.toFixed(
          2,
        )} / $${limitCost.toFixed(2)} (${percentage}%)`;

      default:
        return `Cost alert for ${toolId}`;
    }
  }

  /**
   * Format recommendation message
   */
  formatRecommendationMessage(notification) {
    const { reason, recommendations } = notification;
    const recString = recommendations.map((r) => r.name).join(', ');

    switch (reason) {
      case 'cost_saving':
        return `We recommend using: ${recString} to optimize costs`;

      case 'clinical_need':
        return `Based on your query, we recommend: ${recString}`;

      case 'usage_pattern':
        return `You might find these useful based on your usage: ${recString}`;

      default:
        return `Recommended tools: ${recString}`;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(newPreferences) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(newPreferences),
      });

      if (response.ok) {
        this.preferences = { ...this.preferences, ...newPreferences };
        return true;
      }
    } catch (error: any) {
      reportApiError({
        title: 'Notification preference update failed',
        message: 'Unable to update notification preferences.',
        error,
        endpoint: '/api/notifications/preferences',
      });
    }

    return false;
  }

  /**
   * Get notification history
   */
  getHistory(limit = 20, type = null) {
    let history = this.notificationHistory;

    if (type) {
      history = history.filter((n) => n.type === type);
    }

    return history.slice(-limit).reverse();
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      queueLength: this.notificationQueue.length,
      historyCount: this.notificationHistory.length,
      isProcessing: this.isProcessing,
      preferences: this.preferences,
    };
  }
}

// Singleton instance
let instance: any = null;

export function getNotificationService(apiBaseUrl) {
  if (!instance) {
    instance = new NotificationService(apiBaseUrl);
  }
  return instance;
}

export default NotificationService;
