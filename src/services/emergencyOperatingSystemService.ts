import { getWorkspaceAutomations } from '../data/automationRegistry';
import ClinicalIntentRouter from '../data/clinicalIntentRouter';
import {
  EMERGENCY_AI_COPILOT,
  EMERGENCY_ANALYTICS_MVP,
  buildEmergencyCopilotGuidance,
} from '../data/emergencyOperatingSystem';
import EmergencyKnowledgeLayer from '../data/emergencyKnowledgeLayer';
import PatientJourneyEngine from '../data/patientJourneyEngine';
import AutomationROIService from './automationROIService';
import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import DoorToDoctorIntelligenceService from './doorToDoctorIntelligenceService';
import EdAutomationMarketplace from './edAutomationMarketplace';
import EmsPreArrivalPipelineService from './emsPreArrivalPipelineService';
import EmsOffloadCommandCenterService from './emsOffloadCommandCenterService';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import EmergencyEscalationEngineService from './emergencyEscalationEngineService';
import EmergencyFlowEngineService from './emergencyFlowEngineService';
import EmergencyIntakeOperatingSystemService, {
  getEmergencyIntakeAutomationFeed,
} from './emergencyIntakeOperatingSystemService';
import EmergencyKPILayerService from './emergencyKpiLayerService';
import EmergencyPatientPathService from './emergencyPatientPathService';
import EmergencyResourceBoardService from './emergencyResourceBoardService';
import EmergencySimulationScenariosService from './emergencySimulationScenariosService';
import EmergencyWhiteboardService from './emergencyWhiteboardService';
import { getLiveQueueDashboard } from './queueAssignment';
import ReassessmentAutomationService from './reassessmentAutomationService';
import ReferralHub from './referralHub';
import WaitingRoomIntelligenceService from './waitingRoomIntelligenceService';
import { buildBottleneckRegistrySnapshot } from './bottleneckRegistry';
import { buildFullEmergencyCareJourneySnapshot } from './fullEmergencyCareJourneyService';

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
  getOperatingSystem(options: any = {}) {
    const marketplaceAutomations = options.marketplaceAutomations || getWorkspaceAutomations('emergency');
    const automations =
      options.automations || Object.freeze([...marketplaceAutomations, ...getEmergencyIntakeAutomationFeed()]);
    const patientJourney = PatientJourneyEngine.getPatientJourney({ automations });
    const patientJourneyEngine = Object.freeze({
      metrics: PatientJourneyEngine.getJourneyMetrics({ automations }),
      bottlenecks: PatientJourneyEngine.getJourneyBottlenecks(),
      recommendations: PatientJourneyEngine.getJourneyRecommendations({ automations }),
    });
    const demoEnvironment = EmergencyDemoEnvironmentService.getDemoEnvironment();
    const queueFlow = getLiveQueueDashboard(demoEnvironment.patients as any);
    const doorToDoctor = DoorToDoctorIntelligenceService.getDashboard();
    const waitingRoom = WaitingRoomIntelligenceService.getWaitingRoomDashboard();
    const reassessment = ReassessmentAutomationService.getDashboard();
    const emsFlow = EmsPreArrivalPipelineService.getPreArrivalDashboard();
    const emsOffload = EmsOffloadCommandCenterService.getDashboard();
    const capacityFlow = EmergencyCapacityIntelligenceService.getCapacityDashboard();
    const flowEngine = EmergencyFlowEngineService.getFlowEngine();
    const referralFlow = ReferralHub.getReferralDashboard();
    const boardingFlow = BoardingIntelligenceEngine.getBoardingDashboard();
    const resourceBoard = EmergencyResourceBoardService.getResourceBoard();
    const escalationEngine = EmergencyEscalationEngineService.getEscalationDashboard();
    const kpiLayer = EmergencyKPILayerService.getKpiLayer();
    const simulationScenarios = EmergencySimulationScenariosService.getScenarioDashboard();
    const automationMarketplace = EdAutomationMarketplace.getMarketplaceDashboard(marketplaceAutomations);
    const automationRoi = AutomationROIService.getAutomationRoiDashboard(marketplaceAutomations);
    const digitalWhiteboard = EmergencyWhiteboardService.getWhiteboard();
    const knowledgeLayer = EmergencyKnowledgeLayer.getDashboard();
    const patientPath = EmergencyPatientPathService.getPatientPathDashboard();
    const fullEmergencyCareJourney = buildFullEmergencyCareJourneySnapshot({
      patients: demoEnvironment.patients as any,
    });
    const intakeOperatingSystem = EmergencyIntakeOperatingSystemService.getOperatingSystem();
    const bottleneckRegistry = buildBottleneckRegistrySnapshot({
      existingServiceSignals: {
        emergencyOperatingSystem: {
          serviceId: 'emergency-department-operating-system',
          status: 'standalone-saas-ready',
        },
        flowEngine,
        escalationDashboard: escalationEngine,
        queueDashboard: queueFlow,
        capacityDashboard: capacityFlow,
        reassessmentDashboard: reassessment,
        referralDashboard: referralFlow,
      },
    });
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
        'intake flow',
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
      throughput: doorToDoctor,
      waitingRoom,
      reassessment,
      referralFlow,
      emsFlow,
      emsOffload,
      capacityFlow,
      flowEngine,
      boardingFlow,
      resourceBoard,
      escalationEngine,
      bottleneckRegistry,
      kpiLayer,
      simulationScenarios,
      demoEnvironment,
      digitalWhiteboard,
      fullEmergencyCareJourney,
      patientPath,
      intakeOperatingSystem,
      smartArrival: intakeOperatingSystem.smartArrival,
      dischargeFlow,
      copilot: Object.freeze({
        ...EMERGENCY_AI_COPILOT,
        sampleGuidance: copilotGuidance,
        intentRoutes: ClinicalIntentRouter.getRoutes(),
      }),
      analytics: EMERGENCY_ANALYTICS_MVP,
      automationMarketplace,
      automationRoi,
      knowledgeLayer,
      leadershipSummary: Object.freeze({
        activePatients: patientJourneyEngine.metrics.activePatients,
        intakeArrivals:
          intakeOperatingSystem.commandCenter.trackedStates.find((state) => state.id === 'arrivals')?.value || 0,
        smartArrivalSummaries:
          intakeOperatingSystem.smartArrival?.generatedSnapshot?.status === 'finalized' ? 1 : 0,
        triageReadyFromIntake:
          intakeOperatingSystem.commandCenter.trackedStates.find((state) => state.id === 'triage-ready-patients')?.value || 0,
        registrationCompletionScore: intakeOperatingSystem.registrationCompletionScore.score,
        doorToDirection: patientPath.metrics.doorToDirectionMinutes,
        doorToDirectionCompliance: patientPath.metrics.targetCompliance,
        waitingPatients: patientJourneyEngine.metrics.waitingPatients,
        queueBottlenecks: queueFlow.metrics.bottleneckCount,
        doorToDoctor: kpiLayer.metricById.doorToDoctor.value,
        waitingRoomHealthScore: waitingRoom.healthScore,
        reassessmentQueue: reassessment.metrics.total,
        emsArrivals: emsFlow.metrics.incomingCount,
        emsOffloadDelay: emsOffload.metrics.currentOffloadDelay,
        capacityScore: capacityFlow.score,
        flowDetections: flowEngine.metrics.activeDetections,
        nextRecommendedActions: flowEngine.nextRecommendedActions.length,
        referralDelays: referralFlow.metrics.delayed,
        boardingCount: boardingFlow.metrics.boardingCount,
        resourceShortages: resourceBoard.metrics.shortageCount,
        activeEscalations: escalationEngine.metrics.activeEscalations,
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
