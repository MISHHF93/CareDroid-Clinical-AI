import { useCallback, useEffect, useRef, useState } from 'react';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { fetchFleetCommandSnapshot } from '../../services/fleetTelemetryService';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  CategoryBarChart,
  DistributionDonutChart,
  MetricCard,
  TrendChart,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import FleetPageChrome, { FleetOperationalBanner } from './FleetPageChrome';
import {
  FleetMaintenanceWidget,
  FleetSummaryWidget,
  FleetVehicleListWidget,
} from './FleetDashboardWidgets';
import './FleetDashboard.css';
import './fleetUxShared.css';

const TOOL_ID = 'fleet-command';

export default function FleetDashboard() {
  const { recordToolAccess } = useToolPreferences();
  const { activeWorkspace, account, recordActivity } = useUserIdentity();
  const [phase, setPhase] = useState('loading');
  const [snapshot, setSnapshot] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const requestSeqRef = useRef(0);
  const snapshotRef = useRef(null);
  snapshotRef.current = snapshot;

  const loadSnapshot = useCallback(async (signal, { forceLoading = false } = {}) => {
    const requestId = ++requestSeqRef.current;
    const refreshInPlace = forceLoading && snapshotRef.current != null;
    if (refreshInPlace) {
      setIsRefreshing(true);
    } else {
      setPhase((current) => {
        if (forceLoading) return 'loading';
        if (current === 'ready' || current === 'empty' || current === 'error') return current;
        return 'loading';
      });
    }
    setErrorMessage(null);
    try {
      const data = await fetchFleetCommandSnapshot({ signal });
      if (requestId !== requestSeqRef.current) return;
      setSnapshot(data);
      setPhase(data.vehicles.length === 0 ? 'empty' : 'ready');
      if (refreshInPlace && data.vehicles.length > 0) {
        setStatusMessage(
          `Fleet snapshot updated at ${new Date(data.summary?.updatedAt || Date.now()).toLocaleTimeString()}.`
        );
      }
    } catch (err) {
      if (requestId !== requestSeqRef.current) return;
      if (err?.name === 'AbortError') return;
      setErrorMessage(err?.message || 'Unable to load fleet telemetry.');
      setPhase('error');
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    recordToolAccess(TOOL_ID);
    if (typeof recordActivity === 'function') {
      recordActivity({
        category: 'fleet',
        label: 'Fleet Command Dashboard',
        route: '/fleet/command',
        metadata: { toolId: TOOL_ID, source: 'fleet-dashboard' },
      });
    }
    loadSnapshot(controller.signal);
    return () => {
      controller.abort();
      requestSeqRef.current += 1;
    };
  }, [loadSnapshot, recordActivity, recordToolAccess]);

  const summary = snapshot?.summary;
  const lowEnergyVehicles =
    snapshot?.vehicles?.filter((v) => v.energyPercent < 35) ?? [];

  return (
    <div className="fleet-dashboard">
      <FleetPageChrome
        toolId={TOOL_ID}
        title="Fleet Command Dashboard"
        lead={`Operational snapshot for ${
          activeWorkspace?.branding?.displayName || activeWorkspace?.name || account?.organization || 'your workspace'
        } - vehicle availability, maintenance, ETAs, energy levels, and utilization.`}
        safetyNote={
          <>
            <strong>Decision support only.</strong> Verify all metrics against your dispatch system of
            record. This dashboard does not assign vehicles, change routes, or control fleet
            telematics. Mock telemetry in development builds.
          </>
        }
        mainId="fleet-dashboard-main"
      >
        <p className="fleet-live-region" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {phase === 'loading' ? (
          <div
            className="fleet-dashboard-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading fleet telemetry"
          >
            <NavIcon
              icon={CHROME_ICONS.loader}
              size={32}
              aria-hidden
              className="fleet-page-loading-icon"
            />
            <p>Loading fleet telemetry…</p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="fleet-dashboard-error" role="alert">
            <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
            <p>Telemetry offline. {errorMessage || 'Unable to load fleet telemetry.'}</p>
            <button
              type="button"
              className="fleet-btn fleet-btn--secondary"
              aria-label="Retry loading fleet telemetry"
              onClick={() => loadSnapshot(undefined, { forceLoading: true })}
            >
              Retry
            </button>
          </div>
        ) : null}

        {phase === 'empty' ? (
          <div className="fleet-dashboard-empty" role="status">
            <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
            <p>No vehicles are reporting telemetry right now.</p>
            <p className="fleet-dashboard-empty-hint">
              Check telematics connectivity or refresh when units come online.
            </p>
            <button
              type="button"
              className="fleet-btn fleet-btn--secondary"
              aria-label="Refresh fleet telemetry"
              onClick={() => loadSnapshot(undefined, { forceLoading: true })}
            >
              Refresh
            </button>
          </div>
        ) : null}

        {phase === 'ready' && summary ? (
          <div
            className={`fleet-content-region${isRefreshing ? ' fleet-content-region--busy' : ''}`}
            aria-busy={isRefreshing}
          >
            <div className="fleet-toolbar">
              <button
                type="button"
                className="fleet-btn fleet-btn--secondary"
                aria-label="Refresh fleet telemetry snapshot"
                aria-busy={isRefreshing}
                disabled={isRefreshing}
                onClick={() => loadSnapshot(undefined, { forceLoading: true })}
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh snapshot'}
              </button>
            </div>

            {summary.lowEnergyCount > 0 || summary.maintenanceCount > 0 ? (
              <div
                className="fleet-operational-warning"
                role="alert"
                aria-labelledby="fleet-ops-alert-heading"
              >
                <p id="fleet-ops-alert-heading">
                  <strong>Operational attention:</strong> review flagged units before dispatch
                  decisions.
                </p>
                <ul>
                  {summary.maintenanceCount > 0 ? (
                    <li>{summary.maintenanceCount} unit(s) in maintenance status</li>
                  ) : null}
                  {summary.lowEnergyCount > 0 ? (
                    <li>{summary.lowEnergyCount} unit(s) below 35% energy</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <FleetSummaryWidget summary={summary} />

            <section className="fleet-visual-analytics" aria-labelledby="fleet-visual-analytics-heading">
              <h2 id="fleet-visual-analytics-heading" className="fleet-section-title">
                Fleet visual analytics
              </h2>
              <p className="fleet-dashboard-demo-note">
                Mock telemetry - not live fleet data. Verify against dispatch and telematics systems.
              </p>
              <div className="dashboard-metric-grid fleet-visual-metrics">
                <MetricCard label="Active vehicles" value={summary.activeVehicles + summary.occupiedVehicles} hint="On route or on job" />
                <MetricCard label="Offline vehicles" value={summary.maintenanceCount} hint="Maintenance/unavailable proxy" tone={summary.maintenanceCount ? 'warning' : 'good'} />
                <MetricCard
                  label="Average ETA"
                  value={summary.averageEtaMinutes != null ? `${summary.averageEtaMinutes}m` : 'None'}
                  hint="Vehicles with ETA"
                />
                <MetricCard
                  label="Route efficiency"
                  value={`${snapshot.visualizations?.routeEfficiency ?? 0}%`}
                  hint="Demo route-time proxy"
                />
              </div>
              <div className="dashboard-visual-grid fleet-visual-grid">
                <VisualizationPanel title="Vehicle Status Distribution" description="Active, available, occupied, and maintenance states." badge="Mock telemetry">
                  <DistributionDonutChart data={snapshot.visualizations?.statusDistribution || []} title="Vehicle status distribution" />
                </VisualizationPanel>
                <VisualizationPanel title="Route Time Trend" description="ETA trend by reporting vehicle." badge="Mock telemetry">
                  <TrendChart data={snapshot.visualizations?.etaTrend || []} title="Route time trend" color="var(--app-chart-1)" />
                </VisualizationPanel>
                <VisualizationPanel title="Maintenance Risk" description="Risk proxy from maintenance state and energy level.">
                  <CategoryBarChart data={snapshot.visualizations?.maintenanceRisk || []} title="Maintenance risk bar chart" color="var(--app-chart-4)" />
                </VisualizationPanel>
                <VisualizationPanel title="Dispatch Load Trend" description="Vehicle utilization across current snapshot.">
                  <TrendChart data={snapshot.visualizations?.dispatchLoadTrend || []} title="Dispatch load trend" color="var(--app-chart-2)" />
                </VisualizationPanel>
              </div>
            </section>

            <FleetMaintenanceWidget vehicles={snapshot.vehicles} />
            <FleetVehicleListWidget vehicles={snapshot.vehicles} />

            {lowEnergyVehicles.length > 0 ? (
              <FleetOperationalBanner variant="critical">
                Low-energy units: {lowEnergyVehicles.map((v) => v.label).join(', ')}. Confirm
                range and charging before assignment.
              </FleetOperationalBanner>
            ) : null}

            <p className="fleet-dashboard-footer" role="note">
              Last updated {new Date(summary.updatedAt).toLocaleString()} · Source: {summary.source}
            </p>

            <p className="fleet-no-automation-note" role="note">
              Human dispatchers must approve all assignments. This view does not modify live fleet
              operations.
            </p>
          </div>
        ) : null}
      </FleetPageChrome>
    </div>
  );
}
