import Badge from './Badge';
import Card from './card';
import { Spinner } from './Spinner';
import './CareDroidPrimitives.css';

export function SectionHeader({ eyebrow, title, description, actions, className = '', ...props }) {
  return (
    <header className={['cd-section-header', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-section-header__content">
        {eyebrow ? <p className="cd-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="cd-section-header__title">{title}</h2>
        {description ? <p className="cd-section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="cd-section-header__actions">{actions}</div> : null}
    </header>
  );
}

export function DashboardCard({ title, value, description, meta, actions, children, className = '', ...props }) {
  return (
    <Card compact className={['cd-dashboard-card', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-dashboard-card__header">
        <h3>{title}</h3>
        {meta ? <span className="cd-dashboard-card__meta">{meta}</span> : null}
      </div>
      {value !== undefined ? <strong className="cd-dashboard-card__value">{value}</strong> : null}
      {description ? <p className="cd-dashboard-card__description">{description}</p> : null}
      {children}
      {actions ? <div className="cd-dashboard-card__actions">{actions}</div> : null}
    </Card>
  );
}

export function ToolCard({ title, description, badge, meta, actions, children, className = '', ...props }) {
  return (
    <Card compact hover className={['cd-tool-card', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-tool-card__header">
        <h3>{title}</h3>
        {badge ? <div className="cd-tool-card__badge">{badge}</div> : null}
      </div>
      {description ? <p className="cd-tool-card__description">{description}</p> : null}
      {meta ? <p className="cd-tool-card__meta">{meta}</p> : null}
      {children}
      {actions ? <div className="cd-tool-card__actions">{actions}</div> : null}
    </Card>
  );
}

export function StatusBadge({ status = 'neutral', children, className = '', ...props }) {
  const toneByStatus = {
    live: 'success',
    active: 'success',
    ready: 'success',
    demo: 'info',
    'demo-ready': 'info',
    'demo-only': 'warning',
    beta: 'info',
    warning: 'warning',
    unsupported: 'danger',
    disabled: 'danger',
    error: 'danger',
  };
  const tone = toneByStatus[status] || 'neutral';
  return (
    <Badge tone={tone} compact className={['cd-status-badge', className].filter(Boolean).join(' ')} {...props}>
      {children || status}
    </Badge>
  );
}

export function LoadingState({ title = 'Loading', description, className = '', ...props }) {
  return (
    <div className={['cd-state cd-state--loading', className].filter(Boolean).join(' ')} role="status" {...props}>
      <Spinner size="sm" />
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

export function UnsupportedState({
  title = 'Unsupported in this environment',
  description = 'This capability is not available from the current workspace, role, or backend configuration.',
  action,
  className = '',
  ...props
}) {
  return (
    <div className={['cd-state cd-state--unsupported', className].filter(Boolean).join(' ')} role="status" {...props}>
      <StatusBadge status="unsupported">Unsupported</StatusBadge>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="cd-state__action">{action}</div> : null}
    </div>
  );
}
