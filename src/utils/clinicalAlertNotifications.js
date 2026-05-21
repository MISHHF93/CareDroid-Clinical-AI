/**
 * Clinical Intelligence Notification Integration
 * Manages delivery of clinical alerts through the notification system
 */

import NotificationService from '../services/NotificationService';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { apiFetch } from '../services/apiClient';

export const sendClinicalAlert = async (alertData, options = {}) => {
  const {
    deliveryChannels = ['in-app', 'push'],
    userId = null,
    urgent = false,
    requiresAcknowledgement = true
  } = options;

  try {
    const notification = {
      type: 'CLINICAL_ALERT',
      title: alertData.title,
      message: alertData.description,
      severity: alertData.severity,
      metadata: {
        alertId: alertData.id,
        alertType: alertData.type || 'clinical',
        findings: alertData.findings || [],
        recommendations: alertData.recommendations || [],
        source: alertData.source,
        timestamp: alertData.timestamp || new Date()
      },
      icon: getSeverityIcon(alertData.severity),
      color: getSeverityColor(alertData.severity),
      deepLink: `/clinical/alerts?alertId=${alertData.id}`,
      actionButtons: getRecommendedActions(alertData),
      isUrgent: urgent || alertData.severity === 'critical'
    };

    // Send through each delivery channel
    const sendPromises = [];

    if (deliveryChannels.includes('in-app')) {
      sendPromises.push(
        NotificationService.showNotification({
          ...notification,
          channel: 'in-app'
        })
      );
    }

    if (deliveryChannels.includes('push') && 'Notification' in window) {
      sendPromises.push(
        NotificationService.sendPushNotification({
          ...notification,
          channel: 'push'
        })
      );
    }

    if (deliveryChannels.includes('email')) {
      sendPromises.push(
        NotificationService.sendEmailNotification({
          ...notification,
          channel: 'email',
          recipient: userId
        })
      );
    }

    await Promise.all(sendPromises);

    // Log the alert delivery
    if (window.analyticsService) {
      window.analyticsService.trackEvent({
        eventName: 'clinical_alert_sent',
        parameters: {
          alertId: alertData.id,
          severity: alertData.severity,
          channels: deliveryChannels,
          timestamp: new Date()
        }
      });
    }

    return { success: true, alertId: alertData.id };
  } catch (error) {
    console.error('Error sending clinical alert:', error);
    return { success: false, error: error.message };
  }
};

export const sendBatchClinicalAlerts = async (alerts, options = {}) => {
  const results = [];

  for (const alert of alerts) {
    const result = await sendClinicalAlert(alert, options);
    results.push(result);
    // Add small delay to avoid overwhelming the notification system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

export const acknowledgeClinicalAlert = async (alertId, userId = null) => {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return {
      success: true,
      alertId,
      localOnly: true,
      message: 'Acknowledged locally — clinical alerts API is not on the server.',
    };
  }

  try {
    const response = await apiFetch(`/api/clinical/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        acknowledgedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to acknowledge alert: ${response.status}`);
    }

    return { success: true, alertId };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, error: error.message };
  }
};

export const dismissClinicalAlert = async (alertId, reason = '') => {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return {
      success: true,
      alertId,
      localOnly: true,
      message: 'Dismissed locally — clinical alerts API is not on the server.',
    };
  }

  try {
    const response = await apiFetch(`/api/clinical/alerts/${alertId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        dismissedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to dismiss alert: ${response.status}`);
    }

    return { success: true, alertId };
  } catch (error) {
    console.error('Error dismissing alert:', error);
    return { success: false, error: error.message };
  }
};

const getSeverityIcon = (severity) => {
  const icons = {
    critical: '🔴',
    high: '🟠',
    moderate: '🟡',
    low: '🟢',
    warning: '⚠️'
  };
  return icons[severity] || '📋';
};

const getSeverityColor = (severity) => {
  const colors = {
    critical: '#ff4d4f',
    high: '#ff7a45',
    moderate: '#faad14',
    low: '#52c41a',
    warning: '#faad14'
  };
  return colors[severity] || '#1890ff';
};

const getRecommendedActions = (alertData) => {
  const actions = [];

  // Add action based on severity
  if (alertData.severity === 'critical') {
    actions.push({
      label: 'View Details',
      action: `navigate:/clinical/alerts?alertId=${alertData.id}`,
      isPrimary: true
    });
    actions.push({
      label: 'Acknowledge',
      action: `acknowledge:${alertData.id}`,
      style: 'success'
    });
  } else if (alertData.severity === 'high') {
    actions.push({
      label: 'Review',
      action: `navigate:/clinical/alerts?alertId=${alertData.id}`,
      isPrimary: true
    });
  }

  actions.push({
    label: 'Dismiss',
    action: `dismiss:${alertData.id}`,
    style: 'secondary'
  });

  return actions;
};

/**
 * Create a subscription to clinical alerts for real-time updates
 * Uses WebSocket for live alert streaming (when available)
 */
export const subscribeToClinicalAlerts = (callbacks = {}) => {
  const {
    onAlert = () => {},
    onAcknowledged = () => {},
    onDismissed = () => {},
    onError = () => {}
  } = callbacks;

  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    onError(
      new Error(
        'Clinical alerts stream is not available on this server. Use in-app notifications or refresh the alerts page.'
      )
    );
    return null;
  }

  // Attempt WebSocket connection for real-time alerts
  if (!window.WebSocket) {
    onError(new Error('WebSocket not supported'));
    return null;
  }

  try {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/clinical/alerts/stream`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to clinical alerts stream');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'alert') {
          onAlert(data.payload);
        } else if (data.type === 'acknowledged') {
          onAcknowledged(data.payload);
        } else if (data.type === 'dismissed') {
          onDismissed(data.payload);
        }
      } catch (error) {
        onError(error);
      }
    };

    ws.onerror = (error) => {
      onError(error);
    };

    return ws;
  } catch (error) {
    onError(error);
    return null;
  }
};

export default {
  sendClinicalAlert,
  sendBatchClinicalAlerts,
  acknowledgeClinicalAlert,
  dismissClinicalAlert,
  subscribeToClinicalAlerts
};
