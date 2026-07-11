import './Alert.css';

const TONES = new Set(['info', 'success', 'warning', 'danger']);

export default function Alert({
  tone = 'info',
  title = undefined,
  children,
  action = undefined,
  className = '',
  role = undefined,
  ...props
}) {
  const resolvedTone = TONES.has(tone) ? tone : 'info';
  // Static role strings only (Edge Tools rejects dynamic ARIA roles).
  const useAlertRole =
    role === 'alert' ||
    ((!role || role === 'status') && (resolvedTone === 'danger' || resolvedTone === 'warning'));
  const classNames = ['cd-alert', `cd-alert--${resolvedTone}`, className].filter(Boolean).join(' ');
  const body = (
    <>
      <div className="cd-alert__content">
        {title ? <h3 className="cd-alert__title">{title}</h3> : null}
        {children ? <div className="cd-alert__body">{children}</div> : null}
      </div>
      {action ? <div className="cd-alert__action">{action}</div> : null}
    </>
  );
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
