import { useMemo, useState } from 'react';
import {
  SELF_DIAGNOSTIC_STATUS,
  buildPlatformSelfDiagnostics,
} from '../data/platformSelfDiagnostics';
import './PlatformSelfDiagnostics.css';

const STATUS_LABELS = Object.freeze({
  [SELF_DIAGNOSTIC_STATUS.CRITICAL]: 'Critical',
  [SELF_DIAGNOSTIC_STATUS.WARNING]: 'Warning',
  [SELF_DIAGNOSTIC_STATUS.HEALTHY]: 'Healthy',
});

function DiagnosticCard({ item }) {
  return (
    <article className={`self-diagnostics-card self-diagnostics-card--${item.status}`}>
      <header>
        <span>{STATUS_LABELS[item.status]}</span>
        <h3>{item.label}</h3>
      </header>
      <p>{item.detail}</p>
      {item.evidence.length > 0 && (
        <ul aria-label={`${item.label} evidence`}>
          {item.evidence.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      )}
      {item.remediation && <small>{item.remediation}</small>}
    </article>
  );
}

function StatusSection({ title, checks }) {
  return (
    <section className="self-diagnostics-section" aria-label={`${title} diagnostics`}>
      <header>
        <h2>{title}</h2>
        <strong>{checks.length}</strong>
      </header>
      <div className="self-diagnostics-list">
        {checks.length ? (
          checks.map((item) => <DiagnosticCard key={item.id} item={item} />)
        ) : (
          <p className="self-diagnostics-empty">No {title.toLowerCase()} checks.</p>
        )}
      </div>
    </section>
  );
}

export default function PlatformSelfDiagnostics() {
  const diagnostics = useMemo(() => buildPlatformSelfDiagnostics(), []);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = diagnostics.summary.categories.filter((category) => category.total > 0);

  const filteredByStatus = useMemo(() => {
    if (categoryFilter === 'all') return diagnostics.byStatus;
    return Object.fromEntries(
      Object.entries(diagnostics.byStatus).map(([status, checks]) => [
        status,
        checks.filter((item) => item.category === categoryFilter),
      ])
    );
  }, [categoryFilter, diagnostics.byStatus]);

  return (
    <main className="self-diagnostics-page">
      <section className="self-diagnostics-hero">
        <div>
          <p>Platform Self-Diagnostics</p>
          <h1>Platform Self-Diagnostics</h1>
          <span>CareDroid diagnoses itself before users discover problems.</span>
        </div>
      </section>

      <section className={`self-diagnostics-score self-diagnostics-score--${diagnostics.healthLabel.toLowerCase()}`} aria-label="Self diagnostics health score">
        <div>
          <span>Health score</span>
          <strong>{diagnostics.healthScore}</strong>
          <small>/100</small>
        </div>
        <div>
          <h2>{diagnostics.healthLabel}</h2>
          <p>
            Routes, APIs, inventory, auth, scrolling, layouts, backend contracts, executors, and
            assets are checked from canonical CareDroid inventories.
          </p>
        </div>
      </section>

      <section className="self-diagnostics-summary" aria-label="Self diagnostics summary">
        <div><span>Critical</span><strong>{diagnostics.summary.critical}</strong></div>
        <div><span>Warning</span><strong>{diagnostics.summary.warning}</strong></div>
        <div><span>Healthy</span><strong>{diagnostics.summary.healthy}</strong></div>
        <div><span>Total checks</span><strong>{diagnostics.summary.total}</strong></div>
      </section>

      <section className="self-diagnostics-toolbar" aria-label="Diagnostics category filter">
        <label>
          <span>Category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.category} value={category.category}>
                {category.category}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="self-diagnostics-category-grid" aria-label="Diagnostics category summary">
        {categories.map((category) => (
          <article key={category.category}>
            <h2>{category.category}</h2>
            <p>
              {category.critical} critical, {category.warning} warning, {category.healthy} healthy
            </p>
          </article>
        ))}
      </section>

      <div className="self-diagnostics-status-grid">
        <StatusSection title="Critical" checks={filteredByStatus.critical} />
        <StatusSection title="Warning" checks={filteredByStatus.warning} />
        <StatusSection title="Healthy" checks={filteredByStatus.healthy} />
      </div>
    </main>
  );
}
