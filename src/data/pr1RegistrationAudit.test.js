/**
 * PR1 registration audit — cross-system consistency for qSOFA, NEWS2, Child-Pugh, HAS-BLED.
 * Complements pr1CalculatorsWiring.test.js (matrix) and pr1Coverage.test.js (catalog/discovery).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR1_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import {
  PR1_ALL_ALIAS_PAIRS,
  PR1_CATALOG_SEARCH_QUERIES,
  PR1_DISCOVERY_ALIAS_PAIRS,
  PR1_REQUIRED_NLU_ALIAS_PAIRS,
  PR1_ROUTE_BY_REGISTRY_ID,
  PR1_CALC_QUERY_BY_REGISTRY_ID,
  PR1_TOOL_IDS,
} from './pr1TestConstants';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { TOOL_PATTERNS_PATH } from './clinicalToolAliasSync';
import {
  aliasToSlug,
  extractToolPatternKeywords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const PR1_PATH_SET = new Set(Object.values(PR1_ROUTE_BY_REGISTRY_ID));

function extractAppCalculatorRoutes(source) {
  const routes = [];
  const re = /path:\s*'(\/tools\/calculators\/[^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    routes.push(m[1]);
  }
  return routes;
}

describe('PR1 registration audit — canonical ID alignment', () => {
  it.each(PR1_TOOL_IDS)('%s uses the same id across registry, NLU, builtin slug, and maps', (id) => {
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.sidebarToolId).toBe(id);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.id).toBe(id);

    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(NLU_TO_REGISTRY_ID[id]).toBe(id);
    expect(resolveRegistryId(id)).toBe(id);
  });

  it('keeps PR1_CALCULATOR_REGISTRY_IDS frozen and ordered', () => {
    expect(Object.isFrozen(PR1_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR1_CALCULATOR_REGISTRY_IDS]).toEqual(['qsofa', 'news2', 'child-pugh', 'has-bled']);
  });
});

describe('PR1 registration audit — routes & path naming', () => {
  it.each(PR1_TOOL_IDS)('%s uses plural /tools/calculators/ path everywhere', (id) => {
    const path = PR1_ROUTE_BY_REGISTRY_ID[id];
    expect(path).toBe(`/tools/calculators/${id}`);
    expect(path).not.toMatch(/\/tools\/calculator\//);

    expect(toolRegistryById[id].path).toBe(path);
    expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.path).toBe(path);
    expect(builtinUiCalculators.find((c) => c.id === id)?.calcQuery).toBe(
      PR1_CALC_QUERY_BY_REGISTRY_ID[id]
    );
  });

  it('registers each PR1 route in App.jsx with matching initialCalculatorId (deep link)', () => {
    for (const id of PR1_TOOL_IDS) {
      const path = PR1_ROUTE_BY_REGISTRY_ID[id];
      expect(appSource).toContain(`path: '${path}'`);
      expect(appSource).toContain(`initialCalculatorId="${id}"`);
    }
  });

  it('has no orphaned PR1 App routes (route slug must be a PR1 registry id)', () => {
    const appCalcRoutes = extractAppCalculatorRoutes(appSource).filter((p) =>
      PR1_PATH_SET.has(p)
    );
    expect(appCalcRoutes.sort()).toEqual([...PR1_PATH_SET].sort());
  });

  it.each(PR1_TOOL_IDS)('clinicalToolRoutes matches %s for deep links', (id) => {
    const path = PR1_ROUTE_BY_REGISTRY_ID[id];
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(expectedLaunchPath(id)).toBe(path);
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
    expect(def?.path).toBe(path);
  });

  it.each(PR1_TOOL_IDS)('CalculatorInterface switch includes case for %s', (id) => {
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });
});

describe('PR1 registration audit — NLU, backend keywords, aliases', () => {
  it.each(PR1_TOOL_IDS)('backend tool.patterns.ts declares toolId %s', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.some((p) => p.toolId === id)).toBe(true);
  });

  it.each(PR1_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps catalog alias "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    }
  );

  it.each(PR1_ALL_ALIAS_PAIRS)('resolveRegistryId("%s") → %s', (alias, canonical) => {
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it('has no conflicting duplicate aliases in PR1_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR1_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('has no NLU_TO_REGISTRY_ID keys that map PR1 aliases to non-PR1 registry ids', () => {
    for (const [alias, canonical] of PR1_ALL_ALIAS_PAIRS) {
      const mapped = NLU_TO_REGISTRY_ID[alias];
      if (mapped !== undefined) {
        expect(PR1_TOOL_IDS).toContain(mapped);
        expect(mapped).toBe(canonical);
      }
    }
  });

  it.each(PR1_TOOL_IDS)(
    'product-required phrases appear in backend keywords or NLU_TO_REGISTRY_ID for %s',
    (id) => {
      const keywords = extractToolPatternKeywords(patternsSource, id).map((k) =>
        aliasToSlug(k)
      );
      const requiredForTool = PR1_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
        ([a]) => a
      );
      for (const phrase of requiredForTool) {
        const slug = aliasToSlug(phrase);
        const inNluMap = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
        const inBackend = keywords.includes(slug) || keywords.includes(aliasToSlug(phrase));
        expect(
          inNluMap || inBackend,
          `alias "${phrase}" for ${id} missing from NLU_TO_REGISTRY_ID and backend keywords`
        ).toBe(true);
      }
    }
  );
});

describe('PR1 registration audit — discovery & catalog', () => {
  it.each(PR1_DISCOVERY_ALIAS_PAIRS)(
    'toolIdAliases discovery row for %s → %s',
    (aliasId, canonical) => {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row, `missing toolIdAliases id ${aliasId}`).toBeTruthy();
      expect(row.mapsTo).toBe(canonical);
    }
  );

  it.each(PR1_TOOL_IDS)('merged discovery includes canonical row for %s', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits.length).toBe(1);
    expect(hits[0].path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
  });

  it.each(PR1_TOOL_IDS)('medical catalog row for %s with form slug and page path', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row).toBeTruthy();
    expect(row.pagePath).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
    expect(row.uiCalculatorSlug).toBe(id);
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed?.length).toBeGreaterThan(20);
  });

  it.each(PR1_CATALOG_SEARCH_QUERIES)('catalog search finds %s for "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(
      true
    );
  });
});

describe('PR1 registration audit — sidebar & chat launch', () => {
  it('lists each PR1 tool exactly once in toolRegistry (sidebar visibility)', () => {
    const pr1InRegistry = toolRegistry.filter((t) => PR1_TOOL_IDS.includes(t.id));
    expect(pr1InRegistry).toHaveLength(PR1_TOOL_IDS.length);
    for (const id of PR1_TOOL_IDS) {
      expect(toolRegistryById[id].panelTool).toBe('calculators');
      expect(toolRegistryById[id].initialCalc).toBe(id);
    }
  });

  it.each(PR1_TOOL_IDS)('resolveCatalogLaunch(%s) opens dedicated route with chat seed', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
    expect(launch.registryId).toBe(id);
    expect(launch.path).not.toBe('/tools/calculators');
    expect(launch.chatSeed?.length).toBeGreaterThan(20);
    expect(launch.orchestratorTool).toBeNull();
    expect(['Open calculator', 'Open']).toContain(launch.openLabel);
  });

  it.each(PR1_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical %s chat launch',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.path).toBe(PR1_ROUTE_BY_REGISTRY_ID[canonical]);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    }
  );

  it('includes PR1 calculators in hub builtinUiCalculators selection list', () => {
    for (const id of PR1_TOOL_IDS) {
      expect(builtinUiCalculators.some((c) => c.id === id)).toBe(true);
      expect(calculatorsSource).toMatch(
        new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`)
      );
    }
  });
});

describe('PR1 registration audit — global duplicate guards', () => {
  it('has no duplicate toolIdAliases.id entries project-wide', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no PR1 registry path pointing at calculators hub', () => {
    for (const id of PR1_TOOL_IDS) {
      expect(toolRegistryById[id].path).not.toBe('/tools/calculators');
    }
  });
});
