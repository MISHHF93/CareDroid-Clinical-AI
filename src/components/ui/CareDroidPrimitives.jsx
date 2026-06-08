import Badge from './Badge';
import Card from './card';
import PageHeader from './PageHeader';
import { Spinner } from './Spinner';
import './CareDroidPrimitives.css';

export function PageShell({
  eyebrow,
  title,
  titleId,
  description,
  subtitle,
  actions,
  leadingIcon,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  as: Element = 'main',
  ...props
}) {
  return (
    <Element className={['cd-page-shell', className].filter(Boolean).join(' ')} {...props}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        titleId={titleId}
        description={description || subtitle}
        actions={actions}
        leadingIcon={leadingIcon}
        className={headerClassName}
      />
      <div className={['cd-page-shell__content', contentClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </Element>
  );
}

export function SectionHeader({ eyebrow, title, titleId, description, actions, leadingIcon, className = '', ...props }) {
  return (
    <header className={['cd-section-header', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-section-header__main">
        {leadingIcon ? <span className="cd-section-header__icon" aria-hidden>{leadingIcon}</span> : null}
        <div className="cd-section-header__content">
          {eyebrow ? <p className="cd-section-header__eyebrow">{eyebrow}</p> : null}
          <h2 id={titleId} className="cd-section-header__title">{title}</h2>
          {description ? <p className="cd-section-header__description">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="cd-section-header__actions">{actions}</div> : null}
    </header>
  );
}

export function DashboardSection({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  leadingIcon,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  as: Element = 'section',
  ...props
}) {
  return (
    <Element className={['cd-dashboard-section', className].filter(Boolean).join(' ')} {...props}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        titleId={titleId}
        description={description}
        actions={actions}
        leadingIcon={leadingIcon}
        className={headerClassName}
      />
      {children ? (
        <div className={['cd-dashboard-section__content', contentClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      ) : null}
    </Element>
  );
}

export function DashboardGrid({ children, variant = 'cards', className = '', as: Element = 'div', ...props }) {
  return (
    <Element
      className={['cd-dashboard-grid', `cd-dashboard-grid--${variant}`, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Element>
  );
}

export function MetricCard({ label, value, helper, suffix = '', tone = 'neutral', className = '', ...props }) {
  return (
    <Card compact className={['cd-metric-card', `cd-metric-card--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      <span className="cd-metric-card__label">{label}</span>
      <strong className="cd-metric-card__value">
        {value}
        {suffix}
      </strong>
      {helper ? <span className="cd-metric-card__helper">{helper}</span> : null}
    </Card>
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

export function InsightCard({
  eyebrow,
  title,
  description,
  meta,
  badge,
  actions,
  children,
  className = '',
  as: Element = 'article',
  ...props
}) {
  return (
    <Element className={['cd-insight-card', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-insight-card__header">
        <div className="cd-insight-card__title-group">
          {eyebrow ? <span className="cd-insight-card__eyebrow">{eyebrow}</span> : null}
          {title ? <h3>{title}</h3> : null}
        </div>
        {badge ? <div className="cd-insight-card__badge">{badge}</div> : null}
        {meta ? <strong className="cd-insight-card__meta">{meta}</strong> : null}
      </div>
      {description ? <p className="cd-insight-card__description">{description}</p> : null}
      {children}
      {actions ? <div className="cd-insight-card__actions">{actions}</div> : null}
    </Element>
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

export function StatusWidget({ label, value, status = 'neutral', helper, className = '', ...props }) {
  return (
    <Card compact className={['cd-status-widget', `cd-status-widget--${status}`, className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-status-widget__header">
        <span>{label}</span>
        <StatusBadge status={status} />
      </div>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </Card>
  );
}

export function StatusBadge({ status = 'neutral', children, className = '', ...props }) {
  const toneByStatus = {
    live: 'success',
    active: 'success',
    ready: 'success',
    good: 'success',
    online: 'success',
    demo: 'info',
    'demo-ready': 'info',
    'demo-only': 'warning',
    beta: 'info',
    warning: 'warning',
    unsupported: 'danger',
    disabled: 'danger',
    error: 'danger',
    critical: 'danger',
  };
  const tone = toneByStatus[status] || 'neutral';
  return (
    <Badge tone={tone} compact className={['cd-status-badge', className].filter(Boolean).join(' ')} {...props}>
      {children || status}
    </Badge>
  );
}

export function BadgeList({ items = [], tone = 'neutral', className = '', itemClassName = '', empty = null }) {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return empty;
  return (
    <div className={['cd-badge-list', className].filter(Boolean).join(' ')}>
      {visibleItems.map((item) => (
        <Badge key={item} tone={tone} compact className={itemClassName}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function InfoNotice({ label, detail, tone = 'info', className = '', ...props }) {
  return (
    <aside className={['cd-info-notice', `cd-info-notice--${tone}`, className].filter(Boolean).join(' ')} role="note" {...props}>
      <strong>{label}</strong>
      {detail ? <span>{detail}</span> : null}
    </aside>
  );
}

export function FormField({ label, children, className = '', ...props }) {
  return (
    <label className={['cd-form-field', className].filter(Boolean).join(' ')} {...props}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FilterPanel({ children, className = '', ...props }) {
  return (
    <section className={['cd-filter-panel', className].filter(Boolean).join(' ')} aria-label="Filters" {...props}>
      {children}
    </section>
  );
}

export function DataTable({ columns = [], rows = [], getRowKey, empty = 'No rows available.', className = '', ...props }) {
  return (
    <div className={['cd-table-wrap', className].filter(Boolean).join(' ')}>
      <table className="cd-data-table" {...props}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={getRowKey ? getRowKey(row, index) : row.id || index}>
                {columns.map((column) => (
                  <td key={column.key || column.header}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length || 1}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
