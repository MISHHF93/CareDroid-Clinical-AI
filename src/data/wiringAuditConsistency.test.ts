/**
 * Cross-layer consistency audit: phq9, gad7, copd-gold, rome-iv-ibs.
 * Validates registry IDs, route slugs, NLU, discovery, catalog, resolveCatalogLaunch,
 * sidebar visibility, and duplicate aliases.
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
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR6_TIER_B_CHAT_CALCULATOR_IDS,
  PR7_TIER_B_CHAT_CALCULATOR_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';
import {
  WIRING_AUDIT_ALL_ALIAS_PAIRS,
  WIRING_AUDIT_DISCOVERY_ALIAS_PAIRS,
  WIRING_AUDIT_ALL_IDS,
  WIRING_AUDIT_HUB_PATH,
  WIRING_AUDIT_TIER_A_IDS,
  WIRING_AUDIT_TIER_B_IDS,
  WIRING_AUDIT_TOOL_SPECS,
  WIRING_AUDIT_CHAT_CONFIGS,
  catalogRowsMatchingQuery,
} from './wiringAuditTestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const mentalHealthSource = readFileSync(
  join(__dirname, '../pages/tools/mentalHealthCalculators.tsx'),
  'utf8'
);
const _hubIdx = appSource.indexOf("path: '/tools/calculators', element:");

describe('Wiring audit — frozen tool id lists', () => {
  it('matches PR5/PR6/PR7 tier audit lists', () => {
    expect([...WIRING_AUDIT_TIER_A_IDS]).toEqual([...PR5_TIER_A_CALCULATOR_REGISTRY_IDS]);
    expect([...WIRING_AUDIT_TIER_B_IDS]).toEqual([
      ...PR6_TIER_B_CHAT_CALCULATOR_IDS,
      ...PR7_TIER_B_CHAT_CALCULATOR_IDS,
    ]);
    expect(WIRING_AUDIT_ALL_IDS).toHaveLength(4);
  });
});

describe('Wiring audit — registry IDs and route slugs', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s aligns toolRegistry path, initialCalc, and NLU path', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const reg = toolRegistryById[id];
    expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
    expect(reg.path).toBe(spec.routePath);
    expect(reg.panelTool).toBe('calculators');

    if (spec.tier === 'A') {
      expect(reg.initialCalc).toBe(id);
    } else {
      expect(reg.initialCalc).toBeUndefined();
    }

    const nlu = clinicalIntentToolsById[id];
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.path).toBe(spec.routePath);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain(spec.backendHelper);
  });

  it.each(WIRING_AUDIT_TIER_A_IDS)('%s registers dedicated calculator route before hub', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    expect(matchCalculatorRoute(spec.routePath)?.calculatorSlug).toBe(id);
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
  });

  it.each(WIRING_AUDIT_TIER_B_IDS)('%s has no dedicated /tools/calculators/<id> App route', (id) => {
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
  });
});

describe('Wiring audit — NLU IDs and orchestrator maps', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s is a clinicalIntentToolsById key', (id) => {
    expect(clinicalIntentToolsById[id]?.toolId).toBe(id);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
  });

  it.each(WIRING_AUDIT_TIER_A_IDS)('%s maps builtin slug to registry id', (id) => {
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(WIRING_AUDIT_TOOL_SPECS[id].routePath);
  });

  it.each(WIRING_AUDIT_CHAT_CONFIGS)('chat config toolId matches registryId', (config) => {
    expect(config.toolId).toBe(config.registryId);
    expect(WIRING_AUDIT_TIER_B_IDS).toContain(config.toolId);
    expect(config.hubPath).toBe(WIRING_AUDIT_HUB_PATH);
    expect(clinicalIntentToolsById[config.toolId]?.chatSeed).toBe(config.chatSeed);
  });
});

describe('Wiring audit — hub-only vs Tier-A form wiring', () => {
  it.each(WIRING_AUDIT_TIER_A_IDS)('%s is not hub-only and has Calculators.jsx switch', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(spec.routePath);
    expect(calculatorsSource).toContain(`case '${spec.calcSwitchCase}':`);
    expect(calculatorsSource).toContain("from './mentalHealthCalculators'");
    expect(mentalHealthSource).toMatch(
      id === 'phq9' ? /Phq9Calculator/ : /Gad7Calculator/
    );
  });

  it.each(WIRING_AUDIT_TIER_B_IDS)('%s is hub-only with chat hub group', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes(id));
    expect(group?.groupId).toBe(spec.hubGroupId);
    expect(calculatorsSource).not.toContain(`case '${id}':`);
  });
});

describe('Wiring audit — duplicate aliases', () => {
  it('has no alias string shared across different canonical registry ids', () => {
    const ownerByAlias = new Map();
    for (const [alias, canonical] of WIRING_AUDIT_ALL_ALIAS_PAIRS) {
      const prior = ownerByAlias.get(alias);
      if (prior && prior !== canonical) {
        throw new Error(`Alias "${alias}" maps to both ${prior} and ${canonical}`);
      }
      ownerByAlias.set(alias, canonical);
    }
  });

  it('has no duplicate toolIdAliases.id entries among audited tools', () => {
    const auditedCanonicals = new Set(WIRING_AUDIT_ALL_IDS);
    const auditedAliasIds = toolIdAliases
      .filter((a) => auditedCanonicals.has(a.mapsTo))
      .map((a) => a.id);
    expect(new Set(auditedAliasIds).size).toBe(auditedAliasIds.length);
  });

  it('maps each audited alias to a single canonical registry id', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of WIRING_AUDIT_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`
        );
      }
      targetByAlias.set(alias, canonical);
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    }
  });

  it('aligns hyphenated discovery alias ids with NLU_TO_REGISTRY_ID', () => {
    for (const [aliasId, canonical] of WIRING_AUDIT_DISCOVERY_ALIAS_PAIRS) {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo, `discovery alias missing: ${aliasId}`).toBe(canonical);
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
      expect(resolveRegistryId(aliasId)).toBe(canonical);
    }
  });
});

describe('Wiring audit — resolveCatalogLaunch', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('canonical %s launch matches registry path and NLU seed', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const nlu = clinicalIntentToolsById[id];
    const launch = resolveCatalogLaunch(id);

    expect(launch.registryId).toBe(id);
    expect(launch.path).toBe(spec.routePath);
    expect(launch.chatSeed).toBe(nlu.chatSeed);
    expect(launch.orchestratorTool).toBeNull();
    expect(launch.openLabel).toBe(spec.openLabel);
    expect(launch.chatSeed).toMatch(spec.chatSeedPattern);
    expect(resolveNavigationPathForLaunch(launch)).toBe(spec.navigationPath);
  });

  it.each(WIRING_AUDIT_ALL_ALIAS_PAIRS)(
    'alias %s → %s resolves same launch as canonical',
    (alias, canonical) => {
      const spec = WIRING_AUDIT_TOOL_SPECS[canonical];
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);

      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.path).toBe(spec.routePath);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
      expect(fromAlias.openLabel).toBe(fromCanonical.openLabel);
      expect(resolveNavigationPathForLaunch(fromAlias)).toBe(spec.navigationPath);
    }
  );

  it('returns empty launch for unknown ids', () => {
    const empty = resolveCatalogLaunch('not-in-wiring-audit-xyz');
    expect(empty.path).toBe('/assistant');
    expect(empty.registryId).toBeNull();
    expect(empty.chatSeed).toBeTruthy();
  });
});

describe('Wiring audit — catalog rows and discovery', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s has exactly one medical catalog row', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);

    const row = matches[0];
    expect(row.pagePath).toBe(spec.routePath);
    expect(row.sidebarToolId).toBe(id);
    expect(row.chatOnlyForm).toBe(spec.chatOnlyForm);
    expect(row.uiCalculatorSlug).toBe(spec.uiCalculatorSlug);
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed.length).toBeGreaterThan(40);
    expect(row.backendExecutor).toBe(false);
  });

  it.each(WIRING_AUDIT_ALL_IDS)('catalog search finds %s', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    for (const [canonical, query] of spec.catalogSearchQueries) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === canonical), `search "${query}"`).toBe(true);
    }
  });

  it.each(WIRING_AUDIT_ALL_IDS)('discovery merges %s exactly once', (id) => {
    const merged = getAllDiscoveredTools();
    const hits = merged.filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
  });
});

describe('Wiring audit — sidebar visibility', () => {
  it('lists each audited tool exactly once in toolRegistry', () => {
    const rows = toolRegistry.filter((t) => WIRING_AUDIT_ALL_IDS.includes(t.id));
    expect(rows).toHaveLength(WIRING_AUDIT_ALL_IDS.length);
    for (const id of WIRING_AUDIT_ALL_IDS) {
      expect(toolRegistryById[id]?.id).toBe(id);
    }
  });

  it.each(WIRING_AUDIT_ALL_IDS)('exposes sidebar icon for %s', (id) => {
    const icon = getToolIcon(id);
    expect(icon).toBeTruthy();
    expect(icon).not.toBe(getToolIcon('__nonexistent_tool_xyz__'));
  });
});

describe('Wiring audit — Tier-B chat config exports', () => {
  it('keeps COPD GOLD and Rome IV config ids in sync with NLU', () => {
    expect(copdGoldChatConfig.toolId).toBe('copd-gold');
    expect(romeIvIbsChatConfig.toolId).toBe('rome-iv-ibs');
    expect(clinicalIntentTools.find((t) => t.toolId === copdGoldChatConfig.toolId)?.chatSeed).toBe(
      copdGoldChatConfig.chatSeed
    );
    expect(clinicalIntentTools.find((t) => t.toolId === romeIvIbsChatConfig.toolId)?.chatSeed).toBe(
      romeIvIbsChatConfig.chatSeed
    );
  });
});
