import React, { HTMLAttributes, LabelHTMLAttributes, TableHTMLAttributes } from 'react';
import Badge from './Badge';
import Card from './card';
import PageHeader from './PageHeader';
import { Spinner } from './Spinner';
import './CareDroidPrimitives.css';

interface AsProps {
  as?: React.ElementType;
}

interface HeaderProps extends AsProps {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  titleId?: string;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

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
  as: Element = 'section',
  ...props
}: HeaderProps & HTMLAttributes<HTMLElement>) {
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
        children={undefined}
      />
      <div className={['cd-page-shell__content', contentClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </Element>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  leadingIcon,
  className = '',
  ...props
}: HeaderProps & HTMLAttributes<HTMLElement>) {
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
}: HeaderProps & HTMLAttributes<HTMLElement>) {
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

interface GridProps extends AsProps, HTMLAttributes<HTMLElement> {
  variant?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardGrid({ children, variant = 'cards', className = '', as: Element = 'div', ...props }: GridProps) {
  return (
    <Element
      className={['cd-dashboard-grid', `cd-dashboard-grid--${variant}`, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Element>
  );
}

interface StackProps extends AsProps, HTMLAttributes<HTMLElement> {
  density?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageStack({ children, density = 'standard', className = '', as: Element = 'div', ...props }: StackProps) {
  return (
    <Element className={['cd-page-stack', `cd-page-stack--${density}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  leadingIcon,
  children,
  className = '',
  as: Element = 'section',
  ...props
}: HeaderProps & HTMLAttributes<HTMLElement>) {
  return (
    <Element className={['cd-hero-panel', className].filter(Boolean).join(' ')} {...props}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        titleId={titleId}
        description={description}
        actions={actions}
        leadingIcon={leadingIcon}
      />
      {children ? <div className="cd-hero-panel__content">{children}</div> : null}
    </Element>
  );
}

interface ToneProps extends AsProps, HTMLAttributes<HTMLElement> {
  tone?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Surface({ children, tone = 'default', className = '', as: Element = 'div', ...props }: ToneProps) {
  return (
    <Element className={['cd-surface', `cd-surface--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  );
}

interface ActionRowProps extends AsProps, HTMLAttributes<HTMLElement> {
  align?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ActionRow({ children, align = 'start', className = '', as: Element = 'div', ...props }: ActionRowProps) {
  return (
    <Element className={['cd-action-row', `cd-action-row--${align}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  );
}

interface RatioProps extends AsProps, HTMLAttributes<HTMLElement> {
  ratio?: string;
  children?: React.ReactNode;
  className?: string;
}

export function WorkspaceSplit({ children, ratio = 'balanced', className = '', as: Element = 'div', ...props }: RatioProps) {
  return (
    <Element className={['cd-workspace-split', `cd-workspace-split--${ratio}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  );
}

interface RailProps extends AsProps, HTMLAttributes<HTMLElement> {
  sticky?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function DetailRail({ children, sticky = false, className = '', as: Element = 'aside', ...props }: RailProps) {
  return (
    <Element className={['cd-detail-rail', sticky ? 'cd-detail-rail--sticky' : '', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  );
}

interface CanvasProps extends AsProps, HTMLAttributes<HTMLElement> {
  minWidth?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function OverflowCanvas({ children, minWidth, className = '', as: Element = 'div', ...props }: CanvasProps) {
  const style = minWidth
    ? ({ '--cd-overflow-canvas-min-width': minWidth, ...props.style } as React.CSSProperties)
    : props.style;
  return (
    <Element {...props} className={['cd-overflow-canvas', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </Element>
  );
}

interface MetricChipProps extends HTMLAttributes<HTMLSpanElement> {
  label?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}

export function MetricChip({ label, value, title = undefined, className = '', ...props }: MetricChipProps) {
  return (
    <span
      className={['cd-metric-chip', className].filter(Boolean).join(' ')}
      title={title || (label && value !== undefined ? `${value} ${label}` : undefined)}
      {...props}
    >
      {value !== undefined && value !== null ? (
        <span className="cd-metric-chip__value">{value}</span>
      ) : null}
      {label ? <span className="cd-metric-chip__label">{label}</span> : null}
    </span>
  );
}

export function SurfaceCard({ children, tone = 'default', padding = 'standard', className = '', as: Element = 'div', ...props }: ToneProps & { padding?: string }) {
  return (
    <Element
      className={['cd-surface-card', `cd-surface-card--${tone}`, `cd-surface-card--${padding}`, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Element>
  );
}

interface MetricCardProps {
  label?: React.ReactNode;
  value?: React.ReactNode;
  helper?: React.ReactNode;
  suffix?: string;
  tone?: string;
  className?: string;
  [key: string]: unknown;
}

export function MetricCard({ label, value, helper, suffix = '', tone = 'neutral', className = '', ...props }: MetricCardProps) {
  return (
    <Card compact className={['cd-metric-card', `cd-metric-card--${tone}`, className].filter(Boolean).join(' ')} {...(props as HTMLAttributes<HTMLDivElement>)}>
      <span className="cd-metric-card__label">{label}</span>
      <strong className="cd-metric-card__value">
        {value}
        {suffix}
      </strong>
      {helper ? <span className="cd-metric-card__helper">{helper}</span> : null}
    </Card>
  );
}

interface DashboardCardProps {
  title?: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function DashboardCard({ title, value, description, meta, actions, children, className = '', ...props }: DashboardCardProps) {
  return (
    <Card compact className={['cd-dashboard-card', className].filter(Boolean).join(' ')} {...(props as HTMLAttributes<HTMLDivElement>)}>
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

interface InsightCardProps extends AsProps {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
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
}: InsightCardProps) {
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

interface ToolCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function ToolCard({ title, description, badge, meta, actions, children, className = '', ...props }: ToolCardProps) {
  return (
    <Card compact hover className={['cd-tool-card', className].filter(Boolean).join(' ')} {...(props as HTMLAttributes<HTMLDivElement>)}>
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

interface StatusWidgetProps {
  label?: React.ReactNode;
  value?: React.ReactNode;
  status?: string;
  helper?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function StatusWidget({ label, value, status = 'neutral', helper, className = '', ...props }: StatusWidgetProps) {
  return (
    <Card compact className={['cd-status-widget', `cd-status-widget--${status}`, className].filter(Boolean).join(' ')} {...(props as HTMLAttributes<HTMLDivElement>)}>
      <div className="cd-status-widget__header">
        <span>{label}</span>
        <StatusBadge status={status} />
      </div>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </Card>
  );
}

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: string;
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status = 'neutral', children, className = '', ...props }: StatusBadgeProps) {
  const toneByStatus: Record<string, string> = {
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

interface BadgeListProps {
  items?: string[];
  tone?: string;
  className?: string;
  itemClassName?: string;
  empty?: React.ReactNode;
}

export function BadgeList({ items = [] as any[], tone = 'neutral', className = '', itemClassName = '', empty = null }: BadgeListProps) {
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

interface InfoNoticeProps extends HTMLAttributes<HTMLElement> {
  label?: React.ReactNode;
  detail?: React.ReactNode;
  tone?: string;
  children?: React.ReactNode;
  className?: string;
}

export function InfoNotice({ label, detail, children, tone = 'info', className = '', ...props }: InfoNoticeProps) {
  return (
    <aside className={['cd-info-notice', `cd-info-notice--${tone}`, className].filter(Boolean).join(' ')} role="note" {...props}>
      {label ? <strong>{label}</strong> : null}
      {detail ? <span>{detail}</span> : null}
      {children}
    </aside>
  );
}

interface FormFieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function FormField({ label, children, className = '', ...props }: FormFieldProps) {
  return (
    <label className={['cd-form-field', className].filter(Boolean).join(' ')} {...props}>
      <span>{label}</span>
      {children}
    </label>
  );
}

interface FilterPanelProps extends HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
}

export function FilterPanel({ children, className = '', ...props }: FilterPanelProps) {
  return (
    <section className={['cd-filter-panel', className].filter(Boolean).join(' ')} aria-label="Filters" {...props}>
      {children}
    </section>
  );
}

interface DataTableColumn {
  key?: string;
  header?: React.ReactNode;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  columns?: DataTableColumn[];
  rows?: Record<string, unknown>[];
  getRowKey?: (row: Record<string, unknown>, index: number) => React.Key;
  empty?: React.ReactNode;
  className?: string;
}

export function DataTable({ columns = [] as any[], rows = [] as any[], getRowKey, empty = 'No rows available.', className = '', ...props }: DataTableProps) {
  return (
    <div className={['cd-table-wrap', className].filter(Boolean).join(' ')}>
      <table className="cd-data-table" {...props}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key || column.header)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={getRowKey ? getRowKey(row, index) : (row.id as React.Key) || index}>
                {columns.map((column) => (
                  <td key={String(column.key || column.header)}>
                    {column.render ? column.render(row) : column.key ? String(row[column.key] ?? '') : null}
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

interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: React.ReactNode;
  className?: string;
}

export function LoadingState({ title = 'Loading', description, className = '', ...props }: LoadingStateProps) {
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

interface UnsupportedStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function UnsupportedState({
  title = 'Unsupported in this environment',
  description = 'This capability is not available from the current workspace, role, or backend configuration.',
  action,
  className = '',
  ...props
}: UnsupportedStateProps) {
  return (
    <div className={['cd-state cd-state--unsupported', className].filter(Boolean).join(' ')} role="status" {...props}>
      <StatusBadge status="unsupported">Unsupported</StatusBadge>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="cd-state__action">{action}</div> : null}
    </div>
  );
}
