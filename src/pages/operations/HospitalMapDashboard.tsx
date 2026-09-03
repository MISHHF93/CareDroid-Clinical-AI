import { useEffect, useRef, useState } from 'react';
import HospitalMapInsights from '../../components/operations/HospitalMapInsights';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import '../HospitalMapDashboard.css';
import {
  fetchEmergencyCapacityDashboard,
  fetchEmergencyCapacityHistory,
} from '../../services/emergencyAnalyticsApi';
import { fetchHospitalMapSnapshot } from '../../services/hospitalMapService';
import { fetchEmergencySurgeStatus } from '../../services/surgeApi';

interface BedUnit {
  id: string;
  name: string;
  total: number;
  occupied: number;
  available: number;
  boarding?: number;
  status: 'green' | 'yellow' | 'red' | string;
}

const DEMO_UNITS: BedUnit[] = [
  {
    id: 'ed',
    name: 'Emergency Department',
    total: 32,
    occupied: 26,
    available: 6,
    boarding: 4,
    status: 'yellow',
  },
  { id: 'icu', name: 'ICU', total: 16, occupied: 14, available: 2, boarding: 2, status: 'red' },
  {
    id: 'stepdown',
    name: 'Step-Down / PCU',
    total: 24,
    occupied: 18,
    available: 6,
    boarding: 0,
    status: 'green',
  },
  {
    id: 'med-surg-a',
    name: 'Med-Surg A',
    total: 30,
    occupied: 22,
    available: 8,
    boarding: 1,
    status: 'green',
  },
  {
    id: 'med-surg-b',
    name: 'Med-Surg B',
    total: 30,
    occupied: 28,
    available: 2,
    boarding: 0,
    status: 'red',
  },
  {
    id: 'obs',
    name: 'Observation',
    total: 18,
    occupied: 12,
    available: 6,
    boarding: 0,
    status: 'green',
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    total: 20,
    occupied: 9,
    available: 11,
    boarding: 0,
    status: 'green',
  },
  {
    id: 'psych',
    name: 'Behavioral Health',
    total: 14,
    occupied: 13,
    available: 1,
    boarding: 3,
    status: 'red',
  },
  {
    id: 'or',
    name: 'Operating Rooms',
    total: 10,
    occupied: 6,
    available: 4,
    boarding: 0,
    status: 'yellow',
  },
];

const DEMO_CAPACITY = {
  score: 68,
  label: 'Elevated',
  diversion: false,
  totalBeds: DEMO_UNITS.reduce((sum, unit) => sum + unit.total, 0),
  occupiedBeds: DEMO_UNITS.reduce((sum, unit) => sum + unit.occupied, 0),
  availableBeds: DEMO_UNITS.reduce((sum, unit) => sum + unit.available, 0),
  boardingPatients: DEMO_UNITS.reduce((sum, unit) => sum + (unit.boarding ?? 0), 0),
  units: DEMO_UNITS,
  source: 'demo',
};

function occupancyPct(occupied: number, total: number) {
  if (!total) return 0;
  return Math.round((occupied / total) * 100);
}

const unitStatusColor: Record<string, string> = {
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#22c55e',
};

/**
 * Green/Yellow/Orange/Red is this codebase's one canonical capacity-band
 * vocabulary (lib/emergency-os/logic.ts). Color/severity for real data must
 * come from `band`, never recomputed from a raw score threshold -- the real
 * engine's score is a 0-100 pressure value (higher = worse), the opposite
 * convention from this page's legacy demo-only score/label pair below
 * (higher = better). Mixing the two threshold systems would silently invert
 * severity for real data.
 */
const BAND_COLOR: Record<string, string> = {
  Green: '#15803d',
  Yellow: '#ca8a04',
  Orange: '#b45309',
  Red: '#b91c1c',
};

function UnitRow({ unit }: { unit: BedUnit }) {
  const pct = occupancyPct(unit.occupied, unit.total);
  const color = unitStatusColor[unit.status] || 'var(--medical-text-muted, #64748b)';

  return (
    <div className="hospital-map-page__unit-row">
      <div className="hospital-map-page__unit-name">
        <span className="hospital-map-page__status-dot" style={{ background: color }} />
        <span>{unit.name}</span>
      </div>

      <div className="hospital-map-page__occupancy">
        <div className="hospital-map-page__occupancy-track">
          <div
            className="hospital-map-page__occupancy-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span>{pct}%</span>
      </div>

      <div className="hospital-map-page__unit-stat">
        <span className={unit.available === 0 ? 'is-critical' : 'is-good'}>{unit.available}</span>
      </div>

      <div className="hospital-map-page__unit-stat">
        <span className={unit.boarding ? 'is-warning' : undefined}>{unit.boarding ?? 0}</span>
      </div>

      <div className="hospital-map-page__unit-beds">
        {unit.occupied}/{unit.total}
      </div>
    </div>
  );
}

export default function HospitalMapDashboard() {
  useRouteChromeRegistration({ title: 'Hospital Map' });
  const [capacity, setCapacity] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [surge, setSurge] = useState<any>(null);
  const [mapResult, setMapResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [last, setLast] = useState<Date | null>(null);
  // HEAL-278: load() fires 4 concurrent fetches and is triggered both by a
  // 60s setInterval and a manual "Refresh" button (only disabled while
  // loading, not guarded against overlapping calls). If the auto-poll
  // fires while a manual refresh is still in flight and the older call
  // resolves last -- normal network jitter -- its response overwrites the
  // newer one, showing stale bed/capacity counts until the next cycle
  // happens to correct it. Same useRef token-counter fix already applied
  // to useOperationsHubLiveFeeds.ts (HEAL-248), which documents this exact
  // hazard.
  const loadTokenRef = useRef(0);

  async function load() {
    const token = ++loadTokenRef.current;
    setLoading(true);
    try {
      const [capResult, histResult, surgeResult, hospitalMapResult] = await Promise.all([
        fetchEmergencyCapacityDashboard(),
        fetchEmergencyCapacityHistory(),
        fetchEmergencySurgeStatus(),
        fetchHospitalMapSnapshot(),
      ]);
      if (token !== loadTokenRef.current) return;

      setCapacity(
        (capResult as any).ok && (capResult as any).data ? (capResult as any).data : DEMO_CAPACITY,
      );
      setHistory(
        (histResult as any).ok && (histResult as any).data ? (histResult as any).data : [],
      );
      setSurge((surgeResult as any).ok ? (surgeResult as any).data : null);
      setMapResult(hospitalMapResult);
      setLast(new Date());
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Real per-ward bed data isn't tracked by this domain model yet -- capacity.units
  // is only ever present on the full-demo fallback below, never on live data.
  const unitsAreIllustrative = !capacity?.units;
  const units: BedUnit[] = capacity?.units ?? DEMO_CAPACITY.units;
  const totalBeds = capacity?.totalBeds ?? DEMO_CAPACITY.totalBeds;
  const occupiedBeds = capacity?.occupiedBeds ?? DEMO_CAPACITY.occupiedBeds;
  const availableBeds = capacity?.availableBeds ?? DEMO_CAPACITY.availableBeds;
  const boarding = capacity?.boardingPatients ?? DEMO_CAPACITY.boardingPatients;
  const capacityScore = capacity?.score ?? DEMO_CAPACITY.score;
  const capacityBand: string | undefined = capacity?.band;
  const diversion = capacity?.diversion ?? surge?.diversion ?? false;
  const occupancy = occupancyPct(occupiedBeds, totalBeds);

  // WCAG AA large-text ≥3:1 on white (matches .is-critical / .is-warning / .is-good).
  // Real data: derive color from the canonical band, never from a raw score
  // threshold (see BAND_COLOR's own comment on why). Demo-only fallback keeps
  // its legacy score-threshold coloring since it has no band.
  const scoreColor = capacityBand
    ? BAND_COLOR[capacityBand] || BAND_COLOR.Green
    : capacityScore < 60
      ? '#b91c1c'
      : capacityScore < 78
        ? '#b45309'
        : '#15803d';
  const scoreSubLabel = capacityBand
    ? `${capacityBand} pressure`
    : (capacity?.label ??
      (capacityScore < 60 ? 'Critical' : capacityScore < 78 ? 'Elevated' : 'Normal'));

  return (
    <main className="hospital-map-page">
      <header className="hospital-map-page__header">
        <div className="hospital-map-page__title-row">
          <GraphicIconBadge iconKey="layout-dashboard" accent="brand" size="md" />
          <div>
            <p className="hospital-map-page__title-text" data-testid="cd-page-title-text">
              Hospital Map
            </p>
            <p>
              Real-time capacity, boarding, diversion status, and floor-plan device intelligence.
            </p>
          </div>
        </div>
        <div className="hospital-map-page__actions">
          {diversion ? (
            <span className="hospital-map-page__diversion">Diversion active</span>
          ) : null}
          {capacity?.source === 'demo' ? (
            <span className="hospital-map-page__demo-badge">Demo data</span>
          ) : null}
          <button type="button" onClick={load} disabled={loading}>
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="hospital-map-page__kpis" aria-label="Hospital capacity summary">
        <article
          className="hospital-map-page__score"
          style={{ borderColor: `${scoreColor}44`, borderLeftColor: scoreColor }}
        >
          <span className="hospital-map-page__kpi-label">Capacity score</span>
          <strong style={{ color: scoreColor }}>
            {capacityScore}
            <small>/100</small>
          </strong>
          <span className="hospital-map-page__kpi-sub">{scoreSubLabel}</span>
        </article>

        <article className="hospital-map-page__kpi">
          <span className="hospital-map-page__kpi-label">Total beds</span>
          <strong>{totalBeds}</strong>
          <span className="hospital-map-page__kpi-sub">across all units</span>
        </article>
        <article className="hospital-map-page__kpi">
          <span className="hospital-map-page__kpi-label">Occupied</span>
          <strong className={occupancy > 90 ? 'is-critical' : undefined}>{occupiedBeds}</strong>
          <span className="hospital-map-page__kpi-sub">{occupancy}% occupancy</span>
        </article>
        <article className="hospital-map-page__kpi">
          <span className="hospital-map-page__kpi-label">Available</span>
          <strong className={availableBeds < 10 ? 'is-critical' : 'is-good'}>
            {availableBeds}
          </strong>
          <span className="hospital-map-page__kpi-sub">beds open now</span>
        </article>
        <article className="hospital-map-page__kpi">
          <span className="hospital-map-page__kpi-label">Boarding</span>
          <strong className={boarding > 0 ? 'is-warning' : undefined}>{boarding}</strong>
          <span className="hospital-map-page__kpi-sub">patients waiting</span>
        </article>
        <article className="hospital-map-page__kpi">
          <span className="hospital-map-page__kpi-label">Units critical</span>
          <strong
            className={
              units.filter((unit) => unit.status === 'red').length > 0 ? 'is-critical' : 'is-good'
            }
          >
            {units.filter((unit) => unit.status === 'red').length}
          </strong>
          <span className="hospital-map-page__kpi-sub">at full capacity</span>
        </article>
      </section>

      <HospitalMapInsights
        snapshot={mapResult?.snapshot ?? null}
        capacityUnits={units}
        unsupported={Boolean(mapResult?.unsupported)}
        message={mapResult?.message}
      />

      <section className="hospital-map-page__table" aria-label="Unit capacity breakdown">
        <div className="hospital-map-page__table-head">
          <span>Unit</span>
          <span>Occupancy</span>
          <span>Avail</span>
          <span>Board</span>
          <span>Beds</span>
        </div>
        {unitsAreIllustrative ? (
          <p className="hospital-map-page__table-note">
            Illustrative unit breakdown — CareDroid does not yet track per-ward bed counts. The
            department-level totals above are live.
          </p>
        ) : null}
        {units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} />
        ))}
      </section>

      {history.length > 0 ? (
        <section className="hospital-map-page__history" aria-label="Capacity history">
          <h2>Capacity history</h2>
          {(history as any[]).slice(-8).map((point: any) => {
            const score = point.score ?? 50;
            const color = score < 60 ? '#ef4444' : score < 78 ? '#f59e0b' : '#22c55e';
            return (
              <div key={point.timestamp || point.label} className="hospital-map-page__history-row">
                <span>{point.label}</span>
                <div className="hospital-map-page__occupancy-track">
                  <div
                    className="hospital-map-page__occupancy-fill"
                    style={{ width: `${score}%`, background: color }}
                  />
                </div>
                <strong style={{ color }}>{point.score ?? '—'}</strong>
              </div>
            );
          })}
        </section>
      ) : null}

      {last ? (
        <p className="hospital-map-page__footer">
          Updated {last.toLocaleTimeString()} · auto-refreshes every 60s
        </p>
      ) : null}
    </main>
  );
}
