import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import EmsOffloadCommandCenterService from './emsOffloadCommandCenterService';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import EmergencyResourceBoardService from './emergencyResourceBoardService';
import QueueIntelligenceService from './queueIntelligenceService';

function buildEscalation({
  id,
  trigger,
  severity,
  affectedWorkflow,
  reason,
  recommendedAction,
  supportingSignals,
}) {
  return Object.freeze({
    id,
    trigger,
    severity,
    affectedWorkflow,
    reason,
    recommendedAction,
    supportingSignals: Object.freeze(supportingSignals),
  });
}

export const EmergencyEscalationEngineService = Object.freeze({
  getEscalationDashboard() {
    const capacity = EmergencyCapacityIntelligenceService.getCapacityDashboard();
    const boarding = BoardingIntelligenceEngine.getBoardingDashboard();
    const ems = EmsOffloadCommandCenterService.getDashboard();
    const queue = QueueIntelligenceService.getQueueDashboard(undefined);
    const resources = EmergencyResourceBoardService.getResourceBoard();
    const highRiskQueueGrowth = queue.bottlenecks.filter((bottleneck) =>
      ['critical', 'high'].includes(bottleneck.severity),
    ).length;
    const criticalDeviceOutage = resources.shortages.filter((resource) =>
      ['monitors', 'telemetry-units', 'infusion-pumps'].includes(resource.id),
    );

    const escalations = [
      capacity.score >= 75
        ? buildEscalation({
            id: 'capacity-overload',
            trigger: 'Capacity overload',
            severity: capacity.score >= 85 ? 'critical' : 'urgent',
            affectedWorkflow: 'capacity',
            reason: `Capacity score is ${capacity.score} with ${capacity.riskLevel} risk.`,
            recommendedAction:
              'Open capacity review and coordinate spaces, admissions, EMS arrivals, and discharge relief.',
            supportingSignals: [
              `${capacity.occupancyPercent}% occupied`,
              `${capacity.state.pendingAdmissions} pending admissions`,
            ],
          })
        : null,
      boarding.score >= 70
        ? buildEscalation({
            id: 'boarding-overload',
            trigger: 'Boarding overload',
            severity: boarding.score >= 85 ? 'critical' : 'urgent',
            affectedWorkflow: 'boarding',
            reason: `${boarding.metrics.boardingCount} boarders with longest wait ${boarding.metrics.longestBoardingMinutes} minutes.`,
            recommendedAction:
              'Escalate bed-management review and prioritize the longest boarders.',
            supportingSignals: [
              `${boarding.metrics.pendingBeds} pending beds`,
              boarding.metrics.bedPressure,
            ],
          })
        : null,
      ems.metrics.pressureState !== 'normal'
        ? buildEscalation({
            id: 'ems-congestion',
            trigger: 'EMS congestion',
            severity: ems.metrics.pressureState === 'critical' ? 'critical' : 'urgent',
            affectedWorkflow: 'EMS',
            reason: `${ems.metrics.waitingHandoffs} handoffs waiting and ${ems.metrics.longestOffloadDelay} min longest offload delay.`,
            recommendedAction:
              'Review EMS handoff ownership, room readiness, and downstream boarding blockers.',
            supportingSignals: [
              `${ems.metrics.incomingAmbulances} incoming ambulances`,
              `${ems.metrics.nextEtaMinutes} min next ETA`,
            ],
          })
        : null,
      highRiskQueueGrowth >= 3
        ? buildEscalation({
            id: 'high-risk-queue-growth',
            trigger: 'High-risk queue growth',
            severity: highRiskQueueGrowth >= 5 ? 'critical' : 'urgent',
            affectedWorkflow: 'queues',
            reason: `${highRiskQueueGrowth} high-risk queue bottlenecks are active.`,
            recommendedAction:
              'Prioritize queue review, reassessment recommendations, and provider-start delays.',
            supportingSignals: queue.bottlenecks.slice(0, 3).map((bottleneck) => bottleneck.label),
          })
        : null,
      criticalDeviceOutage.length
        ? buildEscalation({
            id: 'critical-device-outage',
            trigger: 'Critical device outage',
            severity: criticalDeviceOutage.some((resource) => resource.available <= 5)
              ? 'critical'
              : 'urgent',
            affectedWorkflow: 'resources',
            reason: `${criticalDeviceOutage.map((resource) => resource.label).join(', ')} availability is below threshold.`,
            recommendedAction:
              'Coordinate biomedical review, device turnover, and alternative placement before patient flow is blocked.',
            supportingSignals: criticalDeviceOutage.map(
              (resource) => `${resource.available} ${resource.label.toLowerCase()} available`,
            ),
          })
        : null,
    ].filter((e): e is NonNullable<typeof e> => e !== null);

    return Object.freeze({
      id: 'emergency-escalation-engine',
      label: 'Emergency Escalation Engine',
      escalations: Object.freeze(escalations),
      metrics: Object.freeze({
        activeEscalations: escalations.length,
        criticalEscalations: escalations.filter((escalation) => escalation.severity === 'critical')
          .length,
        urgentEscalations: escalations.filter((escalation) => escalation.severity === 'urgent')
          .length,
      }),
      recommendations: Object.freeze(
        escalations.map((escalation) =>
          Object.freeze({
            id: `${escalation.id}-recommendation`,
            title: escalation.trigger,
            priority: escalation.severity,
            rationale: escalation.reason,
            action: escalation.recommendedAction,
          }),
        ),
      ),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'Escalation recommendations surface operational risk early. They do not automate clinical, staffing, bed, or device-control decisions.',
    });
  },
});

export default EmergencyEscalationEngineService;
