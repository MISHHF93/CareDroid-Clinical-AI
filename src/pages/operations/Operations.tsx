import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  getOperationsCenterRoleView,
  getOperationsCenterSnapshot,
  OPERATIONS_CENTER_SURFACES,
  searchOperationsCenterSurfaces,
} from '../../data/digitalOperationsCenter';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useOperationsHubLiveFeeds } from '../../hooks/useOperationsHubLiveFeeds';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { applyLiveMetricsToSurfaces } from '../../utils/operationsHubLiveMetrics';
import './Operations.css';

const SURFACE_ICON: Record<string, string> = {
  'digital-twin': 'layout-dashboard',
  'hospital-map': 'layout-dashboard',
  'medical-iot': 'activity',
  fleet: 'ems',
  notifications: 'alerts',
  'system-health': 'shield-check',
};

const OPERATIONS_ROLE_ALIASES: Record<string, string> = {
  admin: 'admin',
  administrator: 'admin',
  physician: 'physician',
  doctor: 'physician',
  nurse: 'nurse',
  student: 'student',
  trainee: 'student',
};

function resolveOperationsRole(role: string) {
  const normalized = String(role || 'default').toLowerCase();
  return OPERATIONS_ROLE_ALIASES[normalized] || 'default';
}

export default function Operations() {
  const { role, allowedActions = [] } = useEmergencyRolePermissions();
  const [query, setQuery] = useState('');
  const { loading, liveFeeds, lastRefreshed, liveFeedCount, refresh } = useOperationsHubLiveFeeds({
    source: 'Operations',
    refreshIntervalMs: 60_000,
  });

  const operationsRole = resolveOperationsRole(role);
  const hasPermission = useCallback(
    (permission: string) => (allowedActions || []).includes(permission),
    [allowedActions],
  );

  const roleView = useMemo(
    () => getOperationsCenterRoleView({ role: operationsRole, hasPermission }),
    [hasPermission, operationsRole],
  );
  const snapshot = useMemo(() => getOperationsCenterSnapshot(), []);

  const enrichedSurfaces = useMemo(
    () => applyLiveMetricsToSurfaces(OPERATIONS_CENTER_SURFACES, liveFeeds),
    [liveFeeds],
  );

  const enrichedPrioritySurfaces = useMemo(
    () =>
      roleView.prioritySurfaceIds
        .map((id) => enrichedSurfaces.find((surface) => surface.id === id))
        .filter(Boolean),
    [enrichedSurfaces, roleView.prioritySurfaceIds],
  );

  const accessibleSurfaces = useMemo(
    () =>
      enrichedSurfaces.filter((surface) =>
        roleView.accessibleSurfaces.some((accessible) => accessible.id === surface.id),
      ),
    [enrichedSurfaces, roleView.accessibleSurfaces],
  );

  const filteredSurfaces = useMemo(
    () => searchOperationsCenterSurfaces(query, accessibleSurfaces),
    [accessibleSurfaces, query],
  );

  const liveSurfaceCount = liveFeedCount;

  return (
    <main className="operations-hub" aria-label="Operations hub">
      <header className="operations-hub__header">
        <div className="operations-hub__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <h1>Default Operations</h1>
            <p>Unified command surfaces for hospital capacity, device telemetry, fleet, and system health.</p>
          </div>
        </div>
        <div className="operations-hub__actions">
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.liveMap}>Live tracking map</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.medical3dViewer}>3D viewer</Link>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </header>

      <StateSourceNotice
        title="Operations hub source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED]}
        details={`${snapshot.safetyLabel}${lastRefreshed ? ` · live scan ${lastRefreshed.toLocaleTimeString()}` : ''}`}
      />

      <p className="operations-hub__role">
        <strong>{roleView.label}</strong> — {roleView.focus}
      </p>
      <p className="operations-hub__focus">
        Incident focus: {roleView.incidentFocus.join(' · ')}
      </p>

      <div className="operations-hub__metrics" role="group" aria-label="Operations hub summary metrics">
        <MetricCard
          label="Surfaces"
          value={String(snapshot.surfaceCount)}
          hint="Operational modules in this hub"
          tone="neutral"
        />
        <MetricCard
          label="Live feeds"
          value={String(liveSurfaceCount)}
          hint="Telemetry sources in latest scan"
          tone={liveSurfaceCount > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Priority routes"
          value={String(enrichedPrioritySurfaces.length)}
          hint="Role-scoped launch targets"
          tone="neutral"
        />
      </div>

      <input
        type="search"
        className="operations-hub__search"
        placeholder="Search operational surfaces…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search operational surfaces"
      />

      <h2 className="operations-hub__section-title">Priority surfaces</h2>
      <div className="operations-hub__grid">
        {enrichedPrioritySurfaces.map((surface) => (
          <Link key={surface.id} to={surface.path} className="operations-hub__surface">
            <GraphicIconBadge iconKey={SURFACE_ICON[surface.id] || 'route'} accent="information" size="sm" />
            <h2>{surface.title}</h2>
            <p>{surface.summary}</p>
            <div className="operations-hub__surface-meta">
              <span>{surface.domain}</span>
              <span>{surface.status}</span>
            </div>
            <div className="operations-hub__surface-metrics">
              {surface.metrics.map((metric) => (
                <span key={metric.label}>
                  {metric.label}: {metric.value}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <h2 className="operations-hub__section-title">All accessible surfaces</h2>
      <div className="operations-hub__grid">
        {filteredSurfaces.length ? (
          filteredSurfaces.map((surface) => (
            <Link key={`all-${surface.id}`} to={surface.path} className="operations-hub__surface">
              <h2>{surface.title}</h2>
              <p>{surface.summary}</p>
              <div className="operations-hub__surface-meta">
                <span>{surface.domain}</span>
                <span>{surface.status}</span>
              </div>
              <div className="operations-hub__surface-metrics">
                {surface.metrics.map((metric) => (
                  <span key={`${surface.id}-${metric.label}`}>
                    {metric.label}: {metric.value}
                  </span>
                ))}
              </div>
            </Link>
          ))
        ) : (
          <p className="operations-hub__role">No operational surfaces match the current search.</p>
        )}
      </div>
    </main>
  );
}