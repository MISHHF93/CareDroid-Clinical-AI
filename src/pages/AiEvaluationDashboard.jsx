import { useEffect, useMemo, useState } from 'react';
import {
  CategoryBarChart,
  MetricCard,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import StateSourceNotice from '../components/StateSourceNotice';
import { DashboardGrid, PageShell } from '../components/ui/CareDroidPrimitives';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import {
  EVALUATION_METRICS,
  LOCAL_EVALUATION_DASHBOARD,
  fetchEvaluationDashboard,
} from '../services/evaluationApi';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './AiEvaluationDashboard.css';

const LOWER_IS_BETTER = new Set(['hallucinationRate', 'latencyMs', 'costUsd']);
const COMPARISON_DIMENSIONS = [
  { id: 'models', label: 'Models' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'agents', label: 'Agents' },
  { id: 'ragStrategies', label: 'RAG strategies' },
];

function formatMetric(metricId, value) {
  const metric = EVALUATION_METRICS.find((item) => item.id === metricId);
  if (!metric) return String(value ?? '');
  if (metric.unit === 'percent') return `${Math.round(Number(value || 0) * 100)}%`;
  if (metric.unit === 'milliseconds') return `${Math.round(Number(value || 0))} ms`;
  if (metric.unit === 'usd') return `$${Number(value || 0).toFixed(2)}`;
  return `${Number(value || 0).toFixed(2)}/5`;
}

function metricTone(metricId, benchmark) {
  if (!benchmark) return 'neutral';
  if (benchmark.passed) return 'good';
  return LOWER_IS_BETTER.has(metricId) ? 'critical' : 'warning';
}

function metricHint(metricId, benchmark) {
  if (!benchmark) return '';
  return `${benchmark.passed ? 'Meets' : 'Misses'} benchmark ${benchmark.benchmarkLabel}`;
}

function toTrendRows(trends = []) {
  return trends.map((point) => ({
    label: point.label,
    modelQuality: Math.round(Number(point.metrics?.modelQuality || 0) * 100),
    accuracy: Math.round(Number(point.metrics?.accuracy || 0) * 100),
    hallucinationRate: Math.round(Number(point.metrics?.hallucinationRate || 0) * 100),
    retrievalPrecision: Math.round(Number(point.metrics?.retrievalPrecision || 0) * 100),
    workflowSuccess: Math.round(Number(point.metrics?.workflowSuccess || 0) * 100),
    latencyMs: Math.round(Number(point.metrics?.latencyMs || 0)),
    costUsd: Number(point.metrics?.costUsd || 0),
  }));
}

function toQualityBars(metrics = {}) {
  return [
    { name: 'Quality', value: Math.round(Number(metrics.modelQuality || 0) * 100) },
    { name: 'Accuracy', value: Math.round(Number(metrics.accuracy || 0) * 100) },
    { name: 'Retrieval', value: Math.round(Number(metrics.retrievalPrecision || 0) * 100) },
    { name: 'Tools', value: Math.round(Number(metrics.toolExecutionSuccess || 0) * 100) },
    { name: 'Workflow', value: Math.round(Number(metrics.workflowSuccess || 0) * 100) },
    { name: 'Satisfaction', value: Math.round((Number(metrics.userSatisfaction || 0) / 5) * 100) },
  ];
}

function toOperationalBars(metrics = {}) {
  return [
    { name: 'Latency ms', value: Math.round(Number(metrics.latencyMs || 0)) },
    { name: 'Cost USD', value: Number(Number(metrics.costUsd || 0).toFixed(2)) },
  ];
}

function BenchmarkCard({ benchmark }) {
  return (
    <article className="ai-evaluation-benchmark" data-passed={benchmark.passed ? 'true' : 'false'}>
      <div>
        <strong>{benchmark.label}</strong>
        <span>{benchmark.benchmarkLabel}</span>
      </div>
      <p>{benchmark.observedLabel}</p>
    </article>
  );
}

function ComparisonCard({ row }) {
  return (
    <article className="ai-evaluation-comparison-card">
      <div>
        <strong>{row.label}</strong>
        <span>
          {row.runCount} runs - {row.sampleCount} cases
        </span>
      </div>
      <dl>
        <div>
          <dt>Quality</dt>
          <dd>{formatMetric('modelQuality', row.metrics?.modelQuality)}</dd>
        </div>
        <div>
          <dt>Hallucination</dt>
          <dd>{formatMetric('hallucinationRate', row.metrics?.hallucinationRate)}</dd>
        </div>
        <div>
          <dt>Tools</dt>
          <dd>{formatMetric('toolExecutionSuccess', row.metrics?.toolExecutionSuccess)}</dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>{formatMetric('workflowSuccess', row.metrics?.workflowSuccess)}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{formatMetric('latencyMs', row.metrics?.latencyMs)}</dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{formatMetric('costUsd', row.metrics?.costUsd)}</dd>
        </div>
      </dl>
      <small>{Math.round(Number(row.benchmarkPassRate || 0) * 100)}% benchmark pass rate</small>
    </article>
  );
}

export default function AiEvaluationDashboard() {
  const [dashboard, setDashboard] = useState(LOCAL_EVALUATION_DASHBOARD);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      const result = await fetchEvaluationDashboard();
      if (cancelled) return;
      setDashboard(result.data || LOCAL_EVALUATION_DASHBOARD);
      setNotice(result.ok ? '' : `Using local evaluation baselines. ${result.message}`);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = dashboard.aggregateMetrics || LOCAL_EVALUATION_DASHBOARD.aggregateMetrics;
  const benchmarks = dashboard.benchmarks || LOCAL_EVALUATION_DASHBOARD.benchmarks;
  const comparisons = dashboard.comparisons || LOCAL_EVALUATION_DASHBOARD.comparisons || {};
  const benchmarkById = useMemo(
    () => Object.fromEntries(benchmarks.map((benchmark) => [benchmark.id, benchmark])),
    [benchmarks]
  );
  const trendRows = useMemo(() => toTrendRows(dashboard.trends), [dashboard.trends]);
  const qualityBars = useMemo(() => toQualityBars(metrics), [metrics]);
  const operationalBars = useMemo(() => toOperationalBars(metrics), [metrics]);
  const failingBenchmarks = benchmarks.filter((benchmark) => !benchmark.passed).length;

  return (
    <PageShell
      className="ai-evaluation-dashboard"
      eyebrow="AI evaluation framework"
      title="AI Evaluation Lab"
      titleId="ai-evaluation-title"
      description="Track model quality, hallucination rate, tool-call success, workflow success, latency, and cost, then compare models, prompts, agents, and RAG strategies."
      leadingIcon={<NavIcon icon={CHROME_ICONS.lineChart} size={30} />}
      actions={
        <div className="ai-evaluation-hero__status">
          <span>{loading ? 'Syncing' : 'Updated'}</span>
          <strong>{failingBenchmarks === 0 ? 'All gates passing' : `${failingBenchmarks} gates need review`}</strong>
        </div>
      }
    >

      {notice ? <p className="ai-evaluation-notice">{notice}</p> : null}

      <StateSourceNotice
        title="AI evaluation source states"
        states={[
          DEMO_LIVE_STATES.LIVE,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Evaluation metrics use backend benchmark results when available and local baseline data when the backend is unavailable. Local baselines are release-readiness examples, not live production model quality."
      />

      <DashboardGrid variant="metrics" className="dashboard-metric-grid" aria-label="AI evaluation metrics">
        {EVALUATION_METRICS.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={formatMetric(metric.id, metrics[metric.id])}
            hint={metricHint(metric.id, benchmarkById[metric.id])}
            tone={metricTone(metric.id, benchmarkById[metric.id])}
          />
        ))}
      </DashboardGrid>

      <DashboardGrid className="dashboard-visual-grid" aria-label="AI evaluation charts and trends">
        <VisualizationPanel
          title="Model Quality Trend"
          description="Composite model quality across recent evaluation runs."
          badge="Quality"
        >
          <TrendChart data={trendRows} title="Model quality trend" dataKey="modelQuality" />
        </VisualizationPanel>

        <VisualizationPanel
          title="Hallucination Trend"
          description="Unsupported factual claims should continue trending down."
          badge="Safety"
        >
          <TrendChart
            data={trendRows}
            title="Hallucination trend"
            dataKey="hallucinationRate"
            color="var(--app-chart-4)"
          />
        </VisualizationPanel>

        <VisualizationPanel
          title="Quality Snapshot"
          description="Current aggregate quality metrics normalized to percentage."
          badge="Charts"
        >
          <CategoryBarChart data={qualityBars} title="Quality snapshot chart" />
        </VisualizationPanel>

        <VisualizationPanel
          title="Operational Snapshot"
          description="Latency and cost from the latest aggregate evaluation window."
          badge="Ops"
        >
          <CategoryBarChart
            data={operationalBars}
            title="Operational snapshot chart"
            color="var(--app-chart-5)"
          />
        </VisualizationPanel>
      </DashboardGrid>

      <section className="ai-evaluation-comparison-panel" aria-labelledby="ai-evaluation-comparisons-title">
        <div className="ai-evaluation-section-heading">
          <div>
            <h2 id="ai-evaluation-comparisons-title">Comparison Lab</h2>
            <p>Compare models, prompts, agents, and RAG strategies with the same benchmark metrics.</p>
          </div>
        </div>
        <div className="ai-evaluation-comparison-grid">
          {COMPARISON_DIMENSIONS.map((dimension) => (
            <section key={dimension.id} aria-label={`${dimension.label} comparison`}>
              <h3>{dimension.label}</h3>
              <div className="ai-evaluation-comparison-list">
                {(comparisons[dimension.id] || []).slice(0, 3).map((row) => (
                  <ComparisonCard key={row.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="ai-evaluation-benchmark-panel" aria-labelledby="ai-evaluation-benchmarks-title">
        <div className="ai-evaluation-section-heading">
          <div>
            <h2 id="ai-evaluation-benchmarks-title">Benchmarks</h2>
            <p>Release gates for safety, quality, retrieval, execution reliability, satisfaction, and cost.</p>
          </div>
          <span>{benchmarks.length - failingBenchmarks}/{benchmarks.length} passing</span>
        </div>
        <div className="ai-evaluation-benchmark-grid">
          {benchmarks.map((benchmark) => (
            <BenchmarkCard key={benchmark.id} benchmark={benchmark} />
          ))}
        </div>
      </section>

      <section className="ai-evaluation-runs" aria-labelledby="ai-evaluation-runs-title">
        <div className="ai-evaluation-section-heading">
          <div>
            <h2 id="ai-evaluation-runs-title">Recent Evaluation Runs</h2>
            <p>Tracked datasets and model candidates feeding the trend dashboard.</p>
          </div>
        </div>
        <div className="ai-evaluation-run-list">
          {(dashboard.runs || []).slice(0, 5).map((run) => (
            <article key={run.id}>
              <strong>{run.modelName}</strong>
              <span>
                {run.datasetName} - {run.sampleCount} cases
              </span>
              <small>
                {run.promptName || 'Prompt unspecified'} - {run.agentName || 'Agent unspecified'} -{' '}
                {run.ragStrategy || 'RAG unspecified'}
              </small>
              <small>
                {formatMetric('modelQuality', run.metrics?.modelQuality)} quality -{' '}
                {formatMetric('costUsd', run.metrics?.costUsd)} cost
              </small>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
