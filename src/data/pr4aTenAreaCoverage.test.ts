/**
 * PR4A ten-area Vitest matrix (registry → orphans).
 * Canonical checklist for ascvd-risk, ckd-staging, stop-bang, audit-c.
 * Complements pr4aComprehensive.test.js, pr4aCoverage.test.js, pr4aRegistrationAudit.test.js.
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
  PR4A_ALL_ALIAS_PAIRS,
  PR4A_BACKEND_DISAMBIGUATION_HELPERS,
  PR4A_CATALOG_SEARCH_QUERIES,
  PR4A_DISCOVERY_ALIAS_PAIRS,
  PR4A_EMPTY_LAUNCH,
  PR4A_REQUIRED_NLU_ALIAS_PAIRS,
  PR4A_ROUTE_BY_REGISTRY_ID,
  PR4A_TOOL_IDS,
  catalogRowsMatchingQuery,
} from './pr4aTestConstants';
import {
  assertPr4aAliasResolves,
  assertPr4aCatalogRow,
  assertPr4aDiscoveryCanonical,
  assertPr4aFullyWired,
  assertPr4aRegistryRow,
  expectUniqueAliasPairs,
} from './testHelpers/pr4aCoverageMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const ALIAS_CTX = {
  NLU_TO_REGISTRY_ID,
  resolveRegistryId,
  resolveCatalogLaunch,
  clinicalIntentToolsById,
};

const WIRING_CTX = {
  toolRegistryById,
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
  getMedicalToolsCatalogRows,
  getAllDiscoveredTools,
  builtinUiCalculators,
};

/** Mirrors pr4aComprehensive PR4A_COVERAGE_AREA_LABELS for cross-file consistency. */
export const PR4A_TEN_AREA_LABELS = [
  'ASCVD calculations',
  'CKD staging calculations',
  'STOP-Bang scoring',
  'AUDIT-C scoring',
  'registry mappings',
  'discovery inclusion',
  'catalog inclusion',
  'route resolution',
  'NLU aliases',
  'edge cases',
];

describe('PR4A ten-area coverage — matrix contract', () => {
  it('targets the four required Tier-A registry ids', () => {
    expect([...PR4A_TOOL_IDS]).toEqual([
      'ascvd-risk',
      'ckd-staging',
      'stop-bang',
      'audit-c',
    ]);
    expect([...PR4A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_TOOL_IDS]);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_TOOL_IDS]);
  });

  it('documents ten deterministic audit areas', () => {
    expect(PR4A_TEN_AREA_LABELS).toHaveLength(10);
  });

  it('keeps PR4A_REQUIRED_NLU_ALIAS_PAIRS aligned with product alias list', () => {
    expect(PR4A_REQUIRED_NLU_ALIAS_PAIRS.length).toBeGreaterThanOrEqual(16);
    for (const id of PR4A_TOOL_IDS) {
      const hits = PR4A_REQUIRED_NLU_ALIAS_PAIRS.filter(([, target]) => target === id);
      expect(hits.length, `required NLU aliases for ${id}`).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('PR4A ten-area — 5. registry mappings', () => {
  it.each(PR4A_TOOL_IDS)('%s is registered once with dedicated Tier-A path', (id) => {
    assertPr4aRegistryRow(id, { toolRegistry, toolRegistryById, getToolIcon });
  });

  it.each(PR4A_TOOL_IDS)('%s maps builtin slug to registry id', (id) => {
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
  });

  it.each(PR4A_TOOL_IDS)('%s is not in nluCalculatorHubOnly', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === (id as string))).toBe(false);
  });
});

describe('PR4A ten-area — 7. catalog inclusion', () => {
  it.each(PR4A_TOOL_IDS)('medical catalog includes %s with dedicated form', (id) => {
    assertPr4aCatalogRow(id, { getMedicalToolsCatalogRows, clinicalIntentToolsById });
  });

  it.each(PR4A_CATALOG_SEARCH_QUERIES)('search "%s" finds %s', (registryId, query) => {
    const hits = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(hits.some((r) => r.primaryId === registryId)).toBe(true);
  });
});

describe('PR4A ten-area — 6. discovery inclusion', () => {
  it.each(PR4A_TOOL_IDS)('merged discovery includes canonical %s once', (id) => {
    assertPr4aDiscoveryCanonical(id, { getAllDiscoveredTools });
  });

  it.each(PR4A_DISCOVERY_ALIAS_PAIRS)('toolIdAliases row %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR4A ten-area — 9. NLU aliases', () => {
  it.each(PR4A_REQUIRED_NLU_ALIAS_PAIRS)('required alias "%s" → %s', (alias, canonical) => {
    assertPr4aAliasResolves(alias, canonical, ALIAS_CTX);
  });

  it.each(PR4A_ALL_ALIAS_PAIRS)('alias "%s" matches canonical %s launch', (alias, canonical) => {
    assertPr4aAliasResolves(alias, canonical, ALIAS_CTX);
  });

  it('separates gfr calculator from ckd-staging staging aliases', () => {
    expect(resolveCatalogLaunch('gfr').registryId).toBe('calc-gfr');
    expect(resolveCatalogLaunch('gfr-stage').registryId).toBe('ckd-staging');
  });
});

describe('PR4A ten-area — resolveCatalogLaunch & navigation', () => {
  it.each(PR4A_TOOL_IDS)('canonical %s → dedicated path with Open label', (id) => {
    assertPr4aAliasResolves(id, id, ALIAS_CTX);
  });

  it.each(PR4A_TOOL_IDS)('navigation keeps Tier-A dedicated path for %s', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
  });

  it('returns empty launch for unknown ids', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR4A_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR4A_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('not-a-pr4a-tool-xyz').registryId).toBeNull();
  });
});

describe('PR4A ten-area — 8. route resolution', () => {
  it.each(PR4A_TOOL_IDS)('expectedLaunchPath(%s) matches dedicated route', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(isKnownToolAreaPath(PR4A_ROUTE_BY_REGISTRY_ID[id])).toBe(true);
  });

  it.each(PR4A_TOOL_IDS)('CALCULATOR_ROUTE_DEFS includes %s', (id) => {
    const path = PR4A_ROUTE_BY_REGISTRY_ID[id];
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id && d.path === path)).toBe(
      true
    );
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
  });

  it.each(PR4A_TOOL_IDS)('App.jsx mounts calculator routes via CALCULATOR_ROUTE_DEFS for %s', (id) => {
    const path = PR4A_ROUTE_BY_REGISTRY_ID[id];
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
  });
});

describe('PR4A ten-area — backend alias consistency', () => {
  it.each(PR4A_TOOL_IDS)('tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.filter((p) => p.toolId === id)).toHaveLength(1);
  });

  it('PR4A required catalog aliases pass clinicalToolAliasSync report', () => {
    const report = buildClinicalToolAliasSyncReport({ patternsSource });
    const pr4aMissing = report.missingCatalogAliases.filter((row) =>
      PR4A_TOOL_IDS.includes(row.expected)
    );
    const pr4aWrong = report.wrongCatalogTargets.filter((row) =>
      PR4A_TOOL_IDS.includes(row.expected)
    );
    expect(pr4aMissing).toEqual([]);
    expect(pr4aWrong).toEqual([]);
  });

  it.each(PR4A_TOOL_IDS)('required phrases in NLU map or backend keywords for %s', (id) => {
    const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
    const requiredForTool = PR4A_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
      ([a]) => a
    );
    for (const phrase of requiredForTool) {
      const slug = aliasToSlug(phrase);
      const inNlu = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
      const inBackend = keywords.includes(slug);
      expect(inNlu || inBackend, `missing backend/NLU for "${phrase}" (${id})`).toBe(true);
    }
  });

  it('documents PR4A disambiguation helpers in backend patterns', () => {
    for (const helper of PR4A_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });

  it('lists PR4A NLU toolIds in clinicalIntentTools exactly once each', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(clinicalIntentTools.filter((t) => t.toolId === id)).toHaveLength(1);
    }
  });
});

describe('PR4A ten-area — 10. edge cases & duplicate detection', () => {
  it('PR4A_ALL_ALIAS_PAIRS has no conflicting alias keys', () => {
    expectUniqueAliasPairs(PR4A_ALL_ALIAS_PAIRS);
  });

  it('toolIdAliases has globally unique id values', () => {
    const seen = new Set();
    for (const { id } of toolIdAliases) {
      expect(seen.has(id), `duplicate toolIdAliases.id: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('PR4A-targeting discovery aliases have unique ids and consistent mapsTo', () => {
    const pr4aRows = toolIdAliases.filter((a) => (PR4A_TOOL_IDS as readonly string[]).includes(a.mapsTo));
    const ids = pr4aRows.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [aliasId, canonical] of PR4A_DISCOVERY_ALIAS_PAIRS) {
      expect(toolIdAliases.find((a) => a.id === aliasId)?.mapsTo).toBe(canonical);
    }
  });

  it('separates ascvd-risk from chads2vasc', () => {
    expect(resolveCatalogLaunch('ascvd').registryId).toBe('ascvd-risk');
    expect(resolveCatalogLaunch('chads2vasc').registryId).toBe('calc-chads2vasc');
  });
});

describe('PR4A ten-area — no orphaned tool IDs', () => {
  it.each(PR4A_TOOL_IDS)('%s is wired through registry, NLU, catalog, discovery, and builtin', (id) => {
    assertPr4aFullyWired(id, WIRING_CTX);
  });

  it('PR4A-targeting discovery aliases do not point at missing registry ids', () => {
    const pr4aAliasRows = toolIdAliases.filter((a) => (PR4A_TOOL_IDS as readonly string[]).includes(a.mapsTo));
    for (const { id, mapsTo } of pr4aAliasRows) {
      expect(toolRegistryById[mapsTo], `orphan mapsTo for alias ${id}`).toBeTruthy();
    }
  });

  it.each(PR4A_TOOL_IDS)('NLU sidebarToolId matches registry id for %s', (id) => {
    expect(clinicalIntentToolsById[id].sidebarToolId).toBe(id);
  });

  it('dedicated-path registry rows for PR4A match frozen audit list exactly', () => {
    const pr4aDedicated = toolRegistry
      .filter((t) => (PR4A_TOOL_IDS as readonly string[]).includes(t.id))
      .map((t) => t.id)
      .sort();
    expect(pr4aDedicated).toEqual([...PR4A_TOOL_IDS].sort());
  });
});
