import React from 'react';
import './queue.css';

type BottleneckAlertProps = {
  title: string;
  subtitle?: string;
  severity?: 'warning' | 'critical';
  actions?: React.ReactNode;
  className?: string;
};

export function BottleneckAlert({ title, subtitle, severity = 'warning', actions, className }: BottleneckAlertProps) {
  const icon = severity === 'critical' ? '🔴' : '⚠️';
  return (
    <div
      role="alert"
      className={['cd-bottleneck', severity === 'critical' ? 'cd-bottleneck--critical' : '', className ?? ''].filter(Boolean).join(' ')}
    >
      <span className="cd-bottleneck__icon" aria-hidden="true">{icon}</span>
      <div className="cd-bottleneck__body">
        <div className="cd-bottleneck__title">{title}</div>
        {subtitle && <div className="cd-bottleneck__sub">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}
