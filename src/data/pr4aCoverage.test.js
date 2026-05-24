/**
 * Cross-layer PR4A coverage (mirrors pr2Coverage.test.js / pr3Coverage.test.js).
 * Formula / clinical edge cases: src/utils/*Calculator.test.js
 * Comprehensive matrix: pr4aComprehensive.test.js, pr4aTenAreaCoverage.test.js
 * Per-tool wiring: ascvdRiskWiring, ckdStagingWiring, stopBangWiring, auditCWiring
 * Cross-cutting matrix: pr4aConsistency.test.js, pr4aRegistrationAudit.test.js
 * UX / safety: pr4aUxSafetyAccessibility.test.js
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
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR4A_CALCULATOR_REGISTRY_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';
import {
  PR4A_HUB_PATH,
  PR4A_TOOL_IDS,
  PR4A_EMPTY_LAUNCH,
  PR4A_ALL_ALIAS_PAIRS,
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

function countPatternOccurrences(needle) {
  return patternsSource.split(needle).length - 1;
}

describe('PR4A coverage — registry inclusion', () => {
  it('freezes the four PR4A Tier-A registry ids', () => {
    expect(Object.isFrozen(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR4A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR4A_TOOL_IDS]).toEqual([
      'ascvd-risk',
      'ckd-staging',
      'stop-bang',
      'audit-c',
    ]);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_CALCULATOR_REGISTRY_IDS]);
  });

  it('includes each PR4A tool exactly once in toolRegistry with calculator panel', () => {
    const pr4aRows = toolRegistry.filter((t) => PR4A_TOOL_IDS.includes(t.id));
    expect(pr4aRows).toHaveLength(PR4A_TOOL_IDS.length);
    for (const id of PR4A_TOOL_IDS) {
      const reg = toolRegistryById[id];
      expect(reg?.id).toBe(id);
      expect(reg.panelTool).toBe('calculators');
      expect(reg.path).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(reg.initialCalc).toBe(id);
      expect(getToolIcon(id)).toBeTruthy();
    }
  });

  it('maps each PR4A builtin slug to its registry id', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin?.path).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(builtin?.calcQuery).toContain(`calc=${id}`);
    }
  });

  it('does not list PR4A tools in chat-only hub (Tier-A dedicated forms)', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    }
  });
});

describe('PR4A coverage — catalog inclusion', () => {
  it('includes each PR4A tool in catalog rows with form + chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR4A_TOOL_IDS) {
      const matches = rows.filter((r) => r.primaryId === id);
      expect(matches, `catalog row count for ${id}`).toHaveLength(1);
      const row = matches[0];
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed?.length).toBeGreaterThan(20);
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

  it('counts PR4A primaries in catalog summary without double-counting', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr4aPrimaries = new Set(
      rows.filter((r) => PR4A_TOOL_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr4aPrimaries.size).toBe(PR4A_TOOL_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
  });
});

describe('PR4A coverage — discovery inclusion', () => {
  it('merges discovery rows for each PR4A id exactly once with calculator provenance', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR4A_TOOL_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length, `discovery duplicates for ${id}`).toBe(1);
      const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
    }
  });

  it('documents every PR4A discovery alias in toolIdAliases with matching mapsTo', () => {
    for (const [aliasId, canonical] of PR4A_DISCOVERY_ALIAS_PAIRS) {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row, `discovery alias row missing: ${aliasId}`).toBeTruthy();
      expect(row.mapsTo).toBe(canonical);
    }
  });

  it('indexes PR4A discovery aliases that map to each canonical id', () => {
    for (const id of PR4A_TOOL_IDS) {
      const aliases = toolIdAliases.filter((a) => a.mapsTo === id);
      expect(aliases.length, `discovery aliases for ${id}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('PR4A coverage — NLU profiles', () => {
  it('registers each PR4A tool in clinicalIntentTools with dedicated path', () => {
    for (const id of PR4A_TOOL_IDS) {
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(clinicalIntentToolsById[id]).toBe(nlu);
      expect(nlu.path).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(nlu.sidebarToolId).toBe(id);
      expect(nlu.backendExecutable).toBe(false);
      expect(nlu.chatSeed?.length).toBeGreaterThan(40);
    }
  });
});

describe('PR4A coverage — NLU aliases & resolveCatalogLaunch', () => {
  it('resolves all PR4A NLU and discovery aliases to the same launch as canonical ids', () => {
    for (const [alias, canonical] of PR4A_ALL_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias], `NLU_TO_REGISTRY_ID missing: ${alias}`).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);

      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(`${PR4A_HUB_PATH}/${canonical}`);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.chatSeed?.length).toBeGreaterThan(20);
    }
  });

  it('resolves canonical id and NLU toolId launches to dedicated calculator paths', () => {
    for (const id of PR4A_TOOL_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(`${PR4A_HUB_PATH}/${id}`);
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Open');
      expect(launch.chatSeed).toBe(clinicalIntentToolsById[id]?.chatSeed);
    }
  });

  it('resolves builtin slug deep links for each PR4A tool', () => {
    for (const id of PR4A_TOOL_IDS) {
      const launch = resolveCatalogLaunch(id);
      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(launch.path).toBe(builtin?.path);
      expect(builtin?.calcQuery).toContain(`calc=${id}`);
    }
  });

  it('returns empty launch for falsy or unknown ids without throwing', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR4A_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR4A_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('not-a-pr4a-tool-xyz').path).toBe('/assistant');
  });
});

describe('PR4A coverage — route resolution', () => {
  it('registers dedicated calculator routes via CALCULATOR_ROUTE_DEFS before hub', () => {
    expect(appSource).toContain('CALCULATOR_ROUTE_DEFS.map');
    for (const id of PR4A_TOOL_IDS) {
      expect(matchCalculatorRoute(`${PR4A_HUB_PATH}/${id}`)?.calculatorSlug).toBe(id);
    }
  });

  it('does not use legacy singular /tools/calculator/ paths for PR4A registry rows', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
      expect(toolRegistryById[id].path.startsWith(PR4A_HUB_PATH)).toBe(true);
    }
  });
});

describe('PR4A coverage — backend patterns', () => {
  it('declares each PR4A toolId exactly once in backend tool.patterns', () => {
    for (const id of PR4A_TOOL_IDS) {
      expect(countPatternOccurrences(`toolId: '${id}'`)).toBe(1);
    }
  });

  it('documents backend disambiguation helpers for PR4A tools', () => {
    for (const helper of PR4A_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR4A coverage — edge cases & alias disambiguation', () => {
  it('separates legacy gfr calculator from ckd-staging gfr-stage alias', () => {
    expect(NLU_TO_REGISTRY_ID.gfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID.egfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID['gfr stage']).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr').registryId).toBe('calc-gfr');
    expect(resolveCatalogLaunch('gfr-stage').registryId).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr-stage').path).toBe(`${PR4A_HUB_PATH}/ckd-staging`);
  });

  it('separates ascvd-risk from chads2vasc cardiovascular aliases', () => {
    expect(NLU_TO_REGISTRY_ID.ascvd).toBe('ascvd-risk');
    expect(NLU_TO_REGISTRY_ID.chads2vasc).toBe('calc-chads2vasc');
    expect(resolveCatalogLaunch('cardiovascular-risk').registryId).toBe('ascvd-risk');
    expect(resolveCatalogLaunch('chads2vasc').registryId).toBe('calc-chads2vasc');
  });

  it('has no duplicate toolIdAliases.id entries among PR4A discovery aliases', () => {
    const pr4aAliasIds = PR4A_DISCOVERY_ALIAS_PAIRS.map(([id]) => id);
    expect(new Set(pr4aAliasIds).size).toBe(pr4aAliasIds.length);
  });

  it('includes at least one required NLU alias per PR4A canonical id', () => {
    for (const id of PR4A_TOOL_IDS) {
      const hits = PR4A_REQUIRED_NLU_ALIAS_PAIRS.filter(([, target]) => target === id);
      expect(hits.length, `required NLU aliases for ${id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
