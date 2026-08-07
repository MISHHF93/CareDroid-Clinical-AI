import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearDriftHistory, evaluateModelDrift, recordWeeklyModelPerformance } from './driftMonitoring';
import type { ModelPerformanceSnapshot } from './types';

const MODEL_ID = 'post-ed-orientation';

/**
 * Regression coverage for the 2026-08-07 fix: evaluateModelDrift() falls
 * back to modelRegistry.ts's static metrics as the baseline whenever no
 * real weekly snapshot exists yet -- but those metrics, per modelRegistry
 * .ts's own header, could not be traced to any real evaluation run. A
 * drift alert must say which kind of baseline it used, not present both
 * cases identically.
 */
describe('evaluateModelDrift baseline provenance', () => {
  beforeEach(() => clearDriftHistory(MODEL_ID));
  afterEach(() => clearDriftHistory(MODEL_ID));

  it('flags the baseline as an unvalidated registry default when no history exists', () => {
    const alert = evaluateModelDrift(MODEL_ID, {
      modelId: MODEL_ID,
      version: '1.0.0',
      metric: 'accuracy',
      value: 0.55, // registry baseline is 0.68 -- a real >5% drop
      evaluatedAt: new Date().toISOString(),
      sampleSize: 200,
      sourceState: 'demo',
    });

    expect(alert).not.toBeNull();
    expect(alert?.baselineSource).toBe('unvalidated_registry_default');
    expect(alert?.summary).toContain('unvalidated registry default');
  });

  it('flags the baseline as recorded history once a real prior snapshot exists', () => {
    const firstSnapshot: ModelPerformanceSnapshot = {
      modelId: MODEL_ID,
      version: '1.0.0',
      metric: 'accuracy',
      value: 0.7,
      evaluatedAt: new Date().toISOString(),
      sampleSize: 200,
      sourceState: 'demo',
    };
    recordWeeklyModelPerformance(firstSnapshot);

    const alert = evaluateModelDrift(MODEL_ID, {
      modelId: MODEL_ID,
      version: '1.0.0',
      metric: 'accuracy',
      value: 0.6, // real >5% drop from the recorded 0.7, not the registry's 0.68
      evaluatedAt: new Date().toISOString(),
      sampleSize: 200,
      sourceState: 'demo',
    });

    expect(alert).not.toBeNull();
    expect(alert?.baselineSource).toBe('recorded_history');
    expect(alert?.baselineMetric).toBe(0.7);
    expect(alert?.summary).not.toContain('unvalidated registry default');
  });
});
