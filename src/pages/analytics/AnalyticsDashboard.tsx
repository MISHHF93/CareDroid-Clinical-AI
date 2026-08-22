import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildPlatformAnalytics } from '../../data/platformAnalytics';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildPlatformAdoptionTrendChart,
  buildPlatformDecisionChart,
  buildPlatformEventTypeChart,
  decisionTone,
} from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './AnalyticsDashboard.css';

const PLATFORM_ANALYTICS_ROUTE_CHROME = Object.freeze({
  title: 'Platform Analytics',
  subtitle: 'Privacy-safe adoption trends, feature engagement, and inventory stewardship decisions.',
});

export default function AnalyticsDashboard() {
  // AppShell's ShellRouteTab already renders a real page-level <h1> for this
  // route; this page also rendered its own <h1>, a duplicate-heading bug.
  useRouteChromeRegistration(PLATFORM_ANALYTICS_ROUTE_CHROME);
  const analytics = useMemo(() => buildPlatformAnalytics(), []);
  const trendChart = useMemo(() => buildPlatformAdoptionTrendChart(analytics), [analytics]);
  const eventChart = useMemo(() => buildPlatformEventTypeChart(analytics), [analytics]);
  const decisionChart = useMemo(() => buildPlatformDecisionChart(analytics), [analytics]);

  return (
    <main className="platform-analytics-page" aria-label="Platform analytics dashboard">
      <header className="platform-analytics-page__header">
        <div className="platform-analytics-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="platform-analytics-page__title-text" data-testid="cd-page-title-text">Platform Analytics</p>
            <p>Privacy-safe adoption trends, feature engagement, and inventory stewardship decisions.</p>
          </div>
        </div>
        <div className="platform-analytics-page__actions">
          <Link to={CANONICAL_ROUTES.discover}>Discover capabilities</Link>
          <Link to={CANONICAL_ROUTES.plugins}>Plugin marketplace</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to="/costs">Cost analytics</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Platform analytics source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]}
        details="Aggregated demo telemetry with PHI and identifiers stripped. Falls back to local inventory when backend metrics are unavailable."
      />

      <div className="platform-analytics-page__metrics" role="group" aria-label="Platform analytics summary metrics">
        <MetricCard
          label="Total events"
          value={String(analytics.summary.totalEvents)}
          hint="Privacy-safe aggregate count"
          tone="neutral"
        />
        <MetricCard
          label="Tracked tools"
          value={String(analytics.summary.trackedTools)}
          hint={`${analytics.summary.inventoryTools} in inventory`}
          tone="neutral"
        />
        <MetricCard
          label="Orphan tools"
          value={String(analytics.summary.orphanToolCount)}
          hint="No recent usage signal"
          tone={analytics.summary.orphanToolCount > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Search activity"
          value={String(analytics.summary.searchEvents)}
          hint="Catalog and tool discovery searches"
          tone="neutral"
        />
      </div>

      <div className="platform-analytics-page__charts">
        <VisualizationPanel
          title="Adoption trend"
          description="Daily aggregate usage across calculators, AI launches, simulations, and dashboards."
          badge="Trend"
        >
          <CategoryBarChart
            data={trendChart}
            title="Adoption trend"
            color="var(--app-chart-1)"
            emptyMessage="Trend chart appears when telemetry events are recorded."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Feature engagement"
          description="Event-type distribution for platform capability usage."
          badge="Engagement"
        >
          <CategoryBarChart
            data={eventChart}
            title="Feature engagement"
            color="var(--app-chart-4)"
            emptyMessage="Engagement chart appears when telemetry events are recorded."
          />
        </VisualizationPanel>
      </div>

      <section className="platform-analytics-page__panel" aria-label="Top used tools">
        <h2>Top used tools</h2>
        <p>Promote, improve, merge, hide, or monitor recommendations derived from median usage.</p>
        <div className="platform-analytics-page__table" role="table" aria-label="Top used tools table">
          <div className="platform-analytics-page__table-head" role="row">
            <span role="columnheader">Tool</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Usage</span>
            <span role="columnheader">Decision</span>
          </div>
          {analytics.topUsed.map((row) => {
            const decision = analytics.decisions.find((item) => item.toolId === row.toolId)?.decision || 'monitor';
            return (
              <div key={row.toolId} className="platform-analytics-page__table-row" role="row">
                <span role="cell">{row.name}</span>
                <span role="cell">{row.category}</span>
                <span role="cell">{row.usage}</span>
                <span
                  role="cell"
                  className={`platform-analytics-page__pill platform-analytics-page__pill--${decisionTone(decision)}`}
                >
                  {decision}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="platform-analytics-page__panel" aria-label="Stewardship decisions">
        <h2>Decision mix</h2>
        <CategoryBarChart
          data={decisionChart}
          title="Decision mix"
          color="var(--app-chart-2)"
          emptyMessage="Decision chart appears when inventory tools are evaluated."
        />
      </section>
    </main>
  );
}