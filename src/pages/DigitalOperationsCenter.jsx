import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission, useUser } from '../contexts/UserContext';
import {
  getOperationsCenterRoleView,
  getOperationsCenterSnapshot,
  searchOperationsCenterSurfaces,
} from '../data/digitalOperationsCenter';
import {
  ActionRow,
  DashboardCard,
  DashboardGrid,
  DashboardSection,
  FilterPanel,
  MetricCard,
  PageShell,
} from '../components/ui/CareDroidPrimitives';
import './DigitalOperationsCenter.css';

function SurfaceCard({ surface }) {
  return (
    <DashboardCard
      className="operations-center-card"
      title={surface.title}
      description={surface.summary}
      meta={surface.status}
    >
      <div className="operations-center-card__header">
        <div>
          <p className="operations-center-eyebrow">{surface.domain}</p>
        </div>
      </div>
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
    </DashboardCard>
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
    <PageShell
      className="operations-center-page"
      contentClassName="cd-page-stack cd-page-stack--compact operations-center-page__content"
      eyebrow={snapshot.safetyLabel}
      title="Digital Operations Center"
      titleId="operations-center-title"
      description="Single operational command center combining Digital Twin, Hospital Map, Medical IoT, Fleet, Notifications, and System Health into role-based views."
      actions={
        <ActionRow align="end" className="operations-center-hero__actions">
          <Link to="/digital-twin">Digital Twin</Link>
          <Link to="/hospital-map">Hospital Map</Link>
          <Link to="/medical-iot">Medical IoT</Link>
          <Link to="/fleet/command">Fleet</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/system-health">System Health</Link>
        </ActionRow>
      }
    >

      <DashboardGrid variant="metrics" className="operations-center-stats" aria-label="Operations center summary">
        <MetricCard label="Command source" value={snapshot.sourceStatus} />
        <MetricCard label="Combined surfaces" value={snapshot.surfaceCount} />
        <MetricCard label="Alert-bearing surfaces" value={snapshot.alertSurfaceCount} />
        <MetricCard label="Role view" value={roleView.label} />
      </DashboardGrid>

      <DashboardSection
        className="operations-center-panel"
        eyebrow="Role-based view"
        title={roleView.label}
        titleId="role-view-heading"
        description={roleView.focus}
        actions={
          <ActionRow className="operations-center-chip-row" aria-label="Role permissions context">
          <span className="operations-center-badge">
            Incidents: {canManageIncidents ? 'manage' : 'review'}
          </span>
          <span className="operations-center-badge">
            Observability: {canViewObservability ? 'enabled' : 'limited'}
          </span>
          <span className="operations-center-badge">Role: {roleView.role}</span>
          </ActionRow>
        }
      >
        <DashboardGrid variant="split" className="operations-center-grid operations-center-grid--two">
          <DashboardCard className="operations-center-card" title="Priority lane">
            <ul>
              {roleView.prioritySurfaces.map((surface) => (
                <li key={surface.id}>
                  <Link to={surface.path}>{surface.title}</Link> - {surface.domain}
                </li>
              ))}
            </ul>
          </DashboardCard>
          <DashboardCard className="operations-center-card" title="Incident focus">
            <ul>
              {roleView.incidentFocus.map((focus) => <li key={focus}>{focus}</li>)}
            </ul>
          </DashboardCard>
        </DashboardGrid>
      </DashboardSection>

      <FilterPanel className="operations-center-panel" aria-label="Operations center search">
        <div className="operations-center-search">
          <input
            type="search"
            aria-label="Search operations center"
            placeholder="Search Digital Twin, Hospital Map, Medical IoT, Fleet, Notifications, System Health..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </FilterPanel>

      <DashboardSection
        className="operations-center-panel"
        eyebrow="Single operational command center"
        title="Combined operational surfaces"
        titleId="combined-surfaces-heading"
        description="Every card preserves the existing route while giving operations one command-center launch point."
      >
        <DashboardGrid className="operations-center-grid">
          {filteredSurfaces.map((surface) => <SurfaceCard key={surface.id} surface={surface} />)}
        </DashboardGrid>
      </DashboardSection>
    </PageShell>
  );
}
