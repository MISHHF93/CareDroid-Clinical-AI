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
import {
  buildArtifactCatalog,
  createArtifactResonanceService,
  validateArtifactCatalog,
} from '../../data/artifactIntelligence';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildArtifactCategoryChart, buildArtifactTypeChart } from '../../utils/platformSaasChartModel';
import './Artifacts.css';

const DISPLAY_LIMIT = 48;

export default function Artifacts() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const catalog = useMemo(() => buildArtifactCatalog(), []);
  const validation = useMemo(() => validateArtifactCatalog(catalog), [catalog]);
  const resonance = useMemo(() => createArtifactResonanceService(catalog), [catalog]);

  const typeOptions = useMemo(() => {
    const types = new Set((catalog as { type: string }[]).map((artifact) => artifact.type));
    return [...types].sort();
  }, [catalog]);

  const filteredArtifacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((artifact) => {
      if (typeFilter !== 'all' && artifact.type !== typeFilter) return false;
      if (!needle) return true;
      return [artifact.name, artifact.category, artifact.route, artifact.description, artifact.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [catalog, query, typeFilter]);

  const typeChart = useMemo(() => buildArtifactTypeChart(catalog), [catalog]);
  const categoryChart = useMemo(() => buildArtifactCategoryChart(catalog), [catalog]);
  const orphanCount = useMemo(() => resonance.detectOrphanArtifacts().length, [resonance]);
  const duplicateCount = useMemo(() => resonance.detectDuplicateArtifacts().length, [resonance]);

  return (
    <main className="artifacts-page" aria-label="CareDroid artifacts">
      <header className="artifacts-page__header">
        <div className="artifacts-page__title-row">
          <GraphicIconBadge iconKey="report" accent="brand" size="md" />
          <div>
            <h1>CareDroid Artifacts</h1>
            <p>Machine-learning-ready artifact catalog with resonance metadata, validation, and export-ready schema fields.</p>
          </div>
        </div>
        <div className="artifacts-page__actions">
          <Link to={CANONICAL_ROUTES.dependencyGraph}>Dependency graph</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to={CANONICAL_ROUTES.dataLineage}>Data lineage</Link>
          <Link to={CANONICAL_ROUTES.knowledgeGraph}>Knowledge graph</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Artifact catalog source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Local artifact intelligence projection from assets, routes, API endpoints, prompts, packs, products, and AI models."
      />

      <div className="artifacts-page__filters" role="search" aria-label="Artifact filters">
        <input
          type="search"
          placeholder="Search artifacts..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search artifacts"
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="artifacts-page__metrics" role="group" aria-label="Artifact catalog summary metrics">
        <MetricCard label="Artifacts" value={String(catalog.length)} hint="Catalog rows" tone="neutral" />
        <MetricCard label="Types" value={String(typeOptions.length)} hint="Artifact categories" tone="neutral" />
        <MetricCard label="Orphans" value={String(orphanCount)} hint="Unlinked assets" tone={orphanCount > 0 ? 'warning' : 'good'} />
        <MetricCard
          label="Validation"
          value={validation.ok ? 'Pass' : 'Review'}
          hint={validation.ok ? 'Schema complete' : 'Metadata gaps'}
          tone={validation.ok ? 'good' : 'warning'}
        />
      </div>

      <div className="artifacts-page__charts">
        <VisualizationPanel title="Artifact types" description="Top artifact types across the platform catalog." badge="Types">
          <CategoryBarChart
            data={typeChart}
            title="Artifact types"
            color="var(--app-chart-1)"
            emptyMessage="Type chart appears when artifacts are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Artifact categories" description="Top categories by catalog volume." badge="Categories">
          <CategoryBarChart
            data={categoryChart}
            title="Artifact categories"
            color="var(--app-chart-4)"
            emptyMessage="Category chart appears when artifacts are registered."
          />
        </VisualizationPanel>
      </div>

      <section className="artifacts-page__panel" aria-label="Artifact catalog">
        <div className="artifacts-page__panel-head">
          <h2>Catalog results</h2>
          <p>
            Showing {Math.min(filteredArtifacts.length, DISPLAY_LIMIT)} of {filteredArtifacts.length} matches
            {duplicateCount > 0 ? ` · ${duplicateCount} duplicate groups detected` : ''}
          </p>
        </div>
        <div className="artifacts-page__table" role="table">
          <div className="artifacts-page__table-head" role="row">
            <span role="columnheader">Name</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Risk</span>
          </div>
          {filteredArtifacts.slice(0, DISPLAY_LIMIT).map((artifact) => (
            <div key={artifact.artifactId} className="artifacts-page__table-row" role="row">
              <span role="cell">
                {artifact.route && artifact.route !== 'unknown' ? (
                  <Link to={artifact.route}>{artifact.name}</Link>
                ) : (
                  artifact.name
                )}
              </span>
              <span role="cell">{artifact.type}</span>
              <span role="cell">{artifact.category}</span>
              <span role="cell">{artifact.riskLevel}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}