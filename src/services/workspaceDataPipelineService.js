import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceFunctionalityMode,
  getWorkspaceSubpageEntries,
} from '../config/workspace.config';
import {
  getSolutionPackageForWorkspace,
  getWorkspaceAutomations,
} from '../data/automationRegistry';
import ClinicalIntentRouter from '../data/clinicalIntentRouter';
import {
  EMERGENCY_ANALYTICS_MVP,
  EMERGENCY_AI_COPILOT,
  EMERGENCY_CHIEF_COMPLAINT_ROUTES,
  EMERGENCY_COMMAND_CENTER_WIDGETS,
  EMERGENCY_CORE_MVP_PACKAGE,
  EMERGENCY_CUSTOMER_READINESS_CAPABILITIES,
  EMERGENCY_DASHBOARD_WIDGETS,
  EMERGENCY_DEMO_TENANT,
  EMERGENCY_FASTEST_TO_MARKET_OFFERINGS,
  EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT,
  EMERGENCY_FLOW_INTELLIGENCE_PLATFORM,
  EMERGENCY_ONBOARDING_EXPERIENCE,
  EMERGENCY_OPTIONAL_ADD_ONS,
  EMERGENCY_OS_IMPLEMENTATION_SUMMARY,
  EMERGENCY_PATIENT_JOURNEY,
  EMERGENCY_RAG_COMPLAINT_CONTEXT,
  EMERGENCY_ROI_ESTIMATOR,
  EMERGENCY_SOLUTION_PACKAGES,
  EMERGENCY_TRIAGE_ORCHESTRATOR,
  EMERGENCY_WORKSPACE_ID,
  buildEmergencyCopilotGuidance,
  estimateEmergencyRoi,
  summarizeEmergencyCustomerReadiness,
} from '../data/emergencyOperatingSystem';
import EmergencyKnowledgeLayer from '../data/emergencyKnowledgeLayer';
import PatientJourneyEngine from '../data/patientJourneyEngine';
import { workspaceFilterSummary } from '../data/platformOperatingSystem';
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
import EmergencyKPILayerService from './emergencyKpiLayerService';
import EmergencyIntakeOperatingSystemService, {
  getEmergencyIntakeAutomationFeed,
} from './emergencyIntakeOperatingSystemService';
import EmergencyResourceBoardService from './emergencyResourceBoardService';
import EmergencySimulationScenariosService from './emergencySimulationScenariosService';
import EmergencyWhiteboardService from './emergencyWhiteboardService';
import EmergencyOperatingSystemService from './emergencyOperatingSystemService';
import EmergencyPatientPathService from './emergencyPatientPathService';
import QueueIntelligenceService from './queueIntelligenceService';
import ReassessmentAutomationService from './reassessmentAutomationService';
import ReferralHub from './referralHub';
import WaitingRoomIntelligenceService from './waitingRoomIntelligenceService';

const PIPELINE_STAGES = Object.freeze([
  'Source',
  'Ingestion',
  'Normalization',
  'Workspace Context',
  'Asset Recommendations',
  'Dashboard Widgets',
  'Alerts',
  'AI Context',
  'Reports',
]);

function normalizeWorkspaceId(workspaceId) {
  return String(workspaceId || DEFAULT_CARE_WORKSPACE_ID).trim() || DEFAULT_CARE_WORKSPACE_ID;
}

function backendLabel(service) {
  return service.status === 'backend-wired' ? 'Backend wired' : 'Demo/local fallback';
}

function buildDataSources(mode) {
  return (mode.primaryDataSources || []).map((source) => ({
    id: source.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label: source,
    status: source === 'backend APIs' ? 'mixed' : 'available',
  }));
}

function buildBackendConnections(mode) {
  return (mode.backendServices || []).map((service) => ({
    ...service,
    statusLabel: backendLabel(service),
    isBackendWired: service.status === 'backend-wired',
  }));
}

function buildRecommendations(model, mode) {
  const toolRecommendations = model.toolEntries.slice(0, 6).map((tool) => ({
    id: `tool:${tool.id}`,
    type: 'asset',
    assetId: tool.id,
    label: tool.name,
    description: tool.description,
    source: 'workspace-asset-registry',
  }));
  const workflowRecommendations = (mode.workflows || []).slice(0, 4).map((workflow) => ({
    id: `workflow:${workflow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'workflow',
    label: workflow,
    description: `Continue ${workflow} in ${mode.modeName}.`,
    source: 'workspace-mode-model',
  }));
  return [...toolRecommendations, ...workflowRecommendations];
}

function buildAlerts(workspaceId, mode) {
  const summary = workspaceFilterSummary(workspaceId);
  const localAlerts = (mode.alerts || []).map((alert) => ({
    id: `mode:${alert.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: alert,
    severity: /critical|offline|security|risk|gap/i.test(alert) ? 'high' : 'medium',
    source: 'workspace-mode-model',
    status: 'demo/local fallback',
  }));
  const notifications = (summary.notifications || []).slice(0, 4).map((notification) => ({
    id: `notification:${notification.id}`,
    label: notification.title,
    detail: notification.body,
    severity: notification.priority || 'medium',
    source: 'workspace-filter-summary',
    status: 'frontend local/demo data',
  }));
  return [...localAlerts, ...notifications];
}

function buildAnalytics(model, mode, recommendations, alerts) {
  const automations = getWorkspaceAutomations(model.workspace.id);
  const analytics = {
    workspaceId: model.workspace.id,
    modeName: mode.modeName,
    counts: {
      subpages: model.subpageEntries.length,
      tools: model.toolEntries.length,
      automations: automations.length,
      activeAutomations: automations.filter((automation) => automation.status === 'active').length,
      dashboards: mode.dashboards.length,
      workflows: mode.workflows.length,
      alerts: alerts.length,
      recommendations: recommendations.length,
      backendWiredServices: model.backendStatus.live.length,
      fallbackServices: model.backendStatus.fallback.length,
    },
    dashboardWidgets: mode.dashboards,
    solutionPackage: getSolutionPackageForWorkspace(model.workspace.id),
    backendCoverage:
      mode.backendServices.length > 0
        ? Math.round((model.backendStatus.live.length / mode.backendServices.length) * 100)
        : 0,
  };
  if (model.workspace.id === EMERGENCY_WORKSPACE_ID) {
    analytics.emergency = EMERGENCY_ANALYTICS_MVP;
  }
  return analytics;
}

export const WorkspaceDataPipelineService = {
  getWorkspaceData(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const model = buildCareWorkspaceModel(normalizedWorkspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    const recommendations = buildRecommendations(model, mode);
    const alerts = buildAlerts(model.workspace.id, mode);
    const analytics = buildAnalytics(model, mode, recommendations, alerts);
    const workspaceAutomations = getWorkspaceAutomations(model.workspace.id);
    const intakeOperatingSystem =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? EmergencyIntakeOperatingSystemService.getOperatingSystem()
        : null;
    const intakeAutomationFeed =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? getEmergencyIntakeAutomationFeed() : [];
    const emergencyJourneyAutomations =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? Object.freeze([...workspaceAutomations, ...intakeAutomationFeed])
        : workspaceAutomations;
    const patientJourneyEngine =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? {
            metrics: PatientJourneyEngine.getJourneyMetrics({ automations: emergencyJourneyAutomations }),
            bottlenecks: PatientJourneyEngine.getJourneyBottlenecks(),
            recommendations: PatientJourneyEngine.getJourneyRecommendations({ automations: emergencyJourneyAutomations }),
          }
        : null;
    const queueIntelligence =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? QueueIntelligenceService.getQueueDashboard() : null;
    const doorToDoctorIntelligence =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? DoorToDoctorIntelligenceService.getDashboard() : null;
    const waitingRoomIntelligence =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? WaitingRoomIntelligenceService.getWaitingRoomDashboard() : null;
    const reassessmentAutomation =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? ReassessmentAutomationService.getDashboard() : null;
    const emsPreArrival =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmsPreArrivalPipelineService.getPreArrivalDashboard() : null;
    const emsOffload =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmsOffloadCommandCenterService.getDashboard() : null;
    const capacityIntelligence =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? EmergencyCapacityIntelligenceService.getCapacityDashboard()
        : null;
    const flowEngine =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyFlowEngineService.getFlowEngine() : null;
    const referralHub =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? ReferralHub.getReferralDashboard() : null;
    const boardingIntelligence =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? BoardingIntelligenceEngine.getBoardingDashboard()
        : null;
    const resourceBoard =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyResourceBoardService.getResourceBoard() : null;
    const escalationEngine =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyEscalationEngineService.getEscalationDashboard() : null;
    const kpiLayer =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyKPILayerService.getKpiLayer() : null;
    const simulationScenarios =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencySimulationScenariosService.getScenarioDashboard() : null;
    const demoEnvironment =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyDemoEnvironmentService.getDemoEnvironment() : null;
    const automationMarketplace =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? EdAutomationMarketplace.getMarketplaceDashboard(workspaceAutomations)
        : null;
    const automationRoi =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? AutomationROIService.getAutomationRoiDashboard(workspaceAutomations)
        : null;
    const digitalWhiteboard =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyWhiteboardService.getWhiteboard() : null;
    const knowledgeLayer =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyKnowledgeLayer.getDashboard() : null;
    const patientPath =
      model.workspace.id === EMERGENCY_WORKSPACE_ID ? EmergencyPatientPathService.getPatientPathDashboard() : null;
    const operatingSystem =
      model.workspace.id === EMERGENCY_WORKSPACE_ID
        ? EmergencyOperatingSystemService.getOperatingSystem({
            automations: emergencyJourneyAutomations,
            marketplaceAutomations: workspaceAutomations,
          })
        : null;

    return {
      workspace: model.workspace,
      mode,
      subpages: getWorkspaceSubpageEntries(model.workspace.id),
      pipelineStages: PIPELINE_STAGES,
      dataSources: buildDataSources(mode),
      backendConnections: buildBackendConnections(mode),
      recommendations,
      alerts,
      analytics,
      emergency:
        model.workspace.id === EMERGENCY_WORKSPACE_ID
          ? {
              patientJourney: PatientJourneyEngine.getPatientJourney({ automations: emergencyJourneyAutomations }),
              patientJourneyEngine,
              queueIntelligence,
              doorToDoctorIntelligence,
              waitingRoomIntelligence,
              reassessmentAutomation,
              emsPreArrival,
              emsOffload,
              capacityIntelligence,
              flowEngine,
              referralHub,
              boardingIntelligence,
              resourceBoard,
              escalationEngine,
              kpiLayer,
              simulationScenarios,
              demoEnvironment,
              automationMarketplace,
              automationRoi,
              digitalWhiteboard,
              knowledgeLayer,
              patientPath,
              intakeOperatingSystem,
              smartArrival: intakeOperatingSystem.smartArrival,
              operatingSystem,
              canonicalPatientJourney: EMERGENCY_PATIENT_JOURNEY,
              dashboardWidgets: EMERGENCY_DASHBOARD_WIDGETS,
              commandCenterWidgets: EMERGENCY_COMMAND_CENTER_WIDGETS,
              demoTenant: EMERGENCY_DEMO_TENANT,
              firstCustomerDeployment: EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT,
              implementationSummary: EMERGENCY_OS_IMPLEMENTATION_SUMMARY,
              flowIntelligencePlatform: EMERGENCY_FLOW_INTELLIGENCE_PLATFORM,
              chiefComplaintRoutes: EMERGENCY_CHIEF_COMPLAINT_ROUTES,
              clinicalIntentRouter: {
                routes: ClinicalIntentRouter.getRoutes(),
                outputSchema: ['complaint', 'workflow', 'calculators', 'protocols', 'referrals', 'aiCopilot'],
                safetyStatement:
                  'Complaint routing provides workflow guidance only. Clinician review is required for all clinical decisions.',
              },
              aiCopilot: {
                ...EMERGENCY_AI_COPILOT,
                sampleGuidance: buildEmergencyCopilotGuidance({
                  complaint: 'Chest Pain',
                  vitals: 'Vitals available for clinician review',
                  workspaceContext: 'Emergency Command Center',
                  selectedCalculators: ['HEART'],
                }),
              },
              triageOrchestrator: EMERGENCY_TRIAGE_ORCHESTRATOR,
              ragComplaintContext: EMERGENCY_RAG_COMPLAINT_CONTEXT,
              analyticsMvp: EMERGENCY_ANALYTICS_MVP,
              onboarding: EMERGENCY_ONBOARDING_EXPERIENCE,
              roiEstimator: EMERGENCY_ROI_ESTIMATOR,
              roiEstimate: estimateEmergencyRoi(),
              productTiers: EMERGENCY_SOLUTION_PACKAGES,
              mvpPackage: EMERGENCY_CORE_MVP_PACKAGE,
              optionalAddOns: EMERGENCY_OPTIONAL_ADD_ONS,
              customerReadiness: {
                capabilities: EMERGENCY_CUSTOMER_READINESS_CAPABILITIES,
                summary: summarizeEmergencyCustomerReadiness(),
                fastestToMarketOfferings: EMERGENCY_FASTEST_TO_MARKET_OFFERINGS,
              },
            }
          : null,
      aiContext: this.getWorkspaceAIContext(model.workspace.id),
      sourceStatus: model.backendStatus.fallback.length
        ? 'Backend connected where wired; demo/local fallback where endpoints are not implemented.'
        : 'Backend wired.',
    };
  },

  normalizeWorkspaceData(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const data = this.getWorkspaceData(workspaceId);
    return {
      ...data,
      normalizedAt: 'frontend-runtime',
      pipeline: {
        source: data.dataSources,
        ingestion: data.mode.dataPipeline.ingestion,
        normalization: data.mode.dataPipeline.normalization,
        workspaceContext: data.mode.dataPipeline.workspaceContext,
        assetRecommendations: data.recommendations,
        dashboardWidgets: data.mode.dataPipeline.dashboardWidgets,
        alerts: data.alerts,
        aiContext: data.aiContext,
        reports: data.mode.dataPipeline.reports,
      },
    };
  },

  getWorkspaceAlerts(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const mode = getWorkspaceFunctionalityMode(workspaceId);
    return buildAlerts(normalizeWorkspaceId(workspaceId), mode);
  },

  getWorkspaceRecommendations(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    return buildRecommendations(model, getWorkspaceFunctionalityMode(model.workspace.id));
  },

  getWorkspaceAnalytics(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    const recommendations = buildRecommendations(model, mode);
    const alerts = buildAlerts(model.workspace.id, mode);
    return buildAnalytics(model, mode, recommendations, alerts);
  },

  getWorkspaceAIContext(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    return {
      workspaceId: model.workspace.id,
      operatingMode: mode.modeName,
      assistantContext: model.workspace.aiContext || mode.purpose,
      agents: mode.aiAgents,
      tools: model.toolEntries.map((tool) => ({ id: tool.id, name: tool.name, category: tool.category })),
      workflows: mode.workflows,
      alerts: mode.alerts,
      reports: mode.reports,
      backendConnections: buildBackendConnections(mode),
      automations: getWorkspaceAutomations(model.workspace.id).map((automation) => ({
        automationId: automation.automationId,
        title: automation.title,
        riskLevel: automation.riskLevel,
        humanReviewRequired: automation.humanReviewRequired,
        patientJourneyStates: automation.patientJourneyStates || automation.journeyStages || automation.requiredWorkflows || [],
        journeyStages: automation.journeyStages || automation.requiredWorkflows || [],
        workspaceVisibility: automation.workspaceVisibility || [],
        readiness: automation.readiness || null,
      })),
      emergency:
        model.workspace.id === EMERGENCY_WORKSPACE_ID
          ? {
              complaintContexts: EMERGENCY_RAG_COMPLAINT_CONTEXT,
              chiefComplaintRoutes: EMERGENCY_CHIEF_COMPLAINT_ROUTES,
              clinicalIntentRouter: {
                routes: ClinicalIntentRouter.getRoutes(),
                outputSchema: ['complaint', 'workflow', 'calculators', 'protocols', 'referrals', 'aiCopilot'],
              },
              aiCopilot: EMERGENCY_AI_COPILOT,
              triageOrchestrator: EMERGENCY_TRIAGE_ORCHESTRATOR,
              safetyStatement: EMERGENCY_TRIAGE_ORCHESTRATOR.safetyStatement,
            }
          : null,
    };
  },
};

export const getWorkspaceData = WorkspaceDataPipelineService.getWorkspaceData.bind(WorkspaceDataPipelineService);
export const normalizeWorkspaceData = WorkspaceDataPipelineService.normalizeWorkspaceData.bind(WorkspaceDataPipelineService);
export const getWorkspaceAlerts = WorkspaceDataPipelineService.getWorkspaceAlerts.bind(WorkspaceDataPipelineService);
export const getWorkspaceRecommendations = WorkspaceDataPipelineService.getWorkspaceRecommendations.bind(WorkspaceDataPipelineService);
export const getWorkspaceAnalytics = WorkspaceDataPipelineService.getWorkspaceAnalytics.bind(WorkspaceDataPipelineService);
export const getWorkspaceAIContext = WorkspaceDataPipelineService.getWorkspaceAIContext.bind(WorkspaceDataPipelineService);

export default WorkspaceDataPipelineService;
