/**
 * Cross-layer PR-FLEET consistency — fleet operations tools.
 * Tools: fleet-command, predictive-maintenance, route-optimizer, dispatch-ai
 * Per-tool: fleetCommandWiring, predictiveMaintenanceWiring, routeOptimizerWiring, dispatchAiWiring
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  PR_FLEET_ALL_REGISTRY_IDS,
  PR_FLEET_TIER_A_REGISTRY_IDS,
  PR_FLEET_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import {
  AI_EXECUTABLE_NLU_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import { buildUnsupportedOrchestratorToolDocs } from './unsupportedOrchestratorTools';
import {
  expectedLaunchPath,
  isFleetAreaPath,
  isKnownToolAreaPath,
  KNOWN_TOOL_AREA_PATHS,
} from '../routes/clinicalToolRoutes';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';
import {
  PR_FLEET_ALL_ALIAS_PAIRS,
  PR_FLEET_BACKEND_DISAMBIGUATION_HELPERS,
  PR_FLEET_CATALOG_SEARCH_QUERIES,
  PR_FLEET_DISCOVERY_ALIAS_PAIRS,
  PR_FLEET_HUB_PATH,
  PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS,
  PR_FLEET_TIER_A_IDS,
  PR_FLEET_TIER_B_IDS,
  PR_FLEET_TOOL_IDS,
  PR_FLEET_TOOL_SPECS,
  catalogRowsMatchingQuery,
} from './prFleetTestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');

describe('PR-FLEET consistency — centralized audit lists', () => {
  it('freezes fleet registry id lists', () => {
    expect(Object.isFrozen(PR_FLEET_TIER_A_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR_FLEET_TIER_B_CHAT_REGISTRY_IDS)).toBe(true);
    expect([...PR_FLEET_TIER_A_IDS]).toEqual([
      'fleet-command',
      'predictive-maintenance',
      'route-optimizer',
    ]);
    expect([...PR_FLEET_TIER_B_IDS]).toEqual(['dispatch-ai']);
    expect([...PR_FLEET_ALL_REGISTRY_IDS]).toEqual([...PR_FLEET_TOOL_IDS]);
    expect(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS).toContain('dispatch-ai');
  });

  it('defines specs for every fleet tool id', () => {
    for (const id of PR_FLEET_TOOL_IDS) {
      expect(PR_FLEET_TOOL_SPECS[id], `missing spec for ${id}`).toBeTruthy();
    }
    expect(Object.keys(PR_FLEET_TOOL_SPECS).sort()).toEqual([...PR_FLEET_TOOL_IDS].sort());
  });
});

describe('PR-FLEET consistency — registry IDs and archived routes', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s aligns toolRegistry, NLU, and backend pattern', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const reg = toolRegistryById[id];
    expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
    expect(reg.id).toBe(id);
    expect(reg.path).toBe(spec.routePath);
    expect(reg.category).toBe('Fleet');
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain(spec.backendHelper);

    const nlu = clinicalIntentToolsById[id];
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.path).toBe(spec.routePath);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.category).toBe('fleet');
    expect(nlu?.backendExecutable).toBe(spec.backendExecutable);
    expect(nlu?.chatSeed).toMatch(spec.chatSeedPattern);

    if (spec.panelTool) {
      expect(reg.panelTool).toBe(spec.panelTool);
    } else {
      expect(reg.panelTool).toBeUndefined();
    }
  });

  it.each(PR_FLEET_TIER_A_IDS)('%s stays in registry but is not an active App route', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    expect(appSource).not.toContain(`path: '${spec.routePath}'`);
    expect(appSource).not.toContain(`path="${spec.routePath}"`);
    expect(appSource).not.toContain(spec.appComponent);
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
  });

  it.each(PR_FLEET_TIER_B_IDS)('%s has no dedicated /fleet or /tools/calculators/<id> App route', (id) => {
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
    expect(appSource).not.toContain(`path: '/fleet/${id}'`);
  });
});

describe('PR-FLEET consistency — NLU and orchestrator maps', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s is a clinicalIntentToolsById key', (id) => {
    expect(clinicalIntentToolsById[id]?.toolId).toBe(id);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('dispatch-ai is AI_EXECUTABLE (NLU/chat) but not POST-orchestrator registered', () => {
    expect(clinicalIntentToolsById['dispatch-ai']?.backendRouted).toBe(true);
    expect(clinicalIntentToolsById['dispatch-ai']?.postExecutable).toBe(false);
    expect(AI_EXECUTABLE_NLU_TOOL_IDS).toContain('dispatch-ai');
    expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).not.toContain('dispatch-ai');
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL['dispatch-ai']).toBeUndefined();
  });

  it.each(PR_FLEET_TOOL_IDS)('%s has no REGISTRY_ID_TO_ORCHESTRATOR_TOOL mapping', (id) => {
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id]).toBeUndefined();
  });

  it('documents backend disambiguation helpers', () => {
    for (const helper of PR_FLEET_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR-FLEET consistency — Tier-A pages vs Tier-B hub', () => {
  it.each(PR_FLEET_TIER_A_IDS)('%s is not hub-only and has no Calculators.jsx switch', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    expect(calculatorsSource).not.toContain(`case '${id}':`);
  });

  it.each(PR_FLEET_TIER_B_IDS)('%s is hub-only with fleet-dispatch chat group', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes(id));
    expect(group?.groupId).toBe(spec.hubGroupId);
    expect(calculatorsSource).not.toContain(`case '${id}':`);
  });

  it('keeps dispatch-ai chat config in sync with NLU', () => {
    expect(dispatchAiChatConfig.toolId).toBe('dispatch-ai');
    expect(dispatchAiChatConfig.registryId).toBe('dispatch-ai');
    expect(dispatchAiChatConfig.hubPath).toBe(PR_FLEET_HUB_PATH);
    expect(clinicalIntentToolsById['dispatch-ai']?.chatSeed).toBe(dispatchAiChatConfig.chatSeed);
  });
});

describe('PR-FLEET consistency — aliases (no orphans or conflicts)', () => {
  it('has no conflicting alias targets within PR-FLEET alias pairs', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of PR_FLEET_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting PR-FLEET alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`
        );
      }
      targetByAlias.set(alias, canonical);
    }
  });

  it('resolves required NLU aliases via NLU_TO_REGISTRY_ID and resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(PR_FLEET_TOOL_SPECS[canonical].routePath);
    }
  });

  it('aligns hyphenated discovery alias ids with toolIdAliases and NLU map', () => {
    for (const [aliasId, canonical] of PR_FLEET_DISCOVERY_ALIAS_PAIRS) {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo, `discovery alias missing: ${aliasId}`).toBe(canonical);
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
      expect(resolveRegistryId(aliasId)).toBe(canonical);
    }
  });

  it('has no duplicate toolIdAliases.id entries among fleet tools', () => {
    const fleetCanonicals = new Set(PR_FLEET_TOOL_IDS);
    const fleetAliasIds = toolIdAliases
      .filter((a) => fleetCanonicals.has(a.mapsTo))
      .map((a) => a.id);
    expect(new Set(fleetAliasIds).size).toBe(fleetAliasIds.length);
  });

  it('does not leave fleet discovery aliases pointing outside fleet ids', () => {
    const fleetSet = new Set(PR_FLEET_TOOL_IDS);
    for (const row of toolIdAliases) {
      if (
        PR_FLEET_DISCOVERY_ALIAS_PAIRS.some(([aliasId]) => aliasId === row.id) &&
        !fleetSet.has(row.mapsTo)
      ) {
        throw new Error(`Orphaned fleet discovery alias ${row.id} → ${row.mapsTo}`);
      }
    }
  });
});

describe('PR-FLEET consistency — launch behavior', () => {
  it.each(PR_FLEET_TIER_A_IDS)('%s navigates to dedicated fleet route', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(spec.routePath);
    expect(launch.path).toMatch(/^\/fleet\//);
    expect(isFleetAreaPath(launch.path)).toBe(true);
    expect(isKnownToolAreaPath(launch.path)).toBe(true);
    expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
    expect(resolveNavigationPathForLaunch(launch)).toBe(launch.path);
    expect(expectedLaunchPath(id)).toBe(spec.routePath);
  });

  it.each(PR_FLEET_TIER_B_IDS)('%s uses calculators hub path and chat navigation', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR_FLEET_HUB_PATH);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    expect(launch.openLabel).toBe('Start guided chat');
    expect(isKnownToolAreaPath(PR_FLEET_HUB_PATH)).toBe(true);
  });

  it('includes required standalone dispatch alias', () => {
    expect(NLU_TO_REGISTRY_ID.dispatch).toBe('dispatch-ai');
    expect(resolveRegistryId('dispatch')).toBe('dispatch-ai');
    expect(
      PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS.some(([alias, canonical]) => alias === 'dispatch' && canonical === 'dispatch-ai')
    ).toBe(true);
  });
});

describe('PR-FLEET consistency — resolveCatalogLaunch', () => {
  it.each(PR_FLEET_TOOL_IDS)('canonical %s launch matches registry path and NLU seed', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const nlu = clinicalIntentToolsById[id];
    const launch = resolveCatalogLaunch(id);

    expect(launch.registryId).toBe(id);
    expect(launch.path).toBe(spec.routePath);
    expect(launch.chatSeed).toBe(nlu.chatSeed);
    expect(launch.chatSeed).toMatch(spec.chatSeedPattern);
    expect(launch.openLabel).toBe(spec.tier === 'B' ? 'Start guided chat' : 'Open');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PR_FLEET_ALL_ALIAS_PAIRS)(
    'alias %s → %s resolves same launch as canonical',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    }
  );
});

describe('PR-FLEET consistency — catalog rows and discovery', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s has exactly one medical catalog row', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);

    const row = matches[0];
    expect(row.pagePath).toBe(spec.routePath);
    expect(row.sidebarToolId).toBe(id);
    expect(row.chatOnlyForm).toBe(spec.chatOnlyForm);
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed.length).toBeGreaterThan(40);
    expect(row.backendExecutor).toBe(spec.backendExecutable);
    expect(row.category).toBe('fleet');
  });

  it.each(PR_FLEET_CATALOG_SEARCH_QUERIES)(
    'catalog search "%s" finds %s',
    (canonical, query) => {
      const rows = getMedicalToolsCatalogRows();
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === canonical)).toBe(true);
    }
  );

  it.each(PR_FLEET_TOOL_IDS)('discovery merges %s at least once', (id) => {
    const merged = getAllDiscoveredTools();
    const hits = merged.filter((r) => r.id === id);
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PR-FLEET consistency — sidebar visibility', () => {
  it('lists each fleet tool exactly once in toolRegistry', () => {
    const rows = toolRegistry.filter((t) => PR_FLEET_TOOL_IDS.includes(t.id));
    expect(rows).toHaveLength(PR_FLEET_TOOL_IDS.length);
    for (const id of PR_FLEET_TOOL_IDS) {
      expect(toolRegistryById[id]?.id).toBe(id);
      expect(toolRegistryById[id]?.path).toBeTruthy();
    }
  });

  it.each(PR_FLEET_TOOL_IDS)('exposes sidebar icon for %s (toolRegistry-driven nav)', (id) => {
    const icon = getToolIcon(id);
    expect(icon).toBeTruthy();
    expect(icon).not.toBe(getToolIcon('__nonexistent_tool_xyz__'));
  });

  it('includes all fleet tools in default sidebar toolRegistry enumeration', () => {
    const registryIds = new Set(toolRegistry.map((t) => t.id));
    for (const id of PR_FLEET_TOOL_IDS) {
      expect(registryIds.has(id)).toBe(true);
    }
  });
});

describe('PR-FLEET consistency — no stray fleet NLU without registry', () => {
  it('does not register fleet toolIds outside PR_FLEET_TOOL_IDS in clinicalIntentTools', () => {
    const fleetNlu = clinicalIntentTools.filter((t) => t.category === 'fleet');
    const ids = fleetNlu.map((t) => t.toolId).sort();
    expect(ids).toEqual([...PR_FLEET_TOOL_IDS].sort());
  });
});

describe('PR-FLEET consistency — unsupported orchestrator documentation', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s is documented without POST executor', (id) => {
    const docs = buildUnsupportedOrchestratorToolDocs();
    const row = docs.find((d) => d.nluToolId === id);
    expect(row, `missing unsupported doc for ${id}`).toBeTruthy();
    expect(row.registryId).toBe(id);
  });

  it('documents dispatch-ai as chat-assisted fleet surface', () => {
    const row = buildUnsupportedOrchestratorToolDocs().find((d) => d.nluToolId === 'dispatch-ai');
    expect(row?.surface).toBe('chat-assisted');
    expect(row?.reason).toMatch(/Chat\/NLU routing only/i);
  });
});
