/**
 * Cross-layer PR3 coverage (mirrors pr2Coverage.test.js).
 * Ten-area matrix: pr3TenAreaCoverage.test.js
 * Formula / clinical edge cases: src/utils/*Calculator.test.js
 * Per-tool wiring: graceAcsWiring, nihssWiring, canadianCSpineWiring, ottawaAnkleWiring
 * Cross-cutting matrix: pr3Consistency.test.js, pr3Comprehensive.test.js, pr3LaunchAudit.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
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
  PR3_TOOL_IDS,
  PR3_EMPTY_LAUNCH,
  PR3_CHAT_CONFIG_BY_ID,
  PR3_NLU_ALIAS_PAIRS,
  PR3_DISCOVERY_ALIAS_PAIRS,
  PR3_CATALOG_SEARCH_QUERIES,
  catalogRowsMatchingQuery,
} from './pr3TestConstants';

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

function countPatternOccurrences(needle) {
  return patternsSource.split(needle).length - 1;
}

describe('PR3 coverage — registry inclusion', () => {
  it('freezes the four PR3 registry ids in tier audit lists', () => {
    expect(Object.isFrozen(PR3_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR3_TOOL_IDS]).toEqual([
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
    ]);
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toEqual([...PR3_TOOL_IDS]);
    for (const id of PR3_TOOL_IDS) {
      expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
    }
  });

  it('includes each PR3 tool exactly once in toolRegistry with calculator panel', () => {
    const pr3Rows = toolRegistry.filter((t) => PR3_TOOL_IDS.includes(t.id));
    expect(pr3Rows).toHaveLength(PR3_TOOL_IDS.length);
    for (const id of PR3_TOOL_IDS) {
      const reg = toolRegistryById[id];
      expect(reg?.id).toBe(id);
      expect(reg.panelTool).toBe('calculators');
      expect(reg.path).toBe(PR3_HUB_PATH);
      expect(reg.initialCalc).toBeUndefined();
      expect(getToolIcon(id)).toBeTruthy();
    }
  });

  it('does not register PR3 ids as builtin calculator slugs', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBeUndefined();
    }
  });
});

describe('PR3 coverage — catalog inclusion', () => {
  it('includes each PR3 tool in catalog rows with NLU source and chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR3_TOOL_IDS) {
      const matches = rows.filter((r) => r.primaryId === id);
      expect(matches, `catalog row count for ${id}`).toHaveLength(1);
      const row = matches[0];
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed?.length).toBeGreaterThan(20);
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

  it('counts PR3 primaries in catalog summary without double-counting', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr3Primaries = new Set(
      rows.filter((r) => PR3_TOOL_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr3Primaries.size).toBe(PR3_TOOL_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
    expect(summary.chatOnlyForms).toBeGreaterThanOrEqual(nluCalculatorHubOnly.length);
  });
});

describe('PR3 coverage — discovery inclusion', () => {
  it('merges discovery rows for each PR3 id exactly once with calculator provenance', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR3_TOOL_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length, `discovery duplicates for ${id}`).toBe(1);
      const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
    }
  });

  it('documents every PR3 discovery alias in toolIdAliases with matching mapsTo', () => {
    for (const [aliasId, canonical] of PR3_DISCOVERY_ALIAS_PAIRS) {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row, `discovery alias row missing: ${aliasId}`).toBeTruthy();
      expect(row.mapsTo).toBe(canonical);
    }
  });
});

describe('PR3 coverage — NLU profiles and chatSeed presence', () => {
  it('registers each PR3 tool in clinicalIntentTools with hub path and guided chatSeed', () => {
    for (const id of PR3_TOOL_IDS) {
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(clinicalIntentToolsById[id]).toBe(nlu);
      expect(nlu.path).toBe(PR3_HUB_PATH);
      expect(nlu.sidebarToolId).toBe(id);
      expect(nlu.backendExecutable).toBe(false);
      expect(nlu.chatSeed?.length).toBeGreaterThan(100);

      const cfg = PR3_CHAT_CONFIG_BY_ID[id];
      expect(nlu.chatSeed).toBe(cfg.chatSeed);
      expect(nlu.description).toBe(cfg.description);
    }
  });

  it('lists each PR3 tool in nluCalculatorHubOnly', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    }
  });
});

describe('PR3 coverage — NLU alias matching & resolveCatalogLaunch', () => {
  it('resolves all PR3 NLU and discovery aliases to the same hub launch as canonical ids', () => {
    for (const [alias, canonical] of ALL_PR3_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias], `NLU_TO_REGISTRY_ID missing: ${alias}`).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);

      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(PR3_HUB_PATH);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
      expect(fromAlias.chatSeed?.length).toBeGreaterThan(80);
    }
  });

  it('returns guided chatSeed from NLU profile for canonical launches (not generic registry fallback)', () => {
    for (const id of PR3_TOOL_IDS) {
      const launch = resolveCatalogLaunch(id);
      const cfg = PR3_CHAT_CONFIG_BY_ID[id];
      expect(launch.path).toBe(cfg.hubPath);
      expect(launch.registryId).toBe(id);
      expect(launch.chatSeed).toBe(cfg.chatSeed);
      expect(launch.openLabel).toBe('Start guided chat');
      expect(launch.orchestratorTool).toBeNull();
    }
  });

  it.each(PR3_TOOL_IDS)('resolveNavigationPathForLaunch(%s) routes guided chat to chat', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/chat');
  });

  it('returns empty launch for falsy or unknown ids without throwing', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR3_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR3_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('not-a-pr3-tool-xyz').path).toBe('/chat');
    expect(resolveNavigationPathForLaunch(resolveCatalogLaunch('not-a-pr3-tool-xyz'))).toBe('/chat');
  });

  it('separates stroke scale (NIHSS) from cervical spine rule aliases', () => {
    expect(resolveCatalogLaunch('stroke scale').registryId).toBe('nihss');
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe('canadian-c-spine');
    expect(resolveCatalogLaunch('stroke scale').registryId).not.toBe('canadian-c-spine');
  });
});

describe('PR3 coverage — per-tool conversational launch', () => {
  it('GRACE ACS — hub launch matches chat config and ACS safety seed', () => {
    const id = 'grace-acs';
    const cfg = PR3_CHAT_CONFIG_BY_ID[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(cfg.hubPath);
    expect(launch.chatSeed).toMatch(/GRACE ACS/i);
    expect(launch.chatSeed).toMatch(/STEP 0/i);
    expect(launch.chatSeed).toMatch(/does not confirm or exclude ACS/i);
  });

  it('NIHSS — hub launch matches chat config and urgent stroke safety seed', () => {
    const id = 'nihss';
    const cfg = PR3_CHAT_CONFIG_BY_ID[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(cfg.hubPath);
    expect(launch.chatSeed).toMatch(/NIH Stroke Scale/i);
    expect(launch.chatSeed).toMatch(/STEP 0/i);
    expect(launch.chatSeed).toMatch(/does not replace urgent stroke evaluation/i);
  });

  it('Canadian C-Spine — hub launch matches chat config and trauma safety seed', () => {
    const id = 'canadian-c-spine';
    const cfg = PR3_CHAT_CONFIG_BY_ID[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(cfg.hubPath);
    expect(launch.chatSeed).toMatch(/Canadian C-Spine Rule/i);
    expect(launch.chatSeed).toMatch(/does not "clear" the cervical spine/i);
  });

  it('Ottawa Ankle — hub launch matches chat config and hard-stop safety seed', () => {
    const id = 'ottawa-ankle';
    const cfg = PR3_CHAT_CONFIG_BY_ID[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(cfg.hubPath);
    expect(launch.chatSeed).toMatch(/Ottawa Ankle Rule/i);
    expect(launch.chatSeed).toMatch(/neurovascular compromise/i);
  });
});

describe('PR3 coverage — backend alias consistency', () => {
  it('declares each PR3 toolId exactly once in backend tool.patterns', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(countPatternOccurrences(`toolId: '${id}'`)).toBe(1);
    }
  });

  it('documents backend disambiguation helpers for PR3 tools', () => {
    expect(patternsSource).toContain('preferGraceAcs');
    expect(patternsSource).toContain('preferNihss');
    expect(patternsSource).toContain('preferCanadianCSpine');
    expect(patternsSource).toContain('preferOttawaAnkle');
  });

  it('aligns representative backend keywords with NLU alias resolution', () => {
    const backendKeywordChecks = [
      ['grace acs', 'grace-acs'],
      ['nih stroke scale', 'nihss'],
      ['canadian c-spine rule', 'canadian-c-spine'],
      ['ottawa ankle rule', 'ottawa-ankle'],
    ];
    for (const [phrase, canonical] of backendKeywordChecks) {
      expect(patternsSource.toLowerCase()).toContain(phrase);
      expect(NLU_TO_REGISTRY_ID[phrase] ?? resolveRegistryId(phrase.replace(/\s+/g, '-'))).toBe(
        canonical
      );
    }
  });
});

describe('PR3 coverage — hub routes (no standalone PR3 App routes)', () => {
  it('does not register Tier-B standalone calculator routes in App.jsx', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(appSource).not.toContain(`path: '${PR3_HUB_PATH}/${id}'`);
      expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    }
  });

  it('does not use legacy singular /tools/calculator/ paths for PR3 registry rows', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
    }
  });
});

describe('PR3 coverage — duplicate alias detection', () => {
  it('uses unique toolIdAliases.id values globally', () => {
    const seen = new Set();
    for (const { id } of toolIdAliases) {
      expect(seen.has(id), `duplicate toolIdAliases.id: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('does not map any PR3 alias key to a different registry target than expected', () => {
    for (const [alias, canonical] of ALL_PR3_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const discovery = toolIdAliases.find((a) => a.id === alias);
      if (discovery) {
        expect(discovery.mapsTo).toBe(canonical);
      }
    }
  });

  it('does not register conflicting mapsTo for PR3-targeting discovery aliases', () => {
    const pr3AliasRows = toolIdAliases.filter((a) => PR3_TOOL_IDS.includes(a.mapsTo));
    const byId = new Map();
    for (const row of pr3AliasRows) {
      const prior = byId.get(row.id);
      if (prior) {
        expect(prior.mapsTo).toBe(row.mapsTo);
      }
      byId.set(row.id, row);
    }
    expect(pr3AliasRows.length).toBeGreaterThanOrEqual(PR3_DISCOVERY_ALIAS_PAIRS.length);
  });
});

describe('PR3 coverage — no orphaned PR3 tool IDs', () => {
  it('wires every PR3 registry id through NLU, hub-only list, catalog, and discovery', () => {
    const rows = getMedicalToolsCatalogRows();
    const merged = getAllDiscoveredTools();
    for (const id of PR3_TOOL_IDS) {
      expect(toolRegistryById[id], `orphan registry: ${id}`).toBeTruthy();
      expect(clinicalIntentToolsById[id], `orphan NLU: ${id}`).toBeTruthy();
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id), `orphan hub-only: ${id}`).toBe(
        true
      );
      expect(rows.some((r) => r.primaryId === id), `orphan catalog: ${id}`).toBe(true);
      expect(merged.some((r) => r.id === id), `orphan discovery: ${id}`).toBe(true);
    }
  });

  it('does not leave PR3-targeting discovery aliases pointing at missing registry ids', () => {
    const pr3AliasRows = toolIdAliases.filter((a) => PR3_TOOL_IDS.includes(a.mapsTo));
    for (const { id, mapsTo } of pr3AliasRows) {
      expect(toolRegistryById[mapsTo], `orphan mapsTo for alias ${id}`).toBeTruthy();
      expect(NLU_TO_REGISTRY_ID[id] ?? NLU_TO_REGISTRY_ID[id.replace(/-/g, ' ')]).toBe(mapsTo);
    }
  });

  it('does not expose NLU rows whose sidebarToolId is outside PR3 when toolId is PR3', () => {
    for (const id of PR3_TOOL_IDS) {
      const nlu = clinicalIntentToolsById[id];
      expect(nlu.sidebarToolId).toBe(id);
      expect(PR3_TOOL_IDS).toContain(nlu.sidebarToolId);
    }
  });
});
