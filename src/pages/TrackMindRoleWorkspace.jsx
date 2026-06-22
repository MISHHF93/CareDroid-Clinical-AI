import { Link } from 'react-router-dom';
import useTrackMindRolePermissions from '../hooks/useTrackMindRolePermissions';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { TRACKMIND_ROLE_OPTIONS } from '../config/trackMindRolePermissions';
import './TrackMindRoleWorkspace.css';

function KpiCard({ kpi }) {
  return (
    <article className="tmws-kpi" data-kpi-id={kpi.id}>
      <span>{kpi.label}</span>
      <strong aria-label={`${kpi.label} value`}>—</strong>
      <em>{kpi.domain}</em>
    </article>
  );
}

export default function TrackMindRoleWorkspace() {
  const trackMind = useTrackMindRolePermissions();

  return (
    <div className="tmws-page">
      <header className="tmws-hero">
        <div>
          <p className="tmws-eyebrow">TrackMind Nexus · {trackMind.roleLabel}</p>
          <h1>{trackMind.workspace.title}</h1>
          <p>{trackMind.workspace.subtitle}</p>
        </div>
        <div className="tmws-role-switch" aria-label="Demo role switcher">
          <label htmlFor="trackmind-role-select">Operating role</label>
          <select
            id="trackmind-role-select"
            value={trackMind.role}
            onChange={(event) => trackMind.setDemoRole(event.target.value)}
          >
            {TRACKMIND_ROLE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {trackMind.readOnly ? (
        <p className="tmws-readonly-banner" role="status">
          Read-only role — operational edits and approvals are disabled.
        </p>
      ) : null}

      <section className="tmws-kpis" aria-label="Role KPIs">
        {trackMind.kpis.length ? (
          trackMind.kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)
        ) : (
          <p className="tmws-empty">No KPIs assigned for this role.</p>
        )}
      </section>

      <section className="tmws-actions" aria-label="Quick actions">
        <h2>Quick actions</h2>
        <div className="tmws-action-row">
          {trackMind.quickActions.length ? (
            trackMind.quickActions.map((action) =>
              action.route ? (
                <Link key={action.id} className="tmws-action" to={action.route}>
                  {action.label}
                </Link>
              ) : (
                <button key={action.id} type="button" className="tmws-action" disabled={trackMind.readOnly}>
                  {action.label}
                </button>
              ),
            )
          ) : (
            <p className="tmws-empty">No quick actions for this role.</p>
          )}
        </div>
      </section>

      <section className="tmws-links" aria-label="Related modules">
        <h2>Related modules</h2>
        <div className="tmws-link-row">
          {trackMind.workspace.relatedRoutes.map((route) => (
            <Link key={route} to={route}>
              {route}
            </Link>
          ))}
        </div>
      </section>

      <section className="tmws-meta" aria-label="Role governance summary">
        <h2>Governance posture</h2>
        <ul>
          <li>Scope: {trackMind.primaryScope}</li>
          <li>Notification channels: {trackMind.notificationChannels.join(', ') || 'none'}</li>
          <li>Audit export: {trackMind.canExportAudit() ? 'allowed' : 'blocked'}</li>
          <li>Veterinary visibility: {trackMind.canViewPrivacyScope('veterinary_medical') ? 'yes' : 'no'}</li>
        </ul>
        <Link className="tmws-home-link" to={CANONICAL_ROUTES.trackMindMaturity}>
          View maturity framework
        </Link>
      </section>
    </div>
  );
}
