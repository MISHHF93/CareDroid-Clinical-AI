import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildWorkspaceDependencyGraph } from '../../data/crossWorkspaceIntelligence';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildWorkspaceDependencyStrengthChart,
  buildWorkspaceDependencyTypeChart,
  workspaceDependencyStrengthTone,
} from '../../utils/platformSaasChartModel';
import './WorkspaceDependencyGraph.css';

export function WorkspaceDependencyGraphPage() {
  const graph = useMemo(() => buildWorkspaceDependencyGraph(), []);
  const typeChart = useMemo(() => buildWorkspaceDependencyTypeChart(graph.edges), [graph.edges]);
  const strengthChart = useMemo(() => buildWorkspaceDependencyStrengthChart(graph.edges), [graph.edges]);

  return (
    <main className="workspace-graph-page" aria-label="Workspace dependency graph">
      <header className="workspace-graph-page__header">
        <div className="workspace-graph-page__title-row">
          <GraphicIconBadge iconKey="layout-dashboard" accent="brand" size="md" />
          <div>
            <h1>Workspace Dependency Graph</h1>
            <p>Cross-workspace handoffs, signals, workflows, and operational dependencies.</p>
          </div>
        </div>
        <div className="workspace-graph-page__actions">
          <Link to={CANONICAL_ROUTES.workflowMining}>Workflow mining</Link>
          <Link to={CANONICAL_ROUTES.dependencyGraph}>Asset dependency graph</Link>
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
          <Link to={CANONICAL_ROUTES.departmentIntelligence}>Department intelligence</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Workspace dependency source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo cross-workspace edges from canonical workspace registry with clinical and operational handoff evidence."
      />

      <div className="workspace-graph-page__metrics" role="group" aria-label="Workspace dependency summary metrics">
        <MetricCard label="Workspaces" value={String(graph.summary.workspaceCount)} hint="Linked nodes" tone="neutral" />
        <MetricCard label="Dependencies" value={String(graph.summary.dependencyCount)} hint="Directed edges" tone="neutral" />
        <MetricCard
          label="High strength"
          value={String(graph.summary.highStrengthDependencyCount)}
          hint="Strength ≥ 85"
          tone="good"
        />
        <MetricCard label="Chains" value={String(graph.summary.chainCount)} hint="Multi-hop paths" tone="neutral" />
      </div>

      <div className="workspace-graph-page__charts">
        <VisualizationPanel title="Dependency types" description="Handoff, signal, workflow, and operational dependency mix." badge="Types">
          <CategoryBarChart
            data={typeChart.filter((row) => row.value > 0)}
            title="Dependency types"
            color="var(--app-chart-1)"
            emptyMessage="Type chart appears when workspace edges are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Edge strength" description="Dependency strength scores across workspace pairs." badge="Strength">
          <CategoryBarChart
            data={strengthChart}
            title="Edge strength"
            color="var(--app-chart-4)"
            emptyMessage="Strength chart appears when workspace edges are registered."
          />
        </VisualizationPanel>
      </div>

      <section className="workspace-graph-page__panel" aria-label="Dependency chains">
        <h2>Multi-hop chains</h2>
        <div className="workspace-graph-page__chains">
          {graph.chains.map((chain) => (
            <article key={chain.id} className="workspace-graph-page__chain">
              <strong>{chain.label}</strong>
              <span>{chain.workspaceIds.join(' → ')}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-graph-page__panel" aria-label="Workspace dependencies">
        <h2>Workspace edges</h2>
        <div className="workspace-graph-page__table" role="table" aria-label="Workspace dependency edges">
          <div className="workspace-graph-page__table-head" role="row">
            <span role="columnheader">Source</span>
            <span role="columnheader">Target</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Strength</span>
            <span role="columnheader">Outcome</span>
          </div>
          {graph.edges.map((edge) => (
            <div key={edge.id} className="workspace-graph-page__table-row" role="row">
              <span role="cell">{edge.sourceLabel}</span>
              <span role="cell">{edge.targetLabel}</span>
              <span role="cell">{edge.type.replace(/-/g, ' ')}</span>
              <span role="cell">
                <span className={`workspace-graph-page__pill workspace-graph-page__pill--${workspaceDependencyStrengthTone(edge.strength)}`}>
                  {edge.strength}
                </span>
              </span>
              <span role="cell">{edge.outcome}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default WorkspaceDependencyGraphPage;