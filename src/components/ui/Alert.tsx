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
  return (
    <div
      className={['cd-alert', `cd-alert--${resolvedTone}`, className].filter(Boolean).join(' ')}
      role={role || (resolvedTone === 'danger' || resolvedTone === 'warning' ? 'alert' : 'status')}
      {...props}
    >
      <div className="cd-alert__content">
        {title ? <h3 className="cd-alert__title">{title}</h3> : null}
        {children ? <div className="cd-alert__body">{children}</div> : null}
      </div>
      {action ? <div className="cd-alert__action">{action}</div> : null}
    </div>
  );
}
