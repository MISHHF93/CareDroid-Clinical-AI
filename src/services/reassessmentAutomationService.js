export const DEFAULT_REASSESSMENT_PATIENTS = Object.freeze([
  Object.freeze({
    patientId: 'ED-1042',
    currentLocation: 'Waiting room',
    waitDuration: 96,
    waitingThreshold: 45,
    riskScore: 82,
    riskThreshold: 70,
    lastAssessmentTime: '08:14',
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1038',
    currentLocation: 'Triage queue',
    waitDuration: 38,
    waitingThreshold: 30,
    riskScore: 91,
    riskThreshold: 75,
    lastAssessmentTime: '08:31',
    acuity: 'ESI 2',
  }),
  Object.freeze({
    patientId: 'ED-1027',
    currentLocation: 'Provider queue',
    waitDuration: 88,
    waitingThreshold: 60,
    riskScore: 64,
    riskThreshold: 70,
    lastAssessmentTime: '07:58',
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1019',
    currentLocation: 'Waiting room',
    waitDuration: 122,
    waitingThreshold: 45,
    riskScore: 76,
    riskThreshold: 70,
    lastAssessmentTime: '07:39',
    acuity: 'Sepsis review',
  }),
]);

function getTriggerReason(patient) {
  const waitingExceeded = patient.waitDuration > patient.waitingThreshold;
  const riskElevated = patient.riskScore >= patient.riskThreshold;

  if (waitingExceeded && riskElevated) return 'waiting threshold exceeded and risk score elevated';
  if (waitingExceeded) return 'waiting threshold exceeded';
  if (riskElevated) return 'risk score elevated';
  return null;
}

function getPriority(patient, triggerReason) {
  if (!triggerReason) return 'normal';
  if (patient.riskScore >= 85 || patient.waitDuration >= patient.waitingThreshold * 2) return 'critical';
  if (patient.riskScore >= patient.riskThreshold || patient.waitDuration >= patient.waitingThreshold + 20) return 'urgent';
  return 'normal';
}

function buildQueueItem(patient) {
  const triggerReason = getTriggerReason(patient);
  const priority = getPriority(patient, triggerReason);

  return Object.freeze({
    patientId: patient.patientId,
    currentLocation: patient.currentLocation,
    waitDuration: patient.waitDuration,
    riskScore: patient.riskScore,
    triggerReason,
    priority,
    acuity: patient.acuity,
    lastAssessmentTime: patient.lastAssessmentTime,
    recommendedAction:
      priority === 'critical'
        ? 'Immediate clinician reassessment review recommended.'
        : 'Review vitals, symptoms, acuity, and current queue placement.',
  });
}

export const ReassessmentAutomationService = Object.freeze({
  getReassessmentQueue(patients = DEFAULT_REASSESSMENT_PATIENTS) {
    const items = patients
      .map(buildQueueItem)
      .filter((item) => Boolean(item.triggerReason))
      .sort((a, b) => {
        const priorityRank = { critical: 3, urgent: 2, normal: 1 };
        const priorityDelta = (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
        if (priorityDelta) return priorityDelta;
        return b.waitDuration + b.riskScore - (a.waitDuration + a.riskScore);
      });

    return Object.freeze({
      id: 'ReassessmentQueue',
      label: 'ReassessmentQueue',
      count: items.length,
      criticalCount: items.filter((item) => item.priority === 'critical').length,
      urgentCount: items.filter((item) => item.priority === 'urgent').length,
      items: Object.freeze(items),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'Reassessment recommendations are operational prompts only. Clinicians remain responsible for reassessment and acuity decisions.',
    });
  },

  getRecommendations(patients = DEFAULT_REASSESSMENT_PATIENTS) {
    return Object.freeze(
      this.getReassessmentQueue(patients).items.map((item) =>
        Object.freeze({
          id: `${item.patientId}-reassessment`,
          patientId: item.patientId,
          title: `Reassess ${item.patientId}`,
          priority: item.priority,
          rationale: `${item.triggerReason}: ${item.waitDuration} min wait, risk score ${item.riskScore}.`,
          action: item.recommendedAction,
        })
      )
    );
  },

  getDashboard(patients = DEFAULT_REASSESSMENT_PATIENTS) {
    const queue = this.getReassessmentQueue(patients);
    return Object.freeze({
      queue,
      recommendations: this.getRecommendations(patients),
      metrics: Object.freeze({
        total: queue.count,
        critical: queue.criticalCount,
        urgent: queue.urgentCount,
        longestWaitMinutes: queue.items[0]?.waitDuration || 0,
      }),
    });
  },
});

export default ReassessmentAutomationService;
