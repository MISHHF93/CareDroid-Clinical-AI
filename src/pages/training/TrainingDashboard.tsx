import { useEffect, useMemo, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import { DashboardGrid, MetricCard, PageShell } from '../../components/ui/CareDroidPrimitives';
import {
  LOCAL_TRAINING_DASHBOARD,
  createTrainingRun,
  fetchTrainingDashboard,
} from '../../services/trainingApi';
import './TrainingDashboard.css';

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
    pipeline.findIndex((stage) => stage.id === stageId)
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
  return (
    <article className="training-gate" data-passed={gate.passed ? 'true' : 'false'}>
      <strong>{gate.label}</strong>
      <span>{gate.observed}</span>
      <small>{gate.threshold}</small>
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
  const latestRun = dashboard.runs?.[0];
  const activeStage = latestRun ? stageIndex(latestRun.currentStage, pipeline) : 0;
  const progress = useMemo(
    () => Math.round(((activeStage + 1) / pipeline.length) * 100),
    [activeStage, pipeline.length]
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
    <PageShell
      className="training-dashboard"
      eyebrow="AI model pipeline"
      title="Training Dashboard"
      titleId="training-dashboard-title"
      description="Manage data preparation, labeling, embeddings, LoRA tuning, evaluation, and deployment for prompt engineering, RAG, LoRA, and MoE routing."
      leadingIcon={<NavIcon icon={CHROME_ICONS.brain} size={30} />}
      actions={
        <button type="button" onClick={handleCreateRun} disabled={creating}>
          {creating ? 'Queueing...' : 'Queue training run'}
        </button>
      }
    >

      {notice && <p className="training-notice">{notice}</p>}

      <DashboardGrid variant="metrics" className="training-metrics" aria-label="Evaluation metrics">
        <MetricCard label="Accuracy" value={formatMetric('accuracy', metrics.accuracy)} />
        <MetricCard label="Hallucination rate" value={formatMetric('hallucinationRate', metrics.hallucinationRate)} />
        <MetricCard label="Precision" value={formatMetric('precision', metrics.precision)} />
        <MetricCard label="Latency" value={formatMetric('latencyMs', metrics.latencyMs)} />
        <MetricCard label="Cost" value={formatMetric('costUsd', metrics.costUsd)} />
      </DashboardGrid>

      <section className="training-progress-panel">
        <div className="training-panel-heading">
          <div>
            <h2>Pipeline Progress</h2>
            <p>
              {loading ? 'Loading pipeline state...' : `${progress}% through latest tracked run`}
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

        <aside className="training-side">
          <section className="training-panel">
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

          <section className="training-panel">
            <h2>Quality Gates</h2>
            <div className="training-gates">
              {(dashboard.qualityGates || []).map((gate) => (
                <QualityGate key={gate.id} gate={gate} />
              ))}
            </div>
          </section>

          <section className="training-panel">
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
        </aside>
      </section>
    </PageShell>
  );
}
