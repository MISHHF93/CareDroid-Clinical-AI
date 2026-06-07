/**
 * Canonical normalized tool inventory.
 *
 * This module is intentionally derived from the existing registry/catalog/backend
 * contract files during the migration. Runtime consumers can move here
 * incrementally while legacy exports remain compatibility projections.
 */

import { toolRegistryById } from './toolRegistry';
import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  ALL_REGISTRY_TOOL_IDS,
  AI_SYSTEM_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  CLINICAL_DOSE_HUB_REGISTRY_IDS,
  CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS,
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
  HOSPITAL_OPERATIONS_REGISTRY_IDS,
  HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS,
  LIVE_TRACKING_MAP_REGISTRY_IDS,
  MEDICAL_IOT_REGISTRY_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_TO_REGISTRY_ID,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  TOOL_LAUNCH_PATHS,
  registryToPrimaryNluToolId,
} from './clinicalToolIdContract';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { BACKEND_HTTP_ROUTES, findBackendRoute } from './backendHttpRouteInventory';
import { PLATFORM_SYSTEM_CAPABILITIES, PLATFORM_SYSTEM_CAPABILITY_BY_ID } from './platformSystems';
import { enrichToolWithSegmentation } from './profileToolSegmentation';
import { buildPluginInventoryRecords, PLUGIN_REGISTRY } from './pluginRegistry';
import {
  filterToolsByEntitlements,
  getPlatformEntitlementContext,
} from './assetEntitlements';

export const TOOL_INVENTORY_VERSION = 1;

let cachedInventory = null;
let cachedInventoryById = null;
let cachedUserFacingInventory = null;
let cachedSidebarToolRegistryProjection = null;
let cachedUserFacingToolRegistryProjection = null;

if (typeof window !== 'undefined') {
  window.addEventListener('caredroid:entitlements-changed', () => {
    cachedUserFacingToolRegistryProjection = null;
  });
}

const CLINICAL_TIER_C_WORKFLOW_REGISTRY_ID_SET = new Set(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS);
const FLEET_TIER_A_REGISTRY_ID_SET = new Set(FLEET_TIER_A_REGISTRY_IDS);
const FLEET_TIER_B_CHAT_REGISTRY_ID_SET = new Set(FLEET_TIER_B_CHAT_REGISTRY_IDS);
const HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_ID_SET = new Set(
  HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS
);
const LIVE_TRACKING_MAP_REGISTRY_ID_SET = new Set(LIVE_TRACKING_MAP_REGISTRY_IDS);
const MEDICAL_IOT_REGISTRY_ID_SET = new Set(MEDICAL_IOT_REGISTRY_IDS);
const HOSPITAL_OPERATIONS_REGISTRY_ID_SET = new Set(HOSPITAL_OPERATIONS_REGISTRY_IDS);
const CLINICAL_TIER_A_CALCULATOR_REGISTRY_ID_SET = new Set(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS);
const CLINICAL_TIER_B_CHAT_REGISTRY_ID_SET = new Set(CLINICAL_TIER_B_CHAT_REGISTRY_IDS);
const CLINICAL_NLU_HUB_CHAT_REGISTRY_ID_SET = new Set(CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS);
const CLINICAL_DOSE_HUB_REGISTRY_ID_SET = new Set(CLINICAL_DOSE_HUB_REGISTRY_IDS);
const CLINICAL_AI_PAGE_REGISTRY_ID_SET = new Set(CLINICAL_AI_PAGE_REGISTRY_IDS);
const ORCHESTRATOR_REGISTERED_NLU_TOOL_ID_SET = new Set(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS);
const NLU_PROFILE_TOOL_ID_SET = new Set(NLU_PROFILE_TOOL_IDS);
const ALL_REGISTRY_TOOL_ID_ORDER = new Map(ALL_REGISTRY_TOOL_IDS.map((id, index) => [id, index]));
const AI_SYSTEM_REGISTRY_ID_SET = new Set(AI_SYSTEM_REGISTRY_IDS);

const clinicalIntentToolById = new Map(clinicalIntentTools.map((row) => [row.toolId, row]));
const builtinUiCalculatorById = new Map(builtinUiCalculators.map((calc) => [calc.id, calc]));
const builtinUiCalculatorByRegistryId = new Map();
for (const calc of builtinUiCalculators) {
  const registryId = BUILTIN_CALC_ID_TO_REGISTRY_ID[calc.id];
  if (registryId && !builtinUiCalculatorByRegistryId.has(registryId)) {
    builtinUiCalculatorByRegistryId.set(registryId, calc);
  }
}

const nluProfilesByRegistryId = new Map();
for (const row of clinicalIntentTools) {
  const registryIds = unique([row.sidebarToolId, row.toolId]);
  for (const registryId of registryIds) {
    if (!nluProfilesByRegistryId.has(registryId)) {
      nluProfilesByRegistryId.set(registryId, []);
    }
    nluProfilesByRegistryId.get(registryId).push(row);
  }
}

const aliasesByRegistryId = new Map();
for (const [alias, target] of Object.entries(NLU_TO_REGISTRY_ID)) {
  if (!aliasesByRegistryId.has(target)) aliasesByRegistryId.set(target, []);
  aliasesByRegistryId.get(target).push(alias);
}
for (const aliases of aliasesByRegistryId.values()) {
  aliases.sort();
}

export const TOOL_LAUNCH_TYPES = Object.freeze({
  LOCAL_ONLY: 'local-only',
  CHAT_ASSISTED: 'chat-assisted',
  BACKEND_BACKED: 'backend-backed',
  CLINICAL_PAGE: 'clinical-page',
  FLEET_LOCAL: 'fleet-local',
  IOT_LOCAL: 'iot-local',
  HOSPITAL_LOCAL: 'hospital-local',
  HUB: 'hub',
  PLATFORM: 'platform',
  UNSUPPORTED_PLANNED: 'unsupported-planned',
});

export const TOOL_EXECUTOR_STATUS = Object.freeze({
  REGISTERED: 'registered',
  UNSUPPORTED: 'unsupported',
  NONE: 'none',
  PLATFORM: 'platform',
});

export const TOOL_SURFACES = Object.freeze({
  TOOL_PAGE: 'tool-page',
  CALCULATOR_FORM: 'calculator-form',
  CHAT_ASSISTED: 'chat-assisted',
  FLEET_PAGE: 'fleet-page',
  IOT_DASHBOARD: 'iot-dashboard',
  HOSPITAL_OPERATIONS: 'hospital-operations',
  PLATFORM_PAGE: 'platform-page',
  HUB: 'hub',
  INTERNAL: 'internal',
});

export const TOOL_LIFECYCLE_STATES = Object.freeze({
  DRAFT: 'draft',
  BETA: 'beta',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived',
});

export const TOOL_LIFECYCLE_LABELS = Object.freeze({
  [TOOL_LIFECYCLE_STATES.DRAFT]: 'Draft',
  [TOOL_LIFECYCLE_STATES.BETA]: 'Beta',
  [TOOL_LIFECYCLE_STATES.ACTIVE]: 'Active',
  [TOOL_LIFECYCLE_STATES.DEPRECATED]: 'Deprecated',
  [TOOL_LIFECYCLE_STATES.ARCHIVED]: 'Archived',
});

export const AUDIT_RECORD_KINDS = Object.freeze({
  LAUNCHABLE_REFERENCE: 'launchable-reference',
  BACKEND_ENDPOINT: 'backend-endpoint',
  PLATFORM_API: 'platform-api',
  INTERNAL: 'internal',
});

const EXECUTOR_DTO = Object.freeze({
  requestDto: 'ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`)',
  responseDto: 'ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...)',
});

const CHAT_DTO = Object.freeze({
  requestDto: 'ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`)',
  responseDto: 'QueryResponse (`text`, `intentClassification`, `toolResult?`, ...)',
});

const AMBIENT_SCRIBE_DTO = Object.freeze({
  requestDto: 'AmbientScribeGenerateDto (`noteType`, `transcriptText`, `patientContext?`)',
  responseDto: 'AmbientScribeResponseDto (`runId`, `status`, `draft`, `safety`, `reviewRequired`)',
});

const GUIDELINE_RAG_DTO = Object.freeze({
  requestDto: 'GuidelineRagQueryDto (`query`, `specialty?`, `topK?`, `minScore?`)',
  responseDto: 'GuidelineRagResponseDto (`runId`, `summary`, `citations`, `sources`, `explainability`)',
});

const DIFFERENTIAL_AI_DTO = Object.freeze({
  requestDto: 'DifferentialAiRequestDto (`symptoms`, `labs?`, `history?`, `demographics?`)',
  responseDto: 'DifferentialAiResponseDto (`runId`, `rankedDifferentials`, `suggestedCalculators`, `explainability`)',
});

const TIMELINE_AI_DTO = Object.freeze({
  requestDto: 'TimelineAiRequestDto (`patientContext?`, `encounters`, `focus?`)',
  responseDto: 'TimelineAiResponseDto (`runId`, `timeline`, `trends`, `abnormalProgression`, `safety`)',
});

const PATIENT_SUMMARY_AI_DTO = Object.freeze({
  requestDto: 'PatientSummaryAiRequestDto (`patientContext?`, `problems?`, `medications?`, `labs?`, `alerts?`, `riskFactors?`, `notes?`)',
  responseDto: 'PatientSummaryAiResponseDto (`runId`, `activeProblems`, `medications`, `recentLabs`, `alerts`, `riskFactors`, `safety`)',
});

const ORDER_SET_AI_DTO = Object.freeze({
  requestDto: 'OrderSetAiRequestDto (`clinicalScenario`, `diagnosis?`, `patientContext?`, `constraints?`)',
  responseDto: 'OrderSetAiResponseDto (`runId`, `orderBundles`, `protocolPathways`, `explainability`, `safety`)',
});

const AI_EXPLAINABILITY_DTO = Object.freeze({
  requestDto: 'AiExplainabilityQueryDto (`toolId?`, `clinicalQuestion?`, `limit?`)',
  responseDto: 'AiExplainabilityResponseDto (`runId`, `confidence`, `source`, `reasoning`, `toolChain`, `executionLogs`)',
});

const CLINICAL_AUDIT_DTO = Object.freeze({
  requestDto: 'ClinicalAuditQueryDto (`action?`, `limit?`)',
  responseDto: 'ClinicalAuditResponseDto (`runId`, `summary`, `toolChain`, `executionLogs`, `safety`)',
});

export const TOOL_PERMISSION_LOGIC = Object.freeze({
  ALL: 'all',
  ANY: 'any',
});

const CLINICAL_INTELLIGENCE_PERMISSION_POLICIES = Object.freeze({
  [REGISTRY.ambientScribe]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.guidelineRag]: Object.freeze({
    permissions: Object.freeze(['USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.researchEvidenceHub]: Object.freeze({
    permissions: Object.freeze(['USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.differentialAi]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.timelineAi]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.patientSummaryAi]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.orderSetAi]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.aiExplainability]: Object.freeze({
    permissions: Object.freeze(['READ_PHI', 'USE_AI_CHAT']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
  [REGISTRY.clinicalAudit]: Object.freeze({
    permissions: Object.freeze(['VIEW_AUDIT_LOGS']),
    logic: TOOL_PERMISSION_LOGIC.ALL,
    backendController: 'ClinicalIntelligenceController',
  }),
});

const COMPONENT_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.drugCheck]: 'src/pages/tools/DrugChecker.jsx',
  [REGISTRY.labInterp]: 'src/pages/tools/LabInterpreter.jsx',
  [REGISTRY.protocols]: 'src/pages/tools/Protocols.jsx',
  [REGISTRY.aclsProtocol]: 'src/pages/tools/Protocols.jsx',
  [REGISTRY.atlsProtocol]: 'src/pages/tools/Protocols.jsx',
  [REGISTRY.diagnosis]: 'src/pages/tools/DiagnosisAssistant.jsx',
  [REGISTRY.antibioticGuide]: 'src/pages/tools/DiagnosisAssistant.jsx',
  [REGISTRY.procedures]: 'src/pages/tools/ProcedureGuide.jsx',
  [REGISTRY.abgInterpreter]: 'src/pages/tools/LabInterpreter.jsx',
  [REGISTRY.ecgInterpretationAssistant]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.stemiPathwayAssistant]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.acsWorkflowAssistant]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.atrialFibrillationAssistant]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.heartFailureAssistant]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.cardiacTelemetryAnalyzer]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.ecgTrendEngine]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.arrhythmiaRiskClassifier]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.remoteCardiologyMonitoringDashboard]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.cardiologyCommandCenter]: 'src/pages/tools/CardiologyAssistantPage.jsx',
  [REGISTRY.asthmaExacerbationAssistant]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.ventilatorSupportAssistant]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.oxygenEscalationHelper]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.copdWorkflowAssistant]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.akiStagingAssistant]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.dialysisReadinessHelper]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.electrolyteDisorderAssistant]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.ventilatorMonitoringDashboard]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.respiratoryTelemetryDashboard]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.sleepApneaAnalytics]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.pulmonaryTrendEngine]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.respiratoryCommandCenter]: 'src/pages/tools/PulmonologyAssistantPage.jsx',
  [REGISTRY.renalMonitoringDashboard]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.ckdProgressionPredictor]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.dialysisUtilizationTracker]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.electrolyteTrendEngine]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.fluidBalanceMonitor]: 'src/pages/tools/NephrologyAssistantPage.jsx',
  [REGISTRY.diabetesCareAssistant]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.dkaPathwayAssistant]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.thyroidDisorderAssistant]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.metabolicSyndromeAssistant]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.glucoseTelemetryDashboard]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.insulinTrendEngine]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.endocrineMonitoringSystem]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.metabolicAnalytics]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.continuousGlucoseCommandCenter]: 'src/pages/tools/EndocrineMetabolicAssistantPage.jsx',
  [REGISTRY.seizureAssistant]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.strokeWorkflowAssistant]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.headacheRedFlagAssistant]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.vertigoHintsAssistant]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.neuroExamAssistant]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.neuroTelemetryDashboard]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.strokeCommandCenter]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.neuroMonitoringEngine]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.eegTrendDashboard]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.neurologyTimelineAi]: 'src/pages/tools/NeurologyAssistantPage.jsx',
  [REGISTRY.pediatricSepsisAssistant]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.pregnancyWorkflowAssistant]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.neonatalAssessmentAssistant]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.obTriageAssistant]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.neonatalDashboard]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.maternalMonitoringDashboard]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.pediatricCommandCenter]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.growthTrendAnalytics]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.perinatalRiskDashboard]: 'src/pages/tools/PediatricsObgynAssistantPage.jsx',
  [REGISTRY.mentalHealthScreeningAssistant]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.suicideRiskWorkflowAssistant]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.substanceUseScreeningAssistant]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.cognitiveScreeningAssistant]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.behavioralAnalyticsDashboard]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.screeningTrendEngine]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.psychiatryMonitoringDashboard]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.crisisEscalationAuditLog]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.populationScreeningDashboard]: 'src/pages/tools/PsychiatryAssistantPage.jsx',
  [REGISTRY.giBleedWorkflowAssistant]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.liverDiseaseAssistant]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.pancreatitisWorkflowAssistant]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.giSurveillanceDashboard]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.hepaticTrendAnalytics]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.endoscopyWorkflowAssistant]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.cirrhosisMonitoringEngine]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.giCommandCenter]: 'src/pages/tools/GastroenterologyAssistantPage.jsx',
  [REGISTRY.ambientScribe]: 'src/pages/tools/AmbientScribe.jsx',
  [REGISTRY.guidelineRag]: 'src/pages/tools/GuidelineRag.jsx',
  [REGISTRY.researchEvidenceHub]: 'src/pages/ResearchEvidenceHub.jsx',
  [REGISTRY.differentialAi]: 'src/pages/tools/DifferentialAi.jsx',
  [REGISTRY.timelineAi]: 'src/pages/tools/TimelineAi.jsx',
  [REGISTRY.patientSummaryAi]: 'src/pages/tools/PatientSummaryAi.jsx',
  [REGISTRY.orderSetAi]: 'src/pages/tools/OrderSetAi.jsx',
  [REGISTRY.aiExplainability]: 'src/pages/tools/AiExplainability.jsx',
  [REGISTRY.clinicalAudit]: 'src/pages/tools/ClinicalAudit.jsx',
  [REGISTRY.clinicalDocumentationAssistant]: 'src/pages/ClinicalDocumentationAssistant.jsx',
  [REGISTRY.clinicalKnowledgeGraph]: 'src/pages/ClinicalKnowledgeGraph.jsx',
  [REGISTRY.predictiveAnalyticsDashboard]: 'src/pages/PredictiveAnalyticsDashboard.jsx',
  [REGISTRY.clinicalDecisionSupport]: 'src/pages/ClinicalDecisionSupport.jsx',
  [REGISTRY.competencyPlatform]: 'src/pages/Competencies.jsx',
  [REGISTRY.credentialingPlatform]: 'src/pages/Credentials.jsx',
  [REGISTRY.simulationSuite]: 'src/pages/MedicalSimulationSuite.jsx',
  [REGISTRY.scenarioPlayer]: 'src/pages/SimulationScenarioPlayer.jsx',
  [REGISTRY.simulationOutcomes]: 'src/pages/SimulationOutcomes.jsx',
  [REGISTRY.debriefDashboard]: 'src/pages/SimulationScenarioPlayer.jsx',
  [REGISTRY.competencyDashboard]: 'src/pages/SimulationOutcomes.jsx',
  [REGISTRY.laboratoryDashboard]: 'src/pages/LaboratoryDashboard.jsx',
  [REGISTRY.medical3dViewer]: 'src/pages/Medical3DViewer.jsx',
  [REGISTRY.calculatorRecommenderAi]: 'src/pages/tools/CalculatorRecommender.jsx',
  [REGISTRY.calculatorsHub]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.doseCalculator]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.aiGateway]: 'src/pages/Assistant.jsx',
  [REGISTRY.moeRouter]: 'src/pages/Assistant.jsx',
  [REGISTRY.aiRag]: 'src/pages/tools/GuidelineRag.jsx',
  [REGISTRY.aiArtifacts]: 'src/pages/Artifacts.jsx',
  [REGISTRY.aiMemory]: 'src/pages/MemoryDashboard.jsx',
  [REGISTRY.aiToolCalling]: 'src/pages/Assistant.jsx',
  [REGISTRY.aiTraining]: 'src/pages/TrainingDashboard.jsx',
  [REGISTRY.aiCostOptimization]: 'src/pages/CostAnalyticsDashboard.jsx',
  [REGISTRY.aiEvaluation]: 'src/pages/AiEvaluationDashboard.jsx',
  [REGISTRY.aiCommandCenter]: 'src/pages/AiCommandCenterDashboard.jsx',
  [REGISTRY.aiGovernance]: 'src/pages/platform/PlatformGovernanceWorkspace.jsx',
  [REGISTRY.aiSecurity]: 'src/pages/platform/PlatformGovernanceWorkspace.jsx',
  [REGISTRY.hospitalCommandAssistant]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.resourceAllocationAssistant]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.deviceRecommendationAssistant]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.fleetCommand]: 'src/pages/fleet/FleetDashboard.jsx',
  [REGISTRY.digitalOperationsCenter]: 'src/pages/Operations.jsx',
  [REGISTRY.fleetLiveMap]: 'src/pages/fleet/FleetLiveMap.jsx',
  [REGISTRY.predictiveMaintenance]: 'src/pages/fleet/PredictiveMaintenance.jsx',
  [REGISTRY.routeOptimizer]: 'src/pages/fleet/RouteOptimizer.jsx',
  [REGISTRY.liveTrackingMap]: 'src/pages/LiveTrackingMap.jsx',
  [REGISTRY.medicalIotDashboard]: 'src/pages/MedicalIotDashboard.jsx',
  [REGISTRY.hospitalMap]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.deviceFleetManagement]: 'src/pages/DeviceFleetManagement.jsx',
  [REGISTRY.telemetryMonitoring]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.deviceMaintenance]: 'src/pages/DeviceFleetManagement.jsx',
  [REGISTRY.hospitalOperationsCommand]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.assetTrackingDashboard]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.incidentCommandCenter]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.hospitalOperationsCockpit]: 'src/pages/HospitalMapDashboard.jsx',
  [REGISTRY.deviceBatteryIntelligence]: 'src/pages/MedicalIotDashboard.jsx',
  [REGISTRY.capacityPredictionEngine]: 'src/pages/HospitalMapDashboard.jsx',
});

const BASE_TEST_COVERAGE = Object.freeze([
  'toolInventory.test.js',
  'clinicalToolIdContract.test.js',
  'clinicalToolAliasSync.test.js',
  'medicalToolsCatalogIndex.test.js',
  'medicalExpansionCrossPackValidation.test.js',
]);

const EXECUTOR_TEST_COVERAGE = Object.freeze({
  [REGISTRY.sofaScore]: ['sofa-calculator.spec.ts', 'tool-orchestrator.spec.ts'],
  [REGISTRY.drugCheck]: ['drug-checker.spec.ts', 'tool-orchestrator.spec.ts'],
  [REGISTRY.labInterp]: ['lab-interpreter.spec.ts', 'tool-orchestrator.spec.ts'],
});

const DEFAULT_COLOR_BY_CATEGORY = Object.freeze({
  Diagnostic: '#FF6B9D',
  Calculator: '#95E1D3',
  Reference: '#A8E6CF',
  'Education & Simulation': '#7C3AED',
  Laboratory: '#0EA5A6',
  Visualization: '#2563EB',
  Fleet: '#6C8CFF',
  Other: '#94A3B8',
  'Hospital Operations': '#0EA5A6',
});

function unique(values) {
  return [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ''))];
}

function normalizeCategory(value) {
  const category = String(value || 'tool').toLowerCase();
  if (category === 'diagnostic') return 'diagnostic';
  if (category === 'calculator') return 'calculator';
  if (category === 'checker') return 'checker';
  if (category === 'interpreter') return 'interpreter';
  if (category === 'protocol') return 'protocol';
  if (category === 'reference') return 'reference';
  if (category === 'education & simulation' || category === 'simulation') return 'simulation';
  if (category === 'laboratory') return 'laboratory';
  if (category === 'visualization') return 'visualization';
  if (category === 'fleet') return 'fleet';
  if (category === 'iot') return 'iot';
  if (category === 'hospital operations' || category === 'operations') return 'hospital-operations';
  return category;
}

function presentationCategory(value) {
  const category = String(value || 'Other').toLowerCase();
  if (category === 'diagnostic' || category === 'checker' || category === 'interpreter') return 'Diagnostic';
  if (category === 'calculator') return 'Calculator';
  if (category === 'reference' || category === 'protocol') return 'Reference';
  if (category === 'simulation' || category === 'education & simulation') return 'Education & Simulation';
  if (category === 'laboratory') return 'Laboratory';
  if (category === 'visualization') return 'Visualization';
  if (category === 'fleet') return 'Fleet';
  if (category === 'iot') return 'IoT';
  if (category === 'hospital-operations') return 'Hospital Operations';
  if (category === 'clinical ai') return 'Clinical AI';
  if (category === 'documentation') return 'Documentation';
  if (category === 'governance') return 'Governance';
  if (category === 'interoperability') return 'Interoperability';
  if (category === 'patient data') return 'Patient Data';
  if (category === 'patient workspace') return 'Patient Workspace';
  return 'Other';
}

function getPatternMaps() {
  // Browser-safe metadata view. Backend keyword/parameter parity is still
  // validated by clinicalToolAliasSync/parseToolPatterns in test and doc code.
  const records = clinicalIntentTools.map((record) => ({
    toolId: record.toolId,
    toolName: record.toolName,
    category: record.category,
    keywords: [],
    requiredParameters: [],
    optionalParameters: [],
  }));
  return {
    byToolId: Object.fromEntries(records.map((record) => [record.toolId, record])),
    records,
  };
}

function registryTier(registryId) {
  if (AI_SYSTEM_REGISTRY_ID_SET.has(registryId)) return 'ai-system';
  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) return 'C';
  if (CLINICAL_TIER_C_WORKFLOW_REGISTRY_ID_SET.has(registryId)) return 'C';
  if (FLEET_TIER_A_REGISTRY_ID_SET.has(registryId)) return 'fleet-A';
  if (FLEET_TIER_B_CHAT_REGISTRY_ID_SET.has(registryId)) return 'fleet-B';
  if (HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_ID_SET.has(registryId)) return 'hospital-ops-B';
  if (LIVE_TRACKING_MAP_REGISTRY_ID_SET.has(registryId)) return 'live-map';
  if (MEDICAL_IOT_REGISTRY_ID_SET.has(registryId)) return 'medical-iot';
  if (HOSPITAL_OPERATIONS_REGISTRY_ID_SET.has(registryId)) return 'hospital-ops';
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_ID_SET.has(registryId)) return 'A';
  if (
    CLINICAL_TIER_B_CHAT_REGISTRY_ID_SET.has(registryId) ||
    CLINICAL_NLU_HUB_CHAT_REGISTRY_ID_SET.has(registryId) ||
    CLINICAL_DOSE_HUB_REGISTRY_ID_SET.has(registryId)
  ) {
    return 'B';
  }
  if (CLINICAL_AI_PAGE_REGISTRY_ID_SET.has(registryId)) return 'clinical-page';
  if (registryId === REGISTRY.calculatorsHub) return 'hub';
  return 'other';
}

function launchTypeForTier(tier, hasExecutor) {
  if (hasExecutor) return TOOL_LAUNCH_TYPES.BACKEND_BACKED;
  if (tier === 'C') return TOOL_LAUNCH_TYPES.CLINICAL_PAGE;
  if (tier === 'ai-system') return TOOL_LAUNCH_TYPES.CLINICAL_PAGE;
  if (tier === 'A') return TOOL_LAUNCH_TYPES.LOCAL_ONLY;
  if (tier === 'B' || tier === 'fleet-B' || tier === 'hospital-ops-B') return TOOL_LAUNCH_TYPES.CHAT_ASSISTED;
  if (tier === 'clinical-page') return TOOL_LAUNCH_TYPES.CLINICAL_PAGE;
  if (tier === 'fleet-A') return TOOL_LAUNCH_TYPES.FLEET_LOCAL;
  if (tier === 'live-map') return TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL;
  if (tier === 'medical-iot') return TOOL_LAUNCH_TYPES.IOT_LOCAL;
  if (tier === 'hospital-ops') return TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL;
  if (tier === 'hub') return TOOL_LAUNCH_TYPES.HUB;
  return TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED;
}

function componentFor(registryId, calculatorSlug, tier) {
  if (COMPONENT_BY_REGISTRY_ID[registryId]) return COMPONENT_BY_REGISTRY_ID[registryId];
  if (calculatorSlug || tier === 'A' || tier === 'B') return 'src/pages/tools/Calculators.jsx';
  return null;
}

function aliasesForRegistry(registryId) {
  return aliasesByRegistryId.get(registryId) || [];
}

function primaryNluForRegistry(registryId) {
  const mapped = registryToPrimaryNluToolId(registryId);
  if (mapped && mapped !== registryId) return mapped;
  const nlu = nluProfilesByRegistryId.get(registryId)?.[0];
  return nlu?.toolId || mapped || null;
}

function nluProfilesForRegistry(registryId) {
  return nluProfilesByRegistryId.get(registryId) || [];
}

function calculatorForRegistry(registryId, registryEntry) {
  return (
    builtinUiCalculatorByRegistryId.get(registryId) ||
    builtinUiCalculatorById.get(registryEntry?.initialCalc) ||
    null
  );
}

function endpointFor(orchestratorToolId, launchType) {
  if (orchestratorToolId) return `/api/tools/${orchestratorToolId}/execute`;
  if (
    launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED ||
    launchType === TOOL_LAUNCH_TYPES.CLINICAL_PAGE
  ) {
    return '/api/chat/message';
  }
  return null;
}

function clinicalIntelligenceEndpointFor(registryId) {
  if (registryId === REGISTRY.ambientScribe) {
    return '/api/clinical-intelligence/ambient-scribe/generate';
  }
  if (registryId === REGISTRY.guidelineRag) {
    return '/api/clinical-intelligence/guideline-rag/query';
  }
  if (registryId === REGISTRY.differentialAi) {
    return '/api/clinical-intelligence/differential-ai/generate';
  }
  if (registryId === REGISTRY.timelineAi) {
    return '/api/clinical-intelligence/timeline-ai/generate';
  }
  if (registryId === REGISTRY.patientSummaryAi) {
    return '/api/clinical-intelligence/patient-summary-ai/generate';
  }
  if (registryId === REGISTRY.orderSetAi) {
    return '/api/clinical-intelligence/order-set-ai/generate';
  }
  if (registryId === REGISTRY.aiExplainability) {
    return '/api/clinical-intelligence/ai-explainability/trace';
  }
  if (registryId === REGISTRY.clinicalAudit) {
    return '/api/clinical-intelligence/clinical-audit/execution-logs';
  }
  return null;
}

function permissionPolicyFor(registryId) {
  return CLINICAL_INTELLIGENCE_PERMISSION_POLICIES[registryId] || null;
}

function apiClientFor(orchestratorToolId, launchType, registryId) {
  if (orchestratorToolId) return 'src/services/clinicalOrchestratorApi.js';
  if (clinicalIntelligenceEndpointFor(registryId)) return 'src/services/clinicalIntelligenceApi.js';
  if (
    launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED ||
    launchType === TOOL_LAUNCH_TYPES.CLINICAL_PAGE
  ) {
    return 'src/services/clinicalChatService.js';
  }
  if (launchType === TOOL_LAUNCH_TYPES.FLEET_LOCAL) return 'src/services/fleetTelemetryService.js';
  if (launchType === TOOL_LAUNCH_TYPES.IOT_LOCAL) return 'src/services/medicalIotService.js';
  if (launchType === TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL) return 'src/services/hospitalMapService.js';
  return null;
}

function navigationPathFor(route, launchType, chatSeed) {
  if (chatSeed && route === TOOL_LAUNCH_PATHS.calculatorsHub) return '/assistant';
  if (launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED && chatSeed) return '/assistant';
  return route || TOOL_LAUNCH_PATHS.toolsCatalog;
}

function isCalculatorCategory(category) {
  return normalizeCategory(category) === 'calculator';
}

function surfaceForRecord(record) {
  if (record.sourceKind === 'platform-system' && record.route) return TOOL_SURFACES.PLATFORM_PAGE;
  if (record.sourceKind === 'platform' && record.route) return TOOL_SURFACES.PLATFORM_PAGE;
  if (record.sourceKind === 'platform') return TOOL_SURFACES.INTERNAL;
  if (record.launchType === TOOL_LAUNCH_TYPES.HUB) return TOOL_SURFACES.HUB;
  if (record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) return TOOL_SURFACES.CHAT_ASSISTED;
  if (record.launchType === TOOL_LAUNCH_TYPES.FLEET_LOCAL) return TOOL_SURFACES.FLEET_PAGE;
  if (record.launchType === TOOL_LAUNCH_TYPES.IOT_LOCAL) return TOOL_SURFACES.IOT_DASHBOARD;
  if (record.launchType === TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL) return TOOL_SURFACES.HOSPITAL_OPERATIONS;
  if (record.calculatorSlug || isCalculatorCategory(record.category)) return TOOL_SURFACES.CALCULATOR_FORM;
  return TOOL_SURFACES.TOOL_PAGE;
}

function isUserFacingInventoryRecord(record) {
  if (!record) return false;
  if (record.sourceKind === 'platform' && !record.catalogVisible) return false;
  if (record.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED) return false;
  if (!record.route && !record.navigationPath && !record.chatSeed) return false;
  return true;
}

const ADMIN_ONLY_PERMISSIONS = new Set([
  'CONFIGURE_SYSTEM',
  'MANAGE_USERS',
  'VIEW_AUDIT_LOGS',
  'VIEW_GOVERNANCE',
  'VIEW_AI_SECURITY',
  'VIEW_OPERATIONS',
  'VIEW_OBSERVABILITY',
  'VIEW_REVIEW_QUEUE',
  'REVIEW_CLINICAL_AI',
  'MANAGE_INCIDENTS',
]);

function isAdminOnlyPermissionPolicy(permissionPolicy) {
  return (permissionPolicy?.permissions || []).some((permission) => ADMIN_ONLY_PERMISSIONS.has(permission));
}

function lifecycleStateForRecord({
  status,
  sourceKind,
  launchType,
  executorStatus,
  permissionPolicy,
  catalogVisible,
  sidebarVisible,
  category,
  tier,
}) {
  if (!catalogVisible && !sidebarVisible) return TOOL_LIFECYCLE_STATES.ARCHIVED;
  if (isAdminOnlyPermissionPolicy(permissionPolicy)) return TOOL_LIFECYCLE_STATES.ACTIVE;
  if (status && !['active', 'hidden'].includes(status)) return TOOL_LIFECYCLE_STATES.DEPRECATED;
  if (
    launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED ||
    executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED
  ) {
    return TOOL_LIFECYCLE_STATES.DRAFT;
  }
  if (
    sourceKind === 'platform-system' ||
    launchType === TOOL_LAUNCH_TYPES.PLATFORM ||
    ['AI System', 'Hospital Operations', 'IoT'].includes(presentationCategory(category)) ||
    ['platform', 'fleet'].includes(tier)
  ) {
    return TOOL_LIFECYCLE_STATES.BETA;
  }
  return TOOL_LIFECYCLE_STATES.ACTIVE;
}

function userFacingRecordFromCanonical(record) {
  const surface = surfaceForRecord(record);
  const navigationPath = navigationPathFor(record.route, record.launchType, record.chatSeed);
  return {
    id: record.id,
    label: record.label,
    description: record.safetyCopy || record.notes || 'Clinical decision support tool',
    category: record.category,
    presentationCategory: presentationCategory(record.category),
    tags: unique([
      record.category,
      record.tier,
      record.launchType,
      surface,
      record.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED ? 'backend-backed' : null,
      record.calculatorSlug ? 'calculator' : null,
      record.chatSeed ? 'chat-assisted' : null,
    ]),
    searchText: unique([
      record.id,
      record.label,
      record.category,
      record.safetyCopy,
      record.nluToolId,
      ...(record.nluProfileIds || []),
      ...(record.aliases || []),
      record.orchestratorToolId,
    ]).join(' ').toLowerCase(),
    surface,
    tier: record.tier,
    launchType: record.launchType,
    route: record.route,
    navigationPath,
    component: record.component,
    calculatorSlug: record.calculatorSlug,
    hasDedicatedForm: Boolean(record.calculatorSlug && surface === TOOL_SURFACES.CALCULATOR_FORM),
    chatSeed: record.chatSeed,
    nluToolId: record.nluToolId,
    nluProfileIds: record.nluProfileIds || [],
    aliases: record.aliases || [],
    orchestratorToolId: record.orchestratorToolId,
    endpoint: record.endpoint,
    executorStatus: record.executorStatus,
    lifecycleState: record.lifecycleState,
    lifecycleLabel: TOOL_LIFECYCLE_LABELS[record.lifecycleState] || 'Active',
    permissionPolicy: record.permissionPolicy,
    favoriteable: true,
    workspaceFilterable: true,
    sidebarVisible: record.sidebarVisible,
    userCatalogVisible: true,
    auditRefs: {
      canonicalStatus: record.status,
      lifecycleState: record.lifecycleState,
      sourceKind: record.sourceKind,
      backendPatternId: record.backendPatternId,
      apiClient: record.apiClient,
      testCoverage: record.testCoverage,
      permissionPolicy: record.permissionPolicy,
    },
    legacy: toolRegistryById[record.id] || null,
  };
}

function auditRecordKind(record) {
  if (record.sourceKind === 'platform') {
    return record.endpoint ? AUDIT_RECORD_KINDS.PLATFORM_API : AUDIT_RECORD_KINDS.INTERNAL;
  }
  if (record.endpoint) return AUDIT_RECORD_KINDS.BACKEND_ENDPOINT;
  return AUDIT_RECORD_KINDS.LAUNCHABLE_REFERENCE;
}

function auditRecordFromCanonical(record) {
  return {
    id: record.id,
    label: record.label,
    kind: auditRecordKind(record),
    status: record.status,
    lifecycleState: record.lifecycleState,
    sourceFiles: unique([record.component, record.apiClient]),
    sourceModule: record.sourceKind,
    notes: record.notes,
    mapsTo: record.nluToolId,
    apiPath: record.endpoint,
    route: record.route,
    launchable: isUserFacingInventoryRecord(record),
    canonicalToolId: isUserFacingInventoryRecord(record) ? record.id : null,
  };
}

function sourceStatusFor({ catalogVisible, sidebarVisible, component, route }) {
  if (!catalogVisible && !sidebarVisible) return 'hidden';
  if (!component && route) return 'component-missing';
  if (!route && catalogVisible) return 'route-missing';
  return 'active';
}

function buildRecordFromRegistry(registryId, patternByToolId) {
  const registryEntry = toolRegistryById[registryId] || null;
  const platformCapability = PLATFORM_SYSTEM_CAPABILITY_BY_ID[registryId] || null;
  const usePlatformCapability =
    platformCapability && [REGISTRY.aiGovernance, REGISTRY.aiSecurity].includes(registryId);
  const tier = registryTier(registryId);
  const nluProfiles = nluProfilesForRegistry(registryId);
  const nluToolId = primaryNluForRegistry(registryId);
  const primaryNlu = nluToolId ? clinicalIntentToolById.get(nluToolId) : null;
  const pattern = nluToolId ? patternByToolId[nluToolId] : null;
  const calculator = calculatorForRegistry(registryId, registryEntry);
  const orchestratorToolId = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] || null;
  const hasExecutor = Boolean(
    orchestratorToolId && ORCHESTRATOR_REGISTERED_NLU_TOOL_ID_SET.has(orchestratorToolId)
  );
  const launchType = launchTypeForTier(tier, hasExecutor);
  const route =
    registryEntry?.path ||
    primaryNlu?.path ||
    calculator?.path ||
    (usePlatformCapability ? platformCapability?.route : null) ||
    null;
  const component =
    componentFor(registryId, calculator?.id || registryEntry?.initialCalc, tier) ||
    (usePlatformCapability
      ? platformCapability.criticality === 'P0'
        ? 'src/pages/platform/PlatformGovernanceWorkspace.jsx'
        : 'src/pages/platform/PlatformSystemPage.jsx'
      : null);
  const chatSeed = primaryNlu?.chatSeed || null;
  const clinicalIntelligenceEndpoint = clinicalIntelligenceEndpointFor(registryId);
  const endpoint =
    (usePlatformCapability ? platformCapability?.endpoint : null) ||
    clinicalIntelligenceEndpoint ||
    endpointFor(orchestratorToolId, launchType);
  const apiClient =
    (usePlatformCapability ? platformCapability?.apiClient : null) ||
    apiClientFor(orchestratorToolId, launchType, registryId);
  const permissionPolicy =
    (usePlatformCapability ? platformCapability?.permissionPolicy : null) ||
    permissionPolicyFor(registryId);
  const dto =
    registryId === REGISTRY.ambientScribe
      ? AMBIENT_SCRIBE_DTO
      : registryId === REGISTRY.guidelineRag
        ? GUIDELINE_RAG_DTO
        : registryId === REGISTRY.differentialAi
          ? DIFFERENTIAL_AI_DTO
          : registryId === REGISTRY.timelineAi
            ? TIMELINE_AI_DTO
            : registryId === REGISTRY.patientSummaryAi
              ? PATIENT_SUMMARY_AI_DTO
              : registryId === REGISTRY.orderSetAi
                ? ORDER_SET_AI_DTO
                : registryId === REGISTRY.aiExplainability
                  ? AI_EXPLAINABILITY_DTO
                  : registryId === REGISTRY.clinicalAudit
                    ? CLINICAL_AUDIT_DTO
      : orchestratorToolId
        ? EXECUTOR_DTO
        : endpoint === '/api/chat/message'
          ? CHAT_DTO
          : {};
  const catalogVisible = true;
  const sidebarVisible = Boolean(registryEntry);
  const status = sourceStatusFor({ catalogVisible, sidebarVisible, component, route });
  const executorStatus = hasExecutor
    ? TOOL_EXECUTOR_STATUS.REGISTERED
    : clinicalIntelligenceEndpoint || usePlatformCapability
      ? TOOL_EXECUTOR_STATUS.PLATFORM
      : nluToolId && NLU_PROFILE_TOOL_ID_SET.has(nluToolId)
        ? TOOL_EXECUTOR_STATUS.UNSUPPORTED
        : TOOL_EXECUTOR_STATUS.NONE;
  const lifecycleState = lifecycleStateForRecord({
    status,
    sourceKind: 'registry',
    launchType,
    executorStatus,
    permissionPolicy,
    catalogVisible,
    sidebarVisible,
    category: normalizeCategory(registryEntry?.category || primaryNlu?.category || pattern?.category),
    tier,
  });

  return {
    id: registryId,
    label: registryEntry?.name || primaryNlu?.toolName || pattern?.toolName || registryId,
    category: normalizeCategory(registryEntry?.category || primaryNlu?.category || pattern?.category),
    tier,
    status,
    lifecycleState,
    sourceKind: 'registry',
    route,
    component,
    launchType,
    catalogVisible,
    sidebarVisible,
    calculatorSlug: calculator?.id || registryEntry?.initialCalc || null,
    fallbackRoute: navigationPathFor(route, launchType, chatSeed),
    navigationPath: navigationPathFor(route, launchType, chatSeed),
    nluToolId,
    nluProfileIds: unique(nluProfiles.map((row) => row.toolId)),
    aliases: aliasesForRegistry(registryId),
    backendKeywords: pattern?.keywords || [],
    backendPatternId: pattern?.toolId || null,
    requiredParameters: pattern?.requiredParameters || [],
    optionalParameters: pattern?.optionalParameters || [],
    orchestratorToolId,
    endpoint,
    requestDto: dto.requestDto || null,
    responseDto: dto.responseDto || null,
    executorStatus,
    apiClient,
    permissionPolicy,
    safetyCopy: primaryNlu?.description || registryEntry?.description || null,
    chatSeed,
    testCoverage: unique([
      ...BASE_TEST_COVERAGE,
      ...(EXECUTOR_TEST_COVERAGE[registryId] || []),
      `${registryId.includes('fleet') || registryEntry?.category === 'Fleet' ? 'fleet' : 'clinical'}CatalogLaunch.test.js`,
    ]),
    riskLevel:
      hasExecutor || primaryNlu?.backendExecutable || clinicalIntelligenceEndpoint
        ? 'high'
        : launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY
          ? 'medium'
          : 'low',
    notes: unique([
      primaryNlu?.backendExecutable && !hasExecutor ? 'backendExecutable indicates NLU/chat routing only' : null,
      usePlatformCapability
        ? `Platform endpoint ${platformCapability.method || 'GET'} ${platformCapability.endpoint}`
        : null,
      nluProfiles.length > 1 ? `Shares route with ${nluProfiles.length} NLU profiles` : null,
    ]).join('; '),
  };
}

function buildPlatformRecord({
  id,
  label,
  category = 'platform',
  tier = 'platform',
  route = null,
  component = null,
  endpoint,
  apiClient,
  requestDto = null,
  responseDto = null,
  permissionPolicy = null,
  safetyCopy = null,
  chatSeed = null,
  testCoverage = ['backendFrontendExposure.test.js', 'clinicalToolsApi.test.js'],
  riskLevel = 'low',
  notes,
  catalogVisible = false,
  sourceKind = 'platform',
}) {
  const status = 'active';
  const executorStatus = TOOL_EXECUTOR_STATUS.PLATFORM;
  const sidebarVisible = false;
  const lifecycleState = lifecycleStateForRecord({
    status,
    sourceKind,
    launchType: TOOL_LAUNCH_TYPES.PLATFORM,
    executorStatus,
    permissionPolicy,
    catalogVisible,
    sidebarVisible,
    category,
    tier,
  });
  return {
    id,
    label,
    category,
    tier,
    status,
    lifecycleState,
    sourceKind,
    route,
    component,
    launchType: TOOL_LAUNCH_TYPES.PLATFORM,
    catalogVisible,
    sidebarVisible,
    calculatorSlug: null,
    fallbackRoute: route,
    navigationPath: route,
    nluToolId: null,
    nluProfileIds: [],
    aliases: [],
    backendKeywords: [],
    backendPatternId: null,
    requiredParameters: [],
    optionalParameters: [],
    orchestratorToolId: null,
    endpoint,
    requestDto,
    responseDto,
    executorStatus,
    apiClient,
    permissionPolicy,
    safetyCopy,
    chatSeed,
    testCoverage,
    riskLevel,
    notes,
  };
}

function buildPlatformRecords() {
  const toolsList = FRONTEND_API_CALLS.find((call) => call.id === 'tools-list');
  const executorCatalog = BACKEND_HTTP_ROUTES.find((route) => route.path === '/api/tools/catalog/executors');
  return [
    buildPlatformRecord({
      id: 'tools-list-api',
      label: 'List orchestrator tools',
      endpoint: toolsList?.path || '/api/tools',
      apiClient: 'src/services/clinicalToolsApi.js',
      responseDto: 'ToolListDto',
      notes: 'Catalog executor panel and backend availability check.',
    }),
    buildPlatformRecord({
      id: 'tools-executor-catalog-api',
      label: 'Tool executor catalog',
      endpoint: executorCatalog?.path || '/api/tools/catalog/executors',
      apiClient: 'src/services/clinicalToolsApi.js',
      responseDto: 'Executor catalog snapshot',
      notes: 'Documents registered, unsupported, and aliased backend executor ids.',
    }),
    buildPlatformRecord({
      id: 'tools-share-results',
      label: 'Share tool results',
      endpoint: '/api/tools/share-results',
      apiClient: 'src/components/tools/ToolResultShare.jsx',
      requestDto: 'Undocumented share payload',
      notes: 'Capability-gated frontend call; no Nest route today.',
    }),
    ...PLATFORM_SYSTEM_CAPABILITIES.filter(
      (capability) => !ALL_REGISTRY_TOOL_ID_ORDER.has(capability.id)
    ).map((capability) =>
      buildPlatformRecord({
        id: capability.id,
        label: capability.name,
        category: capability.category,
        tier: capability.tier,
        route: capability.route,
        component:
          capability.criticality === 'P0'
            ? 'src/pages/platform/PlatformGovernanceWorkspace.jsx'
            : 'src/pages/platform/PlatformSystemPage.jsx',
        endpoint: capability.endpoint,
        apiClient: capability.apiClient,
        requestDto: capability.requestDto,
        responseDto: capability.responseDto,
        permissionPolicy: capability.permissionPolicy,
        safetyCopy: capability.summary,
        chatSeed: capability.chatSeed || null,
        testCoverage: capability.testCoverage,
        riskLevel: capability.permissionPolicy?.permissions?.includes('READ_PHI') ? 'high' : 'medium',
        notes: capability.safetyCopy,
        catalogVisible: true,
        sourceKind: 'platform',
      })
    ),
  ];
}

export function buildCanonicalToolInventory() {
  const { byToolId: patternByToolId } = getPatternMaps();
  const records = ALL_REGISTRY_TOOL_IDS.map((registryId) =>
    buildRecordFromRegistry(registryId, patternByToolId)
  );

  records.push(...buildPlatformRecords());
  records.push(...buildPluginInventoryRecords(PLUGIN_REGISTRY));

  return records.sort((a, b) => {
    const ak = `${a.sourceKind}:${a.label}:${a.id}`;
    const bk = `${b.sourceKind}:${b.label}:${b.id}`;
    return ak.localeCompare(bk);
  });
}

export function getCanonicalToolInventory() {
  if (!cachedInventory) {
    cachedInventory = buildCanonicalToolInventory();
  }
  return cachedInventory;
}

export function getToolInventoryById(records = getCanonicalToolInventory()) {
  if (records === cachedInventory && cachedInventoryById) {
    return cachedInventoryById;
  }
  const byId = Object.fromEntries(records.map((record) => [record.id, record]));
  if (records === cachedInventory) {
    cachedInventoryById = byId;
  }
  return byId;
}

export function resolveToolInventoryRecord(id, records = getCanonicalToolInventory()) {
  if (!id) return null;
  const byId = getToolInventoryById(records);
  if (byId[id]) return byId[id];
  const registryId = NLU_TO_REGISTRY_ID[id] || ORCHESTRATOR_TO_REGISTRY_ID[id] || null;
  if (registryId) return byId[registryId] || null;
  return records.find((record) => (record.aliases || []).includes(id)) || null;
}

export function getCatalogToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.catalogVisible);
}

export function getSidebarToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.sidebarVisible);
}

export function getUserFacingToolInventory(records = getCanonicalToolInventory()) {
  if (records === cachedInventory && cachedUserFacingInventory) {
    return cachedUserFacingInventory;
  }
  const userFacing = records
    .filter(isUserFacingInventoryRecord)
    .map(userFacingRecordFromCanonical)
    .sort((a, b) => {
      const categoryCompare = a.presentationCategory.localeCompare(b.presentationCategory);
      if (categoryCompare !== 0) return categoryCompare;
      return a.label.localeCompare(b.label);
    });
  if (records === cachedInventory) {
    cachedUserFacingInventory = userFacing;
  }
  return userFacing;
}

export function getCalculatorToolInventory(records = getCanonicalToolInventory()) {
  return getUserFacingToolInventory(records)
    .filter((record) => {
      if (record.surface === TOOL_SURFACES.HUB) return false;
      return record.presentationCategory === 'Calculator' || record.category === 'calculator';
    })
    .sort((a, b) => {
      if (a.hasDedicatedForm !== b.hasDedicatedForm) return a.hasDedicatedForm ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

export function getAuditToolInventory(records = getCanonicalToolInventory()) {
  return records
    .map(auditRecordFromCanonical)
    .sort((a, b) => `${a.kind}:${a.label}`.localeCompare(`${b.kind}:${b.label}`));
}

export function getSidebarToolRegistryProjection(records = getCanonicalToolInventory()) {
  if (records === cachedInventory && cachedSidebarToolRegistryProjection) {
    return cachedSidebarToolRegistryProjection;
  }
  const projection = getSidebarToolInventory(records)
    .map((record) => {
      const legacy = toolRegistryById[record.id] || {};
      const category = legacy.category || presentationCategory(record.category);
      return {
        ...legacy,
        id: record.id,
        name: record.label || legacy.name || record.id,
        path: record.route || legacy.path || record.fallbackRoute || TOOL_LAUNCH_PATHS.toolsCatalog,
        color: legacy.color || DEFAULT_COLOR_BY_CATEGORY[category] || DEFAULT_COLOR_BY_CATEGORY.Other,
        description: record.safetyCopy || legacy.description || 'Clinical decision support tool',
        shortcut: legacy.shortcut || null,
        category,
        features: legacy.features || [],
        useCases: legacy.useCases || [],
        panelTool:
          legacy.panelTool ||
          (record.calculatorSlug && record.id !== REGISTRY.calculatorsHub ? REGISTRY.calculatorsHub : undefined),
        initialCalc: legacy.initialCalc || record.calculatorSlug || undefined,
        canonicalInventoryId: record.id,
        launchType: record.launchType,
        tier: record.tier,
        nluToolId: record.nluToolId,
        executorStatus: record.executorStatus,
        lifecycleState: record.lifecycleState,
        lifecycleLabel: TOOL_LIFECYCLE_LABELS[record.lifecycleState] || 'Active',
      };
    })
    .sort(
      (a, b) =>
        (ALL_REGISTRY_TOOL_ID_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (ALL_REGISTRY_TOOL_ID_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  if (records === cachedInventory) {
    cachedSidebarToolRegistryProjection = projection;
  }
  return projection;
}

export function getUserFacingToolRegistryProjection(records = getCanonicalToolInventory()) {
  if (records === cachedInventory && cachedUserFacingToolRegistryProjection) {
    return cachedUserFacingToolRegistryProjection;
  }
  const projection = getUserFacingToolInventory(records).map((record) => {
    const legacy = record.legacy || {};
    const category = legacy.category || record.presentationCategory;
    return enrichToolWithSegmentation({
      ...legacy,
      id: record.id,
      name: record.label || legacy.name || record.id,
      path: record.route || record.navigationPath || legacy.path || TOOL_LAUNCH_PATHS.toolsOverview,
      color: legacy.color || DEFAULT_COLOR_BY_CATEGORY[category] || DEFAULT_COLOR_BY_CATEGORY.Other,
      description: record.description || legacy.description || 'Clinical decision support tool',
      shortcut: legacy.shortcut || null,
      category,
      features: legacy.features || [],
      useCases: legacy.useCases || [],
      panelTool:
        legacy.panelTool ||
        (record.calculatorSlug && record.id !== REGISTRY.calculatorsHub ? REGISTRY.calculatorsHub : undefined),
      initialCalc: legacy.initialCalc || record.calculatorSlug || undefined,
      canonicalInventoryId: record.id,
      launchType: record.launchType,
      surface: record.surface,
      tier: record.tier,
      nluToolId: record.nluToolId,
      executorStatus: record.executorStatus,
      lifecycleState: record.lifecycleState,
      lifecycleLabel: TOOL_LIFECYCLE_LABELS[record.lifecycleState] || 'Active',
      permissionPolicy: record.permissionPolicy,
      aliases: record.aliases || [],
      endpoint: record.endpoint,
      clinicalRiskLevel: record.riskLevel,
      userCatalogVisible: record.userCatalogVisible,
      workspaceFilterable: record.workspaceFilterable,
      favoriteable: record.favoriteable,
      searchText: record.searchText,
    });
  })
    .sort(
      (a, b) =>
        (ALL_REGISTRY_TOOL_ID_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (ALL_REGISTRY_TOOL_ID_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  if (records === cachedInventory) {
    cachedUserFacingToolRegistryProjection = projection;
  }
  return projection;
}

export function getEntitlementFilteredUserFacingToolRegistryProjection(
  records = getCanonicalToolInventory(),
  context = getPlatformEntitlementContext()
) {
  return filterToolsByEntitlements(getUserFacingToolRegistryProjection(records), context);
}

export function getBackendBackedToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED);
}

export function getFrontendVisibleToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.catalogVisible || record.sidebarVisible || record.route);
}

export function findInventoryRecordsByEndpoint(endpoint, records = getCanonicalToolInventory()) {
  if (!endpoint) return [];
  return records.filter((record) => record.endpoint === endpoint);
}

export function inventoryEndpointExists(record) {
  if (!record.endpoint || record.endpoint === '/api/chat/message') return true;
  return Boolean(findBackendRoute('GET', record.endpoint) || findBackendRoute('POST', record.endpoint));
}

export function getCanonicalToolInventoryDocument(records = getCanonicalToolInventory()) {
  const statusCounts = records.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {});
  const launchTypeCounts = records.reduce((acc, record) => {
    acc[record.launchType] = (acc[record.launchType] || 0) + 1;
    return acc;
  }, {});
  const lifecycleCounts = records.reduce((acc, record) => {
    acc[record.lifecycleState] = (acc[record.lifecycleState] || 0) + 1;
    return acc;
  }, {});

  return {
    version: TOOL_INVENTORY_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRecords: records.length,
      frontendVisible: getFrontendVisibleToolInventory(records).length,
      catalogVisible: getCatalogToolInventory(records).length,
      sidebarVisible: getSidebarToolInventory(records).length,
      backendBacked: getBackendBackedToolInventory(records).length,
      statusCounts,
      launchTypeCounts,
      lifecycleCounts,
    },
    records,
  };
}

function mdCell(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function formatCanonicalToolInventoryMarkdown(doc = getCanonicalToolInventoryDocument()) {
  const lines = [
    '# Canonical tool inventory',
    '',
    `Generated: ${doc.generatedAt}`,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Total records | ${doc.summary.totalRecords} |`,
    `| Frontend-visible records | ${doc.summary.frontendVisible} |`,
    `| Catalog-visible records | ${doc.summary.catalogVisible} |`,
    `| Sidebar-visible records | ${doc.summary.sidebarVisible} |`,
    `| Backend-backed executors | ${doc.summary.backendBacked} |`,
    '',
    '## Inventory',
    '',
    '| ID | Label | Category | Tier | Launch type | Route | Component | NLU | Executor | Endpoint | API client |',
    '|----|-------|----------|------|-------------|-------|-----------|-----|----------|----------|------------|',
  ];

  for (const record of doc.records) {
    lines.push(
      `| ${mdCell(record.id)} | ${mdCell(record.label)} | ${mdCell(record.category)} | ${mdCell(record.tier)} | ${mdCell(record.launchType)} | ${mdCell(record.route)} | ${mdCell(record.component)} | ${mdCell(record.nluToolId)} | ${mdCell(record.executorStatus)} | ${mdCell(record.endpoint)} | ${mdCell(record.apiClient)} |`
    );
  }

  lines.push('');
  return lines.join('\n');
}
