import { useNotifications } from '../contexts/NotificationContext';

/**
 * Hook for easily adding notifications from any component
 * 
 * Usage:
 * const { addNotification } = useNotificationActions();
 * 
 * addNotification({
 *   type: 'success',
 *   title: 'Success!',
 *   message: 'Your changes have been saved.',
 * });
 */
export const useNotificationActions = () => {
  const { addNotification, removeNotification, markAsRead } = useNotifications();

  return {
    /**
     * Add a success notification (green check)
     */
    success: (title, message, action = null) => {
      return addNotification({
        type: 'success',
        title,
        message,
        action,
      });
    },

    /**
     * Add an error notification (red X)
     */
    error: (title, message, action = null) => {
      return addNotification({
        type: 'error',
        title,
        message,
        action,
      });
    },

    /**
     * Add a warning notification (orange caution)
     */
    warning: (title, message, action = null) => {
      return addNotification({
        type: 'warning',
        title,
        message,
        action,
      });
    },

    /**
     * Add an info notification (blue i)
     */
    info: (title, message, action = null) => {
      return addNotification({
        type: 'info',
        title,
        message,
        action,
      });
    },

    /**
     * Add a critical notification (red emergency banner)
     * These persist until manually removed and show with high prominence
     */
    critical: (title, message, action = null) => {
      return addNotification({
        type: 'critical',
        title,
        message,
        action,
      });
    },

    /**
     * Add an update/product notification
     */
    update: (title, message, action = null) => {
      return addNotification({
        type: 'info',
        title,
        message,
        action,
      });
    },

    /**
     * Add an announcement notification
     */
    announcement: (title, message, action = null) => {
      return addNotification({
        type: 'info',
        title,
        message,
        action,
      });
    },

    /**
     * Remove a notification by ID
     */
    remove: removeNotification,

    /**
     * Mark notification as read
     */
    markRead: markAsRead,
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
 *     } catch (err) {
 *       error('Error', 'Failed to save changes. Please try again.');
 *     }
 *   };
 * 
 *   return <button onClick={handleSave}>Save</button>;
 * }
 */
