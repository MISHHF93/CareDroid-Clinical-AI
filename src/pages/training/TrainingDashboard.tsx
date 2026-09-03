import { useEffect, useMemo, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import { CareDroidPage, DashboardGrid, MetricCard } from '../../components/ui/CareDroidPrimitives';
import { AiMaturityBadge } from '../../components/ai/AiMaturityBadge';
import {
  LOCAL_TRAINING_DASHBOARD,
  createTrainingRun,
  fetchTrainingDashboard,
} from '../../services/trainingApi';
import '../TrainingDashboard.css';

const CAPABILITY_LABELS = {
  prompt_engineering: 'Prompt engineering',
  rag: 'RAG',
  lora: 'LoRA',
  moe_routing: 'MoE routing',
};

function formatMetric(key, value) {
  if (key === 'latencyMs') return `${Math.round(value)} ms`;
  if (key === 'costUsd') return `$${Number(value || 0).toFixed(2)}`;
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function stageIndex(stageId, pipeline) {
  return Math.max(
    0,
    pipeline.findIndex((stage) => stage.id === stageId),
  );
}

function PipelineStage({ stage, index }) {
  return (
    <article className="training-stage">
      <div className="training-stage__index">{index + 1}</div>
      <div>
        <div className="training-stage__heading">
          <h2>{stage.name}</h2>
          <span data-status={stage.status}>{stage.status}</span>
        </div>
        <p>{stage.description}</p>
        <div className="training-tags">
          {(stage.supportedCapabilities || []).map((capability) => (
            <span key={capability}>{CAPABILITY_LABELS[capability] || capability}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function QualityGate({ gate }) {
  const applicable = gate.applicable !== false;
  return (
    <article
      className="training-gate"
      data-passed={applicable && gate.passed ? 'true' : 'false'}
      data-applicable={applicable ? 'true' : 'false'}
    >
      <strong>{gate.label}</strong>
      <span>{gate.observed}</span>
      <small>{applicable ? gate.threshold : 'gate not applicable to this run type'}</small>
    </article>
  );
}

export default function TrainingDashboard() {
  const [dashboard, setDashboard] = useState<any>(LOCAL_TRAINING_DASHBOARD);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      const result = await fetchTrainingDashboard();
      if (cancelled) return;
      setDashboard(result.data || LOCAL_TRAINING_DASHBOARD);
      setNotice(result.ok ? '' : `Using local training pipeline data. ${result.message}`);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = dashboard.aggregateMetrics || LOCAL_TRAINING_DASHBOARD.aggregateMetrics;
  const pipeline = dashboard.pipeline || LOCAL_TRAINING_DASHBOARD.pipeline;
  const honesty = dashboard.honesty || LOCAL_TRAINING_DASHBOARD.honesty;
  const promotionEligible = Boolean(honesty?.aggregateIsPromotionEligible);
  const latestRun = dashboard.runs?.[0];
  const activeStage = latestRun ? stageIndex(latestRun.currentStage, pipeline) : 0;
  const progress = useMemo(
    () => Math.round(((activeStage + 1) / pipeline.length) * 100),
    [activeStage, pipeline.length],
  );

  const handleCreateRun = async () => {
    setCreating(true);
    try {
      const run = await createTrainingRun({
        modelName: 'caredroid-clinical-assistant',
        datasetName: 'clinical-training-corpus',
        capabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
      });
      setDashboard((current: any) => ({
        ...current,
        runs: [run, ...(current.runs || [])],
      }));
      setNotice('Queued a new training pipeline run.');
    } catch (error: any) {
      setNotice(`Unable to queue training run. ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <CareDroidPage
      className="training-dashboard"
      eyebrow="AI operations"
      title="AI Operations Dashboard"
      titleId="training-dashboard-title"
      description="Track LLM application engineering: prompt versioning, RAG corpus quality, intent-routing metrics, safety evals, and deployment gates. Primary models are hosted (Claude via API); NLU intent routing retrains via backend npm run nlu:pipeline."
      leadingIcon={<NavIcon icon={CHROME_ICONS.brain} size={30} />}
      actions={
        <button
          type="button"
          className="cd-btn cd-btn--primary cd-btn--sm"
          onClick={handleCreateRun}
          disabled={creating}
        >
          {creating ? 'Queueing...' : 'Queue training run'}
        </button>
      }
      zones={{
        operationalSummary: (
          <>
            {notice ? (
              <p className="training-notice cdl-ai-panel cd-info-notice cd-info-notice--ai">
                {notice}
              </p>
            ) : null}
            <p
              className={`training-notice cdl-ai-panel cd-info-notice ${promotionEligible ? 'cd-info-notice--ai' : 'cd-info-notice--warning'}`}
            >
              <AiMaturityBadge kind={promotionEligible ? 'measured' : 'seed'} compact />{' '}
              {honesty?.guidance ||
                'Aggregate metrics and quality gates below reflect seed/demo data only. Do not use for model promotion decisions.'}
            </p>
          </>
        ),
        analytics: (
          <DashboardGrid
            variant="metrics"
            className="training-metrics"
            aria-label="Evaluation metrics"
          >
            <MetricCard
              label="Accuracy"
              value={formatMetric('accuracy', metrics.accuracy)}
              tone="healthy"
              helper={promotionEligible ? undefined : 'Not promotion-eligible'}
            />
            <MetricCard
              label="Hallucination rate"
              value={formatMetric('hallucinationRate', metrics.hallucinationRate)}
              tone="attention"
              helper={promotionEligible ? undefined : 'Not promotion-eligible'}
            />
            <MetricCard label="Precision" value={formatMetric('precision', metrics.precision)} />
            <MetricCard label="Latency" value={formatMetric('latencyMs', metrics.latencyMs)} />
            <MetricCard label="Cost" value={formatMetric('costUsd', metrics.costUsd)} />
          </DashboardGrid>
        ),
        activeWork: (
          <>
            <section className="training-progress-panel cdl-surface cdl-surface--ai-assistance">
              <div className="training-panel-heading">
                <div>
                  <h2>Pipeline Progress</h2>
                  <p>
                    {loading
                      ? 'Loading pipeline state...'
                      : `${progress}% through latest tracked run`}
                  </p>
                </div>
                <span>{latestRun?.status || 'ready'}</span>
              </div>
              <div className="training-progress-track" aria-hidden>
                <div style={{ width: `${progress}%` }} />
              </div>
            </section>
            <section className="training-layout">
              <div className="training-pipeline">
                {pipeline.map((stage, index) => (
                  <PipelineStage key={stage.id} stage={stage} index={index} />
                ))}
              </div>
            </section>
          </>
        ),
        supportingContext: (
          <aside className="training-side">
            <section className="training-panel cd-surface-card">
              <h2>Capabilities</h2>
              <div className="training-capabilities">
                {(dashboard.capabilities || []).map((capability) => (
                  <article key={capability.id}>
                    <strong>{capability.name}</strong>
                    <span>{capability.status}</span>
                    <p>{capability.description}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="training-panel cd-surface-card">
              <h2>Quality Gates</h2>
              <div className="training-gates">
                {(dashboard.qualityGates || []).map((gate) => (
                  <QualityGate key={gate.id} gate={gate} />
                ))}
              </div>
            </section>
          </aside>
        ),
        history: (
          <section className="training-panel cd-surface-card cdl-surface cdl-surface--inactive">
            <h2>Recent Runs</h2>
            {(dashboard.runs || []).length ? (
              <div className="training-runs">
                {dashboard.runs.slice(0, 4).map((run) => (
                  <article key={run.id}>
                    <strong>{run.modelName}</strong>
                    <span>
                      {run.datasetName} - {run.status}
                    </span>
                    <small>
                      {run.currentStage} - {formatMetric('accuracy', run.metrics.accuracy)} accuracy
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="training-empty">No training runs queued yet.</p>
            )}
          </section>
        ),
      }}
    />
  );
}
