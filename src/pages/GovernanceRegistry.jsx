import { useEffect, useMemo, useState } from 'react';
import StateSourceNotice from '../components/StateSourceNotice';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './GovernanceRegistry.css';

const REQUIRED_COLUMNS = [
  ['owner', 'Owner'],
  ['steward', 'Steward'],
  ['approver', 'Approver'],
  ['riskLevel', 'Risk Level'],
  ['evidenceSource', 'Evidence Source'],
  ['version', 'Version'],
  ['auditRequirement', 'Audit Requirement'],
  ['reviewSchedule', 'Review Schedule'],
];

function titleCase(value = '') {
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskTone(riskLevel = '') {
  if (/high|governance-required/i.test(riskLevel)) return 'high';
  if (/clinical|operational/i.test(riskLevel)) return 'medium';
  return 'low';
}

export default function GovernanceRegistry() {
  const [registry, setRegistry] = useState({ rows: [], summary: {}, requiredFields: [] });
  const [filters, setFilters] = useState({ query: '', riskLevel: 'all' });
  const [status, setStatus] = useState('Loading governance registry...');

  useEffect(() => {
    let active = true;
    PlatformAssetsApi.getGovernanceRegistry(filters)
      .then((data) => {
        if (!active) return;
        setRegistry(data);
        setStatus('');
      })
      .catch((error) => {
        if (active) setStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const rows = registry.rows || [];
  const riskOptions = useMemo(
    () => ['all', ...Object.keys(registry.summary?.byRiskLevel || {}).sort()],
    [registry.summary?.byRiskLevel]
  );

  return (
    <main className="governance-registry" aria-labelledby="governance-registry-title">
      <header className="governance-registry-hero">
        <p className="governance-registry-eyebrow">Platform Governance Registry</p>
        <h1 id="governance-registry-title">Platform Governance Registry</h1>
        <p>
          Track owner, steward, approver, risk, evidence, versioning, audit requirements, and review
          cadence for every CareDroid platform asset.
        </p>
        {status && <p className="governance-registry-status">{status}</p>}
      </header>

      <StateSourceNotice
        title="Governance registry source states"
        states={[
          DEMO_LIVE_STATES.LIVE,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Registry rows come from the platform assets backend when available. If the registry backend is unavailable, this page shows the unavailable state instead of presenting fallback rows as live governance evidence."
      />

      <section className="governance-registry-summary" aria-label="Governance registry summary">
        <article>
          <span>Total Assets</span>
          <strong>{registry.summary?.totalAssets || 0}</strong>
        </article>
        <article>
          <span>Complete</span>
          <strong>{registry.summary?.complete || 0}</strong>
        </article>
        <article>
          <span>Audit Required</span>
          <strong>{registry.summary?.auditRequired || 0}</strong>
        </article>
        <article>
          <span>Human Review</span>
          <strong>{registry.summary?.humanReviewRequired || 0}</strong>
        </article>
      </section>

      <section className="governance-registry-panel">
        <header>
          <div>
            <h2>Registry Controls</h2>
            <p>Filter by asset text or risk level while preserving the required governance fields.</p>
          </div>
          <div className="governance-registry-filters">
            <label>
              <span>Search assets</span>
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Owner, asset, route, pack"
              />
            </label>
            <label>
              <span>Risk level</span>
              <select
                value={filters.riskLevel}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, riskLevel: event.target.value }))
                }
              >
                {riskOptions.map((riskLevel) => (
                  <option key={riskLevel} value={riskLevel}>
                    {riskLevel === 'all' ? 'All risk levels' : titleCase(riskLevel)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <div className="governance-registry-required">
          {REQUIRED_COLUMNS.map(([, label]) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="governance-registry-panel">
        <header>
          <div>
            <h2>Asset Governance</h2>
            <p>{rows.length} assets currently match the registry filters.</p>
          </div>
        </header>
        <div className="governance-registry-table" role="table" aria-label="Asset governance registry">
          <div role="row" className="governance-registry-row governance-registry-row--head">
            <span role="columnheader">Asset</span>
            {REQUIRED_COLUMNS.map(([, label]) => (
              <span role="columnheader" key={label}>
                {label}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <article key={row.assetId} role="row" className="governance-registry-row">
              <div role="cell">
                <strong>{row.title}</strong>
                <span>{row.assetId}</span>
                <span>{row.route || 'No route'}</span>
              </div>
              <span role="cell">{row.owner}</span>
              <span role="cell">{row.steward}</span>
              <span role="cell">{row.approver}</span>
              <span role="cell" className={`governance-registry-risk governance-registry-risk--${riskTone(row.riskLevel)}`}>
                {titleCase(row.riskLevel)}
              </span>
              <span role="cell">{row.evidenceSource}</span>
              <span role="cell">{row.version}</span>
              <span role="cell">{titleCase(row.auditRequirement)}</span>
              <span role="cell">{titleCase(row.reviewSchedule)}</span>
            </article>
          ))}
          {!rows.length && <p>No assets match the current governance registry filters.</p>}
        </div>
      </section>
    </main>
  );
}
