import { describe, expect, it } from 'vitest';
import type { Patient } from '../types/emergency';
import { PatientFlag, PatientState } from '../types/emergency';
import {
  buildTriageBreachVisibilitySnapshot,
  hasTriageBreachVisibilityActivity,
  selectTriageBreachVisibilityMetrics,
} from './triageBreachVisibilityModel';

describe('triageBreachVisibilityModel', () => {
  const patients = [
    {
      id: 'p1',
      state: PatientState.Triage,
      arrivalTime: new Date(Date.now() - 12 * 60000).toISOString(),
      flags: [PatientFlag.HighRisk],
    },
    {
      id: 'p2',
      state: PatientState.Registration,
      arrivalTime: new Date(Date.now() - 9 * 60000).toISOString(),
      flags: [],
    },
  ] as unknown as Patient[];

  it('builds visibility snapshot with breach counts and rapid-review flags', () => {
    const snapshot = buildTriageBreachVisibilitySnapshot(patients, {
      settings: {
        emergencySettings: { thresholds: { triageTargetMinutes: 10, triageWarningMinutes: 8 } },
      },
    });

    expect(snapshot.awaitingTriageCount).toBeGreaterThanOrEqual(2);
    expect(snapshot.approachingBreachCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.rapidReviewFlags).toBeGreaterThanOrEqual(0);
    expect(hasTriageBreachVisibilityActivity(snapshot)).toBe(true);
  });

  it('maps canonical metrics to surface-specific strip ids', () => {
    const triageMetrics = selectTriageBreachVisibilityMetrics(patients, { surface: 'triage' });
    const receptionMetrics = selectTriageBreachVisibilityMetrics(patients, {
      surface: 'reception',
    });

    expect(triageMetrics.map((metric) => metric.id)).toContain('triage-pending');
    expect(triageMetrics.map((metric) => metric.id)).toContain('triage-breach-approaching');
    expect(receptionMetrics.map((metric) => metric.id)).toContain('awaiting-triage');
    expect(receptionMetrics.map((metric) => metric.id)).toContain('triage-breach-risk');
  });
});
