import React from 'react';
import type { Alert } from '../../types/emergency';
import { AlertCard } from './AlertCard';
import { EmptyState } from '../../components/data-display/EmptyState';
import './alerts.css';

type AlertRailProps = {
  alerts: Alert[];
  onAction?: (alert: Alert) => void;
  onDismiss?: (alert: Alert) => void;
  className?: string;
};

export function AlertRail({ alerts, onAction, onDismiss, className }: AlertRailProps) {
  const active = alerts.filter((a) => !a.dismissed);
  if (active.length === 0) {
    return <EmptyState title="No active alerts" />;
  }
  return (
    <div className={['cd-alert-rail', className ?? ''].filter(Boolean).join(' ')} aria-label="Alert rail">
      {active.map((a) => (
        <AlertCard key={a.id} alert={a} onAction={onAction} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
