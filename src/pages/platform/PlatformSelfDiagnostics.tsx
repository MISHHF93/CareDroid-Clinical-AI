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
import { buildPlatformSelfDiagnostics } from '../../data/platformSelfDiagnostics';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildDiagnosticsCategoryChart,
  buildDiagnosticsStatusChart,
  diagnosticStatusTone,
} from '../../utils/platformSaasChartModel';
import './PlatformSelfDiagnostics.css';

export default function PlatformSelfDiagnostics() {
  const diagnostics = useMemo(() => buildPlatformSelfDiagnostics(), []);
  const categoryChart = useMemo(
    () => buildDiagnosticsCategoryChart(diagnostics.summary.categories),
    [diagnostics.summary.categories],
  );
  const statusChart = useMemo(() => buildDiagnosticsStatusChart(diagnostics.summary), [diagnostics.summary]);

  return (
    <main className="self-diagnostics-page" aria-label="Platform self-diagnostics">
      <header className="self-diagnostics-page__header">
        <div className="self-diagnostics-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <h1>Platform Self-Diagnostics</h1>
            <p>Route, API, inventory, auth, layout, dependency, executor, and asset health checks.</p>
          </div>
        </div>
        <div className="self-diagnostics-page__actions">
          <Link to={CANONICAL_ROUTES.dependencyMap}>Wiring map</Link>
          <Link to={CANONICAL_ROUTES.systemHealth}>System health</Link>
          <Link to={CANONICAL_ROUTES.organizationIntelligence}>Organization intelligence</Link>
          <Link to={CANONICAL_ROUTES.departmentIntelligence}>Department intelligence</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Self-diagnostics source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]}
        details="Static platform contract checks against route inventory, API inventories, and dependency map — no live backend probe required."
      />

      <div className="self-diagnostics-page__metrics" role="group" aria-label="Self-diagnostics summary metrics">
        <MetricCard
          label="Health score"
          value={String(diagnostics.healthScore)}
          hint={diagnostics.healthLabel}
          tone={diagnostics.healthScore >= 90 ? 'good' : diagnostics.healthScore >= 70 ? 'warning' : 'critical'}
        />
        <MetricCard label="Checks" value={String(diagnostics.summary.total)} hint="Platform surfaces scanned" tone="neutral" />
        <MetricCard
          label="Critical"
          value={String(diagnostics.summary.critical)}
          hint="Requires immediate attention"
          tone={diagnostics.summary.critical > 0 ? 'critical' : 'good'}
        />
        <MetricCard
          label="Warnings"
          value={String(diagnostics.summary.warning)}
          hint="Review recommended"
          tone={diagnostics.summary.warning > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="self-diagnostics-page__charts">
        <VisualizationPanel title="Check categories" description="Routes, APIs, inventory, auth, layouts, contracts, executors, assets." badge="Categories">
          <CategoryBarChart
            data={categoryChart}
            title="Check categories"
            color="var(--app-chart-1)"
            emptyMessage="Category chart appears when diagnostics are generated."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Status mix" description="Healthy, warning, and critical diagnostic outcomes." badge="Status">
          <CategoryBarChart
            data={statusChart}
            title="Status mix"
            color="var(--app-chart-4)"
            emptyMessage="Status chart appears when diagnostics are generated."
          />
        </VisualizationPanel>
      </div>

      <section className="self-diagnostics-page__panel" aria-label="Diagnostic checks">
        <h2>Diagnostic checks</h2>
        <p>Evidence-backed checks with remediation guidance for platform wiring drift.</p>
        <div className="self-diagnostics-page__checks">
          {diagnostics.checks.map((item) => (
            <article key={item.id} className="self-diagnostics-page__check">
              <div className="self-diagnostics-page__check-head">
                <span className={`self-diagnostics-page__pill self-diagnostics-page__pill--${diagnosticStatusTone(item.status)}`}>
                  {item.status}
                </span>
                <strong>{item.label}</strong>
                <span>{item.category}</span>
              </div>
              <p>{item.detail}</p>
              {item.remediation ? <p className="self-diagnostics-page__remediation">{item.remediation}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}