/**
 * PR3 registration audit — cross-system consistency for GRACE ACS, NIHSS,
 * Canadian C-Spine, and Ottawa Ankle (Tier B chat-assisted).
 * Complements pr3Comprehensive.test.js, pr3Consistency.test.js, pr3Coverage.test.js, and per-tool *Wiring tests.
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
import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  isKnownToolAreaPath,
  REGISTRY_TOOL_PATHS,
} from '../routes/clinicalToolRoutes';
import { TOOL_PATTERNS_PATH } from './clinicalToolAliasSync';
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
  PR3_HUB_PATH,
  PR3_HUB_ROUTE_BY_REGISTRY_ID,
  PR3_REQUIRED_NLU_ALIAS_PAIRS,
  PR3_TOOL_IDS,
} from './pr3TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const PR3_CHAT_CONFIGS_BY_ID = {
  'grace-acs': graceAcsChatConfig,
  nihss: nihssChatConfig,
  'canadian-c-spine': canadianCSpineChatConfig,
  'ottawa-ankle': ottawaAnkleChatConfig,
};

describe('PR3 registration audit — canonical ID alignment', () => {
  it('keeps PR3_CALCULATOR_REGISTRY_IDS frozen and ordered', () => {
    expect(Object.isFrozen(PR3_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR3_TOOL_IDS]).toEqual([
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
    ]);
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toEqual([...PR3_TOOL_IDS]);
  });

  it.each(PR3_TOOL_IDS)('%s uses the same id across registry, NLU, and maps', (id) => {
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);

    expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBeUndefined();
    expect(resolveRegistryId(id)).toBe(id);
    expect(clinicalIntentToolsById[id]).toBeTruthy();
  });
});

describe('PR3 registration audit — hub routes and deep links', () => {
  it.each(PR3_TOOL_IDS)('registry path for %s is calculators hub only', (id) => {
    expect(toolRegistryById[id].path).toBe(PR3_HUB_PATH);
    expect(PR3_HUB_ROUTE_BY_REGISTRY_ID[id]).toBe(PR3_HUB_PATH);
    expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
  });

  it.each(PR3_TOOL_IDS)('expectedLaunchPath(%s) resolves to calculator hub', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR3_HUB_PATH);
  });

  it.each(PR3_TOOL_IDS)('%s is not a dedicated CALCULATOR_ROUTE_DEFS slug', (id) => {
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id)).toBe(false);
    expect(appSource).not.toContain(`path: '${PR3_HUB_PATH}/${id}'`);
    expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
  });

  it('includes calculators hub in known tool area paths for deep links', () => {
    expect(isKnownToolAreaPath(PR3_HUB_PATH)).toBe(true);
    expect(REGISTRY_TOOL_PATHS).toContain(PR3_HUB_PATH);
  });

  it('does not register Tier-B PR3 on legacy singular /tools/calculator/ paths', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(toolRegistryById[id].path).not.toMatch(/^\/tools\/calculator\//);
    }
  });
});

describe('PR3 registration audit — NLU, backend keywords, aliases', () => {
  it.each(PR3_TOOL_IDS)('backend tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    const matches = patterns.filter((p) => p.toolId === id);
    expect(matches).toHaveLength(1);
  });

  it.each(PR3_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps catalog alias "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    }
  );

  it.each(PR3_ALL_ALIAS_PAIRS)('resolveRegistryId("%s") → %s', (alias, canonical) => {
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it('has no conflicting duplicate aliases in PR3_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR3_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('has no NLU_TO_REGISTRY_ID keys that map PR3 aliases to non-PR3 registry ids', () => {
    for (const [alias, canonical] of PR3_ALL_ALIAS_PAIRS) {
      const mapped = NLU_TO_REGISTRY_ID[alias];
      if (mapped !== undefined) {
        expect(PR3_TOOL_IDS).toContain(mapped);
        expect(mapped).toBe(canonical);
      }
    }
  });

  it.each(PR3_TOOL_IDS)(
    'product-required phrases appear in backend keywords or NLU_TO_REGISTRY_ID for %s',
    (id) => {
      const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
      const requiredForTool = PR3_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
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

  it('separates NIHSS stroke scale from Canadian C-Spine rule aliases', () => {
    expect(NLU_TO_REGISTRY_ID['stroke scale']).toBe('nihss');
    expect(NLU_TO_REGISTRY_ID['c spine rule']).toBe('canadian-c-spine');
    expect(resolveCatalogLaunch('stroke scale').registryId).toBe('nihss');
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe('canadian-c-spine');
  });
});

describe('PR3 registration audit — discovery and catalog', () => {
  it.each(PR3_DISCOVERY_ALIAS_PAIRS)(
    'toolIdAliases discovery row for %s → %s',
    (aliasId, canonical) => {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row, `missing toolIdAliases id ${aliasId}`).toBeTruthy();
      if (!row) throw new Error(`missing toolIdAliases id ${aliasId}`);
      expect(row.mapsTo).toBe(canonical);
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
    }
  );

  it.each(PR3_TOOL_IDS)('merged discovery includes canonical row for %s', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits.length).toBe(1);
    expect(hits[0].path).toBe(PR3_HUB_PATH);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
  });

  it.each(PR3_TOOL_IDS)('medical catalog row for %s as chat-only on hub with launch seed', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row, `missing catalog row for ${id}`).toBeTruthy();
    expect(row.pagePath).toBe(PR3_HUB_PATH);
    expect(row.chatOnlyForm).toBe(true);
    expect(row.uiCalculatorSlug).toBeNull();
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed?.length).toBeGreaterThan(20);
    expect(row.backendExecutor).toBe(false);
    expect(row.chatSeed).toBe(clinicalIntentToolsById[id]?.chatSeed);
  });

  it.each(PR3_CATALOG_SEARCH_QUERIES)('catalog search finds %s for "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(
      true
    );
  });

  it('does not create catalog rows without resolvable launch paths', () => {
    for (const id of PR3_TOOL_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(PR3_HUB_PATH);
      expect(launch.registryId).toBe(id);
      expect(launch.chatSeed?.length).toBeGreaterThan(50);
    }
  });
});

describe('PR3 registration audit — sidebar, hub launch, chat seeds', () => {
  it('lists each PR3 tool exactly once in toolRegistry (sidebar visibility)', () => {
    const pr3InRegistry = toolRegistry.filter((t) => (PR3_TOOL_IDS as readonly string[]).includes(t.id));
    expect(pr3InRegistry).toHaveLength(PR3_TOOL_IDS.length);
    for (const id of PR3_TOOL_IDS) {
      expect(getToolIcon(id)).toBeTruthy();
      expect(toolRegistryById[id].panelTool).toBe('calculators');
    }
  });

  it.each(PR3_TOOL_IDS)('resolveCatalogLaunch(%s) opens hub with guided chat', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR3_HUB_PATH);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toBe(PR3_CHAT_CONFIG_BY_ID[id].chatSeed);
    expect(launch.chatSeed?.length).toBeGreaterThan(80);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PR3_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical %s launch',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
      expect(fromAlias.chatSeed?.length).toBeGreaterThan(50);
    }
  );

  it('places PR3 tools in clinical hub groups', () => {
    const grouped = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));
    for (const id of PR3_TOOL_IDS) {
      expect(grouped.has(id)).toBe(true);
    }
    expect(CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'cardiac')?.toolIds).toContain(
      'grace-acs'
    );
    expect(CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'neurology')?.toolIds).toContain(
      'nihss'
    );
    const trauma = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'trauma');
    expect(trauma?.toolIds).toEqual(
      expect.arrayContaining(['canadian-c-spine', 'ottawa-ankle'])
    );
  });

  it('matches Tier-B NLU chatSeed to chatAssisted config', () => {
    for (const id of PR3_TOOL_IDS) {
      const config = PR3_CHAT_CONFIGS_BY_ID[id];
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.chatSeed).toBe(config.chatSeed);
      expect(resolveCatalogLaunch(id).chatSeed).toBe(config.chatSeed);
    }
  });

  it.each(PR3_TOOL_IDS)('%s is in nluCalculatorHubOnly for Calculators hub cards', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(calculatorsSource).toContain('CHAT_ASSISTED_HUB_GROUPS');
    expect(calculatorsSource).toContain('getHubChatAssistedTools');
  });
});

describe('PR3 registration audit — no orphaned registry entries', () => {
  it.each(PR3_TOOL_IDS)('%s is wired through NLU, hub-only, catalog, and discovery', (id) => {
    expect(toolRegistryById[id]).toBeTruthy();
    expect(clinicalIntentToolsById[id]).toBeTruthy();
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(getMedicalToolsCatalogRows().some((r) => r.primaryId === id)).toBe(true);
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
  });

  it('has no duplicate toolIdAliases.id entries among PR3-targeting rows', () => {
    const pr3AliasRows = toolIdAliases.filter((a) => (PR3_TOOL_IDS as readonly string[]).includes(a.mapsTo));
    const ids = pr3AliasRows.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no Tier-B PR3 registry path pointing at dedicated calculator subroutes', () => {
    for (const id of PR3_TOOL_IDS) {
      expect(toolRegistryById[id].path).toBe(PR3_HUB_PATH);
      expect(toolRegistryById[id].path).not.toBe(`/tools/calculators/${id}`);
    }
  });
});
