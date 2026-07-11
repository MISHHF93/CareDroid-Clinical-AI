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
import { AiMaturityBadge } from '../../components/ai/AiMaturityBadge';
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
  const honesty = (dashboard as { honesty?: {
    aggregateIsSeedOnly?: boolean;
    measuredRunCount?: number;
    seedRunCount?: number;
    measuredSource?: string;
    guidance?: string;
  } }).honesty;
  const seedOnly =
    honesty?.aggregateIsSeedOnly !== false &&
    !(typeof honesty?.measuredRunCount === 'number' && honesty.measuredRunCount > 0);
  const measuredCount = honesty?.measuredRunCount ?? 0;
  const seedCount =
    honesty?.seedRunCount ??
    (Array.isArray(dashboard.runs)
      ? dashboard.runs.filter((run: { seedOnly?: boolean }) => run.seedOnly !== false).length
      : 0);

  return (
    <main className="ai-eval-page" aria-label="AI evaluation lab">
      <header className="ai-eval-page__header">
        <div className="ai-eval-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <h1>AI Evaluation Lab</h1>
            <p>
              Offline safety gates and benchmark trends. Seed demo metrics are labeled and must not
              be used for model promotion.
            </p>
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
            ? seedOnly
              ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
              : [DEMO_LIVE_STATES.LIVE]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
        }
        details={
          message ||
          (fromApi
            ? seedOnly
              ? 'API connected — aggregates may still include SEED demo runs. Prefer npm run ai:eval:gate for promotion.'
              : 'Evaluation API connected with measured offline harness runs preferred in aggregates.'
            : 'Local evaluation dashboard fallback (demo).')
        }
      />

      <section
        className={`ai-eval-page__honesty ${seedOnly ? 'ai-eval-page__honesty--seed' : 'ai-eval-page__honesty--measured'}`}
        aria-label="Evaluation honesty banner"
      >
        <div className="ai-eval-page__honesty-row">
          <AiMaturityBadge kind={seedOnly ? 'seed' : 'measured'} />
          <strong>{seedOnly ? 'Seed / demo aggregates' : 'Measured runs preferred'}</strong>
        </div>
        <p>
          {honesty?.guidance ||
            (seedOnly
              ? 'These scores may be SEED-ONLY demo defaults. Run `npm run ai:eval:gate` for the authoritative offline safety suite before promoting models, prompts, or RAG changes.'
              : `Aggregates prefer ${measuredCount} measured run(s). ${seedCount} seed run(s) may still appear in trends for history.`)}
        </p>
        {honesty?.measuredSource ? (
          <p className="ai-eval-page__honesty-source">Measured source: {honesty.measuredSource}</p>
        ) : null}
      </section>

      <div className="ai-eval-page__metrics" role="group" aria-label="AI evaluation summary metrics">
        <MetricCard
          label="Model quality"
          value={`${Math.round((metrics.modelQuality || 0) * 100)}%`}
          hint={seedOnly ? 'SEED DEMO — not for promotion' : 'Aggregate quality (measured preferred)'}
          tone={seedOnly ? 'warning' : 'good'}
        />
        <MetricCard
          label="Hallucination"
          value={`${Math.round((metrics.hallucinationRate || 0) * 100)}%`}
          hint={seedOnly ? 'SEED DEMO — lower is better' : 'Lower is better (measured preferred)'}
          tone={(metrics.hallucinationRate || 0) <= 0.05 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Latency"
          value={`${Math.round(metrics.latencyMs || 0)}ms`}
          hint={seedOnly ? 'SEED / demo latency' : 'Response time'}
          tone="neutral"
        />
        <MetricCard
          label="Runs"
          value={String(dashboard.runs?.length || 0)}
          hint={
            loading
              ? 'Loading…'
              : seedOnly
                ? `${seedCount || dashboard.runs?.length || 0} seed-leaning`
                : `${measuredCount} measured / ${seedCount} seed`
          }
          tone="neutral"
        />
      </div>

      <div className="ai-eval-page__charts">
        <VisualizationPanel
          title="Model quality trend"
          description={
            seedOnly
              ? 'Trend may include SEED demo runs — not authoritative for promotion.'
              : 'Quality score across evaluation runs (measured preferred in aggregate).'
          }
          badge={seedOnly ? 'Seed demo' : 'Quality'}
        >
          <CategoryBarChart
            data={qualityChart}
            title="Model quality trend"
            color="var(--app-chart-2)"
            emptyMessage="Quality trend appears when evaluation runs are available."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Latency trend"
          description={
            seedOnly
              ? 'Latency movement across demo evaluation runs.'
              : 'Latency movement across evaluation runs.'
          }
          badge="Latency"
        >
          <CategoryBarChart
            data={latencyChart}
            title="Latency trend"
            color="var(--app-chart-5)"
            emptyMessage="Latency trend appears when evaluation runs are available."
          />
        </VisualizationPanel>
      </div>

      <section className="ai-eval-page__panel" aria-label="Benchmark comparison">
        <h2>Benchmark comparison {seedOnly ? '(seed-aware)' : ''}</h2>
        <div className="ai-eval-page__benchmarks">
          {(dashboard.benchmarks || []).slice(0, 6).map((benchmark: any) => (
            <article key={benchmark.id || benchmark.metricId} className="ai-eval-page__benchmark">
              <strong>{benchmark.label || benchmark.metricId}</strong>
              <span>Observed: {benchmark.observedLabel || benchmark.observed}</span>
              <span>Benchmark: {benchmark.benchmarkLabel}</span>
              {seedOnly ? <span className="ai-eval-page__seed-tag">May be seed-influenced</span> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}