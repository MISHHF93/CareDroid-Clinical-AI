import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildProviderWaitVisibilitySnapshot,
  hasProviderWaitVisibilityActivity,
  selectProviderWaitVisibilityMetrics,
} from './providerWaitVisibilityModel';

describe('providerWaitVisibilityModel', () => {
  const patients = [
    {
      id: 'p1',
      state: PatientState.Waiting,
      priority: Priority.P3,
      triageTime: new Date(Date.now() - 55 * 60000).toISOString(),
    },
    {
      id: 'p2',
      state: PatientState.Waiting,
      priority: Priority.P2,
      triageTime: new Date(Date.now() - 35 * 60000).toISOString(),
    },
  ] as unknown as Patient[];

  it('builds visibility snapshot with wait counts and average', () => {
    const snapshot = buildProviderWaitVisibilitySnapshot(patients, {
      settings: { emergencySettings: { thresholds: { providerTargetMinutes: 30 } } },
    });

    expect(snapshot.awaitingClinicianCount).toBe(2);
    expect(snapshot.approachingThresholdCount + snapshot.breachedCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.averageProviderWaitMinutes).toBeGreaterThan(0);
    expect(hasProviderWaitVisibilityActivity(snapshot)).toBe(true);
  });

  it('maps canonical metrics to surface-specific strip ids', () => {
    const physicianMetrics = selectProviderWaitVisibilityMetrics(patients, { surface: 'physician' });
    const commandMetrics = selectProviderWaitVisibilityMetrics(patients, { surface: 'commandCenter' });

    expect(physicianMetrics.map((metric) => metric.id)).toContain('provider-awaiting');
    expect(physicianMetrics.map((metric) => metric.id)).toContain('provider-approaching');
    expect(commandMetrics.map((metric) => metric.id)).toContain('provider-approaching-breach');
  });
});
