import React from 'react';
import './StatCard.css';

type DeltaDirection = 'up' | 'down' | 'flat';

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaDirection?: DeltaDirection;
  icon?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function StatCard({ label, value, delta, deltaDirection = 'flat', icon, className, ...props }: StatCardProps) {
  return (
    <div className={['cd-stat-card', className ?? ''].filter(Boolean).join(' ')} {...props}>
      <div className="cd-stat-card__header">
        <span className="cd-stat-card__label">{label}</span>
        {icon && <span className="cd-stat-card__icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="cd-stat-card__value">{value}</div>
      {delta && (
        <span className={`cd-stat-card__delta cd-stat-card__delta--${deltaDirection}`}>
          {deltaDirection === 'up' ? '↑' : deltaDirection === 'down' ? '↓' : '→'} {delta}
        </span>
      )}
    </div>
  );
}
