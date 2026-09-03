/**
 * PR2 registration audit — cross-system consistency for MELD, MELD-Na, TIMI UA/NSTEMI, Wells PE, PERC.
 * Complements per-tool wiring tests and pr2Consistency.test.js.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  builtinUiCalculators,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
import { percChatConfig } from './chatAssistedCalculators/perc';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import {
  assertAppCalculatorRouteWiring,
  registeredCalculatorPathsForSet,
} from './testHelpers/calculatorRouteAudit';
import { TOOL_PATTERNS_PATH } from './clinicalToolAliasSync';
import {
  aliasToSlug,
  extractToolPatternKeywords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';
import {
  PR2_ALL_ALIAS_PAIRS,
  PR2_CALC_QUERY_BY_REGISTRY_ID,
  PR2_CATALOG_SEARCH_QUERIES,
  PR2_DISCOVERY_ALIAS_PAIRS,
  PR2_HUB_PATH,
  PR2_HUB_ROUTE_BY_REGISTRY_ID,
  PR2_REQUIRED_NLU_ALIAS_PAIRS,
  PR2_ROUTE_BY_REGISTRY_ID,
  PR2_TIER_A_TOOL_IDS,
  PR2_TIER_B_TOOL_IDS,
  PR2_TOOL_IDS,
} from './pr2TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const PR2_TIER_A_PATH_SET = new Set(Object.values(PR2_ROUTE_BY_REGISTRY_ID));

function _extractAppCalculatorRoutes(source) {
  const routes = [] as any[];
  const re = /path:\s*'(\/tools\/calculators\/[^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    routes.push(m[1]);
  }
  return routes;
}

describe('PR2 registration audit — canonical ID alignment', () => {
  it('keeps PR2_CALCULATOR_REGISTRY_IDS frozen and ordered', () => {
    expect(Object.isFrozen(PR2_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR2_CALCULATOR_REGISTRY_IDS]).toEqual([
      'meld',
      'meld-na',
      'timi-ua-nstemi',
      'wells-pe',
      'perc',
    ]);
  });

  it.each(PR2_TIER_A_TOOL_IDS)(
    '%s uses the same id across registry, NLU, builtin slug, and maps',
    (id) => {
      const reg = toolRegistryById[id];
      expect(reg?.id).toBe(id);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.toolId).toBe(id);
      expect(nlu?.sidebarToolId).toBe(id);
      // timi-ua-nstemi is a real registerTool() backend executor, so backendExecutable is true;
      // meld/meld-na have no backend executor.
      expect(nlu?.backendExecutable).toBe(
        (ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as readonly string[]).includes(id),
      );

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin?.id).toBe(id);

      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(resolveRegistryId(id)).toBe(id);
    },
  );

  it.each(PR2_TIER_B_TOOL_IDS)('%s aligns registry, NLU, and hub-only catalog rows', (id) => {
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);
    expect(reg.path).toBe(PR2_HUB_PATH);
    expect(reg.initialCalc).toBeUndefined();

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.path).toBe(PR2_HUB_PATH);
    // wells-pe is a real registerTool() backend executor, so backendExecutable is true;
    // perc has no backend executor.
    expect(nlu?.backendExecutable).toBe(
      (ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as readonly string[]).includes(id),
    );

    expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
  });
});

describe('PR2 registration audit — routes & path naming', () => {
  it.each(PR2_TIER_A_TOOL_IDS)('%s uses plural /tools/calculators/ path everywhere', (id) => {
    const path = PR2_ROUTE_BY_REGISTRY_ID[id];
    expect(path).toBe(`${PR2_HUB_PATH}/${id}`);
    expect(path).not.toMatch(/\/tools\/calculator\//);

    expect(toolRegistryById[id].path).toBe(path);
    expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.calcQuery).toBe(
      PR2_CALC_QUERY_BY_REGISTRY_ID[id],
    );
  });

  it('registers each Tier-A PR2 route via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, PR2_TIER_A_TOOL_IDS);
  });

  it('has no orphaned Tier-A PR2 routes in CALCULATOR_ROUTE_DEFS', () => {
    const registered = registeredCalculatorPathsForSet(PR2_TIER_A_PATH_SET);
    expect(registered.sort()).toEqual([...PR2_TIER_A_PATH_SET].sort());
  });

  it('does not register Tier-B standalone calculator App routes', () => {
    for (const id of PR2_TIER_B_TOOL_IDS) {
      expect(appSource).not.toContain(`path: '${PR2_HUB_PATH}/${id}'`);
      expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    }
  });

  it.each(PR2_TIER_A_TOOL_IDS)('clinicalToolRoutes matches %s for deep links', (id) => {
    const path = PR2_ROUTE_BY_REGISTRY_ID[id];
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(expectedLaunchPath(id)).toBe(path);
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
    expect(def?.path).toBe(path);
  });

  it.each(PR2_TIER_A_TOOL_IDS)('CalculatorInterface switch includes case for %s', (id) => {
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });

  it.each(PR2_TIER_B_TOOL_IDS)('expectedLaunchPath(%s) resolves to calculator hub', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR2_HUB_PATH);
    expect(PR2_HUB_ROUTE_BY_REGISTRY_ID[id]).toBe(PR2_HUB_PATH);
  });
});

describe('PR2 registration audit — NLU, backend keywords, aliases', () => {
  it.each(PR2_TOOL_IDS)('backend tool.patterns.ts declares toolId %s', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.some((p) => p.toolId === id)).toBe(true);
  });

  it.each(PR2_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps catalog alias "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    },
  );

  it.each(PR2_ALL_ALIAS_PAIRS)('resolveRegistryId("%s") → %s', (alias, canonical) => {
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it('has no conflicting duplicate aliases in PR2_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR2_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('has no NLU_TO_REGISTRY_ID keys that map PR2 aliases to non-PR2 registry ids', () => {
    for (const [alias, canonical] of PR2_ALL_ALIAS_PAIRS) {
      const mapped = NLU_TO_REGISTRY_ID[alias];
      if (mapped !== undefined) {
        expect(PR2_TOOL_IDS).toContain(mapped);
        expect(mapped).toBe(canonical);
      }
    }
  });

  it.each(PR2_TOOL_IDS)(
    'product-required phrases appear in backend keywords or NLU_TO_REGISTRY_ID for %s',
    (id) => {
      const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
      const requiredForTool = PR2_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
        ([a]) => a,
      );
      for (const phrase of requiredForTool) {
        const slug = aliasToSlug(phrase);
        const inNluMap = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
        const inBackend = keywords.includes(slug) || keywords.includes(aliasToSlug(phrase));
        expect(
          inNluMap || inBackend,
          `alias "${phrase}" for ${id} missing from NLU_TO_REGISTRY_ID and backend keywords`,
        ).toBe(true);
      }
    },
  );

  it('separates Wells PE score aliases from PERC rule-out aliases', () => {
    expect(NLU_TO_REGISTRY_ID['pe-score']).toBe('wells-pe');
    expect(NLU_TO_REGISTRY_ID['pe-rule-out']).toBe('perc');
    expect(resolveCatalogLaunch('pe-score').registryId).toBe('wells-pe');
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe('perc');
  });
});

describe('PR2 registration audit — discovery & catalog', () => {
  it.each(PR2_DISCOVERY_ALIAS_PAIRS)(
    'toolIdAliases discovery row for %s → %s',
    (aliasId, canonical) => {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row, `missing toolIdAliases id ${aliasId}`).toBeTruthy();
      if (!row) throw new Error(`missing toolIdAliases id ${aliasId}`);
      expect(row.mapsTo).toBe(canonical);
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
    },
  );

  it.each(PR2_TOOL_IDS)('merged discovery includes canonical row for %s', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits.length).toBe(1);
    const expectedPath =
      PR2_ROUTE_BY_REGISTRY_ID[id] ?? PR2_HUB_ROUTE_BY_REGISTRY_ID[id] ?? PR2_HUB_PATH;
    expect(hits[0].path).toBe(expectedPath);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes]
      .filter(Boolean)
      .join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
  });

  it.each(PR2_TIER_A_TOOL_IDS)('medical catalog row for %s with form slug and page path', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row).toBeTruthy();
    expect(row.pagePath).toBe(PR2_ROUTE_BY_REGISTRY_ID[id]);
    expect(row.uiCalculatorSlug).toBe(id);
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed?.length).toBeGreaterThan(20);
    expect(row.chatOnlyForm).toBe(false);
  });

  it.each(PR2_TIER_B_TOOL_IDS)('medical catalog row for %s as chat-only on hub', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row).toBeTruthy();
    expect(row.pagePath).toBe(PR2_HUB_PATH);
    expect(row.chatOnlyForm).toBe(true);
    expect(row.uiCalculatorSlug).toBeNull();
    expect(row.chatSeed?.length).toBeGreaterThan(20);
  });

  it.each(PR2_CATALOG_SEARCH_QUERIES)('catalog search finds %s for "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(
      true,
    );
  });
});

describe('PR2 registration audit — sidebar, hub launch, deep links', () => {
  it('lists each PR2 tool exactly once in toolRegistry (sidebar visibility)', () => {
    const pr2InRegistry = toolRegistry.filter((t) =>
      (PR2_TOOL_IDS as readonly string[]).includes(t.id),
    );
    expect(pr2InRegistry).toHaveLength(PR2_TOOL_IDS.length);
    for (const id of PR2_TOOL_IDS) {
      expect(getToolIcon(id)).toBeTruthy();
      expect(toolRegistryById[id].panelTool).toBe('calculators');
    }
  });

  it.each(PR2_TIER_A_TOOL_IDS)(
    'resolveCatalogLaunch(%s) opens dedicated route with chat seed',
    (id) => {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(PR2_ROUTE_BY_REGISTRY_ID[id]);
      expect(launch.registryId).toBe(id);
      expect(launch.path).not.toBe(PR2_HUB_PATH);
      expect(launch.chatSeed?.length).toBeGreaterThan(20);
      // timi-ua-nstemi is a real registerTool() backend executor, so orchestratorTool resolves
      // to its tool id instead of null; meld/meld-na have no backend executor.
      const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] ?? null;
      expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
      expect(launch.openLabel).toBe('Open');
    },
  );

  it.each(PR2_TIER_B_TOOL_IDS)('resolveCatalogLaunch(%s) opens hub with guided chat', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR2_HUB_PATH);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed?.length).toBeGreaterThan(80);
    // wells-pe is now a real registerTool() backend executor (Tier C / backend-backed), so its
    // launch resolves to 'Open' with a real orchestratorTool id; perc remains chat-only.
    const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] ?? null;
    expect(launch.openLabel).toBe(expectedOrchestratorTool ? 'Open' : 'Start guided chat');
    expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
  });

  it.each(PR2_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical %s launch',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    },
  );

  it('places Wells PE and PERC in the pulmonary embolism hub group', () => {
    const peGroup = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'pe');
    expect(peGroup?.toolIds).toEqual(expect.arrayContaining(['wells-pe', 'perc']));
    expect(wellsPeChatConfig.registryId).toBe('wells-pe');
    expect(percChatConfig.registryId).toBe('perc');
  });

  it('matches Tier-B NLU chatSeed to chatAssisted config', () => {
    for (const [id, config] of [
      ['wells-pe', wellsPeChatConfig],
      ['perc', percChatConfig],
    ] as const) {
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.chatSeed).toBe(config.chatSeed);
      expect(resolveCatalogLaunch(id).chatSeed).toBe(config.chatSeed);
    }
  });

  it.each(PR2_TIER_A_TOOL_IDS)('builtin slug deep link (?calc=) for %s', (id) => {
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    if (!builtin) throw new Error(`builtinUiCalculators missing ${id}`);
    const fromBuiltin = resolveCatalogLaunch(id);
    expect(fromBuiltin.path).toBe(builtin.path);
    expect(builtin.calcQuery).toContain(`calc=${id}`);
    const fromCalcQuery = resolveCatalogLaunch(id);
    expect(fromCalcQuery.path).toBe(builtin.path);
  });
});

describe('PR2 registration audit — global duplicate guards', () => {
  it('has no duplicate toolIdAliases.id entries project-wide', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no Tier-A PR2 registry path pointing at calculators hub', () => {
    for (const id of PR2_TIER_A_TOOL_IDS) {
      expect(toolRegistryById[id].path).not.toBe(PR2_HUB_PATH);
    }
  });
});
