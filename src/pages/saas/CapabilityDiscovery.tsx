import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildCapabilityDiscovery } from '../../data/capabilityDiscoveryEngine';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildDiscoverySectionChart } from '../../utils/platformSaasChartModel';
import './CapabilityDiscovery.css';

export default function CapabilityDiscovery() {
  const [query, setQuery] = useState('');
  const discovery = useMemo(() => buildCapabilityDiscovery({ recentToolIds: ['qsofa', 'heart-score'] }), []);
  const sectionChart = useMemo(() => buildDiscoverySectionChart(discovery), [discovery]);

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return discovery.sections;
    return discovery.sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title.toLowerCase().includes(normalized) ||
            item.description.toLowerCase().includes(normalized) ||
            item.category.toLowerCase().includes(normalized),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [discovery.sections, query]);

  return (
    <main className="capability-discovery-page" aria-label="Capability discovery">
      <header className="capability-discovery-page__header">
        <div className="capability-discovery-page__title-row">
          <GraphicIconBadge iconKey="clinical-tools" accent="brand" size="md" />
          <div>
            <h1>Discover CareDroid Capabilities</h1>
            <p>Profile-aware recommendations for tools, simulations, workflows, and clinical protocols.</p>
          </div>
        </div>
        <div className="capability-discovery-page__actions">
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.plugins}>Plugin marketplace</Link>
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Capability discovery source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo profile segmentation from tool inventory, simulation catalog, and protocol library — no live personalization backend required."
      />

      <div className="capability-discovery-page__metrics" role="group" aria-label="Discovery summary metrics">
        <MetricCard label="Total items" value={String(discovery.summary.totalItems)} hint="Across all sections" tone="neutral" />
        <MetricCard label="Recommended" value={String(discovery.summary.recommended)} hint="Profile matches" tone="good" />
        <MetricCard label="Underused" value={String(discovery.summary.underused)} hint="Not in recent history" tone="warning" />
        <MetricCard label="Simulations" value={String(discovery.summary.simulations)} hint="Training scenarios" tone="neutral" />
      </div>

      <div className="capability-discovery-page__charts">
        <VisualizationPanel
          title="Discovery sections"
          description="New tools, recommendations, underused capabilities, simulations, workflows, and protocols."
          badge="Sections"
        >
          <CategoryBarChart
            data={sectionChart}
            title="Discovery sections"
            color="var(--app-chart-1)"
            emptyMessage="Section chart appears when discovery data is built."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Profile context"
          description="Role and specialty used for demo segmentation."
          badge="Profile"
        >
          <dl className="capability-discovery-page__profile">
            <div>
              <dt>Role</dt>
              <dd>{discovery.profile.role || 'medical student'}</dd>
            </div>
            <div>
              <dt>Specialty</dt>
              <dd>{discovery.profile.specialty || 'medical education'}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{discovery.profile.workspace || 'all'}</dd>
            </div>
            <div>
              <dt>Workflows</dt>
              <dd>{discovery.summary.workflows}</dd>
            </div>
          </dl>
        </VisualizationPanel>
      </div>

      <input
        type="search"
        className="capability-discovery-page__search"
        placeholder="Search capabilities by title, category, or description…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search capabilities"
      />

      {filteredSections.map((section) => (
        <section key={section.id} className="capability-discovery-page__panel" aria-label={section.title}>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
          <div className="capability-discovery-page__grid">
            {section.items.map((item) => (
              <Link key={`${section.id}-${item.id}`} to={item.path} className="capability-discovery-page__card">
                <strong>{item.title}</strong>
                <span>{item.category}</span>
                <span>{item.reason}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}