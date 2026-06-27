import React from 'react';
import type { Alert } from '../../types/emergency';
import { Button } from '../../components/primitives/Button';
import './alerts.css';

const ICONS: Record<string, string> = { Info: 'ℹ', Warning: '⚠', Critical: '🚨' };

type AlertCardProps = {
  alert: Alert;
  onAction?: (alert: Alert) => void;
  onDismiss?: (alert: Alert) => void;
  className?: string;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AlertCard({ alert, onAction, onDismiss, className }: AlertCardProps) {
  return (
    <div
      role="alert"
      className={['cd-alert-card', `cd-alert-card--${alert.severity}`, alert.read ? 'cd-alert-card--read' : '', className ?? ''].filter(Boolean).join(' ')}
    >
      <span className={['cd-alert-card__icon', `cd-alert-card__icon--${alert.severity}`].join(' ')} aria-hidden="true">
        {ICONS[alert.severity] ?? 'ℹ'}
      </span>
      <div className="cd-alert-card__body">
        <div className="cd-alert-card__title">{alert.title}</div>
        <div className="cd-alert-card__msg">{alert.message}</div>
        <div className="cd-alert-card__footer">
          <span className="cd-alert-card__time">{fmtTime(alert.createdAt)}</span>
          {alert.actionLabel && onAction && (
            <Button variant="link" size="sm" onClick={() => onAction(alert)}>{alert.actionLabel}</Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={() => onDismiss(alert)}>Dismiss</Button>
          )}
        </div>
      </div>
    </div>
  );
}
