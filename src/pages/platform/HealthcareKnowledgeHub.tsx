import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildHealthcareKnowledgeHub } from '../../data/healthcareKnowledgeHub';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildKnowledgeHubTypeChart } from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './HealthcareKnowledgeHub.css';

export function HealthcareKnowledgeHubPage() {
  useRouteChromeRegistration({ title: 'Knowledge Hub' });
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [role, setRole] = useState('all');
  const [workspace, setWorkspace] = useState('all');
  const [department, setDepartment] = useState('all');

  const hub = useMemo(
    () => buildHealthcareKnowledgeHub({ query, specialty, role, workspace, department }),
    [query, specialty, role, workspace, department],
  );
  const typeChart = useMemo(() => buildKnowledgeHubTypeChart(hub.typeCounts), [hub.typeCounts]);

  return (
    <main className="knowledge-hub-page" aria-label="Knowledge hub">
      <header className="knowledge-hub-page__header">
        <div className="knowledge-hub-page__title-row">
          <GraphicIconBadge iconKey="notes" accent="brand" size="md" />
          <div>
            <p className="knowledge-hub-page-title-text" data-testid="cd-page-title-text">Knowledge Hub</p>
            <p>Protocols, pathways, calculators, simulations, AI guidance, and documentation across workspaces.</p>
          </div>
        </div>
        <div className="knowledge-hub-page__actions">
          <Link to={CANONICAL_ROUTES.protocols}>Protocols</Link>
          <Link to={CANONICAL_ROUTES.workflows}>Workflow builder</Link>
          <Link to={CANONICAL_ROUTES.research}>Research hub</Link>
          <Link to={CANONICAL_ROUTES.knowledgeGraph}>Knowledge graph</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Knowledge hub source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo artifact catalog indexed by specialty, role, workspace, and department with evidence-backed launch routes."
      />

      <div className="knowledge-hub-page__filters" role="search" aria-label="Knowledge hub filters">
        <input
          type="search"
          placeholder="Search protocols, calculators, simulations..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search knowledge hub"
        />
        <select value={specialty} onChange={(event) => setSpecialty(event.target.value)} aria-label="Filter by specialty">
          <option value="all">All specialties</option>
          {hub.facets.specialties.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option>
          {hub.facets.roles.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={workspace} onChange={(event) => setWorkspace(event.target.value)} aria-label="Filter by workspace">
          <option value="all">All workspaces</option>
          {hub.facets.workspaces.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department">
          <option value="all">All departments</option>
          {hub.facets.departments.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="knowledge-hub-page__metrics" role="group" aria-label="Knowledge hub summary metrics">
        <MetricCard label="Catalog items" value={String(hub.summary.totalItems)} hint="Indexed artifacts" tone="neutral" />
        <MetricCard label="Results" value={String(hub.summary.resultCount)} hint="Matching filters" tone="neutral" />
        <MetricCard label="Types" value={String(hub.summary.representedTypeCount)} hint="Artifact categories" tone="neutral" />
        <MetricCard label="Workspaces" value={String(hub.summary.workspaceCount)} hint="Coverage breadth" tone="neutral" />
      </div>

      <div className="knowledge-hub-page__charts">
        <VisualizationPanel title="Artifact types" description="Protocol, pathway, calculator, simulation, AI guidance, and documentation mix." badge="Types">
          <CategoryBarChart
            data={typeChart}
            title="Artifact types"
            color="var(--app-chart-1)"
            emptyMessage="Type chart appears when knowledge items are registered."
          />
        </VisualizationPanel>
      </div>

      <div className="knowledge-hub-page__results">
        {hub.results.map((item) => (
          <article key={item.id} className="knowledge-hub-page__card">
            <div className="knowledge-hub-page__card-head">
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <span className="knowledge-hub-page__type">{item.type.replace(/_/g, ' ')}</span>
            </div>
            <p className="knowledge-hub-page__meta">
              {item.specialties.join(' · ')} · {item.roles.join(' · ')}
            </p>
            <div className="knowledge-hub-page__evidence">
              {item.evidence.map((entry) => (
                <span key={entry}>{entry}</span>
              ))}
            </div>
            <Link to={item.route}>Open artifact</Link>
          </article>
        ))}
        {hub.results.length === 0 ? (
          <p className="knowledge-hub-page__empty">No knowledge items match the current filters.</p>
        ) : null}
      </div>
    </main>
  );
}

export default HealthcareKnowledgeHubPage;