import type { HTMLAttributes, ReactNode } from 'react';
import './Alert.css';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Alert({ tone = 'info', title, icon, action, className, children, role, ...props }: AlertProps) {
  // Static role strings only (Edge Tools rejects dynamic ARIA roles).
  const useAlertRole =
    role === 'alert' || ((!role || role === 'status') && (tone === 'danger' || tone === 'warning'));
  const classNames = ['cd-alert', `cd-alert--${tone}`, className ?? ''].filter(Boolean).join(' ');
  const body = (
    <>
      {icon && <span className="cd-alert__icon" aria-hidden="true">{icon}</span>}
      <div className="cd-alert__body">
        {title && <p className="cd-alert__title">{title}</p>}
        {children && <div className="cd-alert__message">{children}</div>}
      </div>
      {action && <div className="cd-alert__action">{action}</div>}
    </>
  );
  if (useAlertRole) {
    return (
      <div role="alert" className={classNames} {...props}>
        {body}
      </div>
    );
  }
  return (
    <div role="status" className={classNames} {...props}>
      {body}
    </div>
  );
}
