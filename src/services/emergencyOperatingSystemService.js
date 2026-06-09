import { getWorkspaceAutomations } from '../data/automationRegistry';
import ClinicalIntentRouter from '../data/clinicalIntentRouter';
import {
  EMERGENCY_AI_COPILOT,
  EMERGENCY_ANALYTICS_MVP,
  buildEmergencyCopilotGuidance,
} from '../data/emergencyOperatingSystem';
import PatientJourneyEngine from '../data/patientJourneyEngine';
import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import EdAutomationMarketplace from './edAutomationMarketplace';
import EmsPreArrivalPipelineService from './emsPreArrivalPipelineService';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import QueueIntelligenceService from './queueIntelligenceService';
import ReferralHub from './referralHub';

function buildDischargeFlow({ queueDashboard, capacityDashboard, automationMarketplace }) {
  const dischargeQueue = queueDashboard.queues.find((queue) => queue.id === 'discharge-queue') || null;
  const dischargeModules = automationMarketplace.modules.filter((module) =>
    module.categories.includes('Discharge')
  );
  const dischargeCandidates =
    capacityDashboard.signals.find((signal) => signal.id === 'dischargeCandidates')?.value || 0;

  return Object.freeze({
    queue: dischargeQueue,
    dischargeCandidates,
    automations: Object.freeze(dischargeModules),
    recommendations: Object.freeze([
      ...queueDashboard.recommendations.filter((recommendation) => recommendation.queueId === 'discharge-queue'),
      ...capacityDashboard.recommendations.filter((recommendation) => recommendation.id === 'discharge-acceleration'),
    ]),
  });
}

export const EmergencyOperatingSystemService = Object.freeze({
  getOperatingSystem(options = {}) {
    const automations = options.automations || getWorkspaceAutomations('emergency');
    const patientJourney = PatientJourneyEngine.getPatientJourney({ automations });
    const patientJourneyEngine = Object.freeze({
      metrics: PatientJourneyEngine.getJourneyMetrics({ automations }),
      bottlenecks: PatientJourneyEngine.getJourneyBottlenecks(),
      recommendations: PatientJourneyEngine.getJourneyRecommendations({ automations }),
    });
    const queueFlow = QueueIntelligenceService.getQueueDashboard();
    const emsFlow = EmsPreArrivalPipelineService.getPreArrivalDashboard();
    const capacityFlow = EmergencyCapacityIntelligenceService.getCapacityDashboard();
    const referralFlow = ReferralHub.getReferralDashboard();
    const boardingFlow = BoardingIntelligenceEngine.getBoardingDashboard();
    const automationMarketplace = EdAutomationMarketplace.getMarketplaceDashboard(automations);
    const dischargeFlow = buildDischargeFlow({
      queueDashboard: queueFlow,
      capacityDashboard: capacityFlow,
      automationMarketplace,
    });
    const copilotGuidance = buildEmergencyCopilotGuidance({
      complaint: 'Chest Pain',
      vitals: 'Vitals available for clinician review',
      workspaceContext: 'Emergency Department Operating System',
      selectedCalculators: ['HEART'],
    });

    return Object.freeze({
      serviceId: 'emergency-department-operating-system',
      title: 'Emergency Department Operating System',
      route: '/workspace/emergency',
      status: 'standalone-saas-ready',
      responsibilities: Object.freeze([
        'patient flow',
        'queue flow',
        'referral flow',
        'EMS flow',
        'capacity flow',
        'discharge flow',
      ]),
      patientFlow: Object.freeze({
        journey: patientJourney,
        engine: patientJourneyEngine,
      }),
      queueFlow,
      referralFlow,
      emsFlow,
      capacityFlow,
      boardingFlow,
      dischargeFlow,
      copilot: Object.freeze({
        ...EMERGENCY_AI_COPILOT,
        sampleGuidance: copilotGuidance,
        intentRoutes: ClinicalIntentRouter.getRoutes(),
      }),
      analytics: EMERGENCY_ANALYTICS_MVP,
      automationMarketplace,
      leadershipSummary: Object.freeze({
        activePatients: patientJourneyEngine.metrics.activePatients,
        waitingPatients: patientJourneyEngine.metrics.waitingPatients,
        queueBottlenecks: queueFlow.metrics.bottleneckCount,
        emsArrivals: emsFlow.metrics.incomingCount,
        capacityScore: capacityFlow.score,
        referralDelays: referralFlow.metrics.delayed,
        boardingCount: boardingFlow.metrics.boardingCount,
        automationModules: automationMarketplace.metrics.totalModules,
      }),
      positioning:
        'A complete Emergency Department Operating System that unifies ED flow, bottlenecks, intelligence, automations, analytics, and copilot guidance as a standalone SaaS solution.',
    });
  },
});

export const getEmergencyOperatingSystem =
  EmergencyOperatingSystemService.getOperatingSystem.bind(EmergencyOperatingSystemService);

export default EmergencyOperatingSystemService;
