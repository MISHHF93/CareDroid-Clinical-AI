import { readAIPlatformConfig } from '../lib/ai/config';
import { CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH } from '../config/careDroidUnifiedAiNode.config';
import {
  CARE_DROID_UNIFIED_AI_NODE_ID,
  EXPECTED_PLATFORM_AI_SERVICE_COUNT,
  PLATFORM_AI_SERVICE_NODE_MAP,
} from '../config/careDroidUnifiedAiNode.config';
import { CARE_DROID_AI_NODE_PATH } from '../services/careDroidAiApi';
import { REGISTRY, TOOL_LAUNCH_PATHS } from './clinicalToolIdContract';

const PLATFORM_SERVICE_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  copilot: TOOL_LAUNCH_PATHS.assistant,
  smartIntakeVerification: TOOL_LAUNCH_PATHS.operationsCenter,
  referralSummarization: TOOL_LAUNCH_PATHS.research,
  analyticsExplanation: TOOL_LAUNCH_PATHS.aiCommandCenter,
  clinicalWorkflowLauncher: TOOL_LAUNCH_PATHS.clinicalDecisionSupport,
  calculatorExplanation: TOOL_LAUNCH_PATHS.calculatorsHub,
  smartHandover: TOOL_LAUNCH_PATHS.documentation,
  protocolTrigger: TOOL_LAUNCH_PATHS.protocols,
  deteriorationPrediction: TOOL_LAUNCH_PATHS.predictiveAnalytics,
  dischargePrediction: TOOL_LAUNCH_PATHS.operationsCenter,
  admissionPrediction: TOOL_LAUNCH_PATHS.operationsCenter,
  triageSupport: TOOL_LAUNCH_PATHS.operationsCenter,
  ambientDocumentation: TOOL_LAUNCH_PATHS.documentation,
  textMining: TOOL_LAUNCH_PATHS.research,
  mohPatientMatching: TOOL_LAUNCH_PATHS.operationsCenter,
  federatedEmsTriage: TOOL_LAUNCH_PATHS.liveTrackingMap,
  edgeAmbulance: TOOL_LAUNCH_PATHS.fleetCommand,
});

const PLATFORM_SERVICE_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  copilot: [REGISTRY.aiGateway, REGISTRY.aiCommandCenter],
  smartIntakeVerification: [REGISTRY.hospitalCommandAssistant],
  referralSummarization: [REGISTRY.researchEvidenceHub],
  analyticsExplanation: [REGISTRY.aiCommandCenter, REGISTRY.aiRag],
  clinicalWorkflowLauncher: [REGISTRY.aiToolCalling, REGISTRY.protocols],
  calculatorExplanation: [REGISTRY.calculatorRecommenderAi, REGISTRY.aiToolCalling],
  smartHandover: [REGISTRY.clinicalDocumentationAssistant],
  protocolTrigger: [REGISTRY.aiGovernance, REGISTRY.protocols],
  deteriorationPrediction: [REGISTRY.predictiveAnalyticsDashboard, REGISTRY.aiSecurity],
  dischargePrediction: [REGISTRY.hospitalCommandAssistant],
  admissionPrediction: [REGISTRY.hospitalCommandAssistant],
  triageSupport: [REGISTRY.hospitalCommandAssistant],
  ambientDocumentation: [REGISTRY.aiMemory, REGISTRY.clinicalDocumentationAssistant],
  textMining: [REGISTRY.aiArtifacts, REGISTRY.aiRag],
  mohPatientMatching: [REGISTRY.hospitalCommandAssistant],
  federatedEmsTriage: [REGISTRY.liveTrackingMap],
  edgeAmbulance: [REGISTRY.fleetCommand],
});

function buildPlatformAiModelRegistry() {
  const platformConfig = readAIPlatformConfig();
  const serviceIds = Object.keys(platformConfig.services).sort();

  return Object.freeze(
    serviceIds.map((serviceId) => {
      const service = platformConfig.services[serviceId];
      const nodeCapability = PLATFORM_AI_SERVICE_NODE_MAP[serviceId];
      const slug = nodeCapability?.id || serviceId.replace(/([A-Z])/g, '-$1').toLowerCase();

      return Object.freeze({
        modelId: slug,
        platformServiceId: serviceId,
        unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
        nodeRoute: CARE_DROID_AI_NODE_PATH,
        name: service.name,
        purpose: service.purpose,
        input: `Governed ${service.name} request with tenant, role, workspace, and safety context.`,
        output: 'Structured or conversational AI output routed through CareDroidUnifiedAINode.',
        artifactDependencies: PLATFORM_SERVICE_DEPENDENCIES[serviceId] || [REGISTRY.aiCommandCenter],
        status: service.status,
        costProfile: service.provider === 'local' ? 'local-only' : 'metered-generation',
        riskLevel: service.riskLevel,
        owner: service.owner,
        route: PLATFORM_SERVICE_ROUTES[serviceId] || TOOL_LAUNCH_PATHS.aiCommandCenter,
        channel: nodeCapability?.channel || 'structured',
      });
    }),
  );
}

/** 17 governed platform AI services — one node, one registry. */
export const PLATFORM_AI_MODEL_REGISTRY = buildPlatformAiModelRegistry();

/** Infrastructure/router models that facet the unified node (gateway, MoE, RAG, etc.). */
export const AI_INFRASTRUCTURE_MODEL_REGISTRY = Object.freeze([
  Object.freeze({
    modelId: 'ai-gateway',
    name: 'AI Gateway',
    purpose: 'Routes governed AI requests across assistant, RAG, tool, memory, cost, and evaluation services.',
    input: 'Clinical or operational request with tenant, role, workspace, and safety context.',
    output: 'Routed AI response plan with safety scope, model class, tool options, and audit metadata.',
    artifactDependencies: [REGISTRY.aiGateway, REGISTRY.aiCommandCenter, REGISTRY.aiEvaluation],
    status: 'active',
    costProfile: 'metered-router',
    riskLevel: 'high',
    owner: 'AI Platform',
    route: TOOL_LAUNCH_PATHS.aiCommandCenter,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'moe-router',
    name: 'MoE Router',
    purpose: 'Selects expert model or workflow classes for clinical and operations requests.',
    input: 'Intent, specialty, urgency, workspace, safety constraints, and model availability.',
    output: 'Expert routing decision and fallback plan.',
    artifactDependencies: [REGISTRY.moeRouter, REGISTRY.aiTraining, REGISTRY.aiEvaluation],
    status: 'active',
    costProfile: 'adaptive',
    riskLevel: 'high',
    owner: 'AI Platform',
    route: TOOL_LAUNCH_PATHS.aiCommandCenter,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'rag-evidence-engine',
    name: 'RAG Evidence Engine',
    purpose: 'Retrieves and cites clinical evidence for assistant and guideline workflows.',
    input: 'Clinical query, specialty, patient-safe context, retrieval constraints, and source filters.',
    output: 'Cited evidence summary with source snippets and confidence metadata.',
    artifactDependencies: [REGISTRY.aiRag, REGISTRY.guidelineRag, REGISTRY.researchEvidenceHub],
    status: 'active',
    costProfile: 'retrieval-plus-generation',
    riskLevel: 'high',
    owner: 'CareDroid',
    route: TOOL_LAUNCH_PATHS.research,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'tool-calling',
    name: 'Tool Calling',
    purpose: 'Maps assistant intents to deterministic tools, calculators, executors, or guided-chat fallbacks.',
    input: 'NLU intent, normalized tool id, parameters, role, workspace, and entitlement context.',
    output: 'Tool launch, executor request, validation result, or guarded fallback prompt.',
    artifactDependencies: [REGISTRY.aiToolCalling, REGISTRY.calculatorRecommenderAi, REGISTRY.sofaScore],
    status: 'active',
    costProfile: 'low',
    riskLevel: 'high',
    owner: 'Clinical Tooling',
    route: TOOL_LAUNCH_PATHS.toolsOverview,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'artifact-resonance',
    name: 'Artifact Resonance',
    purpose: 'Finds related artifacts and recommendations using local metadata features and text similarity.',
    input: 'Artifact id, role, workspace, pack id, or normalized text query.',
    output: 'Related artifacts, orphan/duplicate/missing-metadata findings, and recommendation scores.',
    artifactDependencies: ['caredroid_artifacts.csv', 'caredroid_artifact_features.csv'],
    status: 'local-ready',
    costProfile: 'local-only',
    riskLevel: 'medium',
    owner: 'Artifact Intelligence',
    route: '/artifacts',
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'simulation-tutor',
    name: 'Simulation Tutor',
    purpose: 'Guides simulation scenarios, debriefing, competency review, and education recommendations.',
    input: 'Scenario state, learner role, decisions, vitals, labs, and competency objectives.',
    output: 'Tutor hints, debrief feedback, competency gaps, and next practice recommendations.',
    artifactDependencies: [REGISTRY.simulationSuite, REGISTRY.scenarioPlayer, REGISTRY.debriefDashboard],
    status: 'demo-ready',
    costProfile: 'local-demo-plus-ai',
    riskLevel: 'medium',
    owner: 'Education Platform',
    route: TOOL_LAUNCH_PATHS.simulation,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'cost-optimizer',
    name: 'Cost Optimizer',
    purpose: 'Summarizes AI spend, token usage, tool cost, and routing opportunities.',
    input: 'Usage events, model class, execution cost, route, workspace, and tenant budget thresholds.',
    output: 'Cost trends, optimization suggestions, and budget risk signals.',
    artifactDependencies: [REGISTRY.aiCostOptimization, REGISTRY.aiCommandCenter],
    status: 'active',
    costProfile: 'savings-oriented',
    riskLevel: 'medium',
    owner: 'AI Operations',
    route: TOOL_LAUNCH_PATHS.costs,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'guardrails',
    name: 'Guardrails',
    purpose: 'Applies safety, PHI, role, entitlement, and clinical decision-support boundaries.',
    input: 'Prompt, role, permissions, tenant policy, artifact risk, and tool execution context.',
    output: 'Allowed action, blocked action, warning, audit note, or human-review requirement.',
    artifactDependencies: [REGISTRY.aiSecurity, REGISTRY.aiGovernance, REGISTRY.clinicalAudit],
    status: 'active',
    costProfile: 'local-policy',
    riskLevel: 'critical',
    owner: 'Clinical Safety Board',
    route: TOOL_LAUNCH_PATHS.aiGovernance,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
  Object.freeze({
    modelId: 'evaluation',
    name: 'Evaluation',
    purpose: 'Tracks model quality, hallucination risk, retrieval quality, latency, cost, and tool success.',
    input: 'Evaluation run, dataset label, model candidate, retrieval result, tool result, and user feedback.',
    output: 'Quality metrics, benchmark trends, issue flags, and readiness evidence.',
    artifactDependencies: [REGISTRY.aiEvaluation, REGISTRY.aiCommandCenter],
    status: 'active',
    costProfile: 'benchmark-metered',
    riskLevel: 'high',
    owner: 'AI Quality',
    route: TOOL_LAUNCH_PATHS.aiEvaluation,
    unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    nodeRoute: CARE_DROID_AI_NODE_PATH,
  }),
]);

/** Primary registry: 17 platform AI features routed through CareDroidUnifiedAINode. */
export const AI_MODEL_REGISTRY = PLATFORM_AI_MODEL_REGISTRY;

export function getAiModelRegistry() {
  return AI_MODEL_REGISTRY;
}

export function getPlatformAiModelRegistry() {
  return PLATFORM_AI_MODEL_REGISTRY;
}

export function getInfrastructureAiModelRegistry() {
  return AI_INFRASTRUCTURE_MODEL_REGISTRY;
}

export function getAiModelById(modelId) {
  return (
    AI_MODEL_REGISTRY.find((model) => model.modelId === modelId) ||
    AI_INFRASTRUCTURE_MODEL_REGISTRY.find((model) => model.modelId === modelId) ||
    null
  );
}

export function assertPlatformAiModelRegistryAlignment() {
  const issues: string[] = [];
  if (PLATFORM_AI_MODEL_REGISTRY.length !== EXPECTED_PLATFORM_AI_SERVICE_COUNT) {
    issues.push(
      `Expected ${EXPECTED_PLATFORM_AI_SERVICE_COUNT} platform AI models, found ${PLATFORM_AI_MODEL_REGISTRY.length}`,
    );
  }
  for (const model of PLATFORM_AI_MODEL_REGISTRY) {
    if (model.unifiedNodeId !== CARE_DROID_UNIFIED_AI_NODE_ID) {
      issues.push(`Model "${model.modelId}" is not bound to ${CARE_DROID_UNIFIED_AI_NODE_ID}`);
    }
    if (model.nodeRoute !== CARE_DROID_AI_NODE_PATH) {
      issues.push(`Model "${model.modelId}" must route through ${CARE_DROID_AI_NODE_PATH}`);
    }
    if (!PLATFORM_AI_SERVICE_NODE_MAP[model.platformServiceId]) {
      issues.push(`Model "${model.modelId}" missing unified node capability mapping`);
    }
  }
  return { ok: issues.length === 0, issues };
}