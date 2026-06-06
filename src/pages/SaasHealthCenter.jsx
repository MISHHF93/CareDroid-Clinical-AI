import { useEffect, useMemo, useState } from 'react';
import { fetchSaasHealthCenter, SAAS_HEALTH_FALLBACK } from '../services/saasHealthApi';
import './SaasHealthCenter.css';

const STATUS_ORDER = ['critical', 'warning', 'healthy'];

function statusClass(status = 'warning') {
  return `saas-health-status--${status}`;
}

function groupChecks(checks = []) {
  return STATUS_ORDER.map((status) => ({
    status,
    label: status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical',
    checks: checks.filter((check) => check.status === status),
  }));
}

export default function SaasHealthCenter() {
  const [state, setState] = useState({
    loading: true,
    health: SAAS_HEALTH_FALLBACK,
    message: '',
    sourceStatus: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    fetchSaasHealthCenter().then((result) => {
      if (cancelled) return;
      setState({
        loading: false,
        health: result.data || SAAS_HEALTH_FALLBACK,
        message: result.message || '',
        sourceStatus: result.ok ? 'live' : 'fallback',
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => groupChecks(state.health?.checks || []), [state.health]);
  const generatedAt = state.health?.generatedAt
    ? new Date(state.health.generatedAt).toLocaleString()
    : 'Not reported';

  return (
    <section className="saas-health-page" aria-labelledby="saas-health-title">
      <div className="saas-health-hero">
        <div>
          <p className="saas-health-eyebrow">SaaS operations</p>
          <h1 id="saas-health-title">SaaS Health Center</h1>
          <p>
            Monitor frontend, backend, API, integrations, tenant, AI, and simulation health in one
            operational view.
          </p>
        </div>
        <div className={`saas-health-overall ${statusClass(state.health?.status)}`} role="status">
          <span>{state.loading ? 'Checking' : state.health?.label || 'Warning'}</span>
          <strong>{state.sourceStatus}</strong>
        </div>
      </div>

      {state.message && <p className="saas-health-message">{state.message}</p>}

      <div className="saas-health-summary" aria-label="SaaS health summary">
        {['healthy', 'warning', 'critical'].map((status) => (
          <article key={status} className={`saas-health-summary-card ${statusClass(status)}`}>
            <span>{status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'}</span>
            <strong>{state.health?.summary?.[status] ?? 0}</strong>
          </article>
        ))}
        <article className="saas-health-summary-card">
          <span>Last checked</span>
          <strong>{generatedAt}</strong>
        </article>
      </div>

      <div className="saas-health-grid">
        {(state.health?.checks || []).map((check) => (
          <article key={check.id} className={`saas-health-card ${statusClass(check.status)}`}>
            <div className="saas-health-card__header">
              <div>
                <span>{check.displayStatus}</span>
                <h2>{check.label}</h2>
              </div>
            </div>
            <p>{check.summary}</p>
            <ul>
              {(check.evidence || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="saas-health-section" aria-labelledby="saas-health-by-status">
        <h2 id="saas-health-by-status">Status Groups</h2>
        <div className="saas-health-groups">
          {groups.map((group) => (
            <article key={group.status} aria-label={`${group.label} SaaS checks`}>
              <h3>{group.label}</h3>
              {group.checks.length ? (
                <ul>
                  {group.checks.map((check) => (
                    <li key={check.id}>{check.label}</li>
                  ))}
                </ul>
              ) : (
                <p>No checks in this state.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
