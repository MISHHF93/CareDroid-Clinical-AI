/**
 * Complete wiring audit — newly added clinical calculators (registry, routes, catalog, discovery, launch, mobile).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentToolsById,
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
  PR8_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR9_TIER_B_CHAT_CALCULATOR_IDS,
  PR10_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { matchCalculatorRoute, CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  buildBuiltinHubCalculatorCards,
  BUILTIN_CALCULATOR_SWITCH_SLUGS,
  isBuiltinCalculatorSlug,
  getBuiltinCalculatorRouteDef,
} from './calculatorHubManifest';
import {
  TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID,
  buildResponsiveQaPages,
} from './responsiveQaMatrix';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';
import {
  NEW_CLINICAL_TOOLS_ALL_IDS,
  NEW_CLINICAL_TOOLS_TIER_A_IDS,
  NEW_CLINICAL_TOOLS_TIER_B_IDS,
  NEW_CLINICAL_TOOLS_SPECS,
  NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS,
  NEW_CLINICAL_TOOLS_DISCOVERY_ALIAS_PAIRS,
  NEW_CLINICAL_TOOLS_CHAT_CONFIGS,
  catalogRowsMatchingQuery,
} from './newClinicalToolsAuditConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const orchestratorSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');

describe('New clinical tools — frozen audit lists', () => {
  it('includes PR10 Tier A and PR9 Tier B in conversation batch', () => {
    expect([...PR10_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual(['abcd2']);
    expect([...PR9_TIER_B_CHAT_CALCULATOR_IDS]).toEqual(['pecarn-head', 'nexus-cspine']);
    for (const id of NEW_CLINICAL_TOOLS_TIER_A_IDS) {
      expect([...PR8_TIER_A_CALCULATOR_REGISTRY_IDS, 'abcd2']).toContain(id);
    }
    expect(NEW_CLINICAL_TOOLS_ALL_IDS).toHaveLength(10);
  });
});

describe('New clinical tools — registry IDs and routes', () => {
  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('%s aligns toolRegistry path and panel', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    const reg = toolRegistryById[id];
    expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
    expect(reg.path).toBe(spec.routePath);
    expect(reg.panelTool).toBe('calculators');

    if (spec.tier === 'A') {
      expect(reg.initialCalc).toBe(id);
    } else {
      expect(reg.initialCalc).toBeUndefined();
    }
  });

  it.each(NEW_CLINICAL_TOOLS_TIER_A_IDS)('%s has dedicated calculator route before hub', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    expect(matchCalculatorRoute(spec.routePath)?.calculatorSlug).toBe(id);
    expect(getBuiltinCalculatorRouteDef(id)?.path).toBe(spec.routePath);
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });

  it.each(NEW_CLINICAL_TOOLS_TIER_B_IDS)('%s has no dedicated /tools/calculators/<id> App route', (id) => {
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
  });

  it('registers all Tier-A tools in App.jsx via CALCULATOR_ROUTE_DEFS', () => {
    assertAppCalculatorRouteWiring(appSource, [...NEW_CLINICAL_TOOLS_TIER_A_IDS]);
  });
});

describe('New clinical tools — NLU, catalog, and backend', () => {
  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('%s is in clinicalIntentTools with matching path', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    const nlu = clinicalIntentToolsById[id];
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.path).toBe(spec.routePath);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nlu?.chatSeed).toMatch(spec.chatSeedPattern);
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(orchestratorSource).toContain(`'${id}'`);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
  });

  it.each(NEW_CLINICAL_TOOLS_TIER_A_IDS)('%s maps builtin slug and hub card', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(isBuiltinCalculatorSlug(id)).toBe(true);
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(spec.routePath);
    const card = buildBuiltinHubCalculatorCards().find((c) => c.id === id);
    expect(card?.route).toBe(spec.routePath);
  });

  it.each(NEW_CLINICAL_TOOLS_TIER_B_IDS)('%s is hub-only with trauma hub group', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes(id));
    expect(group?.groupId).toBe(spec.hubGroupId);
    expect(calculatorsSource).not.toContain(`case '${id}':`);
  });
});

describe('New clinical tools — aliases and discovery', () => {
  it('has no alias string mapped to multiple canonical registry ids', () => {
    const ownerByAlias = new Map();
    for (const [alias, canonical] of NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS) {
      const prior = ownerByAlias.get(alias);
      if (prior && prior !== canonical) {
        throw new Error(`Alias "${alias}" maps to both ${prior} and ${canonical}`);
      }
      ownerByAlias.set(alias, canonical);
    }
  });

  it.each(NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS)(
    'alias "%s" resolves to %s via NLU and launch',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(NEW_CLINICAL_TOOLS_SPECS[canonical].routePath);
    }
  );

  it.each(NEW_CLINICAL_TOOLS_DISCOVERY_ALIAS_PAIRS)(
    'discovery row "%s" maps to %s',
    (aliasId, canonical) => {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo, `missing discovery alias ${aliasId}`).toBe(canonical);
      expect(getAllDiscoveredTools().some((r) => r.id === aliasId || r.mapsTo === canonical)).toBe(
        true
      );
    }
  );

  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('canonical id %s appears in merged discovery', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id || r.mapsTo === id);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('New clinical tools — catalog and launch', () => {
  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('%s has exactly one medical catalog row', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);
    const row = matches[0];
    expect(row.pagePath).toBe(spec.routePath);
    expect(row.sidebarToolId).toBe(id);
    expect(row.chatOnlyForm).toBe(spec.chatOnlyForm);
    expect(row.uiCalculatorSlug).toBe(spec.uiCalculatorSlug);
    expect(row.chatSeed.length).toBeGreaterThan(40);
  });

  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('catalog search finds %s', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    for (const [canonical, query] of spec.catalogSearchQueries) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === canonical), `search "${query}"`).toBe(true);
    }
  });

  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('resolveCatalogLaunch(%s) is not hidden fallback', (id) => {
    const spec = NEW_CLINICAL_TOOLS_SPECS[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.registryId).toBe(id);
    expect(launch.path).toBe(spec.routePath);
    expect(launch.path).not.toBe('/dashboard');
    expect(launch.openLabel).toBe(spec.openLabel);
    expect(resolveNavigationPathForLaunch(launch)).toBe(spec.navigationPath);
  });
});

describe('New clinical tools — sidebar and no orphaned routes', () => {
  it('lists each audited tool exactly once in toolRegistry', () => {
    const rows = toolRegistry.filter((t) => NEW_CLINICAL_TOOLS_ALL_IDS.includes(t.id as any));
    expect(rows).toHaveLength(NEW_CLINICAL_TOOLS_ALL_IDS.length);
  });

  it.each(NEW_CLINICAL_TOOLS_ALL_IDS)('exposes sidebar icon for %s', (id) => {
    const icon = getToolIcon(id);
    expect(icon).toBeTruthy();
    expect(icon).not.toBe(getToolIcon('__nonexistent_tool_xyz__'));
  });

  it('has no orphaned CALCULATOR_ROUTE_DEFS for new Tier-A slugs', () => {
    for (const id of NEW_CLINICAL_TOOLS_TIER_A_IDS) {
      const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
      expect(def, `route def missing ${id}`).toBeTruthy();
      expect(calculatorsSource).toContain(`case '${id}'`);
    }
  });

  it('does not register Tier-B ids as calculator route slugs', () => {
    for (const id of NEW_CLINICAL_TOOLS_TIER_B_IDS) {
      expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id)).toBe(false);
    }
  });

  it.each(NEW_CLINICAL_TOOLS_CHAT_CONFIGS)('chat config %s matches registry', (cfg) => {
    expect(cfg.toolId).toBe(cfg.registryId);
    expect(clinicalIntentToolsById[cfg.toolId]?.chatSeed).toBe(cfg.chatSeed);
  });
});

describe('New clinical tools — mobile rendering matrix', () => {
  it.each(NEW_CLINICAL_TOOLS_TIER_A_IDS)(
    '%s has responsive QA page path matching dedicated route',
    (id) => {
      expect(TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[id]).toBe(
        NEW_CLINICAL_TOOLS_SPECS[id].routePath
      );
    }
  );

  it('includes every new Tier-A tool in buildResponsiveQaPages', () => {
    const pageIds = buildResponsiveQaPages().map((p) => p.registryId);
    for (const id of NEW_CLINICAL_TOOLS_TIER_A_IDS) {
      expect(pageIds).toContain(id);
    }
  });

  it('includes Tier-B tools in responsive QA hub launch pages', () => {
    const pageIds = buildResponsiveQaPages().map((p) => p.registryId);
    for (const id of NEW_CLINICAL_TOOLS_TIER_B_IDS) {
      expect(pageIds).toContain(id);
    }
  });
});

describe('New clinical tools — hub visibility (no hidden calculators)', () => {
  it('exposes every new Tier-A slug on calculators hub', () => {
    const hubSlugs = new Set(BUILTIN_CALCULATOR_SWITCH_SLUGS);
    for (const id of NEW_CLINICAL_TOOLS_TIER_A_IDS) {
      expect(hubSlugs.has(id), `hub missing built-in form ${id}`).toBe(true);
    }
  });

  it('exposes every new Tier-B tool in chat-assisted hub groups', () => {
    const hubToolIds = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));
    for (const id of NEW_CLINICAL_TOOLS_TIER_B_IDS) {
      expect(hubToolIds.has(id), `hub group missing ${id}`).toBe(true);
    }
  });
});
