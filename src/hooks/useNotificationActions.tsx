import { dispatchAlert } from '../engine/alertEngine';

const ALERT_SEVERITY_BY_NOTIFICATION_TYPE = {
  success: 'Info',
  info: 'Info',
  warning: 'Warning',
  error: 'Warning',
  critical: 'Critical',
};

function dispatchNotificationAlert(type, title, message, action: any = null) {
  return dispatchAlert({
    type: 'System',
    severity: ALERT_SEVERITY_BY_NOTIFICATION_TYPE[type] || 'Info',
    title,
    message,
    actionLabel: action?.label,
    actionFn: action?.onClick,
  });
}

/**
 * Hook for easily adding notifications from any component
 *
 * Usage:
 * const { success } = useNotificationActions();
 *
 * success('Success!', 'Your changes have been saved.');
 */
export const useNotificationActions = () => {
  return {
    /**
     * Add a success notification (green check)
     */
    success: (title, message, action = null) => dispatchNotificationAlert('success', title, message, action),

    /**
     * Add an error notification (red X)
     */
    error: (title, message, action = null) => dispatchNotificationAlert('error', title, message, action),

    /**
     * Add a warning notification (orange caution)
     */
    warning: (title, message, action = null) => dispatchNotificationAlert('warning', title, message, action),

    /**
     * Add an info notification (blue i)
     */
    info: (title, message, action = null) => dispatchNotificationAlert('info', title, message, action),

    /**
     * Add a critical notification (red emergency banner)
     * These persist until manually removed and show with high prominence
     */
    critical: (title, message, action = null) => dispatchNotificationAlert('critical', title, message, action),

    /**
     * Add an update/product notification
     */
    update: (title, message, action = null) => dispatchNotificationAlert('info', title, message, action),

    /**
     * Add an announcement notification
     */
    announcement: (title, message, action = null) => dispatchNotificationAlert('info', title, message, action),

    /**
     * Remove a notification by ID
     */
    remove: () => {},

    /**
     * Mark notification as read
     */
    markRead: () => {},
  };
};

/**
 * Example usage in a component:
 *
 * function SaveButton() {
 *   const { success, error } = useNotificationActions();
 *
 *   const handleSave = async () => {
 *     try {
 *       await api.save(data);
 *       success('Saved!', 'Your changes have been saved successfully.');
 *     } catch (err: any) {
 *       error('Error', 'Failed to save changes. Please try again.');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 */
