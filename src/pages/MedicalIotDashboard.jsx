import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { fetchMedicalIotSnapshot, formatTelemetryTime } from '../services/medicalIotService';
import {
  CategoryBarChart,
  MetricCard,
  MiniSparkline,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './MedicalIotDashboard.css';

const DEVICE_STATUS_OPTIONS = ['all', 'online', 'warning', 'offline'];
const MEDICAL_IOT_REFRESH_MS = 60_000;

function statusTone(status) {
  if (['online', 'normal', 'good'].includes(status)) return 'good';
  if (['warning', 'stale', 'medium'].includes(status)) return 'warning';
  if (['offline', 'abnormal', 'high'].includes(status)) return 'critical';
  return 'neutral';
}

function DeviceCard({ device, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`medical-iot-device-card${isSelected ? ' medical-iot-device-card--selected' : ''}`}
      onClick={() => onSelect(device)}
    >
      <div className="medical-iot-card-row">
        <div>
          <h3>{device.name}</h3>
          <p>{device.type} · {device.patientLabel}</p>
        </div>
        <span className={`medical-iot-badge medical-iot-badge--${statusTone(device.status)}`}>
          {device.status}
        </span>
      </div>
      <dl className="medical-iot-device-meta">
        <div>
          <dt>Battery</dt>
          <dd>{device.battery}%</dd>
        </div>
        <div>
          <dt>Signal</dt>
          <dd>{device.signalStrength ?? 'Unknown'}%</dd>
        </div>
        <div>
          <dt>Connectivity</dt>
          <dd>{device.connectivity}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatTelemetryTime(device.lastSeenAt)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{device.location?.label || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Room / bed</dt>
          <dd>{device.assignedRoom || device.location?.room || 'No room'} / {device.assignedBed || 'No bed'}</dd>
        </div>
        <div>
          <dt>Active alerts</dt>
          <dd>{device.activeAlerts?.length || 0}</dd>
        </div>
      </dl>
    </button>
  );
}

function VitalCard({ vital }) {
  return (
    <article className={`medical-iot-vital-card medical-iot-vital-card--${statusTone(vital.status)}`}>
      <div className="medical-iot-card-row">
        <h3>{vital.label}</h3>
        <span className={`medical-iot-badge medical-iot-badge--${statusTone(vital.status)}`}>
          {vital.status}
        </span>
      </div>
      <div className="medical-iot-vital-value">
        <strong>{vital.value}</strong>
        <span>{vital.unit}</span>
      </div>
      <p>{vital.source}</p>
      <time dateTime={vital.timestamp}>{formatTelemetryTime(vital.timestamp)}</time>
    </article>
  );
}

function trendToChartData(trend) {
  return (trend?.points || []).map((value, index) => ({
    label: index === trend.points.length - 1 ? 'Now' : `T-${trend.points.length - index - 1}`,
    value,
  }));
}

function trendColor(index) {
  return `var(--app-chart-${(index % 6) + 1})`;
}

function DeviceLocationMap({ devices, selectedDeviceId, onSelectDevice }) {
  return (
    <section className="medical-iot-section medical-iot-location-section" aria-labelledby="medical-iot-location-title">
      <div className="medical-iot-section-header">
        <div>
          <h2 id="medical-iot-location-title">Device Location Map</h2>
          <p>Demo marker panel for connected-device location, status, freshness, and offline visibility.</p>
        </div>
        <span className="medical-iot-badge medical-iot-badge--neutral">Demo data</span>
      </div>
      {devices.length === 0 ? (
        <p className="medical-iot-empty">No device location markers match the current filters.</p>
      ) : (
        <div className="medical-iot-map-canvas" role="img" aria-label="Demo Medical IoT device location map">
          <svg viewBox="0 0 1000 620" aria-hidden="true" focusable="false">
            <rect x="36" y="42" width="888" height="520" rx="28" className="medical-iot-map-shell" />
            <rect x="96" y="280" width="748" height="58" rx="18" className="medical-iot-map-corridor" />
            <rect x="96" y="96" width="240" height="140" rx="18" className="medical-iot-map-room" />
            <rect x="390" y="96" width="240" height="140" rx="18" className="medical-iot-map-room" />
            <rect x="684" y="96" width="180" height="140" rx="18" className="medical-iot-map-room" />
            <rect x="96" y="382" width="240" height="120" rx="18" className="medical-iot-map-room" />
            <rect x="390" y="382" width="240" height="120" rx="18" className="medical-iot-map-room" />
            <rect x="684" y="382" width="180" height="120" rx="18" className="medical-iot-map-room" />
          </svg>
          <div className="medical-iot-marker-layer" aria-label="Medical IoT device markers">
            {devices.map((device) => (
              <button
                key={device.id}
                type="button"
                className={`medical-iot-map-marker medical-iot-map-marker--${statusTone(device.status)}${selectedDeviceId === device.id ? ' medical-iot-map-marker--selected' : ''}`}
                style={{ left: `${device.location?.x ?? 50}%`, top: `${device.location?.y ?? 50}%` }}
                onClick={() => onSelectDevice(device)}
                aria-label={`Open ${device.name} details`}
              >
                {device.type[0]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="medical-iot-map-legend" aria-label="Medical IoT status legend">
        <span><i className="medical-iot-dot medical-iot-dot--good" /> Online</span>
        <span><i className="medical-iot-dot medical-iot-dot--warning" /> Warning/stale</span>
        <span><i className="medical-iot-dot medical-iot-dot--critical" /> Offline/abnormal</span>
      </div>
    </section>
  );
}

function DeviceDetailDrawer({ device, onClose }) {
  if (!device) {
    return (
      <aside className="medical-iot-detail medical-iot-detail--empty" aria-label="Medical IoT device details">
        <h2>Device Detail Drawer</h2>
        <p>Select a device card or marker to review status, location, battery, connectivity, and timestamp.</p>
      </aside>
    );
  }

  return (
    <aside className="medical-iot-detail" aria-label={`${device.name} details`}>
      <div className="medical-iot-detail-header">
        <div>
          <p className="medical-iot-eyebrow">Device Detail Drawer</p>
          <h2>{device.name}</h2>
          <p>{device.type} · {device.patientLabel}</p>
        </div>
        <button type="button" className="medical-iot-icon-button" onClick={onClose} aria-label="Close Medical IoT device details">
          <NavIcon icon={CHROME_ICONS.close} size={18} aria-hidden />
        </button>
      </div>
      <dl className="medical-iot-detail-grid">
        <div><dt>Status</dt><dd><span className={`medical-iot-badge medical-iot-badge--${statusTone(device.status)}`}>{device.status}</span></dd></div>
        <div><dt>Freshness</dt><dd>{device.freshness || device.status}</dd></div>
        <div><dt>Location</dt><dd>{device.location?.label || 'Unknown location'}</dd></div>
        <div><dt>Assigned room/bed</dt><dd>{device.assignedRoom || device.location?.room || 'No room'} / {device.assignedBed || 'No bed'}</dd></div>
        <div><dt>Location source</dt><dd>{device.location?.source || 'No source'}</dd></div>
        <div><dt>Battery</dt><dd>{device.battery}%</dd></div>
        <div><dt>Signal strength</dt><dd>{device.signalStrength ?? 'Unknown'}%</dd></div>
        <div><dt>Connectivity</dt><dd>{device.connectivity}</dd></div>
        <div><dt>Last seen</dt><dd>{formatTelemetryTime(device.lastSeenAt)}</dd></div>
        <div><dt>Active alerts</dt><dd>{device.activeAlerts?.join(', ') || 'None'}</dd></div>
        <div><dt>Tracking support</dt><dd>Demo marker only</dd></div>
      </dl>
    </aside>
  );
}

export default function MedicalIotDashboard() {
  const { activeWorkspace, account, recordActivity } = useUserIdentity();
  const [state, setState] = useState({
    loading: true,
    error: '',
    snapshot: null,
    message: '',
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const loadSnapshot = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await fetchMedicalIotSnapshot();
      setState({
        loading: false,
        error: '',
        snapshot: result.snapshot,
        message: result.message || '',
      });
      if (result.snapshot?.devices?.[0]) {
        setSelectedDeviceId((current) => current || result.snapshot.devices[0].id);
      }
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load Medical IoT telemetry.',
        snapshot: null,
        message: '',
      });
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const refreshTimer = window.setInterval(loadSnapshot, MEDICAL_IOT_REFRESH_MS);
    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadSnapshot]);

  useEffect(() => {
    recordActivity({
      category: 'iot',
      label: 'Medical IoT Dashboard',
      route: '/medical-iot',
      metadata: { toolId: 'medical-iot', source: 'medical-iot-dashboard' },
    });
  }, [recordActivity]);

  const snapshot = state.snapshot;
  const selectedDevice = useMemo(
    () => (snapshot?.devices || []).find((device) => device.id === selectedDeviceId) || null,
    [selectedDeviceId, snapshot]
  );
  const counts = useMemo(() => {
    const devices = snapshot?.devices || [];
    const alerts = snapshot?.alerts || [];
    return {
      connected: devices.filter((device) => device.status === 'online').length,
      offline: devices.filter((device) => device.status === 'offline').length,
      warnings: devices.filter((device) => ['warning', 'offline'].includes(device.status)).length,
      alerts: alerts.length,
    };
  }, [snapshot]);
  const freshnessMinutes = useMemo(() => {
    if (!snapshot?.generatedAt) return null;
    const updated = new Date(snapshot.generatedAt).getTime();
    if (Number.isNaN(updated)) return null;
    return Math.max(0, Math.round((Date.now() - updated) / 60000));
  }, [snapshot]);
  const deviceStatusDistribution = useMemo(() => {
    const statuses = (snapshot?.devices || []).reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [snapshot]);
  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (snapshot?.devices || []).filter((device) => {
      if (statusFilter !== 'all' && device.status !== statusFilter) return false;
      if (!query) return true;
      return [device.id, device.name, device.type, device.patientLabel, device.location?.label, device.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [search, snapshot, statusFilter]);

  return (
    <main className="medical-iot-page">
      <section className="medical-iot-hero" aria-labelledby="medical-iot-title">
        <div>
          <p className="medical-iot-eyebrow">Connected care monitoring</p>
          <h1 id="medical-iot-title">Medical IoT Dashboard</h1>
          <p>
            Monitor connected devices, patient telemetry, vitals streams, wearable data, and abnormal signal alerts
            for {activeWorkspace?.branding?.displayName || activeWorkspace?.name || account?.organization || 'your workspace'}.
            Device data is monitoring support only and does not replace clinician assessment.
          </p>
        </div>
        <div className="medical-iot-hero-actions">
          <Link to="/assistant" className="medical-iot-action">
            Ask Assistant
          </Link>
          <Link to="/dashboard" className="medical-iot-action medical-iot-action--secondary">
            Back to Command Dashboard
          </Link>
          <Link to="/tools" className="medical-iot-action medical-iot-action--secondary">
            Open Tool Library
          </Link>
        </div>
      </section>

      {state.loading ? (
        <section className="medical-iot-state" aria-label="Loading Medical IoT telemetry">
          <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
          <p>Loading Medical IoT telemetry...</p>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="medical-iot-state medical-iot-state--error" role="alert">
          <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
          <div>
            <h2>Medical IoT telemetry unavailable</h2>
            <p>{state.error}</p>
            <button type="button" className="medical-iot-action" onClick={loadSnapshot}>
              Retry loading Medical IoT telemetry
            </button>
          </div>
        </section>
      ) : null}

      {!state.loading && !state.error && snapshot ? (
        <>
          <section className="medical-iot-source" role="status">
            <strong>{snapshot.sourceLabel}</strong>
            <span>Last updated: {formatTelemetryTime(snapshot.generatedAt)}</span>
            {state.message ? <span>{state.message}</span> : null}
          </section>

          <section className="medical-iot-summary" aria-label="Medical IoT status summary">
            <MetricCard label="Connected devices" value={snapshot.devices.length} hint="Demo registry count" />
            <MetricCard label="Online" value={counts.connected} hint="Reporting in snapshot" tone="good" />
            <MetricCard label="Offline" value={counts.offline} hint="Needs connectivity review" tone={counts.offline ? 'critical' : 'good'} />
            <MetricCard label="Active alerts" value={counts.alerts} hint="Monitoring support only" tone={counts.alerts ? 'warning' : 'good'} />
            <MetricCard
              label="Freshness"
              value={freshnessMinutes == null ? 'Unknown' : `${freshnessMinutes}m`}
              hint="Generated demo snapshot"
            />
          </section>

          <section className="medical-iot-filters" aria-label="Medical IoT map filters">
            <label>
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {DEVICE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status}
                  </option>
                ))}
              </select>
            </label>
            <label className="medical-iot-search">
              <span>Search device, patient placeholder, location</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try pulse, Home-7, Patient A..."
              />
            </label>
          </section>

          {snapshot.devices.length === 0 ? (
            <section className="medical-iot-state">
              <h2>No connected medical devices</h2>
              <p>
                No device registry or telemetry stream is connected yet. Add a backend device-registry
                service before displaying live patient telemetry.
              </p>
            </section>
          ) : (
            <div className="medical-iot-location-workspace">
              <div>
                <DeviceLocationMap
                  devices={filteredDevices}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={(device) => setSelectedDeviceId(device.id)}
                />
                <section className="medical-iot-section" aria-labelledby="medical-iot-devices-title">
                  <h2 id="medical-iot-devices-title">Connected Devices</h2>
                  <div className="medical-iot-device-grid">
                    {filteredDevices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        isSelected={selectedDeviceId === device.id}
                        onSelect={(nextDevice) => setSelectedDeviceId(nextDevice.id)}
                      />
                    ))}
                  </div>
                </section>
              </div>
              <DeviceDetailDrawer device={selectedDevice} onClose={() => setSelectedDeviceId(null)} />
            </div>
          )}

          <section className="medical-iot-section" aria-labelledby="medical-iot-vitals-title">
            <h2 id="medical-iot-vitals-title">Patient Vitals Streams</h2>
            {snapshot.vitals.length === 0 ? (
              <p className="medical-iot-empty">No vitals streams are reporting right now.</p>
            ) : (
              <div className="medical-iot-vitals-grid">
                {snapshot.vitals.map((vital) => (
                  <VitalCard key={vital.id} vital={vital} />
                ))}
              </div>
            )}
          </section>

          <section className="medical-iot-section" aria-labelledby="medical-iot-visuals-title">
            <h2 id="medical-iot-visuals-title">Telemetry Visual Analytics</h2>
            <p className="medical-iot-visual-note">
              Demo data - mock telemetry, not live patient data and not for clinical decisions.
            </p>
            <div className="dashboard-visual-grid medical-iot-visual-grid">
              <VisualizationPanel title="Device Status Distribution" description="Online, warning, and offline connected-device states." badge="Demo data">
                <CategoryBarChart data={deviceStatusDistribution} title="Medical IoT device status distribution" />
              </VisualizationPanel>
              {(snapshot.trends || []).map((trend, index) => (
                <VisualizationPanel
                  key={trend.parameter || trend.label}
                  title={`${trend.label} Trend`}
                  description={`Recent ${trend.label} readings from demo Medical IoT telemetry.`}
                  badge={trend.unit || 'Mock telemetry'}
                >
                  <TrendChart
                    data={trendToChartData(trend)}
                    title={`${trend.label} telemetry trend`}
                    color={trendColor(index + 1)}
                  />
                </VisualizationPanel>
              ))}
              <VisualizationPanel title="Device Connectivity Timeline" description="Snapshot trend of online devices over time." badge="Demo timeline">
                <TrendChart
                  data={(snapshot.connectivityTimeline || []).map((item) => ({ label: item.label, value: item.online }))}
                  title="Device connectivity timeline"
                  color="var(--app-chart-2)"
                />
              </VisualizationPanel>
            </div>
          </section>

          <section className="medical-iot-grid-row">
            <div className="medical-iot-section">
              <h2>Abnormal Reading Alerts</h2>
              {snapshot.alerts.length === 0 ? (
                <p className="medical-iot-empty">No abnormal reading alerts.</p>
              ) : (
                <div className="medical-iot-alert-list">
                  {snapshot.alerts.map((alert) => (
                    <article key={alert.id} className={`medical-iot-alert medical-iot-alert--${statusTone(alert.severity)}`}>
                      <div className="medical-iot-card-row">
                        <h3>{alert.title}</h3>
                        <span className={`medical-iot-badge medical-iot-badge--${statusTone(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p>{alert.detail}</p>
                      <span>{alert.source} · {formatTelemetryTime(alert.timestamp)}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="medical-iot-section">
              <h2>Recent Telemetry Trends</h2>
              {snapshot.trends.length === 0 ? (
                <p className="medical-iot-empty">No recent telemetry trends.</p>
              ) : (
                <div className="medical-iot-trend-list">
                  {snapshot.trends.map((trend) => (
                    <article key={trend.label} className="medical-iot-trend-card">
                      <div>
                        <h3>{trend.label}</h3>
                        <p>{trend.points.join(' → ')}</p>
                      </div>
                      <MiniSparkline points={trend.points} label={`${trend.label} mini trend`} />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
