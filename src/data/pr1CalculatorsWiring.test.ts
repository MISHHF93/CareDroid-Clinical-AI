import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR1_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { PR1_ALL_ALIAS_PAIRS, PR1_CATALOG_SEARCH_QUERIES } from './pr1TestConstants';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);

describe('PR1 calculator wiring (qSOFA, NEWS2, Child-Pugh, HAS-BLED)', () => {
  it('exports a frozen audit list of four registry ids', () => {
    expect(Object.isFrozen(PR1_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR1_CALCULATOR_REGISTRY_IDS]).toEqual(['qsofa', 'news2', 'child-pugh', 'has-bled']);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map, and NLU alias map aligned', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(reg.path).toBe(`/tools/calculators/${id}`);
      expect(reg.initialCalc).toBe(id);
      expect(reg.panelTool).toBe('calculators');

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      if (!nlu) throw new Error('expected nlu tool entry to exist');
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(nlu.path).toBe(`/tools/calculators/${id}`);
      expect(nlu.sidebarToolId).toBe(id);

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      if (!builtin) throw new Error('expected builtin calculator entry to exist');
      expect(builtin, `builtinUiCalculators missing ${id}`).toBeTruthy();
      expect(builtin.path).toBe(`/tools/calculators/${id}`);
      expect(builtin.calcQuery).toBe(`/tools/calculators?calc=${id}`);

      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(NLU_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('registers App.jsx deep-link routes via CALCULATOR_ROUTE_DEFS', () => {
    assertAppCalculatorRouteWiring(appSource, [...PR1_CALCULATOR_REGISTRY_IDS]);
  });

  it('mirrors backend tool.patterns.ts toolId for each PR1 calculator', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(patternsSource).toMatch(new RegExp(`toolId:\\s*'${id.replace(/-/g, '\\-')}'`));
    }
  });

  it('resolves chat/catalog launch for PR1 NLU toolIds (same ids are also registry ids)', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toBe(`/tools/calculators/${id}`);
    }
  });

  it('keeps BUILTIN_CALC_ID_TO_REGISTRY_ID in sync for PR1 builtinUiCalculators slugs', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(builtinUiCalculators.some((c) => c.id === id)).toBe(true);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('resolves NLU_TO_REGISTRY_ID aliases to the same PR1 targets', () => {
    expect(NLU_TO_REGISTRY_ID['ctp-score']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['cirrhosis-score']).toBe('child-pugh');
    expect(resolveCatalogLaunch('ctp-score').path).toBe('/tools/calculators/child-pugh');

    expect(NLU_TO_REGISTRY_ID.hasbled).toBe('has-bled');
    expect(resolveCatalogLaunch('hasbled').path).toBe('/tools/calculators/has-bled');
  });

  it('includes each PR1 tool in merged discovery and medical catalog rows', () => {
    const discovered = getAllDiscoveredTools();
    const catalogRows = getMedicalToolsCatalogRows();

    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(
        discovered.some((r) => r.id === id && r.path?.includes(`/tools/calculators/${id}`)),
      ).toBe(true);
      const row = catalogRows.find((r) => r.primaryId === id || r.id === id);
      expect(row?.pagePath).toBe(`/tools/calculators/${id}`);
      expect(row?.uiCalculatorSlug).toBe(id);
    }
  });

  it('lists PR1 registry entries in toolRegistry export (sidebar visibility)', () => {
    const ids = new Set(toolRegistry.map((t) => t.id));
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('uses plural /tools/calculators/ paths for PR1 (not legacy /tools/calculator/)', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const bad = `/tools/calculator/${id}`;
      expect(toolRegistryById[id].path).not.toBe(bad);
    }
  });

  it('has no duplicate toolIdAliases.id entries', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolveRegistryId maps NLU aliases to canonical PR1 registry ids', () => {
    expect(resolveRegistryId('ctp-score')).toBe('child-pugh');
    expect(resolveRegistryId('hasbled')).toBe('has-bled');
    expect(resolveRegistryId('qsofa')).toBe('qsofa');
    expect(resolveRegistryId('news2')).toBe('news2');
  });

  it.each(PR1_ALL_ALIAS_PAIRS)('NLU/catalog alias %s → %s', (alias, canonical) => {
    expect(resolveRegistryId(alias)).toBe(canonical);
    expect(resolveCatalogLaunch(alias).path).toBe(`/tools/calculators/${canonical}`);
    expect(resolveCatalogLaunch(alias).registryId).toBe(canonical);
  });

  it.each(PR1_CATALOG_SEARCH_QUERIES)(
    'catalog search finds %s for query %s',
    (registryId, query) => {
      const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
      expect(rows.some((r) => r.sidebarToolId === registryId || r.primaryId === registryId)).toBe(
        true,
      );
    },
  );
});
