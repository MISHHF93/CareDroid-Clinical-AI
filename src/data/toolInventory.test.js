import { describe, expect, it } from 'vitest';
import {
  getBackendBackedToolInventory,
  getCanonicalToolInventory,
  getCatalogToolInventory,
  getFrontendVisibleToolInventory,
  getSidebarToolInventory,
  resolveToolInventoryRecord,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
} from './toolInventory';
import {
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';

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
});
