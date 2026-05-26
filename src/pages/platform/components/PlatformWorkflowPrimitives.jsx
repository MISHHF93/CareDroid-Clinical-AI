import ApiStateBanner from '../../../components/ApiStateBanner';

export function PlatformPageShell({ eyebrow, title, summary, error, children }) {
  return (
    <main className="platform-system-page" aria-labelledby="platform-workflow-title">
      <section className="platform-system-hero">
        <div>
          <p className="platform-system-eyebrow">{eyebrow}</p>
          <h1 id="platform-workflow-title">{title}</h1>
          <p>{summary}</p>
        </div>
      </section>
      <ApiStateBanner error={error} />
      {children}
    </main>
  );
}

export function PlatformMetricGrid({ metrics }) {
  return (
    <section className="platform-system-grid" aria-label="Platform workflow metrics">
      {metrics.map((metric) => (
        <article className="platform-card" key={metric.label}>
          <h2>{metric.label}</h2>
          <p className="platform-workflow-metric">{metric.value}</p>
          <span>{metric.help}</span>
        </article>
      ))}
    </section>
  );
}

export function PlatformEvidencePanel({ title = 'Evidence', data }) {
  return (
    <section className="platform-system-section" aria-labelledby={`${title.replace(/\s+/g, '-')}-title`}>
      <div className="platform-system-section__header">
        <h2 id={`${title.replace(/\s+/g, '-')}-title`}>{title}</h2>
        <p>Live, demo, and fallback data are visibly labeled so production readiness can fail closed.</p>
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}

function panelSummary(value) {
  if (Array.isArray(value)) return `${value.length} records`;
  if (!value || typeof value !== 'object') return String(value ?? 'Ready');
  if (value.status) return value.status;
  if (value.level) return value.level;
  if (value.action) return value.action;
  if (value.blocked !== undefined) return value.blocked ? 'Blocked' : 'Allowed';
  return `${Object.keys(value).length} signals`;
}

export function PlatformDashboardPanels({ panels = {} }) {
  const entries = Object.entries(panels);
  if (!entries.length) return null;

  return (
    <section className="platform-system-section" aria-labelledby="platform-dashboard-panels-title">
      <div className="platform-system-section__header">
        <h2 id="platform-dashboard-panels-title">Dashboard Panels</h2>
        <p>Governance and security controls are split into reviewable operational panels.</p>
      </div>
      <div className="platform-capability-list">
        {entries.map(([key, value]) => (
          <article className="platform-capability-card" key={key}>
            <span className="platform-capability-card__meta">{key.replace(/([A-Z])/g, ' $1')}</span>
            <strong>{panelSummary(value)}</strong>
            <span>{JSON.stringify(value).slice(0, 220)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PlatformDecisionPanel() {
  return (
    <section className="platform-system-section" aria-labelledby="platform-decision-title">
      <div className="platform-system-section__header">
        <h2 id="platform-decision-title">Human Review Gate</h2>
        <p>Approval, rejection, escalation, export, and writeback remain disabled until durable review records are approved.</p>
      </div>
      <div className="platform-capability-list">
        <article className="platform-capability-card">
          <strong>Fail-closed behavior</strong>
          <span>Missing governance, consent, validation, classification, or audit controls block production action.</span>
        </article>
        <article className="platform-capability-card">
          <strong>No autonomous action</strong>
          <span>CareDroid does not sign notes, place orders, write to an EHR, export PHI, or contact patients automatically.</span>
        </article>
      </div>
    </section>
  );
}
