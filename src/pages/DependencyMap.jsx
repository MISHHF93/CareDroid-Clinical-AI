import { useMemo, useState } from 'react';
import { buildDependencyMap, DEPENDENCY_ISSUE_TYPES } from '../data/dependencyMap';
import './DependencyMap.css';

const ISSUE_LABELS = Object.freeze({
  [DEPENDENCY_ISSUE_TYPES.ORPHAN_UI]: 'Orphan UI',
  [DEPENDENCY_ISSUE_TYPES.ORPHAN_BACKEND]: 'Orphan backend',
  [DEPENDENCY_ISSUE_TYPES.BROKEN_DEPENDENCY]: 'Broken dependency',
  [DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY]: 'Duplicate dependency',
});

const STAGES = Object.freeze([
  ['frontendRoute', 'Frontend Route'],
  ['inventoryEntry', 'Inventory Entry'],
  ['apiClient', 'API Client'],
  ['backendEndpoint', 'Backend Endpoint'],
  ['service', 'Service'],
  ['executor', 'Executor'],
]);

function StageChain({ dependency }) {
  return (
    <ol className="dependency-chain" aria-label={`${dependency.displayName} dependency chain`}>
      {STAGES.map(([key, label]) => (
        <li key={key}>
          <span>{label}</span>
          <strong>{dependency[key] || '—'}</strong>
        </li>
      ))}
    </ol>
  );
}

export default function DependencyMap() {
  const [issueFilter, setIssueFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const dependencyMap = useMemo(() => buildDependencyMap(), []);
  const visibleIssues = useMemo(
    () =>
      issueFilter === 'all'
        ? dependencyMap.issues.slice(0, 18)
        : dependencyMap.issues.filter((issue) => issue.type === issueFilter).slice(0, 18),
    [dependencyMap.issues, issueFilter]
  );
  const visibleDependencies = useMemo(
    () =>
      dependencyMap.dependencies
        .filter((dependency) => statusFilter === 'all' || dependency.status === statusFilter)
        .filter((dependency) => dependency.frontendRoute || dependency.backendEndpoint !== '—')
        .slice(0, 18),
    [dependencyMap.dependencies, statusFilter]
  );
  const statuses = [...new Set(dependencyMap.dependencies.map((dependency) => dependency.status).filter(Boolean))];

  return (
    <main className="dependency-map">
      <header className="dependency-map-hero">
        <div>
          <p className="dependency-map-eyebrow">Dependency Map</p>
          <h1>Platform Wiring Map</h1>
          <p>
            Visualize how frontend routes connect to inventory entries, API clients, backend
            endpoints, services, and executors so wiring gaps are visible before they reach users.
          </p>
        </div>
      </header>

      <section className="dependency-map-summary" aria-label="Dependency map summary">
        <div><span>Routes</span><strong>{dependencyMap.summary.routes}</strong></div>
        <div><span>Dependencies</span><strong>{dependencyMap.summary.dependencies}</strong></div>
        <div><span>API clients</span><strong>{dependencyMap.summary.frontendApiCalls}</strong></div>
        <div><span>Backend endpoints</span><strong>{dependencyMap.summary.backendEndpoints}</strong></div>
        <div><span>Services</span><strong>{dependencyMap.summary.services}</strong></div>
        <div><span>Executors</span><strong>{dependencyMap.summary.executors}</strong></div>
      </section>

      <section className="dependency-map-issues">
        <header>
          <div>
            <h2>Dependency Health</h2>
            <p>Detect orphan UI, orphan backend, broken dependency, and duplicate dependency issues.</p>
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
        <div className="dependency-issue-counts">
          {Object.entries(ISSUE_LABELS).map(([type, label]) => (
            <button key={type} type="button" onClick={() => setIssueFilter(type)}>
              <span>{label}</span>
              <strong>{dependencyMap.issueCounts[type] || 0}</strong>
            </button>
          ))}
        </div>
        <div className="dependency-issue-list">
          {visibleIssues.map((issue) => (
            <article key={issue.id} className={`dependency-issue dependency-issue--${issue.severity}`}>
              <span>{ISSUE_LABELS[issue.type]}</span>
              <h3>{issue.title}</h3>
              <p>{issue.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dependency-map-visual">
        <header>
          <div>
            <h2>Visual Dependency Chains</h2>
            <p>{'Frontend Route -> Inventory Entry -> API Client -> Backend Endpoint -> Service -> Executor.'}</p>
          </div>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </header>
        <div className="dependency-chain-list">
          {visibleDependencies.map((dependency) => (
            <article key={dependency.id} className="dependency-chain-card">
              <header>
                <div>
                  <h3>{dependency.displayName}</h3>
                  <p>{dependency.source} · {dependency.status}</p>
                </div>
                <span>{dependency.backendController}</span>
              </header>
              <StageChain dependency={dependency} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
