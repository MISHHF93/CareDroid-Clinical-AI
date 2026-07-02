import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildDependencyMap } from '../../data/dependencyMap';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildDependencyExecutorChart,
  buildDependencyIssueChart,
  dependencyIssueTone,
} from '../../utils/platformSaasChartModel';
import './DependencyMap.css';

export default function DependencyMap() {
  const map = useMemo(() => buildDependencyMap(), []);
  const issueChart = useMemo(() => buildDependencyIssueChart(map.issueCounts), [map.issueCounts]);
  const executorChart = useMemo(() => buildDependencyExecutorChart(map.dependencies), [map.dependencies]);

  return (
    <main className="dependency-map-page" aria-label="Platform wiring map">
      <header className="dependency-map-page__header">
        <div className="dependency-map-page__title-row">
          <GraphicIconBadge iconKey="route" accent="brand" size="md" />
          <div>
            <h1>Platform Wiring Map</h1>
            <p>Route, inventory, API client, backend endpoint, service, and executor dependency chains.</p>
          </div>
        </div>
        <div className="dependency-map-page__actions">
          <Link to={CANONICAL_ROUTES.dependencyGraph}>Asset dependency graph</Link>
          <Link to={CANONICAL_ROUTES.selfDiagnostics}>Self-diagnostics</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Dependency map source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]}
        details="Derived from canonical tool inventory, frontend API call inventory, and backend HTTP route inventory."
      />

      <div className="dependency-map-page__metrics" role="group" aria-label="Dependency map summary metrics">
        <MetricCard label="Dependencies" value={String(map.summary.dependencies)} hint="Inventory wiring rows" tone="neutral" />
        <MetricCard label="Routes" value={String(map.summary.routes)} hint="Canonical route nodes" tone="neutral" />
        <MetricCard label="Backend endpoints" value={String(map.summary.backendEndpoints)} hint="HTTP route inventory" tone="neutral" />
        <MetricCard
          label="Issues"
          value={String(map.summary.issues)}
          hint="Orphan, broken, duplicate signals"
          tone={map.summary.issues > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="dependency-map-page__charts">
        <VisualizationPanel
          title="Issue mix"
          description="Orphan UI, orphan backend, broken, and duplicate dependency detections."
          badge="Issues"
        >
          <CategoryBarChart
            data={issueChart}
            title="Issue mix"
            color="var(--app-chart-1)"
            emptyMessage="Issue chart appears when dependency analysis runs."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Executor coverage"
          description="Registered executors and platform capabilities across dependency rows."
          badge="Executors"
        >
          <CategoryBarChart
            data={executorChart}
            title="Executor coverage"
            color="var(--app-chart-4)"
            emptyMessage="Executor chart appears when dependencies are mapped."
          />
        </VisualizationPanel>
      </div>

      <section className="dependency-map-page__panel" aria-label="Dependency issues">
        <h2>Detected issues</h2>
        <p>Contract drift signals for UI routes, backend endpoints, and duplicate wiring rows.</p>
        <div className="dependency-map-page__issues">
          {map.issues.slice(0, 12).map((issue) => (
            <article key={issue.id} className="dependency-map-page__issue">
              <span className={`dependency-map-page__pill dependency-map-page__pill--${dependencyIssueTone(issue.severity)}`}>
                {issue.type.replace(/-/g, ' ')}
              </span>
              <strong>{issue.title}</strong>
              <p>{issue.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dependency-map-page__panel" aria-label="Wired dependencies">
        <h2>Wired dependencies</h2>
        <div className="dependency-map-page__table" role="table" aria-label="Wired dependencies table">
          <div className="dependency-map-page__table-head" role="row">
            <span role="columnheader">Capability</span>
            <span role="columnheader">Route</span>
            <span role="columnheader">API</span>
            <span role="columnheader">Backend</span>
            <span role="columnheader">Status</span>
          </div>
          {map.dependencies.slice(0, 16).map((row) => (
            <div key={row.id} className="dependency-map-page__table-row" role="row">
              <span role="cell">{row.displayName}</span>
              <span role="cell">{row.frontendRoute || '—'}</span>
              <span role="cell">{row.apiClient}</span>
              <span role="cell">{row.backendEndpoint}</span>
              <span role="cell">{row.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}