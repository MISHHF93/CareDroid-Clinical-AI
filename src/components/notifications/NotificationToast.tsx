import { useEffect } from 'react';
import { dispatchAlert } from '../../engine/alertEngine';
import './NotificationToast.css';

/**
 * NotificationToast Component
 * 
 * Temporary toast notification that appears at bottom-right of screen
 * Auto-dismisses after 4 seconds (or immediately if action taken)
 * 
 * @param {Array<id, title, message, type, action>} toasts - List of toasts to display
 * @param {Function} onDismiss - Callback when toast is dismissed
 */
export const NotificationToastContainer = ({ toasts = [] as any[], onDismiss }) => {
  useEffect(() => {
    toasts.forEach((notice) => {
      dispatchNotice(notice);
      onDismiss?.(notice.id);
    });
  }, [onDismiss, toasts]);

  return null;
};

/**
 * Custom Hook for Using Toasts
 * Usage:
 * const { addToast } = useToasts();
 * addToast({ type: 'success', title: 'Success!', message: 'Operation completed.' });
 */
export const useToasts = () => {
  const addToast = (notice) => {
    return dispatchNotice(notice);
  };

  const removeToast = () => {};
  const clearToasts = () => {};

  const toasts = [] as any[];
  return { toasts, addToast, removeToast, clearToasts };
};

function dispatchNotice(notice) {
  return dispatchAlert({
    type: 'System',
    severity: notice.type === 'critical' || notice.type === 'error' ? 'Critical' : notice.type === 'warning' ? 'Warning' : 'Info',
    title: notice.title || notice.message || 'Notification',
    message: notice.message || notice.title || 'Review notification details.',
    actionLabel: notice.action?.label,
    actionFn: notice.action?.onClick,
    source: 'notification-toast-compat',
  });
}
