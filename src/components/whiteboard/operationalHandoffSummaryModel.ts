import BoardingIntelligenceEngine from '../../services/boardingIntelligenceEngine';
import {
  countBoardingPatients,
  countHighRiskPatients,
  countReassessmentDuePatients,
  countWaitingPatients,
} from './shiftHandoffSnapshotModel';
import { summarizeEmsAwareness } from './emsAwarenessModel';
import { summarizeReferralAwareness } from './referralAwarenessModel';

export const OPERATIONAL_HANDOFF_DOMAIN_IDS = Object.freeze([
  'patient',
  'ems',
  'referral',
  'admission',
]);

function compactHeadline(parts = [] as any[]) {
  return parts.filter(Boolean).join(' · ');
}

function patientDomainMetrics({ patients = [] as any[], reassessmentDue = null }: any = {}) {
  const waiting = countWaitingPatients(patients);
  const highRisk = countHighRiskPatients(patients);
  const reassess = reassessmentDue ?? countReassessmentDuePatients(patients);

  return Object.freeze([
    Object.freeze({
      id: 'patient-waiting',
      label: 'Waiting',
      hint: 'Patients in the waiting room queue',
      value: waiting,
      tone: waiting >= 20 ? 'warning' : waiting > 0 ? 'neutral' : 'success',
      whiteboardAction: 'filter-waiting',
    }),
    Object.freeze({
      id: 'patient-high-risk',
      label: 'High risk',
      hint: 'P1/P2 or deterioration, sepsis, high-risk flags',
      value: highRisk,
      tone: highRisk ? 'critical' : 'success',
      whiteboardAction: 'filter-high-risk',
    }),
    Object.freeze({
      id: 'patient-reassess',
      label: 'Reassess',
      hint: 'Patients flagged for reassessment',
      value: reassess,
      tone: reassess ? 'warning' : 'success',
      whiteboardAction: 'open-reassessment',
    }),
  ]);
}

function emsDomainMetrics(emsSummary) {
  const metrics = [] as any[];

  if (emsSummary.inboundCount > 0 || emsSummary.soonestEtaLabel) {
    metrics.push(
      Object.freeze({
        id: 'ems-inbound',
        label: 'Inbound',
        hint: emsSummary.soonestEtaLabel
          ? `Soonest arrival: ${emsSummary.soonestEtaLabel}`
          : 'Ambulances inbound',
        value: emsSummary.inboundCount || emsSummary.soonestEtaLabel || '—',
        tone:
          emsSummary.soonestEtaMinutes !== null && emsSummary.soonestEtaMinutes <= 10
            ? 'critical'
            : emsSummary.inboundCount
              ? 'info'
              : 'success',
        whiteboardAction: 'filter-ems',
      }),
    );
  }

  if (emsSummary.awaitingHandoff > 0) {
    metrics.push(
      Object.freeze({
        id: 'ems-handoff',
        label: 'Handoff',
        hint: `${emsSummary.awaitingHandoff} unit${emsSummary.awaitingHandoff === 1 ? '' : 's'} awaiting handoff`,
        value: emsSummary.offloadMinutes > 0 ? `${emsSummary.offloadMinutes}m` : emsSummary.awaitingHandoff,
        tone: emsSummary.offloadMinutes >= 15 ? 'critical' : emsSummary.offloadMinutes >= 10 ? 'warning' : 'info',
        whiteboardAction: 'focus-ems-offload',
      }),
    );
  }

  if (emsSummary.riskCount > 0) {
    metrics.push(
      Object.freeze({
        id: 'ems-risk',
        label: 'High risk',
        hint: 'Critical severity or P1/P2 inbound EMS',
        value: emsSummary.riskCount,
        tone: 'critical',
        whiteboardAction: 'filter-ems-risk',
      }),
    );
  }

  if (!metrics.length) {
    metrics.push(
      Object.freeze({
        id: 'ems-clear',
        label: 'Inbound',
        hint: 'No active inbound EMS units',
        value: 0,
        tone: 'success',
        whiteboardAction: 'filter-ems',
      }),
    );
  }

  return Object.freeze(metrics);
}

function referralDomainMetrics(referralSummary) {
  const metrics = [
    Object.freeze({
      id: 'referral-pending',
      label: 'Pending',
      hint: 'Open referrals awaiting specialty response',
      value: referralSummary.buckets.pending,
      tone: referralSummary.buckets.pending ? 'warning' : 'success',
      whiteboardAction: 'filter-referral-pending',
    }),
    Object.freeze({
      id: 'referral-delayed',
      label: 'Delayed',
      hint: 'Referrals flagged delayed in workflow',
      value: referralSummary.buckets.delayed,
      tone: referralSummary.buckets.delayed ? 'critical' : 'success',
      whiteboardAction: 'open-referrals-delayed',
    }),
  ];

  if (referralSummary.buckets.accepted > 0) {
    metrics.push(
      Object.freeze({
        id: 'referral-accepted',
        label: 'Accepted',
        hint: 'Referrals accepted and awaiting next step',
        value: referralSummary.buckets.accepted,
        tone: 'success',
        whiteboardAction: 'open-referrals-accepted',
      }) as any,
    );
  }

  return Object.freeze(metrics);
}

function admissionDomainMetrics({ patients = [] as any[], boardingMetrics = null }: any = {}) {
  const boarders = countBoardingPatients(patients);
  const boarding = boardingMetrics ?? BoardingIntelligenceEngine.getBoardingMetrics();
  const pendingBeds = boarding.pendingBeds ?? 0;
  const longestBoarder = boarding.longestBoardingMinutes ?? 0;

  return Object.freeze([
    Object.freeze({
      id: 'admission-boarders',
      label: 'Boarders',
      hint: 'Patients awaiting inpatient bed',
      value: boarders,
      tone: boarders ? 'warning' : 'success',
      whiteboardAction: 'filter-boarding',
    }),
    Object.freeze({
      id: 'admission-pending-beds',
      label: 'Beds pending',
      hint: 'Inpatient beds pending assignment',
      value: pendingBeds,
      tone: pendingBeds >= 5 ? 'critical' : pendingBeds ? 'warning' : 'success',
      whiteboardAction: 'focus-boarding',
    }),
    ...(longestBoarder >= 180
      ? [
          Object.freeze({
            id: 'admission-longest',
            label: 'Longest',
            hint: 'Longest boarder wait in minutes',
            value: `${longestBoarder}m`,
            tone: longestBoarder >= 240 ? 'critical' : 'warning',
            whiteboardAction: 'focus-boarding',
          }),
        ]
      : []),
  ]);
}

/**
 * Four-domain operational handoff summaries — one glance per workflow lane.
 */
export function buildOperationalHandoffDomains({
  patients = ([] as any[]),
  emsArrivals = ([] as any[]),
  referrals = ([] as any[]),
  reassessmentDue = (undefined as any),
  boardingMetrics = (undefined as any),
  now = Date.now(),
}: any = {}) {
  const emsSummary = summarizeEmsAwareness(emsArrivals, now);
  const referralSummary = summarizeReferralAwareness(referrals);
  const patientMetrics = patientDomainMetrics({ patients, reassessmentDue });
  const emsMetrics = emsDomainMetrics(emsSummary);
  const referralMetrics = referralDomainMetrics(referralSummary);
  const admissionMetrics = admissionDomainMetrics({ patients, boardingMetrics });

  return Object.freeze([
    Object.freeze({
      id: 'patient',
      label: 'Patient',
      headline: compactHeadline([
        `${patientMetrics[0].value} waiting`,
        `${patientMetrics[1].value} high risk`,
        `${patientMetrics[2].value} reassess`,
      ]),
      metrics: patientMetrics,
      hasAttention: patientMetrics.some((metric) => Number(metric.value) > 0),
    }),
    Object.freeze({
      id: 'ems',
      label: 'EMS',
      headline: compactHeadline([
        emsSummary.inboundCount ? `${emsSummary.inboundCount} inbound` : null,
        emsSummary.awaitingHandoff ? `${emsSummary.awaitingHandoff} handoff` : null,
        emsSummary.riskCount ? `${emsSummary.riskCount} high risk` : null,
      ]) || 'No inbound EMS',
      metrics: emsMetrics,
      hasAttention: Boolean(emsSummary.inboundCount || emsSummary.awaitingHandoff || emsSummary.riskCount),
    }),
    Object.freeze({
      id: 'referral',
      label: 'Referral',
      headline: compactHeadline([
        referralSummary.buckets.pending ? `${referralSummary.buckets.pending} pending` : null,
        referralSummary.buckets.delayed ? `${referralSummary.buckets.delayed} delayed` : null,
        referralSummary.buckets.accepted ? `${referralSummary.buckets.accepted} accepted` : null,
      ]) || 'No active referrals',
      metrics: referralMetrics,
      hasAttention: referralSummary.total > 0,
    }),
    Object.freeze({
      id: 'admission',
      label: 'Admission',
      headline: compactHeadline([
        `${admissionMetrics[0].value} boarders`,
        admissionMetrics[1].value ? `${admissionMetrics[1].value} beds pending` : null,
      ]),
      metrics: admissionMetrics,
      hasAttention: Number(admissionMetrics[0].value) > 0 || Number(admissionMetrics[1].value) > 0,
    }),
  ]);
}

export function flattenOperationalHandoffMetrics(domains: readonly any[] = []) {
  return Object.freeze(domains.flatMap((domain) => domain.metrics ?? []));
}

export function evaluateOperationalHandoffHunting(domains: readonly any[] = []) {
  const visibleDomains = domains.filter((domain) => domain.hasAttention).length;
  const flatMetrics = flattenOperationalHandoffMetrics(domains);

  return Object.freeze({
    domainCount: domains.length,
    visibleDomains,
    metricCount: flatMetrics.length,
    passesSingleSurfaceTest: domains.length === OPERATIONAL_HANDOFF_DOMAIN_IDS.length,
    recommendation:
      domains.length === OPERATIONAL_HANDOFF_DOMAIN_IDS.length
        ? 'Operational handoff domain bar surfaces Patient, EMS, Referral, and Admission without route changes.'
        : 'Mount OperationalHandoffDomainBar at whiteboard login.',
  });
}
