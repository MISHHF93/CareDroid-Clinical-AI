import { useMemo } from 'react';
import type { ActiveShift, CapacitySnapshot, Patient, Room, Staff } from '../../types/emergency';
import DepartmentStaffBar from '../whiteboard/DepartmentStaffBar';
import type { EmergencyBoardingMetrics } from '../../store/emergencyStore';
import {
  buildOperationalCommandDashboardSnapshot,
  type OperationalCommandDashboardSnapshot,
  type OperationalDashboardMetric,
  type ZoneBedOccupancy,
} from '../../services/operationalCommandDashboardModel';
import './CommandDashboard.css';

export type CommandDashboardProps = {
  patients: Patient[];
  rooms: Room[];
  staff?: Staff[];
  activeShift?: ActiveShift | null;
  capacity: CapacitySnapshot;
  boardingMetrics?: EmergencyBoardingMetrics;
  title?: string;
  subtitle?: string;
  snapshot?: OperationalCommandDashboardSnapshot;
  now?: number;
  className?: string;
};

function toneLabel(tone: OperationalDashboardMetric['tone'] | ZoneBedOccupancy['tone']): string {
  if (tone === 'red') return 'Red';
  if (tone === 'amber') return 'Amber';
  return 'Green';
}

function MetricCard({ metric }: { metric: OperationalDashboardMetric }) {
  return (
    <article
      className={`command-dashboard__metric command-dashboard__metric--${metric.tone}`}
      aria-label={`${metric.label} ${metric.value}. Threshold ${toneLabel(metric.tone)}.`}
    >
      <div className="command-dashboard__metric-head">
        <span className="command-dashboard__metric-label">{metric.label}</span>
        <span className={`command-dashboard__rag command-dashboard__rag--${metric.tone}`}>
          {toneLabel(metric.tone)}
        </span>
      </div>
      <strong className="command-dashboard__metric-value">{metric.value}</strong>
      <p className="command-dashboard__metric-detail">{metric.detail}</p>
      <small className="command-dashboard__metric-threshold">{metric.thresholdLabel}</small>
    </article>
  );
}

function ZoneOccupancyRow({ zone }: { zone: ZoneBedOccupancy }) {
  return (
    <li className={`command-dashboard__zone command-dashboard__zone--${zone.tone}`}>
      <div className="command-dashboard__zone-head">
        <span>{zone.zoneLabel}</span>
        <span className={`command-dashboard__rag command-dashboard__rag--${zone.tone}`}>
          {toneLabel(zone.tone)}
        </span>
      </div>
      <strong>
        {zone.occupied}/{zone.total} beds
      </strong>
      <div
        className="command-dashboard__zone-bar"
        role="presentation"
        aria-hidden="true"
      >
        <span style={{ width: `${zone.occupancyPercent}%` }} />
      </div>
      <small>{zone.occupancyPercent}% occupied</small>
    </li>
  );
}

export default function CommandDashboard({
  patients,
  rooms,
  staff = [],
  activeShift = null,
  capacity,
  boardingMetrics,
  title = 'Operational command dashboard',
  subtitle = 'Live department metrics from the emergency whiteboard',
  snapshot: snapshotProp,
  now,
  className = '',
}: CommandDashboardProps) {
  const snapshot = useMemo(
    () =>
      snapshotProp ||
      buildOperationalCommandDashboardSnapshot({
        patients,
        rooms,
        capacity,
        boardingMetrics,
        now: now ? new Date(now) : new Date(),
      }),
    [boardingMetrics, capacity, now, patients, rooms, snapshotProp],
  );

  return (
    <section
      className={['command-dashboard', className].filter(Boolean).join(' ')}
      aria-label="Emergency department operational command dashboard"
    >
      <header className="command-dashboard__header">
        <div>
          <p className="command-dashboard__eyebrow">Charge nurse / command center</p>
          <h2>{title}</h2>
          <p className="command-dashboard__subtitle">{subtitle}</p>
        </div>
        <div className="command-dashboard__meta">
          <span>{snapshot.summaryLine}</span>
          <time dateTime={snapshot.updatedAt}>
            Updated {new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </header>

      {staff.length ? (
        <DepartmentStaffBar
          staff={staff}
          patients={patients}
          rooms={rooms}
          activeShift={activeShift}
        />
      ) : null}

      <p className="command-dashboard__bottleneck" role="status">
        {snapshot.bottleneckLabel}
      </p>

      {snapshot.chargeNurseAlerts.length ? (
        <section className="command-dashboard__alerts" aria-label="Charge nurse predictive alerts">
          <div className="command-dashboard__alerts-heading">
            <h3>Charge nurse alerts</h3>
            <span>Based on admission probability and pre-arrival rules</span>
          </div>
          <ul className="command-dashboard__alert-list">
            {snapshot.chargeNurseAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.prolongedStayAlerts?.length ? (
        <section className="command-dashboard__pending-beds" aria-label="Prolonged stay risk alerts">
          <h3>Prolonged ED stay risk</h3>
          <ul>
            {snapshot.prolongedStayAlerts.map((alert) => (
              <li key={alert.patientId}>
                <strong>{alert.patientLabel}</strong>
                <span>
                  Risk {alert.probabilityPercent}% · projected {alert.predictedHours}h
                </span>
                <small>{alert.action}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.orientationPredictions?.length ? (
        <section className="command-dashboard__activations" aria-label="Post-ED orientation predictions">
          <h3>Post-ED orientation (ML)</h3>
          <ul>
            {snapshot.orientationPredictions.map((prediction) => (
              <li key={prediction.patientId}>
                <strong>{prediction.patientLabel}</strong>
                <span>
                  {prediction.orientation.toUpperCase()} · {prediction.probabilityPercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.pendingBedAssignments.length ? (
        <section className="command-dashboard__pending-beds" aria-label="Pending bed assignments">
          <h3>Pending bed assignment</h3>
          <ul>
            {snapshot.pendingBedAssignments.map((assignment) => (
              <li key={assignment.patientId}>
                <strong>{assignment.patientLabel}</strong>
                <span>
                  Admit score {assignment.admitScore}/10 ({assignment.probabilityPercent}%)
                </span>
                <small>{assignment.action}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.resourceActivations.length ? (
        <section className="command-dashboard__activations" aria-label="Pre-arrival resource activations">
          <h3>Resource activations</h3>
          <ul>
            {snapshot.resourceActivations.map((activation) => (
              <li key={activation.id} className={`command-dashboard__activation--${activation.severity}`}>
                <strong>{activation.title}</strong>
                <span>{activation.summary}</span>
                <small>{activation.chargeNurseAction}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="command-dashboard__metrics" aria-label="Department operational metrics">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <section className="command-dashboard__zones-panel" aria-label="Bed occupancy by zone">
        <div className="command-dashboard__zones-heading">
          <h3>Bed occupancy by zone</h3>
          <span>Red/Amber/Green thresholds from live room status</span>
        </div>
        {snapshot.zoneOccupancy.length ? (
          <ul className="command-dashboard__zones">
            {snapshot.zoneOccupancy.map((zone) => (
              <ZoneOccupancyRow key={zone.zoneId} zone={zone} />
            ))}
          </ul>
        ) : (
          <p className="command-dashboard__empty">No room zones are configured on the whiteboard yet.</p>
        )}
      </section>
    </section>
  );
}