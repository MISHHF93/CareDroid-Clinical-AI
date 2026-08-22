import React, { HTMLAttributes, LabelHTMLAttributes, TableHTMLAttributes, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CDL_PAGE_ZONES, type CdlPageZoneId } from '../../config/designSystem';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import {
  alarmKpiClassNames,
  alarmSeverityAriaLabel,
  alarmSeverityBadge,
  alarmSurfaceClassNames,
  resolveAlarmSeverity,
} from '../../config/alarmVisualModel';
import Badge from './Badge';
import Card from './card';
import PageHeader from './PageHeader';
import { Spinner } from './Spinner';
import '../../styles/alarm-system.css';
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
  suppressHeader?: boolean;
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
  suppressHeader = false,
  as: Element = 'section',
  ...props
}: HeaderProps & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <Element className={['cd-page-shell', className].filter(Boolean).join(' ')} {...props}>
      {!suppressHeader ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          titleId={titleId}
          description={description || subtitle}
          actions={actions}
          leadingIcon={leadingIcon}
          className={headerClassName}
        >
          {null}
        </PageHeader>
      ) : title ? (
        <h1 id={titleId} className="sr-only">
          {title}
        </h1>
      ) : null}
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

/** CDL responsive grid — metrics, cards, split, tools presets. */
export function OperationalGrid({
  children,
  variant = 'cards',
  className = '',
  as: Element = 'div',
  ...props
}: GridProps) {
  return (
    <Element
      className={['cdl-grid', `cdl-grid--${variant}`, className].filter(Boolean).join(' ')}
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
  /** Platform alarm tone — drives visual alarming (critical/warning/…). */
  tone?: string;
  className?: string;
}

export function MetricChip({
  label,
  value,
  tone = 'neutral',
  title = undefined,
  className = '',
  ...props
}: MetricChipProps) {
  const severity = resolveAlarmSeverity(tone);
  const badge = alarmSeverityBadge(severity);
  return (
    <span
      className={['cd-metric-chip', alarmKpiClassNames(tone, { size: 'sm' }), className]
        .filter(Boolean)
        .join(' ')}
      data-alarm={severity}
      data-tone={tone}
      title={
        title ||
        (label && value !== undefined
          ? `${value} ${label}${badge ? ` (${badge})` : ''}`
          : undefined)
      }
      aria-label={
        label && value !== undefined
          ? [String(label), String(value), alarmSeverityAriaLabel(severity)]
              .filter(Boolean)
              .join(', ')
          : undefined
      }
      {...props}
    >
      {value !== undefined && value !== null ? (
        <span className="cd-metric-chip__value alarm-kpi__value">{value}</span>
      ) : null}
      {label ? (
        <span className="cd-metric-chip__label alarm-kpi__label">
          <span className="alarm-kpi__label-text">{label}</span>
          {badge ? <span className="alarm-kpi__badge">{badge}</span> : null}
        </span>
      ) : null}
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
  const severity = resolveAlarmSeverity(tone);
  const badge = alarmSeverityBadge(severity);
  return (
    <Card
      compact
      className={[
        'cd-metric-card',
        `cd-metric-card--${tone}`,
        alarmSurfaceClassNames(tone),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-alarm={severity}
      data-tone={tone}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
      <span className="cd-metric-card__label">
        {label}
        {badge ? <span className="alarm-kpi__badge alarm-kpi__badge--inline">{badge}</span> : null}
      </span>
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
  const severity = resolveAlarmSeverity(status);
  return (
    <Card
      compact
      className={[
        'cd-status-widget',
        `cd-status-widget--${status}`,
        alarmSurfaceClassNames(status),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-alarm={severity}
      data-tone={status}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
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

export type OperationalPageZones = {
  operationalSummary?: React.ReactNode;
  primaryActions?: React.ReactNode;
  activeWork?: React.ReactNode;
  supportingContext?: React.ReactNode;
  analytics?: React.ReactNode;
  history?: React.ReactNode;
};

interface OperationalZoneProps {
  zoneId: CdlPageZoneId;
  children?: React.ReactNode;
  showLabel?: boolean;
  className?: string;
}

export function OperationalZone({
  zoneId,
  children,
  showLabel = false,
  className = '',
}: OperationalZoneProps) {
  if (children == null || children === false) return null;
  const zone = CDL_PAGE_ZONES[zoneId];
  return (
    <section
      className={[zone.className, className].filter(Boolean).join(' ')}
      aria-label={zone.label}
      data-cdl-zone={zone.id}
    >
      {showLabel ? <p className="cdl-zone__label">{zone.label}</p> : null}
      {children}
    </section>
  );
}

interface OperationalPageTemplateProps extends HTMLAttributes<HTMLDivElement> {
  zones?: OperationalPageZones;
  children?: React.ReactNode;
  showZoneLabels?: boolean;
  className?: string;
}

/**
 * Canonical ED OS page composition — identity lives in PageShell; zones answer operational questions.
 */
interface CareDroidPageProps extends HeaderProps, Omit<HTMLAttributes<HTMLElement>, 'title'> {
  zones?: OperationalPageZones;
  showZoneLabels?: boolean;
  /**
   * HEAL-185: when true (default), this instance IS the routed page — it registers its
   * title/subtitle/actions with the shell's single RouteChrome slot (AppShell's ShellRouteTab)
   * and suppresses its own visible header, so there's exactly one real <h1> per page instead of
   * 2 (this component's own PageHeader h1 AND ShellRouteTab's shell-level h1 — the same app-wide
   * a11y bug HEAL-169 already fixed for the 8 PlatformGovernanceWorkspace routes, confirmed via
   * a fresh audit to still be live on ~36 other pages that route through this component,
   * directly or via ToolPageLayout.tsx). Set to false ONLY when this instance is embedded as a
   * sub-component inside another page that is ITSELF the real routed page (verified exhaustively
   * for every current consumer: ToolPageLayout.tsx passes `!embedded`) -- registering from a
   * nested instance would clobber the real page's shell title, and unmounting would wipe it via
   * clearChrome() with no automatic re-registration (RouteChromeReset only fires on pathname
   * change, and these embeds are query-param-driven). When false, keeps rendering its own
   * visible header instead of suppressing it, since there's no shell-chrome slot available to
   * carry the title in that context.
   */
  registerRouteChrome?: boolean;
}

/**
 * Canonical non-emergency page shell — PageShell identity + CDL zone composition.
 */
export function CareDroidPage({
  zones,
  showZoneLabels = false,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  registerRouteChrome = true,
  eyebrow,
  title,
  titleId,
  description,
  subtitle,
  actions,
  leadingIcon,
  suppressHeader: _suppressHeaderIgnored,
  ...shellProps
}: CareDroidPageProps) {
  const routeChrome = useMemo(
    () => (registerRouteChrome ? { title, subtitle: description ?? subtitle, actions } : null),
    [actions, description, registerRouteChrome, subtitle, title],
  );
  // HEAL-185: suppressing the visible header must depend on registration actually SUCCEEDING
  // (a real RouteChromeProvider being present), not just on the caller requesting it -- outside
  // a provider (isolated unit tests that predate this hook's use here) useRouteChromeRegistration
  // silently no-ops, and blindly suppressing anyway would drop the title/actions from the render
  // tree entirely with nowhere for them to go.
  const chromeRegistered = useRouteChromeRegistration(routeChrome);
  const suppressHeader = registerRouteChrome && chromeRegistered;
  // PageShell's own suppressHeader branch renders a visually-hidden (sr-only) <h1> when given a
  // `title` -- fine in isolation, but once the shell's REAL h1 (ShellRouteTab) is ALSO carrying
  // this exact title, that leaves 2 real elements in the accessibility tree with the identical
  // heading role/name (screen readers would announce "Integration Hub, heading" twice
  // navigating by headings, and getByRole('heading', {name...}) queries fail on the ambiguity --
  // caught by canonicalRouteTree.redirects.test.tsx). So `title` is withheld from PageShell here
  // to suppress that duplicate heading. But dropping the title from the DOM entirely also isn't
  // safe: it relies on SOME OTHER component actually rendering ShellRouteTab wherever this page
  // mounts, which doesn't hold for every test harness that provides RouteChromeProvider without
  // also mounting the shell (caught by routePagesSmoke.test.tsx -- registration "succeeded" by
  // this hook's own definition, but nothing consumed it, so the title vanished from the render
  // tree altogether). PlatformGovernanceWorkspace (HEAL-169) already solved exactly this: keep a
  // real, always-rendered plain-text copy of the title (a <p>, not a heading) regardless of
  // whether registration/shell-rendering actually happens elsewhere -- mirrored below.
  const pageShellTitle = suppressHeader ? undefined : title;

  return (
    <>
      {suppressHeader && title ? (
        <p className="sr-only cd-page-shell__title-text" data-testid="cd-page-title-text">
          {title}
        </p>
      ) : null}
      <PageShell
        {...shellProps}
        eyebrow={eyebrow}
        title={pageShellTitle}
        titleId={suppressHeader ? undefined : titleId}
        description={description}
        subtitle={subtitle}
        actions={actions}
        leadingIcon={leadingIcon}
        suppressHeader={suppressHeader}
        className={['cd-page-shell', className].filter(Boolean).join(' ')}
        headerClassName={['cdl-zone cdl-zone--identity', headerClassName].filter(Boolean).join(' ')}
        contentClassName={['cd-page-shell__content', contentClassName].filter(Boolean).join(' ')}
      >
        <OperationalPageTemplate zones={zones} showZoneLabels={showZoneLabels}>
          {children}
        </OperationalPageTemplate>
      </PageShell>
    </>
  );
}

interface PublicPageTemplateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  backHref?: string;
  className?: string;
  contentClassName?: string;
}

/**
 * Outside-shell public pages (legal, help, version) — CDL identity + operational content zones.
 */
export function PublicPageTemplate({
  title,
  eyebrow,
  description,
  children,
  backHref,
  className = '',
  contentClassName = '',
  ...props
}: PublicPageTemplateProps) {
  const navigate = useNavigate();

  return (
    <div className={['cdl-public-page', className].filter(Boolean).join(' ')} {...props}>
      <div className="cdl-public-page__container">
        <header className="cdl-public-page__identity cdl-zone cdl-zone--identity">
          {backHref ? (
            <Link className="cdl-public-page__back" to={backHref}>
              ← Back
            </Link>
          ) : (
            <button type="button" className="cdl-public-page__back" onClick={() => navigate(-1)}>
              ← Back
            </button>
          )}
          {eyebrow ? <p className="cdl-public-page__eyebrow">{eyebrow}</p> : null}
          <h1 className="cdl-public-page__title">{title}</h1>
          {description ? <p className="cdl-public-page__description">{description}</p> : null}
        </header>
        <div
          className={['cdl-operational-page', 'cdl-public-page__content', contentClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function OperationalPageTemplate({
  zones = {},
  children,
  showZoneLabels = false,
  className = '',
  ...props
}: OperationalPageTemplateProps) {
  const activeWork = zones.activeWork ?? children;
  return (
    <div className={['cdl-operational-page', className].filter(Boolean).join(' ')} {...props}>
      <OperationalZone zoneId="operationalSummary" showLabel={showZoneLabels}>
        {zones.operationalSummary}
      </OperationalZone>
      <OperationalZone zoneId="primaryActions" showLabel={showZoneLabels}>
        {zones.primaryActions}
      </OperationalZone>
      <OperationalZone zoneId="activeWork" showLabel={showZoneLabels}>
        {activeWork}
      </OperationalZone>
      <OperationalZone zoneId="supportingContext" showLabel={showZoneLabels}>
        {zones.supportingContext}
      </OperationalZone>
      <OperationalZone zoneId="analytics" showLabel={showZoneLabels}>
        {zones.analytics}
      </OperationalZone>
      <OperationalZone zoneId="history" showLabel={showZoneLabels}>
        {zones.history}
      </OperationalZone>
    </div>
  );
}
