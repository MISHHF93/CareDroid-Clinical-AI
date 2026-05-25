import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import {
  fetchHospitalMapSnapshot,
  formatHospitalMapTime,
  getDeviceStatusTone,
  summarizeHospitalMapSnapshot,
} from '../services/hospitalMapService';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './DeviceFleetManagement.css';

const TOOL_ID = 'device-fleet-management';
const STATUS_OPTIONS = ['all', 'online', 'warning', 'stale', 'offline', 'maintenance'];
const MAINTENANCE_OPTIONS = ['all', 'ok', 'due-soon', 'overdue'];
const FLEET_REFRESH_MS = 60_000;

function statusLabel(value) {
  return String(value || 'unknown').replace(/[-_]/g, ' ');
}

function StatusBadge({ value }) {
  return (
    <span className={`device-fleet-badge device-fleet-badge--${getDeviceStatusTone(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

function SummaryCard({ label, value, tone = 'neutral', hint }) {
  return (
    <article className={`device-fleet-summary-card device-fleet-summary-card--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function deviceSearchBlob(device, room, bed, unit) {
  return [
    device.id,
    device.name,
    device.type,
    device.model,
    device.manufacturer,
    device.serialNumber,
    device.firmwareVersion,
    device.status,
    device.maintenanceStatus,
    device.calibrationStatus,
    room?.roomNumber,
    bed?.label,
    unit?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function DeviceDetailPanel({ device, room, bed, unit, maintenanceRecord, locationEvents, actionNote, onClose }) {
  if (!device) {
    return (
      <aside className="device-fleet-detail device-fleet-detail--empty" aria-label="Device fleet details">
        <h2>Device detail</h2>
        <p>Select a fleet row or card to review assignment, health, service, and location history placeholders.</p>
      </aside>
    );
  }

  return (
    <aside className="device-fleet-detail" aria-label={`${device.name} details`}>
      <div className="device-fleet-detail-header">
        <div>
          <p className="device-fleet-eyebrow">Demo Device Fleet Detail</p>
          <h2>{device.name}</h2>
          <p>{device.type} in {unit?.name || 'Unassigned unit'} / {room?.roomNumber || 'No room'} / {bed?.label || 'No bed'}</p>
        </div>
        <button type="button" className="device-fleet-icon-button" onClick={onClose} aria-label="Close device details">
          <NavIcon icon={CHROME_ICONS.close} size={18} aria-hidden />
        </button>
      </div>

      <div className="device-fleet-detail-meta">
        <StatusBadge value={device.status} />
        <span>Last seen: {formatHospitalMapTime(device.lastSeenAt)}</span>
        <span>Source: {device.locationSource}</span>
      </div>

      {actionNote ? <p className="device-fleet-action-note">{actionNote}</p> : null}

      <dl className="device-fleet-detail-grid">
        <div><dt>Serial</dt><dd>{device.serialNumber}</dd></div>
        <div><dt>Firmware</dt><dd>{device.firmwareVersion}</dd></div>
        <div><dt>Battery</dt><dd>{device.battery}% ({device.chargingState})</dd></div>
        <div><dt>Signal</dt><dd>{device.signalStrength}% via {device.connectivity}</dd></div>
        <div><dt>Maintenance</dt><dd>{statusLabel(device.maintenanceStatus)}</dd></div>
        <div><dt>Calibration</dt><dd>{statusLabel(device.calibrationStatus)}</dd></div>
        <div><dt>Utilization</dt><dd>{device.utilization}%</dd></div>
        <div><dt>Last service</dt><dd>{maintenanceRecord ? formatHospitalMapTime(maintenanceRecord.dueAt) : 'Demo record not available'}</dd></div>
      </dl>

      <section className="device-fleet-detail-section">
        <h3>Location History Placeholder</h3>
        {locationEvents.length ? (
          <ul className="device-fleet-history">
            {locationEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.source}</strong>
                <span>{event.roomId || 'Unknown room'} · confidence {Math.round((event.confidence || 0) * 100)}%</span>
                <time dateTime={event.observedAt}>{formatHospitalMapTime(event.observedAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="device-fleet-empty">No live location history endpoint exists yet; demo coordinate only.</p>
        )}
      </section>
    </aside>
  );
}

export default function DeviceFleetManagement() {
  const { recordToolAccess } = useToolPreferences();
  const [state, setState] = useState({ loading: true, error: '', snapshot: null, message: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [maintenanceFilter, setMaintenanceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [actionNotes, setActionNotes] = useState({});

  const loadSnapshot = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await fetchHospitalMapSnapshot();
      setState({ loading: false, error: '', snapshot: result.snapshot, message: result.message || '' });
      setSelectedDeviceId((current) => current || result.snapshot?.devices?.[0]?.id || null);
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load device fleet demo snapshot.',
        snapshot: null,
        message: '',
      });
    }
  }, []);

  useEffect(() => {
    recordToolAccess(TOOL_ID);
    loadSnapshot();
    const timer = window.setInterval(loadSnapshot, FLEET_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot, recordToolAccess]);

  const snapshot = state.snapshot;
  const summary = useMemo(() => summarizeHospitalMapSnapshot(snapshot), [snapshot]);
  const roomsById = useMemo(() => Object.fromEntries((snapshot?.rooms || []).map((room) => [room.id, room])), [snapshot]);
  const bedsById = useMemo(() => Object.fromEntries((snapshot?.beds || []).map((bed) => [bed.id, bed])), [snapshot]);
  const unitsById = useMemo(() => Object.fromEntries((snapshot?.units || []).map((unit) => [unit.id, unit])), [snapshot]);
  const maintenanceByDeviceId = useMemo(
    () => Object.fromEntries((snapshot?.maintenanceRecords || []).map((record) => [record.deviceId, record])),
    [snapshot]
  );
  const locationEventsByDeviceId = useMemo(() => {
    const grouped = {};
    for (const event of snapshot?.locationEvents || []) {
      grouped[event.deviceId] = grouped[event.deviceId] || [];
      grouped[event.deviceId].push(event);
    }
    return grouped;
  }, [snapshot]);
  const typeOptions = useMemo(
    () => ['all', ...new Set((snapshot?.devices || []).map((device) => device.type))],
    [snapshot]
  );
  const locationOptions = useMemo(
    () => ['all', ...new Set((snapshot?.units || []).map((unit) => unit.id))],
    [snapshot]
  );

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (snapshot?.devices || []).filter((device) => {
      if (statusFilter !== 'all' && device.status !== statusFilter && device.freshness !== statusFilter) return false;
      if (maintenanceFilter !== 'all' && device.maintenanceStatus !== maintenanceFilter) return false;
      if (typeFilter !== 'all' && device.type !== typeFilter) return false;
      if (locationFilter !== 'all' && device.unitId !== locationFilter) return false;
      if (!query) return true;
      return deviceSearchBlob(device, roomsById[device.roomId], bedsById[device.bedId], unitsById[device.unitId]).includes(query);
    });
  }, [bedsById, locationFilter, maintenanceFilter, roomsById, search, snapshot, statusFilter, typeFilter, unitsById]);

  const selectedDevice = (snapshot?.devices || []).find((device) => device.id === selectedDeviceId) || null;
  const selectedActionNote = selectedDevice ? actionNotes[selectedDevice.id] : '';

  const setDemoAction = (device, action) => {
    setSelectedDeviceId(device.id);
    setActionNotes((current) => ({
      ...current,
      [device.id]: `${action} is demo/local only. No backend write API was called.`,
    }));
  };

  return (
    <main className="device-fleet-page">
      <section className="device-fleet-hero" aria-labelledby="device-fleet-title">
        <div>
          <p className="device-fleet-eyebrow">Biomedical operations</p>
          <h1 id="device-fleet-title">Device Fleet Management</h1>
          <p>
            Manage the visible medical device inventory with assignment, maintenance, calibration,
            firmware, battery, utilization, and location-history context. Demo actions are local only.
          </p>
        </div>
        <div className="device-fleet-hero-actions">
          <Link to="/hospital-map" className="device-fleet-action">Open Hospital Map</Link>
          <Link to="/medical-iot" className="device-fleet-action device-fleet-action--secondary">Open Medical IoT</Link>
        </div>
      </section>

      <section className="device-fleet-safety" role="note">
        <strong>Demo/local actions only.</strong> Backend write endpoints for assignment, maintenance,
        calibration, firmware updates, and status changes are not connected. This page is monitoring
        and planning support only.
      </section>

      {state.loading ? (
        <section className="device-fleet-state" role="status" aria-label="Loading device fleet">
          <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
          <p>Loading device fleet...</p>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="device-fleet-state device-fleet-state--error" role="alert">
          <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
          <div>
            <h2>Device fleet unavailable</h2>
            <p>{state.error}</p>
            <button type="button" className="device-fleet-action" onClick={loadSnapshot}>Retry loading devices</button>
          </div>
        </section>
      ) : null}

      {!state.loading && !state.error && snapshot ? (
        <>
          <section className="device-fleet-source" role="status">
            <strong>{snapshot.sourceLabel}</strong>
            <span>Last updated: {formatHospitalMapTime(snapshot.generatedAt)}</span>
            {state.message ? <span>{state.message}</span> : null}
          </section>

          <section className="device-fleet-summary" aria-label="Device fleet summary">
            <SummaryCard label="Devices" value={summary.devices} />
            <SummaryCard label="Offline" value={summary.offline} tone={summary.offline ? 'critical' : 'good'} />
            <SummaryCard label="Stale" value={summary.stale} tone={summary.stale ? 'warning' : 'good'} />
            <SummaryCard label="Low battery" value={summary.lowBattery} tone={summary.lowBattery ? 'warning' : 'good'} />
            <SummaryCard label="Maintenance due" value={summary.maintenanceDue} tone={summary.maintenanceDue ? 'warning' : 'good'} />
            <SummaryCard label="Calibration overdue" value={summary.calibrationOverdue} tone={summary.calibrationOverdue ? 'critical' : 'good'} />
          </section>

          <section className="device-fleet-filters" aria-label="Device fleet filters">
            <label>
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {typeOptions.map((type) => <option key={type} value={type}>{type === 'all' ? 'All device types' : type}</option>)}
              </select>
            </label>
            <label>
              <span>Location</span>
              <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                {locationOptions.map((unitId) => (
                  <option key={unitId} value={unitId}>{unitId === 'all' ? 'All units' : unitsById[unitId]?.name || unitId}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Maintenance</span>
              <select value={maintenanceFilter} onChange={(event) => setMaintenanceFilter(event.target.value)}>
                {MAINTENANCE_OPTIONS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label className="device-fleet-search">
              <span>Search device ID, room, bed, firmware</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try pump, ICU-14, DEMO-PUMP..."
              />
            </label>
          </section>

          <div className="device-fleet-workspace">
            <section className="device-fleet-section" aria-labelledby="device-inventory-title">
              <h2 id="device-inventory-title">Device Inventory</h2>
              <p className="device-fleet-section-note">
                Action menu entries are demo/local only until audited backend write endpoints exist.
              </p>
              <div className="device-fleet-table-wrap">
                <table className="device-fleet-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Assignment</th>
                      <th>Status</th>
                      <th>Battery / Signal</th>
                      <th>Maintenance</th>
                      <th>Firmware</th>
                      <th>Utilization</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => (
                      <tr key={device.id}>
                        <td>
                          <strong>{device.name}</strong>
                          <span>{device.id} · {device.type} · {device.serialNumber}</span>
                        </td>
                        <td>
                          <strong>{unitsById[device.unitId]?.name || 'Unassigned'}</strong>
                          <span>{roomsById[device.roomId]?.roomNumber || 'No room'} / {bedsById[device.bedId]?.label || 'No bed'}</span>
                        </td>
                        <td><StatusBadge value={device.status} /></td>
                        <td>{device.battery}% · {device.signalStrength}% · {device.connectivity}</td>
                        <td>{statusLabel(device.maintenanceStatus)} / {statusLabel(device.calibrationStatus)}</td>
                        <td>{device.firmwareVersion}</td>
                        <td>{device.utilization}%</td>
                        <td>
                          <div className="device-fleet-row-actions">
                            <button type="button" onClick={() => setSelectedDeviceId(device.id)}>View details</button>
                            <button type="button" onClick={() => setDemoAction(device, 'Mark maintenance needed')}>Mark maintenance needed</button>
                            <button type="button" onClick={() => setDemoAction(device, 'Assign location')}>Assign location</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredDevices.length === 0 ? (
                <p className="device-fleet-empty">No devices match the current filters.</p>
              ) : null}
            </section>

            <DeviceDetailPanel
              device={selectedDevice}
              room={selectedDevice ? roomsById[selectedDevice.roomId] : null}
              bed={selectedDevice ? bedsById[selectedDevice.bedId] : null}
              unit={selectedDevice ? unitsById[selectedDevice.unitId] : null}
              maintenanceRecord={selectedDevice ? maintenanceByDeviceId[selectedDevice.id] : null}
              locationEvents={selectedDevice ? locationEventsByDeviceId[selectedDevice.id] || [] : []}
              actionNote={selectedActionNote}
              onClose={() => setSelectedDeviceId(null)}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
