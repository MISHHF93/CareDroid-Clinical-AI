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
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  CLINICAL_DOSE_HUB_REGISTRY_IDS,
  CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS,
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
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

export const TOOL_INVENTORY_VERSION = 1;

let cachedInventory = null;
let cachedInventoryById = null;

export const TOOL_LAUNCH_TYPES = Object.freeze({
  LOCAL_ONLY: 'local-only',
  CHAT_ASSISTED: 'chat-assisted',
  BACKEND_BACKED: 'backend-backed',
  CLINICAL_PAGE: 'clinical-page',
  FLEET_LOCAL: 'fleet-local',
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
  HUB: 'hub',
  INTERNAL: 'internal',
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
  [REGISTRY.ambientScribe]: 'src/pages/tools/AmbientScribe.jsx',
  [REGISTRY.guidelineRag]: 'src/pages/tools/GuidelineRag.jsx',
  [REGISTRY.differentialAi]: 'src/pages/tools/DifferentialAi.jsx',
  [REGISTRY.timelineAi]: 'src/pages/tools/TimelineAi.jsx',
  [REGISTRY.patientSummaryAi]: 'src/pages/tools/PatientSummaryAi.jsx',
  [REGISTRY.orderSetAi]: 'src/pages/tools/OrderSetAi.jsx',
  [REGISTRY.aiExplainability]: 'src/pages/tools/AiExplainability.jsx',
  [REGISTRY.clinicalAudit]: 'src/pages/tools/ClinicalAudit.jsx',
  [REGISTRY.calculatorRecommenderAi]: 'src/pages/tools/CalculatorRecommender.jsx',
  [REGISTRY.calculatorsHub]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.doseCalculator]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.fleetCommand]: 'src/pages/fleet/FleetDashboard.jsx',
  [REGISTRY.predictiveMaintenance]: 'src/pages/fleet/PredictiveMaintenance.jsx',
  [REGISTRY.routeOptimizer]: 'src/pages/fleet/RouteOptimizer.jsx',
});

const BASE_TEST_COVERAGE = Object.freeze([
  'toolInventory.test.js',
  'clinicalToolIdContract.test.js',
  'clinicalToolAliasSync.test.js',
  'medicalToolsCatalogIndex.test.js',
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
  Fleet: '#6C8CFF',
  Other: '#94A3B8',
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
  if (category === 'fleet') return 'fleet';
  return category;
}

function presentationCategory(value) {
  const category = String(value || 'Other').toLowerCase();
  if (category === 'diagnostic' || category === 'checker' || category === 'interpreter') return 'Diagnostic';
  if (category === 'calculator') return 'Calculator';
  if (category === 'reference' || category === 'protocol') return 'Reference';
  if (category === 'fleet') return 'Fleet';
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
  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) return 'C';
  if (CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS.includes(registryId)) return 'C';
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) return 'fleet-A';
  if (FLEET_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) return 'fleet-B';
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId)) return 'A';
  if (
    CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId) ||
    CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS.includes(registryId) ||
    CLINICAL_DOSE_HUB_REGISTRY_IDS.includes(registryId)
  ) {
    return 'B';
  }
  if (CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId)) return 'clinical-page';
  if (registryId === REGISTRY.calculatorsHub) return 'hub';
  return 'other';
}

function launchTypeForTier(tier, hasExecutor) {
  if (hasExecutor) return TOOL_LAUNCH_TYPES.BACKEND_BACKED;
  if (tier === 'C') return TOOL_LAUNCH_TYPES.BACKEND_BACKED;
  if (tier === 'A') return TOOL_LAUNCH_TYPES.LOCAL_ONLY;
  if (tier === 'B' || tier === 'fleet-B') return TOOL_LAUNCH_TYPES.CHAT_ASSISTED;
  if (tier === 'clinical-page') return TOOL_LAUNCH_TYPES.CLINICAL_PAGE;
  if (tier === 'fleet-A') return TOOL_LAUNCH_TYPES.FLEET_LOCAL;
  if (tier === 'hub') return TOOL_LAUNCH_TYPES.HUB;
  return TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED;
}

function componentFor(registryId, calculatorSlug, tier) {
  if (COMPONENT_BY_REGISTRY_ID[registryId]) return COMPONENT_BY_REGISTRY_ID[registryId];
  if (calculatorSlug || tier === 'A' || tier === 'B') return 'src/pages/tools/Calculators.jsx';
  return null;
}

function aliasesForRegistry(registryId) {
  return Object.entries(NLU_TO_REGISTRY_ID)
    .filter(([, target]) => target === registryId)
    .map(([alias]) => alias)
    .sort();
}

function primaryNluForRegistry(registryId) {
  const mapped = registryToPrimaryNluToolId(registryId);
  if (mapped && mapped !== registryId) return mapped;
  const nlu = clinicalIntentTools.find((row) => row.sidebarToolId === registryId || row.toolId === registryId);
  return nlu?.toolId || mapped || null;
}

function nluProfilesForRegistry(registryId) {
  return clinicalIntentTools.filter((row) => row.sidebarToolId === registryId || row.toolId === registryId);
}

function calculatorForRegistry(registryId, registryEntry) {
  return (
    builtinUiCalculators.find((calc) => BUILTIN_CALC_ID_TO_REGISTRY_ID[calc.id] === registryId) ||
    builtinUiCalculators.find((calc) => calc.id === registryEntry?.initialCalc) ||
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
  return null;
}

function navigationPathFor(route, launchType, chatSeed) {
  if (chatSeed && route === TOOL_LAUNCH_PATHS.calculatorsHub) return '/dashboard';
  if (launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED && chatSeed) return '/dashboard';
  return route || TOOL_LAUNCH_PATHS.toolsCatalog;
}

function isCalculatorCategory(category) {
  return normalizeCategory(category) === 'calculator';
}

function surfaceForRecord(record) {
  if (record.sourceKind === 'platform') return TOOL_SURFACES.INTERNAL;
  if (record.launchType === TOOL_LAUNCH_TYPES.HUB) return TOOL_SURFACES.HUB;
  if (record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) return TOOL_SURFACES.CHAT_ASSISTED;
  if (record.launchType === TOOL_LAUNCH_TYPES.FLEET_LOCAL) return TOOL_SURFACES.FLEET_PAGE;
  if (record.calculatorSlug || isCalculatorCategory(record.category)) return TOOL_SURFACES.CALCULATOR_FORM;
  return TOOL_SURFACES.TOOL_PAGE;
}

function isUserFacingInventoryRecord(record) {
  if (!record || record.sourceKind === 'platform') return false;
  if (record.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED) return false;
  if (!record.route && !record.navigationPath && !record.chatSeed) return false;
  return true;
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
    favoriteable: true,
    workspaceFilterable: true,
    sidebarVisible: record.sidebarVisible,
    userCatalogVisible: true,
    auditRefs: {
      canonicalStatus: record.status,
      sourceKind: record.sourceKind,
      backendPatternId: record.backendPatternId,
      apiClient: record.apiClient,
      testCoverage: record.testCoverage,
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
  const tier = registryTier(registryId);
  const nluProfiles = nluProfilesForRegistry(registryId);
  const nluToolId = primaryNluForRegistry(registryId);
  const primaryNlu = nluToolId ? clinicalIntentTools.find((row) => row.toolId === nluToolId) : null;
  const pattern = nluToolId ? patternByToolId[nluToolId] : null;
  const calculator = calculatorForRegistry(registryId, registryEntry);
  const orchestratorToolId = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] || null;
  const hasExecutor = Boolean(
    orchestratorToolId && ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(orchestratorToolId)
  );
  const launchType = launchTypeForTier(tier, hasExecutor);
  const route = registryEntry?.path || primaryNlu?.path || calculator?.path || null;
  const component = componentFor(registryId, calculator?.id || registryEntry?.initialCalc, tier);
  const chatSeed = primaryNlu?.chatSeed || null;
  const clinicalIntelligenceEndpoint = clinicalIntelligenceEndpointFor(registryId);
  const endpoint = clinicalIntelligenceEndpoint || endpointFor(orchestratorToolId, launchType);
  const apiClient = apiClientFor(orchestratorToolId, launchType, registryId);
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

  return {
    id: registryId,
    label: registryEntry?.name || primaryNlu?.toolName || pattern?.toolName || registryId,
    category: normalizeCategory(registryEntry?.category || primaryNlu?.category || pattern?.category),
    tier,
    status: sourceStatusFor({ catalogVisible, sidebarVisible, component, route }),
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
    executorStatus: hasExecutor
      ? TOOL_EXECUTOR_STATUS.REGISTERED
      : clinicalIntelligenceEndpoint
        ? TOOL_EXECUTOR_STATUS.PLATFORM
        : nluToolId && NLU_PROFILE_TOOL_IDS.includes(nluToolId)
          ? TOOL_EXECUTOR_STATUS.UNSUPPORTED
          : TOOL_EXECUTOR_STATUS.NONE,
    apiClient,
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
      nluProfiles.length > 1 ? `Shares route with ${nluProfiles.length} NLU profiles` : null,
    ]).join('; '),
  };
}

function buildPlatformRecord({ id, label, endpoint, apiClient, requestDto = null, responseDto = null, notes }) {
  return {
    id,
    label,
    category: 'platform',
    tier: 'platform',
    status: 'active',
    sourceKind: 'platform',
    route: null,
    component: null,
    launchType: TOOL_LAUNCH_TYPES.PLATFORM,
    catalogVisible: false,
    sidebarVisible: false,
    calculatorSlug: null,
    fallbackRoute: null,
    navigationPath: null,
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
    executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
    apiClient,
    safetyCopy: null,
    chatSeed: null,
    testCoverage: ['backendFrontendExposure.test.js', 'clinicalToolsApi.test.js'],
    riskLevel: 'low',
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
  ];
}

export function buildCanonicalToolInventory() {
  const { byToolId: patternByToolId } = getPatternMaps();
  const records = ALL_REGISTRY_TOOL_IDS.map((registryId) =>
    buildRecordFromRegistry(registryId, patternByToolId)
  );

  records.push(...buildPlatformRecords());

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
  return registryId ? byId[registryId] || null : null;
}

export function getCatalogToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.catalogVisible);
}

export function getSidebarToolInventory(records = getCanonicalToolInventory()) {
  return records.filter((record) => record.sidebarVisible);
}

export function getUserFacingToolInventory(records = getCanonicalToolInventory()) {
  return records
    .filter(isUserFacingInventoryRecord)
    .map(userFacingRecordFromCanonical)
    .sort((a, b) => {
      const categoryCompare = a.presentationCategory.localeCompare(b.presentationCategory);
      if (categoryCompare !== 0) return categoryCompare;
      return a.label.localeCompare(b.label);
    });
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
  const order = new Map(ALL_REGISTRY_TOOL_IDS.map((id, index) => [id, index]));
  return getSidebarToolInventory(records)
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
      };
    })
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export function getUserFacingToolRegistryProjection(records = getCanonicalToolInventory()) {
  return getUserFacingToolInventory(records).map((record) => {
    const legacy = record.legacy || {};
    const category = legacy.category || record.presentationCategory;
    return {
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
      userCatalogVisible: record.userCatalogVisible,
      workspaceFilterable: record.workspaceFilterable,
      favoriteable: record.favoriteable,
      searchText: record.searchText,
    };
  });
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
