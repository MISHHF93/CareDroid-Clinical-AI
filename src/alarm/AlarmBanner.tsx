import React from 'react';
import { AlertTriangle, Info, CheckCircle2, Siren, Sparkles, Flame } from 'lucide-react';
import {
  type AlarmAction,
  type AlarmSeverity,
  alarmAriaRole,
  resolveAlarmSeverity,
  shouldPulse,
} from './types';

const ICONS: Record<AlarmSeverity, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  critical: Siren,
  urgent: Flame,
  warning: AlertTriangle,
  info: Info,
  ok: CheckCircle2,
  neutral: Info,
  ai: Sparkles,
};

export type AlarmBannerProps = {
  severity?: AlarmSeverity | string;
  title: React.ReactNode;
  message?: React.ReactNode;
  acknowledged?: boolean;
  actions?: AlarmAction[];
  onAction?: (actionId: string) => void;
  className?: string;
  children?: React.ReactNode;
};

export function AlarmBanner({
  severity = 'info',
  title,
  message,
  acknowledged,
  actions,
  onAction,
  className = '',
  children,
}: AlarmBannerProps) {
  const resolved = resolveAlarmSeverity(severity);
  const pulse = shouldPulse(resolved, acknowledged);
  const Icon = ICONS[resolved];
  const role = alarmAriaRole(resolved);

  return (
    <div
      className={['cdl-alarm-banner', pulse ? 'cdl-alarm-banner--pulse' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-severity={resolved}
      role={role}
    >
      <span className="cdl-alarm-banner__icon" aria-hidden>
        <Icon size={20} strokeWidth={1.85} />
      </span>
      <div className="cdl-alarm-banner__body">
        <h3 className="cdl-alarm-banner__title">{title}</h3>
        {message ? <p className="cdl-alarm-banner__message">{message}</p> : null}
        {children}
      </div>
      {actions && actions.length > 0 ? (
        <div className="cdl-alarm-banner__actions">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={[
                'cdl-alarm-banner__action',
                action.variant === 'primary' ? 'cdl-alarm-banner__action--primary' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={action.disabled}
              onClick={() => onAction?.(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AlarmBanner;
