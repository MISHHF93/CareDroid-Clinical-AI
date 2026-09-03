import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import EmsPreArrivalPipelineService from './emsPreArrivalPipelineService';
import EmergencyFlowEngineService from './emergencyFlowEngineService';
import QueueIntelligenceService from './queueIntelligenceService';
import ReassessmentAutomationService from './reassessmentAutomationService';

export const EMERGENCY_WHITEBOARD_COLUMNS = Object.freeze([
  Object.freeze({ id: 'ems-incoming', label: 'EMS Incoming', sourceStates: ['ems-prearrival'] }),
  Object.freeze({ id: 'waiting', label: 'Waiting', sourceStates: ['waiting-room'] }),
  Object.freeze({ id: 'triage', label: 'Triage', sourceStates: ['triage-queue'] }),
  Object.freeze({
    id: 'assessment',
    label: 'In Assessment',
    sourceStates: ['active-assessment', 'provider-queue'],
  }),
  Object.freeze({
    id: 'orders-pending',
    label: 'Orders Pending',
    sourceStates: ['orders-pending'],
  }),
  Object.freeze({
    id: 'results-pending',
    label: 'Results Pending',
    sourceStates: ['results-pending'],
  }),
  Object.freeze({
    id: 'reassessment-due',
    label: 'Reassessment Due',
    sourceStates: ['reassessment'],
  }),
  Object.freeze({
    id: 'disposition',
    label: 'Disposition',
    sourceStates: ['referral-pending', 'boarding'],
  }),
  Object.freeze({
    id: 'discharge-ready',
    label: 'Discharge Ready',
    sourceStates: ['discharge-ready'],
  }),
]);

const COLUMN_BY_STATE = Object.freeze(
  Object.fromEntries(
    EMERGENCY_WHITEBOARD_COLUMNS.flatMap((column) =>
      column.sourceStates.map((state) => [state, column.id]),
    ),
  ),
);

function patientAge(patientId = '') {
  const numeric = Number(String(patientId).replace(/\D/g, '').slice(-2));
  return Number.isFinite(numeric) ? 22 + (numeric % 64) : 45;
}

function whiteboardPatientId(patientId = '') {
  return String(patientId).startsWith('ED-')
    ? String(patientId).replace(/^ED-/, 'DEMO-ED-')
    : patientId;
}

function assignedClinician(index = 0) {
  return ['Charge RN', 'Triage RN', 'ED clinician', 'APP', 'Flow lead'][index % 5];
}

function buildReassessmentLookup(reassessmentQueue) {
  return new Map(
    (reassessmentQueue.items || []).flatMap((item) => [
      [item.patientId, item],
      [whiteboardPatientId(item.patientId), item],
    ]),
  );
}

function mapPatientToCard(patient, index, reassessmentByPatientId = new Map()) {
  const riskLevel =
    patient.riskScore >= 85
      ? 'critical'
      : patient.riskScore >= 70
        ? 'high'
        : patient.riskScore >= 50
          ? 'medium'
          : 'low';
  const reassessmentAlert = reassessmentByPatientId.get(patient.patientId);
  const currentColumn =
    reassessmentAlert || patient.reassessmentNeed
      ? 'reassessment-due'
      : COLUMN_BY_STATE[patient.journeyState] || (index % 5 === 0 ? 'orders-pending' : 'waiting');
  const alerts = [
    patient.waitDuration > 60 ? 'Waiting over target' : null,
    patient.reassessmentNeed ? 'Reassessment due' : null,
    reassessmentAlert ? 'Needs Reassessment' : null,
    riskLevel === 'critical' ? 'Critical review needed' : null,
    patient.journeyState === 'boarding' ? 'Boarding pressure' : null,
    patient.journeyState === 'referral-pending' ? 'Referral delay watch' : null,
  ].filter(Boolean);

  return Object.freeze({
    patientId: patient.patientId,
    displayName: patient.label,
    age: patientAge(patient.patientId),
    complaint: patient.complaint,
    acuity: patient.acuity || 'ESI pending',
    riskLevel,
    currentState: patient.journeyLabel,
    currentColumn,
    waitingTime: patient.waitDuration,
    alerts: Object.freeze(alerts),
    assignedQueue: patient.journeyLabel,
    assignedClinician: assignedClinician(index),
    nextAction: reassessmentAlert
      ? reassessmentAlert.recommendedAction
      : patient.reassessmentNeed
        ? 'Review reassessment recommendation'
        : currentColumn === 'disposition'
          ? 'Review disposition blocker'
          : 'Continue ED workflow review',
    needsReassessment: Boolean(reassessmentAlert),
    reassessmentAlert: reassessmentAlert?.alert || null,
    reassessmentSignals: Object.freeze(reassessmentAlert?.thresholdSignals || []),
    sourceState: 'Demo data · No live integration',
  });
}

function mapIncomingEmsToCard(patient) {
  const alerts = [
    `${patient.handoffStatus} EMS handoff`,
    patient.riskLevel === 'critical' ? 'Critical review needed' : null,
    patient.notificationStatus !== 'sent' ? 'ED notification pending' : null,
  ].filter(Boolean);

  return Object.freeze({
    patientId: patient.id,
    displayName: patient.patientLabel,
    age: 'pending',
    complaint: patient.complaint,
    acuity: patient.riskLevel === 'critical' ? 'ESI 1-2 review' : 'ESI pending',
    riskLevel: patient.riskLevel,
    currentState: patient.handoffStatus,
    currentColumn: 'ems-incoming',
    waitingTime: patient.etaMinutes,
    etaMinutes: patient.etaMinutes,
    alerts: Object.freeze(alerts),
    assignedQueue: 'EMS Pre-Arrival Queue',
    assignedClinician: 'EMS coordinator',
    nextAction: `Review ED Handoff Summary from ${patient.unit}`,
    sourceState: 'EMS Handoff Pipeline',
    emsUnit: patient.unit,
    handoffStatus: patient.handoffStatus,
    vitalsSummary: patient.vitalsSummary,
    riskIndicators: patient.riskIndicators,
    edHandoffSummary: patient.edHandoffSummary,
  });
}

export const EmergencyWhiteboardService = Object.freeze({
  getWhiteboard() {
    const demoEnvironment = EmergencyDemoEnvironmentService.getDemoEnvironment();
    const emsPreArrival = EmsPreArrivalPipelineService.getPreArrivalDashboard();
    const reassessmentIntelligence = ReassessmentAutomationService.getDashboard();
    const reassessmentByPatientId = buildReassessmentLookup(reassessmentIntelligence.queue);
    const capacityEngine = EmergencyCapacityIntelligenceService.getCapacityDashboard();
    const flowEngine = EmergencyFlowEngineService.getFlowEngine();
    const queueDashboard = QueueIntelligenceService.getQueueDashboard();
    const demoCards = demoEnvironment.patients
      .slice(0, 48)
      .map((patient, index) => mapPatientToCard(patient, index, reassessmentByPatientId));
    const emsCards = emsPreArrival.queue.incomingPatients
      .filter((patient) => patient.handoffStatus !== 'Arrived')
      .map(mapIncomingEmsToCard);
    const cards = Object.freeze([...emsCards, ...demoCards]);
    const columns = Object.freeze(
      EMERGENCY_WHITEBOARD_COLUMNS.map((column) => {
        const columnCards = cards.filter((card) => card.currentColumn === column.id);
        return Object.freeze({
          ...column,
          cards: Object.freeze(columnCards),
          count: columnCards.length,
          highRiskCount: columnCards.filter((card) => ['high', 'critical'].includes(card.riskLevel))
            .length,
          oldestWaitMinutes: Math.max(0, ...columnCards.map((card) => card.waitingTime)),
        });
      }),
    );
    const bottleneckColumn = [...columns].sort(
      (a, b) => b.oldestWaitMinutes - a.oldestWaitMinutes,
    )[0];
    const referralCards = cards.filter((card) => card.alerts.includes('Referral delay watch'));
    const boardingCards = cards.filter((card) => card.alerts.includes('Boarding pressure'));

    return Object.freeze({
      route: '/workspace/emergency/whiteboard',
      title: 'Emergency Whiteboard',
      primaryWorkspaceRoute: '/workspace/emergency',
      primarySurface: true,
      sourceState: demoEnvironment.sourceState,
      emsHandoffPipeline: Object.freeze({
        pipelineId: emsPreArrival.pipelineId,
        route: '/workspace/emergency/pre-arrival',
        statuses: emsPreArrival.statuses,
        inputSchema: emsPreArrival.inputSchema,
        output: emsPreArrival.output,
        edHandoffSummaries: emsPreArrival.edHandoffSummaries,
      }),
      reassessmentIntelligence: Object.freeze({
        engineId: reassessmentIntelligence.engineId,
        route: '/workspace/emergency/waiting-room',
        queue: reassessmentIntelligence.queue,
        alerts: reassessmentIntelligence.alerts,
        thresholds: reassessmentIntelligence.queue.thresholds,
        preventionGoal: reassessmentIntelligence.queue.preventionGoal,
      }),
      capacityEngine: Object.freeze({
        engineId: capacityEngine.engineId,
        route: '/workspace/emergency/capacity',
        inputSchema: capacityEngine.inputSchema,
        output: capacityEngine.output,
        score: capacityEngine.score,
        riskLevel: capacityEngine.riskLevel,
        occupancyPercent: capacityEngine.occupancyPercent,
        state: capacityEngine.state,
        recommendations: capacityEngine.recommendations,
        recommendationCategories: capacityEngine.recommendationCategories,
        summary: capacityEngine.summary,
      }),
      flowEngine: Object.freeze({
        engineId: flowEngine.engineId,
        route: flowEngine.route,
        monitoredStages: flowEngine.monitoredStages,
        detectionTypes: flowEngine.detectionTypes,
        metrics: flowEngine.metrics,
        nextRecommendedActions: flowEngine.nextRecommendedActions,
        safetyStatement: flowEngine.safetyStatement,
      }),
      columns,
      cards,
      filters: Object.freeze([
        'Acuity',
        'Chief complaint',
        'Waiting over target',
        'Needs Reassessment',
        'Reassessment due',
        'EMS arrivals',
        'Alerts only',
        'Referrals',
        'Boarding',
        'Capacity',
      ]),
      searchFields: Object.freeze([
        'patient ID',
        'chief complaint',
        'queue',
        'alert',
        'reassessment',
        'referral',
        'EMS arrival',
        'boarding',
        'capacity',
      ]),
      operatingAreas: Object.freeze([
        'patients',
        'queues',
        'alerts',
        'referrals',
        'EMS arrivals',
        'boarding',
        'capacity',
      ]),
      summary: Object.freeze({
        patientsToday: queueDashboard.metrics.patientsToday,
        totalActivePatients: cards.length,
        waitingPatients: queueDashboard.metrics.patientsWaiting,
        currentAverageWait: queueDashboard.metrics.averageWaitTime,
        highRiskPatients: cards.filter((card) => ['high', 'critical'].includes(card.riskLevel))
          .length,
        reassessmentDue: cards.filter((card) => card.alerts.includes('Reassessment due')).length,
        needsReassessment: queueDashboard.metrics.patientsNeedingReassessment,
        reassessmentAlerts: reassessmentIntelligence.alerts.length,
        longestWaitMinutes: queueDashboard.metrics.longestWait,
        bottleneckColumn:
          queueDashboard.metrics.bottleneckQueue || bottleneckColumn?.label || 'Waiting',
        activeAlerts: cards.reduce((sum, card) => sum + card.alerts.length, 0),
        queueBottlenecks: queueDashboard.metrics.bottleneckCount,
        referralDelays: referralCards.length,
        emsArrivals: emsCards.length,
        emsHandoffSummaries: emsPreArrival.edHandoffSummaries.length,
        boardingPatients: boardingCards.length,
        capacityScore: capacityEngine.score,
        capacityRiskLevel: capacityEngine.riskLevel,
        capacityOccupancy: capacityEngine.occupancyPercent,
        capacityRecommendations: capacityEngine.recommendations.length,
        capacityPressure: capacityEngine.score,
        capacityLabel: capacityEngine.riskLevel,
        flowDetections: flowEngine.metrics.activeDetections,
        nextRecommendedActions: flowEngine.nextRecommendedActions.length,
      }),
      safetyStatement:
        'Whiteboard data is demo/local flow tracking. It is the primary Emergency workspace surface and supports human review only; it does not move patients or change clinical state.',
    });
  },
});

export const getEmergencyWhiteboard = EmergencyWhiteboardService.getWhiteboard.bind(
  EmergencyWhiteboardService,
);

export default EmergencyWhiteboardService;
