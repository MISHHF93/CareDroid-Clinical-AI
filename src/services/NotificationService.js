/**
 * NotificationService
 * 
 * Service for managing notification-related API calls and browser notifications
 */

import { apiFetch, buildStreamUrl, getStoredAccessToken } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import appConfig from '../config/appConfig';
import { getFirebaseMessagingToken } from './firebaseClient';
import logger from '../utils/logger';

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

      const authToken = localStorage.getItem('caredroid_access_token');
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
    } catch (error) {
      logger.error('Failed to register push token', { error });
      return false;
    }
  },

  /**
   * Send browser notification
   */
  sendBrowserNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/logo.png',
        badge: '/badge.png',
        ...options,
      });
    }
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
    } catch (error) {
      logger.error('Error fetching notifications', { error });
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      logger.error('Error updating preferences', { error });
      throw error;
    }
  },

  /**
   * Subscribe to real-time notifications via Server-Sent Events (SSE)
   */
  subscribeToNotifications(onNotification, onError) {
    if (!isBackendCapabilityEnabled('notificationStream')) {
      logger.info('Notification stream API not available — skipping SSE subscription');
      onError?.(new Error('Real-time notification stream is not available on this server.'));
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
      } catch (error) {
        logger.error('Error parsing notification', { error });
      }
    };

    eventSource.onerror = (error) => {
      logger.error('Notification stream error', { error });
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
    } catch (error) {
      logger.error('Error sending test notification', { error });
      throw error;
    }
  },
};
