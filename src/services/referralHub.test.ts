import { describe, expect, it } from 'vitest';
import ReferralHub, {
  DEMO_REFERRAL_FIXTURES,
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
      'ICU',
      'Radiology',
      'Other',
    ]);
  });

  it('groups referrals by department queue', () => {
    const queues = getDepartmentQueues();

    expect(queues).toHaveLength(8);
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
        total: 8,
        active: 7,
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
            action: expect.stringMatching(/Confirm assigned staff/i),
          }),
        ]),
        safetyStatement: expect.stringMatching(/human-reviewed/i),
      })
    );
    expect(ReferralHub.getReferralDashboard().delays.length).toBeGreaterThan(0);
  });

  // HEAL referralHub-fixture-honesty: getReferralDashboard() is called with
  // no arguments by 5 dashboard/KPI/bottleneck aggregation services
  // (emergencyOperatingSystemService.ts, emergencyKpiLayerService.ts,
  // emergencyPatientPathService.ts, emergencyFlowEngineService.ts,
  // bottleneckRegistry.ts), which always silently fell back to
  // DEMO_REFERRAL_FIXTURES (8 fabricated rows, IDs REF-1001..REF-1008) --
  // entirely unrelated to the real, persisted Referral entity/
  // ReferralService on the backend. These tests prove the dashboard now
  // honestly self-labels that fact instead of looking indistinguishable
  // from live data.
  it('labels its output as fixture/demo data when called with no real referrals', () => {
    const dashboard = getReferralDashboard();

    expect(dashboard.isFixtureData).toBe(true);
    expect(dashboard.sourceState).toBe('demo');
    expect(dashboard.sourceStateLabel).toMatch(/demo/i);
    expect(dashboard.dataSourceNote).toMatch(/fabricated demo fixture/i);
    expect(dashboard.dataSourceNote).toMatch(/not live CareDroid referrals/i);
  });

  it('labels its output as live when real referral data is actually supplied', () => {
    const realReferrals = [
      {
        id: 'ref-real-patient-42',
        patientLabel: 'ED-4200',
        department: 'Cardiology',
        stage: 'review',
        priority: 'high',
        elapsedMinutes: 12,
        requestedBy: 'ED physician',
        reason: 'Real referral',
        handoffSummary: 'Real referral handoff.',
      },
    ];

    const dashboard = getReferralDashboard(realReferrals);

    expect(dashboard.isFixtureData).toBe(false);
    expect(dashboard.sourceState).toBe('live');
    expect(dashboard.referrals.some((referral) => referral.id === 'ref-real-patient-42')).toBe(true);
    // The fabricated fixture IDs must never leak into a dashboard built from
    // real data.
    expect(dashboard.referrals.some((referral) => referral.id.startsWith('REF-100'))).toBe(false);
  });

  it('DEMO_REFERRAL_FIXTURES is unmistakably fixture data, not a real referral ID scheme', () => {
    // The real backend Referral entity/ReferralService mints ids like
    // `ref-<patientId>-<timestamp>` (lowercase, patient-derived) -- these
    // fixture rows use a visually distinct REF-100x scheme specifically so
    // the two can never be confused for one another.
    expect(DEMO_REFERRAL_FIXTURES.every((referral) => /^REF-100\d$/.test(referral.id))).toBe(true);
  });
});
