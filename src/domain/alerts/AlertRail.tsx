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

const SEVERITY_RANK: Record<Alert['severity'], number> = {
  Critical: 0,
  Warning: 1,
  Info: 2,
};

export function AlertRail({ alerts, onAction, onDismiss, className }: AlertRailProps) {
  const active = alerts
    .filter((a) => !a.dismissed)
    .sort(
      (left, right) =>
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  if (active.length === 0) {
    return <EmptyState title="No active alerts" />;
  }
  const criticalCount = active.filter((alert) => alert.severity === 'Critical').length;
  const warningCount = active.filter((alert) => alert.severity === 'Warning').length;

  return (
    <section className={['cd-alert-rail', className ?? ''].filter(Boolean).join(' ')} aria-label="Alert rail">
      <header className="cd-alert-rail__header">
        <div>
          <h2 className="cd-alert-rail__title">Active alerts</h2>
          <p className="cd-alert-rail__summary">
            {active.length} open · {criticalCount} critical · {warningCount} warning
          </p>
        </div>
      </header>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- list-style:none strips implicit list semantics in Safari/VoiceOver; role="list" restores it */}
      <ul className="cd-alert-rail__list" role="list">
        {active.map((a) => (
          <li key={a.id}>
            <AlertCard alert={a} onAction={onAction} onDismiss={onDismiss} />
          </li>
        ))}
      </ul>
    </section>
  );
}
