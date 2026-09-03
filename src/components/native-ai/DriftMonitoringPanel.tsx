import { useCallback, useEffect, useState } from 'react';
import {
  buildContinualLearningSummary,
  buildNativeAiDriftEvaluations,
  buildOperationalDriftReport,
  listRegisteredModels,
  listRetrainingAlerts,
} from '../../../lib/native-ai';
import { ensureDevBackendSession } from '../../services/devBackendAuth';
import { evaluateNativeAiDrift, fetchNativeAiDriftEnvelope } from '../../services/nativeAiApi';
import { runWeeklyNativeAiDriftEvaluation } from '../../services/nativeAiCore';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import './native-ai-dashboard-theme.css';
import './DriftMonitoringPanel.css';

type DriftMonitoringPanelProps = {
  className?: string;
};

type DriftReport = ReturnType<typeof buildOperationalDriftReport>;

function buildLocalDriftReport(): DriftReport {
  return buildOperationalDriftReport(buildNativeAiDriftEvaluations());
}

function extractDriftPayload(envelope: unknown): Record<string, unknown> | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const root = envelope as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  if (Array.isArray(root.alerts) || typeof root.summary === 'string') {
    return root;
  }
  return null;
}

function coerceDriftReport(envelope: unknown): DriftReport | null {
  const payload = extractDriftPayload(envelope);
  if (!payload) return null;

  const fallback = buildLocalDriftReport();
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : fallback.alerts;
  const summary = typeof payload.summary === 'string' ? payload.summary : fallback.summary;

  if (!Array.isArray(payload.alerts) && typeof payload.summary !== 'string') {
    return null;
  }

  return {
    enabled: typeof payload.enabled === 'boolean' ? payload.enabled : fallback.enabled,
    driftDetected:
      typeof payload.driftDetected === 'boolean'
        ? payload.driftDetected
        : alerts.some((alert) => alert?.severity === 'retrain_required'),
    featureDistributionShift: Boolean(payload.featureDistributionShift ?? alerts.length > 0),
    predictionDistributionShift: Boolean(
      payload.predictionDistributionShift ?? fallback.predictionDistributionShift,
    ),
    confidenceDistributionShift: Boolean(
      payload.confidenceDistributionShift ?? fallback.confidenceDistributionShift,
    ),
    summary,
    generatedAt:
      typeof payload.generatedAt === 'string' ? payload.generatedAt : fallback.generatedAt,
    alerts,
  };
}

export default function DriftMonitoringPanel({ className = '' }: DriftMonitoringPanelProps) {
  const [driftReport, setDriftReport] = useState<DriftReport>(() => buildLocalDriftReport());
  const [continualLearning, setContinualLearning] = useState(() => buildContinualLearningSummary());
  const [retrainingAlerts, setRetrainingAlerts] = useState(() => listRetrainingAlerts());
  const [evaluating, setEvaluating] = useState(false);
  const [source, setSource] = useState<'local' | 'api'>('local');

  const refreshLocal = useCallback(() => {
    setDriftReport(buildLocalDriftReport());
    setContinualLearning(buildContinualLearningSummary());
    setRetrainingAlerts(listRetrainingAlerts());
    setSource('local');
  }, []);

  const applyDriftEnvelope = useCallback((envelope: unknown, sourceLabel: 'api' | 'local') => {
    const report = coerceDriftReport(envelope);
    if (!report) return false;

    const payload = extractDriftPayload(envelope);
    setDriftReport(report);
    setContinualLearning(
      payload?.continualLearning && typeof payload.continualLearning === 'object'
        ? { ...buildContinualLearningSummary(), ...(payload.continualLearning as object) }
        : buildContinualLearningSummary(),
    );
    setRetrainingAlerts(
      Array.isArray(payload?.retrainingAlerts) ? payload.retrainingAlerts : listRetrainingAlerts(),
    );
    setSource(sourceLabel);
    return true;
  }, []);

  const loadFromApi = useCallback(async () => {
    try {
      await ensureDevBackendSession();
      const envelope = await fetchNativeAiDriftEnvelope();
      if (!applyDriftEnvelope(envelope, 'api')) {
        refreshLocal();
      }
    } catch {
      refreshLocal();
    }
  }, [applyDriftEnvelope, refreshLocal]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result = await evaluateNativeAiDrift();
      if (!applyDriftEnvelope(result, 'api')) {
        refreshLocal();
      }
    } catch {
      const report = runWeeklyNativeAiDriftEvaluation();
      setDriftReport(report);
      setContinualLearning(buildContinualLearningSummary());
      setRetrainingAlerts(listRetrainingAlerts());
      setSource('local');
    } finally {
      setEvaluating(false);
    }
  };

  const models = listRegisteredModels();
  const driftAlerts = driftReport.alerts ?? [];

  return (
    <section
      className={['drift-monitoring-panel', className].filter(Boolean).join(' ')}
      aria-label="Model drift monitoring"
    >
      <header className="drift-monitoring-panel__header">
        <div>
          <p className="drift-monitoring-panel__eyebrow">Continual learning</p>
          <h3>Model Drift Monitoring</h3>
          <p className="drift-monitoring-panel__subtitle">
            Weekly F1/accuracy evaluation with &gt;5% drop triggering retraining review. Source:{' '}
            {source}.
          </p>
        </div>
        <button type="button" onClick={handleEvaluate} disabled={evaluating}>
          {evaluating ? 'Evaluating…' : 'Run weekly evaluation'}
        </button>
      </header>

      <div
        className={[
          'drift-monitoring-panel__summary',
          driftReport.driftDetected ? 'drift-monitoring-panel__summary--alert' : '',
        ].join(' ')}
        role="status"
      >
        {driftReport.summary}
      </div>

      <div className="drift-monitoring-panel__grid">
        <div className="drift-monitoring-panel__card">
          <h4>Model registry</h4>
          <ul>
            {models.map((model) => (
              <li key={model.id}>
                <strong>{model.label}</strong>
                <span>
                  v{model.version} · {model.algorithm} · {model.maturity}
                </span>
                <small>
                  F1 {model.metrics.f1 ?? '—'} · Acc {model.metrics.accuracy ?? '—'}
                  {model.rollbackVersion ? ` · Rollback v${model.rollbackVersion}` : ''}
                </small>
                <AiTruthLabel
                  {...fromNativeAiSourceState(model.maturity, {
                    sourceContext: `${model.algorithm === 'rules' ? 'Rule-based scoring' : model.algorithm} — registry metrics not traced to any evaluation run in this repo`,
                    reviewRequired: model.requiresHumanReview,
                  })}
                  compact
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="drift-monitoring-panel__card">
          <h4>Drift alerts ({driftAlerts.length})</h4>
          {driftAlerts.length ? (
            <ul>
              {driftAlerts.map((alert) => (
                <li key={alert.id} className={`drift-monitoring-panel__alert--${alert.severity}`}>
                  <strong>{alert.modelId}</strong>
                  <span>{alert.summary}</span>
                  <small>
                    {alert.severity} · {alert.sourceState}
                  </small>
                  <AiTruthLabel
                    {...fromNativeAiSourceState(alert.sourceState, {
                      sourceContext:
                        alert.baselineSource === 'unvalidated_registry_default'
                          ? `Drift evaluation for ${alert.modelId} — baseline is modelRegistry.ts's unvalidated default, not a prior measurement`
                          : `Drift evaluation for ${alert.modelId} — baseline is a recorded prior weekly snapshot`,
                      reviewRequired: true,
                    })}
                    compact
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>No drift alerts in current evaluation window.</p>
          )}
        </div>

        <div className="drift-monitoring-panel__card">
          <h4>Retraining queue ({continualLearning.pendingRetraining})</h4>
          <p className="drift-monitoring-panel__policy">{continualLearning.policy}</p>
          {retrainingAlerts.length ? (
            <ul>
              {retrainingAlerts.slice(0, 5).map((alert) => (
                <li key={alert.id}>
                  <strong>{alert.modelId}</strong>
                  <span>{alert.reason}</span>
                  <small>
                    {alert.status} · proposed v{alert.proposedVersion} · rollback v
                    {alert.rollbackVersion}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending retraining alerts.</p>
          )}
        </div>
      </div>
    </section>
  );
}
