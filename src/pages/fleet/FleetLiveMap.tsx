import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../../components/ApiStateBanner';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import StateSourceNotice from '../../components/StateSourceNotice';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  FLEET_VEHICLE_STATUS_LABELS,
  fetchFleetLiveTrackingSnapshot,
} from '../../services/fleetTelemetryService';
import {
  alertSeverityTone,
  buildRoutePolyline,
  routeStatusColor,
  vehicleMarkerTone,
} from '../../utils/fleetMapModel';
import './FleetLiveMap.css';

type FleetVehicle = {
  id: string;
  label: string;
  status: string;
  freshness?: string;
  mapPosition?: { x: number; y: number };
  heading?: number;
  destination?: string;
  etaMinutes?: number | null;
  driver?: string | null;
  speedMph?: number;
};

type FleetRoute = {
  id: string;
  name: string;
  vehicleId: string;
  status: string;
  etaMinutes?: number;
  stopsRemaining?: number;
  path?: Array<{ x: number; y: number }>;
};

type FleetAlert = {
  id: string;
  vehicleId: string;
  severity: string;
  title: string;
  detail: string;
};

type FleetSnapshot = {
  summary: Record<string, unknown>;
  vehicles: FleetVehicle[];
  routes: FleetRoute[];
  alerts: FleetAlert[];
  sourceLabel?: string;
  message?: string;
  fromApi?: boolean;
};

const MARKER_FILL: Record<string, string> = {
  brand: 'var(--app-chart-1)',
  action: 'var(--app-chart-4)',
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

function formatVehicleStatus(status: string) {
  return FLEET_VEHICLE_STATUS_LABELS[status] || status;
}

export default function FleetLiveMap() {
  useRouteChromeRegistration({ title: 'Fleet Live Map' });
  const { recordToolAccess } = useToolPreferences();
  const recordToolAccessRef = useRef(recordToolAccess);
  recordToolAccessRef.current = recordToolAccess;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [usedApi, setUsedApi] = useState(false);

  const loadSnapshot = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFleetLiveTrackingSnapshot({ signal, delayMs: 0 });
      if (signal?.aborted) return;
      setSnapshot(data as FleetSnapshot);
      setUsedApi(Boolean((data as FleetSnapshot).fromApi));
      recordToolAccessRef.current('fleet-live-map');
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Unable to load fleet map telemetry.');
      setSnapshot(null);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSnapshot(controller.signal);
    return () => controller.abort();
  }, [loadSnapshot]);

  const vehicles = snapshot?.vehicles || [];
  const routes = snapshot?.routes || [];
  const alerts = snapshot?.alerts || [];
  const summary = snapshot?.summary || {};
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;

  const sourceStates = useMemo(() => {
    if (usedApi) {
      return [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED];
    }
    return [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE, DEMO_LIVE_STATES.UNSUPPORTED];
  }, [usedApi]);

  const gridLines = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => index * 10).flatMap((value) => [
        { x1: value, y1: 0, x2: value, y2: 100 },
        { x1: 0, y1: value, x2: 100, y2: value },
      ]),
    [],
  );

  return (
    <section className="fleet-live-map-page" aria-label="Fleet live map">
      <header className="fleet-live-map-page__header">
        <div className="fleet-live-map-page__title-row">
          <GraphicIconBadge iconKey="ems" accent="brand" size="md" />
          <div>
            <p className="fleet-live-map-page__title-text" data-testid="cd-page-title-text">Fleet Live Map</p>
            <p>Demo vehicle positions, active routes, and operational alerts for dispatcher review.</p>
          </div>
        </div>
        <div className="fleet-live-map-page__actions">
          <Link to={CANONICAL_ROUTES.fleetCommand}>Fleet command</Link>
          <button type="button" onClick={() => void loadSnapshot()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh map'}
          </button>
        </div>
      </header>

      <ClinicalDecisionSupportDisclaimer variant="fleet" />
      <StateSourceNotice
        title="Fleet map source state"
        states={sourceStates}
        details={snapshot?.sourceLabel || snapshot?.message}
      />

      <ApiStateBanner
        loading={loading}
        loadingMessage="Loading fleet map telemetry…"
        error={error}
        onRetry={() => void loadSnapshot()}
      />

      {!loading && !error && snapshot ? (
        <div className="fleet-live-map__layout">
          <section className="fleet-live-map__map-shell" aria-label="Fleet map canvas">
            <div
              className="fleet-live-map-canvas fleet-map-canvas"
              role="group"
              aria-label="Fleet vehicle and route map — contains selectable vehicle markers"
            >
              <svg viewBox="0 0 100 100" className="fleet-live-map-canvas__svg" preserveAspectRatio="xMidYMid meet">
                {gridLines.map((line, index) => (
                  <line
                    key={`grid-${index}`}
                    className="fleet-live-map-canvas__grid-line"
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                  />
                ))}

                {routes.map((route) => (
                  <polyline
                    key={route.id}
                    className="fleet-live-map-canvas__route"
                    points={buildRoutePolyline(route.path)}
                    stroke={routeStatusColor(route.status)}
                    strokeDasharray={route.status === 'delayed' ? '2 1.5' : undefined}
                  />
                ))}

                {vehicles.map((vehicle) => {
                  const position = vehicle.mapPosition || { x: 50, y: 50 };
                  const tone = vehicleMarkerTone(vehicle.status, vehicle.freshness);
                  const selected = vehicle.id === selectedVehicleId;
                  return (
                    <g
                      key={vehicle.id}
                      className={`fleet-live-map-canvas__marker${selected ? ' fleet-live-map-canvas__marker--selected' : ''}`}
                      transform={`translate(${position.x} ${position.y})`}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${vehicle.label}, ${formatVehicleStatus(vehicle.status)}`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedVehicleId(vehicle.id);
                        }
                      }}
                    >
                      <circle r="2.4" fill={MARKER_FILL[tone]} />
                      <text x="3" y="1.2">{vehicle.id}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {selectedVehicle ? (
              <p className="fleet-live-map__state">
                <strong>{selectedVehicle.label}</strong> — {formatVehicleStatus(selectedVehicle.status)}
                {selectedVehicle.destination ? ` · ${selectedVehicle.destination}` : ''}
                {selectedVehicle.etaMinutes != null ? ` · ETA ${selectedVehicle.etaMinutes}m` : ''}
                {selectedVehicle.speedMph != null ? ` · ${selectedVehicle.speedMph} mph` : ''}
              </p>
            ) : (
              <p className="fleet-live-map__state">Select a vehicle marker to inspect route context.</p>
            )}
          </section>

          <aside className="fleet-live-map__panel" aria-label="Fleet map intelligence">
            <div>
              <h2>Operational summary</h2>
              <div className="fleet-live-map__metrics" role="group" aria-label="Fleet map summary metrics">
                <article className="fleet-live-map__metric">
                  <span>Active units</span>
                  <strong>{String(summary.activeVehicles ?? 0)}</strong>
                </article>
                <article className="fleet-live-map__metric">
                  <span>Active routes</span>
                  <strong>{String(summary.activeRoutes ?? routes.length)}</strong>
                </article>
                <article className="fleet-live-map__metric">
                  <span>Delayed routes</span>
                  <strong>{String(summary.delayedRoutes ?? 0)}</strong>
                </article>
                <article className="fleet-live-map__metric">
                  <span>Alerts</span>
                  <strong>{String(summary.activeAlerts ?? alerts.length)}</strong>
                </article>
              </div>
            </div>

            <div>
              <h3>Active alerts</h3>
              <div className="fleet-live-map__alerts">
                {alerts.length ? (
                  alerts.slice(0, 6).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="fleet-live-map__alert"
                      data-tone={alertSeverityTone(alert.severity)}
                      onClick={() => setSelectedVehicleId(alert.vehicleId)}
                    >
                      <strong>{alert.title}</strong>
                      <span>{alert.detail}</span>
                      <small>{alert.vehicleId}</small>
                    </button>
                  ))
                ) : (
                  <p className="fleet-live-map__state">No active fleet alerts.</p>
                )}
              </div>
            </div>

            <div>
              <h3>Vehicle roster</h3>
              <div className="fleet-live-map__vehicles">
                {vehicles.length ? (
                  vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      className={`fleet-live-map__vehicle${
                        vehicle.id === selectedVehicleId ? ' fleet-live-map__vehicle--selected' : ''
                      }`}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                    >
                      <strong>{vehicle.label}</strong>
                      <span>{formatVehicleStatus(vehicle.status)}</span>
                      <small>
                        {vehicle.driver ? `Driver ${vehicle.driver}` : 'No driver assigned'}
                        {vehicle.freshness ? ` · ${vehicle.freshness} GPS` : ''}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="fleet-live-map__state">No vehicles are reporting map coordinates.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}