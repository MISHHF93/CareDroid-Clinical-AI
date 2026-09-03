import QueueIntelligenceService from './queueIntelligenceService';
import ReassessmentAutomationService from './reassessmentAutomationService';

export const WAITING_ROOM_RISK_STATES = Object.freeze({
  NORMAL: 'Normal',
  BUSY: 'Busy',
  CRITICAL: 'Critical',
});

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRiskState(score) {
  if (score >= 75) return WAITING_ROOM_RISK_STATES.CRITICAL;
  if (score >= 45) return WAITING_ROOM_RISK_STATES.BUSY;
  return WAITING_ROOM_RISK_STATES.NORMAL;
}

export const WaitingRoomIntelligenceService = Object.freeze({
  getWaitingRoomDashboard(queueState: any = undefined) {
    const queueDashboard = QueueIntelligenceService.getQueueDashboard(queueState);
    const waitingRoom: any =
      queueDashboard.queues.find((queue) => queue.id === 'waiting-room') || {};
    const reassessment = ReassessmentAutomationService.getDashboard();
    const waitPressure =
      Math.max(0, (waitingRoom.waitTime || 0) - (waitingRoom.targetWaitMinutes || 20)) * 1.6;
    const countPressure = (waitingRoom.count || 0) * 1.7;
    const oldestPressure = Math.max(0, (waitingRoom.oldestPatient?.waitMinutes || 0) - 45) * 0.7;
    const reassessmentPressure =
      reassessment.metrics.total * 8 + reassessment.metrics.critical * 10;
    const healthScore = clampScore(
      countPressure + waitPressure + oldestPressure + reassessmentPressure,
    );
    const riskState = getRiskState(healthScore);

    return Object.freeze({
      id: 'waiting-room-intelligence',
      label: 'Waiting Room Intelligence',
      healthScore,
      riskState,
      queue: waitingRoom,
      metrics: Object.freeze({
        patientCount: waitingRoom.count || 0,
        waitDuration: waitingRoom.waitTime || 0,
        oldestWaitMinutes: waitingRoom.oldestPatient?.waitMinutes || 0,
        reassessmentNeed: reassessment.metrics.total,
        criticalReassessmentNeed: reassessment.metrics.critical,
        abnormalVitals: reassessment.metrics.abnormalVitals,
        riskScoreChanges: reassessment.metrics.riskScoreChanges,
        reassessmentIntervalsExceeded: reassessment.metrics.reassessmentIntervalsExceeded,
      }),
      reassessmentIntelligence: Object.freeze({
        engineId: reassessment.engineId,
        thresholds: reassessment.queue.thresholds,
        alerts: reassessment.alerts,
        preventionGoal: reassessment.queue.preventionGoal,
      }),
      reassessmentQueue: reassessment.queue,
      recommendations: Object.freeze([
        ...reassessment.recommendations.slice(0, 3),
        Object.freeze({
          id: 'waiting-room-pressure-review',
          title: `Waiting room is ${riskState}`,
          priority: riskState === WAITING_ROOM_RISK_STATES.CRITICAL ? 'critical' : 'urgent',
          rationale: `${waitingRoom.count || 0} patients waiting, oldest wait ${
            waitingRoom.oldestPatient?.waitMinutes || 0
          } minutes, ${reassessment.metrics.total} reassessment recommendations.`,
          action:
            'Review waiting-room patient count, stale reassessments, triage pace, and provider queue capacity.',
        }),
      ]),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'Waiting Room Intelligence makes queue pressure visible. It does not replace clinician reassessment or triage judgment.',
    });
  },
});

export default WaitingRoomIntelligenceService;
