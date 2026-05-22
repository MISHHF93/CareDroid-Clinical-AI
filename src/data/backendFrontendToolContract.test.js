/**
 * Contract matrix drift tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import {
  buildBackendFrontendContractRows,
  deriveContractStatus,
  getContractGaps,
} from './backendFrontendToolContract';
import { parseClinicalToolPatterns } from './parseToolPatterns';
import { readToolPatternsSource } from './clinicalToolAliasSync';
import {
  getUserFacingToolInventory,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
} from './toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRegistrySource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
  ),
  'utf8'
);

function parseBackendRegisteredExecutorIds() {
  const block = backendRegistrySource.match(/REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  return [...(block?.[1] || '').matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
}

describe('backendFrontendToolContract', () => {
  it('assigns POST executor only to registered orchestrator ids', () => {
    const rows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');
    const withExecutor = rows.filter((r) => r.backendExecutor === 'yes');
    expect(withExecutor.map((r) => r.canonicalId).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );
  });

  it('keeps frontend registry executor map aligned with backend registered executors', () => {
    const backendRegistered = parseBackendRegisteredExecutorIds();
    expect(backendRegistered).toEqual([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort());

    for (const [registryId, executorId] of Object.entries(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(backendRegistered, registryId).toContain(executorId);
    }
  });

  it('backend-backed user-facing inventory records point to real registered executors', () => {
    for (const record of getUserFacingToolInventory().filter(
      (tool) => tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED
    )) {
      if (record.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM) {
        expect(record.endpoint, record.id).toMatch(/^\/api\/clinical-intelligence\//);
        expect(record.auditRefs.apiClient, record.id).toBe('src/services/clinicalIntelligenceApi.js');
        continue;
      }

      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS, record.id).toContain(record.orchestratorToolId);
      expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
      expect(record.executorStatus, record.id).toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
      expect(record.auditRefs.apiClient, record.id).toBe('src/services/clinicalOrchestratorApi.js');
    }
  });

  it('frontend-only and unsupported rows do not claim POST executor support', () => {
    const rows = buildBackendFrontendContractRows();
    for (const row of rows.filter((r) => r.status === 'frontend-only' || r.status === 'planned')) {
      expect(row.backendExecutor, row.canonicalId).not.toBe('yes');
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS, row.canonicalId).not.toContain(row.canonicalId);
    }
  });

  it('does not mark dispatch-ai as fully wired with POST executor', () => {
    const dispatch = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'dispatch-ai');
    expect(dispatch?.backendExecutor).toBe('no');
    expect(dispatch?.status).not.toBe('fully wired');
  });

  it('marks share-results platform row as frontend-only (capability gated)', () => {
    const share = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'tools-share-results');
    expect(share?.status).toBe('frontend-only');
    expect(share?.brokenReasons).toEqual([]);
  });

  it('NLU row count matches clinicalIntentTools', () => {
    const nluRows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');
    expect(nluRows.length).toBe(clinicalIntentTools.length);
    expect(nluRows.length).toBe(NLU_PROFILE_TOOL_IDS.length);
  });

  it('every NLU profile has backend pattern and catalog yes', () => {
    const patterns = parseClinicalToolPatterns(readToolPatternsSource());
    const patternIds = new Set(patterns.map((p) => p.toolId));
    const rows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');

    for (const id of NLU_PROFILE_TOOL_IDS) {
      expect(patternIds.has(id)).toBe(true);
      const row = rows.find((r) => r.canonicalId === id);
      expect(row?.catalogEntry).toBe('yes');
      expect(row?.discoveryEntry).toBe('yes');
      expect(['fully wired', 'frontend-only']).toContain(row?.status);
    }
  });

  it('deriveContractStatus treats phantoms as planned', () => {
    expect(deriveContractStatus({ kind: 'phantom', brokenReasons: [] })).toBe('planned');
  });

  it('documents procedures NLU profile with frontend-only status', () => {
    const gaps = getContractGaps();
    const procedures = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'procedures');
    expect(gaps.some((g) => g.id === 'procedures')).toBe(false);
    expect(procedures?.status).toBe('frontend-only');
    expect(procedures?.nluProfile).toBe('procedures');
  });
});
