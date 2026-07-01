import { useEffect, useState } from 'react';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import {
  fetchEmergencyCapacityDashboard,
  fetchEmergencyCapacityHistory,
} from '../../services/emergencyAnalyticsApi';
import { fetchEmergencySurgeStatus } from '../../services/surgeApi';

// -- types ---------------------------------------------------------------------

interface BedUnit {
  id: string;
  name: string;
  total: number;
  occupied: number;
  available: number;
  boarding?: number;
  status: 'green' | 'yellow' | 'red' | string;
}

// -- demo fallback -------------------------------------------------------------

const DEMO_UNITS: BedUnit[] = [
  { id: 'ed',         name: 'Emergency Department', total: 32, occupied: 26, available: 6,  boarding: 4,  status: 'yellow' },
  { id: 'icu',        name: 'ICU',                  total: 16, occupied: 14, available: 2,  boarding: 2,  status: 'red'    },
  { id: 'stepdown',   name: 'Step-Down / PCU',      total: 24, occupied: 18, available: 6,  boarding: 0,  status: 'green'  },
  { id: 'med-surg-a', name: 'Med-Surg A',           total: 30, occupied: 22, available: 8,  boarding: 1,  status: 'green'  },
  { id: 'med-surg-b', name: 'Med-Surg B',           total: 30, occupied: 28, available: 2,  boarding: 0,  status: 'red'    },
  { id: 'obs',        name: 'Observation',          total: 18, occupied: 12, available: 6,  boarding: 0,  status: 'green'  },
  { id: 'pediatrics', name: 'Pediatrics',           total: 20, occupied: 9,  available: 11, boarding: 0,  status: 'green'  },
  { id: 'psych',      name: 'Behavioral Health',    total: 14, occupied: 13, available: 1,  boarding: 3,  status: 'red'    },
  { id: 'or',         name: 'Operating Rooms',      total: 10, occupied: 6,  available: 4,  boarding: 0,  status: 'yellow' },
];

const DEMO_CAPACITY = {
  score: 68,
  label: 'Elevated',
  diversion: false,
  totalBeds: DEMO_UNITS.reduce((s, u) => s + u.total, 0),
  occupiedBeds: DEMO_UNITS.reduce((s, u) => s + u.occupied, 0),
  availableBeds: DEMO_UNITS.reduce((s, u) => s + u.available, 0),
  boardingPatients: DEMO_UNITS.reduce((s, u) => s + (u.boarding ?? 0), 0),
  units: DEMO_UNITS,
  source: 'demo',
};

// -- helpers -------------------------------------------------------------------

function occupancyPct(occupied: number, total: number) {
  if (!total) return 0;
  return Math.round((occupied / total) * 100);
}

const unitStatusColor: Record<string, string> = {
  red:    '#ef4444',
  yellow: '#f59e0b',
  green:  '#22c55e',
};

// -- sub-components ------------------------------------------------------------

function KpiTile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${MEDICAL_THEME.border}`,
        borderRadius: 12,
        padding: '14px 18px',
        flex: '1 1 130px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MEDICAL_THEME.inkSubtle, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || MEDICAL_THEME.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function UnitRow({ unit }: { unit: BedUnit }) {
  const pct   = occupancyPct(unit.occupied, unit.total);
  const color = unitStatusColor[unit.status] || MEDICAL_THEME.inkMuted;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 50px 50px auto',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
        fontSize: 13,
      }}
    >
      {/* Name + status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: MEDICAL_THEME.ink }}>{unit.name}</span>
      </div>

      {/* Occupancy bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 7, borderRadius: 4, background: MEDICAL_THEME.border, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 4,
              background: color,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: MEDICAL_THEME.inkMuted, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
      </div>

      {/* Available */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontWeight: 700, color: unit.available === 0 ? '#ef4444' : '#22c55e' }}>
          {unit.available}
        </span>
      </div>

      {/* Boarding */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontWeight: unit.boarding ? 700 : 400, color: unit.boarding ? '#f59e0b' : MEDICAL_THEME.inkSubtle }}>
          {unit.boarding ?? 0}
        </span>
      </div>

      {/* Beds fraction */}
      <div style={{ color: MEDICAL_THEME.inkMuted, whiteSpace: 'nowrap' }}>
        {unit.occupied}/{unit.total}
      </div>
    </div>
  );
}

// -- page ----------------------------------------------------------------------

export default function HospitalMapDashboard() {
  const [capacity, setCapacity] = useState<any>(null);
  const [history,  setHistory]  = useState<any[]>([]);
  const [surge,    setSurge]    = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [last,     setLast]     = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [capResult, histResult, surgeResult] = await Promise.all([
        fetchEmergencyCapacityDashboard(),
        fetchEmergencyCapacityHistory(),
        fetchEmergencySurgeStatus(),
      ]);

      // Fall back to demo data if API unavailable
      setCapacity(
        (capResult as any).ok && (capResult as any).data
          ? (capResult as any).data
          : DEMO_CAPACITY
      );
      setHistory(
        (histResult as any).ok && (histResult as any).data
          ? (histResult as any).data
          : []
      );
      setSurge((surgeResult as any).ok ? (surgeResult as any).data : null);
      setLast(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const units: BedUnit[] = capacity?.units ?? DEMO_CAPACITY.units;
  const totalBeds      = capacity?.totalBeds      ?? DEMO_CAPACITY.totalBeds;
  const occupiedBeds   = capacity?.occupiedBeds   ?? DEMO_CAPACITY.occupiedBeds;
  const availableBeds  = capacity?.availableBeds  ?? DEMO_CAPACITY.availableBeds;
  const boarding       = capacity?.boardingPatients ?? DEMO_CAPACITY.boardingPatients;
  const capacityScore  = capacity?.score          ?? DEMO_CAPACITY.score;
  const diversion      = capacity?.diversion      ?? surge?.diversion ?? false;

  const scoreColor =
    capacityScore < 60 ? '#ef4444' : capacityScore < 78 ? '#f59e0b' : '#22c55e';

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
            Hospital Bed Map
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: MEDICAL_THEME.inkMuted }}>
            Real-time capacity · boarding · diversion status across all units
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {diversion && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#ef4444',
                background: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: 20,
                padding: '4px 12px',
              }}
            >
              DIVERSION ACTIVE
            </span>
          )}
          {capacity?.source === 'demo' && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#78350f',
                background: '#fefce8',
                border: '1px solid #d97706',
                borderRadius: 20,
                padding: '3px 10px',
              }}
            >
              Demo data
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: MEDICAL_THEME.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Capacity score + KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Capacity score gauge tile */}
        <div
          style={{
            background: MEDICAL_THEME.surfaceCard,
            border: `1.5px solid ${scoreColor}44`,
            borderLeft: `4px solid ${scoreColor}`,
            borderRadius: 12,
            padding: '14px 18px',
            flex: '1 1 160px',
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MEDICAL_THEME.inkSubtle, marginBottom: 6 }}>
            Capacity score
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
            {capacityScore}
            <span style={{ fontSize: 14, fontWeight: 400, color: MEDICAL_THEME.inkMuted }}>/100</span>
          </div>
          <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 4 }}>
            {capacity?.label ?? (capacityScore < 60 ? 'Critical' : capacityScore < 78 ? 'Elevated' : 'Normal')}
          </div>
        </div>

        <KpiTile label="Total beds"      value={totalBeds}                                  sub="across all units"    />
        <KpiTile label="Occupied"        value={occupiedBeds}                               sub={`${occupancyPct(occupiedBeds, totalBeds)}% occupancy`} accent={occupancyPct(occupiedBeds, totalBeds) > 90 ? '#ef4444' : undefined} />
        <KpiTile label="Available"       value={availableBeds}                              sub="beds open now"       accent={availableBeds < 10 ? '#ef4444' : '#22c55e'} />
        <KpiTile label="Boarding"        value={boarding}                                   sub="patients waiting"    accent={boarding > 0 ? '#f59e0b' : undefined} />
        <KpiTile label="Units critical"  value={units.filter(u => u.status === 'red').length}  sub="at full capacity" accent={units.filter(u => u.status === 'red').length > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      {/* Unit breakdown table */}
      <div
        style={{
          background: MEDICAL_THEME.surfaceCard,
          border: `1px solid ${MEDICAL_THEME.border}`,
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 50px 50px auto', gap: 10, marginBottom: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MEDICAL_THEME.inkSubtle }}>
          <span>Unit</span>
          <span>Occupancy</span>
          <span style={{ textAlign: 'center' }}>Avail</span>
          <span style={{ textAlign: 'center' }}>Board</span>
          <span>Beds</span>
        </div>
        {units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} />
        ))}
      </div>

      {/* Capacity trend (if available from API) */}
      {history.length > 0 && (
        <div
          style={{
            background: MEDICAL_THEME.surfaceCard,
            border: `1px solid ${MEDICAL_THEME.border}`,
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MEDICAL_THEME.inkMuted }}>
            Capacity history
          </h2>
          {(history as any[]).slice(-8).map((point: any) => (
            <div
              key={point.timestamp || point.label}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}
            >
              <span style={{ flex: '0 0 54px', color: MEDICAL_THEME.inkSubtle }}>{point.label}</span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: MEDICAL_THEME.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${point.score ?? 50}%`, borderRadius: 4, background: (point.score ?? 50) < 60 ? '#ef4444' : (point.score ?? 50) < 78 ? '#f59e0b' : '#22c55e' }} />
              </div>
              <span style={{ flex: '0 0 30px', textAlign: 'right', fontWeight: 700, color: (point.score ?? 50) < 60 ? '#ef4444' : (point.score ?? 50) < 78 ? '#f59e0b' : '#22c55e' }}>{point.score ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {last && (
        <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, textAlign: 'right' }}>
          Updated {last.toLocaleTimeString()} · auto-refreshes every 60s
        </div>
      )}
    </main>
  );
}
