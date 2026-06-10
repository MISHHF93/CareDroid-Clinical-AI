export const REFERRAL_FLOW_STAGES = Object.freeze([
  Object.freeze({ id: 'request', label: 'Request', targetMinutes: 10 }),
  Object.freeze({ id: 'classification', label: 'Classification', targetMinutes: 15 }),
  Object.freeze({ id: 'department-queue', label: 'Department Queue', targetMinutes: 30 }),
  Object.freeze({ id: 'review', label: 'Review', targetMinutes: 45 }),
  Object.freeze({ id: 'accepted', label: 'Accepted', targetMinutes: 20 }),
  Object.freeze({ id: 'closed', label: 'Closed', targetMinutes: 15 }),
]);

export const REFERRAL_DEPARTMENTS = Object.freeze([
  'Cardiology',
  'Neurology',
  'Psychiatry',
  'Internal Medicine',
  'Surgery',
  'ICU',
  'Laboratory',
]);

export const DEFAULT_REFERRALS = Object.freeze([
  Object.freeze({
    id: 'REF-1001',
    patientLabel: 'ED-1042',
    department: 'Cardiology',
    stage: 'department-queue',
    priority: 'high',
    elapsedMinutes: 52,
    requestedBy: 'ED physician',
    reason: 'Chest pain with elevated risk context',
    handoffSummary: 'HEART review pending cardiology consult criteria and troponin timing.',
  }),
  Object.freeze({
    id: 'REF-1002',
    patientLabel: 'ED-1038',
    department: 'Neurology',
    stage: 'review',
    priority: 'critical',
    elapsedMinutes: 63,
    requestedBy: 'Triage lead',
    reason: 'Stroke symptoms with time-sensitive window review',
    handoffSummary: 'NIHSS context and imaging readiness need neurology review.',
  }),
  Object.freeze({
    id: 'REF-1003',
    patientLabel: 'ED-1029',
    department: 'Psychiatry',
    stage: 'classification',
    priority: 'medium',
    elapsedMinutes: 21,
    requestedBy: 'ED clinician',
    reason: 'Behavioral health safety evaluation',
    handoffSummary: 'Safety screen and observation context ready for psychiatry classification.',
  }),
  Object.freeze({
    id: 'REF-1004',
    patientLabel: 'ED-1021',
    department: 'Internal Medicine',
    stage: 'accepted',
    priority: 'medium',
    elapsedMinutes: 18,
    requestedBy: 'ED physician',
    reason: 'Admission review for sepsis pathway',
    handoffSummary: 'qSOFA, NEWS2, lactate workflow, and admission handoff draft prepared.',
  }),
  Object.freeze({
    id: 'REF-1005',
    patientLabel: 'ED-1017',
    department: 'Surgery',
    stage: 'department-queue',
    priority: 'high',
    elapsedMinutes: 48,
    requestedBy: 'Trauma bay',
    reason: 'Trauma pathway surgical review',
    handoffSummary: 'Shock index and trauma primary survey context waiting for surgical review.',
  }),
  Object.freeze({
    id: 'REF-1006',
    patientLabel: 'ED-1012',
    department: 'Cardiology',
    stage: 'closed',
    priority: 'low',
    elapsedMinutes: 14,
    requestedBy: 'ED clinician',
    reason: 'Follow-up cardiology clinic routing',
    handoffSummary: 'Referral closed after outpatient follow-up instructions were reviewed.',
  }),
  Object.freeze({
    id: 'REF-1007',
    patientLabel: 'ED-1009',
    department: 'ICU',
    stage: 'department-queue',
    priority: 'high',
    elapsedMinutes: 44,
    requestedBy: 'ED physician',
    reason: 'Admission review for worsening respiratory status',
    handoffSummary: 'NEWS2, oxygen requirement, and boarding pressure context ready for ICU review.',
  }),
  Object.freeze({
    id: 'REF-1008',
    patientLabel: 'ED-1031',
    department: 'Laboratory',
    stage: 'review',
    priority: 'medium',
    elapsedMinutes: 37,
    requestedBy: 'Charge nurse',
    reason: 'Delayed critical lab follow-up',
    handoffSummary: 'Results queue delay and sepsis review context need laboratory coordination.',
  }),
]);

const STAGE_BY_ID = Object.freeze(Object.fromEntries(REFERRAL_FLOW_STAGES.map((stage) => [stage.id, stage])));
const PRIORITY_WEIGHT = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

function normalizeReferral(referral = {}) {
  const stage = STAGE_BY_ID[referral.stage] ? referral.stage : 'request';
  const department = REFERRAL_DEPARTMENTS.includes(referral.department) ? referral.department : 'Internal Medicine';

  return Object.freeze({
    id: referral.id || 'REF-UNKNOWN',
    patientLabel: referral.patientLabel || 'Unknown patient',
    department,
    stage,
    stageLabel: STAGE_BY_ID[stage].label,
    priority: referral.priority || 'medium',
    elapsedMinutes: Number(referral.elapsedMinutes || 0),
    requestedBy: referral.requestedBy || 'ED team',
    reason: referral.reason || 'Referral reason pending',
    handoffSummary: referral.handoffSummary || 'Referral handoff summary pending.',
  });
}

function isDelayed(referral) {
  const targetMinutes = STAGE_BY_ID[referral.stage]?.targetMinutes || 30;
  return referral.stage !== 'closed' && referral.elapsedMinutes > targetMinutes;
}

function delayMinutes(referral) {
  const targetMinutes = STAGE_BY_ID[referral.stage]?.targetMinutes || 30;
  return Math.max(0, referral.elapsedMinutes - targetMinutes);
}

function sortReferrals(referrals) {
  return [...referrals].sort((a, b) => {
    const delayedDelta = Number(isDelayed(b)) - Number(isDelayed(a));
    if (delayedDelta) return delayedDelta;
    const priorityDelta = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    if (priorityDelta) return priorityDelta;
    return b.elapsedMinutes - a.elapsedMinutes;
  });
}

export const ReferralHub = Object.freeze({
  getFlowStages() {
    return REFERRAL_FLOW_STAGES;
  },

  getDepartments() {
    return REFERRAL_DEPARTMENTS;
  },

  getReferrals(referrals = DEFAULT_REFERRALS) {
    return Object.freeze(sortReferrals(referrals.map(normalizeReferral)));
  },

  getDepartmentQueues(referrals = DEFAULT_REFERRALS) {
    const normalized = this.getReferrals(referrals);
    return Object.freeze(
      REFERRAL_DEPARTMENTS.map((department) => {
        const departmentReferrals = normalized.filter((referral) => referral.department === department);
        const delayed = departmentReferrals.filter(isDelayed);
        const oldest = departmentReferrals[0] || null;
        return Object.freeze({
          department,
          count: departmentReferrals.length,
          delayedCount: delayed.length,
          oldestReferral: oldest,
          averageElapsedMinutes: departmentReferrals.length
            ? Math.round(departmentReferrals.reduce((sum, referral) => sum + referral.elapsedMinutes, 0) / departmentReferrals.length)
            : 0,
          referrals: Object.freeze(departmentReferrals),
        });
      })
    );
  },

  getReferralMetrics(referrals = DEFAULT_REFERRALS) {
    const normalized = this.getReferrals(referrals);
    const delayed = normalized.filter(isDelayed);
    return Object.freeze({
      total: normalized.length,
      active: normalized.filter((referral) => referral.stage !== 'closed').length,
      delayed: delayed.length,
      accepted: normalized.filter((referral) => referral.stage === 'accepted').length,
      closed: normalized.filter((referral) => referral.stage === 'closed').length,
      averageElapsedMinutes: normalized.length
        ? Math.round(normalized.reduce((sum, referral) => sum + referral.elapsedMinutes, 0) / normalized.length)
        : 0,
    });
  },

  getReferralDelays(referrals = DEFAULT_REFERRALS) {
    return Object.freeze(
      this.getReferrals(referrals)
        .filter(isDelayed)
        .map((referral) =>
          Object.freeze({
            referralId: referral.id,
            patientLabel: referral.patientLabel,
            department: referral.department,
            stage: referral.stage,
            stageLabel: referral.stageLabel,
            priority: referral.priority,
            elapsedMinutes: referral.elapsedMinutes,
            delayMinutes: delayMinutes(referral),
            reason: `${referral.department} referral has been in ${referral.stageLabel} for ${referral.elapsedMinutes} minutes.`,
          })
        )
    );
  },

  getReferralRecommendations(referrals = DEFAULT_REFERRALS) {
    return Object.freeze(
      this.getReferralDelays(referrals).map((delay) =>
        Object.freeze({
          id: `${delay.referralId}-delay-review`,
          referralId: delay.referralId,
          department: delay.department,
          title: `Review delayed ${delay.department} referral`,
          priority: delay.priority,
          rationale: delay.reason,
          action: 'Confirm owner, missing data, department queue status, and next review step.',
        })
      )
    );
  },

  getReferralDashboard(referrals = DEFAULT_REFERRALS) {
    return Object.freeze({
      flowStages: this.getFlowStages(),
      departments: this.getDepartments(),
      referrals: this.getReferrals(referrals),
      departmentQueues: this.getDepartmentQueues(referrals),
      metrics: this.getReferralMetrics(referrals),
      delays: this.getReferralDelays(referrals),
      recommendations: this.getReferralRecommendations(referrals),
      safetyStatement:
        'ReferralHub measures referral work only. Sending, accepting, closing, and external communications remain human-reviewed.',
    });
  },
});

export const getReferralDashboard = ReferralHub.getReferralDashboard.bind(ReferralHub);
export const getReferralMetrics = ReferralHub.getReferralMetrics.bind(ReferralHub);
export const getReferralDelays = ReferralHub.getReferralDelays.bind(ReferralHub);
export const getDepartmentQueues = ReferralHub.getDepartmentQueues.bind(ReferralHub);

export default ReferralHub;
