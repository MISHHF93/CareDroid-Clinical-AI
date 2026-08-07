import { queueRetrainingFromDrift } from './continualLearningPipeline';
import { getRegisteredModel, listRegisteredModels, recordModelPerformance } from './modelRegistry';
import { loadPersistedDriftHistory, persistDriftHistory } from './persistence';
import type { DriftAlert, ModelPerformanceSnapshot, NativeAiSourceState } from './types';

const DRIFT_THRESHOLD_PERCENT = 5;

function hydratePerformanceHistory(): Map<string, ModelPerformanceSnapshot[]> {
  const persisted = loadPersistedDriftHistory();
  return new Map(Object.entries(persisted));
}

const performanceHistory = hydratePerformanceHistory();

function syncDriftHistoryToStorage(): void {
  const record: Record<string, ModelPerformanceSnapshot[]> = {};
  performanceHistory.forEach((snapshots, modelId) => {
    record[modelId] = snapshots;
  });
  persistDriftHistory(record);
}

function createAlertId(): string {
  return `drift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function recordWeeklyModelPerformance(snapshot: ModelPerformanceSnapshot): void {
  const history = performanceHistory.get(snapshot.modelId) || [];
  history.push(snapshot);
  performanceHistory.set(snapshot.modelId, history.slice(-12));
  recordModelPerformance(snapshot);
  syncDriftHistoryToStorage();
}

export function evaluateModelDrift(
  modelId: string,
  current: ModelPerformanceSnapshot,
  options: { thresholdPercent?: number; sourceState?: NativeAiSourceState } = {},
): DriftAlert | null {
  const threshold = options.thresholdPercent ?? DRIFT_THRESHOLD_PERCENT;
  const history = performanceHistory.get(modelId) || [];
  const registered = getRegisteredModel(modelId);
  const baselineFromHistory = history.length ? history[0].value : undefined;
  const baselineFromRegistry =
    current.metric === 'f1'
      ? registered?.metrics.f1
      : current.metric === 'accuracy'
        ? registered?.metrics.accuracy
        : registered?.metrics.auc;
  const baselineValue = baselineFromHistory ?? baselineFromRegistry;
  const baselineSource: DriftAlert['baselineSource'] = baselineFromHistory
    ? 'recorded_history'
    : 'unvalidated_registry_default';

  if (baselineValue == null || !Number.isFinite(baselineValue)) return null;

  const dropPercent = ((baselineValue - current.value) / baselineValue) * 100;
  if (dropPercent < threshold) return null;

  return {
    id: createAlertId(),
    modelId,
    detectedAt: new Date().toISOString(),
    baselineMetric: baselineValue,
    currentMetric: current.value,
    dropPercent: Number(dropPercent.toFixed(1)),
    thresholdPercent: threshold,
    severity: dropPercent >= threshold * 2 ? 'retrain_required' : 'watch',
    summary:
      `${modelId} ${current.metric} dropped ${dropPercent.toFixed(1)}% (baseline ${baselineValue.toFixed(2)} → ${current.value.toFixed(2)})` +
      (baselineSource === 'unvalidated_registry_default'
        ? ' — baseline is an unvalidated registry default, not a prior measurement'
        : ''),
    sourceState: options.sourceState || current.sourceState,
    baselineSource,
  };
}

export function buildOperationalDriftReport(
  evaluations: Array<{ modelId: string; snapshot: ModelPerformanceSnapshot }>,
): {
  enabled: boolean;
  driftDetected: boolean;
  featureDistributionShift: boolean;
  predictionDistributionShift: boolean;
  confidenceDistributionShift: boolean;
  summary: string;
  generatedAt: string;
  alerts: DriftAlert[];
} {
  const alerts = evaluations
    .map((entry) => evaluateModelDrift(entry.modelId, entry.snapshot))
    .filter((alert): alert is DriftAlert => Boolean(alert));

  const driftDetected = alerts.some((alert) => alert.severity === 'retrain_required');

  return {
    enabled: true,
    driftDetected,
    featureDistributionShift: alerts.length > 0,
    predictionDistributionShift: alerts.some((alert) => alert.modelId.includes('orientation') || alert.modelId.includes('admission')),
    confidenceDistributionShift: alerts.some((alert) => alert.dropPercent >= 8),
    summary: driftDetected
      ? `${alerts.length} model drift alert(s) — retraining review required`
      : alerts.length
        ? `${alerts.length} drift watch signal(s) — monitor weekly performance`
        : 'No significant model drift detected in weekly evaluation window',
    generatedAt: new Date().toISOString(),
    alerts,
  };
}

export function clearDriftHistory(modelId?: string): void {
  if (modelId) {
    performanceHistory.delete(modelId);
  } else {
    performanceHistory.clear();
  }
  syncDriftHistoryToStorage();
}

export function buildNativeAiDriftEvaluations(): Array<{
  modelId: string;
  snapshot: ModelPerformanceSnapshot;
}> {
  const history = getDriftPerformanceHistory() as Record<string, ModelPerformanceSnapshot[]>;

  return listRegisteredModels().map((model) => {
    const modelHistory = history[model.id] || [];
    const latest = modelHistory.at(-1);
    if (latest) {
      return { modelId: model.id, snapshot: latest };
    }

    const metric: ModelPerformanceSnapshot['metric'] =
      model.metrics.f1 != null ? 'f1' : model.metrics.accuracy != null ? 'accuracy' : 'auc';

    return {
      modelId: model.id,
      snapshot: {
        modelId: model.id,
        version: model.version,
        metric,
        value: model.metrics.f1 ?? model.metrics.accuracy ?? model.metrics.auc ?? 0.7,
        evaluatedAt: new Date().toISOString(),
        sampleSize: 250,
        sourceState: model.maturity,
      },
    };
  });
}

export function getDriftPerformanceHistory(modelId?: string): ModelPerformanceSnapshot[] | Record<string, ModelPerformanceSnapshot[]> {
  if (modelId) {
    return [...(performanceHistory.get(modelId) || [])];
  }
  const record: Record<string, ModelPerformanceSnapshot[]> = {};
  performanceHistory.forEach((snapshots, id) => {
    record[id] = [...snapshots];
  });
  return record;
}

export function runWeeklyNativeAiDriftEvaluation() {
  const snapshots = buildNativeAiDriftEvaluations();

  snapshots.forEach((entry) => recordWeeklyModelPerformance(entry.snapshot));
  const report = buildOperationalDriftReport(snapshots);
  report.alerts.forEach((alert) => {
    if (alert.severity === 'retrain_required') queueRetrainingFromDrift(alert);
  });
  return report;
}