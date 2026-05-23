/**
 * Cross-layer PR3 consistency: registry, hub launch, NLU, catalog, discovery,
 * resolveCatalogLaunch, backend patterns, chat seeds, sidebar, deep links.
 * Per-tool detail: graceAcsWiring, nihssWiring, canadianCSpineWiring, ottawaAnkleWiring.
 * Broad coverage matrix: pr3Coverage.test.js, pr3Comprehensive.test.js
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
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import {
  PR3_HUB_PATH,
  PR3_CHAT_CONFIGS,
  PR3_NLU_ALIAS_PAIRS,
  PR3_DISCOVERY_ALIAS_PAIRS,
  PR3_REQUIRED_NLU_ALIAS_PAIRS,
  PR3_CATALOG_SEARCH_QUERIES,
  catalogRowsMatchingQuery,
} from './pr3TestConstants';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { CALCULATOR_ROUTE_DEFS, expectedLaunchPath, isKnownToolAreaPath } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

const ALL_PR3_ALIAS_PAIRS = [...PR3_NLU_ALIAS_PAIRS, ...PR3_DISCOVERY_ALIAS_PAIRS];

const PR3_DISCOVERY_ALIAS_IDS = toolIdAliases
  .filter((a) => PR3_CALCULATOR_REGISTRY_IDS.includes(a.mapsTo))
  .map((a) => a.id);

describe('PR3 consistency — centralized audit lists', () => {
  it('freezes the four PR3 registry ids', () => {
    expect(Object.isFrozen(PR3_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR3_TIER_B_CHAT_CALCULATOR_IDS)).toBe(true);
    expect([...PR3_CALCULATOR_REGISTRY_IDS]).toEqual([
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
    ]);
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toEqual([...PR3_CALCULATOR_REGISTRY_IDS]);
  });

  it('includes all PR3 tools in the combined Tier-B hub audit list', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
    }
  });
});

describe('PR3 consistency — registry, NLU, and chat config alignment', () => {
  it('keeps registry, NLU toolId, and backend pattern toolId aligned for each PR3 tool', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(reg.panelTool).toBe('calculators');
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(nlu.backendExecutable).toBe(false);
      expect(nlu.sidebarToolId).toBe(id);
      expect(nlu.path).toBe(PR3_HUB_PATH);
    }
  });

  it('matches each chat-assisted config toolId and registryId to NLU rows', () => {
    for (const cfg of PR3_CHAT_CONFIGS) {
      expect(cfg.toolId).toBe(cfg.registryId);
      expect(PR3_CALCULATOR_REGISTRY_IDS).toContain(cfg.toolId);
      expect(cfg.hubPath).toBe(PR3_HUB_PATH);
      expect(cfg.chatSeed.length).toBeGreaterThan(200);

      const nlu = clinicalIntentTools.find((t) => t.toolId === cfg.toolId);
      expect(nlu?.chatSeed).toBe(cfg.chatSeed);
    }
  });

  it('wires PR3 tools as hub-only without standalone App routes or builtin forms', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg.path).toBe(PR3_HUB_PATH);
      expect(reg.initialCalc).toBeUndefined();

      expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBeUndefined();
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
      expect(appSource).not.toContain(`path: '${PR3_HUB_PATH}/${id}'`);
      expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    }
  });

  it('maps orchestrator catalog ids to the same registry id (self-map for NLU toolIds)', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
    }
  });
});

describe('PR3 consistency — aliases and duplicate detection', () => {
  it('resolves all product-required aliases via NLU_TO_REGISTRY_ID and resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR3_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias], `required NLU alias missing: ${alias}`).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(PR3_HUB_PATH);
      expect(launch.chatSeed.length).toBeGreaterThan(50);
    }
  });

  it('resolves extended NLU alias pairs via NLU_TO_REGISTRY_ID and resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR3_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias], `NLU alias missing: ${alias}`).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(PR3_HUB_PATH);
      expect(launch.chatSeed.length).toBeGreaterThan(50);
    }
  });

  it('aligns discovery alias ids with NLU_TO_REGISTRY_ID and resolveRegistryId', () => {
    for (const [aliasId, canonical] of PR3_DISCOVERY_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
      expect(resolveRegistryId(aliasId)).toBe(canonical);
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo).toBe(canonical);
    }
  });

  it('covers every PR3 discovery alias in the global alias list', () => {
    for (const aliasId of PR3_DISCOVERY_ALIAS_IDS) {
      expect(PR3_CALCULATOR_REGISTRY_IDS).toContain(
        toolIdAliases.find((a) => a.id === aliasId)?.mapsTo
      );
    }
    expect(PR3_DISCOVERY_ALIAS_IDS.length).toBeGreaterThanOrEqual(PR3_DISCOVERY_ALIAS_PAIRS.length);
  });

  it('does not map any PR3 alias key to multiple registry targets', () => {
    for (const [alias, canonical] of ALL_PR3_ALIAS_PAIRS) {
      const viaNlu = NLU_TO_REGISTRY_ID[alias];
      if (viaNlu && PR3_CALCULATOR_REGISTRY_IDS.includes(viaNlu)) {
        expect(viaNlu).toBe(canonical);
      }
    }
  });

  it('separates stroke scale (NIHSS) from cervical spine rule aliases', () => {
    expect(NLU_TO_REGISTRY_ID['stroke scale']).toBe('nihss');
    expect(NLU_TO_REGISTRY_ID['c spine rule']).toBe('canadian-c-spine');
    expect(resolveCatalogLaunch('stroke scale').registryId).toBe('nihss');
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe('canadian-c-spine');
  });
});

describe('PR3 consistency — catalog, discovery, and searchability', () => {
  it('includes each PR3 tool exactly once in catalog rows with chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const matches = rows.filter((r) => r.primaryId === id);
      expect(matches, `catalog row count for ${id}`).toHaveLength(1);
      const row = matches[0];
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed.length).toBeGreaterThan(20);
      expect(row.chatOnlyForm).toBe(true);
      expect(row.uiCalculatorSlug).toBeNull();
      expect(row.pagePath).toBe(PR3_HUB_PATH);
      expect(row.backendExecutor).toBe(false);
    }
  });

  it('finds each PR3 tool via ClinicalToolCatalog-style search queries', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const [id, query] of PR3_CATALOG_SEARCH_QUERIES) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === id), `search "${query}" → ${id}`).toBe(true);
    }
  });

  it('merges discovery rows for each PR3 id with calculator provenance', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length, `discovery duplicates for ${id}`).toBe(1);
      const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
    }
  });

  it('counts PR3 primaries in catalog summary without orphan registry-only duplicates', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr3Primaries = new Set(
      rows.filter((r) => PR3_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr3Primaries.size).toBe(PR3_CALCULATOR_REGISTRY_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
    expect(summary.chatOnlyForms).toBeGreaterThanOrEqual(nluCalculatorHubOnly.length);
  });
});

describe('PR3 consistency — resolveCatalogLaunch, routes, sidebar, deep links', () => {
  it('resolves canonical id and NLU toolId launches to calculator hub', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const fromId = resolveCatalogLaunch(id);
      const fromNlu = resolveCatalogLaunch(id);
      expect(fromId.path).toBe(PR3_HUB_PATH);
      expect(fromId.registryId).toBe(id);
      expect(fromId.openLabel).toBe('Start guided chat');
      expect(fromId.orchestratorTool).toBeNull();
      expect(fromNlu.chatSeed.length).toBeGreaterThan(80);
    }
  });

  it('resolves hyphenated discovery aliases to the same hub launch as canonical ids', () => {
    for (const [aliasId, canonical] of PR3_DISCOVERY_ALIAS_PAIRS) {
      const fromAlias = resolveCatalogLaunch(aliasId);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.registryId).toBe(canonical);
    }
  });

  it('does not expose empty launch for unknown ids', () => {
    const empty = resolveCatalogLaunch('not-a-pr3-calculator');
    expect(empty.path).toBe('/chat');
    expect(empty.registryId).toBeNull();
    expect(empty.chatSeed).toBeTruthy();
  });

  it('exposes each PR3 registry id exactly once in toolRegistry (sidebar visibility)', () => {
    const pr3Rows = toolRegistry.filter((t) => PR3_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr3Rows).toHaveLength(PR3_CALCULATOR_REGISTRY_IDS.length);
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      const icon = getToolIcon(id);
      expect(icon).toBeTruthy();
      expect(icon).not.toBe(getToolIcon('__nonexistent_tool_xyz__'));
    }
  });

  it('does not register PR3 ids on legacy singular /tools/calculator/ paths', () => {
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
    }
  });

  it('documents backend disambiguation helpers for overlapping clinical phrases', () => {
    expect(patternsSource).toContain('preferGraceAcs');
    expect(patternsSource).toContain('preferNihss');
    expect(patternsSource).toContain('preferCanadianCSpine');
    expect(patternsSource).toContain('preferOttawaAnkle');
  });

  it('places all PR3 tools in CHAT_ASSISTED_HUB_GROUPS', () => {
    const grouped = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));
    for (const id of PR3_CALCULATOR_REGISTRY_IDS) {
      expect(grouped.has(id)).toBe(true);
    }
  });

  it.each(PR3_CALCULATOR_REGISTRY_IDS)('deep link expectedLaunchPath(%s) → hub', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR3_HUB_PATH);
    expect(isKnownToolAreaPath(PR3_HUB_PATH)).toBe(true);
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id)).toBe(false);
  });
});
