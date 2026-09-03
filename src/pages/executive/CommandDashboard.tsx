import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import OperationsLiveSnapshotPanel from '../../components/operations/OperationsLiveSnapshotPanel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildCommandDashboardModel,
  COMMAND_DASHBOARD_PROMPTS,
} from '../../data/commandDashboardModel';
import { useOperationsHubLiveFeeds } from '../../hooks/useOperationsHubLiveFeeds';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import '../../components/operations/OperationsLiveSnapshotPanel.css';
import '../CommandDashboard.css';

type DashboardTool = {
  id: string;
  name: string;
  description?: string;
  path?: string;
  category?: string;
};

function ToolPanel({
  title,
  description,
  tools,
}: {
  title: string;
  description: string;
  tools: DashboardTool[];
}) {
  return (
    <section className="command-dashboard-page__panel" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="command-dashboard-page__tool-grid">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path || CANONICAL_ROUTES.tools}
            className="command-dashboard-page__tool-link"
          >
            <strong>{tool.name}</strong>
            <span>{tool.description || tool.category || tool.id}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function CommandDashboard() {
  useRouteChromeRegistration({ title: 'CareDroid Command Center' });
  const model = useMemo(() => buildCommandDashboardModel(), []);
  const quickPrompts = useMemo(() => COMMAND_DASHBOARD_PROMPTS.slice(0, 6), []);
  const { loading, liveFeeds, lastRefreshed, refresh } = useOperationsHubLiveFeeds({
    source: 'CommandDashboard',
    refreshIntervalMs: 60_000,
  });

  return (
    <main
      className="command-dashboard-page command-dashboard"
      aria-label="CareDroid command dashboard"
    >
      <header className="command-dashboard-page__header">
        <div className="command-dashboard-page__title-row">
          <GraphicIconBadge iconKey="layout-dashboard" accent="brand" size="md" />
          <div>
            <p className="command-dashboard-page-title-text" data-testid="cd-page-title-text">
              CareDroid Command Center
            </p>
            <p>
              Platform inventory, operational launch points, and governed assistant quick starts.
            </p>
          </div>
        </div>
        <div className="command-dashboard-page__actions">
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
          <Link to={CANONICAL_ROUTES.tools}>Tool console</Link>
        </div>
      </header>

      <div
        className="command-dashboard-page__metrics"
        role="group"
        aria-label="Command dashboard summary metrics"
      >
        <MetricCard
          label="Total tools"
          value={String(model.stats.totalTools)}
          hint="User-facing inventory"
          tone="neutral"
        />
        <MetricCard
          label="Calculators"
          value={String(model.stats.calculators)}
          hint="Severity and dosing workflows"
          tone="neutral"
        />
        <MetricCard
          label="AI tools"
          value={String(model.stats.aiTools)}
          hint="Assistant-guided and backend-backed"
          tone="neutral"
        />
        <MetricCard
          label="Backend-backed"
          value={String(model.stats.backendBacked)}
          hint="Registered executor integrations"
          tone="good"
        />
      </div>

      <OperationsLiveSnapshotPanel
        liveFeeds={liveFeeds}
        loading={loading}
        lastRefreshed={lastRefreshed}
        onRefresh={refresh}
        compact
      />

      <div className="command-dashboard-page__charts">
        <VisualizationPanel
          title="Tool categories"
          description="Distribution of user-facing tool inventory."
          badge="Inventory"
        >
          <CategoryBarChart
            data={model.visualizations.categoryDistribution.slice(0, 8)}
            title="Tool categories"
            color="var(--app-chart-1)"
            emptyMessage="Category chart appears when tools are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Readiness mix"
          description="Backend-backed, local, assistant-guided, and planned tools."
          badge="Readiness"
        >
          <CategoryBarChart
            data={model.visualizations.readinessDistribution}
            title="Readiness mix"
            color="var(--app-chart-4)"
            emptyMessage="Readiness chart appears when launch metadata is available."
          />
        </VisualizationPanel>
      </div>

      <div className="command-dashboard-page__panels">
        <ToolPanel
          title="Fleet and hospital operations"
          description="Maps, fleet command, routing, maintenance, and dispatch decision support."
          tools={model.panels.fleetOperations}
        />
        <ToolPanel
          title="Medical IoT"
          description="Device telemetry dashboards and maintenance workflows."
          tools={model.panels.medicalIot}
        />
        <ToolPanel
          title="Clinical quick tools"
          description="High-value calculators and clinical decision support entry points."
          tools={model.panels.clinicalTools}
        />
        <ToolPanel
          title="Simulation, laboratory, and visualization"
          description="Training scenarios, lab queue orientation, and asset-safe 3D anatomy shells."
          tools={model.panels.expandedCare}
        />
      </div>

      <section className="command-dashboard-page__panel" aria-label="Assistant quick starts">
        <h2>Assistant quick starts</h2>
        <p>Governed prompts that open the focused assistant workspace or linked clinical tools.</p>
        <div className="command-dashboard-page__prompts">
          {quickPrompts.map((prompt) => (
            <article key={prompt.id} className="command-dashboard-page__prompt">
              <strong>{prompt.title}</strong>
              <span>{prompt.description}</span>
              {prompt.route ? (
                <Link to={prompt.route}>Open route</Link>
              ) : prompt.toolId ? (
                <Link to={model.toolById[prompt.toolId]?.path || CANONICAL_ROUTES.tools}>
                  Open tool
                </Link>
              ) : (
                <Link to={CANONICAL_ROUTES.assistant}>Open assistant</Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
