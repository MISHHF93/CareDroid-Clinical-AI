/**
 * Fleet Command Dashboard — summary and vehicle widgets.
 */

import {
  FLEET_MAINTENANCE_LABELS,
  FLEET_VEHICLE_STATUS_LABELS,
} from '../../services/fleetTelemetryService';

export function FleetStatCard({ label, value, hint, accent }) {
  const hintId = hint ? `fleet-stat-hint-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;
  return (
    <article
      className={`fleet-stat-card${accent ? ' fleet-stat-card--accent' : ''}`}
      aria-label={hint ? `${label}: ${value}. ${hint}` : `${label}: ${value}`}
    >
      <p className="fleet-stat-label">{label}</p>
      <p className="fleet-stat-value" aria-describedby={hintId}>
        {value}
      </p>
      {hint ? (
        <p id={hintId} className="fleet-stat-hint">
          {hint}
        </p>
      ) : null}
    </article>
  );
}

export function FleetSummaryWidget({ summary }) {
  return (
    <section aria-labelledby="fleet-summary-heading">
      <h2 id="fleet-summary-heading" className="fleet-section-title">
        Fleet summary
      </h2>
      <div className="fleet-stat-grid" role="group" aria-label="Fleet summary metrics">
        <FleetStatCard label="Total units" value={summary.totalVehicles} />
        <FleetStatCard label="Active" value={summary.activeVehicles} />
        <FleetStatCard label="Available" value={summary.availableVehicles} />
        <FleetStatCard label="On job" value={summary.occupiedVehicles} />
        <FleetStatCard
          label="Maintenance"
          value={summary.maintenanceCount}
          hint={summary.lowEnergyCount ? `${summary.lowEnergyCount} low energy` : null}
        />
        <FleetStatCard
          label="Avg utilization"
          value={`${summary.averageUtilizationPercent}%`}
          accent
        />
        <FleetStatCard
          label="Avg ETA (on job)"
          value={
            summary.averageEtaMinutes != null ? `${summary.averageEtaMinutes} min` : '—'
          }
        />
      </div>
    </section>
  );
}

export function FleetMaintenanceWidget({ vehicles }) {
  const counts = vehicles.reduce((acc, vehicle) => {
    const key = vehicle.maintenanceStatus || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="fleet-maintenance-heading" className="fleet-maintenance-widget">
      <h2 id="fleet-maintenance-heading" className="fleet-section-title">
        Maintenance status
      </h2>
      <ul className="fleet-maintenance-grid" role="list">
        {entries.map(([status, count]) => (
          <li key={status}>
            <article
              className="fleet-maintenance-card"
              aria-label={`${FLEET_MAINTENANCE_LABELS[status] || status}: ${count} vehicles`}
            >
              <p className="fleet-maintenance-count">{count}</p>
              <p className="fleet-maintenance-label">
                {FLEET_MAINTENANCE_LABELS[status] || status}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function energyMeterClass(percent) {
  if (percent < 35) return 'fleet-energy-meter__fill--critical';
  if (percent < 55) return 'fleet-energy-meter__fill--warning';
  return 'fleet-energy-meter__fill--ok';
}

export function FleetEnergyMeter({ vehicle }) {
  const unit = vehicle.energyType === 'electric' ? 'Battery' : 'Fuel';
  const label = `${unit} level for ${vehicle.label}`;
  const percent = Math.min(100, Math.max(0, vehicle.energyPercent));

  return (
    <div className="fleet-energy-meter">
      <div className="fleet-energy-meter__header">
        <span className="fleet-energy-meter__unit">{unit}</span>
        <span className="fleet-energy-meter__value">{percent}%</span>
      </div>
      <div
        className="fleet-energy-meter__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div
          className={`fleet-energy-meter__fill ${energyMeterClass(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function statusBadgeClass(status) {
  if (status === 'maintenance') return 'fleet-badge--maintenance';
  if (status === 'available') return 'fleet-badge--available';
  if (status === 'occupied') return 'fleet-badge--occupied';
  return 'fleet-badge--active';
}

function maintenanceBadgeClass(maintenanceStatus) {
  if (maintenanceStatus === 'ok') return 'fleet-badge--available';
  if (maintenanceStatus === 'warning') return 'fleet-badge--warning';
  return 'fleet-badge--maintenance';
}

function formatEta(etaMinutes) {
  if (etaMinutes == null) return '—';
  return `${etaMinutes} min`;
}

export function FleetVehicleListWidget({ vehicles }) {
  return (
    <section aria-labelledby="fleet-vehicles-heading">
      <h2 id="fleet-vehicles-heading" className="fleet-section-title">
        Vehicles ({vehicles.length})
      </h2>
      <ul className="fleet-vehicle-list">
        {vehicles.map((vehicle) => (
          <li key={vehicle.id}>
            <article
              className="fleet-vehicle-card"
              aria-labelledby={`vehicle-${vehicle.id}-title`}
            >
              <div className="fleet-vehicle-card-header">
                <div>
                  <h3 id={`vehicle-${vehicle.id}-title`} className="fleet-vehicle-title">
                    {vehicle.label}
                  </h3>
                  <span className="fleet-vehicle-id">{vehicle.id}</span>
                </div>
                <div className="fleet-badge-row" role="list" aria-label="Vehicle status">
                  <span
                    className={`fleet-badge ${statusBadgeClass(vehicle.status)}`}
                    role="listitem"
                  >
                    <span className="fleet-sr-only">Status: </span>
                    {FLEET_VEHICLE_STATUS_LABELS[vehicle.status] || vehicle.status}
                  </span>
                  <span
                    className={`fleet-badge ${maintenanceBadgeClass(vehicle.maintenanceStatus)}`}
                    role="listitem"
                  >
                    <span className="fleet-sr-only">Maintenance: </span>
                    {FLEET_MAINTENANCE_LABELS[vehicle.maintenanceStatus] ||
                      vehicle.maintenanceStatus}
                  </span>
                  {vehicle.energyPercent < 35 ? (
                    <span className="fleet-badge fleet-badge--critical" role="listitem">
                      <span className="fleet-sr-only">Alert: </span>
                      Low energy
                    </span>
                  ) : null}
                </div>
              </div>
              <FleetEnergyMeter vehicle={vehicle} />
              <dl className="fleet-vehicle-metrics">
                <div className="fleet-vehicle-metric">
                  <dt>ETA</dt>
                  <dd>{formatEta(vehicle.etaMinutes)}</dd>
                </div>
                <div className="fleet-vehicle-metric">
                  <dt>Utilization</dt>
                  <dd>{vehicle.utilizationPercent}%</dd>
                </div>
                <div className="fleet-vehicle-metric">
                  <dt>Driver</dt>
                  <dd>{vehicle.driver || 'Unassigned'}</dd>
                </div>
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
