import { useEffect, useState } from 'react';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { fetchMedicalIotSnapshot } from '../../services/medicalIotService';

// -- demo data -----------------------------------------------------------------

const DEVICE_CATEGORIES = [
  { id: 'monitor',   label: 'Patient monitors',   icon: '??' },
  { id: 'infusion',  label: 'Infusion pumps',      icon: '??' },
  { id: 'ventilator',label: 'Ventilators',          icon: '??' },
  { id: 'wearable',  label: 'Wearable sensors',    icon: '??' },
  { id: 'imaging',   label: 'Imaging equipment',   icon: '??' },
  { id: 'portable',  label: 'Portable devices',    icon: '??' },
] as const;

const DEMO_DEVICES = [
  { id: 'dev-001', name: 'Philips IntelliVue MX800', category: 'monitor',    room: 'ED Bay 3',  battery: 98,  status: 'online',  lastSeen: '30s ago',  alarms: 0 },
  { id: 'dev-002', name: 'Baxter Sigma Spectrum',    category: 'infusion',   room: 'ED Bay 3',  battery: 72,  status: 'online',  lastSeen: '1m ago',   alarms: 1 },
  { id: 'dev-003', name: 'Puritan Bennett 980',      category: 'ventilator', room: 'ICU Bed 4', battery: null, status: 'online', lastSeen: '10s ago',  alarms: 0 },
  { id: 'dev-004', name: 'Masimo Root',              category: 'wearable',   room: 'ED Bay 7',  battery: 41,  status: 'warning', lastSeen: '2m ago',   alarms: 2 },
  { id: 'dev-005', name: 'GE Optima RF360',          category: 'imaging',    room: 'Radiology', battery: null, status: 'online', lastSeen: '5m ago',   alarms: 0 },
  { id: 'dev-006', name: 'Zoll R Series',            category: 'portable',   room: 'ED Bay 1',  battery: 87,  status: 'online',  lastSeen: '45s ago',  alarms: 0 },
  { id: 'dev-007', name: 'Philips SureSigns VS4',    category: 'monitor',    room: 'OBS-2',     battery: 62,  status: 'online',  lastSeen: '1m ago',   alarms: 0 },
  { id: 'dev-008', name: 'Smiths Medical Medfusion', category: 'infusion',   room: 'ICU Bed 2', battery: 15,  status: 'critical',lastSeen: '8m ago',   alarms: 3 },
  { id: 'dev-009', name: 'Dräger Evita Infinity',    category: 'ventilator', room: 'ICU Bed 6', battery: null, status: 'online', lastSeen: '20s ago',  alarms: 1 },
  { id: 'dev-010', name: 'Biobeat BB-613',           category: 'wearable',   room: 'Med-Surg B',battery: 8,   status: 'critical',lastSeen: '15m ago',  alarms: 1 },
] as const;

// -- helpers -------------------------------------------------------------------

const DEVICE_STATUS_COLOR: Record<string, string> = {
  online:   '#22c55e',
  warning:  '#f59e0b',
  critical: '#ef4444',
  offline:  '#9ca3af',
};

function mapServiceDevice(d: any) {
  const type = (d.type || '').toLowerCase();
  const category =
    type.includes('pulse') || type.includes('oximeter') || type.includes('monitor') ? 'monitor'
    : type.includes('infusion') || type.includes('pump') ? 'infusion'
    : type.includes('ventilat') ? 'ventilator'
    : type.includes('glucose') || type.includes('wearable') || type.includes('patch') ? 'wearable'
    : type.includes('imaging') ? 'imaging'
    : 'portable';

  const lastSeenAgo = d.lastSeenAt
    ? (() => {
        const diff = Date.now() - new Date(d.lastSeenAt).getTime();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor(diff / 1000);
        return mins > 0 ? `${mins}m ago` : `${secs}s ago`;
      })()
    : 'Unknown';

  return {
    id: d.id,
    name: d.name,
    category,
    room: d.assignedRoom || d.assignedBed || 'Unknown',
    battery: d.battery ?? null,
    status: d.status,
    lastSeen: lastSeenAgo,
    alarms: (d.activeAlerts || []).length,
  };
}

// -- sub-components ------------------------------------------------------------

function StatTile({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${MEDICAL_THEME.border}`,
        borderRadius: 12,
        padding: '13px 16px',
        flex: '1 1 110px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MEDICAL_THEME.inkSubtle, marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || MEDICAL_THEME.ink }}>
        {value}
      </div>
    </div>
  );
}

function BatteryBar({ pct }: { pct: number }) {
  const color = pct <= 15 ? '#ef4444' : pct <= 30 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 32, height: 8, borderRadius: 3, background: MEDICAL_THEME.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>
    </div>
  );
}

function DeviceRow({ device }: { device: typeof DEMO_DEVICES[number] }) {
  const color = DEVICE_STATUS_COLOR[device.status] || MEDICAL_THEME.inkSubtle;
  const cat   = DEVICE_CATEGORIES.find((c) => c.id === device.category);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 80px 80px 60px 60px 40px',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 16 }}>{cat?.icon ?? '??'}</span>
      <div>
        <div style={{ fontWeight: 600, color: MEDICAL_THEME.ink }}>{device.name}</div>
        <div style={{ fontSize: 11, color: MEDICAL_THEME.inkMuted }}>{device.category}</div>
      </div>
      <span style={{ color: MEDICAL_THEME.inkMuted, fontSize: 12 }}>{device.room}</span>
      <span style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>{device.lastSeen}</span>
      {device.battery != null ? (
        <BatteryBar pct={device.battery} />
      ) : (
        <span style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>Wired</span>
      )}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color,
        }}
      >
        {device.status}
      </span>
      {device.alarms > 0 ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: '#ef4444',
            borderRadius: 10,
            padding: '1px 7px',
            textAlign: 'center',
          }}
        >
          {device.alarms}
        </span>
      ) : (
        <span style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>—</span>
      )}
    </div>
  );
}

// -- page ----------------------------------------------------------------------

type Device = typeof DEMO_DEVICES[number];

export default function MedicalIotDashboard() {
  const [devices, setDevices]       = useState<Device[]>([...(DEMO_DEVICES as unknown as Device[])]);
  const [filter, setFilter]         = useState<string>('all');
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [isDemo, setIsDemo]         = useState(true);
  const [lastRefreshed, setLast]    = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchMedicalIotSnapshot();
      if (result.ok && !result.unsupported && result.snapshot?.devices?.length) {
        setDevices(result.snapshot.devices.map(mapServiceDevice) as Device[]);
        setIsDemo(false);
      } else {
        setDevices([...(DEMO_DEVICES as unknown as Device[])]);
        setIsDemo(true);
      }
      setLast(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = devices.filter((d) => {
    if (filter !== 'all' && d.category !== filter && d.status !== filter) return false;
    if (query && !`${d.name} ${d.room} ${d.category}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const criticalCount = devices.filter((d) => d.status === 'critical').length;
  const warningCount  = devices.filter((d) => d.status === 'warning').length;
  const alarmCount    = devices.reduce((s, d) => s + (d.alarms ?? 0), 0);
  const lowBattery    = devices.filter((d) => d.battery != null && (d.battery as number) <= 20).length;

  return (
    <main
      style={{
        background: MEDICAL_THEME.surfacePage,
        minHeight: '100vh',
        padding: '24px 28px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: MEDICAL_THEME.ink }}>
            Medical IoT Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: MEDICAL_THEME.inkMuted }}>
            Device fleet · battery status · active alarms · real-time connectivity
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {criticalCount > 0 && (
            <span
              style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#ef4444', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 20, padding: '4px 12px',
              }}
            >
              {criticalCount} CRITICAL
            </span>
          )}
          {isDemo && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#78350f', background: '#fefce8', border: '1px solid #d97706', borderRadius: 20, padding: '3px 10px' }}>
              Demo data
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: MEDICAL_THEME.accent, color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatTile label="Devices online"   value={devices.filter(d => d.status === 'online').length}   />
        <StatTile label="Critical"         value={criticalCount}   accent={criticalCount  > 0 ? '#ef4444' : undefined} />
        <StatTile label="Warning"          value={warningCount}    accent={warningCount   > 0 ? '#f59e0b' : undefined} />
        <StatTile label="Active alarms"    value={alarmCount}      accent={alarmCount     > 0 ? '#ef4444' : undefined} />
        <StatTile label="Low battery"      value={lowBattery}      accent={lowBattery     > 0 ? '#f59e0b' : undefined} />
        <StatTile label="Total devices"    value={devices.length} />
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { id: 'all',      label: 'All' },
          { id: 'critical', label: 'Critical' },
          { id: 'warning',  label: 'Warning' },
          { id: 'monitor',  label: 'Monitors' },
          { id: 'infusion', label: 'Infusion' },
          { id: 'wearable', label: 'Wearables' },
          { id: 'ventilator', label: 'Ventilators' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${filter === id ? MEDICAL_THEME.accent : MEDICAL_THEME.border}`,
              background: filter === id ? MEDICAL_THEME.accent : MEDICAL_THEME.surfaceCard,
              color: filter === id ? '#fff' : MEDICAL_THEME.inkMuted,
              borderRadius: 20, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search devices…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '6px 12px', fontSize: 12,
            border: `1.5px solid ${MEDICAL_THEME.border}`, borderRadius: 8,
            background: MEDICAL_THEME.surfaceCard, color: MEDICAL_THEME.ink,
            outline: 'none', width: 180,
          }}
        />
      </div>

      {/* Device table */}
      <div
        style={{
          background: MEDICAL_THEME.surfaceCard,
          border: `1px solid ${MEDICAL_THEME.border}`,
          borderRadius: 12,
          padding: '16px 18px',
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 1fr 80px 80px 60px 60px 40px',
            gap: 10,
            marginBottom: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: MEDICAL_THEME.inkSubtle,
          }}
        >
          <span />
          <span>Device</span>
          <span>Location</span>
          <span>Last seen</span>
          <span>Battery</span>
          <span>Status</span>
          <span>Alarms</span>
        </div>

        {filteredDevices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: MEDICAL_THEME.inkSubtle, fontSize: 13 }}>
            No devices match the current filter
          </div>
        ) : (
          filteredDevices.map((device) => (
            <DeviceRow key={device.id} device={device as any} />
          ))
        )}
      </div>

      {lastRefreshed && (
        <div style={{ marginTop: 14, fontSize: 11, color: MEDICAL_THEME.inkSubtle, textAlign: 'right' }}>
          Scanned {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
        </div>
      )}
    </main>
  );
}
