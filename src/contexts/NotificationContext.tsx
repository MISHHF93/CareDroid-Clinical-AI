import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { dispatchAlert } from '../engine/alertEngine';
import { useEmergencyStore } from '../store/emergencyStore';

/**
 * NotificationContext
 * 
 * Global state management for notifications
 * Provides methods to add, remove, and update notifications
 */
const NotificationContext = createContext<any>(null);

function toAlertSeverity(notification) {
  const value = String(notification.severity || notification.type || '').toLowerCase();
  if (value === 'critical' || value === 'error') return 'Critical';
  if (value === 'warning' || value === 'warn') return 'Warning';
  return 'Info';
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      addNotification: () => null,
      removeNotification: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearAll: () => {},
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const alerts = useEmergencyStore((state) => state.alerts);
  const [readIds, setReadIds] = useState(() => new Set());

  const addNotification = useCallback((notification) => {
    return dispatchAlert({
      id: notification.id,
      type: notification.alertType || notification.type || 'System',
      severity: toAlertSeverity(notification),
      title: notification.title || notification.message || 'Notification',
      message: notification.message || notification.body || notification.title || 'Review notification details.',
      patientId: notification.patientId,
      actionLabel: notification.action?.label,
      actionFn: notification.action?.onClick,
      source: notification.source || 'notification-context',
      metadata: notification.metadata,
    });
  }, []);

  const removeNotification = useCallback((id) => {
    setReadIds((current) => new Set(current).add(id));
  }, []);

  const markAsRead = useCallback((id) => {
    setReadIds((current) => new Set(current).add(id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(new Set(alerts.map((alert) => alert.id)));
  }, [alerts]);

  const clearAll = useCallback(() => {
    setReadIds(new Set(alerts.map((alert) => alert.id)));
  }, [alerts]);

  const notifications = useMemo(
    () =>
      alerts.map((alert) => ({
        ...alert,
        read: readIds.has(alert.id) || alert.dismissed,
        timestamp: alert.createdAt,
        body: alert.message,
        priority:
          alert.severity === 'Critical'
            ? 'critical'
            : alert.severity === 'Warning'
              ? 'high'
              : 'medium',
        workspaceIds: alert.metadata?.workspaceIds || ['emergency'],
      })),
    [alerts, readIds],
  );

  const value = {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
