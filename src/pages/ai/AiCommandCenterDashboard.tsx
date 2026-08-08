import { useEffect, useRef, useState } from 'react';
import './AiCommandCenterDashboard.css';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import {
  AI_COMMAND_CENTER_REFRESH_MS,
  AI_EXPERTS,
  fetchAiCommandCenterSnapshot,
} from '../../services/aiCommandCenterApi';
import StateSourceNotice from '../../components/StateSourceNotice';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';

// -- types ---------------------------------------------------------------------

type Snapshot = Awaited<ReturnType<typeof fetchAiCommandCenterSnapshot>>;

// -- helpers -------------------------------------------------------------------

const pct = (v: number) => `${Math.round(v * 100)}%`;
const usd = (v: number) => `$${v.toFixed(2)}`;

const toneColor: Record<string, string> = {
  critical: MEDICAL_THEME.danger,
  warning:  MEDICAL_THEME.warning,
  good:     MEDICAL_THEME.success,
  neutral:  MEDICAL_THEME.inkMuted,
};

const statusColor: Record<string, string> = {
  healthy:  MEDICAL_THEME.success,
  review:   MEDICAL_THEME.warning,
  degraded: MEDICAL_THEME.danger,
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
    <div className="ai-cc-metric-tile">
      <div className="ai-cc-metric-tile__label">
        {label}
      </div>
      <div className="ai-cc-metric-tile__value" style={{ color: accent || MEDICAL_THEME.ink }}>
        {value}
      </div>
      {sub && (
        <div className="ai-cc-metric-tile__sub">{sub}</div>
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
    <div className="ai-cc-section-card">
      <h2 className="ai-cc-section-card__title">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ExpertRow({
  expert,
}: {
  expert: (typeof AI_EXPERTS)[number] & {
    active?: boolean;
    load?: number;
    confidence?: number;
    confidenceSeedOnly?: boolean;
  };
}) {
  const dot = toneColor[expert.tone] || MEDICAL_THEME.inkMuted;
  return (
    <div className="ai-cc-expert-row">
      <span
        className="ai-cc-expert-row__dot"
        style={{ background: expert.active ? dot : MEDICAL_THEME.inkDisabled }}
      />
      <span className="ai-cc-expert-row__label">
        {expert.label}
      </span>
      <span className="ai-cc-expert-row__specialty">{expert.specialty}</span>
      {expert.load != null && (
        <span className="ai-cc-expert-row__load">
          load {expert.load}%
        </span>
      )}
      {expert.confidence != null && (
        <span
          className="ai-cc-expert-row__confidence"
          title={
            expert.confidenceSeedOnly
              ? 'Derived from a seed-only evaluation aggregate, not a measured per-expert value.'
              : 'Derived from the measured evaluation aggregate, applied uniformly (no per-expert measurement exists).'
          }
          style={{
            color:
              expert.confidence >= 90
                ? MEDICAL_THEME.success
                : expert.confidence >= 80
                  ? MEDICAL_THEME.warning
                  : MEDICAL_THEME.danger,
          }}
        >
          {expert.confidence}% conf{expert.confidenceSeedOnly ? ' (demo)' : ''}
        </span>
      )}
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="ai-cc-loading-shell">
      Loading AI Command Center…
    </div>
  );
}

function WarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div role="alert" className="ai-cc-warning-banner">
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
  const node   = snapshot?.unifiedNode;

  return (
    <main className="ai-cc-page">
      {/* -- Header -- */}
      <div className="ai-cc-header">
        <div>
          <h1 className="ai-cc-header__title">
            AI Command Center
          </h1>
          <p className="ai-cc-header__subtitle">
            Unified AI Node · Evaluation · Memory · Cost · Expert routing
          </p>
        </div>
        <div className="ai-cc-header__actions">
          {health && (
            <span
              className="ai-cc-header__status"
              style={{
                color: statusColor[health.status] || MEDICAL_THEME.inkMuted,
                background: statusColor[health.status]
                  ? `${statusColor[health.status]}18`
                  : MEDICAL_THEME.border,
                border: `1px solid ${statusColor[health.status] || MEDICAL_THEME.border}`,
              }}
            >
              {health.label}
            </span>
          )}
          <button type="button"
            onClick={load}
            disabled={loading}
            className="ai-cc-header__refresh-btn"
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* -- Source state -- */}
      {snapshot && (
        <StateSourceNotice
          title="AI command center source state"
          states={
            snapshot.ok
              ? snapshot.evaluationHonesty?.seedOnly
                ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
                : [DEMO_LIVE_STATES.LIVE]
              : [DEMO_LIVE_STATES.LIVE, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
          }
          details={
            snapshot.ok
              ? snapshot.evaluationHonesty?.seedOnly
                ? `All sources connected, but evaluation metrics below are SEED-ONLY demo values (${snapshot.evaluationHonesty.guidance})`
                : 'All evaluation, memory, cost, and audit sources connected with measured evaluation data.'
              : 'One or more sources fell back to local data. See warnings below.'
          }
        />
      )}

      {/* -- Warnings -- */}
      {snapshot?.warnings && <WarningBanner warnings={snapshot.warnings} />}

      {loading && !snapshot ? (
        <LoadingShell />
      ) : (
        <>
          {/* -- CareDroid Unified AI Node (1-node backbone) -- */}
          {node && (
            <SectionCard title="CareDroid Unified AI Node">
              <div className="ai-cc-metrics-strip ai-cc-metrics-strip--tight">
                <MetricTile
                  label="Node"
                  value={node.ready || node.status === 'ready' ? 'Ready' : String(node.status || '—')}
                  sub={node.nodeId || 'caredroid-unified-ai-node'}
                  accent={
                    node.ready || node.status === 'ready'
                      ? MEDICAL_THEME.success
                      : MEDICAL_THEME.warning
                  }
                />
                <MetricTile
                  label="NLU head"
                  value={node.nluLabel ?? '—'}
                  sub="intent classifier"
                  accent={MEDICAL_THEME.success}
                />
                <MetricTile
                  label="Artifact head"
                  value={node.artifactLabel ?? '—'}
                  sub="type router"
                  accent={MEDICAL_THEME.success}
                />
                <MetricTile
                  label="Composite"
                  value={node.compositeLabel ?? '—'}
                  sub={
                    node.singleNode !== false
                      ? `1 node · quarantine: ${node.quarantine || 'none'}`
                      : 'multi-node?'
                  }
                />
                <MetricTile
                  label="Source"
                  value={node.source === 'live' ? 'Live' : 'Fallback'}
                  sub={node.embeddingModel || 'Xenova/all-mpnet-base-v2'}
                />
                <MetricTile
                  label="Registry"
                  value={node.registryModelId ? 'Approved' : '—'}
                  sub={node.registryModelId || 'mdl-unified-ai-node-v1'}
                />
              </div>
            </SectionCard>
          )}

          {/* -- Top metrics strip -- */}
          <div className="ai-cc-metrics-strip">
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
              accent={health && health.accuracy >= 0.85 ? MEDICAL_THEME.success : MEDICAL_THEME.warning}
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
                  ? MEDICAL_THEME.success
                  : MEDICAL_THEME.danger
              }
            />
          </div>

          {/* -- Main grid -- */}
          <div className="ai-cc-main-grid">
            {/* AI Experts */}
            <SectionCard title={`AI Experts (${AI_EXPERTS.length})`}>
              {(snapshot?.experts ?? AI_EXPERTS).map((expert) => (
                <ExpertRow key={expert.id} expert={expert as any} />
              ))}
            </SectionCard>

            {/* Memory */}
            <SectionCard title="AI Memory">
              {mem ? (
                <div className="u-flex-col u-gap-10">
                  {[
                    { label: 'Short-term context', value: mem.shortTerm },
                    { label: 'Long-term preferences & history', value: mem.longTerm },
                    { label: 'Clinical findings & scores', value: mem.clinical },
                    { label: 'Recent activity', value: mem.recentActivity },
                    { label: 'Saved workflows', value: mem.savedWorkflows },
                  ].map(({ label, value }) => (
                    <div key={label} className="ai-cc-kv-row">
                      <span className="ai-cc-kv-row__label">{label}</span>
                      <span className="ai-cc-kv-row__value">{value}</span>
                    </div>
                  ))}
                  <div className="ai-cc-memory-total">
                    {mem.total} total memory entries
                  </div>
                </div>
              ) : (
                <span className="ai-cc-empty-state">No data</span>
              )}
            </SectionCard>

            {/* Tool Calls */}
            <SectionCard title="Tool Routing">
              {tools ? (
                <div className="u-flex-col u-gap-8">
                  <div className="ai-cc-tool-summary-row">
                    <span className="ai-cc-kv-row__label">Total requests</span>
                    <span className="u-fw-700">{tools.totalRequests}</span>
                  </div>
                  {Object.entries(tools.routeCounts).map(([route, count]) => (
                    <div key={route} className="ai-cc-tool-route-row">
                      <span className="ai-cc-tool-route-row__label">
                        {String(route).replace(/_/g, ' ')}
                      </span>
                      <span className="ai-cc-kv-row__value">
                        {String(count)}
                      </span>
                    </div>
                  ))}
                  <div className="ai-cc-tool-success-rate">
                    Success rate:{' '}
                    <strong className="ai-cc-tool-success-value">{pct(tools.successRate)}</strong>
                  </div>
                </div>
              ) : (
                <span className="ai-cc-empty-state">No data</span>
              )}
            </SectionCard>

            {/* RAG Quality */}
            <SectionCard title="RAG & Retrieval">
              {rag ? (
                <div className="u-flex-col u-gap-10">
                  {[
                    { label: 'Retrieval precision', value: rag.retrievalLabel },
                    { label: 'Cache hit rate', value: pct(rag.cacheHitRate) },
                    { label: 'Grounded answers', value: String(rag.groundedAnswers) },
                  ].map(({ label, value }) => (
                    <div key={label} className="ai-cc-kv-row">
                      <span className="ai-cc-kv-row__label">{label}</span>
                      <span className="ai-cc-kv-row__value">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="ai-cc-empty-state">No data</span>
              )}
            </SectionCard>

            {/* Audit log */}
            {snapshot?.auditLogs?.length ? (
              <SectionCard title="Recent Audit">
                {snapshot.auditLogs.slice(0, 6).map((log: any, i: number) => (
                  <div key={i} className="ai-cc-audit-row">
                    <strong className="ai-cc-audit-row__action">{log.action ?? log.type ?? 'Event'}</strong>
                    {log.resource && ` · ${log.resource}`}
                    {log.timestamp && (
                      <span className="ai-cc-audit-row__timestamp">
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
                  <div key={source} className="ai-cc-source-row">
                    <span className="ai-cc-source-row__label">
                      {source}
                    </span>
                    <span
                      className="ai-cc-source-row__value"
                      style={{ color: status === 'live' ? MEDICAL_THEME.success : MEDICAL_THEME.warning }}
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
            <div className="ai-cc-footer">
              Last refreshed {lastRefreshed.toLocaleTimeString()} · auto-refreshes every{' '}
              {AI_COMMAND_CENTER_REFRESH_MS / 1000}s
            </div>
          )}
        </>
      )}
    </main>
  );
}
