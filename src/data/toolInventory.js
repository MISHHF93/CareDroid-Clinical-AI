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

const EXECUTOR_DTO = Object.freeze({
  requestDto: 'ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`)',
  responseDto: 'ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...)',
});

const CHAT_DTO = Object.freeze({
  requestDto: 'ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`)',
  responseDto: 'QueryResponse (`text`, `intentClassification`, `toolResult?`, ...)',
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
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) return 'fleet-A';
  if (FLEET_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) return 'fleet-B';
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId)) return 'A';
  if (CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) return 'B';
  if (CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId)) return 'clinical-page';
  if (registryId === REGISTRY.calculatorsHub) return 'hub';
  return 'other';
}

function launchTypeForTier(tier, hasExecutor) {
  if (hasExecutor) return TOOL_LAUNCH_TYPES.BACKEND_BACKED;
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

function apiClientFor(orchestratorToolId, launchType) {
  if (orchestratorToolId) return 'src/services/clinicalOrchestratorApi.js';
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
  const endpoint = endpointFor(orchestratorToolId, launchType);
  const apiClient = apiClientFor(orchestratorToolId, launchType);
  const dto = orchestratorToolId ? EXECUTOR_DTO : endpoint === '/api/chat/message' ? CHAT_DTO : {};
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
    riskLevel: hasExecutor || primaryNlu?.backendExecutable ? 'high' : launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY ? 'medium' : 'low',
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
