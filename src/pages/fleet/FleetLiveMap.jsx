import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import StateSourceNotice from '../../components/StateSourceNotice';
import {
  FLEET_MAINTENANCE_LABELS,
  FLEET_VEHICLE_STATUS_LABELS,
  fetchFleetLiveTrackingSnapshot,
} from '../../services/fleetTelemetryService';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  DashboardGrid,
  DashboardSection,
  FilterPanel,
  MetricCard,
  StatusBadge as CanonicalStatusBadge,
  WorkspaceSplit,
} from '../../components/ui/CareDroidPrimitives';
import FleetPageChrome from './FleetPageChrome';
import './FleetLiveMap.css';
import './fleetUxShared.css';

const TOOL_ID = 'fleet-live-map';
const STATUS_OPTIONS = ['all', 'active', 'occupied', 'available', 'maintenance'];
const FRESHNESS_OPTIONS = ['all', 'fresh', 'stale', 'offline'];
const FLEET_MAP_REFRESH_MS = 60_000;

function formatFleetTime(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toLocaleString();
}

function statusLabel(status) {
  return String(status || 'unknown').replace(/_/g, ' ');
}

function markerTone(vehicle) {
  if (vehicle.freshness === 'offline' || vehicle.status === 'maintenance') return 'critical';
  if (vehicle.freshness === 'stale' || vehicle.maintenanceStatus !== 'ok' || vehicle.energyPercent < 35) {
    return 'warning';
  }
  if (vehicle.status === 'available') return 'available';
  return 'active';
}

function pathToPolyline(path = []) {
  return path.map((point) => `${point.x * 10},${point.y * 6}`).join(' ');
}

function VehicleBadge({ value, tone }) {
  return (
    <CanonicalStatusBadge
      status={tone || value}
      className={`fleet-map-badge fleet-map-badge--${tone || value}`}
    >
      {statusLabel(value)}
    </CanonicalStatusBadge>
  );
}

function SummaryCard({ label, value, tone = 'neutral', hint }) {
  return (
    <MetricCard
      label={label}
      value={value}
      helper={hint}
      tone={tone}
      className={`fleet-map-summary-card fleet-map-summary-card--${tone}`}
    />
  );
}

function FleetMapCanvas({ vehicles, routes, selectedVehicleId, onSelectVehicle }) {
  return (
    <section className="fleet-map-panel" aria-labelledby="fleet-map-canvas-title">
      <div className="fleet-map-panel-header">
        <div>
          <h2 id="fleet-map-canvas-title">Fleet Vehicle Live Map</h2>
          <p>Coordinate map mock with route overlays, GPS markers, stale/offline states, and vehicle detail drawer.</p>
        </div>
        <VehicleBadge value="demo data" tone="demo" />
      </div>
      <div className="fleet-map-canvas" role="img" aria-label="Demo fleet tracking map with vehicle markers">
        <svg viewBox="0 0 1000 600" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="fleet-map-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" className="fleet-map-grid-line" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="1000" height="600" className="fleet-map-watermark" />
          <rect x="28" y="28" width="944" height="544" rx="28" className="fleet-map-shell" />
          <rect x="28" y="28" width="944" height="544" rx="28" fill="url(#fleet-map-grid)" />
          <path d="M 130 470 C 260 370, 410 330, 520 250 S 750 145, 870 115" className="fleet-map-road" />
          <path d="M 150 230 C 290 240, 410 360, 530 355 S 760 310, 870 380" className="fleet-map-road fleet-map-road--secondary" />
          {routes.map((route) => (
            <polyline
              key={route.id}
              points={pathToPolyline(route.path)}
              className={`fleet-map-route fleet-map-route--${route.status}`}
            />
          ))}
        </svg>
        <div className="fleet-map-marker-layer" aria-label="Vehicle markers">
          {vehicles.map((vehicle) => {
            const tone = markerTone(vehicle);
            return (
              <button
                key={vehicle.id}
                type="button"
                className={`fleet-map-marker fleet-map-marker--${tone}${selectedVehicleId === vehicle.id ? ' fleet-map-marker--selected' : ''}`}
                style={{ left: `${vehicle.mapPosition.x}%`, top: `${vehicle.mapPosition.y}%` }}
                onClick={() => onSelectVehicle(vehicle)}
                aria-label={`Open ${vehicle.label} details`}
              >
                <span>{vehicle.id.replace('VH-', '')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VehicleDetailDrawer({ vehicle, route, alerts, onClose }) {
  if (!vehicle) {
    return (
      <aside className="fleet-map-detail fleet-map-detail--empty" aria-label="Vehicle details">
        <h2>Vehicle Detail Drawer</h2>
        <p>Select a vehicle marker to review coordinates, freshness, ETA, route, energy, and alerts.</p>
      </aside>
    );
  }

  return (
    <aside className="fleet-map-detail" aria-label={`${vehicle.label} details`}>
      <div className="fleet-map-detail-header">
        <div>
          <p className="fleet-map-eyebrow">Vehicle Detail Drawer</p>
          <h2>{vehicle.label}</h2>
          <p>{vehicle.destination || 'No active destination'}</p>
        </div>
        <button type="button" className="fleet-map-icon-button" onClick={onClose} aria-label="Close vehicle details">
          <NavIcon icon={CHROME_ICONS.close} size={18} aria-hidden />
        </button>
      </div>

      <div className="fleet-map-detail-badges">
        <VehicleBadge value={FLEET_VEHICLE_STATUS_LABELS[vehicle.status] || vehicle.status} tone={markerTone(vehicle)} />
        <VehicleBadge value={vehicle.freshness} tone={vehicle.freshness === 'fresh' ? 'active' : markerTone(vehicle)} />
        <VehicleBadge value={FLEET_MAINTENANCE_LABELS[vehicle.maintenanceStatus] || vehicle.maintenanceStatus} />
      </div>

      <dl className="fleet-map-detail-grid">
        <div><dt>Coordinates</dt><dd>{vehicle.coordinates.latitude.toFixed(4)}, {vehicle.coordinates.longitude.toFixed(4)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatFleetTime(vehicle.lastSeenAt)}</dd></div>
        <div><dt>Source</dt><dd>{vehicle.locationSource}</dd></div>
        <div><dt>Driver</dt><dd>{vehicle.driver || 'Unassigned'}</dd></div>
        <div><dt>Heading / speed</dt><dd>{vehicle.heading} deg / {vehicle.speedMph} mph</dd></div>
        <div><dt>Energy</dt><dd>{vehicle.energyPercent}% {vehicle.energyType}</dd></div>
        <div><dt>Utilization</dt><dd>{vehicle.utilizationPercent}% active capacity</dd></div>
        <div><dt>ETA</dt><dd>{route?.etaMinutes != null ? `${route.etaMinutes} min` : vehicle.etaMinutes != null ? `${vehicle.etaMinutes} min` : 'No active ETA'}</dd></div>
        <div><dt>Route</dt><dd>{route?.name || 'No active route'}</dd></div>
      </dl>

      <section className="fleet-map-detail-section" aria-labelledby="fleet-alerts-title">
        <h3 id="fleet-alerts-title">Vehicle Alerts</h3>
        {alerts.length ? (
          <ul className="fleet-map-alert-list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
                <time dateTime={alert.triggeredAt}>{formatFleetTime(alert.triggeredAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fleet-map-empty">No active alerts for this demo vehicle.</p>
        )}
      </section>
    </aside>
  );
}

export default function FleetLiveMap() {
  const { recordToolAccess } = useToolPreferences();
  const [phase, setPhase] = useState('loading');
  const [snapshot, setSnapshot] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [freshnessFilter, setFreshnessFilter] = useState('all');
  const [routeOnly, setRouteOnly] = useState(false);
  const [search, setSearch] = useState('');
  const requestSeqRef = useRef(0);

  const loadSnapshot = useCallback(async (signal) => {
    const requestId = ++requestSeqRef.current;
    setPhase('loading');
    setErrorMessage('');
    try {
      const data = await fetchFleetLiveTrackingSnapshot({ signal });
      if (requestId !== requestSeqRef.current) return;
      setSnapshot(data);
      setSelectedVehicleId((current) => current || data.vehicles[0]?.id || null);
      setPhase(data.vehicles.length ? 'ready' : 'empty');
    } catch (error) {
      if (requestId !== requestSeqRef.current || error?.name === 'AbortError') return;
      setErrorMessage(error?.message || 'Unable to load fleet live tracking map.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    recordToolAccess(TOOL_ID);
    loadSnapshot(controller.signal);
    const refreshTimer = window.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      loadSnapshot(controller.signal);
    }, FLEET_MAP_REFRESH_MS);
    return () => {
      window.clearInterval(refreshTimer);
      controller.abort();
      requestSeqRef.current += 1;
    };
  }, [loadSnapshot, recordToolAccess]);

  const routesByVehicleId = useMemo(
    () => Object.fromEntries((snapshot?.routes || []).map((route) => [route.vehicleId, route])),
    [snapshot]
  );
  const alertsByVehicleId = useMemo(() => {
    const grouped = {};
    for (const alert of snapshot?.alerts || []) {
      grouped[alert.vehicleId] = grouped[alert.vehicleId] || [];
      grouped[alert.vehicleId].push(alert);
    }
    return grouped;
  }, [snapshot]);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (snapshot?.vehicles || []).filter((vehicle) => {
      if (statusFilter !== 'all' && vehicle.status !== statusFilter) return false;
      if (freshnessFilter !== 'all' && vehicle.freshness !== freshnessFilter) return false;
      if (routeOnly && !vehicle.routeId) return false;
      if (!query) return true;
      return [vehicle.id, vehicle.label, vehicle.driver, vehicle.destination, vehicle.status, vehicle.freshness]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [freshnessFilter, routeOnly, search, snapshot, statusFilter]);

  const visibleRoutes = useMemo(
    () => (snapshot?.routes || []).filter((route) => filteredVehicles.some((vehicle) => vehicle.id === route.vehicleId)),
    [filteredVehicles, snapshot]
  );
  const selectedVehicle = useMemo(
    () => (snapshot?.vehicles || []).find((vehicle) => vehicle.id === selectedVehicleId) || null,
    [selectedVehicleId, snapshot]
  );

  return (
    <div className="fleet-live-map-page">
      <FleetPageChrome
        toolId={TOOL_ID}
        title="Fleet Live Map"
        lead="Outdoor vehicle tracking map for fleet operations, route status, GPS freshness, dispatch support, and stale/offline visibility."
        safetyNote={
          <>
            <strong>Demo tracking support only.</strong> This map is not connected to vehicle GPS,
            does not dispatch units, and must not be used as the system of record for emergency
            response, clinical transport decisions, or autonomous routing.
          </>
        }
        mainId="fleet-live-map-main"
      >
        {phase === 'loading' ? (
          <section className="fleet-map-state" role="status" aria-label="Loading fleet live tracking map">
            <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
            <p>Loading fleet live tracking map...</p>
          </section>
        ) : null}

        {phase === 'error' ? (
          <section className="fleet-map-state fleet-map-state--error" role="alert">
            <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
            <div>
              <h2>Fleet live tracking unavailable</h2>
              <p>{errorMessage}</p>
              <button type="button" className="fleet-btn fleet-btn--secondary" onClick={() => loadSnapshot()}>
                Retry loading fleet map
              </button>
            </div>
          </section>
        ) : null}

        {phase === 'empty' ? (
          <section className="fleet-map-state" role="status">
            <h2>No vehicles on the map</h2>
            <p>No fleet GPS coordinates are reporting. Connect vehicle telematics before showing live tracking.</p>
          </section>
        ) : null}

        {phase === 'ready' && snapshot ? (
          <>
            <section className="fleet-map-source" role="status">
              <strong>{snapshot.sourceLabel}</strong>
              <span>Last updated: {formatFleetTime(snapshot.summary.updatedAt)}</span>
              <span>{snapshot.message}</span>
            </section>

            <StateSourceNotice
              title="Fleet map source states"
              states={[
                DEMO_LIVE_STATES.DEMO,
                DEMO_LIVE_STATES.MOCK,
                DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
                DEMO_LIVE_STATES.UNSUPPORTED,
              ]}
              details="Vehicle GPS, routes, alerts, and utilization are demo/mock tracking records. If the fleet telemetry backend is unavailable, the page uses demo fallback data; dispatch, autonomous routing, and emergency-response writes are unsupported."
            />

            <DashboardGrid variant="metrics" className="fleet-map-summary" aria-label="Fleet map status summary">
              <SummaryCard label="Vehicles" value={snapshot.summary.totalVehicles} />
              <SummaryCard label="Active/on job" value={snapshot.summary.activeVehicles} />
              <SummaryCard label="Available" value={snapshot.summary.availableVehicles} tone="good" />
              <SummaryCard label="Active routes" value={snapshot.summary.activeRoutes} />
              <SummaryCard label="Avg utilization" value={`${snapshot.summary.averageUtilizationPercent ?? 0}%`} />
              <SummaryCard label="Avg ETA" value={snapshot.summary.averageEtaMinutes == null ? 'N/A' : `${snapshot.summary.averageEtaMinutes}m`} />
              <SummaryCard label="Delayed routes" value={snapshot.summary.delayedRoutes} tone={snapshot.summary.delayedRoutes ? 'warning' : 'good'} />
              <SummaryCard label="Stale GPS" value={snapshot.summary.staleVehicles} tone={snapshot.summary.staleVehicles ? 'warning' : 'good'} />
              <SummaryCard label="Offline" value={snapshot.summary.offlineVehicles} tone={snapshot.summary.offlineVehicles ? 'critical' : 'good'} hint="Last updated required" />
              <SummaryCard label="Alerts" value={snapshot.summary.activeAlerts} tone={snapshot.summary.activeAlerts ? 'warning' : 'good'} />
            </DashboardGrid>

            <FilterPanel className="fleet-map-filters" aria-label="Fleet map filters">
              <label>
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status === 'all' ? 'All statuses' : statusLabel(FLEET_VEHICLE_STATUS_LABELS[status] || status)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>GPS freshness</span>
                <select value={freshnessFilter} onChange={(event) => setFreshnessFilter(event.target.value)}>
                  {FRESHNESS_OPTIONS.map((freshness) => (
                    <option key={freshness} value={freshness}>{freshness === 'all' ? 'All freshness states' : statusLabel(freshness)}</option>
                  ))}
                </select>
              </label>
              <label className="fleet-map-search">
                <span>Search vehicle, driver, destination</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try VH-312, Rivera, clinic..."
                />
              </label>
              <label className="fleet-map-check">
                <input type="checkbox" checked={routeOnly} onChange={(event) => setRouteOnly(event.target.checked)} />
                <span>Vehicles on active routes only</span>
              </label>
            </FilterPanel>

            <WorkspaceSplit ratio="wide" className="fleet-map-workspace">
              <FleetMapCanvas
                vehicles={filteredVehicles}
                routes={visibleRoutes}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={(vehicle) => setSelectedVehicleId(vehicle.id)}
              />
              <VehicleDetailDrawer
                vehicle={selectedVehicle}
                route={selectedVehicle ? routesByVehicleId[selectedVehicle.id] : null}
                alerts={selectedVehicle ? alertsByVehicleId[selectedVehicle.id] || [] : []}
                onClose={() => setSelectedVehicleId(null)}
              />
            </WorkspaceSplit>

            <DashboardSection className="fleet-map-roster" title="Vehicle Utilization" titleId="fleet-map-roster-title">
              <DashboardGrid className="fleet-map-roster-grid">
                {filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    className="fleet-map-roster-card"
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <strong>{vehicle.id}</strong>
                    <span>{FLEET_VEHICLE_STATUS_LABELS[vehicle.status] || vehicle.status}</span>
                    <span>ETA: {vehicle.etaMinutes == null ? 'N/A' : `${vehicle.etaMinutes}m`}</span>
                    <span>Utilization: {vehicle.utilizationPercent}%</span>
                    <span>Alerts: {(alertsByVehicleId[vehicle.id] || []).length}</span>
                  </button>
                ))}
              </DashboardGrid>
            </DashboardSection>

            {filteredVehicles.length === 0 ? (
              <section className="fleet-map-state" role="status">
                <h2>No map markers match the filters</h2>
                <p>Clear filters to show demo vehicle coordinates.</p>
              </section>
            ) : null}

            <section className="fleet-map-legend" aria-label="Fleet map status legend">
              <span><i className="fleet-map-dot fleet-map-dot--active" /> Active/on job</span>
              <span><i className="fleet-map-dot fleet-map-dot--available" /> Available</span>
              <span><i className="fleet-map-dot fleet-map-dot--warning" /> Stale/warning</span>
              <span><i className="fleet-map-dot fleet-map-dot--critical" /> Offline/maintenance</span>
            </section>

            <p className="fleet-no-automation-note" role="note">
              Map data is demo-only and may be stale. Tracking support only; no autonomous dispatch,
              no clinical transport decisioning, and no replacement for operational alarms.
            </p>

            <p className="fleet-map-related">
              Need the combined operations view? <Link to="/live-map">Open Live Tracking Map</Link>
            </p>
          </>
        ) : null}
      </FleetPageChrome>
    </div>
  );
}
