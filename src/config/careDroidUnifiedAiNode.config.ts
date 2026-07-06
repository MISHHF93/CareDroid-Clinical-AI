import { CARE_DROID_AI_INTENTS } from '../../lib/ai/careDroidAITypes';
import { readAIPlatformConfig } from '../lib/ai/config';
import { AI_SYSTEM_REGISTRY_IDS } from '../data/clinicalToolIdContract';
import { CARE_DROID_AI_NODE_PATH } from '../services/careDroidAiApi';

export type UnifiedAiNodeDomain =
  | 'intake'
  | 'triage'
  | 'alerts'
  | 'routing'
  | 'summaries'
  | 'bottlenecks'
  | 'handoffs'
  | 'operational_awareness'
  | 'copilot_chat';

export const CARE_DROID_UNIFIED_AI_NODE_ID = 'CareDroidUnifiedAINode';
export const CARE_DROID_UNIFIED_AI_NODE_VERSION = '2026.07.04';
/** ML classifier heads (intent + artifact-router) — single manifest under backend/ml-services/models/. */
export const CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH = '/api/ai/node/models';
export const EXPECTED_PLATFORM_AI_SERVICE_COUNT = 17;

export type UnifiedAiNodeChannel = 'structured' | 'conversational';

export type UnifiedAiNodeCapability = Readonly<{
  id: string;
  label: string;
  channel: UnifiedAiNodeChannel;
  domain: UnifiedAiNodeDomain;
  platformServiceId?: string;
  registryToolId?: string;
  intent?: (typeof CARE_DROID_AI_INTENTS)[number];
  requestType?: string;
  route: string;
}>;

/** 17 governed platform services aligned to the single CareDroid AI node. */
export const PLATFORM_AI_SERVICE_NODE_MAP: Readonly<Record<string, UnifiedAiNodeCapability>> =
  Object.freeze({
    copilot: {
      id: 'copilot',
      label: 'ED Copilot',
      channel: 'conversational',
      domain: 'copilot_chat',
      platformServiceId: 'copilot',
      requestType: 'COPILOT_CHAT',
      route: CARE_DROID_AI_NODE_PATH,
    },
    smartIntakeVerification: {
      id: 'smart-intake-verification',
      label: 'Smart Intake Verification',
      channel: 'structured',
      domain: 'intake',
      platformServiceId: 'smartIntakeVerification',
      intent: 'patient_intake_assist',
      route: CARE_DROID_AI_NODE_PATH,
    },
    referralSummarization: {
      id: 'referral-summarization',
      label: 'Referral Summarization',
      channel: 'conversational',
      domain: 'operational_awareness',
      platformServiceId: 'referralSummarization',
      requestType: 'REFERRAL_SUMMARY',
      route: CARE_DROID_AI_NODE_PATH,
    },
    analyticsExplanation: {
      id: 'analytics-explanation',
      label: 'Operational Analytics Explanation',
      channel: 'structured',
      domain: 'operational_awareness',
      platformServiceId: 'analyticsExplanation',
      intent: 'hospital_command_insight',
      route: CARE_DROID_AI_NODE_PATH,
    },
    clinicalWorkflowLauncher: {
      id: 'clinical-workflow-launcher',
      label: 'Clinical Workflow Launcher',
      channel: 'conversational',
      domain: 'operational_awareness',
      platformServiceId: 'clinicalWorkflowLauncher',
      requestType: 'CLINICAL_WORKFLOW',
      route: CARE_DROID_AI_NODE_PATH,
    },
    calculatorExplanation: {
      id: 'calculator-explanation',
      label: 'Calculator Explanation',
      channel: 'conversational',
      domain: 'operational_awareness',
      platformServiceId: 'calculatorExplanation',
      requestType: 'CALCULATOR_EXPLAIN',
      route: CARE_DROID_AI_NODE_PATH,
    },
    smartHandover: {
      id: 'smart-handover',
      label: 'Smart Handover',
      channel: 'structured',
      domain: 'handoffs',
      platformServiceId: 'smartHandover',
      intent: 'handoff_summary',
      route: CARE_DROID_AI_NODE_PATH,
    },
    protocolTrigger: {
      id: 'protocol-trigger',
      label: 'Protocol Auto-Trigger',
      channel: 'structured',
      domain: 'alerts',
      platformServiceId: 'protocolTrigger',
      intent: 'escalation_recommendation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    deteriorationPrediction: {
      id: 'deterioration-prediction',
      label: 'Deterioration Prediction',
      channel: 'structured',
      domain: 'alerts',
      platformServiceId: 'deteriorationPrediction',
      intent: 'critical_alert_assessment',
      route: CARE_DROID_AI_NODE_PATH,
    },
    dischargePrediction: {
      id: 'discharge-prediction',
      label: 'Discharge Prediction',
      channel: 'structured',
      domain: 'routing',
      platformServiceId: 'dischargePrediction',
      intent: 'wait_time_prediction',
      route: CARE_DROID_AI_NODE_PATH,
    },
    admissionPrediction: {
      id: 'admission-prediction',
      label: 'START-AI Admission Prediction',
      channel: 'structured',
      domain: 'routing',
      platformServiceId: 'admissionPrediction',
      intent: 'department_routing',
      route: CARE_DROID_AI_NODE_PATH,
    },
    triageSupport: {
      id: 'triage-support',
      label: 'AI Triage Assistant',
      channel: 'structured',
      domain: 'triage',
      platformServiceId: 'triageSupport',
      intent: 'triage_recommendation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    ambientDocumentation: {
      id: 'ambient-documentation',
      label: 'Ambient Clinical Documentation',
      channel: 'structured',
      domain: 'summaries',
      platformServiceId: 'ambientDocumentation',
      intent: 'patient_summary',
      route: CARE_DROID_AI_NODE_PATH,
    },
    textMining: {
      id: 'text-mining',
      label: 'Clinical Text Mining',
      channel: 'structured',
      domain: 'summaries',
      platformServiceId: 'textMining',
      intent: 'patient_summary',
      route: CARE_DROID_AI_NODE_PATH,
    },
    mohPatientMatching: {
      id: 'moh-patient-matching',
      label: 'MoH Patient Matching',
      channel: 'structured',
      domain: 'intake',
      platformServiceId: 'mohPatientMatching',
      intent: 'patient_intake_assist',
      route: CARE_DROID_AI_NODE_PATH,
    },
    federatedEmsTriage: {
      id: 'federated-ems-triage',
      label: 'Federated EMS Triage',
      channel: 'structured',
      domain: 'alerts',
      platformServiceId: 'federatedEmsTriage',
      intent: 'ems_prearrival_risk_summary',
      route: CARE_DROID_AI_NODE_PATH,
    },
    edgeAmbulance: {
      id: 'edge-ambulance',
      label: 'Edge AI Ambulance',
      channel: 'structured',
      domain: 'alerts',
      platformServiceId: 'edgeAmbulance',
      intent: 'ems_prearrival_risk_summary',
      route: CARE_DROID_AI_NODE_PATH,
    },
  });

/** 12 AI System sidebar tools as facets of the same unified node. */
export const AI_SYSTEM_TOOL_NODE_MAP: Readonly<Record<string, UnifiedAiNodeCapability>> =
  Object.freeze({
    'ai-gateway': {
      id: 'ai-gateway',
      label: 'AI Gateway',
      channel: 'conversational',
      domain: 'copilot_chat',
      registryToolId: 'ai-gateway',
      platformServiceId: 'copilot',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'moe-router': {
      id: 'moe-router',
      label: 'MoE Router',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'moe-router',
      platformServiceId: 'clinicalWorkflowLauncher',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-rag': {
      id: 'ai-rag',
      label: 'RAG Evidence Engine',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'ai-rag',
      platformServiceId: 'analyticsExplanation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-artifacts': {
      id: 'ai-artifacts',
      label: 'AI Artifacts',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'ai-artifacts',
      platformServiceId: 'textMining',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-memory': {
      id: 'ai-memory',
      label: 'AI Memory',
      channel: 'conversational',
      domain: 'summaries',
      registryToolId: 'ai-memory',
      platformServiceId: 'ambientDocumentation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-tool-calling': {
      id: 'ai-tool-calling',
      label: 'AI Tool Calling',
      channel: 'conversational',
      domain: 'copilot_chat',
      registryToolId: 'ai-tool-calling',
      platformServiceId: 'clinicalWorkflowLauncher',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-training': {
      id: 'ai-training',
      label: 'AI Training Pipeline',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'ai-training',
      platformServiceId: 'analyticsExplanation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-cost-optimization': {
      id: 'ai-cost-optimization',
      label: 'AI Cost Optimization',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'ai-cost-optimization',
      platformServiceId: 'analyticsExplanation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-evaluation': {
      id: 'ai-evaluation',
      label: 'AI Evaluation',
      channel: 'conversational',
      domain: 'operational_awareness',
      registryToolId: 'ai-evaluation',
      platformServiceId: 'analyticsExplanation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-command-center': {
      id: 'ai-command-center',
      label: 'AI Command Center',
      channel: 'structured',
      domain: 'operational_awareness',
      registryToolId: 'ai-command-center',
      platformServiceId: 'analyticsExplanation',
      intent: 'hospital_command_insight',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-governance': {
      id: 'ai-governance',
      label: 'AI Governance',
      channel: 'structured',
      domain: 'operational_awareness',
      registryToolId: 'ai-governance',
      platformServiceId: 'protocolTrigger',
      intent: 'fallback_recommendation',
      route: CARE_DROID_AI_NODE_PATH,
    },
    'ai-security': {
      id: 'ai-security',
      label: 'LLM Security',
      channel: 'structured',
      domain: 'alerts',
      registryToolId: 'ai-security',
      platformServiceId: 'protocolTrigger',
      intent: 'escalation_recommendation',
      route: CARE_DROID_AI_NODE_PATH,
    },
  });

export function buildUnifiedAiNodeContext(extra: Record<string, unknown> = {}) {
  return {
    unifiedAiNode: {
      nodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
      version: CARE_DROID_UNIFIED_AI_NODE_VERSION,
      route: CARE_DROID_AI_NODE_PATH,
      platformServiceCount: EXPECTED_PLATFORM_AI_SERVICE_COUNT,
      aiSystemToolCount: AI_SYSTEM_REGISTRY_IDS.length,
    },
    ...extra,
  };
}

export function getUnifiedAiNodeSnapshot() {
  const platformConfig = readAIPlatformConfig();
  const platformServiceIds = Object.keys(platformConfig.services).sort();
  const mappedServiceIds = Object.keys(PLATFORM_AI_SERVICE_NODE_MAP).sort();
  const aiSystemToolIds = [...AI_SYSTEM_REGISTRY_IDS].sort();
  const mappedToolIds = Object.keys(AI_SYSTEM_TOOL_NODE_MAP).sort();

  return {
    nodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
    version: CARE_DROID_UNIFIED_AI_NODE_VERSION,
    route: CARE_DROID_AI_NODE_PATH,
    intentCount: CARE_DROID_AI_INTENTS.length,
    platformServiceIds,
    mappedServiceIds,
    aiSystemToolIds,
    mappedToolIds,
    capabilities: [
      ...Object.values(PLATFORM_AI_SERVICE_NODE_MAP),
      ...Object.values(AI_SYSTEM_TOOL_NODE_MAP),
    ],
  };
}

export function resolvePlatformServiceIdForIntent(intent: string): string | undefined {
  for (const [serviceId, capability] of Object.entries(PLATFORM_AI_SERVICE_NODE_MAP)) {
    if (capability.intent === intent) {
      return serviceId;
    }
  }
  return undefined;
}

export function assertUnifiedAiNodeAlignment(): { ok: boolean; issues: string[] } {
  const platformConfig = readAIPlatformConfig();
  const issues: string[] = [];
  const platformServiceIds = Object.keys(platformConfig.services).sort();
  const mappedServiceIds = Object.keys(PLATFORM_AI_SERVICE_NODE_MAP).sort();

  if (platformServiceIds.length !== EXPECTED_PLATFORM_AI_SERVICE_COUNT) {
    issues.push(
      `Expected ${EXPECTED_PLATFORM_AI_SERVICE_COUNT} platform services, found ${platformServiceIds.length}`,
    );
  }

  for (const serviceId of platformServiceIds) {
    if (!PLATFORM_AI_SERVICE_NODE_MAP[serviceId]) {
      issues.push(`Missing unified node mapping for platform service "${serviceId}"`);
    }
  }

  for (const serviceId of mappedServiceIds) {
    if (!platformConfig.services[serviceId]) {
      issues.push(`Unified node maps unknown platform service "${serviceId}"`);
    }
    const capability = PLATFORM_AI_SERVICE_NODE_MAP[serviceId];
    if (capability.route !== CARE_DROID_AI_NODE_PATH) {
      issues.push(`Platform service "${serviceId}" must route through ${CARE_DROID_AI_NODE_PATH}`);
    }
  }

  for (const toolId of AI_SYSTEM_REGISTRY_IDS) {
    if (!AI_SYSTEM_TOOL_NODE_MAP[toolId]) {
      issues.push(`Missing unified node mapping for AI system tool "${toolId}"`);
    }
  }

  for (const [toolId, capability] of Object.entries(AI_SYSTEM_TOOL_NODE_MAP)) {
    if (capability.route !== CARE_DROID_AI_NODE_PATH) {
      issues.push(`AI system tool "${toolId}" must route through ${CARE_DROID_AI_NODE_PATH}`);
    }
    if (!capability.platformServiceId) {
      issues.push(`AI system tool "${toolId}" must bind to a platform service`);
    }
  }

  return { ok: issues.length === 0, issues };
}