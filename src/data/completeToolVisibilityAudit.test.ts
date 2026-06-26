import { describe, expect, it } from 'vitest';
import toolRegistry from './toolRegistry';
import {
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import {
  getAuditToolInventory,
  getCalculatorToolInventory,
  getUserFacingToolInventory,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';
import {
  buildBuiltinHubCalculatorCards,
  getHubChatAssistedTools,
} from './calculatorHubManifest';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, phantomToolReferences } from './sourceCodeToolDiscovery';

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));

describe('complete calculator and medical-tool visibility audit', () => {
  it('keeps user-facing and calculator inventories unique by canonical id', () => {
    const userFacing = getUserFacingToolInventory();
    const calculators = getCalculatorToolInventory();

    expect(new Set(userFacing.map((record) => record.id)).size).toBe(userFacing.length);
    expect(new Set(calculators.map((record) => record.id)).size).toBe(calculators.length);
    expect(calculators.every((record) => userFacing.some((tool) => tool.id === record.id))).toBe(true);
  });

  it('represents every registry tool in the user-facing inventory', () => {
    const userIds = new Set(getUserFacingToolInventory().map((record) => record.id));

    for (const tool of toolRegistry) {
      expect(userIds, tool.id).toContain(tool.id);
    }
  });

  it('represents every Tier A calculator in /tools and /tools/calculators inventories', () => {
    const userIds = new Set(getUserFacingToolInventory().map((record) => record.id));
    const calculatorIds = new Set(getCalculatorToolInventory().map((record) => record.id));

    for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(userIds, registryId).toContain(registryId);
      expect(calculatorIds, registryId).toContain(registryId);
    }
  });

  it('aligns calculator hub cards with dedicated forms and chat-assisted calculator records', () => {
    const calculators = getCalculatorToolInventory();
    const dedicated = calculators.filter((record) => record.hasDedicatedForm);
    const chatAssisted = calculators.filter((record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED);
    const cards = buildBuiltinHubCalculatorCards();
    const chatCards = getHubChatAssistedTools();

    expect(cards).toHaveLength(dedicated.length);
    for (const record of dedicated) {
      const card = cards.find((candidate) => candidate.registryId === record.id);
      expect(card, record.id).toBeTruthy();
      expect(card.route, record.id).toBe(record.route);
    }

    expect(chatCards.length).toBeGreaterThanOrEqual(chatAssisted.length);
    expect(new Set(chatCards.map((tool) => tool.toolId)).size).toBe(chatCards.length);
    for (const record of chatAssisted) {
      expect(chatCards.map((tool) => tool.registryId), record.id).toContain(record.id);
    }
  });

  it('keeps every medical catalog row launchable through a real path or chat seed', () => {
    const userById = byId(getUserFacingToolInventory());
    const medicalRows = getMedicalToolsCatalogRows();

    for (const row of medicalRows.filter((candidate) => candidate.launchable)) {
      const launch = resolveCatalogLaunch(row.primaryId || row.id);
      const candidateIds = [row.sidebarToolId, row.id, row.primaryId, launch.registryId].filter(Boolean);
      const hasUserFacingRecord = candidateIds.some((id) => userById.has(id));

      expect(row.pagePath || launch.path || launch.chatSeed || row.chatOnRequest, row.primaryId || row.id).toBeTruthy();
      expect(hasUserFacingRecord || row.chatOnlyForm || row.backendApiIntentOnly, row.primaryId || row.id).toBe(true);
    }
  });

  it('does not expose source-scan phantom or platform audit records in the user-facing inventory', () => {
    const userIds = new Set(getUserFacingToolInventory().map((record) => record.id));
    const auditOnlyIds = new Set(
      getAuditToolInventory()
        .filter((record) => record.sourceModule === 'platform' && !record.launchable)
        .map((record) => record.id)
    );

    for (const { id } of phantomToolReferences) {
      expect(userIds, id).not.toContain(id);
    }
    for (const id of auditOnlyIds) {
      expect(userIds, id).not.toContain(id);
    }

    expect(getAllDiscoveredTools().some((row) => row.status === 'phantom')).toBe(true);
  });

  it('documents backend-backed records only when the executor is registered', () => {
    const backendBacked = getUserFacingToolInventory().filter(
      (record) => record.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED
    );

    expect(backendBacked.length).toBeGreaterThan(0);
    for (const record of backendBacked) {
      expect(record.executorStatus, record.id).toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
      expect(record.orchestratorToolId, record.id).toBe(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[record.id]);
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS, record.id).toContain(record.orchestratorToolId);
      expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
    }
  });

  it('keeps NLU hub-only calculator profiles represented as chat-assisted cards', () => {
    const chatCards = getHubChatAssistedTools();
    const chatToolIds = new Set(chatCards.map((tool) => tool.toolId));

    for (const hubOnly of nluCalculatorHubOnly) {
      if (hubOnly.toolId === 'dispatch-ai') continue;
      expect(chatToolIds, hubOnly.toolId).toContain(hubOnly.toolId);
    }
    for (const intent of clinicalIntentTools.filter((tool) => tool.path === '/tools/calculators')) {
      if (intent.toolId === 'dispatch-ai') continue;
      expect(chatToolIds, intent.toolId).toContain(intent.toolId);
    }
  });
});
