import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildLocalAssetDependencyGraph } from '../../data/assetDependencyGraph';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildAssetGraphIssueChart,
  buildAssetGraphProductChart,
  dependencyIssueTone,
  type AssetDependencyGraphSnapshot,
} from '../../utils/platformSaasChartModel';
import './DependencyGraph.css';

export default function DependencyGraph() {
  const fallback = useMemo(() => buildLocalAssetDependencyGraph(), []);
  const [graph, setGraph] = useState<AssetDependencyGraphSnapshot>(fallback);
  const [sourceState, setSourceState] = useState<
    typeof DEMO_LIVE_STATES.DEMO | typeof DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
  >(DEMO_LIVE_STATES.DEMO);

  useEffect(() => {
    let cancelled = false;

    ProductCatalogApi.getAssetDependencyGraph()
      .then((payload) => {
        if (cancelled || !payload) return;
        setGraph(payload as AssetDependencyGraphSnapshot);
        setSourceState(DEMO_LIVE_STATES.DEMO);
      })
      .catch(() => {
        if (cancelled) return;
        setGraph(fallback);
        setSourceState(DEMO_LIVE_STATES.BACKEND_UNAVAILABLE);
      });

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  const issueChart = useMemo(() => buildAssetGraphIssueChart(graph.issueCounts), [graph.issueCounts]);
  const productChart = useMemo(() => buildAssetGraphProductChart(graph.chains), [graph.chains]);

  return (
    <main className="dependency-graph-page" aria-label="Asset dependency graph">
      <header className="dependency-graph-page__header">
        <div className="dependency-graph-page__title-row">
          <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
          <div>
            <h1>Asset Dependency Graph</h1>
            <p>Product, asset pack, governed asset, route, backend service, and integration chains.</p>
          </div>
        </div>
        <div className="dependency-graph-page__actions">
          <Link to={CANONICAL_ROUTES.dependencyMap}>Wiring map</Link>
          <Link to={CANONICAL_ROUTES.dataLineage}>Data lineage</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to={CANONICAL_ROUTES.featureFlags}>Feature flags</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Asset dependency graph source state"
        states={
          sourceState === DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
        }
        details="Loads product catalog dependency graph from API with rollout-registry fallback when backend is unavailable."
      />

      <div className="dependency-graph-page__metrics" role="group" aria-label="Asset dependency summary metrics">
        <MetricCard label="Products" value={String(graph.summary.products)} hint="Capability platforms" tone="neutral" />
        <MetricCard label="Asset packs" value={String(graph.summary.assetPacks)} hint="Rollout bundles" tone="neutral" />
        <MetricCard label="Assets" value={String(graph.summary.assets)} hint="Linked inventory assets" tone="neutral" />
        <MetricCard
          label="Issues"
          value={String(graph.issues.length)}
          hint="Missing, duplicate, orphan"
          tone={graph.issues.length > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="dependency-graph-page__charts">
        <VisualizationPanel title="Product chains" description="Assets grouped by capability platform product." badge="Products">
          <CategoryBarChart
            data={productChart}
            title="Product chains"
            color="var(--app-chart-1)"
            emptyMessage="Product chart appears when dependency chains are loaded."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Issue mix" description="Missing, duplicate, and orphan asset dependency signals." badge="Issues">
          <CategoryBarChart
            data={issueChart.filter((row) => row.value > 0)}
            title="Issue mix"
            color="var(--app-chart-4)"
            emptyMessage="No dependency issues detected in current graph."
          />
        </VisualizationPanel>
      </div>

      <section className="dependency-graph-page__panel" aria-label="Dependency chains">
        <h2>Dependency chains</h2>
        <p>Product → pack → asset wiring with routes, backend services, and integrations.</p>
        <div className="dependency-graph-page__table" role="table" aria-label="Dependency chains table">
          <div className="dependency-graph-page__table-head" role="row">
            <span role="columnheader">Product</span>
            <span role="columnheader">Pack</span>
            <span role="columnheader">Asset</span>
            <span role="columnheader">Route</span>
            <span role="columnheader">Services</span>
          </div>
          {graph.chains.map((chain) => (
            <div key={chain.id} className="dependency-graph-page__table-row" role="row">
              <span role="cell">{chain.product.name}</span>
              <span role="cell">{chain.assetPack.name}</span>
              <span role="cell">{chain.asset.title}</span>
              <span role="cell">{chain.route || '—'}</span>
              <span role="cell">{chain.backendServices.join(', ')}</span>
            </div>
          ))}
        </div>
      </section>

      {graph.issues.length > 0 ? (
        <section className="dependency-graph-page__panel" aria-label="Graph issues">
          <h2>Detected issues</h2>
          <div className="dependency-graph-page__issues">
            {graph.issues.slice(0, 10).map((issue) => (
              <article key={issue.id} className="dependency-graph-page__issue">
                <span className={`dependency-graph-page__pill dependency-graph-page__pill--${dependencyIssueTone(issue.severity)}`}>
                  {issue.type.replace(/-/g, ' ')}
                </span>
                <strong>{issue.title}</strong>
                <p>{issue.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}