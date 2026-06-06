import { useEffect, useMemo, useState } from 'react';
import {
  CategoryBarChart,
  MetricCard,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import StateSourceNotice from '../components/StateSourceNotice';
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
    accuracy: Math.round(Number(point.metrics?.accuracy || 0) * 100),
    hallucinationRate: Math.round(Number(point.metrics?.hallucinationRate || 0) * 100),
    retrievalPrecision: Math.round(Number(point.metrics?.retrievalPrecision || 0) * 100),
    latencyMs: Math.round(Number(point.metrics?.latencyMs || 0)),
    costUsd: Number(point.metrics?.costUsd || 0),
  }));
}

function toQualityBars(metrics = {}) {
  return [
    { name: 'Accuracy', value: Math.round(Number(metrics.accuracy || 0) * 100) },
    { name: 'Retrieval', value: Math.round(Number(metrics.retrievalPrecision || 0) * 100) },
    { name: 'Tools', value: Math.round(Number(metrics.toolExecutionSuccess || 0) * 100) },
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
  const benchmarkById = useMemo(
    () => Object.fromEntries(benchmarks.map((benchmark) => [benchmark.id, benchmark])),
    [benchmarks]
  );
  const trendRows = useMemo(() => toTrendRows(dashboard.trends), [dashboard.trends]);
  const qualityBars = useMemo(() => toQualityBars(metrics), [metrics]);
  const operationalBars = useMemo(() => toOperationalBars(metrics), [metrics]);
  const failingBenchmarks = benchmarks.filter((benchmark) => !benchmark.passed).length;

  return (
    <main className="ai-evaluation-dashboard">
      <section className="ai-evaluation-hero" aria-labelledby="ai-evaluation-title">
        <div className="ai-evaluation-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.lineChart} size={30} />
        </div>
        <div>
          <p className="ai-evaluation-eyebrow">AI evaluation framework</p>
          <h1 id="ai-evaluation-title">AI Evaluation</h1>
          <p>
            Track model quality, retrieval quality, tool execution, user satisfaction, latency, and
            cost against release benchmarks.
          </p>
        </div>
        <div className="ai-evaluation-hero__status">
          <span>{loading ? 'Syncing' : 'Updated'}</span>
          <strong>{failingBenchmarks === 0 ? 'All gates passing' : `${failingBenchmarks} gates need review`}</strong>
        </div>
      </section>

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

      <section className="dashboard-metric-grid" aria-label="AI evaluation metrics">
        {EVALUATION_METRICS.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={formatMetric(metric.id, metrics[metric.id])}
            hint={metricHint(metric.id, benchmarkById[metric.id])}
            tone={metricTone(metric.id, benchmarkById[metric.id])}
          />
        ))}
      </section>

      <section className="dashboard-visual-grid" aria-label="AI evaluation charts and trends">
        <VisualizationPanel
          title="Accuracy Trend"
          description="Correct clinical answers across recent evaluation runs."
          badge="Quality"
        >
          <TrendChart data={trendRows} title="Accuracy trend" dataKey="accuracy" />
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
                {formatMetric('accuracy', run.metrics?.accuracy)} accuracy -{' '}
                {formatMetric('costUsd', run.metrics?.costUsd)} cost
              </small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
