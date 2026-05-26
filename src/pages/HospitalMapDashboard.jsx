import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import {
  fetchHospitalMapSnapshot,
  formatHospitalMapTime,
  getDeviceStatusTone,
  summarizeHospitalMapSnapshot,
} from '../services/hospitalMapService';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './HospitalMapDashboard.css';

const DEVICE_TYPE_OPTIONS = ['all', 'Ventilator', 'Pulse oximeter', 'Infusion pump', 'ECG patch', 'Blood pressure monitor', 'Glucose monitor'];
const STATUS_OPTIONS = ['all', 'online', 'warning', 'stale', 'offline', 'maintenance'];
const HOSPITAL_MAP_REFRESH_MS = 60_000;

function statusLabel(value) {
  return String(value || 'unknown').replace(/-/g, ' ');
}

function StatusBadge({ value }) {
  return (
    <span className={`hospital-map-badge hospital-map-badge--${getDeviceStatusTone(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

function SummaryCard({ label, value, tone = 'neutral', hint }) {
  return (
    <article className={`hospital-map-summary-card hospital-map-summary-card--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function filterSearchBlob(device, room, unit, bed) {
  return [
    device.id,
    device.name,
    device.type,
    device.status,
    device.patientLabel,
    room?.roomNumber,
    unit?.name,
    bed?.label,
    device.serialNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function roomSearchBlob(room, unit) {
  return [room?.id, room?.roomNumber, room?.name, unit?.name, unit?.shortCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function TelemetryParametersPanel({ device }) {
  const telemetry = device?.telemetry || [];
  const parameterCards = [
    'heart-rate',
    'spo2',
    'blood-pressure',
    'respiratory-rate',
    'temperature',
    'glucose',
    'ecg-status',
    'oxygen-flow',
    'infusion-pump-state',
    'ventilator-state',
  ].map((parameter) => telemetry.find((reading) => reading.parameter === parameter));

  return (
    <section className="hospital-map-detail-section" aria-labelledby="telemetry-parameters-title">
      <h3 id="telemetry-parameters-title">Telemetry Parameters</h3>
      <div className="hospital-map-telemetry-grid">
        {parameterCards.map((reading, index) => (
          <article key={reading?.id || `missing-${index}`} className="hospital-map-telemetry-card">
            <span>{reading?.label || 'No parameter'}</span>
            <strong>{reading ? `${reading.value} ${reading.unit}` : 'No reading'}</strong>
            <StatusBadge value={reading?.status || 'unknown'} />
            <time dateTime={reading?.timestamp || ''}>
              {reading ? formatHospitalMapTime(reading.timestamp) : 'No timestamp'}
            </time>
          </article>
        ))}
        <article className="hospital-map-telemetry-card">
          <span>Battery</span>
          <strong>{device?.battery ?? 'Unknown'}%</strong>
          <StatusBadge value={Number(device?.battery) < 20 ? 'warning' : 'ok'} />
          <time dateTime={device?.lastSeenAt || ''}>{formatHospitalMapTime(device?.lastSeenAt)}</time>
        </article>
        <article className="hospital-map-telemetry-card">
          <span>Connectivity</span>
          <strong>{device?.connectivity || 'Unknown'}</strong>
          <StatusBadge value={device?.freshness || device?.status} />
          <time dateTime={device?.lastSeenAt || ''}>{formatHospitalMapTime(device?.lastSeenAt)}</time>
        </article>
      </div>
    </section>
  );
}

function DeviceDetailDrawer({ device, room, unit, bed, onClose }) {
  if (!device) {
    return (
      <aside className="hospital-map-detail hospital-map-detail--empty" aria-label="Device details">
        <h2>Device detail drawer</h2>
        <p>Select a room, bed, device marker, or alert to review telemetry, status, maintenance, and location context.</p>
      </aside>
    );
  }

  return (
    <aside className="hospital-map-detail" aria-label={`${device.name} details`}>
      <div className="hospital-map-detail-header">
        <div>
          <p className="hospital-map-eyebrow">Device Detail Drawer</p>
          <h2>{device.name}</h2>
          <p>
            {device.type} in {unit?.name || 'Unknown unit'} / {room?.roomNumber || 'Unknown room'} /{' '}
            {bed?.label || 'Unassigned bed'}
          </p>
        </div>
        <button type="button" className="hospital-map-icon-button" onClick={onClose} aria-label="Close device details">
          <NavIcon icon={CHROME_ICONS.close} size={18} aria-hidden />
        </button>
      </div>

      <div className="hospital-map-detail-meta">
        <StatusBadge value={device.status} />
        <span>Last seen: {formatHospitalMapTime(device.lastSeenAt)}</span>
        <span>Source: {device.locationSource}</span>
        <span>Patient placeholder: {device.patientLabel}</span>
      </div>

      <TelemetryParametersPanel device={device} />

      <section className="hospital-map-detail-section" aria-labelledby="device-health-title">
        <h3 id="device-health-title">Device Health</h3>
        <dl className="hospital-map-health-grid">
          <div><dt>Battery</dt><dd>{device.battery}% ({device.chargingState})</dd></div>
          <div><dt>Signal</dt><dd>{device.signalStrength}% via {device.connectivity}</dd></div>
          <div><dt>Maintenance</dt><dd>{statusLabel(device.maintenanceStatus)}</dd></div>
          <div><dt>Calibration</dt><dd>{statusLabel(device.calibrationStatus)}</dd></div>
          <div><dt>Firmware</dt><dd>{device.firmwareVersion}</dd></div>
          <div><dt>Utilization</dt><dd>{device.utilization}%</dd></div>
        </dl>
      </section>

      <section className="hospital-map-detail-section" aria-labelledby="device-alerts-title">
        <h3 id="device-alerts-title">Active Alerts</h3>
        {device.activeAlerts.length ? (
          <ul className="hospital-map-detail-alerts">
            {device.activeAlerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
                <time dateTime={alert.triggeredAt}>{formatHospitalMapTime(alert.triggeredAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hospital-map-empty">No active alerts for this demo device.</p>
        )}
      </section>
    </aside>
  );
}

function FloorPlanViewer({ floor, rooms, beds, devices, selectedDeviceId, onSelectDevice }) {
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const bedsByRoomId = beds.reduce((groups, bed) => {
    groups[bed.roomId] = groups[bed.roomId] || [];
    groups[bed.roomId].push(bed);
    return groups;
  }, {});
  const positionedBeds = beds.flatMap((bed) => {
    const room = roomById[bed.roomId];
    if (!room) return [];
    const roomBeds = bedsByRoomId[bed.roomId] || [];
    const bedIndex = Math.max(0, roomBeds.findIndex((candidate) => candidate.id === bed.id));
    const bedWidth = Math.max(58, Math.min(92, (room.width - 46) / Math.max(roomBeds.length, 1)));
    return [{
      ...bed,
      x: room.x + 18 + bedIndex * (bedWidth + 8),
      y: room.y + room.height - 46,
      width: bedWidth,
      height: 24,
    }];
  });

  return (
    <section className="hospital-map-panel" aria-labelledby="floor-plan-title">
      <div className="hospital-map-panel-header">
        <div>
          <h2 id="floor-plan-title">Hospital Floor Plan</h2>
          <p>SVG indoor map with units, rooms, beds, device markers, alert markers, and stale/offline states.</p>
        </div>
        <StatusBadge value="demo" />
      </div>
      <div className="hospital-map-canvas" role="img" aria-label={`${floor?.name || 'Hospital'} floor plan`}>
        <svg viewBox={floor?.viewBox || '0 0 1000 620'} aria-hidden="true" focusable="false">
          <rect x="28" y="34" width="878" height="520" rx="28" className="hospital-map-floor-shell" />
          <rect x="68" y="270" width="760" height="58" rx="18" className="hospital-map-corridor" />
          {rooms.map((room) => (
            <g key={room.id}>
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="18"
                className={room.activeAlertCount ? 'hospital-map-room hospital-map-room--alert' : 'hospital-map-room'}
              />
              <text x={room.x + 18} y={room.y + 34} className="hospital-map-room-label">{room.roomNumber}</text>
              <text x={room.x + 18} y={room.y + 58} className="hospital-map-room-meta">
                {room.deviceCount} device(s) / {room.activeAlertCount} alert(s)
              </text>
            </g>
          ))}
          {positionedBeds.map((bed) => (
            <g key={bed.id}>
              <rect
                x={bed.x}
                y={bed.y}
                width={bed.width}
                height={bed.height}
                rx="8"
                className={`hospital-map-bed hospital-map-bed--${bed.status || 'unknown'}`}
              />
              <text x={bed.x + 8} y={bed.y + 16} className="hospital-map-bed-label">
                {bed.label}
              </text>
            </g>
          ))}
          {devices.map((device) => (
            <g key={device.id}>
              <circle
                cx={device.x}
                cy={device.y}
                r={selectedDeviceId === device.id ? 18 : 14}
                className={`hospital-map-marker hospital-map-marker--${getDeviceStatusTone(device.status)}`}
              />
              {device.activeAlerts.length ? (
                <circle cx={device.x + 14} cy={device.y - 14} r="8" className="hospital-map-alert-dot" />
              ) : null}
            </g>
          ))}
        </svg>
        <div className="hospital-map-marker-buttons" aria-label="Device markers">
          {devices.map((device) => (
            <button
              key={device.id}
              type="button"
              className={`hospital-map-marker-button hospital-map-marker-button--${getDeviceStatusTone(device.status)}`}
              style={{ left: `${(device.x / 1000) * 100}%`, top: `${(device.y / 620) * 100}%` }}
              onClick={() => onSelectDevice(device)}
              aria-label={`Open ${device.name} details`}
            >
              {device.activeAlerts.length ? <span aria-hidden>!</span> : <span aria-hidden>{device.type[0]}</span>}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AlertsList({ alerts, devicesById, onSelectDevice }) {
  return (
    <section className="hospital-map-section" aria-labelledby="hospital-alerts-title">
      <h2 id="hospital-alerts-title">Device Alerts</h2>
      <div className="hospital-map-alert-list">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            className={`hospital-map-alert-card hospital-map-alert-card--${alert.severity}`}
            onClick={() => onSelectDevice(devicesById[alert.deviceId])}
          >
            <span className="hospital-map-alert-severity">{alert.severity}</span>
            <strong>{alert.title}</strong>
            <span>{alert.deviceName} - {alert.detail}</span>
            <time dateTime={alert.triggeredAt}>{formatHospitalMapTime(alert.triggeredAt)}</time>
          </button>
        ))}
      </div>
    </section>
  );
}

function RoomBedGrid({ rooms, beds, devices, unitsById, onSelectDevice }) {
  const devicesByRoomId = devices.reduce((groups, device) => {
    groups[device.roomId] = groups[device.roomId] || [];
    groups[device.roomId].push(device);
    return groups;
  }, {});
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));

  return (
    <section className="hospital-map-section" aria-labelledby="room-bed-grid-title">
      <div className="hospital-map-panel-header">
        <div>
          <h2 id="room-bed-grid-title">Room Grid & Bed Grid</h2>
          <p className="hospital-map-section-note">
            Room and bed cards mirror the SVG coordinate map for keyboard and compact viewport workflows.
          </p>
        </div>
      </div>
      <div className="hospital-map-room-grid" aria-label="Room grid">
        {rooms.map((room) => {
          const roomDevices = devicesByRoomId[room.id] || [];
          return (
            <article key={room.id} className="hospital-map-room-card">
              <div>
                <strong>{room.roomNumber}</strong>
                <span>{unitsById[room.unitId]?.name || 'Unknown unit'}</span>
              </div>
              <div className="hospital-map-room-card-meta">
                <StatusBadge value={room.activeAlertCount ? 'warning' : 'ok'} />
                <span>{room.deviceCount} device(s)</span>
                <span>{room.activeAlertCount} alert(s)</span>
              </div>
              {roomDevices[0] ? (
                <button
                  type="button"
                  className="hospital-map-table-action"
                  onClick={() => onSelectDevice(roomDevices[0])}
                >
                  Open room device
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className="hospital-map-bed-grid" aria-label="Bed grid">
        {beds.map((bed) => {
          const bedDevice = devices.find((device) => device.bedId === bed.id);
          return (
            <button
              key={bed.id}
              type="button"
              className="hospital-map-bed-card"
              onClick={() => (bedDevice ? onSelectDevice(bedDevice) : undefined)}
              disabled={!bedDevice}
            >
              <strong>{bed.label}</strong>
              <span>{roomById[bed.roomId]?.roomNumber || 'Unknown room'}</span>
              <StatusBadge value={bed.status} />
              <small>{bedDevice ? bedDevice.name : 'No assigned device'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DeviceFleetTable({ devices, onSelectDevice }) {
  return (
    <section className="hospital-map-section" aria-labelledby="fleet-table-title">
      <h2 id="fleet-table-title">Device Fleet Management</h2>
      <p className="hospital-map-section-note">
        Demo inventory includes assignment, maintenance, calibration, firmware, battery, location, and utilization.
      </p>
      <div className="hospital-map-table-wrap">
        <table className="hospital-map-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Battery</th>
              <th>Maintenance</th>
              <th>Calibration</th>
              <th>Firmware</th>
              <th>Utilization</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td>
                  <strong>{device.name}</strong>
                  <span>{device.type} - {device.serialNumber}</span>
                </td>
                <td><StatusBadge value={device.status} /></td>
                <td>{device.battery}%</td>
                <td>{statusLabel(device.maintenanceStatus)}</td>
                <td>{statusLabel(device.calibrationStatus)}</td>
                <td>{device.firmwareVersion}</td>
                <td>{device.utilization}%</td>
                <td>
                  <button type="button" className="hospital-map-table-action" onClick={() => onSelectDevice(device)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HospitalMapDashboard() {
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const [state, setState] = useState({ loading: true, error: '', snapshot: null, message: '' });
  const [selectedFloorId, setSelectedFloorId] = useState('floor-2');
  const [selectedUnitId, setSelectedUnitId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [alertOnly, setAlertOnly] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const loadSnapshot = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await fetchHospitalMapSnapshot();
      setState({ loading: false, error: '', snapshot: result.snapshot, message: result.message || '' });
      if (result.snapshot?.devices?.[0]) {
        setSelectedDeviceId((current) => current || result.snapshot.devices[0].id);
      }
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load hospital map telemetry.',
        snapshot: null,
        message: '',
      });
    }
  }, []);

  useEffect(() => {
    recordToolAccess('hospital-map');
    loadSnapshot();
    const refreshTimer = window.setInterval(loadSnapshot, HOSPITAL_MAP_REFRESH_MS);
    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadSnapshot, recordToolAccess]);

  const snapshot = state.snapshot;
  const summary = useMemo(() => summarizeHospitalMapSnapshot(snapshot), [snapshot]);
  const floorsById = useMemo(() => Object.fromEntries((snapshot?.floors || []).map((floor) => [floor.id, floor])), [snapshot]);
  const unitsById = useMemo(() => Object.fromEntries((snapshot?.units || []).map((unit) => [unit.id, unit])), [snapshot]);
  const roomsById = useMemo(() => Object.fromEntries((snapshot?.rooms || []).map((room) => [room.id, room])), [snapshot]);
  const bedsById = useMemo(() => Object.fromEntries((snapshot?.beds || []).map((bed) => [bed.id, bed])), [snapshot]);
  const devicesById = useMemo(() => Object.fromEntries((snapshot?.devices || []).map((device) => [device.id, device])), [snapshot]);
  const selectedFloor = floorsById[selectedFloorId] || snapshot?.floors?.[0] || null;
  const selectedDevice = selectedDeviceId ? devicesById[selectedDeviceId] : null;

  const filteredRooms = useMemo(
    () => {
      const searchQuery = roomSearch.trim().toLowerCase();
      return (snapshot?.rooms || []).filter((room) => {
        if (room.floorId !== selectedFloor?.id) return false;
        if (selectedUnitId !== 'all' && room.unitId !== selectedUnitId) return false;
        if (!searchQuery) return true;
        return roomSearchBlob(room, unitsById[room.unitId]).includes(searchQuery);
      });
    },
    [roomSearch, selectedFloor, selectedUnitId, snapshot, unitsById]
  );

  const filteredDevices = useMemo(() => {
    const searchQuery = deviceSearch.trim().toLowerCase();
    const roomSearchActive = roomSearch.trim().length > 0;
    const visibleRoomIds = new Set(filteredRooms.map((room) => room.id));
    return (snapshot?.devices || []).filter((device) => {
      if (selectedFloor?.id && device.floorId !== selectedFloor.id) return false;
      if ((roomSearchActive || visibleRoomIds.size) && !visibleRoomIds.has(device.roomId)) return false;
      if (selectedUnitId !== 'all' && device.unitId !== selectedUnitId) return false;
      if (selectedStatus !== 'all' && device.status !== selectedStatus && device.freshness !== selectedStatus) return false;
      if (selectedType !== 'all' && device.type !== selectedType) return false;
      if (alertOnly && device.activeAlerts.length === 0) return false;
      if (!searchQuery) return true;
      return filterSearchBlob(device, roomsById[device.roomId], unitsById[device.unitId], bedsById[device.bedId]).includes(searchQuery);
    });
  }, [alertOnly, bedsById, deviceSearch, filteredRooms, roomSearch, roomsById, selectedFloor, selectedStatus, selectedType, selectedUnitId, snapshot, unitsById]);
  const filteredAlerts = useMemo(
    () => (snapshot?.alerts || []).filter((alert) => filteredDevices.some((device) => device.id === alert.deviceId)),
    [filteredDevices, snapshot]
  );

  const selectDevice = (device) => {
    if (device?.id) setSelectedDeviceId(device.id);
  };

  const askAssistant = () => {
    addMessage(
      'Show hospital map device alerts, offline devices, stale telemetry, low battery devices, and maintenance overdue items. Monitoring support only; do not replace bedside alarms.',
      'user'
    );
    navigate('/assistant');
  };

  const launchMedicalIot = () => {
    applyRegistryToolLaunch('medical-iot-dashboard', {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: false,
    });
  };

  return (
    <main className="hospital-map-page">
      <section className="hospital-map-hero" aria-labelledby="hospital-map-title">
        <div>
          <p className="hospital-map-eyebrow">Hospital operations command</p>
          <h1 id="hospital-map-title">Hospital Map</h1>
          <p>
            View hospital floors, rooms, beds, medical devices, IoT telemetry, alerts, maintenance,
            and fleet utilization. Monitoring support only; not a replacement for bedside alarms.
          </p>
        </div>
        <div className="hospital-map-hero-actions">
          <button type="button" className="hospital-map-action" onClick={askAssistant}>
            Ask Assistant
          </button>
          <button type="button" className="hospital-map-action hospital-map-action--secondary" onClick={launchMedicalIot}>
            Open Medical IoT
          </button>
          <Link to="/operations" className="hospital-map-action hospital-map-action--secondary">
            Operations
          </Link>
        </div>
      </section>

      {state.loading ? (
        <section className="hospital-map-state" role="status" aria-label="Loading hospital map telemetry">
          <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
          <p>Loading hospital map telemetry...</p>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="hospital-map-state hospital-map-state--error" role="alert">
          <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
          <div>
            <h2>Hospital map telemetry unavailable</h2>
            <p>{state.error}</p>
            <button type="button" className="hospital-map-action" onClick={loadSnapshot}>
              Retry loading hospital map
            </button>
          </div>
        </section>
      ) : null}

      {!state.loading && !state.error && snapshot ? (
        <>
          <section className="hospital-map-source" role="status">
            <strong>{snapshot.sourceLabel}</strong>
            <span>Last updated: {formatHospitalMapTime(snapshot.generatedAt)}</span>
            {state.message ? <span>{state.message}</span> : null}
          </section>

          <section className="hospital-map-summary" aria-label="Hospital map status summary">
            <SummaryCard label="Floors" value={summary.floors} />
            <SummaryCard label="Rooms" value={summary.rooms} />
            <SummaryCard label="Beds" value={summary.beds} />
            <SummaryCard label="Devices" value={summary.devices} />
            <SummaryCard label="Offline" value={summary.offline} tone={summary.offline ? 'critical' : 'good'} hint="Last seen required" />
            <SummaryCard label="Stale telemetry" value={summary.stale} tone={summary.stale ? 'warning' : 'good'} />
            <SummaryCard label="Active alerts" value={summary.activeAlerts} tone={summary.activeAlerts ? 'warning' : 'good'} />
            <SummaryCard label="Maintenance due" value={summary.maintenanceDue} tone={summary.maintenanceDue ? 'warning' : 'good'} />
          </section>

          <section className="hospital-map-filters" aria-label="Hospital map filters">
            <label>
              <span>Floor</span>
              <select value={selectedFloorId} onChange={(event) => setSelectedFloorId(event.target.value)}>
                {snapshot.floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>{floor.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Unit</span>
              <select value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)}>
                <option value="all">All units</option>
                {snapshot.units
                  .filter((unit) => unit.floorId === selectedFloorId)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Device type</span>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                {DEVICE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{type === 'all' ? 'All device types' : type}</option>
                ))}
              </select>
            </label>
            <label className="hospital-map-search">
              <span>Room search</span>
              <input
                type="search"
                value={roomSearch}
                onChange={(event) => setRoomSearch(event.target.value)}
                placeholder="Try ICU-12, ED-4, Medical-Surgical..."
              />
            </label>
            <label className="hospital-map-search">
              <span>Device search</span>
              <input
                type="search"
                value={deviceSearch}
                onChange={(event) => setDeviceSearch(event.target.value)}
                placeholder="Try pump, ECG, Patient A..."
              />
            </label>
            <label className="hospital-map-check">
              <input type="checkbox" checked={alertOnly} onChange={(event) => setAlertOnly(event.target.checked)} />
              <span>Active alerts only</span>
            </label>
          </section>

          <div className="hospital-map-workspace">
            <FloorPlanViewer
              floor={selectedFloor}
              rooms={filteredRooms}
              beds={(snapshot?.beds || []).filter((bed) => filteredRooms.some((room) => room.id === bed.roomId))}
              devices={filteredDevices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={selectDevice}
            />
            <DeviceDetailDrawer
              device={selectedDevice}
              room={selectedDevice ? roomsById[selectedDevice.roomId] : null}
              unit={selectedDevice ? unitsById[selectedDevice.unitId] : null}
              bed={selectedDevice ? bedsById[selectedDevice.bedId] : null}
              onClose={() => setSelectedDeviceId(null)}
            />
          </div>

          <RoomBedGrid
            rooms={filteredRooms}
            beds={(snapshot?.beds || []).filter((bed) => filteredRooms.some((room) => room.id === bed.roomId))}
            devices={filteredDevices}
            unitsById={unitsById}
            onSelectDevice={selectDevice}
          />

          <div className="hospital-map-lower-grid">
            <AlertsList alerts={filteredAlerts} devicesById={devicesById} onSelectDevice={selectDevice} />
            <DeviceFleetTable devices={filteredDevices} onSelectDevice={selectDevice} />
          </div>
        </>
      ) : null}
    </main>
  );
}
