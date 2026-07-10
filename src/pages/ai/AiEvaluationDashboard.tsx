import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  LOCAL_EVALUATION_DASHBOARD,
  fetchEvaluationDashboard,
} from '../../services/evaluationApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildEvaluationLatencyChart,
  buildEvaluationQualityChart,
} from '../../utils/clinicalInsightsChartModel';
import './AiEvaluationDashboard.css';

export default function AiEvaluationDashboard() {
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);
  const [message, setMessage] = useState('');
  const [dashboard, setDashboard] = useState(LOCAL_EVALUATION_DASHBOARD);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const result = await fetchEvaluationDashboard();
      if (!active) return;
      setFromApi(Boolean(result.ok));
      setMessage(result.message || '');
      setDashboard((result.data as typeof LOCAL_EVALUATION_DASHBOARD) || LOCAL_EVALUATION_DASHBOARD);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const qualityChart = useMemo(() => buildEvaluationQualityChart(dashboard.trends), [dashboard.trends]);
  const latencyChart = useMemo(() => buildEvaluationLatencyChart(dashboard.trends), [dashboard.trends]);
  const metrics = dashboard.aggregateMetrics || LOCAL_EVALUATION_DASHBOARD.aggregateMetrics;

  return (
    <main className="ai-eval-page" aria-label="AI evaluation lab">
      <header className="ai-eval-page__header">
        <div className="ai-eval-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <h1>AI Evaluation Lab</h1>
            <p>Model quality, hallucination rate, latency, retrieval precision, and workflow success benchmarks.</p>
          </div>
        </div>
        <div className="ai-eval-page__actions">
          <Link to="/memory">Memory dashboard</Link>
          <Link to="/costs">Cost analytics</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="AI evaluation source state"
        states={
          fromApi
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
        }
        details={message || (fromApi ? 'Evaluation API connected.' : 'Local evaluation dashboard fallback.')}
      />

      <div className="ai-eval-page__metrics" role="group" aria-label="AI evaluation summary metrics">
        <MetricCard
          label="Model quality"
          value={`${Math.round((metrics.modelQuality || 0) * 100)}%`}
          hint="Aggregate quality score"
          tone="good"
        />
        <MetricCard
          label="Hallucination"
          value={`${Math.round((metrics.hallucinationRate || 0) * 100)}%`}
          hint="Lower is better"
          tone={(metrics.hallucinationRate || 0) <= 0.05 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Latency"
          value={`${Math.round(metrics.latencyMs || 0)}ms`}
          hint="Average response time"
          tone="neutral"
        />
        <MetricCard label="Runs" value={String(dashboard.runs?.length || 0)} hint={loading ? 'Loading…' : 'Evaluation runs'} tone="neutral" />
      </div>

      <div className="ai-eval-page__charts">
        <VisualizationPanel title="Model quality trend" description="Quality score across demo evaluation runs." badge="Quality">
          <CategoryBarChart
            data={qualityChart}
            title="Model quality trend"
            color="var(--app-chart-2)"
            emptyMessage="Quality trend appears when evaluation runs are available."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Latency trend" description="Latency movement across demo evaluation runs." badge="Latency">
          <CategoryBarChart
            data={latencyChart}
            title="Latency trend"
            color="var(--app-chart-5)"
            emptyMessage="Latency trend appears when evaluation runs are available."
          />
        </VisualizationPanel>
      </div>

      <section className="ai-eval-page__panel" aria-label="Benchmark comparison">
        <h2>Benchmark comparison</h2>
        <div className="ai-eval-page__benchmarks">
          {(dashboard.benchmarks || []).slice(0, 6).map((benchmark: any) => (
            <article key={benchmark.id || benchmark.metricId} className="ai-eval-page__benchmark">
              <strong>{benchmark.label || benchmark.metricId}</strong>
              <span>Observed: {benchmark.observedLabel || benchmark.observed}</span>
              <span>Benchmark: {benchmark.benchmarkLabel}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}