/**
 * Drift detection: registry, NLU catalog, ID contract, and backend patterns stay aligned.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  REGISTRY,
  NLU,
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  CANONICAL_TOOL_GROUPS,
  KEYWORD_ROUTED_REGISTRY_IDS,
  TOOL_ID_CONTRACT_VERSION,
  TOOL_LAUNCH_PATHS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  AI_EXECUTABLE_NLU_TOOL_IDS,
  PR1_CALCULATOR_REGISTRY_IDS,
  PR4A_CALCULATOR_REGISTRY_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  PR_FLEET_ALL_REGISTRY_IDS,
  registryIdsReferencedByAliases,
  registryIdValues,
  nluToolIdValues,
  registryToPrimaryNluToolId,
} from './clinicalToolIdContract';
import { resolveRegistryId } from './clinicalCatalogWiring';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

const orchestratorRegistrySource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
  ),
  'utf8'
);

function sortedUnique(ids) {
  return [...new Set(ids)].sort();
}

function patternToolIds() {
  return sortedUnique([...patternsSource.matchAll(/toolId:\s*'([^']+)'/g)].map((m) => m[1]));
}

function parseBackendRegisteredExecutorIds() {
  const block = orchestratorRegistrySource.match(
    /REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/
  );
  if (!block) return [];
  return sortedUnique([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

function parseBackendRegistryIdToExecutor() {
  const block = orchestratorRegistrySource.match(
    /REGISTRY_ID_TO_EXECUTOR_TOOL_ID[\s\S]*?=\s*\{([\s\S]*?)\};/
  );
  if (!block) return {};
  const map: any = {};
  for (const m of block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

describe('clinicalToolIdContract — canonical groups', () => {
  it('exposes a contract version', () => {
    expect(TOOL_ID_CONTRACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('CANONICAL_TOOL_GROUPS registry slices partition ALL_REGISTRY_TOOL_IDS', () => {
    const parts = [
      ...CANONICAL_TOOL_GROUPS.aiSystems,
      ...CANONICAL_TOOL_GROUPS.aiOperationsPages,
      ...CANONICAL_TOOL_GROUPS.clinicalTierCWorkflows,
      ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsTierA,
      ...CANONICAL_TOOL_GROUPS.clinicalChatAssistedTierB,
      ...CANONICAL_TOOL_GROUPS.clinicalNluHubChat,
      ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsHub,
      ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierA,
      ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierBChat,
      ...CANONICAL_TOOL_GROUPS.hospitalOperationsTierBChat,
      ...CANONICAL_TOOL_GROUPS.liveTrackingMaps,
      ...CANONICAL_TOOL_GROUPS.medicalIotDashboards,
      ...CANONICAL_TOOL_GROUPS.hospitalOperations,
    ];
    expect(sortedUnique(parts)).toEqual(sortedUnique([...ALL_REGISTRY_TOOL_IDS]));
    expect(parts).toHaveLength(ALL_REGISTRY_TOOL_IDS.length);
  });

  it('NLU and REGISTRY constant values are unique', () => {
    expect(new Set(registryIdValues()).size).toBe(registryIdValues().length);
    expect(new Set(nluToolIdValues()).size).toBe(nluToolIdValues().length);
  });

  it('NLU_HUB_ONLY_PROFILE_TOOL_IDS matches nluCalculatorHubOnly NLU-only rows', () => {
    const hubOnlyIds = nluCalculatorHubOnly
      .map((row) => row.toolId)
      .filter((id) => (NLU_HUB_ONLY_PROFILE_TOOL_IDS as readonly string[]).includes(id));
    expect(sortedUnique(hubOnlyIds)).toEqual(sortedUnique([...NLU_HUB_ONLY_PROFILE_TOOL_IDS]));
  });

  it('builtinUiCalculators ids are canonical BUILTIN_CALC slugs', () => {
    const allowed = new Set(Object.values(BUILTIN_CALC)) as Set<string>;
    for (const calc of builtinUiCalculators) {
      expect(allowed.has(calc.id), `unexpected builtin slug: ${calc.id}`).toBe(true);
    }
  });

  it('KEYWORD_ROUTED_REGISTRY_IDS are registry ids without clinicalIntentTools rows', () => {
    for (const registryId of KEYWORD_ROUTED_REGISTRY_IDS) {
      expect(toolRegistryById[registryId]).toBeTruthy();
      expect(clinicalIntentTools.some((t) => t.sidebarToolId === registryId)).toBe(false);
    }
  });

  it('registryToPrimaryNluToolId resolves executor and self-mapped tools', () => {
    expect(registryToPrimaryNluToolId(REGISTRY.sofaScore)).toBe(NLU.sofaCalculator);
    expect(registryToPrimaryNluToolId(REGISTRY.wellsPe)).toBe(NLU.wellsPe);
    expect(registryToPrimaryNluToolId(REGISTRY.calculatorsHub)).toBe(REGISTRY.calculatorsHub);
  });

  it('TOOL_LAUNCH_PATHS includes calculators hub and fleet routes', () => {
    expect(TOOL_LAUNCH_PATHS.calculatorsHub).toBe('/tools/calculators');
    expect(TOOL_LAUNCH_PATHS.fleetCommand).toBe('/fleet/command');
  });
});

describe('clinicalToolIdContract — registry drift', () => {
  it('ALL_REGISTRY_TOOL_IDS matches toolRegistry.js exactly', () => {
    const registryIds = sortedUnique(toolRegistry.map((t) => t.id));
    const contractIds = sortedUnique([...ALL_REGISTRY_TOOL_IDS]);
    expect(contractIds).toEqual(registryIds);
  });

  it('REGISTRY constant values are unique', () => {
    const values = Object.values(REGISTRY);
    expect(new Set(values).size).toBe(values.length);
  });

  it('PR audit slices are subsets of ALL_REGISTRY_TOOL_IDS', () => {
    const all = new Set(ALL_REGISTRY_TOOL_IDS);
    for (const id of [
      ...PR1_CALCULATOR_REGISTRY_IDS,
      ...PR4A_CALCULATOR_REGISTRY_IDS,
      ...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
      ...PR_FLEET_ALL_REGISTRY_IDS,
    ]) {
      expect(all.has(id), `missing ${id} in ALL_REGISTRY_TOOL_IDS`).toBe(true);
    }
  });
});

describe('clinicalToolIdContract — alias maps', () => {
  it('every NLU_TO_REGISTRY_ID target is a toolRegistry id', () => {
    for (const target of registryIdsReferencedByAliases()) {
      expect(toolRegistryById[target], `unknown registry target: ${target}`).toBeTruthy();
    }
  });

  it('every ORCHESTRATOR_TO_REGISTRY_ID target is a toolRegistry id', () => {
    for (const target of Object.values(ORCHESTRATOR_TO_REGISTRY_ID)) {
      expect(toolRegistryById[target]).toBeTruthy();
    }
  });

  it('maps drug-interaction-checker to drug-check registry (not phantom drug-interactions)', () => {
    expect(NLU_TO_REGISTRY_ID['drug-interaction-checker']).toBe(REGISTRY.drugCheck);
    expect(resolveRegistryId('drug-interaction-checker')).toBe(REGISTRY.drugCheck);
  });

  it('BUILTIN_CALC_ID_TO_REGISTRY_ID targets exist in toolRegistry', () => {
    for (const registryId of Object.values(BUILTIN_CALC_ID_TO_REGISTRY_ID)) {
      expect(toolRegistryById[registryId]).toBeTruthy();
    }
  });

  it('REGISTRY_ID_TO_ORCHESTRATOR_TOOL keys are registry ids', () => {
    for (const registryId of Object.keys(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(toolRegistryById[registryId]).toBeTruthy();
    }
  });

  it('REGISTRY_ID_TO_ORCHESTRATOR_TOOL only references registered backend executors', () => {
    for (const nluId of Object.values(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).toContain(nluId);
    }
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL['dispatch-ai']).toBeUndefined();
  });

  it('ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS matches backend REGISTERED_EXECUTOR_TOOL_IDS', () => {
    const backendIds = parseBackendRegisteredExecutorIds();
    expect(sortedUnique([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS])).toEqual(backendIds);
  });

  it('REGISTRY_ID_TO_ORCHESTRATOR_TOOL values match backend REGISTRY_ID_TO_EXECUTOR_TOOL_ID', () => {
    const backendMap = parseBackendRegistryIdToExecutor();
    for (const [registryId, nluId] of Object.entries(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(backendMap[registryId], `backend missing registry ${registryId}`).toBe(nluId);
    }
  });
});

describe('clinicalToolIdContract — NLU profile drift', () => {
  it('clinicalIntentTools toolIds match NLU_PROFILE_TOOL_IDS', () => {
    const catalogIds = sortedUnique(clinicalIntentTools.map((t) => t.toolId));
    const contractIds = sortedUnique([...NLU_PROFILE_TOOL_IDS]);
    expect(catalogIds).toEqual(contractIds);
  });

  it('backend tool.patterns.ts toolIds match NLU_PROFILE_TOOL_IDS', () => {
    const backendIds = patternToolIds();
    const contractIds = sortedUnique([...NLU_PROFILE_TOOL_IDS]);
    expect(backendIds).toEqual(contractIds);
  });

  it('backend tool.patterns.ts toolIds are covered by catalog rows or chat-assisted hub groups', () => {
    const catalogIds = clinicalIntentTools.map((t) => t.toolId);
    const hubOnlyIds = nluCalculatorHubOnly.map((t) => t.toolId);
    const groupedChatIds = CHAT_ASSISTED_HUB_GROUPS.flatMap((group) => group.toolIds);
    const coveredIds = new Set([...catalogIds, ...hubOnlyIds, ...groupedChatIds]);

    for (const toolId of patternToolIds()) {
      expect(coveredIds.has(toolId as string), `${toolId} must be launchable through catalog or chat hub`).toBe(true);
    }
  });

  it('AI_EXECUTABLE_NLU_TOOL_IDS are flagged as backend-routed in clinicalIntentTools', () => {
    for (const toolId of AI_EXECUTABLE_NLU_TOOL_IDS) {
      const row = clinicalIntentTools.find((t) => t.toolId === toolId);
      expect(row?.backendRouted, `${toolId} should be backendRouted`).toBe(true);
    }
  });

  it('dispatch-ai is NLU/backend routed but not POST-orchestrator registered', () => {
    const row = clinicalIntentTools.find((t) => t.toolId === 'dispatch-ai');

    expect(AI_EXECUTABLE_NLU_TOOL_IDS).toContain('dispatch-ai');
    expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).not.toContain('dispatch-ai');
    expect(row?.backendRouted).toBe(true);
    expect(row?.postExecutable).toBe(false);
  });

  it('canonical NLU ids self-map via ORCHESTRATOR_TO_REGISTRY_ID when registry id differs', () => {
    expect(ORCHESTRATOR_TO_REGISTRY_ID[NLU.sofaCalculator]).toBe(REGISTRY.sofaScore);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[NLU.drugInteractions]).toBe(REGISTRY.drugCheck);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[NLU.wellsPe]).toBe(REGISTRY.wellsPe);
  });
});
