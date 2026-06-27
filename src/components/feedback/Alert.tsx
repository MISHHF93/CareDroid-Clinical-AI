import React from 'react';
import './Alert.css';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Alert({ tone = 'info', title, icon, action, className, children, role, ...props }: AlertProps) {
  const defaultRole = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
  return (
    <div
      role={role ?? defaultRole}
      className={['cd-alert', `cd-alert--${tone}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {icon && <span className="cd-alert__icon" aria-hidden="true">{icon}</span>}
      <div className="cd-alert__body">
        {title && <p className="cd-alert__title">{title}</p>}
        {children && <div className="cd-alert__message">{children}</div>}
      </div>
      {action && <div className="cd-alert__action">{action}</div>}
    </div>
  );
}
