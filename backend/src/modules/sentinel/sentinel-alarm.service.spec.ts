import {
  buildAlarmFingerprint,
  evaluateEscalation,
  isAlarmTransitionAllowed,
} from '../../../../lib/sentinel/alarmEngine';

describe('Sentinel alarm policy (pure engine integration)', () => {
  it('fingerprints are stable for same subject/rule', () => {
    const a = buildAlarmFingerprint({
      source: 'test',
      category: 'ems',
      subjectId: 'u1',
      ruleId: 'r1',
      bucketStartMs: 1_700_000_000_000,
    });
    const b = buildAlarmFingerprint({
      source: 'test',
      category: 'ems',
      subjectId: 'u1',
      ruleId: 'r1',
      bucketStartMs: 1_700_000_000_100,
    });
    expect(a).toBe(b);
  });

  it('escalates unacked critical after deadline', () => {
    const decision = evaluateEscalation({
      status: 'open',
      severity: 'critical',
      urgency: 'immediate',
      createdAtIso: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });
    expect(decision.shouldEscalate).toBe(true);
  });

  it('blocks illegal transitions', () => {
    expect(isAlarmTransitionAllowed('resolved', 'open')).toBe(false);
    expect(isAlarmTransitionAllowed('open', 'acknowledged')).toBe(true);
  });
});
