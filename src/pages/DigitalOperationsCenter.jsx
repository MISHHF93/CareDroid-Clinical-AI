import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission, useUser } from '../contexts/UserContext';
import {
  getOperationsCenterRoleView,
  getOperationsCenterSnapshot,
  searchOperationsCenterSurfaces,
} from '../data/digitalOperationsCenter';
import './DigitalOperationsCenter.css';

function SurfaceCard({ surface }) {
  return (
    <article className="operations-center-card">
      <div className="operations-center-card__header">
        <div>
          <p className="operations-center-eyebrow">{surface.domain}</p>
          <h3>{surface.title}</h3>
        </div>
        <span className="operations-center-badge">{surface.status}</span>
      </div>
      <p>{surface.summary}</p>
      <dl>
        {surface.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="operations-center-card__actions">
        <Link to={surface.path}>Open {surface.title}</Link>
      </div>
    </article>
  );
}

export default function DigitalOperationsCenter() {
  const { user, hasPermission } = useUser();
  const [query, setQuery] = useState('');
  const roleView = useMemo(
    () =>
      getOperationsCenterRoleView({
        role: user?.role,
        hasPermission,
      }),
    [hasPermission, user?.role]
  );
  const snapshot = useMemo(() => getOperationsCenterSnapshot(), []);
  const filteredSurfaces = useMemo(() => searchOperationsCenterSurfaces(query), [query]);
  const canManageIncidents = hasPermission(Permission.MANAGE_INCIDENTS);
  const canViewObservability = hasPermission(Permission.VIEW_OBSERVABILITY);

  return (
    <main className="operations-center-page">
      <section className="operations-center-hero" aria-labelledby="operations-center-title">
        <div>
          <p className="operations-center-eyebrow">{snapshot.safetyLabel}</p>
          <h1 id="operations-center-title">Digital Operations Center</h1>
          <p>
            Single operational command center combining Digital Twin, Hospital Map, Medical IoT,
            Fleet, Notifications, and System Health into role-based views.
          </p>
        </div>
        <div className="operations-center-hero__actions">
          <Link to="/digital-twin">Digital Twin</Link>
          <Link to="/hospital-map">Hospital Map</Link>
          <Link to="/medical-iot">Medical IoT</Link>
          <Link to="/fleet/command">Fleet</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/system-health">System Health</Link>
        </div>
      </section>

      <section className="operations-center-stats" aria-label="Operations center summary">
        <article className="operations-center-stat">
          <p>Command source</p>
          <strong>{snapshot.sourceStatus}</strong>
        </article>
        <article className="operations-center-stat">
          <p>Combined surfaces</p>
          <strong>{snapshot.surfaceCount}</strong>
        </article>
        <article className="operations-center-stat">
          <p>Alert-bearing surfaces</p>
          <strong>{snapshot.alertSurfaceCount}</strong>
        </article>
        <article className="operations-center-stat">
          <p>Role view</p>
          <strong>{roleView.label}</strong>
        </article>
      </section>

      <section className="operations-center-panel" aria-labelledby="role-view-heading">
        <div>
          <p className="operations-center-eyebrow">Role-based view</p>
          <h2 id="role-view-heading">{roleView.label}</h2>
          <p className="operations-center-muted">{roleView.focus}</p>
        </div>
        <div className="operations-center-chip-row" aria-label="Role permissions context">
          <span className="operations-center-badge">
            Incidents: {canManageIncidents ? 'manage' : 'review'}
          </span>
          <span className="operations-center-badge">
            Observability: {canViewObservability ? 'enabled' : 'limited'}
          </span>
          <span className="operations-center-badge">Role: {roleView.role}</span>
        </div>
        <div className="operations-center-grid operations-center-grid--two">
          <article className="operations-center-card">
            <h3>Priority lane</h3>
            <ul>
              {roleView.prioritySurfaces.map((surface) => (
                <li key={surface.id}>
                  <Link to={surface.path}>{surface.title}</Link> - {surface.domain}
                </li>
              ))}
            </ul>
          </article>
          <article className="operations-center-card">
            <h3>Incident focus</h3>
            <ul>
              {roleView.incidentFocus.map((focus) => <li key={focus}>{focus}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="operations-center-panel" aria-label="Operations center search">
        <div className="operations-center-search">
          <input
            type="search"
            aria-label="Search operations center"
            placeholder="Search Digital Twin, Hospital Map, Medical IoT, Fleet, Notifications, System Health..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="operations-center-panel" aria-labelledby="combined-surfaces-heading">
        <div>
          <p className="operations-center-eyebrow">Single operational command center</p>
          <h2 id="combined-surfaces-heading">Combined operational surfaces</h2>
          <p className="operations-center-muted">
            Every card preserves the existing route while giving operations one command-center launch
            point.
          </p>
        </div>
        <div className="operations-center-grid">
          {filteredSurfaces.map((surface) => <SurfaceCard key={surface.id} surface={surface} />)}
        </div>
      </section>
    </main>
  );
}
