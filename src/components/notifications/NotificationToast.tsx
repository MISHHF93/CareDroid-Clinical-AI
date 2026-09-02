import { useEffect } from 'react';
import { dispatchAlert } from '../../engine/alertEngine';
import './NotificationToast.css';

/**
 * Legacy toast compatibility shim -- NOT a toast renderer.
 *
 * CareDroid has one notification surface, the alert engine. This module keeps
 * the old toast call shapes working by forwarding them into dispatchAlert()
 * (tagged source 'notification-toast-compat'), so nothing here paints
 * anything: the container renders null, `toasts` is always empty, and
 * removeToast/clearToasts are no-ops because the alert engine owns dismissal.
 *
 * It currently has no callers -- the migration it exists for is finished --
 * and is kept as the landing pad for any legacy toast call that resurfaces.
 * Do not wire it expecting a bottom-right toast; raise an alert-engine alert
 * instead. The docblock previously here described exactly that bottom-right,
 * 4-second auto-dismissing toast, which this has not been for some time.
 *
 * @param toasts    Legacy toast notices; each is forwarded, then dismissed.
 * @param onDismiss Invoked per notice once forwarded.
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
 * Legacy toast hook. addToast() raises an alert-engine alert; it does not
 * queue a toast. `toasts` stays empty and remove/clear are no-ops, so do not
 * drive UI from them.
 *
 *   const { addToast } = useToasts();
 *   addToast({ type: 'success', title: 'Saved', message: 'Operation completed.' });
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
