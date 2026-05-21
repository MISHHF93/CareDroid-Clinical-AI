import { useEffect, useState } from 'react';
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
export const NotificationToastContainer = ({ toasts = [], onDismiss }) => {
  return (
    <div className="notification-toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(toast => (
        <NotificationToast
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * Individual Toast Component
 */
const NotificationToast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = (type) => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      critical: '🚨',
    };
    return icons[type] || 'ℹ';
  };

  const handleAction = () => {
    if (toast.action?.onClick) {
      toast.action.onClick();
    }
    onDismiss();
  };

  return (
    <div className={`notification-toast notification-toast-${toast.type}`} role="status">
      <div className="toast-icon">{getIcon(toast.type)}</div>
      
      <div className="toast-content">
        {toast.title && <h4 className="toast-title">{toast.title}</h4>}
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>

      {toast.action && (
        <button
          className="toast-action"
          onClick={handleAction}
          aria-label={toast.action.label}
        >
          {toast.action.label}
        </button>
      )}

      <button
        className="toast-close"
        onClick={onDismiss}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};

/**
 * Custom Hook for Using Toasts
 * Usage:
 * const { toasts, addToast, removeToast } = useToasts();
 * addToast({ type: 'success', title: 'Success!', message: 'Operation completed.' });
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, ...toast }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return { toasts, addToast, removeToast, clearToasts };
};
