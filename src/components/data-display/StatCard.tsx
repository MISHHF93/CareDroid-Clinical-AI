import React from 'react';
import {
  alarmSeverityBadge,
  alarmSurfaceClassNames,
  resolveAlarmSeverity,
  type AlarmToneInput,
} from '../../config/alarmVisualModel';
import '../../styles/alarm-system.css';
import './StatCard.css';

type DeltaDirection = 'up' | 'down' | 'flat';

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaDirection?: DeltaDirection;
  icon?: React.ReactNode;
  /** Platform alarm tone for visual severity (critical/warning/…). */
  tone?: AlarmToneInput;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = 'flat',
  icon,
  tone = 'neutral',
  className,
  ...props
}: StatCardProps) {
  const severity = resolveAlarmSeverity(tone);
  const badge = alarmSeverityBadge(severity);
  return (
    <div
      className={['cd-stat-card', alarmSurfaceClassNames(tone), className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-alarm={severity}
      data-tone={String(tone || 'neutral')}
      {...props}
    >
      <div className="cd-stat-card__header">
        <span className="cd-stat-card__label">
          {label}
          {badge ? <span className="alarm-kpi__badge alarm-kpi__badge--inline">{badge}</span> : null}
        </span>
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
