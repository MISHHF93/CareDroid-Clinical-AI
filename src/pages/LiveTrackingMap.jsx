import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import ContextInsightCard from '../components/ContextInsightCard';
import StateSourceNotice from '../components/StateSourceNotice';
import { fetchFleetLiveTrackingSnapshot } from '../services/fleetTelemetryService';
import { fetchHospitalMapSnapshot, formatHospitalMapTime } from '../services/hospitalMapService';
import { fetchMedicalIotSnapshot } from '../services/medicalIotService';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './LiveTrackingMap.css';

const TOOL_ID = 'live-tracking-map';
const CATEGORY_OPTIONS = ['all', 'fleet', 'hospital', 'iot'];
const STATUS_OPTIONS = ['all', 'online', 'active', 'available', 'warning', 'stale', 'offline', 'maintenance'];
const LIVE_MAP_REFRESH_MS = 60_000;

function toneForStatus(status) {
  if (['online', 'active', 'available', 'fresh'].includes(status)) return 'good';
  if (['warning', 'stale', 'delayed'].includes(status)) return 'warning';
  if (['offline', 'maintenance', 'critical'].includes(status)) return 'critical';
  return 'neutral';
}

function normalizeStatus(value) {
  return String(value || 'unknown').replace(/-/g, ' ');
}

function SummaryCard({ label, value, tone = 'neutral', hint }) {
  return (
    <article className={`live-map-summary-card live-map-summary-card--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function DetailDrawer({ asset, onClose }) {
  if (!asset) {
    return (
      <aside className="live-map-detail live-map-detail--empty" aria-label="Live tracking details">
        <h2>Tracking Detail Drawer</h2>
        <p>Select any vehicle or device marker to review location, status, source, timestamp, and safety scope.</p>
      </aside>
    );
  }

  return (
    <aside className="live-map-detail" aria-label={`${asset.name} details`}>
      <div className="live-map-detail-header">
        <div>
          <p className="live-map-eyebrow">{asset.categoryLabel}</p>
          <h2>{asset.name}</h2>
          <p>{asset.locationLabel}</p>
        </div>
        <button type="button" className="live-map-icon-button" onClick={onClose} aria-label="Close tracking details">
          <NavIcon icon={CHROME_ICONS.close} size={18} aria-hidden />
        </button>
      </div>
      <dl className="live-map-detail-grid">
        <div><dt>Status</dt><dd><span className={`live-map-badge live-map-badge--${toneForStatus(asset.status)}`}>{normalizeStatus(asset.status)}</span></dd></div>
        <div><dt>Last updated</dt><dd>{formatHospitalMapTime(asset.lastSeenAt)}</dd></div>
        <div><dt>Source</dt><dd>{asset.source}</dd></div>
        <div><dt>Tracking scope</dt><dd>{asset.scope}</dd></div>
        {asset.extra.map((item) => (
          <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
        ))}
      </dl>
    </aside>
  );
}

function combineAssets(fleetSnapshot, hospitalSnapshot, iotSnapshot) {
  const fleetAssets = (fleetSnapshot?.vehicles || []).map((vehicle) => ({
    id: `fleet-${vehicle.id}`,
    category: 'fleet',
    categoryLabel: 'Fleet vehicle',
    name: vehicle.label,
    status: vehicle.freshness === 'fresh' ? vehicle.status : vehicle.freshness,
    x: vehicle.mapPosition?.x ?? 50,
    y: vehicle.mapPosition?.y ?? 50,
    lastSeenAt: vehicle.lastSeenAt,
    locationLabel: `${vehicle.destination || 'No destination'} · ${vehicle.coordinates?.latitude?.toFixed(4)}, ${vehicle.coordinates?.longitude?.toFixed(4)}`,
    source: vehicle.locationSource || 'Demo GPS coordinate',
    scope: 'Fleet tracking support only',
    extra: [
      { label: 'Vehicle ID', value: vehicle.id },
      { label: 'Driver', value: vehicle.driver || 'Unassigned' },
      { label: 'Energy', value: `${vehicle.energyPercent}% ${vehicle.energyType}` },
    ],
  }));

  const hospitalAssets = (hospitalSnapshot?.devices || []).map((device) => ({
    id: `hospital-${device.id}`,
    category: 'hospital',
    categoryLabel: 'Hospital device',
    name: device.name,
    status: device.status,
    x: Math.round((device.x / 1000) * 100),
    y: Math.round((device.y / 620) * 100),
    lastSeenAt: device.lastSeenAt,
    locationLabel: `${device.patientLabel} · ${device.locationSource}`,
    source: 'Demo hospital floor-plan coordinate',
    scope: 'Indoor device tracking support only',
    extra: [
      { label: 'Type', value: device.type },
      { label: 'Battery', value: `${device.battery}%` },
      { label: 'Freshness', value: device.freshness },
    ],
  }));

  const iotAssets = (iotSnapshot?.devices || []).map((device) => ({
    id: `iot-${device.id}`,
    category: 'iot',
    categoryLabel: 'Medical IoT device',
    name: device.name,
    status: device.status,
    x: device.location?.x ?? 50,
    y: device.location?.y ?? 50,
    lastSeenAt: device.lastSeenAt,
    locationLabel: device.location?.label || 'Unknown location',
    source: device.location?.source || 'Demo IoT coordinate',
    scope: 'Device status tracking support only',
    extra: [
      { label: 'Type', value: device.type },
      { label: 'Battery', value: `${device.battery}%` },
      { label: 'Connectivity', value: device.connectivity },
    ],
  }));

  return [...fleetAssets, ...hospitalAssets, ...iotAssets];
}

export default function LiveTrackingMap() {
  const { recordToolAccess } = useToolPreferences();
  const [state, setState] = useState({ loading: true, error: '', fleet: null, hospital: null, iot: null });
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const loadSnapshots = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: !current.fleet && !current.hospital && !current.iot,
      error: '',
    }));
    try {
      const [fleet, hospital, iot] = await Promise.all([
        fetchFleetLiveTrackingSnapshot(),
        fetchHospitalMapSnapshot(),
        fetchMedicalIotSnapshot(),
      ]);
      setState({
        loading: false,
        error: '',
        fleet,
        hospital: hospital.snapshot,
        iot: iot.snapshot,
      });
      const firstFleet = fleet.vehicles?.[0];
      setSelectedAssetId((current) => current || (firstFleet ? `fleet-${firstFleet.id}` : null));
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load live tracking map demo snapshots.',
        fleet: null,
        hospital: null,
        iot: null,
      });
    }
  }, []);

  useEffect(() => {
    recordToolAccess(TOOL_ID);
    loadSnapshots();
    const refreshTimer = window.setInterval(loadSnapshots, LIVE_MAP_REFRESH_MS);
    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadSnapshots, recordToolAccess]);

  const assets = useMemo(() => combineAssets(state.fleet, state.hospital, state.iot), [state.fleet, state.hospital, state.iot]);
  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false;
      if (status !== 'all' && asset.status !== status) return false;
      if (!query) return true;
      return [asset.name, asset.categoryLabel, asset.locationLabel, asset.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [assets, category, search, status]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || null;
  const summary = useMemo(() => ({
    total: assets.length,
    fleet: assets.filter((asset) => asset.category === 'fleet').length,
    hospital: assets.filter((asset) => asset.category === 'hospital').length,
    iot: assets.filter((asset) => asset.category === 'iot').length,
    stale: assets.filter((asset) => ['stale', 'offline', 'maintenance'].includes(asset.status)).length,
    warnings: assets.filter((asset) => toneForStatus(asset.status) !== 'good').length,
  }), [assets]);

  return (
    <main className="live-map-page">
      <section className="live-map-hero" aria-labelledby="live-map-title">
        <div>
          <p className="live-map-eyebrow">Operational tracking cockpit</p>
          <h1 id="live-map-title">Live Tracking Map</h1>
          <p>
            Main live tracking experience for fleet vehicles, hospital indoor devices, and Medical IoT
            status markers. Current implementation uses clearly labeled demo data only.
          </p>
        </div>
        <div className="live-map-actions">
          <Link to="/assistant" className="live-map-action">Ask Assistant</Link>
          <Link to="/fleet/map" className="live-map-action live-map-action--secondary">Fleet Map</Link>
          <Link to="/hospital-map" className="live-map-action live-map-action--secondary">Hospital Map</Link>
          <Link to="/medical-iot" className="live-map-action live-map-action--secondary">Medical IoT</Link>
        </div>
      </section>

      <section className="live-map-safety" role="note">
        <strong>Safety scope:</strong> Demo tracking support only. Not a replacement for clinical alarms,
        bedside monitoring, dispatch systems of record, or clinician/dispatcher decisions. Stale and
        offline timestamps must be reviewed before action.
      </section>

      {state.loading ? (
        <section className="live-map-state" role="status" aria-label="Loading live tracking map">
          <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
          <p>Loading live tracking map...</p>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="live-map-state live-map-state--error" role="alert">
          <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
          <div>
            <h2>Live tracking map unavailable</h2>
            <p>{state.error}</p>
            <button type="button" className="live-map-action" onClick={loadSnapshots}>Retry loading live map</button>
          </div>
        </section>
      ) : null}

      {!state.loading && !state.error ? (
        <>
          <section className="live-map-source" role="status">
            <strong>Demo operations telemetry - no live backend tracking connected</strong>
            <span>Last updated: {formatHospitalMapTime(state.fleet?.summary?.updatedAt || state.hospital?.generatedAt || state.iot?.generatedAt)}</span>
          </section>

          <section className="live-map-insights" aria-label="Live tracking context insights">
            <ContextInsightCard
              title={summary.stale ? `${summary.stale} stale/offline marker(s)` : 'Markers reporting'}
              message={
                summary.stale
                  ? 'Review stale or offline timestamps before acting on marker location.'
                  : 'No stale/offline markers are visible in this combined snapshot.'
              }
              source="Combined demo snapshots"
              status={summary.stale ? 'action-required' : 'generated'}
              actionLabel="Open Medical IoT"
              actionRoute="/medical-iot"
            />
            <ContextInsightCard
              title="Layer mix"
              message={`${summary.fleet} fleet, ${summary.hospital} hospital, ${summary.iot} Medical IoT marker(s).`}
              source="Local computed"
              status="generated"
              actionLabel="Open Operations"
              actionRoute="/operations"
            />
            <ContextInsightCard
              title="Backend tracking"
              message="Live GPS, active route, hospital floor-device, and device telemetry feeds are not connected here."
              source="Backend unavailable"
              status="unavailable"
              actionLabel="Ask Assistant"
              actionRoute="/assistant"
            />
          </section>

          <StateSourceNotice
            title="Combined live map source states"
            states={[
              DEMO_LIVE_STATES.DEMO,
              DEMO_LIVE_STATES.MOCK,
              DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
              DEMO_LIVE_STATES.UNSUPPORTED,
            ]}
            details="The map combines demo fleet, hospital, and Medical IoT snapshots with mock coordinates. If any backend source is unavailable, its local/demo fallback is used; dispatch, routing, and clinical action writes are unsupported."
          />

          <section className="live-map-summary" aria-label="Live tracking summary">
            <SummaryCard label="Markers" value={summary.total} />
            <SummaryCard label="Fleet vehicles" value={summary.fleet} />
            <SummaryCard label="Hospital devices" value={summary.hospital} />
            <SummaryCard label="Medical IoT" value={summary.iot} />
            <SummaryCard label="Stale/offline" value={summary.stale} tone={summary.stale ? 'critical' : 'good'} />
            <SummaryCard label="Warnings" value={summary.warnings} tone={summary.warnings ? 'warning' : 'good'} />
          </section>

          <section className="live-map-filters" aria-label="Live tracking map filters">
            <label>
              <span>Layer</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option === 'all' ? 'All layers' : normalizeStatus(option)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option === 'all' ? 'All statuses' : normalizeStatus(option)}</option>
                ))}
              </select>
            </label>
            <label className="live-map-search">
              <span>Search marker, location, source</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try Van 312, ICU, Home..."
              />
            </label>
          </section>

          <div className="live-map-workspace">
            <section className="live-map-panel" aria-labelledby="live-map-canvas-title">
              <div className="live-map-panel-header">
                <div>
                  <h2 id="live-map-canvas-title">Combined Tracking Canvas</h2>
                  <p>Fleet, hospital, and IoT markers share one operational overview while retaining their route-specific detail views.</p>
                </div>
                <span className="live-map-badge live-map-badge--demo">Demo data</span>
              </div>
              <div className="live-map-canvas" role="img" aria-label="Combined demo live tracking map">
                <svg viewBox="0 0 1000 620" aria-hidden="true" focusable="false">
                  <rect x="34" y="38" width="900" height="540" rx="30" className="live-map-shell" />
                  <path d="M120 470 C250 360, 390 340, 530 250 S720 150, 860 120" className="live-map-road" />
                  <path d="M100 290 H880" className="live-map-corridor" />
                  <rect x="110" y="92" width="230" height="130" rx="18" className="live-map-room" />
                  <rect x="390" y="92" width="230" height="130" rx="18" className="live-map-room" />
                  <rect x="670" y="92" width="190" height="130" rx="18" className="live-map-room" />
                  <rect x="110" y="370" width="230" height="120" rx="18" className="live-map-room" />
                  <rect x="390" y="370" width="230" height="120" rx="18" className="live-map-room" />
                </svg>
                <div className="live-map-marker-layer" aria-label="Live tracking markers">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className={`live-map-marker live-map-marker--${asset.category} live-map-marker--${toneForStatus(asset.status)}${selectedAssetId === asset.id ? ' live-map-marker--selected' : ''}`}
                      style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                      onClick={() => setSelectedAssetId(asset.id)}
                      aria-label={`Open ${asset.name} details`}
                    >
                      {asset.category === 'fleet' ? 'V' : asset.category === 'hospital' ? 'H' : 'I'}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <DetailDrawer asset={selectedAsset} onClose={() => setSelectedAssetId(null)} />
          </div>

          {filteredAssets.length === 0 ? (
            <section className="live-map-state" role="status">
              <h2>No markers match the filters</h2>
              <p>Clear filters to restore the demo tracking markers.</p>
            </section>
          ) : null}

          <section className="live-map-legend" aria-label="Status legend">
            <span><i className="live-map-dot live-map-dot--fleet" /> Fleet</span>
            <span><i className="live-map-dot live-map-dot--hospital" /> Hospital device</span>
            <span><i className="live-map-dot live-map-dot--iot" /> Medical IoT</span>
            <span><i className="live-map-dot live-map-dot--warning" /> Stale/warning</span>
            <span><i className="live-map-dot live-map-dot--critical" /> Offline/maintenance</span>
          </section>
        </>
      ) : null}
    </main>
  );
}
