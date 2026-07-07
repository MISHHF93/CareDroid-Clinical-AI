import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../../types/emergency';
import { selectTriageOperationalStripMetrics } from './triageWorkflowModel';

describe('triageWorkflowModel', () => {
  const patients = [
    {
      id: 'p1',
      state: PatientState.Triage,
      arrivalTime: new Date(Date.now() - 30 * 60000).toISOString(),
      flags: [PatientFlag.HighRisk],
    },
  ];

  it('builds triage operational strip metrics from existing data sources', () => {
    // Pass explicit metricIds to bypass the pilot-mode default filter (which
    // trims the strip to just triage-pending/triage-breached) — this test
    // verifies the underlying metric computation, not the pilot policy.
    const metrics = selectTriageOperationalStripMetrics(patients, [], {
      metricIds: [
        'triage-pending',
        'longest-untriaged-wait',
        'triage-breach-approaching',
        'triage-breached',
        'rapid-review-flags',
        'ems-handoffs-pending',
      ],
    });
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));

    expect(byId['triage-pending'].value).toBeGreaterThanOrEqual(1);
    expect(byId['longest-untriaged-wait'].value).not.toBe('—');
    expect(byId['triage-breach-approaching']).toBeTruthy();
    expect(byId['triage-breached']).toBeTruthy();
    expect(byId['rapid-review-flags'].value).toBeGreaterThanOrEqual(0);
  });

  it('filters strip metrics to policy ids when provided', () => {
    const metrics = selectTriageOperationalStripMetrics(patients, [], {
      metricIds: ['triage-pending', 'ems-handoffs-pending'],
    });
    expect(metrics.map((metric) => metric.id)).toEqual([
      'triage-pending',
      'ems-handoffs-pending',
    ]);
  });
});
