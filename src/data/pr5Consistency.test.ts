/**
 * Cross-layer PR5 consistency: registry, NLU, catalog, discovery,
 * resolveCatalogLaunch, backend patterns, routes, sidebar, deep links.
 * Per-tool wiring: phq9Wiring.test.js
 * Formula tests: src/utils/phq9Calculator.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { getToolIcon } from '../navigation/iconRegistry';
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
  PR5_CALCULATOR_REGISTRY_IDS,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import {
  PR5_HUB_PATH,
  PR5_REQUIRED_NLU_ALIAS_PAIRS,
  PR5_DISCOVERY_ALIAS_PAIRS,
  PR5_CATALOG_SEARCH_QUERIES,
  PR5_BACKEND_DISAMBIGUATION_HELPERS,
  PR5_ALL_ALIAS_PAIRS,
  catalogRowsMatchingQuery,
} from './pr5TestConstants';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const mentalHealthCalculatorsSource = readFileSync(
  join(__dirname, '../pages/tools/mentalHealthCalculators.jsx'),
  'utf8'
);

describe('PR5 consistency — centralized audit lists', () => {
  it('freezes the PR5 Tier-A registry ids', () => {
    expect(Object.isFrozen(PR5_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect(Object.isFrozen(PR5_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR5_CALCULATOR_REGISTRY_IDS]).toEqual(['phq9', 'gad7']);
  });
});

describe('PR5 consistency — registry, NLU, catalog, and backend alignment', () => {
  it('keeps registry id, route slug, NLU toolId, and backend pattern toolId aligned', () => {
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      const route = `${PR5_HUB_PATH}/${id}`;
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(reg.path).toBe(route);
      expect(reg.initialCalc).toBe(id);
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.path).toBe(route);
      expect(nlu?.backendExecutable).toBe(false);

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin?.path).toBe(route);
    }
  });

  it('maps BUILTIN_CALC_ID_TO_REGISTRY_ID and ORCHESTRATOR_TO_REGISTRY_ID to self', () => {
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('excludes PR5 tools from chat-only hub list (Tier-A dedicated forms)', () => {
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
    }
  });

  it('documents backend disambiguation helpers', () => {
    for (const helper of PR5_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR5 consistency — aliases', () => {
  it('has no conflicting alias targets within PR5 alias pairs', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of PR5_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting PR5 alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`
        );
      }
      targetByAlias.set(alias, canonical);
    }
  });

  it('resolves all product-required NLU aliases', () => {
    for (const [alias, canonical] of PR5_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(`${PR5_HUB_PATH}/${canonical}`);
    }
  });

  it('aligns discovery alias ids with NLU_TO_REGISTRY_ID', () => {
    for (const [aliasId, canonical] of PR5_DISCOVERY_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
      expect(resolveRegistryId(aliasId)).toBe(canonical);
    }
  });
});

describe('PR5 consistency — catalog, routes, and UI wiring', () => {
  it('includes each PR5 tool in catalog rows with dedicated form', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      const matches = rows.filter((r) => r.primaryId === id);
      expect(matches, `catalog row count for ${id}`).toHaveLength(1);
      expect(matches[0].chatOnlyForm).toBe(false);
      expect(matches[0].uiCalculatorSlug).toBe(id);
    }
  });

  it('registers dedicated calculator routes via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, [...PR5_CALCULATOR_REGISTRY_IDS]);
  });

  it('wires PR5 calculators in Calculators.jsx switch and mental health module', () => {
    expect(calculatorsSource).toContain("case 'phq9':");
    expect(calculatorsSource).toContain('Phq9Calculator');
    expect(calculatorsSource).toContain("from './mentalHealthCalculators'");
    expect(calculatorsSource).toContain("case 'gad7':");
    expect(calculatorsSource).toContain('Gad7Calculator');
    expect(mentalHealthCalculatorsSource).toContain('computePhq9Result');
    expect(mentalHealthCalculatorsSource).toContain('computeGad7Result');
  });

  it('exposes tool icons for PR5 calculators', () => {
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(getToolIcon(id)).toBeTruthy();
    }
  });

  it('finds phq9 via catalog search query', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const [id, query] of PR5_CATALOG_SEARCH_QUERIES) {
      const found = catalogRowsMatchingQuery(rows, query);
      expect(found.some((r) => r.primaryId === id)).toBe(true);
    }
  });

  it('includes PR5 tools in discovery aggregate', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(discovered.has(id)).toBe(true);
    }
  });
});

describe('PR5 consistency — resolveCatalogLaunch, routes, sidebar', () => {
  it('resolves canonical id and NLU toolId to dedicated calculator paths', () => {
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(`${PR5_HUB_PATH}/${id}`);
      expect(launch.registryId).toBe(id);
      expect(launch.chatSeed).toBe(nlu?.chatSeed);
      expect(launch.openLabel).toBe('Open');
      expect(launch.orchestratorTool).toBeNull();
    }
  });

  it('lists each PR5 tool exactly once in toolRegistry (sidebar visibility)', () => {
    const pr5Rows = toolRegistry.filter((t) => PR5_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr5Rows).toHaveLength(PR5_CALCULATOR_REGISTRY_IDS.length);
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(getToolIcon(id)).toBeTruthy();
    }
  });
});
