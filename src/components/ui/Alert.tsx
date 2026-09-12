import type { ReactNode } from 'react';
import './Alert.css';

const TONES = new Set(['info', 'success', 'warning', 'danger']);

type AlertProps = {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: string;
  children?: ReactNode;
};

export default function Alert({
  tone = 'info',
  title = undefined,
  icon,
  children,
  action = undefined,
  className = '',
  role = undefined,
  ...props
}: AlertProps & Record<string, unknown>) {
  const resolvedTone = TONES.has(tone) ? tone : 'info';
  // Static role strings only (Edge Tools rejects dynamic ARIA roles).
  const useAlertRole =
    role === 'alert' ||
    ((!role || role === 'status') && (resolvedTone === 'danger' || resolvedTone === 'warning'));
  const classNames = ['cd-alert', `cd-alert--${resolvedTone}`, className].filter(Boolean).join(' ');
  const body = (
    <>
      {icon && (
        <span className="cd-alert__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="cd-alert__content">
        {title ? <h3 className="cd-alert__title">{title}</h3> : null}
        {children ? <div className="cd-alert__body">{children}</div> : null}
      </div>
      {action ? <div className="cd-alert__action">{action}</div> : null}
    </>
  );
  if (role === 'note') {
    return (
      <div className={classNames} role="note" {...props}>
        {body}
      </div>
    );
  }
  if (useAlertRole) {
    return (
      <div className={classNames} role="alert" {...props}>
        {body}
      </div>
    );
  }
  return (
    <div className={classNames} role="status" {...props}>
      {body}
    </div>
  );
}
