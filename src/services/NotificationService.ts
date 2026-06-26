/**
 * NotificationService
 * 
 * Service for managing notification-related API calls and browser notifications
 */

import { apiFetch, buildStreamUrl, getApiErrorMessage, getStoredAccessToken, parseApiResponse } from './apiClient';
import { AUTH_CONFIG } from '../config/auth.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import appConfig from '../config/appConfig';
import { getFirebaseMessagingToken } from './firebaseClient';
import { recordAutomationBlocked, recordAutomationFailure } from './automationAuditLogger';
import { makeNotificationStreamDisabledResponse } from './disabledBackendMocks';
import { reportApiError } from './apiErrorHandling';
import { dispatchAlert } from '../engine/alertEngine';
import logger from '../utils/logger';

const NOTIFICATION_ICON = '/logo.svg';
const NOTIFICATION_BADGE = '/badge.svg';

export const NotificationService = {
  /**
   * Request browser notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      logger.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  /**
   * Register device token for push notifications
   */
  async registerPushToken() {
    try {
      if (!appConfig.features.enablePushNotifications) {
        return false;
      }

      const authToken = localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
      if (!authToken) {
        return false;
      }

      const token = await getFirebaseMessagingToken();
      if (!token) {
        return false;
      }

      const payload = {
        token,
        platform: 'web',
        deviceModel: navigator.userAgent,
        osVersion: navigator.platform,
        appVersion: appConfig.app.version,
      };

      const response = await apiFetch('/api/notifications/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error: any) {
      logger.error('Failed to register push token', { error });
      return false;
    }
  },

  /**
   * Send a user-facing notification through the canonical alert engine.
   */
  sendBrowserNotification(title, options: any = {}) {
    return dispatchAlert({
      type: options.type || 'System',
      severity: options.severity || 'Info',
      title,
      message: options.body || options.message || title,
      source: 'notification-service',
      metadata: {
        icon: options.icon || NOTIFICATION_ICON,
        badge: options.badge || NOTIFICATION_BADGE,
      },
    });
  },

  /**
   * Fetch user's notification history from backend
   */
  async fetchNotificationHistory(limit = 50) {
    try {
      const response = await apiFetch(`/api/notifications?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return await response.json();
    } catch (error: any) {
      logger.error('Error fetching notifications', { error });
      throw error;
    }
  },

  /**
   * Fetch server-side unread notification count.
   */
  async getUnreadCount() {
    try {
      const response = await apiFetch('/api/notifications/unread/count', {
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });
      const data = await parseApiResponse(response, { fallback: {} });

      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      return data.count ?? 0;
    } catch (error: any) {
      logger.error('Error fetching unread notification count', { error });
      throw error;
    }
  },

  /**
   * Mark all current-user notifications as read.
   */
  async markAllAsRead() {
    try {
      const response = await apiFetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });
      const data = await parseApiResponse(response, { fallback: {} });

      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      return data;
    } catch (error: any) {
      logger.error('Error marking all notifications as read', { error });
      throw error;
    }
  },

  /**
   * Fetch registered notification devices for the current user.
   */
  async fetchDevices() {
    try {
      const response = await apiFetch('/api/notifications/devices', {
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });
      const data = await parseApiResponse(response, { fallback: {} });

      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      return Array.isArray(data.devices) ? data.devices : [];
    } catch (error: any) {
      logger.error('Error fetching notification devices', { error });
      throw error;
    }
  },

  /**
   * Remove or disable a registered notification device via the existing device delete route.
   */
  async removeDevice(deviceIdentifier) {
    if (!deviceIdentifier) {
      throw new Error('Device identifier is required.');
    }

    try {
      const response = await apiFetch(`/api/notifications/devices/${encodeURIComponent(deviceIdentifier)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        const data = await parseApiResponse(response, { fallback: {} });
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      return true;
    } catch (error: any) {
      logger.error('Error removing notification device', { error });
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiFetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return await response.json();
    } catch (error: any) {
      logger.error('Error marking notification as read', { error });
      throw error;
    }
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const response = await apiFetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return true;
    } catch (error: any) {
      logger.error('Error deleting notification', { error });
      throw error;
    }
  },

  /**
   * Get user's notification preferences
   */
  async getPreferences() {
    try {
      const response = await apiFetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      return await response.json();
    } catch (error: any) {
      logger.error('Error fetching preferences', { error });
      throw error;
    }
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await apiFetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return await response.json();
    } catch (error: any) {
      logger.error('Error updating preferences', { error });
      throw error;
    }
  },

  /**
   * Enable or disable all notification preferences using the backend bulk route.
   */
  async toggleAllNotifications(enabled) {
    try {
      const response = await apiFetch('/api/notifications/preferences/toggle-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
        body: JSON.stringify({ enabled: Boolean(enabled) }),
      });
      const data = await parseApiResponse(response, { fallback: {} });

      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      return data;
    } catch (error: any) {
      logger.error('Error toggling notification preferences', { error });
      throw error;
    }
  },

  /**
   * Subscribe to real-time notifications via Server-Sent Events (SSE)
   */
  subscribeToNotifications(onNotification, onError) {
    if (!isBackendCapabilityEnabled('notificationStream')) {
      logger.info('Notification stream API not available — skipping SSE subscription');
      const unavailableResponse = makeNotificationStreamDisabledResponse();
      const error: any = new Error('Real-time notification stream is not available on this server.');
      error.unavailableResponse = unavailableResponse;
      void recordAutomationBlocked({
        triggerFired: 'Notification stream subscription requested',
        conditionsEvaluated: [{ label: 'Notification stream backend capability enabled', result: false }],
        actionSelected: 'Subscribe to real-time notification stream',
        toolCalled: 'notifications',
        backendEndpoint: '/api/notifications/stream',
        reason: error.message,
      });
      reportApiError({
        title: 'Notification stream unavailable',
        message: unavailableResponse.message,
        error,
        endpoint: '/api/notifications/stream',
      });
      onError?.(error);
      return null;
    }

    const token = getStoredAccessToken();
    
    const eventSource = new EventSource(
      buildStreamUrl(`/api/notifications/stream?token=${token}`)
    );

    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        onNotification(notification);
      } catch (error: any) {
        logger.error('Error parsing notification', { error });
      }
    };

    eventSource.onerror = (error) => {
      logger.error('Notification stream error', { error });
      void recordAutomationFailure({
        triggerFired: 'Notification stream failed',
        actionSelected: 'Receive real-time notification stream',
        toolCalled: 'notifications',
        backendEndpoint: '/api/notifications/stream',
        error,
      });
      onError?.(error);
      eventSource.close();
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
    };
  },

  /**
   * Send test notification (for preferences page)
   */
  async sendTestNotification() {
    try {
      const response = await apiFetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return await response.json();
    } catch (error: any) {
      logger.error('Error sending test notification', { error });
      throw error;
    }
  },
};
