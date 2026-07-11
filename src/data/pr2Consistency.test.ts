/**
 * Cross-layer PR2 consistency (registry, routes, NLU, catalog, discovery).
 * Full registration audit: pr2RegistrationAudit.test.js
 * Per-tool wiring: meldCalculatorsWiring, timiCalculatorsWiring, wellsPeWiring, percWiring
 */

import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  PR2_MELD_CALCULATOR_REGISTRY_IDS,
  PR2_TIMI_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  PR2_ALL_ALIAS_PAIRS,
  PR2_CATALOG_SEARCH_QUERIES,
  PR2_HUB_PATH,
  PR2_ROUTE_BY_REGISTRY_ID,
} from './pr2TestConstants';

describe('PR2 consistency — centralized audit lists', () => {
  it('freezes the five PR2 registry ids across tier groupings', () => {
    expect(Object.isFrozen(PR2_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR2_CALCULATOR_REGISTRY_IDS]).toEqual([
      'meld',
      'meld-na',
      'timi-ua-nstemi',
      'wells-pe',
      'perc',
    ]);
    expect([...PR2_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([
      ...PR2_MELD_CALCULATOR_REGISTRY_IDS,
      ...PR2_TIMI_CALCULATOR_REGISTRY_IDS,
    ]);
    expect([...PR2_TIER_B_CHAT_CALCULATOR_IDS]).toEqual(['wells-pe', 'perc']);
  });

  it('aggregates alias pairs without internal conflicts', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR2_ALL_ALIAS_PAIRS) {
      expect(byAlias.get(alias), `duplicate alias "${alias}"`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
    expect(PR2_ALL_ALIAS_PAIRS.length).toBeGreaterThan(20);
  });
});

describe('PR2 consistency — registry, NLU, and builtin alignment', () => {
  it('keeps registry, NLU profile, and backendExecutable false for each PR2 tool', () => {
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      expect(toolRegistryById[id], `toolRegistry missing ${id}`).toBeTruthy();
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      if (!nlu) throw new Error(`expected clinicalIntentTools to include ${id}`);
      expect(nlu.backendExecutable).toBe(false);
      expect(nlu.sidebarToolId).toBe(id);
    }
  });

  it('wires Tier-A tools with dedicated routes, builtin rows, and initialCalc', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      const route = PR2_ROUTE_BY_REGISTRY_ID[id];
      expect(reg.path).toBe(route);
      expect(reg.initialCalc).toBe(id);
      expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(route);
      expect(builtinUiCalculators.find((c) => c.id === id)?.path).toBe(route);
    }
  });

  it('wires Tier-B tools as hub-only without builtin forms', () => {
    for (const id of PR2_TIER_B_CHAT_CALCULATOR_IDS) {
      expect(toolRegistryById[id].path).toBe(PR2_HUB_PATH);
      expect(toolRegistryById[id].initialCalc).toBeUndefined();
      expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
    }
  });
});

describe('PR2 consistency — aliases and discovery', () => {
  it('aligns PR2 discovery aliases with NLU_TO_REGISTRY_ID', () => {
    const pr2Aliases = toolIdAliases.filter((a) =>
      (PR2_CALCULATOR_REGISTRY_IDS as readonly string[]).includes(a.mapsTo)
    );
    expect(pr2Aliases.length).toBeGreaterThan(0);
    for (const { id, mapsTo } of pr2Aliases) {
      expect(NLU_TO_REGISTRY_ID[id]).toBe(mapsTo);
    }
  });

  it.each(PR2_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(canonical);
    }
  );
});

describe('PR2 consistency — catalog, discovery, and searchability', () => {
  it.each(PR2_CATALOG_SEARCH_QUERIES)('catalog search finds %s for "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId)).toBe(true);
  });

  it('merges discovery rows for each PR2 id exactly once', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      expect(merged.filter((r) => r.id === id).length).toBe(1);
    }
  });

  it('counts PR2 primaries in catalog summary without double-counting', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr2Primaries = new Set(
      rows.filter((r) => PR2_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr2Primaries.size).toBe(PR2_CALCULATOR_REGISTRY_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
  });
});

describe('PR2 consistency — sidebar visibility', () => {
  it('exposes each PR2 registry id exactly once in toolRegistry', () => {
    const pr2Rows = toolRegistry.filter((t) =>
      (PR2_CALCULATOR_REGISTRY_IDS as readonly string[]).includes(t.id)
    );
    expect(pr2Rows).toHaveLength(PR2_CALCULATOR_REGISTRY_IDS.length);
  });
});
