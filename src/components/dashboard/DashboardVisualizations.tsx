/**
 * Lightweight dashboard visualization primitives (no recharts).
 * Chart components live in DashboardCharts.tsx so MetricCard importers do not
 * pull the ~vendor-charts bundle onto every operations surface (Cycle 68).
 */
import { MetricCard as CanonicalMetricCard } from '../ui/CareDroidPrimitives';
import './DashboardVisualizations.css';

export const CHART_COLORS = Object.freeze([
  'var(--app-chart-1)',
  'var(--app-chart-2)',
  'var(--app-chart-3)',
  'var(--app-chart-4)',
  'var(--app-chart-5)',
  'var(--app-chart-2)',
  'var(--app-chart-6)',
]);

export function ChartLoadingState({ label = 'Loading chart data' }) {
  return (
    <div className="dashboard-chart-state dashboard-chart-state--loading" role="status" aria-busy="true">
      {label}
    </div>
  );
}

export function ChartErrorState({ message = 'Unable to load chart data.' }) {
  return (
    <div className="dashboard-chart-state dashboard-chart-state--error" role="alert">
      {message}
    </div>
  );
}

export function EmptyChartState({ message = 'No chart data available.' }) {
  return (
    <div className="dashboard-chart-state" role="status">
      {message}
    </div>
  );
}

/**
 * Delegates to the canonical CareDroidPrimitives MetricCard (Cycle 148 design-
 * system audit found this file's own reimplementation was a competing
 * duplicate with ~46 call sites, none of which got the real tone/severity
 * badge system) rather than every consumer migrating to a new import path.
 * Same external prop contract as before (`hint`, not `helper`) and the same
 * accessible name, so every existing call site renders unchanged except for
 * now picking up the canonical alarm-surface tone styling and severity badge.
 */
export function MetricCard({ label, value, hint, tone = 'neutral' }) {
  return (
    <CanonicalMetricCard
      label={label}
      value={value}
      helper={hint}
      tone={tone}
      aria-label={`${label}: ${value}`}
    />
  );
}

export function StatusCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`dashboard-status-card dashboard-status-card--${tone}`}>
      <span className="dashboard-status-card__label">{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function VisualizationPanel({ title, description, children, badge }) {
  return (
    <section
      className="dashboard-visual-panel"
      aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-viz-title`}
    >
      <div className="dashboard-visual-panel__header">
        <div>
          <h3 id={`${title.replace(/\W+/g, '-').toLowerCase()}-viz-title`}>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {badge ? <span className="dashboard-visual-panel__badge">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function MiniSparkline({ points, label = 'Mini trend', color = CHART_COLORS[1] }) {
  const values = Array.isArray(points) && points.length > 0 ? points : [0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / span) * 30;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className="dashboard-mini-sparkline"
      viewBox="0 0 100 40"
      role="img"
      aria-label={label}
      style={{ color }}
    >
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

