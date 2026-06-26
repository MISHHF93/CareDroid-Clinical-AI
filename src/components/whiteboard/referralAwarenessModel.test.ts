import { describe, expect, it } from 'vitest';
import {
  REFERRAL_WORKFLOW_ARTIFACTS,
  buildReferralAttentionStripMetrics,
  classifyReferralBucket,
  findPatientReferralAwareness,
  summarizeReferralAwareness,
} from './referralAwarenessModel';

describe('referralAwarenessModel', () => {
  it('catalogs existing referral workflow artifacts', () => {
    const ids = REFERRAL_WORKFLOW_ARTIFACTS.map((entry) => entry.id);
    expect(ids).toContain('referral-panel');
    expect(ids).toContain('patient-card');
  });

  it('classifies pending, accepted, and delayed referrals from status', () => {
    expect(classifyReferralBucket({ status: 'Sent' })).toBe('pending');
    expect(classifyReferralBucket({ status: 'Accepted' })).toBe('accepted');
    expect(classifyReferralBucket({ status: 'Delayed' })).toBe('delayed');
    expect(classifyReferralBucket({ status: 'Completed' })).toBeNull();
  });

  it('summarizes referral awareness buckets', () => {
    const summary = summarizeReferralAwareness([
      { status: 'Sent', patientId: 'p1' },
      { status: 'Accepted', patientId: 'p2' },
      { status: 'Delayed', patientId: 'p3' },
    ]);
    expect(summary.buckets).toEqual({ pending: 1, accepted: 1, delayed: 1 });
    expect(summary.total).toBe(3);
  });

  it('prioritizes delayed referral awareness on patient cards', () => {
    const awareness = findPatientReferralAwareness(
      [
        { status: 'Sent', patientId: 'p1' },
        { status: 'Delayed', patientId: 'p1' },
      ],
      'p1',
    );
    expect(awareness?.bucket).toBe('delayed');
  });

  it('builds strip metrics for active referral buckets', () => {
    const metrics = buildReferralAttentionStripMetrics([
      { status: 'Sent' },
      { status: 'Delayed' },
    ]);
    expect(metrics.map((metric) => metric.label)).toEqual(['Pending', 'Delayed']);
  });
});
