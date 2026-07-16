import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import DispatchIntelligencePanel from '../../components/fleet/DispatchIntelligencePanel';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { PLATFORM_AI_MODEL_REGISTRY } from '../../data/aiModelRegistry';
import {
  FLEET_MAINTENANCE_LABELS,
  FLEET_VEHICLE_STATUS_LABELS,
  fetchFleetCommandSnapshot,
} from '../../services/fleetTelemetryService';
import {
  buildFleetEtaChart,
  buildFleetMaintenanceChart,
  buildFleetStatusChart,
  buildFleetUtilizationChart,
} from '../../utils/fleetChartModel';
import './FleetDashboard.css';

const FLEET_DISPATCH_SAFETY_COPY =
  'Decision support only. Human dispatchers must approve all vehicle assignments, routing changes, and maintenance downtime before operational execution.';

const FLEET_AI_CAPABILITIES = PLATFORM_AI_MODEL_REGISTRY.filter((model) =>
  ['edgeAmbulance', 'federatedEmsTriage'].includes(model.platformServiceId),
);

type FleetVehicle = {
  id: string;
  label: string;
  status: string;
  maintenanceStatus: string;
  etaMinutes: number | null;
  energyType: string;
  energyPercent: number;
  utilizationPercent: number;
  driver: string | null;
};

type FleetSummary = {
  activeVehicles?: number;
  availableVehicles?: number;
  occupiedVehicles?: number;
  maintenanceCount?: number;
  totalVehicles?: number;
  averageUtilizationPercent?: number;
  averageEtaMinutes?: number | null;
  lowEnergyCount?: number;
  updatedAt?: string;
  source?: string;
};

function energyMeterLabel(energyType: string) {
  if (energyType === 'electric') return 'Battery level';
  return 'Fuel level';
}

function formatMaintenanceLabel(status: string) {
  return FLEET_MAINTENANCE_LABELS[status] || status.replace(/_/g, ' ');
}

function formatVehicleStatus(status: string) {
  return FLEET_VEHICLE_STATUS_LABELS[status] || status;
}

export default function FleetDashboard() {
  const { recordToolAccess } = useToolPreferences();
  const recordToolAccessRef = useRef(recordToolAccess);
  recordToolAccessRef.current = recordToolAccess;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<{
    summary: FleetSummary;
    vehicles: FleetVehicle[];
    alerts?: Array<{ vehicleId: string; severity: string; title: string }>;
    visualizations?: {
      statusDistribution?: Array<{ name: string; value: number }>;
      maintenanceRisk?: Array<{ name: string; value: number }>;
      etaTrend?: Array<{ label: string; value: number }>;
      dispatchLoadTrend?: Array<{ label: string; value: number }>;
    };
  } | null>(null);

  const loadSnapshot = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFleetCommandSnapshot({ signal });
      if (signal?.aborted) return;
      setSnapshot(data);
      recordToolAccessRef.current('fleet-command');
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Unable to load fleet telemetry.');
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

  const summary = snapshot?.summary || {};
  const vehicles = snapshot?.vehicles || [];
  const alerts = snapshot?.alerts || [];
  const visualizations = snapshot?.visualizations || {};

  const statusChart = useMemo(
    () => buildFleetStatusChart(visualizations.statusDistribution),
    [visualizations.statusDistribution],
  );
  const utilizationChart = useMemo(
    () => buildFleetUtilizationChart(visualizations.dispatchLoadTrend),
    [visualizations.dispatchLoadTrend],
  );
  const maintenanceChart = useMemo(
    () => buildFleetMaintenanceChart(visualizations.maintenanceRisk),
    [visualizations.maintenanceRisk],
  );
  const etaChart = useMemo(
    () => buildFleetEtaChart(visualizations.etaTrend),
    [visualizations.etaTrend],
  );

  const maintenanceBreakdown = useMemo(() => {
    const counts = vehicles.reduce<Record<string, number>>((acc, vehicle) => {
      const key = vehicle.maintenanceStatus || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts);
  }, [vehicles]);

  const showOperationalAlert =
    (summary.maintenanceCount || 0) >= 2 || (summary.lowEnergyCount || 0) >= 1;

  return (
    <div className="fleet-dashboard">
      <a className="fleet-dashboard__skip-link" href="#fleet-dashboard-main">
        Skip to main content
      </a>

      <header className="fleet-dashboard__header">
        <GraphicIconBadge iconKey="ems" accent="brand" size="md" />
        <div>
          <h1>Fleet Command Dashboard</h1>
          <p>Live fleet telemetry, utilization signals, and governed dispatch decision support.</p>
        </div>
      </header>

      <ClinicalDecisionSupportDisclaimer variant="fleet" />
      <p className="fleet-dashboard__safety">{FLEET_DISPATCH_SAFETY_COPY}</p>

      {loading ? (
        <p className="fleet-dashboard__state" role="status" aria-live="polite">
          Loading fleet telemetry…
        </p>
      ) : null}

      {!loading && error ? (
        <div className="fleet-dashboard-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void loadSnapshot()}>
            Retry loading fleet telemetry
          </button>
        </div>
      ) : null}

      {!loading && !error && snapshot ? (
        <main id="fleet-dashboard-main">
          {showOperationalAlert ? (
            <div className="fleet-dashboard__alert" role="alert">
              <strong>Operational attention required.</strong>
              <p>
                Review maintenance and energy thresholds before dispatching additional units.
                {(summary.lowEnergyCount || 0) > 0
                  ? ` Low-energy units: ${summary.lowEnergyCount}.`
                  : ''}
              </p>
            </div>
          ) : null}

          <section className="fleet-dashboard__section" aria-labelledby="fleet-summary-title">
            <div className="fleet-dashboard__section-header">
              <GraphicIconBadge iconKey="layout-dashboard" accent="information" size="sm" />
              <div>
                <h2 id="fleet-summary-title">Fleet summary</h2>
                <p>
                  Demo telemetry from {summary.source || 'mock feed'}
                  {summary.updatedAt ? ` · updated ${new Date(summary.updatedAt).toLocaleString()}` : ''}
                </p>
              </div>
            </div>

            <div className="fleet-dashboard__metrics" role="group" aria-label="Fleet summary metrics">
              <article className="fleet-dashboard__metric">
                <span>Active</span>
                <strong>{summary.activeVehicles ?? 0}</strong>
              </article>
              <article className="fleet-dashboard__metric">
                <span>Available</span>
                <strong>{summary.availableVehicles ?? 0}</strong>
              </article>
              <article className="fleet-dashboard__metric">
                <span>On job</span>
                <strong>{summary.occupiedVehicles ?? 0}</strong>
              </article>
              <article className="fleet-dashboard__metric">
                <span>Avg utilization</span>
                <strong>{summary.averageUtilizationPercent ?? 0}%</strong>
              </article>
              <article className="fleet-dashboard__metric">
                <span>Avg ETA</span>
                <strong>
                  {summary.averageEtaMinutes != null ? `${summary.averageEtaMinutes}m` : '—'}
                </strong>
              </article>
              <article className="fleet-dashboard__metric">
                <span>Total units</span>
                <strong>{summary.totalVehicles ?? vehicles.length}</strong>
              </article>
            </div>
          </section>

          <section className="fleet-dashboard__section" aria-label="Fleet operational charts">
            <div className="dashboard-visual-grid fleet-dashboard__grid">
              <VisualizationPanel title="Fleet status mix" description="Active, available, and maintenance distribution." badge="Status">
                <CategoryBarChart
                  data={statusChart}
                  title="Fleet status mix"
                  color="var(--app-chart-1)"
                  emptyMessage="Status distribution will appear when vehicles report telemetry."
                />
              </VisualizationPanel>
              <VisualizationPanel title="Utilization load" description="Per-vehicle utilization percentages." badge="Load">
                <CategoryBarChart
                  data={utilizationChart}
                  title="Utilization load"
                  color="var(--app-chart-4)"
                  emptyMessage="Utilization chart will populate when dispatch load is available."
                />
              </VisualizationPanel>
              <VisualizationPanel title="Maintenance risk" description="Relative maintenance review pressure by unit." badge="Risk">
                <CategoryBarChart
                  data={maintenanceChart}
                  title="Maintenance risk"
                  color="var(--app-chart-5)"
                  emptyMessage="Maintenance risk chart will populate when vehicle health data syncs."
                />
              </VisualizationPanel>
              <VisualizationPanel title="ETA trend" description="Estimated arrival minutes for active routes." badge="ETA">
                <CategoryBarChart
                  data={etaChart}
                  title="ETA trend"
                  color="var(--app-chart-2)"
                  emptyMessage="ETA trend will populate when active routes report ETAs."
                />
              </VisualizationPanel>
            </div>
          </section>

          <section className="fleet-dashboard__section" aria-labelledby="fleet-vehicles-title">
            <div className="fleet-dashboard__section-header">
              <GraphicIconBadge iconKey="route" accent="action" size="sm" />
              <div>
                <h2 id="fleet-vehicles-title">Vehicle roster</h2>
                <p>Per-unit status, energy, and utilization for dispatcher review.</p>
              </div>
            </div>

            {vehicles.length ? (
              <div className="fleet-dashboard__vehicle-list">
                {vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="fleet-dashboard__vehicle">
                    <div className="fleet-dashboard__vehicle-top">
                      <strong>{vehicle.label}</strong>
                      <span>{formatVehicleStatus(vehicle.status)}</span>
                    </div>
                    <div className="fleet-dashboard__vehicle-meta">
                      <span>ID {vehicle.id}</span>
                      <span>Utilization {vehicle.utilizationPercent}%</span>
                      {vehicle.etaMinutes != null ? <span>ETA {vehicle.etaMinutes}m</span> : null}
                      {vehicle.driver ? <span>Driver {vehicle.driver}</span> : null}
                      <span>{formatMaintenanceLabel(vehicle.maintenanceStatus)}</span>
                    </div>
                    <meter
                      min={0}
                      max={100}
                      value={vehicle.energyPercent}
                      aria-label={`${energyMeterLabel(vehicle.energyType)} for ${vehicle.label}`}
                    >
                      {vehicle.energyPercent}%
                    </meter>
                  </article>
                ))}
              </div>
            ) : (
              <p className="fleet-dashboard__state">
                No vehicles are reporting telemetry for this fleet workspace.
              </p>
            )}
          </section>

          <section className="fleet-dashboard__section" aria-labelledby="fleet-maintenance-title">
            <div className="fleet-dashboard__section-header">
              <GraphicIconBadge iconKey="refresh" accent="warning" size="sm" />
              <div>
                <h2 id="fleet-maintenance-title">Maintenance status</h2>
                <p>Breakdown of maintenance review states across the active roster.</p>
              </div>
            </div>
            <div className="fleet-dashboard__maintenance-grid">
              {maintenanceBreakdown.length ? (
                maintenanceBreakdown.map(([status, count]) => (
                  <div key={status} className="fleet-dashboard__maintenance-item">
                    <strong>{count}</strong> {formatMaintenanceLabel(status)}
                  </div>
                ))
              ) : (
                <p className="fleet-dashboard__state">No maintenance status data available.</p>
              )}
            </div>
          </section>

          <section className="fleet-dashboard__section" aria-labelledby="fleet-dispatch-title">
            <DispatchIntelligencePanel vehicles={vehicles} alerts={alerts} />
          </section>

          <section className="fleet-dashboard__section" aria-labelledby="fleet-ai-title">
            <div className="fleet-dashboard__section-header">
              <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="sm" />
              <div>
                <h2 id="fleet-ai-title">Fleet AI modules</h2>
                <p>Governed unified-AI services for EMS pre-arrival and edge ambulance workflows.</p>
              </div>
            </div>
            <div className="fleet-dashboard__ai-links">
              {FLEET_AI_CAPABILITIES.map((capability) => (
                <Link key={capability.platformServiceId} to={capability.route} className="fleet-dashboard__ai-link">
                  <strong>{capability.name}</strong>
                  <span>{capability.purpose}</span>
                </Link>
              ))}
            </div>
            <div className="fleet-dashboard__metrics">
              <MetricCard label="Live map" value="Open" hint="Vehicle positions and active routes" tone="neutral" />
              <MetricCard
                label="Route optimizer"
                value="Review"
                hint="Human-reviewed route sequencing support"
                tone="neutral"
              />
            </div>
            <p className="fleet-dashboard__safety">
              <Link to={CANONICAL_ROUTES.fleetMap}>Open fleet live map</Link>
              {' · '}
              <Link to="/fleet/route-optimizer">Open route optimizer</Link>
              {' · '}
              <Link to="/fleet/predictive-maintenance">Open predictive maintenance</Link>
            </p>
          </section>
        </main>
      ) : null}
    </div>
  );
}