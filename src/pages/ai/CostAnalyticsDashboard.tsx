import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { LOCAL_COST_DASHBOARD } from '../../services/aiCommandCenterApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildCostRouteChart } from '../../utils/clinicalInsightsChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './CostAnalyticsDashboard.css';

const COST_ANALYTICS_ROUTE_CHROME = Object.freeze({
  title: 'Cost Analytics',
  subtitle: 'Request spend, token cost, cache efficiency, and route complexity for AI operations review.',
});

export default function CostAnalyticsDashboard() {
  // AppShell's ShellRouteTab already renders a real page-level <h1> for this
  // route; this page also rendered its own <h1>, a duplicate-heading bug.
  useRouteChromeRegistration(COST_ANALYTICS_ROUTE_CHROME);
  const cost = LOCAL_COST_DASHBOARD;
  const routeChart = useMemo(() => buildCostRouteChart(), []);
  const complexityChart = useMemo(
    () =>
      Object.entries(cost.complexityCounts).map(([name, value]) => ({
        name,
        value,
      })),
    [cost.complexityCounts],
  );

  return (
    <main className="cost-page" aria-label="Cost analytics dashboard">
      <header className="cost-page__header">
        <div className="cost-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="cost-page__title-text" data-testid="cd-page-title-text">Cost Analytics</p>
            <p>Request spend, token cost, cache efficiency, and route complexity for AI operations review.</p>
          </div>
        </div>
        <div className="cost-page__actions">
          <Link to="/memory">Memory dashboard</Link>
          <Link to={CANONICAL_ROUTES.aiEvaluation}>AI evaluation</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Cost analytics source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]}
        details="Demo cost optimizer snapshot — falls back when backend cost API is disabled or unavailable."
      />

      <div className="cost-page__metrics" role="group" aria-label="Cost summary metrics">
        <MetricCard
          label="Total spend"
          value={`$${cost.requestCost.totalUsd.toFixed(2)}`}
          hint="Demo request cost total"
          tone="neutral"
        />
        <MetricCard
          label="Avg request"
          value={`$${cost.requestCost.averageUsd.toFixed(3)}`}
          hint="Per-request average"
          tone="neutral"
        />
        <MetricCard
          label="Cache hit rate"
          value={`${Math.round(cost.cache.hitRate * 100)}%`}
          hint={`${cost.cache.hits} hits / ${cost.cache.misses} misses`}
          tone={cost.cache.hitRate >= 0.4 ? 'good' : 'warning'}
        />
        <MetricCard label="Requests" value={String(cost.totalRequests)} hint="Tracked demo requests" tone="neutral" />
      </div>

      <div className="cost-page__charts">
        <VisualizationPanel title="Route mix" description="Demo AI route distribution by execution path." badge="Routes">
          <CategoryBarChart
            data={routeChart}
            title="Route mix"
            color="var(--app-chart-1)"
            emptyMessage="Route chart appears when cost telemetry is available."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Complexity mix" description="Simple, medium, and complex request distribution." badge="Complexity">
          <CategoryBarChart
            data={complexityChart}
            title="Complexity mix"
            color="var(--app-chart-4)"
            emptyMessage="Complexity chart appears when cost telemetry is available."
          />
        </VisualizationPanel>
      </div>

      <section className="cost-page__panel" aria-label="Token cost summary">
        <h2>Token cost</h2>
        <p>
          Last ${cost.tokenCost.lastUsd.toFixed(3)} · Total ${cost.tokenCost.totalUsd.toFixed(2)} · Average $
          {cost.tokenCost.averageUsd.toFixed(3)}
        </p>
      </section>
    </main>
  );
}