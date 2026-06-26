/**
 * PR3 ten-area Vitest matrix (registry → orphans).
 * Canonical checklist for grace-acs, nihss, canadian-c-spine, ottawa-ankle.
 * Complements pr3Comprehensive.test.js, pr3Coverage.test.js, pr3LaunchAudit.test.js.
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
  resolveRegistryId,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  isKnownToolAreaPath,
} from '../routes/clinicalToolRoutes';
import {
  buildClinicalToolAliasSyncReport,
  TOOL_PATTERNS_PATH,
} from './clinicalToolAliasSync';
import {
  aliasToSlug,
  extractToolPatternKeywords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';
import {
  PR3_ALL_ALIAS_PAIRS,
  PR3_CATALOG_SEARCH_QUERIES,
  PR3_CHAT_CONFIG_BY_ID,
  PR3_DISCOVERY_ALIAS_PAIRS,
  PR3_EMPTY_LAUNCH,
  PR3_NLU_ALIAS_PAIRS,
  PR3_REQUIRED_NLU_ALIAS_PAIRS,
  PR3_TOOL_IDS,
  catalogRowsMatchingQuery,
} from './pr3TestConstants';
import { GRACE_ACS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/graceAcs';
import { NIHSS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/nihss';
import { CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/canadianCSpine';
import { OTTAWA_ANKLE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/ottawaAnkle';
import {
  assertPr3AliasResolves,
  assertPr3CatalogRow,
  assertPr3DiscoveryCanonical,
  assertPr3FullyWired,
  assertPr3RegistryRow,
  expectUniqueAliasPairs,
} from './testHelpers/pr3CoverageMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const ALIAS_CTX = {
  NLU_TO_REGISTRY_ID,
  resolveRegistryId,
  resolveCatalogLaunch,
  chatConfigById: PR3_CHAT_CONFIG_BY_ID,
};

const WIRING_CTX = {
  toolRegistryById,
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
  getMedicalToolsCatalogRows,
  getAllDiscoveredTools,
};

/** Mirrors pr3Comprehensive PR3_COVERAGE_AREA_LABELS for cross-file consistency. */
export const PR3_TEN_AREA_LABELS = [
  'registry inclusion',
  'catalog inclusion',
  'discovery inclusion',
  'NLU alias matching',
  'resolveCatalogLaunch behavior',
  'chatSeed presence',
  'backend alias consistency',
  'route or hub path correctness',
  'duplicate alias detection',
  'no orphaned tool IDs',
];

describe('PR3 ten-area coverage — matrix contract', () => {
  it('targets the four required registry ids', () => {
    expect([...PR3_TOOL_IDS]).toEqual([
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
    ]);
    expect([...PR3_CALCULATOR_REGISTRY_IDS]).toEqual([...PR3_TOOL_IDS]);
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toEqual([...PR3_TOOL_IDS]);
  });

  it('documents ten deterministic audit areas', () => {
    expect(PR3_TEN_AREA_LABELS).toHaveLength(10);
  });

  it('keeps chat-config required NLU aliases in sync with pr3TestConstants', () => {
    const fromConfigs = [
      ...GRACE_ACS_REQUIRED_NLU_ALIASES.map((a) => [a, 'grace-acs']),
      ...NIHSS_REQUIRED_NLU_ALIASES.map((a) => [a, 'nihss']),
      ...CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES.map((a) => [a, 'canadian-c-spine']),
      ...OTTAWA_ANKLE_REQUIRED_NLU_ALIASES.map((a) => [a, 'ottawa-ankle']),
    ];
    expect(fromConfigs).toEqual([...PR3_REQUIRED_NLU_ALIAS_PAIRS]);
  });
});

describe('PR3 ten-area — 1. registry inclusion', () => {
  it.each(PR3_TOOL_IDS)('%s is registered once on calculators hub', (id) => {
    assertPr3RegistryRow(id, { toolRegistry, toolRegistryById, getToolIcon });
  });

  it.each(PR3_TOOL_IDS)('%s is not a builtin calculator slug', (id) => {
    expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBeUndefined();
  });
});

describe('PR3 ten-area — 2. catalog inclusion', () => {
  it.each(PR3_TOOL_IDS)('medical catalog includes %s as chat-only hub row', (id) => {
    assertPr3CatalogRow(id, { getMedicalToolsCatalogRows, clinicalIntentToolsById });
  });

  it.each(PR3_CATALOG_SEARCH_QUERIES)('search "%s" finds %s', (registryId, query) => {
    const hits = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(hits.some((r) => r.primaryId === registryId)).toBe(true);
  });
});

describe('PR3 ten-area — 3. discovery inclusion', () => {
  it.each(PR3_TOOL_IDS)('merged discovery includes canonical %s once', (id) => {
    assertPr3DiscoveryCanonical(id, { getAllDiscoveredTools });
  });

  it.each(PR3_DISCOVERY_ALIAS_PAIRS)('toolIdAliases row %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR3 ten-area — 4. NLU alias matching', () => {
  it.each(PR3_REQUIRED_NLU_ALIAS_PAIRS)('required alias "%s" → %s', (alias, canonical) => {
    assertPr3AliasResolves(alias, canonical, ALIAS_CTX);
  });

  it.each(PR3_NLU_ALIAS_PAIRS)('extended NLU alias "%s" → %s', (alias, canonical) => {
    assertPr3AliasResolves(alias, canonical, ALIAS_CTX);
  });

  it('separates stroke scale (NIHSS) from cervical spine aliases', () => {
    expect(resolveCatalogLaunch('stroke scale').registryId).toBe('nihss');
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe('canadian-c-spine');
  });
});

describe('PR3 ten-area — 5. resolveCatalogLaunch behavior', () => {
  it.each(PR3_TOOL_IDS)('canonical %s → hub guided chat launch', (id) => {
    assertPr3AliasResolves(id, id, ALIAS_CTX);
  });

  it.each(PR3_ALL_ALIAS_PAIRS)('alias "%s" matches canonical %s launch', (alias, canonical) => {
    assertPr3AliasResolves(alias, canonical, ALIAS_CTX);
  });

  it.each(PR3_TOOL_IDS)('navigation after launch opens chat for visible chat', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });

  it('returns empty launch for unknown ids', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR3_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR3_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('not-a-pr3-tool-xyz').registryId).toBeNull();
  });
});

describe('PR3 ten-area — 6. chatSeed presence', () => {
  it.each(PR3_TOOL_IDS)('NLU profile for %s has STEP 0 chatSeed from config', (id) => {
    const nlu = clinicalIntentToolsById[id];
    const cfg = PR3_CHAT_CONFIG_BY_ID[id];
    expect(nlu?.chatSeed).toBe(cfg.chatSeed);
    expect(nlu?.chatSeed).toMatch(/STEP 0/i);
    expect(nlu?.chatSeed?.length).toBeGreaterThan(100);
    expect(nlu?.backendExecutable).toBe(false);
  });

  it.each(PR3_TOOL_IDS)('%s is in nluCalculatorHubOnly', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
  });
});

describe('PR3 ten-area — 7. backend alias consistency', () => {
  it.each(PR3_TOOL_IDS)('tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.filter((p) => p.toolId === id)).toHaveLength(1);
  });

  it('PR3 required catalog aliases pass clinicalToolAliasSync report', () => {
    const report = buildClinicalToolAliasSyncReport({ patternsSource });
    const pr3Missing = report.missingCatalogAliases.filter((row) =>
      PR3_TOOL_IDS.includes(row.expected)
    );
    const pr3Wrong = report.wrongCatalogTargets.filter((row) =>
      PR3_TOOL_IDS.includes(row.expected)
    );
    expect(pr3Missing).toEqual([]);
    expect(pr3Wrong).toEqual([]);
  });

  it.each(PR3_TOOL_IDS)('required phrases in NLU map or backend keywords for %s', (id) => {
    const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
    const requiredForTool = PR3_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
      ([a]) => a
    );
    for (const phrase of requiredForTool) {
      const slug = aliasToSlug(phrase);
      const inNlu = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
      const inBackend = keywords.includes(slug);
      expect(inNlu || inBackend, `missing backend/NLU for "${phrase}" (${id})`).toBe(true);
    }
  });

  it('documents PR3 disambiguation helpers in backend patterns', () => {
    expect(patternsSource).toContain('preferGraceAcs');
    expect(patternsSource).toContain('preferNihss');
    expect(patternsSource).toContain('preferCanadianCSpine');
    expect(patternsSource).toContain('preferOttawaAnkle');
  });

  it('lists PR3 NLU toolIds in backend patterns exactly once each', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(patternsSource.split(`toolId: '${id}'`).length - 1).toBe(1);
    }
    expect(clinicalIntentTools.filter((t) => PR3_TOOL_IDS.includes(t.toolId))).toHaveLength(4);
  });
});

describe('PR3 ten-area — 8. route or hub path correctness', () => {
  it.each(PR3_TOOL_IDS)('expectedLaunchPath(%s) is calculators hub', (id) => {
    expect(expectedLaunchPath(id)).toBe('/tools/calculators');
    expect(isKnownToolAreaPath('/tools/calculators')).toBe(true);
  });

  it.each(PR3_TOOL_IDS)('%s has no dedicated App route or CALCULATOR_ROUTE_DEFS slug', (id) => {
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id)).toBe(false);
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
    expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    expect(toolRegistryById[id].path).not.toMatch(/^\/tools\/calculator\//);
  });
});

describe('PR3 ten-area — 9. duplicate alias detection', () => {
  it('PR3_ALL_ALIAS_PAIRS has no conflicting alias keys', () => {
    expectUniqueAliasPairs(PR3_ALL_ALIAS_PAIRS);
  });

  it('toolIdAliases has globally unique id values', () => {
    const seen = new Set();
    for (const { id } of toolIdAliases) {
      expect(seen.has(id), `duplicate toolIdAliases.id: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('PR3-targeting discovery aliases have unique ids and consistent mapsTo', () => {
    const pr3Rows = toolIdAliases.filter((a) => PR3_TOOL_IDS.includes(a.mapsTo));
    const ids = pr3Rows.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [aliasId, canonical] of PR3_DISCOVERY_ALIAS_PAIRS) {
      expect(toolIdAliases.find((a) => a.id === aliasId)?.mapsTo).toBe(canonical);
    }
  });
});

describe('PR3 ten-area — 10. no orphaned tool IDs', () => {
  it.each(PR3_TOOL_IDS)('%s is wired through registry, NLU, catalog, and discovery', (id) => {
    assertPr3FullyWired(id, WIRING_CTX);
  });

  it('PR3-targeting discovery aliases do not point at missing registry ids', () => {
    const pr3AliasRows = toolIdAliases.filter((a) => PR3_TOOL_IDS.includes(a.mapsTo));
    for (const { id, mapsTo } of pr3AliasRows) {
      expect(toolRegistryById[mapsTo], `orphan mapsTo for alias ${id}`).toBeTruthy();
    }
  });

  it.each(PR3_TOOL_IDS)('NLU sidebarToolId matches registry id for %s', (id) => {
    expect(clinicalIntentToolsById[id].sidebarToolId).toBe(id);
  });

  it('hub registry rows for PR3 match frozen audit list exactly', () => {
    const hubPr3 = toolRegistry
      .filter((t) => t.path === '/tools/calculators' && PR3_TOOL_IDS.includes(t.id))
      .map((t) => t.id)
      .sort();
    expect(hubPr3).toEqual([...PR3_TOOL_IDS].sort());
  });
});
