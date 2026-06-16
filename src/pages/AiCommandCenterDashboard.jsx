import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CategoryBarChart,
  DistributionDonutChart,
  MetricCard,
  TrendChart,
} from '../components/dashboard/DashboardVisualizations';
import ContextInsightCard from '../components/ContextInsightCard';
import StateSourceNotice from '../components/StateSourceNotice';
import {
  DashboardGrid,
  DashboardSection,
  PageShell,
} from '../components/ui/CareDroidPrimitives';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import {
  AI_COMMAND_CENTER_REFRESH_MS,
  fetchAiCommandCenterSnapshot,
  formatCommandMetric,
} from '../services/aiCommandCenterApi';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './AiCommandCenterDashboard.css';

const EMPTY_SNAPSHOT = Object.freeze({
  generatedAt: new Date().toISOString(),
  warnings: [],
  sourceStatus: {
    evaluation: 'fallback',
    memory: 'fallback',
    cost: 'fallback',
    audit: 'fallback',
  },
  health: {
    status: 'healthy',
    label: 'Healthy',
    latencyMs: 0,
    accuracy: 0,
    activeExperts: 0,
    failedBenchmarks: 0,
  },
  experts: [],
  ragMetrics: {
    retrievalPrecision: 0,
    retrievalLabel: '0%',
    cacheHitRate: 0,
    groundedAnswers: 0,
  },
  memoryUsage: {
    shortTerm: 0,
    longTerm: 0,
    clinical: 0,
    recentActivity: 0,
    savedWorkflows: 0,
    total: 0,
  },
  toolUsage: {
    totalRequests: 0,
    routeCounts: {},
    complexityCounts: {},
    successRate: 0,
    successLabel: '0%',
  },
  toolCalls: [],
  costMetrics: {
    totalUsd: 0,
    averageUsd: 0,
    tokenTotalUsd: 0,
    cacheHitRate: 0,
  },
  hallucinationMetrics: {
    rate: 0,
    label: '0%',
    benchmark: '<= 5%',
  },
  retrievalQuality: {
    precision: 0,
    label: '0%',
    trend: [],
  },
  trends: [],
  auditLogs: [],
});

function formatTime(isoDate) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(isoDate));
  } catch {
    return 'Just now';
  }
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function toCountBars(counts = {}) {
  return Object.entries(counts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: Number(value || 0),
  }));
}

function memoryBars(memoryUsage) {
  return [
    { name: 'Short', value: memoryUsage.shortTerm },
    { name: 'Long', value: memoryUsage.longTerm },
    { name: 'Clinical', value: memoryUsage.clinical },
    { name: 'Activity', value: memoryUsage.recentActivity },
  ];
}

function expertLoadBars(experts = []) {
  return experts.map((expert) => ({
    name: expert.label,
    value: Number(expert.load || 0),
  }));
}

function Panel({ title, icon, description, children, className = '' }) {
  const titleId = `${title.replace(/\W+/g, '-').toLowerCase()}-panel-title`;
  return (
    <DashboardSection
      className={`ai-command-panel ${className}`.trim()}
      aria-labelledby={titleId}
      title={title}
      titleId={titleId}
      description={description}
      leadingIcon={<span className="ai-command-panel__icon"><NavIcon icon={icon} size={18} /></span>}
    >
      {children}
    </DashboardSection>
  );
}

function ExpertChip({ expert }) {
  return (
    <article className="ai-command-expert" data-active={expert.active ? 'true' : 'false'}>
      <div>
        <strong>{expert.label}</strong>
        <span>{expert.specialty}</span>
      </div>
      <div className="ai-command-expert__metrics">
        <span>{expert.load}% load</span>
        <span>{expert.confidence}% confidence</span>
      </div>
    </article>
  );
}

function AuditLogRow({ log }) {
  const label = log.action || log.event || log.type || 'Audit event';
  const timestamp = log.timestamp || log.createdAt || log.created_at;

  return (
    <article className="ai-command-audit-row">
      <strong>{label}</strong>
      <span>{log.resource || log.entity || log.status || 'AI system activity'}</span>
      <small>{timestamp ? formatTime(timestamp) : 'Recent'}</small>
    </article>
  );
}

function ToolCallRow({ call }) {
  return (
    <article className="ai-command-tool-call">
      <div>
        <strong>{call.label || call.route}</strong>
        <span>{call.complexity || 'mixed'} complexity</span>
      </div>
      <div>
        <strong>{call.count}</strong>
        <span>{call.status || 'active'}</span>
      </div>
    </article>
  );
}

export default function AiCommandCenterDashboard() {
  const systemConfig = useSystemConfig();
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadSnapshot = useCallback(async () => {
    const nextSnapshot = await fetchAiCommandCenterSnapshot();
    setSnapshot(nextSnapshot || EMPTY_SNAPSHOT);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextSnapshot = await fetchAiCommandCenterSnapshot();
      if (cancelled) return;
      setSnapshot(nextSnapshot || EMPTY_SNAPSHOT);
      setLastUpdated(new Date().toISOString());
      setLoading(false);
    }

    load();
    const timer = window.setInterval(load, AI_COMMAND_CENTER_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const routeBars = useMemo(
    () => toCountBars(snapshot.toolUsage.routeCounts),
    [snapshot.toolUsage.routeCounts]
  );
  const complexityBars = useMemo(
    () => toCountBars(snapshot.toolUsage.complexityCounts),
    [snapshot.toolUsage.complexityCounts]
  );
  const activeExperts = snapshot.experts.filter((expert) => expert.active);
  const ragEnabled = systemConfig.isRagEnabled ? 'Enabled' : 'Fallback';
  const availableTools = Array.isArray(systemConfig.availableTools)
    ? systemConfig.availableTools.length
    : 0;
  const aiUsage = systemConfig.aiUsage || {};
  const sourceStatus = snapshot.sourceStatus || EMPTY_SNAPSHOT.sourceStatus;

  return (
    <PageShell
      className="ai-command-center"
      contentClassName="cd-page-stack cd-page-stack--compact ai-command-center__content"
      eyebrow="AI operations source mix"
      title="AI Command Center"
      titleId="ai-command-center-title"
      description="Compact operational view of AI health, experts, RAG, memory, tools, spend, safety, retrieval quality, and audit activity."
      actions={
        <div className="ai-command-live">
          <span
            className={`ai-command-live__dot ai-command-live__dot--${snapshot.health.status}`}
          />
          <div>
            <strong>{loading ? 'Syncing' : snapshot.health.label}</strong>
            <span>Refresh every {AI_COMMAND_CENTER_REFRESH_MS / 1000}s</span>
            <small>
              {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Preparing snapshot'}
            </small>
            <small>
              Sources: eval {sourceStatus.evaluation}, memory {sourceStatus.memory}, cost{' '}
              {sourceStatus.cost}
            </small>
          </div>
          <button type="button" onClick={loadSnapshot} disabled={loading}>
            Refresh
          </button>
        </div>
      }
    >

      {snapshot.warnings.length ? (
        <section className="ai-command-warning" aria-label="Data source warnings">
          {snapshot.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </section>
      ) : null}

      <StateSourceNotice
        title="AI command center source states"
        states={[
          DEMO_LIVE_STATES.LIVE,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="AI health, memory, cost, retrieval, and audit panels may combine backend snapshots with fallback/local metrics. Source status is shown above; backend-unavailable panels must not be interpreted as live production AI telemetry."
      />

      <DashboardGrid className="ai-command-insights" aria-label="AI command center context insights">
        <ContextInsightCard
          title="Source mix"
          message={`Evaluation ${sourceStatus.evaluation}, memory ${sourceStatus.memory}, cost ${sourceStatus.cost}.`}
          source="Backend snapshot"
          status={Object.values(sourceStatus).some((value) => value === 'fallback') ? 'unavailable' : 'live'}
          actionLabel="Refresh"
          actionOnClick={loadSnapshot}
          timestamp={lastUpdated}
        />
        <ContextInsightCard
          title="Retrieval context"
          message={`${ragEnabled} retrieval with ${snapshot.ragMetrics.retrievalLabel} precision. Grounded answers: ${snapshot.ragMetrics.groundedAnswers}.`}
          source={systemConfig.isRagEnabled ? 'System config' : 'Fallback config'}
          status={systemConfig.isRagEnabled ? 'generated' : 'demo'}
          demo={!systemConfig.isRagEnabled}
          actionLabel="Review metrics"
          actionRoute="/ai-command-center"
        />
        <ContextInsightCard
          title={snapshot.warnings.length ? 'Source warning' : 'No source warnings'}
          message={snapshot.warnings[0] || 'No backend source warnings are active in this snapshot.'}
          source="AI operations"
          status={snapshot.warnings.length ? 'action-required' : 'generated'}
          actionLabel="Open audit"
          actionRoute={CANONICAL_ROUTES.audit}
        />
      </DashboardGrid>

      <DashboardGrid variant="metrics" className="ai-command-metrics" aria-label="AI command center summary">
        <MetricCard
          label="AI health"
          value={snapshot.health.label}
          hint={`${formatCommandMetric('accuracy', snapshot.health.accuracy)} accuracy`}
          tone={snapshot.health.status === 'healthy' ? 'good' : 'warning'}
        />
        <MetricCard
          label="Active experts"
          value={`${activeExperts.length}/${snapshot.experts.length}`}
          hint="Specialty routers online"
          tone="good"
        />
        <MetricCard
          label="RAG metrics"
          value={snapshot.ragMetrics.retrievalLabel}
          hint={`${ragEnabled} retrieval`}
          tone={snapshot.ragMetrics.retrievalPrecision >= 0.85 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Memory usage"
          value={snapshot.memoryUsage.total}
          hint={`${snapshot.memoryUsage.clinical} clinical entries`}
        />
        <MetricCard
          label="Tool calls"
          value={snapshot.toolUsage.totalRequests}
          hint={`${snapshot.toolUsage.successLabel} success`}
          tone={snapshot.toolUsage.successRate >= 0.98 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Cost metrics"
          value={formatMoney(snapshot.costMetrics.totalUsd)}
          hint={`${formatMoney(snapshot.costMetrics.averageUsd)} avg request`}
        />
        <MetricCard
          label="Hallucination metrics"
          value={snapshot.hallucinationMetrics.label}
          hint={`Benchmark ${snapshot.hallucinationMetrics.benchmark}`}
          tone={snapshot.hallucinationMetrics.rate <= 0.05 ? 'good' : 'critical'}
        />
        <MetricCard
          label="Retrieval metrics"
          value={snapshot.retrievalQuality.label}
          hint={`${percent(snapshot.ragMetrics.cacheHitRate)} cache hit rate`}
          tone={snapshot.retrievalQuality.precision >= 0.85 ? 'good' : 'warning'}
        />
      </DashboardGrid>

      <DashboardGrid className="ai-command-grid" aria-label="AI command center panels">
        <Panel
          title="AI Health"
          icon={CHROME_ICONS.shield}
          description="Readiness signals and benchmark status."
          className="ai-command-panel--wide"
        >
          <div className="ai-command-health-grid">
            <div>
              <span>Status</span>
              <strong>{snapshot.health.label}</strong>
            </div>
            <div>
              <span>Latency</span>
              <strong>{formatCommandMetric('latencyMs', snapshot.health.latencyMs)}</strong>
            </div>
            <div>
              <span>Usage remaining</span>
              <strong>{aiUsage.remaining ?? 'N/A'}</strong>
            </div>
            <div>
              <span>API tools</span>
              <strong>{availableTools}</strong>
            </div>
          </div>
          <TrendChart data={snapshot.trends} title="AI accuracy trend" dataKey="accuracy" />
        </Panel>

        <Panel
          title="Active Experts"
          icon={CHROME_ICONS.brain}
          description="Specialty experts and load."
        >
          <div className="ai-command-expert-grid">
            {snapshot.experts.map((expert) => (
              <ExpertChip key={expert.id} expert={expert} />
            ))}
          </div>
          <CategoryBarChart
            data={expertLoadBars(snapshot.experts)}
            title="Expert load chart"
            color="var(--app-chart-6)"
          />
        </Panel>

        <Panel
          title="Retrieval Metrics"
          icon={CHROME_ICONS.sparkles}
          description="Grounding, cache, and retrieval flow."
        >
          <div className="ai-command-mini-stats">
            <div>
              <span>Retrieval precision</span>
              <strong>{snapshot.ragMetrics.retrievalLabel}</strong>
            </div>
            <div>
              <span>Grounded answers</span>
              <strong>{snapshot.ragMetrics.groundedAnswers}</strong>
            </div>
            <div>
              <span>Cache hit rate</span>
              <strong>{percent(snapshot.ragMetrics.cacheHitRate)}</strong>
            </div>
          </div>
          <TrendChart
            data={snapshot.retrievalQuality.trend}
            title="Retrieval quality trend"
            color="var(--app-chart-2)"
          />
        </Panel>

        <Panel
          title="Memory Usage"
          icon={CHROME_ICONS.pin}
          description="Short-term, long-term, and clinical memory."
        >
          <CategoryBarChart data={memoryBars(snapshot.memoryUsage)} title="Memory usage chart" />
          <div className="ai-command-footnote">
            {snapshot.memoryUsage.savedWorkflows} saved workflows tracked in memory.
          </div>
        </Panel>

        <Panel
          title="Tool Calls"
          icon={CHROME_ICONS.tools}
          description="Recent tool-call routes, success, and complexity distribution."
        >
          <div className="ai-command-tool-call-list">
            {snapshot.toolCalls?.length ? (
              snapshot.toolCalls.map((call) => <ToolCallRow key={call.id || call.route} call={call} />)
            ) : (
              <p className="ai-command-empty">No tool calls returned in the current snapshot.</p>
            )}
          </div>
          <DistributionDonutChart data={routeBars} title="Tool route distribution" />
          <CategoryBarChart
            data={complexityBars}
            title="Request complexity chart"
            color="var(--app-chart-3)"
          />
        </Panel>

        <Panel
          title="Cost Metrics"
          icon={CHROME_ICONS.circleDollar}
          description="Request, token, and cache spend."
        >
          <div className="ai-command-mini-stats">
            <div>
              <span>Total request cost</span>
              <strong>{formatMoney(snapshot.costMetrics.totalUsd)}</strong>
            </div>
            <div>
              <span>Token total</span>
              <strong>{formatMoney(snapshot.costMetrics.tokenTotalUsd)}</strong>
            </div>
            <div>
              <span>Avg request</span>
              <strong>{formatMoney(snapshot.costMetrics.averageUsd)}</strong>
            </div>
          </div>
          <TrendChart
            data={snapshot.trends}
            title="Cost trend"
            dataKey="cost"
            color="var(--app-chart-5)"
          />
        </Panel>

        <Panel
          title="Hallucination Monitoring"
          icon={CHROME_ICONS.alert}
          description="Unsupported claims and benchmark guardrail."
        >
          <div className="ai-command-risk-card">
            <span>Current rate</span>
            <strong>{snapshot.hallucinationMetrics.label}</strong>
            <p>Release benchmark: {snapshot.hallucinationMetrics.benchmark}</p>
          </div>
          <TrendChart
            data={snapshot.trends}
            title="Hallucination rate trend"
            dataKey="hallucination"
            color="var(--app-chart-4)"
          />
        </Panel>

        <Panel
          title="Retrieval Quality"
          icon={CHROME_ICONS.search}
          description="Precision trend and retrieval health."
        >
          <div className="ai-command-risk-card ai-command-risk-card--good">
            <span>Precision</span>
            <strong>{snapshot.retrievalQuality.label}</strong>
            <p>
              {ragEnabled} with {snapshot.ragMetrics.groundedAnswers} grounded responses.
            </p>
          </div>
          <TrendChart
            data={snapshot.trends}
            title="Retrieval precision trend"
            dataKey="retrieval"
            color="var(--app-chart-2)"
          />
        </Panel>

        <Panel
          title="Audit Logs"
          icon={CHROME_ICONS.clipboardList}
          description="Most recent AI-adjacent audit events."
          className="ai-command-panel--wide"
        >
          <div className="ai-command-audit-list">
            {snapshot.auditLogs.length ? (
              snapshot.auditLogs.map((log, index) => (
                <AuditLogRow key={log.id || index} log={log} />
              ))
            ) : (
              <p className="ai-command-empty">No recent audit logs returned by the API.</p>
            )}
          </div>
        </Panel>
      </DashboardGrid>
    </PageShell>
  );
}
