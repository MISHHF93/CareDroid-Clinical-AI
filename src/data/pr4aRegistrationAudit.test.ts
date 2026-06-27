/**
 * PR4A registration audit — cross-system consistency for ASCVD, CKD staging, STOP-Bang, AUDIT-C.
 * Complements per-tool wiring tests, pr4aConsistency.test.js, and pr4aCoverage.test.js.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR4A_CALCULATOR_REGISTRY_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
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
  PR4A_ALL_ALIAS_PAIRS,
  PR4A_CALC_QUERY_BY_REGISTRY_ID,
  PR4A_CATALOG_SEARCH_QUERIES,
  PR4A_DISCOVERY_ALIAS_PAIRS,
  PR4A_HUB_PATH,
  PR4A_REQUIRED_NLU_ALIAS_PAIRS,
  PR4A_ROUTE_BY_REGISTRY_ID,
  PR4A_TOOL_IDS,
  catalogRowsMatchingQuery,
} from './pr4aTestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const PR4A_ROUTE_PATH_SET = new Set(Object.values(PR4A_ROUTE_BY_REGISTRY_ID));

function _extractAppCalculatorRoutes(source) {
  const routes = [] as any[];
  const re = /path:\s*'(\/tools\/calculators\/[^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    routes.push(m[1]);
  }
  return routes;
}

describe('PR4A registration audit — canonical ID alignment', () => {
  it('keeps PR4A_CALCULATOR_REGISTRY_IDS frozen and matches tier-A slice', () => {
    expect(Object.isFrozen(PR4A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR4A_CALCULATOR_REGISTRY_IDS]).toEqual([
      'ascvd-risk',
      'ckd-staging',
      'stop-bang',
      'audit-c',
    ]);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_CALCULATOR_REGISTRY_IDS]);
  });

  it.each(PR4A_TOOL_IDS)('%s uses the same id across registry, NLU, builtin slug, and maps', (id) => {
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(clinicalIntentToolsById[id]).toBe(nlu);
    expect(nlu?.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.id).toBe(id);

    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(resolveRegistryId(id)).toBe(id);
  });

  it('has no PR4A registry rows outside the audit list (no orphans)', () => {
    const pr4aRows = toolRegistry.filter((t) => PR4A_TOOL_IDS.includes(t.id));
    expect(pr4aRows.map((t) => t.id).sort()).toEqual([...PR4A_TOOL_IDS].sort());
  });
});

describe('PR4A registration audit — routes, deep links, navigation', () => {
  it.each(PR4A_TOOL_IDS)('%s uses plural /tools/calculators/ path everywhere', (id) => {
    const path = PR4A_ROUTE_BY_REGISTRY_ID[id];
    expect(path).toBe(`${PR4A_HUB_PATH}/${id}`);
    expect(path).not.toMatch(/\/tools\/calculator\//);

    expect(toolRegistryById[id].path).toBe(path);
    expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.calcQuery).toBe(
      PR4A_CALC_QUERY_BY_REGISTRY_ID[id]
    );
  });

  it('registers each PR4A route via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, PR4A_TOOL_IDS);
  });

  it('has no orphaned PR4A routes in CALCULATOR_ROUTE_DEFS', () => {
    const registered = registeredCalculatorPathsForSet(PR4A_ROUTE_PATH_SET);
    expect(registered.sort()).toEqual([...PR4A_ROUTE_PATH_SET].sort());
  });

  it.each(PR4A_TOOL_IDS)('clinicalToolRoutes matches %s for deep links', (id) => {
    const path = PR4A_ROUTE_BY_REGISTRY_ID[id];
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(expectedLaunchPath(id)).toBe(path);
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
    expect(def?.path).toBe(path);
  });

  it.each(PR4A_TOOL_IDS)('Calculators.jsx switch includes case for %s', (id) => {
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });

  it.each(PR4A_TOOL_IDS)('resolveNavigationPathForLaunch keeps dedicated path (not dashboard)', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe(launch.path);
    expect(resolveNavigationPathForLaunch(launch)).not.toBe('/dashboard');
  });

  it.each(PR4A_TOOL_IDS)('resolveCatalogLaunch returns Open label and null orchestrator', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(launch.registryId).toBe(id);
    expect(launch.openLabel).toBe('Open');
    expect(launch.orchestratorTool).toBeNull();
    expect(launch.chatSeed?.length).toBeGreaterThan(40);
  });
});

describe('PR4A registration audit — NLU, backend, aliases', () => {
  it.each(PR4A_TOOL_IDS)('backend tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    const hits = patterns.filter((p) => p.toolId === id);
    expect(hits).toHaveLength(1);
  });

  it.each(PR4A_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    }
  );

  it.each(PR4A_ALL_ALIAS_PAIRS)('resolveRegistryId("%s") → %s', (alias, canonical) => {
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR4A_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical launch for %s',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(canonical);
    }
  );

  it('has no conflicting duplicate aliases in PR4A_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR4A_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('has no NLU_TO_REGISTRY_ID keys that map PR4A aliases to non-PR4A targets', () => {
    for (const [alias, canonical] of PR4A_ALL_ALIAS_PAIRS) {
      const mapped = NLU_TO_REGISTRY_ID[alias];
      if (mapped !== undefined) {
        expect(PR4A_TOOL_IDS).toContain(mapped);
        expect(mapped).toBe(canonical);
      }
    }
  });

  it.each(PR4A_TOOL_IDS)(
    'product-required phrases appear in backend keywords or NLU map for %s',
    (id) => {
      const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
      const requiredForTool = PR4A_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
        ([a]) => a
      );
      for (const phrase of requiredForTool) {
        const slug = aliasToSlug(phrase);
        const inNluMap = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
        const inBackend = keywords.includes(slug) || keywords.some((k) => k.includes(slug));
        expect(inNluMap || inBackend, `missing alias coverage for "${phrase}" → ${id}`).toBe(true);
      }
    }
  );

  it('excludes PR4A tools from chat-only hub list', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    }
  });
});

describe('PR4A registration audit — catalog, discovery, sidebar', () => {
  it.each(PR4A_TOOL_IDS)('%s appears exactly once in medical catalog with uiCalculatorSlug', (id) => {
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);
    expect(matches[0].uiCalculatorSlug).toBe(id);
    expect(matches[0].pagePath).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(matches[0].chatOnlyForm).toBe(false);
    expect(matches[0].backendExecutor).toBe(false);
  });

  it.each(PR4A_CATALOG_SEARCH_QUERIES)('catalog search "%s" finds %s', (id, query) => {
    const rows = getMedicalToolsCatalogRows();
    const hits = catalogRowsMatchingQuery(rows, query);
    expect(hits.some((r) => r.primaryId === id)).toBe(true);
  });

  it.each(PR4A_TOOL_IDS)('discovery merges %s exactly once', (id) => {
    const merged = getAllDiscoveredTools();
    expect(merged.filter((r) => r.id === id)).toHaveLength(1);
  });

  it.each(PR4A_DISCOVERY_ALIAS_PAIRS)('toolIdAliases documents %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
  });

  it.each(PR4A_TOOL_IDS)('%s has sidebar icon in iconRegistry', (id) => {
    expect(getToolIcon(id)).toBeTruthy();
  });
});
