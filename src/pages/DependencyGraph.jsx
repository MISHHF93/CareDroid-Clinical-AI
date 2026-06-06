import { useEffect, useMemo, useState } from 'react';
import { ProductCatalogApi } from '../services/productCatalogApi';
import './DependencyGraph.css';

const ISSUE_LABELS = Object.freeze({
  'missing-dependency': 'Missing dependencies',
  'duplicate-dependency': 'Duplicate dependencies',
  'orphan-asset': 'Orphan assets',
});

const STAGES = Object.freeze([
  ['product', 'Product'],
  ['assetPack', 'Asset Pack'],
  ['asset', 'Asset'],
  ['route', 'Route'],
  ['backendServices', 'Backend Service'],
  ['integrations', 'Integration'],
]);

function stageValue(chain, key) {
  if (key === 'product') return chain.product?.name || '—';
  if (key === 'assetPack') return chain.assetPack?.name || 'Direct product asset';
  if (key === 'asset') return chain.asset?.title || chain.asset?.id || '—';
  if (key === 'backendServices') return chain.backendServices?.join(', ') || '—';
  if (key === 'integrations') return chain.integrations?.map((integration) => integration.name).join(', ') || '—';
  return chain[key] || '—';
}

function StageChain({ chain }) {
  return (
    <ol className="dependency-graph-chain" aria-label={`${chain.asset?.title || chain.id} dependency chain`}>
      {STAGES.map(([key, label]) => (
        <li key={key}>
          <span>{label}</span>
          <strong>{stageValue(chain, key)}</strong>
        </li>
      ))}
    </ol>
  );
}

export default function DependencyGraph() {
  const [graph, setGraph] = useState({ chains: [], issues: [], issueCounts: {}, summary: {} });
  const [issueFilter, setIssueFilter] = useState('all');
  const [status, setStatus] = useState('Loading dependency graph...');

  useEffect(() => {
    let active = true;
    ProductCatalogApi.getAssetDependencyGraph()
      .then((data) => {
        if (!active) return;
        setGraph(data);
        setStatus('');
      })
      .catch((error) => {
        if (active) setStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleIssues = useMemo(
    () =>
      issueFilter === 'all'
        ? (graph.issues || []).slice(0, 18)
        : (graph.issues || []).filter((issue) => issue.type === issueFilter).slice(0, 18),
    [graph.issues, issueFilter],
  );

  const visibleChains = useMemo(() => (graph.chains || []).slice(0, 24), [graph.chains]);
  const summary = graph.summary || {};

  return (
    <main className="dependency-graph">
      <header className="dependency-graph-hero">
        <p className="dependency-graph-eyebrow">Asset Dependency Graph</p>
        <h1>Asset Dependency Graph</h1>
        <p>
          Visualize how sellable products connect to asset packs, assets, frontend routes,
          backend services, and integrations.
        </p>
        {status && <p className="dependency-graph-status">{status}</p>}
      </header>

      <section className="dependency-graph-summary" aria-label="Asset dependency graph summary">
        <div><span>Products</span><strong>{summary.products || 0}</strong></div>
        <div><span>Asset Packs</span><strong>{summary.assetPacks || 0}</strong></div>
        <div><span>Assets</span><strong>{summary.assets || 0}</strong></div>
        <div><span>Routes</span><strong>{summary.routes || 0}</strong></div>
        <div><span>Backend Services</span><strong>{summary.backendServices || 0}</strong></div>
        <div><span>Integrations</span><strong>{summary.integrations || 0}</strong></div>
      </section>

      <section className="dependency-graph-panel">
        <header>
          <div>
            <h2>Dependency Health</h2>
            <p>Detect missing dependencies, duplicate dependency declarations, and orphan assets.</p>
          </div>
          <label>
            <span>Issue type</span>
            <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
              <option value="all">All issue types</option>
              {Object.entries(ISSUE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </label>
        </header>
        <div className="dependency-graph-issue-counts">
          {Object.entries(ISSUE_LABELS).map(([type, label]) => (
            <button key={type} type="button" onClick={() => setIssueFilter(type)}>
              <span>{label}</span>
              <strong>{graph.issueCounts?.[type] || 0}</strong>
            </button>
          ))}
        </div>
        <div className="dependency-graph-issues">
          {visibleIssues.map((issue) => (
            <article key={issue.id} className={`dependency-graph-issue dependency-graph-issue--${issue.severity}`}>
              <span>{ISSUE_LABELS[issue.type] || issue.type}</span>
              <h3>{issue.title}</h3>
              <p>{issue.detail}</p>
            </article>
          ))}
          {!visibleIssues.length && <p>No dependency issues match this filter.</p>}
        </div>
      </section>

      <section className="dependency-graph-panel">
        <header>
          <div>
            <h2>Product To Integration Chains</h2>
            <p>{'Product -> Asset Pack -> Asset -> Route -> Backend Service -> Integration.'}</p>
          </div>
        </header>
        <div className="dependency-graph-chain-list">
          {visibleChains.map((chain) => (
            <article key={chain.id} className="dependency-graph-chain-card">
              <header>
                <div>
                  <h3>{chain.asset?.title || chain.id}</h3>
                  <p>{chain.product?.name || 'Product'} · {chain.assetPack?.name || 'Direct product asset'}</p>
                </div>
                <span>{chain.route || 'No route'}</span>
              </header>
              <StageChain chain={chain} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
