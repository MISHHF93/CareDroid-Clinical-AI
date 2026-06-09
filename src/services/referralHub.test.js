import { describe, expect, it } from 'vitest';
import ReferralHub, {
  REFERRAL_DEPARTMENTS,
  REFERRAL_FLOW_STAGES,
  getDepartmentQueues,
  getReferralDashboard,
  getReferralDelays,
  getReferralMetrics,
} from './referralHub';

describe('ReferralHub', () => {
  it('defines the canonical referral flow and departments', () => {
    expect(REFERRAL_FLOW_STAGES.map((stage) => stage.label)).toEqual([
      'Request',
      'Classification',
      'Department Queue',
      'Review',
      'Accepted',
      'Closed',
    ]);
    expect(REFERRAL_DEPARTMENTS).toEqual([
      'Cardiology',
      'Neurology',
      'Psychiatry',
      'Internal Medicine',
      'Surgery',
    ]);
  });

  it('groups referrals by department queue', () => {
    const queues = getDepartmentQueues();

    expect(queues).toHaveLength(5);
    expect(queues.find((queue) => queue.department === 'Cardiology')).toEqual(
      expect.objectContaining({
        count: 2,
        delayedCount: expect.any(Number),
        oldestReferral: expect.objectContaining({
          department: 'Cardiology',
        }),
      })
    );
  });

  it('makes referral delays measurable', () => {
    const metrics = getReferralMetrics();
    const delays = getReferralDelays();

    expect(metrics).toEqual(
      expect.objectContaining({
        total: 6,
        active: 5,
        delayed: delays.length,
        accepted: 1,
        closed: 1,
      })
    );
    expect(delays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          department: 'Neurology',
          stageLabel: 'Review',
          delayMinutes: expect.any(Number),
        }),
      ])
    );
  });

  it('returns dashboard recommendations for delayed referrals', () => {
    const dashboard = getReferralDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        flowStages: REFERRAL_FLOW_STAGES,
        departments: REFERRAL_DEPARTMENTS,
        referrals: expect.any(Array),
        departmentQueues: expect.any(Array),
        metrics: expect.objectContaining({
          delayed: expect.any(Number),
        }),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            action: expect.stringMatching(/Confirm owner/i),
          }),
        ]),
        safetyStatement: expect.stringMatching(/human-reviewed/i),
      })
    );
    expect(ReferralHub.getReferralDashboard().delays.length).toBeGreaterThan(0);
  });
});
