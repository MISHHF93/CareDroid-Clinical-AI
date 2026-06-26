/**
 * Cross-repo executor mapping audit (frontend contract ↔ backend registry).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import {
  UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS,
  isOrchestratorPostExecutable,
} from './unsupportedOrchestratorTools';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registrySource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
  ),
  'utf8'
);

function parseBackendRegistered() {
  const block = registrySource.match(/REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

function parseBackendRegistryMap() {
  const block = registrySource.match(/REGISTRY_ID_TO_EXECUTOR_TOOL_ID[\s\S]*?=\s*\{([\s\S]*?)\};/);
  const map: any = {};
  for (const m of block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function parseBackendUnsupported() {
  const block = registrySource.match(/NLU_TOOL_IDS_WITHOUT_EXECUTOR\s*=\s*\[([\s\S]*?)\]\s*as const/);
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

describe('executorMappingAudit — frontend ↔ backend', () => {
  it('ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS matches backend REGISTERED_EXECUTOR_TOOL_IDS', () => {
    expect([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()).toEqual(parseBackendRegistered());
  });

  it('REGISTRY_ID_TO_ORCHESTRATOR_TOOL matches backend REGISTRY_ID_TO_EXECUTOR_TOOL_ID', () => {
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).toEqual(parseBackendRegistryMap());
  });

  it('unsupported NLU list matches backend NLU_TOOL_IDS_WITHOUT_EXECUTOR', () => {
    expect([...UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS].sort()).toEqual(parseBackendUnsupported());
  });

  it('registered executors are not marked unsupported on either side', () => {
    for (const id of ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS) {
      expect(UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS).not.toContain(id);
      expect(isOrchestratorPostExecutable(id)).toBe(true);
    }
  });

  it('every NLU profile is either POST-executable or documented unsupported', () => {
    for (const id of NLU_PROFILE_TOOL_IDS) {
      const post = isOrchestratorPostExecutable(id);
      const unsupported = UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS.includes(id);
      expect(post || unsupported, `NLU ${id} must be executor or unsupported`).toBe(true);
      expect(post && unsupported, `NLU ${id} cannot be both`).toBe(false);
    }
  });

  it('does not map dispatch-ai in REGISTRY_ID_TO_ORCHESTRATOR_TOOL', () => {
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL['dispatch-ai']).toBeUndefined();
    expect(parseBackendRegistryMap()['dispatch-ai']).toBeUndefined();
  });
});
