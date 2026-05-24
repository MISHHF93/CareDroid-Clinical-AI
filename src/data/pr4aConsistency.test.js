/**
 * Cross-layer PR4A consistency: registry, NLU, catalog, discovery,
 * resolveCatalogLaunch, backend patterns, routes, sidebar, deep links.
 * Per-tool wiring: ascvdRiskWiring, ckdStagingWiring, stopBangWiring, auditCWiring.
 * Formula tests: src/utils/*Calculator.test.js
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
  ORCHESTRATOR_TO_REGISTRY_ID,
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
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import {
  PR4A_HUB_PATH,
  PR4A_REQUIRED_NLU_ALIAS_PAIRS,
  PR4A_DISCOVERY_ALIAS_PAIRS,
  PR4A_CATALOG_SEARCH_QUERIES,
  PR4A_BACKEND_DISAMBIGUATION_HELPERS,
  catalogRowsMatchingQuery,
} from './pr4aTestConstants';

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

const ALL_PR4A_ALIAS_PAIRS = [...PR4A_REQUIRED_NLU_ALIAS_PAIRS, ...PR4A_DISCOVERY_ALIAS_PAIRS];

const PR4A_DISCOVERY_ALIAS_IDS = toolIdAliases
  .filter((a) => PR4A_CALCULATOR_REGISTRY_IDS.includes(a.mapsTo))
  .map((a) => a.id);

describe('PR4A consistency — centralized audit lists', () => {
  it('freezes the four PR4A Tier-A registry ids', () => {
    expect(Object.isFrozen(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR4A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR4A_CALCULATOR_REGISTRY_IDS]).toEqual([
      'ascvd-risk',
      'ckd-staging',
      'stop-bang',
      'audit-c',
    ]);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_CALCULATOR_REGISTRY_IDS]);
  });

  it('has no PR4A registry ids outside the audit list (no orphans)', () => {
    const registryPr4a = toolRegistry.filter((t) =>
      ['ascvd-risk', 'ckd-staging', 'stop-bang', 'audit-c'].includes(t.id)
    );
    expect(registryPr4a.map((t) => t.id).sort()).toEqual([...PR4A_CALCULATOR_REGISTRY_IDS].sort());
  });
});

describe('PR4A consistency — registry, NLU, catalog, and backend alignment', () => {
  it('keeps registry id, route slug, NLU toolId, and backend pattern toolId aligned', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const route = `${PR4A_HUB_PATH}/${id}`;
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(reg.id).toBe(id);
      expect(reg.path).toBe(route);
      expect(reg.panelTool).toBe('calculators');
      expect(reg.initialCalc).toBe(id);
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(nlu.toolId).toBe(id);
      expect(nlu.path).toBe(route);
      expect(nlu.sidebarToolId).toBe(id);
      expect(nlu.backendExecutable).toBe(false);

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin, `builtinUiCalculators missing ${id}`).toBeTruthy();
      expect(builtin.id).toBe(id);
      expect(builtin.path).toBe(route);
      expect(builtin.calcQuery).toBe(`${PR4A_HUB_PATH}?calc=${id}`);
    }
  });

  it('maps BUILTIN_CALC_ID_TO_REGISTRY_ID and ORCHESTRATOR_TO_REGISTRY_ID to self', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('excludes PR4A tools from chat-only hub list (Tier-A dedicated forms)', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    }
  });

  it('documents backend disambiguation helpers for overlapping clinical phrases', () => {
    for (const helper of PR4A_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR4A consistency — aliases and duplicate detection', () => {
  it('has no duplicate toolIdAliases.id entries (global)', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves all product-required NLU aliases via NLU_TO_REGISTRY_ID and resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR4A_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias], `NLU alias missing: ${alias}`).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(`${PR4A_HUB_PATH}/${canonical}`);
      expect(launch.chatSeed.length).toBeGreaterThan(40);
      expect(launch.openLabel).toBe('Open');
    }
  });

  it('aligns discovery alias ids with NLU_TO_REGISTRY_ID and resolveRegistryId', () => {
    for (const [aliasId, canonical] of PR4A_DISCOVERY_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
      expect(resolveRegistryId(aliasId)).toBe(canonical);
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo).toBe(canonical);
    }
  });

  it('covers every PR4A discovery alias in the global alias list', () => {
    for (const aliasId of PR4A_DISCOVERY_ALIAS_IDS) {
      expect(PR4A_CALCULATOR_REGISTRY_IDS).toContain(
        toolIdAliases.find((a) => a.id === aliasId)?.mapsTo
      );
    }
    expect(PR4A_DISCOVERY_ALIAS_IDS.length).toBeGreaterThanOrEqual(PR4A_DISCOVERY_ALIAS_PAIRS.length);
  });

  it('does not map any PR4A alias key to a conflicting registry target', () => {
    for (const [alias, canonical] of ALL_PR4A_ALIAS_PAIRS) {
      const viaNlu = NLU_TO_REGISTRY_ID[alias];
      if (viaNlu && PR4A_CALCULATOR_REGISTRY_IDS.includes(viaNlu)) {
        expect(viaNlu).toBe(canonical);
      }
    }
  });

  it('separates gfr legacy calculator from ckd-staging gfr-stage alias', () => {
    expect(NLU_TO_REGISTRY_ID.gfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID.egfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID['gfr stage']).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr-stage').registryId).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr').registryId).toBe('calc-gfr');
  });

  it('separates ascvd-risk from chads2vasc cardiovascular aliases', () => {
    expect(NLU_TO_REGISTRY_ID.ascvd).toBe('ascvd-risk');
    expect(NLU_TO_REGISTRY_ID.chads2vasc).toBe('calc-chads2vasc');
    expect(resolveCatalogLaunch('cardiovascular-risk').registryId).toBe('ascvd-risk');
  });
});

describe('PR4A consistency — catalog, discovery, and searchability', () => {
  it('includes each PR4A tool exactly once in catalog rows with form + chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const matches = rows.filter((r) => r.primaryId === id);
      expect(matches, `catalog row count for ${id}`).toHaveLength(1);
      const row = matches[0];
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed.length).toBeGreaterThan(20);
      expect(row.chatOnlyForm).toBe(false);
      expect(row.uiCalculatorSlug).toBe(id);
      expect(row.pagePath).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(row.backendExecutor).toBe(false);
    }
  });

  it('finds each PR4A tool via ClinicalToolCatalog-style search queries', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const [id, query] of PR4A_CATALOG_SEARCH_QUERIES) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === id), `search "${query}" → ${id}`).toBe(true);
    }
  });

  it('merges discovery rows for each PR4A id exactly once', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length, `discovery duplicates for ${id}`).toBe(1);
      const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
    }
  });

  it('counts PR4A primaries in catalog summary without orphan registry-only duplicates', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr4aPrimaries = new Set(
      rows.filter((r) => PR4A_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr4aPrimaries.size).toBe(PR4A_CALCULATOR_REGISTRY_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
  });
});

describe('PR4A consistency — resolveCatalogLaunch, routes, sidebar, deep links', () => {
  it('resolves canonical id and NLU toolId launches to dedicated calculator paths', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const fromId = resolveCatalogLaunch(id);
      const fromNlu = resolveCatalogLaunch(id);
      expect(fromId.path).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(fromId.registryId).toBe(id);
      expect(fromId.openLabel).toBe('Open');
      expect(fromId.orchestratorTool).toBeNull();
      expect(fromNlu.chatSeed.length).toBeGreaterThan(40);
    }
  });

  it('resolves hyphenated discovery aliases to the same launch as canonical ids', () => {
    for (const [aliasId, canonical] of PR4A_DISCOVERY_ALIAS_PAIRS) {
      const fromAlias = resolveCatalogLaunch(aliasId);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.registryId).toBe(canonical);
    }
  });

  it('resolves builtin slug and ?calc= deep links for each PR4A tool', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const fromBuiltin = resolveCatalogLaunch(id);
      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(fromBuiltin.path).toBe(builtin.path);
      expect(builtin.calcQuery).toContain(`calc=${id}`);
    }
  });

  it('registers calculator routes via CALCULATOR_ROUTE_DEFS before calculators hub', () => {
    expect(appSource).toContain('CALCULATOR_ROUTE_DEFS.map');
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      expect(matchCalculatorRoute(`${PR4A_HUB_PATH}/${id}`)?.calculatorSlug).toBe(id);
    }
  });

  it('lists each PR4A tool in Calculators.jsx hub (builtinUiCalculators) and switch', () => {
    expect(calculatorsSource).toContain('builtinUiCalculators.map');
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      expect(calculatorsSource).toContain(`case '${id}':`);
    }
  });

  it('exposes each PR4A registry id exactly once in toolRegistry (sidebar visibility)', () => {
    const pr4aRows = toolRegistry.filter((t) => PR4A_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr4aRows).toHaveLength(PR4A_CALCULATOR_REGISTRY_IDS.length);
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      const icon = getToolIcon(id);
      expect(icon).toBeTruthy();
      expect(icon).not.toBe(getToolIcon('__nonexistent_tool_xyz__'));
    }
  });

  it('uses plural /tools/calculators/ paths (not legacy /tools/calculator/)', () => {
    for (const id of PR4A_CALCULATOR_REGISTRY_IDS) {
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
      expect(toolRegistryById[id].path.startsWith(`${PR4A_HUB_PATH}/`)).toBe(true);
    }
  });

  it('does not expose empty launch for unknown ids', () => {
    const empty = resolveCatalogLaunch('not-a-pr4a-calculator');
    expect(empty.path).toBe('/assistant');
    expect(empty.registryId).toBeNull();
    expect(empty.chatSeed).toBeTruthy();
  });

  it.each(PR4A_CALCULATOR_REGISTRY_IDS)(
    'resolveNavigationPathForLaunch keeps Tier-A path for %s',
    (id) => {
      const launch = resolveCatalogLaunch(id);
      expect(resolveNavigationPathForLaunch(launch)).toBe(launch.path);
      expect(resolveNavigationPathForLaunch(launch)).not.toBe('/dashboard');
    }
  );

  it.each(PR4A_CALCULATOR_REGISTRY_IDS)(
    'clinicalToolRoutes deep-link helpers align for %s',
    (id) => {
      const path = `${PR4A_HUB_PATH}/${id}`;
      expect(expectedLaunchPath(id)).toBe(path);
      expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
      expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(path);
    }
  );
});
