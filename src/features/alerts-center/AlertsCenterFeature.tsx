import React from 'react';
import { useAlertsCenter } from './useAlertsCenter';
import { AlertRail } from '../../domain/alerts/AlertRail';
import { AlertBadge } from '../../domain/alerts/AlertBadge';
import type { Alert } from '../../types/emergency';

export function AlertsCenterFeature() {
  const { alerts, unread, maxSeverity, dismissAlert, acknowledgeAlert } = useAlertsCenter();

  function handleAction(alert: Alert) {
    acknowledgeAlert(alert.id);
  }

  function handleDismiss(alert: Alert) {
    dismissAlert(alert.id);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--cd-space-3)', padding: 'var(--cd-space-3) var(--cd-space-4)', borderBottom: '1px solid var(--cd-border-subtle)', background: 'var(--cd-bg-surface)' }}>
        <span style={{ fontSize: 'var(--cd-text-md)', fontWeight: 'var(--cd-font-semibold)', color: 'var(--cd-text-primary)' }}>
          Alerts
        </span>
        <AlertBadge count={unread} maxSeverity={maxSeverity} />
        <span style={{ marginLeft: 'auto', fontSize: 'var(--cd-text-xs)', color: 'var(--cd-text-secondary)' }}>
          {alerts.length} active
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--cd-space-3) var(--cd-space-4)' }}>
        <AlertRail alerts={alerts} onAction={handleAction} onDismiss={handleDismiss} />
      </div>
    </div>
  );
}
