import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { fetchMedicalIotSnapshot } from '../../services/medicalIotService';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { categoryLabel, resolveDeviceCategory } from '../../utils/medicalIotChartModel';
import './DeviceFleetManagement.css';

/** Matches the demo snapshot's row count so the loading->loaded transition doesn't shift layout (CLS). */
const SKELETON_ROW_COUNT = 3;

type FleetDevice = {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  room: string;
  maintenance: string;
  battery: string;
};

function mapFleetDevice(device: any): FleetDevice {
  const category = resolveDeviceCategory(device.type || '');
  return {
    id: device.id,
    name: device.name,
    type: device.type || categoryLabel(category),
    category,
    status: device.status || 'unknown',
    room: device.assignedRoom || device.assignedBed || device.location?.room || 'Unassigned',
    maintenance: device.maintenanceStatus || device.calibrationStatus || 'ok',
    battery: device.battery != null ? `${device.battery}%` : 'Wired',
  };
}

export default function DeviceFleetManagement() {
  useRouteChromeRegistration({ title: 'Device Fleet Management' });
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchMedicalIotSnapshot();
        if (cancelled) return;
        const rows = (result.snapshot?.devices || []).map(mapFleetDevice);
        setDevices(rows);
        setIsDemo(Boolean(result.demo || result.unsupported));
        setSourceLabel(result.snapshot?.sourceLabel || result.message || '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const online = devices.filter((device) => device.status === 'online').length;
    const maintenance = devices.filter((device) =>
      ['due-soon', 'overdue', 'warning'].includes(device.maintenance),
    ).length;
    return { online, maintenance, total: devices.length };
  }, [devices]);

  return (
    <section className="page-container device-fleet-page" aria-label="Device fleet management">
      <header className="device-fleet-page__header">
        <div className="device-fleet-page__title-row">
          <GraphicIconBadge iconKey="route" accent="brand" size="md" />
          <div>
            <p className="device-fleet-page__title-text" data-testid="cd-page-title-text">
              Device Fleet Management
            </p>
            <p>Enterprise device registry, maintenance posture, and operations cross-links.</p>
          </div>
        </div>
        <div className="device-fleet-page__actions">
          <span
            className={`device-fleet-page__demo-badge${isDemo ? '' : ' device-fleet-page__demo-badge--hidden'}`}
            aria-hidden={!isDemo ? 'true' : 'false'}
          >
            Demo registry
          </span>
          <Link to={CANONICAL_ROUTES.medicalIot}>Medical IoT dashboard</Link>
          <Link to={CANONICAL_ROUTES.hospitalMap}>Hospital map</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Device fleet source state"
        className="device-fleet-page__notice"
        states={
          isDemo
            ? [
                DEMO_LIVE_STATES.DEMO,
                DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
                DEMO_LIVE_STATES.UNSUPPORTED,
              ]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED]
        }
        details={sourceLabel}
      />

      <div
        className="device-fleet-page__metrics"
        role="group"
        aria-label="Device fleet summary metrics"
      >
        <MetricCard
          label="Registered devices"
          value={String(summary.total)}
          hint="Rows in current registry scan"
          tone="neutral"
        />
        <MetricCard
          label="Online"
          value={String(summary.online)}
          hint="Healthy connectivity"
          tone="good"
        />
        <MetricCard
          label="Maintenance review"
          value={String(summary.maintenance)}
          hint="Due-soon or overdue maintenance"
          tone={summary.maintenance > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="device-fleet-table-wrap">
        <table className="device-fleet-table">
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Type</th>
              <th scope="col">Location</th>
              <th scope="col">Status</th>
              <th scope="col">Maintenance</th>
              <th scope="col">Battery</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <tr key={`device-skeleton-${index}`} className="device-fleet-table__skeleton-row">
                  <td colSpan={6}>
                    {index === 0 ? <span className="sr-only">Loading device registry…</span> : null}
                    <span
                      className="cd-skeleton-shimmer device-fleet-table__skeleton-bar"
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))
            ) : devices.length ? (
              devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <strong>{device.name}</strong>
                    <small>{device.id}</small>
                  </td>
                  <td>{device.type}</td>
                  <td>{device.room}</td>
                  <td>{device.status}</td>
                  <td>{device.maintenance}</td>
                  <td>{device.battery}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No devices registered in the current snapshot.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
