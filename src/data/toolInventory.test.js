import { describe, expect, it } from 'vitest';
import {
  getBackendBackedToolInventory,
  getCanonicalToolInventory,
  getAuditToolInventory,
  getCalculatorToolInventory,
  getCatalogToolInventory,
  getFrontendVisibleToolInventory,
  getSidebarToolRegistryProjection,
  getSidebarToolInventory,
  getUserFacingToolInventory,
  resolveToolInventoryRecord,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';
import {
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';

const requiredFields = [
  'id',
  'label',
  'category',
  'tier',
  'status',
  'sourceKind',
  'launchType',
  'catalogVisible',
  'sidebarVisible',
  'executorStatus',
  'testCoverage',
  'riskLevel',
];

describe('canonical tool inventory', () => {
  const records = getCanonicalToolInventory();

  it('has unique canonical ids and required normalized fields', () => {
    expect(records.length).toBeGreaterThan(ALL_REGISTRY_TOOL_IDS.length);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);

    for (const record of records) {
      for (const field of requiredFields) {
        expect(record, `${record.id} missing ${field}`).toHaveProperty(field);
        expect(record[field], `${record.id}.${field} is undefined`).not.toBeUndefined();
      }
      expect(record.label).toBeTruthy();
      expect(record.category).toBeTruthy();
      expect(Array.isArray(record.testCoverage)).toBe(true);
      expect(record.testCoverage.length).toBeGreaterThan(0);
    }
  });

  it('represents every registry/sidebar tool', () => {
    const ids = new Set(records.map((record) => record.id));
    for (const registryId of ALL_REGISTRY_TOOL_IDS) {
      expect(ids.has(registryId), `missing registry tool ${registryId}`).toBe(true);
    }
    expect(getSidebarToolInventory(records).length).toBe(ALL_REGISTRY_TOOL_IDS.length);
  });

  it('projects sidebar-visible tools with legacy card fields for app layout', () => {
    const sidebarTools = getSidebarToolRegistryProjection(records);
    expect(sidebarTools).toHaveLength(ALL_REGISTRY_TOOL_IDS.length);
    expect(sidebarTools.map((tool) => tool.id)).toEqual(ALL_REGISTRY_TOOL_IDS);

    for (const tool of sidebarTools) {
      expect(tool.name, tool.id).toBeTruthy();
      expect(tool.path, tool.id).toBeTruthy();
      expect(tool.category, tool.id).toMatch(/Diagnostic|Calculator|Reference|Fleet|Other/);
      expect(tool.color, tool.id).toMatch(/^#/);
      expect(Array.isArray(tool.features), tool.id).toBe(true);
      expect(tool.canonicalInventoryId, tool.id).toBe(tool.id);
    }
  });

  it('covers every NLU profile through a canonical record', () => {
    const represented = new Set();
    for (const record of records) {
      if (record.nluToolId) represented.add(record.nluToolId);
      for (const nluId of record.nluProfileIds || []) represented.add(nluId);
      if (record.backendPatternId) represented.add(record.backendPatternId);
    }

    for (const nluId of NLU_PROFILE_TOOL_IDS) {
      expect(represented.has(nluId), `missing NLU profile ${nluId}`).toBe(true);
    }
  });

  it('normalizes backend-backed executors with endpoint, DTOs, client, route, and component', () => {
    const backendBacked = getBackendBackedToolInventory(records);
    expect(backendBacked.map((record) => record.orchestratorToolId).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );

    for (const record of backendBacked) {
      expect(record.launchType).toBe(TOOL_LAUNCH_TYPES.BACKEND_BACKED);
      expect(record.executorStatus).toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
      expect(record.route, record.id).toBeTruthy();
      expect(record.component, record.id).toBeTruthy();
      expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
      expect(record.requestDto, record.id).toContain('ExecuteToolDto');
      expect(record.responseDto, record.id).toContain('ToolExecutionResponseDto');
      expect(record.apiClient, record.id).toBe('src/services/clinicalOrchestratorApi.js');
    }
  });

  it('classifies every frontend-visible tool into a valid launch type with a fallback', () => {
    const allowed = new Set(Object.values(TOOL_LAUNCH_TYPES));
    for (const record of getFrontendVisibleToolInventory(records)) {
      expect(allowed.has(record.launchType), record.id).toBe(true);
      expect(record.fallbackRoute || record.route || record.navigationPath, record.id).toBeTruthy();
    }
    expect(getCatalogToolInventory(records).length).toBeGreaterThan(ALL_REGISTRY_TOOL_IDS.length - 1);
  });

  it('resolves aliases, NLU ids, and registry ids to canonical records', () => {
    for (const [registryId, nluId] of Object.entries(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(resolveToolInventoryRecord(registryId, records)?.orchestratorToolId).toBe(nluId);
      expect(resolveToolInventoryRecord(nluId, records)?.id).toBe(registryId);
    }

    for (const [nluId, registryId] of Object.entries(ORCHESTRATOR_TO_REGISTRY_ID)) {
      if (nluId === 'dispatch') continue;
      expect(resolveToolInventoryRecord(nluId, records), nluId).toBeTruthy();
      expect([registryId, nluId], nluId).toContain(resolveToolInventoryRecord(nluId, records)?.id);
    }
  });

  it('projects a user-facing inventory without platform or unsupported artifacts', () => {
    const userFacing = getUserFacingToolInventory(records);
    const calculatorRoutes = new Set(CALCULATOR_ROUTE_DEFS.map((def) => def.path));
    expect(userFacing.length).toBeGreaterThan(0);
    expect(new Set(userFacing.map((record) => record.id)).size).toBe(userFacing.length);

    for (const record of userFacing) {
      expect(record.userCatalogVisible, record.id).toBe(true);
      expect(record.id, record.id).toBeTruthy();
      expect(record.label, record.id).toBeTruthy();
      expect(record.category, record.id).toBeTruthy();
      expect(record.launchType, record.id).toBeTruthy();
      expect(record.surface, record.id).toBeTruthy();
      expect(record.route || record.navigationPath || record.chatSeed, record.id).toBeTruthy();
      expect(record.launchType, record.id).not.toBe(TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED);
      expect(record.auditRefs.sourceKind, record.id).not.toBe('platform');

      if (record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) {
        expect(record.chatSeed, record.id).toBeTruthy();
        expect(record.navigationPath, record.id).toBe('/dashboard');
      }

      if (record.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED) {
        expect(record.orchestratorToolId, record.id).toBeTruthy();
        expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
        expect(record.executorStatus, record.id).toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
        expect(record.auditRefs.apiClient, record.id).toBe('src/services/clinicalOrchestratorApi.js');
      }

      if (record.hasDedicatedForm) {
        expect(record.calculatorSlug, record.id).toBeTruthy();
        expect(calculatorRoutes.has(record.route), record.id).toBe(true);
        expect(record.component, record.id).toBe('src/pages/tools/Calculators.jsx');
      }

      if ([TOOL_SURFACES.TOOL_PAGE, TOOL_SURFACES.FLEET_PAGE, TOOL_SURFACES.HUB].includes(record.surface)) {
        expect(record.route, record.id).toBeTruthy();
        expect(record.component, record.id).toBeTruthy();
      }
    }
  });

  it('projects calculator tools once, including forms and chat-assisted records', () => {
    const calculatorTools = getCalculatorToolInventory(records);
    expect(calculatorTools.length).toBeGreaterThan(0);
    expect(new Set(calculatorTools.map((record) => record.id)).size).toBe(calculatorTools.length);
    expect(calculatorTools.some((record) => record.hasDedicatedForm && record.calculatorSlug === 'qsofa')).toBe(true);
    expect(calculatorTools.some((record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED)).toBe(true);
    expect(calculatorTools.some((record) => record.id === 'dispatch-ai')).toBe(false);

    const chatKeys = calculatorTools
      .filter((record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED)
      .map((record) => record.nluToolId || record.id);
    expect(new Set(chatKeys).size).toBe(chatKeys.length);
  });

  it('projects audit records separately from the user-facing catalog', () => {
    const audit = getAuditToolInventory(records);
    expect(audit.length).toBe(records.length);
    expect(audit.some((record) => record.kind === 'platform-api')).toBe(true);
    expect(audit.some((record) => record.launchable === false)).toBe(true);
  });
});
