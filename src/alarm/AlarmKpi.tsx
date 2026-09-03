import React from 'react';
import { type AlarmSeverity, resolveAlarmSeverity, shouldPulse } from './types';

export type AlarmKpiProps = {
  severity?: AlarmSeverity | string;
  value: React.ReactNode;
  label: React.ReactNode;
  badge?: React.ReactNode;
  acknowledged?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  as?: 'div' | 'li' | 'button';
  onClick?: () => void;
};

export function AlarmKpi({
  severity = 'neutral',
  value,
  label,
  badge,
  acknowledged,
  size = 'md',
  className = '',
  as: Comp = 'div',
  onClick,
}: AlarmKpiProps) {
  const resolved = resolveAlarmSeverity(severity);
  const pulse = shouldPulse(resolved, acknowledged);
  const classes = [
    'cdl-alarm-kpi',
    size === 'sm' ? 'cdl-alarm-kpi--sm' : '',
    pulse ? 'cdl-alarm-kpi--pulse' : '',
    /* legacy bridge */
    'alarm-kpi',
    pulse ? 'alarm-kpi--pulse' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const shared = {
    className: classes,
    'data-severity': resolved,
    'data-alarm': resolved === 'urgent' ? 'warning' : resolved === 'ai' ? 'info' : resolved,
    onClick,
  } as const;

  if (Comp === 'button') {
    return (
      <button type="button" {...shared}>
        <span className="cdl-alarm-kpi__value alarm-kpi__value">{value}</span>
        <span className="cdl-alarm-kpi__label alarm-kpi__label">
          <span className="alarm-kpi__label-text">{label}</span>
          {badge != null && badge !== false ? (
            <span className="cdl-alarm-kpi__badge alarm-kpi__badge alarm-kpi__badge--inline">
              {badge}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <Comp {...shared}>
      <span className="cdl-alarm-kpi__value alarm-kpi__value">{value}</span>
      <span className="cdl-alarm-kpi__label alarm-kpi__label">
        <span className="alarm-kpi__label-text">{label}</span>
        {badge != null && badge !== false ? (
          <span className="cdl-alarm-kpi__badge alarm-kpi__badge alarm-kpi__badge--inline">
            {badge}
          </span>
        ) : null}
      </span>
    </Comp>
  );
}

export default AlarmKpi;
