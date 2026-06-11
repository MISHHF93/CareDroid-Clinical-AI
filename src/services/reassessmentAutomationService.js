export const DEFAULT_REASSESSMENT_PATIENTS = Object.freeze([
  Object.freeze({
    patientId: 'ED-1001',
    currentLocation: 'Waiting room',
    waitDuration: 72,
    waitingThreshold: 45,
    riskScore: 78,
    previousRiskScore: 58,
    riskThreshold: 70,
    riskChangeThreshold: 12,
    abnormalVitals: Object.freeze(['HR 124', 'SpO2 91%']),
    minutesSinceLastAssessment: 58,
    reassessmentIntervalMinutes: 30,
    lastAssessmentTime: '08:02',
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1042',
    currentLocation: 'Waiting room',
    waitDuration: 96,
    waitingThreshold: 45,
    riskScore: 82,
    previousRiskScore: 64,
    riskThreshold: 70,
    riskChangeThreshold: 12,
    abnormalVitals: Object.freeze(['BP 92/58', 'HR 118']),
    minutesSinceLastAssessment: 64,
    reassessmentIntervalMinutes: 30,
    lastAssessmentTime: '08:14',
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1038',
    currentLocation: 'Triage queue',
    waitDuration: 38,
    waitingThreshold: 30,
    riskScore: 91,
    previousRiskScore: 74,
    riskThreshold: 75,
    riskChangeThreshold: 10,
    abnormalVitals: Object.freeze(['SBP 88', 'RR 28']),
    minutesSinceLastAssessment: 31,
    reassessmentIntervalMinutes: 20,
    lastAssessmentTime: '08:31',
    acuity: 'ESI 2',
  }),
  Object.freeze({
    patientId: 'ED-1027',
    currentLocation: 'Provider queue',
    waitDuration: 88,
    waitingThreshold: 60,
    riskScore: 64,
    previousRiskScore: 60,
    riskThreshold: 70,
    riskChangeThreshold: 12,
    abnormalVitals: Object.freeze([]),
    minutesSinceLastAssessment: 41,
    reassessmentIntervalMinutes: 45,
    lastAssessmentTime: '07:58',
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1019',
    currentLocation: 'Waiting room',
    waitDuration: 122,
    waitingThreshold: 45,
    riskScore: 76,
    previousRiskScore: 54,
    riskThreshold: 70,
    riskChangeThreshold: 12,
    abnormalVitals: Object.freeze(['Temp 39.1 C', 'HR 116']),
    minutesSinceLastAssessment: 76,
    reassessmentIntervalMinutes: 30,
    lastAssessmentTime: '07:39',
    acuity: 'Sepsis review',
  }),
]);

export const REASSESSMENT_INTELLIGENCE_THRESHOLDS = Object.freeze([
  'waiting duration',
  'risk score changes',
  'abnormal vitals',
  'reassessment intervals',
]);

function getThresholdSignals(patient) {
  const waitingExceeded = patient.waitDuration > patient.waitingThreshold;
  const riskElevated = patient.riskScore >= patient.riskThreshold;
  const riskChange = patient.riskScore - (patient.previousRiskScore ?? patient.riskScore);
  const riskScoreChanged = riskChange >= (patient.riskChangeThreshold || 10);
  const abnormalVitals = patient.abnormalVitals || [];
  const reassessmentIntervalExceeded =
    patient.minutesSinceLastAssessment >= (patient.reassessmentIntervalMinutes || 30);

  return Object.freeze(
    [
      waitingExceeded
        ? `waiting duration ${patient.waitDuration} min exceeds ${patient.waitingThreshold} min threshold`
        : null,
      riskElevated ? `risk score ${patient.riskScore} meets ${patient.riskThreshold} threshold` : null,
      riskScoreChanged ? `risk score changed +${riskChange} since last assessment` : null,
      abnormalVitals.length ? `abnormal vitals: ${abnormalVitals.join(', ')}` : null,
      reassessmentIntervalExceeded
        ? `reassessment interval ${patient.minutesSinceLastAssessment} min exceeds ${patient.reassessmentIntervalMinutes} min`
        : null,
    ].filter(Boolean)
  );
}

function getTriggerReason(patient) {
  const signals = getThresholdSignals(patient);
  return signals.length ? signals.join('; ') : null;
}

function getPriority(patient, triggerReason, thresholdSignals = []) {
  if (!triggerReason) return 'normal';
  if (patient.riskScore >= 85 || patient.waitDuration >= patient.waitingThreshold * 2 || thresholdSignals.length >= 4) {
    return 'critical';
  }
  if (patient.riskScore >= patient.riskThreshold || patient.waitDuration >= patient.waitingThreshold + 20 || thresholdSignals.length >= 2) {
    return 'urgent';
  }
  return 'normal';
}

function buildAlert(item) {
  return Object.freeze({
    id: `${item.patientId}-needs-reassessment`,
    patientId: item.patientId,
    label: 'Needs Reassessment',
    severity: item.priority,
    reason: item.triggerReason,
    generatedFrom: 'Reassessment Intelligence',
    recommendedAction: item.recommendedAction,
  });
}

function buildQueueItem(patient) {
  const thresholdSignals = getThresholdSignals(patient);
  const triggerReason = getTriggerReason(patient);
  const priority = getPriority(patient, triggerReason, thresholdSignals);
  const item = {
    patientId: patient.patientId,
    currentLocation: patient.currentLocation,
    waitDuration: patient.waitDuration,
    waitingThreshold: patient.waitingThreshold,
    riskScore: patient.riskScore,
    previousRiskScore: patient.previousRiskScore ?? patient.riskScore,
    riskScoreChange: patient.riskScore - (patient.previousRiskScore ?? patient.riskScore),
    riskThreshold: patient.riskThreshold,
    abnormalVitals: Object.freeze([...(patient.abnormalVitals || [])]),
    minutesSinceLastAssessment: patient.minutesSinceLastAssessment,
    reassessmentIntervalMinutes: patient.reassessmentIntervalMinutes,
    thresholdSignals,
    triggerReason,
    priority,
    acuity: patient.acuity,
    lastAssessmentTime: patient.lastAssessmentTime,
    status: 'Needs Reassessment',
    recommendedAction:
      priority === 'critical'
        ? 'Immediate clinician reassessment review recommended.'
        : 'Review vitals, symptoms, acuity, risk score change, and current queue placement.',
  };

  return Object.freeze({
    ...item,
    alert: buildAlert(item),
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
      label: 'Reassessment Queue',
      count: items.length,
      criticalCount: items.filter((item) => item.priority === 'critical').length,
      urgentCount: items.filter((item) => item.priority === 'urgent').length,
      items: Object.freeze(items),
      alerts: Object.freeze(items.map((item) => item.alert)),
      thresholds: REASSESSMENT_INTELLIGENCE_THRESHOLDS,
      preventionGoal: 'Prevent forgotten patients by surfacing Needs Reassessment alerts on the Emergency Whiteboard.',
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
      engineId: 'reassessment-intelligence',
      title: 'Reassessment Intelligence',
      queue,
      alerts: queue.alerts,
      recommendations: this.getRecommendations(patients),
      metrics: Object.freeze({
        total: queue.count,
        critical: queue.criticalCount,
        urgent: queue.urgentCount,
        longestWaitMinutes: queue.items[0]?.waitDuration || 0,
        abnormalVitals: queue.items.filter((item) => item.abnormalVitals.length).length,
        riskScoreChanges: queue.items.filter((item) => item.riskScoreChange > 0).length,
        reassessmentIntervalsExceeded: queue.items.filter(
          (item) => item.minutesSinceLastAssessment >= item.reassessmentIntervalMinutes
        ).length,
      }),
    });
  },
});

export default ReassessmentAutomationService;
