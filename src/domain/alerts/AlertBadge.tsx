import React from 'react';
import type { AlertSeverity } from '../../types/emergency';
import './alerts.css';

type AlertBadgeProps = {
  count: number;
  maxSeverity?: AlertSeverity;
  className?: string;
};

export function AlertBadge({ count, maxSeverity = 'Info', className }: AlertBadgeProps) {
  if (count === 0) return null;
  const tone = maxSeverity === 'Critical' ? '' : maxSeverity === 'Warning' ? 'cd-alert-badge--warning' : 'cd-alert-badge--info';
  return (
    <span className={['cd-alert-badge', tone, className ?? ''].filter(Boolean).join(' ')} aria-label={`${count} alert${count !== 1 ? 's' : ''}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
