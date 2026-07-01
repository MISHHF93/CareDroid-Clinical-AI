import { useEffect, useState } from 'react';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import {
  buildLocalEmergencyAnalytics,
  fetchEmergencyOperationalAnalytics,
} from '../../services/emergencyAnalyticsApi';
import { fetchSaasHealthCenter, SAAS_HEALTH_FALLBACK } from '../../services/saasHealthApi';
import { fetchEmergencySurgeStatus } from '../../services/surgeApi';

// -- helpers -------------------------------------------------------------------

type HealthStatus = 'healthy' | 'warning' | 'critical' | string;

const min = (v: number | undefined | null) =>
  v == null || v === 0 ? '—' : `${v} min`;

const statusColor: Record<HealthStatus, string> = {
  healthy:  '#22c55e',
  warning:  '#f59e0b',
  critical: '#ef4444',
};

const directionLabel: Record<string, string> = { up: '?', down: '?', flat: '—' };

// -- sub-components ------------------------------------------------------------

function KpiTile({
  label,
  value,
  sub,
  direction,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  direction?: 'up' | 'down' | 'flat';
  accent?: string;
}) {
  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${MEDICAL_THEME.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        flex: '1 1 140px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: MEDICAL_THEME.inkSubtle,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: accent || MEDICAL_THEME.ink,
          lineHeight: 1.1,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        {value}
        {direction && direction !== 'flat' && (
          <span
            style={{
              fontSize: 13,
              color: direction === 'up' ? '#ef4444' : '#22c55e',
            }}
          >
            {directionLabel[direction]}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${MEDICAL_THEME.border}`,
        borderRadius: 12,
        padding: '18px 20px',
      }}
    >
      <h2
        style={{
          margin: '0 0 14px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: MEDICAL_THEME.inkMuted,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function HealthCheckRow({ check }: { check: any }) {
  const color = statusColor[check.status?.toLowerCase()] || MEDICAL_THEME.inkSubtle;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
        fontSize: 13,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, color: MEDICAL_THEME.ink, fontWeight: 500 }}>{check.label}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {check.displayStatus || check.status}
      </span>
    </div>
  );
}

// -- page ----------------------------------------------------------------------

export default function ExecutiveCommandCenter() {
  const [analytics, setAnalytics]   = useState<any>(null);
  const [platform, setPlatform]     = useState<any>(null);
  const [surgeStatus, setSurge]     = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [lastRefreshed, setLast]    = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [analyticsResult, healthResult, surgeResult] = await Promise.all([
        fetchEmergencyOperationalAnalytics(),
        fetchSaasHealthCenter(),
        fetchEmergencySurgeStatus(),
      ]);

      const analyticsData =
        (analyticsResult as any).ok && (analyticsResult as any).data
          ? (analyticsResult as any).data
          : buildLocalEmergencyAnalytics({ patients: [], queues: [], capacity: {}, activeShift: {} });
      setAnalytics(analyticsData);
      setPlatform((healthResult as any).data || SAAS_HEALTH_FALLBACK);
      setSurge((surgeResult as any).ok ? (surgeResult as any).data : null);
      setLast(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const shift   = analytics?.shift;
  const compare = shift?.comparison;
  const health  = platform;
  const healthSummary = health?.summary;

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
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: MEDICAL_THEME.ink }}>
            Executive Command Center
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: MEDICAL_THEME.inkMuted }}>
            Operational KPIs · Platform health · Surge status
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {surgeStatus?.active && (
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
              SURGE ACTIVE
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
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Shift KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiTile
          label="Patients seen"
          value={shift?.patientsSeen ?? '—'}
          direction={compare?.patientsSeen?.direction}
          sub="this shift"
        />
        <KpiTile
          label="Avg wait"
          value={min(shift?.avgWaitMinutes)}
          direction={compare?.avgWaitMinutes?.direction}
          sub="door to triage"
          accent={shift?.avgWaitMinutes > 30 ? '#ef4444' : undefined}
        />
        <KpiTile
          label="Avg LOS"
          value={min(shift?.avgLosMinutes)}
          direction={compare?.avgLosMinutes?.direction}
          sub="length of stay"
        />
        <KpiTile
          label="Discharge rate"
          value={shift ? `${shift.dischargeRate}%` : '—'}
          direction={compare?.dischargeRate?.direction}
          sub={shift ? `${shift.dischargeCount} patients` : undefined}
          accent={shift?.dischargeRate >= 60 ? '#22c55e' : undefined}
        />
        <KpiTile
          label="Admissions"
          value={shift?.admissionCount ?? '—'}
          direction={compare?.admissionCount?.direction}
          sub={shift ? `${shift.admissionRate}% admission rate` : undefined}
        />
        <KpiTile
          label="LWBS"
          value={shift?.lwbsCount ?? '—'}
          direction={compare?.lwbsCount?.direction}
          sub="left without being seen"
          accent={shift?.lwbsCount > 0 ? '#f59e0b' : undefined}
        />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {/* Platform health */}
        {health && (
          <SectionCard
            title={`Platform Health (${healthSummary?.healthy ?? 0}/${healthSummary?.total ?? 0} healthy)`}
          >
            {(health.checks || []).map((check: any) => (
              <HealthCheckRow key={check.id} check={check} />
            ))}
          </SectionCard>
        )}

        {/* Capacity trend */}
        {analytics?.capacityHistory?.length > 0 && (
          <SectionCard title="Capacity Trend — last 8 hrs">
            {(analytics.capacityHistory as any[]).map((point: any) => (
              <div
                key={point.timestamp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                  fontSize: 12,
                }}
              >
                <span style={{ flex: '0 0 54px', color: MEDICAL_THEME.inkSubtle }}>
                  {point.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: MEDICAL_THEME.border,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${point.score}%`,
                      borderRadius: 4,
                      background:
                        point.score < 60 ? '#ef4444' : point.score < 75 ? '#f59e0b' : '#22c55e',
                    }}
                  />
                </div>
                <span
                  style={{
                    flex: '0 0 38px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: point.score < 60 ? '#ef4444' : point.score < 75 ? '#f59e0b' : '#22c55e',
                  }}
                >
                  {point.score}
                </span>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Queue performance */}
        {analytics?.queuePerformance?.length > 0 && (
          <SectionCard title="Queue Performance">
            {(analytics.queuePerformance as any[]).map((queue: any) => (
              <div
                key={queue.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                  fontSize: 13,
                }}
              >
                <span style={{ flex: 1, color: MEDICAL_THEME.ink, fontWeight: 500 }}>
                  {queue.name}
                </span>
                <span style={{ color: MEDICAL_THEME.inkMuted, fontSize: 12 }}>wait</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: queue.avgWaitMinutes > 30 ? '#ef4444' : MEDICAL_THEME.ink,
                  }}
                >
                  {queue.avgWaitMinutes}m
                </span>
                {queue.waitTrend?.direction !== 'flat' && (
                  <span
                    style={{
                      fontSize: 11,
                      color: queue.waitTrend?.direction === 'up' ? '#ef4444' : '#22c55e',
                    }}
                  >
                    {directionLabel[queue.waitTrend?.direction]}
                  </span>
                )}
              </div>
            ))}
          </SectionCard>
        )}

        {/* Top complaints */}
        {analytics?.operationalCommand?.topComplaints?.length > 0 && (
          <SectionCard title="Top Chief Complaints">
            {(analytics.operationalCommand.topComplaints as any[]).slice(0, 8).map((item: any) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: MEDICAL_THEME.inkMuted }}>{item.name}</span>
                <span style={{ fontWeight: 700, color: MEDICAL_THEME.ink }}>{item.count}</span>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Surge status */}
        {surgeStatus && (
          <SectionCard title="Surge Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '4px 0',
                }}
              >
                <span style={{ color: MEDICAL_THEME.inkMuted }}>Status</span>
                <span
                  style={{ fontWeight: 700, color: surgeStatus.active ? '#ef4444' : '#22c55e' }}
                >
                  {surgeStatus.active ? 'ACTIVE' : 'Normal'}
                </span>
              </div>
              {surgeStatus.eventId && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '4px 0',
                  }}
                >
                  <span style={{ color: MEDICAL_THEME.inkMuted }}>Event</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                    {surgeStatus.eventId}
                  </span>
                </div>
              )}
              {surgeStatus.activatedAt && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '4px 0',
                  }}
                >
                  <span style={{ color: MEDICAL_THEME.inkMuted }}>Activated</span>
                  <span>{new Date(surgeStatus.activatedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {lastRefreshed && (
        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: MEDICAL_THEME.inkSubtle,
            textAlign: 'right',
          }}
        >
          Last refreshed {lastRefreshed.toLocaleTimeString()}
        </div>
      )}
    </main>
  );
}
