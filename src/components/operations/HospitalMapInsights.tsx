import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import StateSourceNotice from '../StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  formatHospitalMapTime,
  getDeviceStatusTone,
  summarizeHospitalMapSnapshot,
} from '../../services/hospitalMapService';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildDeviceMarkers,
  buildRoomMarkers,
  buildUnitOccupancyChart,
} from '../../utils/hospitalMapChartModel';

type HospitalMapSnapshot = {
  source?: string;
  sourceLabel?: string;
  generatedAt?: string;
  floors?: Array<{ id: string; name: string; viewBox?: string }>;
  rooms?: Array<{
    id: string;
    floorId?: string;
    roomNumber?: string;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    deviceCount?: number;
    activeAlertCount?: number;
  }>;
  devices?: Array<{
    id: string;
    name: string;
    x?: number;
    y?: number;
    status?: string;
    roomId?: string;
    location?: { x?: number; y?: number };
  }>;
  alerts?: Array<{
    id: string;
    title: string;
    severity: string;
    status?: string;
    roomId?: string;
    deviceName?: string;
  }>;
};

type CapacityUnit = {
  id: string;
  name: string;
  occupied: number;
  total: number;
};

type HospitalMapInsightsProps = {
  snapshot: HospitalMapSnapshot | null;
  capacityUnits?: CapacityUnit[];
  unsupported?: boolean;
  message?: string;
};

const ROOM_FILL: Record<string, string> = {
  good: 'color-mix(in srgb, var(--app-chart-2) 18%, transparent)',
  warning: 'color-mix(in srgb, var(--app-chart-5) 22%, transparent)',
  critical: 'color-mix(in srgb, var(--app-status-critical, #ef4444) 24%, transparent)',
  neutral: 'color-mix(in srgb, var(--app-chart-3) 12%, transparent)',
};

const ROOM_STROKE: Record<string, string> = {
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

const DEVICE_FILL: Record<string, string> = {
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

export default function HospitalMapInsights({
  snapshot,
  capacityUnits = [],
  unsupported = false,
  message,
}: HospitalMapInsightsProps) {
  const floors = snapshot?.floors || [];
  const [selectedFloorId, setSelectedFloorId] = useState(floors[0]?.id || '');
  const activeFloorId = selectedFloorId || floors[0]?.id || '';

  const floorRooms = useMemo(
    () => (snapshot?.rooms || []).filter((room) => !activeFloorId || room.floorId === activeFloorId),
    [activeFloorId, snapshot?.rooms],
  );
  const roomMarkers = useMemo(() => buildRoomMarkers(floorRooms), [floorRooms]);
  const floorDevices = useMemo(
    () =>
      (snapshot?.devices || []).filter(
        (device) =>
          !activeFloorId ||
          floorRooms.some((room) => room.id === device.roomId),
      ),
    [activeFloorId, floorRooms, snapshot?.devices],
  );
  const deviceMarkers = useMemo(() => buildDeviceMarkers(floorDevices), [floorDevices]);
  const occupancyChart = useMemo(
    () => buildUnitOccupancyChart(capacityUnits),
    [capacityUnits],
  );
  const summary = useMemo(
    () => (snapshot ? summarizeHospitalMapSnapshot(snapshot) : null),
    [snapshot],
  );
  const activeAlerts = useMemo(
    () => (snapshot?.alerts || []).filter((alert) => (alert.status || 'active') === 'active').slice(0, 6),
    [snapshot?.alerts],
  );

  const sourceStates = unsupported
    ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE, DEMO_LIVE_STATES.UNSUPPORTED]
    : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED];

  const viewBox =
    floors.find((floor) => floor.id === activeFloorId)?.viewBox || '0 0 1000 620';

  return (
    <section className="hospital-map-insights" aria-label="Hospital floor plan insights">
      <div className="hospital-map-insights__header">
        <GraphicIconBadge iconKey="layout-dashboard" accent="information" size="sm" />
        <div>
          <h2>Floor plan intelligence</h2>
          <p>Room occupancy overlay, device positions, and active alerts for operations review.</p>
        </div>
      </div>

      <StateSourceNotice
        title="Hospital map source state"
        states={sourceStates}
        details={snapshot?.sourceLabel || message}
      />

      {summary ? (
        <div className="hospital-map-insights__metrics" role="group" aria-label="Hospital map summary metrics">
          <MetricCard label="Rooms" value={String(summary.rooms)} hint="Mapped rooms in snapshot" tone="neutral" />
          <MetricCard
            label="Devices"
            value={String(summary.devices)}
            hint="Registered devices on floor plan"
            tone="neutral"
          />
          <MetricCard
            label="Active alerts"
            value={String(summary.activeAlerts)}
            hint="Alerts requiring operations review"
            tone={summary.activeAlerts > 0 ? 'warning' : 'good'}
          />
          <MetricCard
            label="Offline / stale"
            value={String(summary.offline + summary.stale)}
            hint="Devices with connectivity gaps"
            tone={summary.offline + summary.stale > 0 ? 'warning' : 'good'}
          />
        </div>
      ) : null}

      <div className="hospital-map-insights__layout">
        <section className="hospital-map-insights__map-shell" aria-label="Hospital floor plan canvas">
          {floors.length > 1 ? (
            <div className="hospital-map-insights__floor-tabs" role="tablist" aria-label="Hospital floors">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  role="tab"
                  {...((floor.id === activeFloorId) ? { 'aria-selected': 'true' as const } : { 'aria-selected': 'false' as const })}
                  className={floor.id === activeFloorId ? 'is-active' : undefined}
                  onClick={() => setSelectedFloorId(floor.id)}
                >
                  {floor.name}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="hospital-map-canvas hospital-map-insights__canvas"
            role="img"
            aria-label="Hospital floor plan with rooms and devices"
          >
            <svg viewBox={viewBox} className="hospital-map-insights__svg" preserveAspectRatio="xMidYMid meet">
              {roomMarkers.map((room) => (
                <g key={room.id}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    rx="10"
                    fill={ROOM_FILL[room.tone]}
                    stroke={ROOM_STROKE[room.tone]}
                    strokeWidth="2"
                  />
                  <text x={room.x + 12} y={room.y + 22} className="hospital-map-insights__room-label">
                    {room.label}
                  </text>
                  <text x={room.x + 12} y={room.y + 40} className="hospital-map-insights__room-meta">
                    {room.deviceCount} devices · {room.alertCount} alerts
                  </text>
                </g>
              ))}

              {deviceMarkers.map((device) => {
                const tone = getDeviceStatusTone(device.status);
                return (
                  <g key={device.id} transform={`translate(${device.x} ${device.y})`}>
                    <circle r="8" fill={DEVICE_FILL[tone]} />
                    <text x="12" y="4" className="hospital-map-insights__device-label">
                      {device.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {snapshot?.generatedAt ? (
            <p className="hospital-map-insights__timestamp">
              Floor plan updated {formatHospitalMapTime(snapshot.generatedAt)}
            </p>
          ) : null}
        </section>

        <aside className="hospital-map-insights__panel" aria-label="Hospital map charts and alerts">
          <VisualizationPanel
            title="Unit occupancy"
            description="Bed occupancy percentage from capacity dashboard."
            badge="Capacity"
          >
            <CategoryBarChart
              data={occupancyChart}
              title="Unit occupancy"
              color="var(--app-chart-1)"
              emptyMessage="Occupancy chart appears when capacity units are available."
            />
          </VisualizationPanel>

          <div className="hospital-map-insights__alerts" aria-label="Active device alerts">
            <h3>Active alerts</h3>
            {activeAlerts.length ? (
              activeAlerts.map((alert) => (
                <article key={alert.id} className="hospital-map-insights__alert-item">
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.deviceName || 'Device'} · {alert.severity}
                  </span>
                </article>
              ))
            ) : (
              <p className="hospital-map-insights__empty">No active device alerts in the current snapshot.</p>
            )}
          </div>

          <p className="hospital-map-insights__links">
            <Link to={CANONICAL_ROUTES.liveMap}>Open live tracking map</Link>
            {' · '}
            <Link to={CANONICAL_ROUTES.medicalIot}>Open medical IoT dashboard</Link>
          </p>
        </aside>
      </div>
    </section>
  );
}