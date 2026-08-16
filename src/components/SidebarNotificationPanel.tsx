import { Bell, X } from 'lucide-react';
import { useNotificationShell } from '../contexts/NotificationShellContext';
import {
  alertPatientLabel,
  alertSeverityTone,
  formatAlertTime,
  formatClassificationLabel,
} from '../utils/notificationCenterUtils';
import './SidebarNotificationPanel.css';

export default function SidebarNotificationPanel() {
  const {
    panelOpen,
    closePanel,
    unreadAlertCount,
    visibleNotificationAlerts,
    canViewPatients,
    alertTriage,
    showInformationalAlerts,
    setShowInformationalAlerts,
    patientById,
    recordAlertRead,
    recordAlertDismissed,
    openAlertRoute,
    markAllNotificationsRead,
    loading,
    refreshError,
    productLabel,
  } = useNotificationShell();

  if (!panelOpen) return null;

  return (
    <>
      <button
        type="button"
        className="nc-backdrop"
        aria-label="Close notification center"
        onClick={closePanel}
      />
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="notification-center-title"
        className="nc-panel"
      >
        <header className="nc-panel__header">
          <div className="nc-panel__title-block">
            <Bell size={18} strokeWidth={2} aria-hidden />
            <div>
              <h2 id="notification-center-title">Alerts</h2>
              <p>
                {unreadAlertCount
                  ? `${unreadAlertCount} need review`
                  : 'No priority items unread'}
              </p>
            </div>
          </div>
          <div className="nc-panel__header-actions">
            {alertTriage.suppressed.length ? (
              <button
                type="button"
                className="nc-panel__text-btn"
                onClick={() => setShowInformationalAlerts((open) => !open)}
              >
                {showInformationalAlerts ? 'Hide info' : `+${alertTriage.suppressed.length} info`}
              </button>
            ) : null}
            <button
              type="button"
              className="nc-panel__text-btn"
              onClick={markAllNotificationsRead}
              disabled={!visibleNotificationAlerts.some((alert) => !alert.read)}
            >
              Mark read
            </button>
            <button
              type="button"
              className="nc-panel__icon-btn"
              onClick={closePanel}
              aria-label="Close alerts"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="nc-panel__summary" aria-label="Alert severity summary">
          <span data-tier="critical">
            <strong>{alertTriage.counts.critical}</strong>
            <small>Critical</small>
          </span>
          <span data-tier="high">
            <strong>{alertTriage.counts.high}</strong>
            <small>High</small>
          </span>
          <span data-tier="medium">
            <strong>{alertTriage.counts.medium}</strong>
            <small>Medium</small>
          </span>
        </div>

        {loading && !visibleNotificationAlerts.length ? (
          <div className="nc-panel__empty" role="status">
            Loading {productLabel} alerts...
          </div>
        ) : refreshError && !visibleNotificationAlerts.length ? (
          <div className="nc-panel__empty nc-panel__empty--error" role="alert">
            Using local alert state. {refreshError}
          </div>
        ) : visibleNotificationAlerts.length > 0 ? (
          <ul className="nc-panel__list">
            {visibleNotificationAlerts.map((alert) => {
              const primaryAction = openAlertRoute(alert, closePanel);
              const patientLabel = alertPatientLabel(alert, patientById, canViewPatients);
              const severity = alertSeverityTone(alert);

              return (
                <li
                  key={alert.id}
                  className="nc-item"
                  data-severity={severity}
                  data-read={alert.read ? 'true' : 'false'}
                >
                  <div className="nc-item__main">
                    <div className="nc-item__meta">
                      <span className="nc-item__tier">{formatClassificationLabel(alert)}</span>
                      <time dateTime={alert.createdAt}>{formatAlertTime(alert.createdAt)}</time>
                    </div>
                    <strong className="nc-item__title">{alert.title}</strong>
                    <p className="nc-item__message">{alert.message}</p>
                    {patientLabel ? <span className="nc-item__context">{patientLabel}</span> : null}
                  </div>
                  <div className="nc-item__actions">
                    <button
                      type="button"
                      className="nc-item__primary"
                      disabled={primaryAction.disabled}
                      onClick={() => {
                        recordAlertRead(alert.id);
                        primaryAction.onSelect?.();
                      }}
                    >
                      {primaryAction.disabled
                        ? primaryAction.disabledLabel || 'Unavailable'
                        : primaryAction.label}
                    </button>
                    <button
                      type="button"
                      className="nc-item__ghost"
                      onClick={() => recordAlertDismissed(alert.id)}
                      aria-label="Dismiss alert"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="nc-panel__empty">
            All clear. Operational, clinical, and system alert streams are quiet.
          </div>
        )}
      </aside>
    </>
  );
}