/**
 * Recharts-backed dashboard charts (Cycle 68).
 * Keep heavy chart library out of MetricCard / VisualizationPanel importers —
 * import charts from this module (or lazy-load) rather than DashboardVisualizations.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_COLORS,
  ChartErrorState,
  ChartLoadingState,
  EmptyChartState,
} from './DashboardVisualizations';
import './DashboardVisualizations.css';

const AXIS_TICK = Object.freeze({ fill: 'var(--app-fg-muted)', fontSize: 12 });
const TOOLTIP_STYLE = Object.freeze({
  background: 'var(--app-surface-elevated)',
  border: '1px solid var(--app-panel-border)',
  borderRadius: 12,
  color: 'var(--app-fg)',
});

function isNonEmptyData(data) {
  return Array.isArray(data) && data.length > 0;
}

export function TrendChart({
  data,
  title = 'Trend chart',
  dataKey = 'value',
  xKey = 'label',
  color = CHART_COLORS[0],
  loading = false,
  error = '',
  emptyMessage = 'No trend data available.',
}) {
  if (loading) return <ChartLoadingState label={`Loading ${title}`} />;
  if (error) return <ChartErrorState message={error} />;
  if (!isNonEmptyData(data)) return <EmptyChartState message={emptyMessage} />;

  return (
    <div className="dashboard-chart" role="img" aria-label={title} data-testid="trend-chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 14, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="var(--app-panel-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={10} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBarChart({
  data,
  title = 'Category bar chart',
  dataKey = 'value',
  xKey = 'name',
  color = CHART_COLORS[0],
  loading = false,
  error = '',
  emptyMessage = 'No category data available.',
}) {
  if (loading) return <ChartLoadingState label={`Loading ${title}`} />;
  if (error) return <ChartErrorState message={error} />;
  if (!isNonEmptyData(data)) return <EmptyChartState message={emptyMessage} />;

  return (
    <div className="dashboard-chart" role="img" aria-label={title} data-testid="category-bar-chart">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 12, bottom: 22, left: 0 }}>
          <CartesianGrid stroke="var(--app-panel-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={58}
          />
          <YAxis tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} width={34} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionDonutChart({
  data,
  title = 'Distribution chart',
  dataKey = 'value',
  nameKey = 'name',
  loading = false,
  error = '',
  emptyMessage = 'No distribution data available.',
}) {
  if (loading) return <ChartLoadingState label={`Loading ${title}`} />;
  if (error) return <ChartErrorState message={error} />;
  if (!isNonEmptyData(data)) return <EmptyChartState message={emptyMessage} />;

  return (
    <div className="dashboard-donut-wrap" role="img" aria-label={title} data-testid="distribution-donut-chart">
      <div className="dashboard-chart dashboard-chart--donut">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius="54%" outerRadius="78%" paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell
                  key={entry[nameKey] || index}
                  fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="dashboard-chart-legend" aria-label={`${title} legend`}>
        {data.map((entry, index) => (
          <span key={entry[nameKey] || index}>
            <i
              className="dashboard-chart-legend__swatch"
              style={{ background: entry.color || CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden
            />
            {entry[nameKey]}: {entry[dataKey]}
          </span>
        ))}
      </div>
    </div>
  );
}
