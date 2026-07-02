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
import { buildDepartmentPerformanceIntelligence } from '../../data/departmentPerformanceIntelligence';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildDepartmentHealthChart,
  buildDepartmentOutcomeSourceChart,
  departmentHealthTone,
} from '../../utils/platformSaasChartModel';
import './DepartmentIntelligence.css';

export function DepartmentIntelligencePage() {
  const intelligence = useMemo(() => buildDepartmentPerformanceIntelligence(), []);
  const healthChart = useMemo(() => buildDepartmentHealthChart(intelligence.departments), [intelligence.departments]);
  const sourceChart = useMemo(
    () => buildDepartmentOutcomeSourceChart(intelligence.departments),
    [intelligence.departments],
  );

  return (
    <main className="department-intelligence-page" aria-label="Department intelligence">
      <header className="department-intelligence-page__header">
        <div className="department-intelligence-page__title-row">
          <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
          <div>
            <h1>Department Intelligence</h1>
            <p>Measurable outcomes across emergency, laboratory, and operations service lines.</p>
          </div>
        </div>
        <div className="department-intelligence-page__actions">
          <Link to={CANONICAL_ROUTES.organizationIntelligence}>Organization intelligence</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Department intelligence source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo department performance model with workflow, calculator, simulation, turnaround, and uptime outcomes."
      />

      <div className="department-intelligence-page__metrics" role="group" aria-label="Department intelligence summary metrics">
        <MetricCard
          label="Departments"
          value={String(intelligence.summary.departmentCount)}
          hint="Tracked service lines"
          tone="neutral"
        />
        <MetricCard
          label="Avg health"
          value={String(intelligence.summary.averageHealthScore)}
          hint="Rounded composite score"
          tone={intelligence.summary.averageHealthScore >= 80 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Outcomes"
          value={String(intelligence.summary.measurableOutcomeCount)}
          hint="Measurable metrics"
          tone="neutral"
        />
        <MetricCard
          label="Attention"
          value={String(intelligence.summary.attentionDepartmentCount)}
          hint="Departments below 70"
          tone={intelligence.summary.attentionDepartmentCount > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="department-intelligence-page__charts">
        <VisualizationPanel title="Department health" description="Composite health scores by service line." badge="Health">
          <CategoryBarChart
            data={healthChart}
            title="Department health"
            color="var(--app-chart-1)"
            emptyMessage="Health chart appears when department outcomes are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Outcome sources"
          description="Workflow, calculator, simulation, turnaround, uptime, and maintenance signals."
          badge="Sources"
        >
          <CategoryBarChart
            data={sourceChart}
            title="Outcome sources"
            color="var(--app-chart-4)"
            emptyMessage="Source chart appears when department outcomes are registered."
          />
        </VisualizationPanel>
      </div>

      {intelligence.departments.map((department) => (
        <section key={department.id} className="department-intelligence-page__panel" aria-label={department.name}>
          <div className="department-intelligence-page__panel-head">
            <div>
              <h2>{department.name}</h2>
              <p>{department.description}</p>
            </div>
            <span
              className={`department-intelligence-page__pill department-intelligence-page__pill--${departmentHealthTone(department.healthBand.id)}`}
            >
              {department.healthBand.label} · {department.healthScore}
            </span>
          </div>
          <div className="department-intelligence-page__table" role="table" aria-label={`${department.name} outcomes`}>
            <div className="department-intelligence-page__table-head" role="row">
              <span role="columnheader">Metric</span>
              <span role="columnheader">Value</span>
              <span role="columnheader">Target</span>
              <span role="columnheader">Score</span>
              <span role="columnheader">Trend</span>
            </div>
            {department.metrics.map((metric) => (
              <div key={metric.id} className="department-intelligence-page__table-row" role="row">
                <span role="cell">{metric.label}</span>
                <span role="cell">{metric.value}</span>
                <span role="cell">{metric.target}</span>
                <span role="cell">{metric.score}</span>
                <span role="cell">{metric.trend}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default DepartmentIntelligencePage;