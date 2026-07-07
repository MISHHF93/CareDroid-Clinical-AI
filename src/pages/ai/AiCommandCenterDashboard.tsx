import { useEffect, useRef, useState } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import {
  AI_COMMAND_CENTER_REFRESH_MS,
  AI_EXPERTS,
  fetchAiCommandCenterSnapshot,
} from '../../services/aiCommandCenterApi';

// -- types ---------------------------------------------------------------------

type Snapshot = Awaited<ReturnType<typeof fetchAiCommandCenterSnapshot>>;

// -- helpers -------------------------------------------------------------------

const pct = (v: number) => `${Math.round(v * 100)}%`;
const usd = (v: number) => `$${v.toFixed(2)}`;

const toneColor: Record<string, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  good:     '#22c55e',
  neutral:  MEDICAL_THEME.inkMuted,
};

const statusColor: Record<string, string> = {
  healthy:  '#22c55e',
  review:   '#f59e0b',
  degraded: '#ef4444',
};

// -- sub-components ------------------------------------------------------------

function MetricTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${MEDICAL_THEME.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        minWidth: 0,
        flex: '1 1 140px',
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
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function ExpertRow({
  expert,
}: {
  expert: (typeof AI_EXPERTS)[number] & { active?: boolean; load?: number; confidence?: number };
}) {
  const dot = toneColor[expert.tone] || MEDICAL_THEME.inkMuted;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: expert.active ? dot : MEDICAL_THEME.inkDisabled,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: '0 0 100px', fontWeight: 600, fontSize: 13, color: MEDICAL_THEME.ink }}>
        {expert.label}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: MEDICAL_THEME.inkMuted }}>{expert.specialty}</span>
      {expert.load != null && (
        <span style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, minWidth: 60, textAlign: 'right' }}>
          load {expert.load}%
        </span>
      )}
      {expert.confidence != null && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: expert.confidence >= 90 ? '#22c55e' : expert.confidence >= 80 ? '#f59e0b' : '#ef4444',
            minWidth: 52,
            textAlign: 'right',
          }}
        >
          {expert.confidence}% conf
        </span>
      )}
    </div>
  );
}

function LoadingShell() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 260,
        color: MEDICAL_THEME.inkSubtle,
        fontSize: 14,
      }}
    >
      Loading AI Command Center…
    </div>
  );
}

function WarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div
      role="alert"
      style={{
        background: '#fef3c7',
        border: '1px solid #d97706',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: '#92400e',
        marginBottom: 16,
      }}
    >
      <strong>Degraded data sources: </strong>
      {warnings.join(' · ')}
    </div>
  );
}

// -- page ----------------------------------------------------------------------

export default function AiCommandCenterDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const data = await fetchAiCommandCenterSnapshot();
      setSnapshot(data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, AI_COMMAND_CENTER_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const health = snapshot?.health;
  const cost   = snapshot?.costMetrics;
  const rag    = snapshot?.ragMetrics;
  const mem    = snapshot?.memoryUsage;
  const tools  = snapshot?.toolUsage;

  return (
    <main
      style={{
        background: MEDICAL_THEME.surfacePage,
        minHeight: '100vh',
        padding: '24px 28px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* -- Header -- */}
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
            AI Command Center
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: MEDICAL_THEME.inkMuted }}>
            Evaluation · Memory · Cost · Expert routing
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {health && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: statusColor[health.status] || MEDICAL_THEME.inkMuted,
                background: statusColor[health.status]
                  ? `${statusColor[health.status]}18`
                  : MEDICAL_THEME.border,
                border: `1px solid ${statusColor[health.status] || MEDICAL_THEME.border}`,
                borderRadius: 20,
                padding: '4px 12px',
              }}
            >
              {health.label}
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
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* -- Warnings -- */}
      {snapshot?.warnings && <WarningBanner warnings={snapshot.warnings} />}

      {loading && !snapshot ? (
        <LoadingShell />
      ) : (
        <>
          {/* -- Top metrics strip -- */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricTile
              label="Health"
              value={health?.label ?? '—'}
              sub={`${health?.failedBenchmarks ?? 0} benchmark failures`}
              accent={statusColor[health?.status ?? ''] || MEDICAL_THEME.ink}
            />
            <MetricTile
              label="Latency"
              value={health ? `${Math.round(health.latencyMs)} ms` : '—'}
              sub="avg response time"
            />
            <MetricTile
              label="Accuracy"
              value={health ? pct(health.accuracy) : '—'}
              sub="evaluation score"
              accent={health && health.accuracy >= 0.85 ? '#22c55e' : '#f59e0b'}
            />
            <MetricTile
              label="Cache Hit"
              value={rag ? pct(rag.cacheHitRate) : '—'}
              sub="retrieval cache"
            />
            <MetricTile
              label="Total Cost"
              value={cost ? usd(cost.totalUsd) : '—'}
              sub={cost ? `avg ${usd(cost.averageUsd)} / req` : undefined}
            />
            <MetricTile
              label="Hallucination"
              value={snapshot?.hallucinationMetrics.label ?? '—'}
              sub={`target ${snapshot?.hallucinationMetrics.benchmark ?? '<= 5%'}`}
              accent={
                snapshot && snapshot.hallucinationMetrics.rate <= 0.05
                  ? '#22c55e'
                  : '#ef4444'
              }
            />
          </div>

          {/* -- Main grid -- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {/* AI Experts */}
            <SectionCard title={`AI Experts (${AI_EXPERTS.length})`}>
              {(snapshot?.experts ?? AI_EXPERTS).map((expert) => (
                <ExpertRow key={expert.id} expert={expert as any} />
              ))}
            </SectionCard>

            {/* Memory */}
            <SectionCard title="AI Memory">
              {mem ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Short-term context', value: mem.shortTerm },
                    { label: 'Long-term preferences & history', value: mem.longTerm },
                    { label: 'Clinical findings & scores', value: mem.clinical },
                    { label: 'Recent activity', value: mem.recentActivity },
                    { label: 'Saved workflows', value: mem.savedWorkflows },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                        paddingBottom: 8,
                      }}
                    >
                      <span style={{ color: MEDICAL_THEME.inkMuted }}>{label}</span>
                      <span style={{ fontWeight: 700, color: MEDICAL_THEME.ink }}>{value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: MEDICAL_THEME.accent,
                      marginTop: 4,
                    }}
                  >
                    {mem.total} total memory entries
                  </div>
                </div>
              ) : (
                <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 13 }}>No data</span>
              )}
            </SectionCard>

            {/* Tool Calls */}
            <SectionCard title="Tool Routing">
              {tools ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: MEDICAL_THEME.inkMuted }}>Total requests</span>
                    <span style={{ fontWeight: 700 }}>{tools.totalRequests}</span>
                  </div>
                  {Object.entries(tools.routeCounts).map(([route, count]) => (
                    <div
                      key={route}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                        paddingBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          color: MEDICAL_THEME.inkMuted,
                          textTransform: 'capitalize',
                        }}
                      >
                        {String(route).replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontWeight: 700, color: MEDICAL_THEME.ink }}>
                        {String(count)}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 4 }}>
                    Success rate:{' '}
                    <strong style={{ color: '#22c55e' }}>{pct(tools.successRate)}</strong>
                  </div>
                </div>
              ) : (
                <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 13 }}>No data</span>
              )}
            </SectionCard>

            {/* RAG Quality */}
            <SectionCard title="RAG & Retrieval">
              {rag ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Retrieval precision', value: rag.retrievalLabel },
                    { label: 'Cache hit rate', value: pct(rag.cacheHitRate) },
                    { label: 'Grounded answers', value: String(rag.groundedAnswers) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                        paddingBottom: 8,
                      }}
                    >
                      <span style={{ color: MEDICAL_THEME.inkMuted }}>{label}</span>
                      <span style={{ fontWeight: 700, color: MEDICAL_THEME.ink }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 13 }}>No data</span>
              )}
            </SectionCard>

            {/* Audit log */}
            {snapshot?.auditLogs?.length ? (
              <SectionCard title="Recent Audit">
                {snapshot.auditLogs.slice(0, 6).map((log: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      padding: '5px 0',
                      borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                      color: MEDICAL_THEME.inkMuted,
                    }}
                  >
                    <strong style={{ color: MEDICAL_THEME.ink }}>{log.action ?? log.type ?? 'Event'}</strong>
                    {log.resource && ` · ${log.resource}`}
                    {log.timestamp && (
                      <span style={{ float: 'right', color: MEDICAL_THEME.inkSubtle }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </SectionCard>
            ) : null}

            {/* Source status */}
            {snapshot?.sourceStatus && (
              <SectionCard title="Data Sources">
                {Object.entries(snapshot.sourceStatus).map(([source, status]) => (
                  <div
                    key={source}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      padding: '5px 0',
                      borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                    }}
                  >
                    <span style={{ color: MEDICAL_THEME.inkMuted, textTransform: 'capitalize' }}>
                      {source}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: status === 'live' ? '#22c55e' : '#f59e0b',
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {String(status)}
                    </span>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>

          {/* -- Footer -- */}
          {lastRefreshed && (
            <div
              style={{
                marginTop: 20,
                fontSize: 11,
                color: MEDICAL_THEME.inkSubtle,
                textAlign: 'right',
              }}
            >
              Last refreshed {lastRefreshed.toLocaleTimeString()} · auto-refreshes every{' '}
              {AI_COMMAND_CENTER_REFRESH_MS / 1000}s
            </div>
          )}
        </>
      )}
    </main>
  );
}
