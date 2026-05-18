/**
 * Cross-layer PR2 consistency: registry, routes, NLU, catalog, discovery, resolveCatalogLaunch, backend patterns.
 * Per-tool wiring detail lives in meldCalculatorsWiring, timiCalculatorsWiring, wellsPeWiring, percWiring.
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
import {
  resolveCatalogLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR2_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  PR2_MELD_CALCULATOR_REGISTRY_IDS,
  PR2_TIMI_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

const PR2_HUB_PATH = '/tools/calculators';

const PR2_DISCOVERY_ALIAS_IDS = toolIdAliases
  .filter((a) => PR2_CALCULATOR_REGISTRY_IDS.includes(a.mapsTo))
  .map((a) => a.id);

const PR2_NLU_ALIAS_PAIRS = [
  ['meld-score', 'meld'],
  ['liver-transplant-score', 'meld-na'],
  ['end-stage-liver-disease-score', 'meld'],
  ['timi-score', 'timi-ua-nstemi'],
  ['timi-nstemi', 'timi-ua-nstemi'],
  ['wells-pe-score', 'wells-pe'],
  ['pe-score', 'wells-pe'],
  ['pe-rule-out', 'perc'],
  ['perc-rule', 'perc'],
  ['pulmonary-embolism-rule-out', 'perc'],
];

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
});

describe('PR2 consistency — registry, NLU, and builtin alignment', () => {
  it('keeps registry, NLU profile, and backend pattern toolId aligned for each PR2 tool', () => {
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(nlu.backendExecutable).toBe(false);
      expect(nlu.sidebarToolId).toBe(id);
    }
  });

  it('wires Tier-A tools with dedicated routes, builtin rows, and initialCalc', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      const route = `${PR2_HUB_PATH}/${id}`;
      expect(reg.path).toBe(route);
      expect(reg.initialCalc).toBe(id);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu.path).toBe(route);

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin?.path).toBe(route);
      expect(builtin?.calcQuery).toBe(`${PR2_HUB_PATH}?calc=${id}`);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('wires Tier-B tools as hub-only without standalone App routes or builtin forms', () => {
    for (const id of PR2_TIER_B_CHAT_CALCULATOR_IDS) {
      const reg = toolRegistryById[id];
      expect(reg.path).toBe(PR2_HUB_PATH);
      expect(reg.initialCalc).toBeUndefined();

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu.path).toBe(PR2_HUB_PATH);

      expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
      expect(appSource).not.toContain(`path: '${PR2_HUB_PATH}/${id}'`);
      expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    }
  });

  it('matches Tier-B chat config registryId and hubPath to NLU rows', () => {
    expect(wellsPeChatConfig.registryId).toBe('wells-pe');
    expect(wellsPeChatConfig.hubPath).toBe(PR2_HUB_PATH);
    expect(percChatConfig.registryId).toBe('perc');
    expect(percChatConfig.hubPath).toBe(PR2_HUB_PATH);
  });
});

describe('PR2 consistency — aliases and duplicate detection', () => {
  it('has no duplicate toolIdAliases.id entries (global)', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aligns PR2 discovery aliases with NLU_TO_REGISTRY_ID and resolveRegistryId', () => {
    for (const aliasId of PR2_DISCOVERY_ALIAS_IDS) {
      const alias = toolIdAliases.find((a) => a.id === aliasId);
      expect(alias?.mapsTo).toBeTruthy();
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(alias.mapsTo);
      expect(resolveRegistryId(aliasId)).toBe(alias.mapsTo);
    }
  });

  it('resolves hyphenated NLU alias keys to the same launch as canonical PR2 ids', () => {
    for (const [alias, canonical] of PR2_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.registryId).toBe(canonical);
    }
  });

  it('separates Wells PE score aliases from PERC rule-out aliases', () => {
    expect(NLU_TO_REGISTRY_ID['pe-score']).toBe('wells-pe');
    expect(NLU_TO_REGISTRY_ID['pe-rule-out']).toBe('perc');
    expect(resolveCatalogLaunch('pe-score').registryId).toBe('wells-pe');
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe('perc');
  });

  it('does not map any single alias id to multiple registry targets', () => {
    const byAlias = new Map();
    for (const [key, target] of Object.entries(NLU_TO_REGISTRY_ID)) {
      if (!PR2_CALCULATOR_REGISTRY_IDS.includes(target)) continue;
      if (byAlias.has(key) && byAlias.get(key) !== target) {
        throw new Error(`NLU alias "${key}" maps to both ${byAlias.get(key)} and ${target}`);
      }
      byAlias.set(key, target);
    }
  });
});

describe('PR2 consistency — catalog, discovery, and searchability', () => {
  it('includes each PR2 tool in catalog rows with chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      const row = rows.find((r) => r.primaryId === id);
      expect(row, `catalog row for ${id}`).toBeTruthy();
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed && row.chatSeed.length).toBeGreaterThan(20);
    }
  });

  it('finds each PR2 tool via ClinicalToolCatalog-style search queries', () => {
    const rows = getMedicalToolsCatalogRows();
    const queries = [
      ['meld', 'meld'],
      ['meld-na', 'meld-na'],
      ['timi-ua-nstemi', 'timi'],
      ['wells-pe', 'wells pe'],
      ['perc', 'rule-out criteria'],
    ];
    for (const [id, query] of queries) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === id), `search "${query}" → ${id}`).toBe(true);
    }
  });

  it('merges discovery rows for each PR2 id with calculator provenance', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length).toBe(1);
      const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
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

describe('PR2 consistency — resolveCatalogLaunch, routes, sidebar, deep links', () => {
  it('resolves Tier-A launches to dedicated calculator paths', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(`${PR2_HUB_PATH}/${id}`);
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Open');
    }
  });

  it('resolves Tier-B launches to calculator hub with registry sidebar ids', () => {
    for (const id of PR2_TIER_B_CHAT_CALCULATOR_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(PR2_HUB_PATH);
      expect(launch.registryId).toBe(id);
      expect(launch.chatSeed.length).toBeGreaterThan(80);
    }
  });

  it('resolves builtin slug deep links (?calc=) for Tier-A PR2 tools', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const fromBuiltin = resolveCatalogLaunch(id);
      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(fromBuiltin.path).toBe(builtin.path);
      expect(builtin.calcQuery).toContain(`calc=${id}`);
    }
  });

  it('registers Tier-A App.jsx routes before calculators hub', () => {
    const hubIdx = appSource.indexOf("path: '/tools/calculators', element:");
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const routeIdx = appSource.indexOf(`path: '${PR2_HUB_PATH}/${id}'`);
      expect(routeIdx).toBeGreaterThan(-1);
      expect(routeIdx).toBeLessThan(hubIdx);
      expect(appSource).toContain(`initialCalculatorId="${id}"`);
    }
  });

  it('exposes each PR2 registry id exactly once in toolRegistry (sidebar visibility)', () => {
    const pr2Rows = toolRegistry.filter((t) => PR2_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr2Rows).toHaveLength(PR2_CALCULATOR_REGISTRY_IDS.length);
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      expect(getToolIcon(id)).toBeTruthy();
    }
  });

  it('uses plural /tools/calculators/ paths for Tier-A (not legacy /tools/calculator/)', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
    }
  });
});
