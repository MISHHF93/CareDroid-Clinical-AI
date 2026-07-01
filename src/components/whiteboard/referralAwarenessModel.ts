/** Existing referral surfaces in the product. */
export const REFERRAL_WORKFLOW_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'referral-panel',
    label: 'Referral panel queues',
    surfaces: ['ReferralPanel', 'App'],
    mechanism: 'emergencyReferrals route',
  }),
  Object.freeze({
    id: 'patient-card',
    label: 'Patient card referral signals',
    surfaces: ['PatientCard'],
    mechanism: 'store.referrals by patientId',
  }),
  Object.freeze({
    id: 'whiteboard-queue',
    label: 'Referral queue filter',
    surfaces: ['emergency/index', 'queueAssignment'],
    mechanism: 'referral queue filter',
  }),
  Object.freeze({
    id: 'operational-metric',
    label: 'Referrals pending metric',
    surfaces: ['emergencyStore', 'Header'],
    mechanism: 'referralsPending operational summary',
  }),
  Object.freeze({
    id: 'referral-hub',
    label: 'ReferralHub delay analytics',
    surfaces: ['referralHub.js'],
    mechanism: 'stage elapsed thresholds',
  }),
]);

export const CLOSED_REFERRAL_STATUSES = Object.freeze([
  'Closed',
  'Completed',
  'Declined',
  'PatientDeparted',
]);

const REFERRAL_BUCKET_LABELS = Object.freeze({
  pending: 'Pending',
  accepted: 'Accepted',
  delayed: 'Delayed',
});

export function isClosedReferralStatus(status) {
  return CLOSED_REFERRAL_STATUSES.includes(String(status || '').trim());
}

export function classifyReferralBucket(referral) {
  if (!referral) return null;
  if (referral.status === 'Delayed') return 'delayed';
  if (referral.status === 'Accepted') return 'accepted';
  if (!isClosedReferralStatus(referral.status)) return 'pending';
  return null;
}

export function summarizeReferralAwareness(referrals = ([] as any[])) {
  const buckets = { pending: 0, accepted: 0, delayed: 0 };
  const grouped = { pending: ([] as any[]), accepted: ([] as any[]), delayed: ([] as any[]) };

  referrals.forEach((referral) => {
    const bucket = classifyReferralBucket(referral);
    if (!bucket) return;
    buckets[bucket] += 1;
    grouped[bucket].push(referral);
  });

  return Object.freeze({
    buckets: Object.freeze({ ...buckets }),
    grouped: Object.freeze({
      pending: Object.freeze([...grouped.pending]),
      accepted: Object.freeze([...grouped.accepted]),
      delayed: Object.freeze([...grouped.delayed]),
    }),
    total: buckets.pending + buckets.accepted + buckets.delayed,
  });
}

export function findPatientReferralAwareness(referrals = [] as any[], patientId) {
  const patientReferrals = referrals.filter((referral) => referral.patientId === patientId);
  const priority = ['delayed', 'pending', 'accepted'];

  for (const bucket of priority) {
    const referral = patientReferrals.find((entry) => classifyReferralBucket(entry) === bucket);
    if (referral) {
      return Object.freeze({
        bucket,
        label: REFERRAL_BUCKET_LABELS[bucket],
        referral,
      });
    }
  }

  return null;
}

export function shouldShowReferralAttentionStrip({ displayMode = false, total = 0 }: any = {}) {
  return !displayMode && total > 0;
}

export function buildReferralAttentionStripMetrics(referrals = [] as any[]) {
  const summary = summarizeReferralAwareness(referrals);
  if (!summary.total) return [];

  const metrics = [
    Object.freeze({
      id: 'referral-pending',
      label: 'Pending',
      hint: 'Open referrals awaiting specialty response',
      value: summary.buckets.pending,
      surface: 'referrals',
      tone: summary.buckets.pending ? 'warning' : 'info',
      whiteboardAction: 'filter-referral-pending',
    }),
    Object.freeze({
      id: 'referral-accepted',
      label: 'Accepted',
      hint: 'Referrals accepted and awaiting next workflow step',
      value: summary.buckets.accepted,
      surface: 'referrals',
      tone: 'success',
      whiteboardAction: 'open-referrals-accepted',
    }),
    Object.freeze({
      id: 'referral-delayed',
      label: 'Delayed',
      hint: 'Referrals flagged delayed in CareDroid workflow state',
      value: summary.buckets.delayed,
      surface: 'referrals',
      tone: summary.buckets.delayed ? 'critical' : 'info',
      whiteboardAction: 'open-referrals-delayed',
    }),
  ];

  return metrics.filter((metric) => metric.value > 0);
}
