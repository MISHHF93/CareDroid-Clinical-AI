import { describe, expect, it } from 'vitest';
import {
  buildAlarmFingerprint,
  evaluateEscalation,
  evaluateSuppression,
  isAlarmTransitionAllowed,
} from './alarmEngine';

describe('sentinel alarmEngine', () => {
  it('builds stable fingerprints within the same bucket', () => {
    const a = buildAlarmFingerprint({
      source: 'geofence',
      category: 'approach',
      subjectId: 'unit-1',
      ruleId: 'enter-approach',
      bucketStartMs: 1_000_000,
    });
    const b = buildAlarmFingerprint({
      source: 'geofence',
      category: 'approach',
      subjectId: 'unit-1',
      ruleId: 'enter-approach',
      bucketStartMs: 1_000_100,
    });
    expect(a).toBe(b);
  });

  it('suppresses duplicate open fingerprints', () => {
    const decision = evaluateSuppression({
      existingOpenFingerprint: true,
      severity: 'critical',
    });
    expect(decision.suppress).toBe(true);
    expect(decision.reason).toBe('duplicate_open_fingerprint');
  });

  it('escalates critical unacked after deadline', () => {
    const createdAt = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const decision = evaluateEscalation({
      status: 'open',
      severity: 'critical',
      urgency: 'immediate',
      createdAtIso: createdAt,
    });
    expect(decision.shouldEscalate).toBe(true);
  });

  it('allows open → acknowledged transition', () => {
    expect(isAlarmTransitionAllowed('open', 'acknowledged')).toBe(true);
    expect(isAlarmTransitionAllowed('resolved', 'open')).toBe(false);
  });
});
