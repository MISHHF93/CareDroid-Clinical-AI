import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { fetchMedicalIotSnapshot } from '../../services/medicalIotService';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildConnectivityChart,
  buildDeviceCategoryChart,
  buildDeviceStatusChart,
  buildIotMapMarkers,
  categoryIconKey,
  categoryLabel,
  deviceStatusTone,
  resolveDeviceCategory,
} from '../../utils/medicalIotChartModel';
import '../MedicalIotDashboard.css';

type IotDevice = {
  id: string;
  name: string;
  category: string;
  room: string;
  battery: number | null;
  status: string;
  lastSeen: string;
  alarms: number;
  x?: number;
  y?: number;
};

const DEMO_DEVICES: IotDevice[] = [
  {
    id: 'dev-001',
    name: 'Philips IntelliVue MX800',
    category: 'monitor',
    room: 'ED Bay 3',
    battery: 98,
    status: 'online',
    lastSeen: '30s ago',
    alarms: 0,
    x: 18,
    y: 22,
  },
  {
    id: 'dev-002',
    name: 'Baxter Sigma Spectrum',
    category: 'infusion',
    room: 'ED Bay 3',
    battery: 72,
    status: 'online',
    lastSeen: '1m ago',
    alarms: 1,
    x: 24,
    y: 28,
  },
  {
    id: 'dev-003',
    name: 'Puritan Bennett 980',
    category: 'ventilator',
    room: 'ICU Bed 4',
    battery: null,
    status: 'online',
    lastSeen: '10s ago',
    alarms: 0,
    x: 42,
    y: 20,
  },
  {
    id: 'dev-004',
    name: 'Masimo Root',
    category: 'wearable',
    room: 'ED Bay 7',
    battery: 41,
    status: 'warning',
    lastSeen: '2m ago',
    alarms: 2,
    x: 30,
    y: 44,
  },
  {
    id: 'dev-005',
    name: 'GE Optima RF360',
    category: 'imaging',
    room: 'Radiology',
    battery: null,
    status: 'online',
    lastSeen: '5m ago',
    alarms: 0,
    x: 68,
    y: 24,
  },
  {
    id: 'dev-006',
    name: 'Zoll R Series',
    category: 'portable',
    room: 'ED Bay 1',
    battery: 87,
    status: 'online',
    lastSeen: '45s ago',
    alarms: 0,
    x: 14,
    y: 52,
  },
  {
    id: 'dev-007',
    name: 'Philips SureSigns VS4',
    category: 'monitor',
    room: 'OBS-2',
    battery: 62,
    status: 'online',
    lastSeen: '1m ago',
    alarms: 0,
    x: 52,
    y: 48,
  },
  {
    id: 'dev-008',
    name: 'Smiths Medical Medfusion',
    category: 'infusion',
    room: 'ICU Bed 2',
    battery: 15,
    status: 'critical',
    lastSeen: '8m ago',
    alarms: 3,
    x: 46,
    y: 34,
  },
  {
    id: 'dev-009',
    name: 'Drager Evita Infinity',
    category: 'ventilator',
    room: 'ICU Bed 6',
    battery: null,
    status: 'online',
    lastSeen: '20s ago',
    alarms: 1,
    x: 58,
    y: 30,
  },
  {
    id: 'dev-010',
    name: 'Biobeat BB-613',
    category: 'wearable',
    room: 'Med-Surg B',
    battery: 8,
    status: 'critical',
    lastSeen: '15m ago',
    alarms: 1,
    x: 72,
    y: 56,
  },
];

const MARKER_FILL: Record<string, string> = {
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

function mapServiceDevice(device: any): IotDevice {
  const category = resolveDeviceCategory(device.type || device.category || '');
  const lastSeenAgo = device.lastSeenAt
    ? (() => {
        const diff = Date.now() - new Date(device.lastSeenAt).getTime();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor(diff / 1000);
        return mins > 0 ? `${mins}m ago` : `${secs}s ago`;
      })()
    : 'Unknown';

  return {
    id: device.id,
    name: device.name,
    category,
    room: device.assignedRoom || device.assignedBed || device.location?.room || 'Unknown',
    battery: device.battery ?? null,
    status: device.status,
    lastSeen: lastSeenAgo,
    alarms: Array.isArray(device.activeAlerts) ? device.activeAlerts.length : (device.alarms ?? 0),
    x: device.location?.x ?? device.x,
    y: device.location?.y ?? device.y,
  };
}

function batteryTone(pct: number) {
  if (pct <= 15) return 'is-critical';
  if (pct <= 30) return 'is-warning';
  return 'is-good';
}

function DeviceRow({
  device,
  selected,
  onSelect,
}: {
  device: IotDevice;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const statusClass =
    device.status === 'critical'
      ? 'is-critical'
      : device.status === 'warning'
        ? 'is-warning'
        : device.status === 'online'
          ? 'is-good'
          : undefined;

  return (
    <button
      type="button"
      className={`medical-iot-page__device-row${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(device.id)}
      {...(selected ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
    >
      <GraphicIconBadge iconKey={categoryIconKey(device.category)} accent="information" size="sm" />
      <div>
        <div className="medical-iot-page__device-name">{device.name}</div>
        <div className="medical-iot-page__device-meta">{categoryLabel(device.category)}</div>
      </div>
      <span className="medical-iot-page__device-meta">{device.room}</span>
      <span className="medical-iot-page__device-meta">{device.lastSeen}</span>
      {device.battery != null ? (
        <div className="medical-iot-page__battery">
          <div className="medical-iot-page__battery-track">
            <div
              className={`medical-iot-page__battery-fill ${batteryTone(device.battery)}`}
              style={{ width: `${device.battery}%` }}
            />
          </div>
          <span className={batteryTone(device.battery)}>{device.battery}%</span>
        </div>
      ) : (
        <span className="medical-iot-page__device-meta">Wired</span>
      )}
      <span className={`medical-iot-page__device-meta ${statusClass || ''}`}>{device.status}</span>
      {device.alarms > 0 ? (
        <span className="medical-iot-page__alarm-pill">{device.alarms}</span>
      ) : (
        <span className="medical-iot-page__device-meta">—</span>
      )}
    </button>
  );
}

export default function MedicalIotDashboard() {
  useRouteChromeRegistration({ title: 'Medical IoT Dashboard' });
  const [devices, setDevices] = useState<IotDevice[]>(DEMO_DEVICES);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [connectivityTimeline, setConnectivityTimeline] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchMedicalIotSnapshot();
      if (result.ok && result.snapshot?.devices?.length) {
        setDevices(result.snapshot.devices.map(mapServiceDevice));
        setAlerts(result.snapshot.alerts || []);
        setConnectivityTimeline(result.snapshot.connectivityTimeline || []);
        setSourceLabel(result.snapshot.sourceLabel || '');
        setMessage(result.message || '');
        setIsDemo(Boolean(result.demo || result.unsupported));
      } else {
        setDevices(DEMO_DEVICES);
        setAlerts([]);
        setConnectivityTimeline([]);
        setSourceLabel('Demo telemetry');
        setMessage(result.message || '');
        setIsDemo(true);
      }
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = devices.filter((device) => {
    if (filter !== 'all' && device.category !== filter && device.status !== filter) return false;
    if (
      query &&
      !`${device.name} ${device.room} ${device.category}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const criticalCount = devices.filter((device) => device.status === 'critical').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const alarmCount = devices.reduce((sum, device) => sum + device.alarms, 0);
  const lowBattery = devices.filter(
    (device) => device.battery != null && device.battery <= 20,
  ).length;
  const onlineCount = devices.filter((device) => device.status === 'online').length;

  const statusChart = useMemo(() => buildDeviceStatusChart(devices), [devices]);
  const categoryChart = useMemo(() => buildDeviceCategoryChart(devices), [devices]);
  const connectivityChart = useMemo(
    () => buildConnectivityChart(connectivityTimeline),
    [connectivityTimeline],
  );
  const mapMarkers = useMemo(() => buildIotMapMarkers(filteredDevices), [filteredDevices]);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) || null;

  const gridLines = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => index * 10).flatMap((value) => [
        { x1: value, y1: 0, x2: value, y2: 100 },
        { x1: 0, y1: value, x2: 100, y2: value },
      ]),
    [],
  );

  return (
    <main className="medical-iot-page">
      <header className="medical-iot-page__header">
        <div className="medical-iot-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="medical-iot-page__title-text" data-testid="cd-page-title-text">
              Medical IoT Dashboard
            </p>
            <p>
              Device fleet connectivity, battery health, active alarms, and bedside telemetry
              positions.
            </p>
          </div>
        </div>
        <div className="medical-iot-page__actions">
          {criticalCount > 0 ? (
            <span className="medical-iot-page__badge medical-iot-page__badge--critical">
              {criticalCount} critical
            </span>
          ) : null}
          {isDemo ? (
            <span className="medical-iot-page__badge medical-iot-page__badge--demo">Demo data</span>
          ) : null}
          <button type="button" onClick={load} disabled={loading}>
            {loading ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </header>

      <StateSourceNotice
        title="Medical IoT source state"
        states={
          isDemo
            ? [
                DEMO_LIVE_STATES.DEMO,
                DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
                DEMO_LIVE_STATES.UNSUPPORTED,
              ]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED]
        }
        details={sourceLabel || message}
      />

      <div
        className="medical-iot-page__metrics"
        role="group"
        aria-label="Medical IoT summary metrics"
      >
        <MetricCard
          label="Devices online"
          value={String(onlineCount)}
          hint="Reporting healthy connectivity"
          tone="good"
        />
        <MetricCard
          label="Critical"
          value={String(criticalCount)}
          hint="Requires immediate review"
          tone={criticalCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Warning"
          value={String(warningCount)}
          hint="Devices with elevated signals"
          tone={warningCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Active alarms"
          value={String(alarmCount)}
          hint="Open alarm events in snapshot"
          tone={alarmCount > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Low battery"
          value={String(lowBattery)}
          hint="Devices at or below 20%"
          tone={lowBattery > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Total devices"
          value={String(devices.length)}
          hint="Registered in current scan"
          tone="neutral"
        />
      </div>

      <div className="medical-iot-page__layout">
        <section className="medical-iot-page__map-shell" aria-label="Medical IoT device map canvas">
          <div
            className="medical-iot-map-canvas"
            role="group"
            aria-label="Medical IoT device position map — contains selectable device markers"
          >
            <svg
              viewBox="0 0 100 100"
              className="medical-iot-map-canvas__svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {gridLines.map((line, index) => (
                <line
                  key={`grid-${index}`}
                  className="medical-iot-map-canvas__grid-line"
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                />
              ))}

              {mapMarkers.map((marker) => {
                const tone = deviceStatusTone(marker.status);
                const selected = marker.id === selectedDeviceId;
                return (
                  <g
                    key={marker.id}
                    transform={`translate(${marker.x} ${marker.y})`}
                    // The marker label's CSS (.medical-iot-map-canvas__marker text, MedicalIotDashboard.css)
                    // never matched anything without this class -- the <text> inherited an unscaled 15px
                    // page font-size into this 100x100 SVG viewBox's user-unit space, rendering each device
                    // label at ~15 units tall (vs. the r="2.2" marker circle), swamping the whole map canvas.
                    className={`medical-iot-map-canvas__marker${selected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedDeviceId(marker.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${marker.label}, ${marker.status}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedDeviceId(marker.id);
                      }
                    }}
                  >
                    <circle r="2.2" fill={MARKER_FILL[tone]} />
                    <text x="2.8" y="1">
                      {marker.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {selectedDevice ? (
            <p className="medical-iot-page__map-state">
              <strong>{selectedDevice.name}</strong> — {selectedDevice.room} ·{' '}
              {selectedDevice.status}
              {selectedDevice.alarms > 0 ? ` · ${selectedDevice.alarms} alarms` : ''}
            </p>
          ) : (
            <p className="medical-iot-page__map-state">
              Select a device marker or roster row to inspect telemetry context.
            </p>
          )}
        </section>

        <aside className="medical-iot-page__side-panel" aria-label="Medical IoT charts and alerts">
          <VisualizationPanel
            title="Device status mix"
            description="Online, warning, and critical distribution."
            badge="Status"
          >
            <CategoryBarChart
              data={statusChart}
              title="Device status mix"
              color="var(--app-chart-2)"
              emptyMessage="Status chart appears when devices report connectivity."
            />
          </VisualizationPanel>

          <VisualizationPanel
            title="Device categories"
            description="Fleet composition by device class."
            badge="Fleet"
          >
            <CategoryBarChart
              data={categoryChart}
              title="Device categories"
              color="var(--app-chart-4)"
              emptyMessage="Category chart appears when devices are registered."
            />
          </VisualizationPanel>

          {connectivityChart.length ? (
            <VisualizationPanel
              title="Connectivity snapshot"
              description="Latest online, warning, and offline counts."
              badge="Live"
            >
              <CategoryBarChart
                data={connectivityChart}
                title="Connectivity snapshot"
                color="var(--app-chart-1)"
                emptyMessage="Connectivity timeline unavailable."
              />
            </VisualizationPanel>
          ) : null}

          <div className="medical-iot-page__alerts" aria-label="Active device alerts">
            <h3>Active alerts</h3>
            {alerts.length ? (
              alerts.slice(0, 5).map((alert) => (
                <article key={alert.id} className="medical-iot-page__alert-item">
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.source || 'Device'} · {alert.severity || 'medium'}
                  </span>
                </article>
              ))
            ) : (
              <p className="medical-iot-page__empty">No active alerts in the current snapshot.</p>
            )}
          </div>

          <p className="medical-iot-page__links">
            <Link to={CANONICAL_ROUTES.liveMap}>Open live tracking map</Link>
            {' · '}
            <Link to={CANONICAL_ROUTES.hospitalMap}>Open hospital map</Link>
          </p>
        </aside>
      </div>

      <div className="medical-iot-page__filters" role="group" aria-label="Device filters">
        {[
          { id: 'all', label: 'All' },
          { id: 'critical', label: 'Critical' },
          { id: 'warning', label: 'Warning' },
          { id: 'monitor', label: 'Monitors' },
          { id: 'infusion', label: 'Infusion' },
          { id: 'wearable', label: 'Wearables' },
          { id: 'ventilator', label: 'Ventilators' },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={filter === id ? 'is-active' : undefined}
            {...(filter === id
              ? { 'aria-pressed': 'true' as const }
              : { 'aria-pressed': 'false' as const })}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        <input
          type="search"
          className="medical-iot-page__search"
          placeholder="Search devices…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search devices"
        />
      </div>

      <section className="medical-iot-page__table" aria-label="Medical IoT device roster">
        <div className="medical-iot-page__table-head">
          <span />
          <span>Device</span>
          <span>Location</span>
          <span>Last seen</span>
          <span>Battery</span>
          <span>Status</span>
          <span>Alarms</span>
        </div>

        {filteredDevices.length ? (
          filteredDevices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              selected={device.id === selectedDeviceId}
              onSelect={setSelectedDeviceId}
            />
          ))
        ) : (
          <p className="medical-iot-page__empty">No devices match the current filter.</p>
        )}
      </section>

      {lastRefreshed ? (
        <p className="medical-iot-page__footer">
          Scanned {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
        </p>
      ) : null}
    </main>
  );
}
