import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildDataLineageExplorer,
  DATA_LINEAGE_STAGE_LABELS,
  filterDataLineageFlows,
} from '../../data/dataLineageExplorer';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildLineageCategoryChart, buildLineageStageChart } from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './DataLineageExplorer.css';

const LINEAGE_CATEGORIES = ['all', 'AI extension', 'Calculator', 'AI workflow', 'Simulation'];

const DATA_LINEAGE_ROUTE_CHROME = Object.freeze({
  title: 'Data Lineage Explorer',
  subtitle: 'Transparent Input → AI → Tool → Backend → Output flows with transformations and retention notes.',
});

export default function DataLineageExplorer() {
  // AppShell's ShellRouteTab already renders a real page-level <h1> for this
  // route; this page also rendered its own <h1>, a duplicate-heading bug.
  useRouteChromeRegistration(DATA_LINEAGE_ROUTE_CHROME);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const lineage = useMemo(() => buildDataLineageExplorer(), []);
  const categoryChart = useMemo(() => buildLineageCategoryChart(lineage.flows), [lineage.flows]);
  const stageChart = useMemo(() => buildLineageStageChart(lineage.flows), [lineage.flows]);
  const filteredFlows = useMemo(
    () => filterDataLineageFlows(lineage.flows, query, category),
    [lineage.flows, query, category],
  );

  return (
    <main className="data-lineage-page" aria-label="Data lineage explorer">
      <header className="data-lineage-page__header">
        <div className="data-lineage-page__title-row">
          <GraphicIconBadge iconKey="report" accent="brand" size="md" />
          <div>
            <p className="data-lineage-page__title-text" data-testid="cd-page-title-text">Data Lineage Explorer</p>
            <p>Transparent Input → AI → Tool → Backend → Output flows with transformations and retention notes.</p>
          </div>
        </div>
        <div className="data-lineage-page__actions">
          <Link to={CANONICAL_ROUTES.dependencyGraph}>Asset dependency graph</Link>
          <Link to={CANONICAL_ROUTES.dependencyMap}>Wiring map</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Data lineage source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo lineage traces from inventory, API inventories, and AI workflow contracts. PHI and raw prompts are excluded from retained metadata."
      />

      <div className="data-lineage-page__metrics" role="group" aria-label="Data lineage summary metrics">
        <MetricCard label="Flows" value={String(lineage.summary.flows)} hint="Traceable journeys" tone="neutral" />
        <MetricCard label="Results" value={String(filteredFlows.length)} hint="Matching search/category filters" tone="neutral" />
        <MetricCard label="Transformations" value={String(lineage.summary.transformations)} hint="Stage steps" tone="neutral" />
        <MetricCard label="Models" value={String(lineage.summary.models)} hint="AI touchpoints" tone="warning" />
        <MetricCard label="Backend calls" value={String(lineage.summary.backendTouchpoints)} hint="API-backed flows" tone="neutral" />
      </div>

      <div className="data-lineage-page__charts">
        <VisualizationPanel title="Flow categories" description="AI extensions, calculators, workflows, and simulations." badge="Categories">
          <CategoryBarChart
            data={categoryChart}
            title="Flow categories"
            color="var(--app-chart-1)"
            emptyMessage="Category chart appears when lineage flows are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Stage coverage" description="Input, AI, tool, backend, and output stage counts." badge="Stages">
          <CategoryBarChart
            data={stageChart}
            title="Stage coverage"
            color="var(--app-chart-4)"
            emptyMessage="Stage chart appears when lineage flows are registered."
          />
        </VisualizationPanel>
      </div>

      <div className="data-lineage-page__filters">
        <input
          type="search"
          className="data-lineage-page__search"
          placeholder="Search flows by title, model, calculator, or transformation…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search lineage flows"
        />
        <select
          className="data-lineage-page__select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter lineage flows by category"
        >
          {LINEAGE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All categories' : value}
            </option>
          ))}
        </select>
      </div>

      {filteredFlows.map((flow) => (
        <section key={flow.id} className="data-lineage-page__panel" aria-label={flow.title}>
          <h2>{flow.title}</h2>
          <p>
            {flow.category} · Source: {flow.source} · Output: {flow.output}
          </p>
          <div className="data-lineage-page__stages">
            {flow.stages.map((stage) => (
              <article key={`${flow.id}-${stage.stage}`} className="data-lineage-page__stage">
                <header>
                  <strong>{stage.label || DATA_LINEAGE_STAGE_LABELS[stage.stage]}</strong>
                  <span>{stage.timestamp}</span>
                </header>
                <p>{stage.source}</p>
                <ul>
                  {stage.transformations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}