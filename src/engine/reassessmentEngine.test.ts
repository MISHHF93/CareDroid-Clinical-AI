import { describe, expect, it } from 'vitest';
import type { Alert } from '../types/emergency';
import { hasLongWaitAlertForBucket, longWaitAlertBucket } from './reassessmentEngine';

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    severity: 'Critical',
    title: 'Wait critical',
    message: 'Exceeded',
    patientId: 'patient-1',
    createdAt: '2026-06-13T16:00:00.000Z',
    dismissed: false,
    source: 'long-wait-rescue',
    metadata: {
      longWaitPhase: 'critical',
      dedupeBucket: 3,
    },
    ...overrides,
  };
}

describe('reassessment long-wait dedupe helpers', () => {
  it('buckets wait alerts into 15-minute windows', () => {
    expect(longWaitAlertBucket(0)).toBe(0);
    expect(longWaitAlertBucket(14.9)).toBe(0);
    expect(longWaitAlertBucket(15)).toBe(1);
    expect(longWaitAlertBucket(44.9)).toBe(2);
  });

  it('matches active long-wait alerts by patient, phase, and bucket', () => {
    const alerts = [
      alert(),
      alert({ id: 'dismissed', dismissed: true }),
      alert({ id: 'other-source', source: 'capacity-engine' }),
    ];

    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'critical', 3)).toBe(true);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'critical', 4)).toBe(false);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'lwbs', 3)).toBe(false);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-2', 'critical', 3)).toBe(false);
  });
});
