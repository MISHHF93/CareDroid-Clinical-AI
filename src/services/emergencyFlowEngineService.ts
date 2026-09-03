import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import { getLiveQueueDashboard } from './queueAssignment';
import ReassessmentAutomationService from './reassessmentAutomationService';
import ReferralHub from './referralHub';

export const EMERGENCY_FLOW_ENGINE_STAGES = Object.freeze([
  Object.freeze({ id: 'arrival', label: 'Arrival', states: Object.freeze(['ems-prearrival']) }),
  Object.freeze({ id: 'triage', label: 'Triage', states: Object.freeze(['triage-queue']) }),
  Object.freeze({
    id: 'waiting',
    label: 'Waiting',
    states: Object.freeze(['waiting-room', 'provider-queue']),
  }),
  Object.freeze({
    id: 'assessment',
    label: 'Assessment',
    states: Object.freeze(['active-assessment']),
  }),
  Object.freeze({ id: 'orders', label: 'Orders', states: Object.freeze([]) }),
  Object.freeze({ id: 'results', label: 'Results', states: Object.freeze(['results-pending']) }),
  Object.freeze({
    id: 'disposition',
    label: 'Disposition',
    states: Object.freeze(['referral-pending', 'boarding', 'discharge-ready']),
  }),
]);

const STAGE_WAIT_THRESHOLDS = Object.freeze({
  arrival: 15,
  triage: 30,
  waiting: 45,
  assessment: 90,
  orders: 75,
  results: 90,
  disposition: 120,
});

const DETECTION_PRIORITY = Object.freeze({
  critical: 4,
  high: 3,
  medium: 2,
  watch: 1,
});

function patientStage(patient) {
  return (
    EMERGENCY_FLOW_ENGINE_STAGES.find((stage) =>
      (stage.states as any).includes(patient.journeyState),
    ) || null
  );
}

function severityForStage(stageId, waitDuration, riskScore) {
  const threshold = STAGE_WAIT_THRESHOLDS[stageId] || 60;
  if (riskScore >= 85 || waitDuration >= threshold * 2) return 'critical';
  if (riskScore >= 70 || waitDuration >= threshold + 30) return 'high';
  return 'medium';
}

function normalizePatientId(patientId = '') {
  return String(patientId).startsWith('ED-')
    ? String(patientId).replace(/^ED-/, 'DEMO-ED-')
    : patientId;
}

function flowDetection({
  id,
  type,
  stage,
  severity,
  title,
  patientId = null as any,
  reason,
  nextRecommendedAction,
}) {
  return Object.freeze({
    id,
    type,
    stage,
    severity,
    title,
    patientId,
    reason,
    nextRecommendedAction,
  });
}

function buildStageMetrics(patients) {
  return Object.freeze(
    EMERGENCY_FLOW_ENGINE_STAGES.map((stage) => {
      const stagePatients = patients.filter((patient) =>
        (stage.states as any).includes(patient.journeyState),
      );
      const threshold = STAGE_WAIT_THRESHOLDS[stage.id] || 60;
      const stalledCount = stagePatients.filter(
        (patient) => patient.waitDuration > threshold,
      ).length;
      const longestWaitMinutes = stagePatients.length
        ? Math.max(...stagePatients.map((patient) => patient.waitDuration))
        : 0;

      return Object.freeze({
        stage: stage.label,
        stageId: stage.id,
        patientCount: stagePatients.length,
        stalledCount,
        longestWaitMinutes,
        thresholdMinutes: threshold,
      });
    }),
  );
}

function buildPatientDetections(patients) {
  return patients
    .map((patient) => {
      const stage = patientStage(patient);
      if (!stage) return null;
      const threshold = STAGE_WAIT_THRESHOLDS[stage.id] || 60;
      if (patient.waitDuration <= threshold) return null;

      const severity = severityForStage(stage.id, patient.waitDuration, patient.riskScore);
      const type = stage.id === 'waiting' ? 'excessive wait times' : 'stalled patients';

      return flowDetection({
        id: `${patient.patientId}-${stage.id}-flow-delay`,
        type,
        stage: stage.label,
        severity,
        title: `${stage.label} flow delay`,
        patientId: patient.patientId,
        reason: `${patient.label} has been in ${stage.label.toLowerCase()} for ${patient.waitDuration} minutes; target is ${threshold} minutes.`,
        nextRecommendedAction:
          stage.id === 'waiting'
            ? 'Open the patient card, confirm reassessment status, and assign the next clinician-owned queue action.'
            : `Review ${stage.label.toLowerCase()} assigned staff, blockers, and next handoff step for this patient.`,
      });
    })
    .filter(Boolean);
}

function buildReferralDetections(referralDashboard) {
  return (referralDashboard.delays || []).map((delay) =>
    flowDetection({
      id: `${delay.referralId}-flow-delay`,
      type: 'delayed referrals',
      stage: 'Disposition',
      severity:
        delay.priority === 'critical' ? 'critical' : delay.priority === 'high' ? 'high' : 'medium',
      title: `${delay.department} referral delayed`,
      patientId: normalizePatientId(delay.patientLabel),
      reason: delay.reason,
      nextRecommendedAction:
        'Open ReferralHub, confirm specialty assigned staff, and unblock the oldest delayed referral dependency.',
    }),
  );
}

function buildReassessmentDetections(reassessmentDashboard) {
  return (reassessmentDashboard.queue?.items || []).map((item) =>
    flowDetection({
      id: `${item.patientId}-flow-reassessment`,
      type: 'delayed reassessments',
      stage: item.currentLocation || 'Waiting',
      severity: item.priority,
      title: 'Needs reassessment',
      patientId: normalizePatientId(item.patientId),
      reason: item.triggerReason,
      nextRecommendedAction: item.recommendedAction,
    }),
  );
}

function buildBoardingDetections(boardingDashboard) {
  const detections = [] as any[];

  if (
    (boardingDashboard.score || 0) >= 70 ||
    (boardingDashboard.metrics?.boardingCount || 0) >= 4
  ) {
    detections.push(
      flowDetection({
        id: 'boarding-pressure-flow',
        type: 'boarding pressure',
        stage: 'Disposition',
        severity: (boardingDashboard.score || 0) >= 85 ? 'critical' : 'high',
        title: 'Boarding pressure blocking flow',
        reason: `${boardingDashboard.metrics?.boardingCount || 0} admitted patients boarding; longest boarder ${boardingDashboard.metrics?.longestBoardingMinutes || 0} minutes.`,
        nextRecommendedAction:
          'Open Boarding Intelligence and coordinate bed-management review for longest boarders and pending beds.',
      }),
    );
  }

  return detections;
}

function buildQueueDetections(queueDashboard) {
  return (queueDashboard.bottlenecks || []).map((bottleneck) =>
    flowDetection({
      id: `${bottleneck.queueId}-flow-bottleneck`,
      type: 'overloaded queues',
      stage: bottleneck.label,
      severity: bottleneck.severity,
      title: `${bottleneck.label} bottleneck`,
      reason: bottleneck.reason,
      nextRecommendedAction: `Open ${bottleneck.label} and assign operational staff before downstream flow degrades.`,
    }),
  );
}

function buildNextRecommendedActions(detections) {
  return Object.freeze(
    [...detections]
      .sort((a, b) => {
        const severityDelta =
          (DETECTION_PRIORITY[b.severity] || 0) - (DETECTION_PRIORITY[a.severity] || 0);
        if (severityDelta) return severityDelta;
        return a.stage.localeCompare(b.stage);
      })
      .slice(0, 8)
      .map((detection, index) =>
        Object.freeze({
          id: `${detection.id}-next-action`,
          rank: index + 1,
          stage: detection.stage,
          severity: detection.severity,
          title: detection.title,
          patientId: detection.patientId,
          reason: detection.reason,
          action: detection.nextRecommendedAction,
        }),
      ),
  );
}

export const EmergencyFlowEngineService = Object.freeze({
  getFlowEngine() {
    const demoEnvironment = EmergencyDemoEnvironmentService.getDemoEnvironment();
    const queueDashboard = getLiveQueueDashboard(demoEnvironment.patients as any);
    const referralDashboard = ReferralHub.getReferralDashboard();
    const reassessmentDashboard = ReassessmentAutomationService.getDashboard();
    const boardingDashboard = BoardingIntelligenceEngine.getBoardingDashboard();
    const capacityDashboard = EmergencyCapacityIntelligenceService.getCapacityDashboard();
    const stageMetrics = buildStageMetrics(demoEnvironment.patients);
    const detections = Object.freeze([
      ...buildPatientDetections(demoEnvironment.patients),
      ...buildReferralDetections(referralDashboard),
      ...buildReassessmentDetections(reassessmentDashboard),
      ...buildBoardingDetections(boardingDashboard),
      ...buildQueueDetections(queueDashboard),
    ]);
    const nextRecommendedActions = buildNextRecommendedActions(detections);

    return Object.freeze({
      engineId: 'emergency-flow-engine',
      title: 'Emergency Flow Engine',
      route: '/workspace/emergency/flow',
      monitoredStages: EMERGENCY_FLOW_ENGINE_STAGES,
      detectionTypes: Object.freeze([
        'stalled patients',
        'delayed referrals',
        'delayed reassessments',
        'excessive wait times',
        'boarding pressure',
      ]),
      stageMetrics,
      detections,
      nextRecommendedActions,
      capacityContext: Object.freeze({
        score: capacityDashboard.score,
        riskLevel: capacityDashboard.riskLevel,
        summary: capacityDashboard.summary,
      }),
      metrics: Object.freeze({
        monitoredStages: EMERGENCY_FLOW_ENGINE_STAGES.length,
        activeDetections: detections.length,
        stalledPatients: detections.filter((detection) => detection.type === 'stalled patients')
          .length,
        delayedReferrals: detections.filter((detection) => detection.type === 'delayed referrals')
          .length,
        delayedReassessments: detections.filter(
          (detection) => detection.type === 'delayed reassessments',
        ).length,
        excessiveWaits: detections.filter((detection) => detection.type === 'excessive wait times')
          .length,
        boardingPressure: detections.filter((detection) => detection.type === 'boarding pressure')
          .length,
      }),
      safetyStatement:
        'Emergency Flow Engine actively guides ED flow with staff-facing recommended actions only. It does not move patients, assign beds, order care, or make autonomous clinical decisions.',
    });
  },
});

export const getEmergencyFlowEngine = EmergencyFlowEngineService.getFlowEngine.bind(
  EmergencyFlowEngineService,
);

export default EmergencyFlowEngineService;
