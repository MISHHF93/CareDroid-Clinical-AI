import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_MELD_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import {
  MELD_REQUIRED_NLU_ALIAS_PAIRS,
  MELD_ROUTE_BY_REGISTRY_ID,
  MELD_CATALOG_SEARCH_QUERIES,
  MELD_TOOL_IDS,
} from './pr2MeldTestConstants';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('MELD calculator wiring (meld, meld-na)', () => {
  it('exports a frozen audit list of two registry ids', () => {
    expect(Object.isFrozen(PR2_MELD_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR2_MELD_CALCULATOR_REGISTRY_IDS]).toEqual(['meld', 'meld-na']);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map, and NLU alias map aligned', () => {
    for (const id of PR2_MELD_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg, `toolRegistry missing ${id}`).toBeTruthy();
      expect(reg.path).toBe(`/tools/calculators/${id}`);
      expect(reg.initialCalc).toBe(id);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu, `clinicalIntentTools missing ${id}`).toBeTruthy();
      expect(nlu.path).toBe(`/tools/calculators/${id}`);
      expect(nlu.sidebarToolId).toBe(id);
      expect(nlu.backendExecutable).toBe(false);

      const builtin = builtinUiCalculators.find((c) => c.id === id);
      expect(builtin, `builtinUiCalculators missing ${id}`).toBeTruthy();
      expect(builtin.path).toBe(`/tools/calculators/${id}`);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    }
  });

  it('mirrors backend tool.patterns.ts toolId for each MELD calculator', () => {
    for (const id of PR2_MELD_CALCULATOR_REGISTRY_IDS) {
      expect(patternsSource).toContain(`toolId: '${id}'`);
    }
  });

  it('resolves NLU aliases to canonical registry ids', () => {
    expect(NLU_TO_REGISTRY_ID['meld score']).toBe('meld');
    expect(NLU_TO_REGISTRY_ID['liver transplant score']).toBe('meld-na');
    expect(NLU_TO_REGISTRY_ID['end stage liver disease score']).toBe('meld');
    expect(NLU_TO_REGISTRY_ID['meld na']).toBe('meld-na');
    expect(resolveCatalogLaunch('meld-score').path).toBe('/tools/calculators/meld');
    expect(resolveCatalogLaunch('liver-transplant-score').path).toBe('/tools/calculators/meld-na');
  });

  it('includes each tool in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR2_MELD_CALCULATOR_REGISTRY_IDS) {
      expect(discovered.has(id)).toBe(true);
      const row = rows.find((r) => r.primaryId === id);
      expect(row?.pagePath).toBe(`/tools/calculators/${id}`);
      expect(row?.uiCalculatorSlug).toBe(id);
    }
  });

  it('documents discovery aliases for MELD hyphenated slugs', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('meld-score');
    expect(ids).toContain('liver-transplant-score');
    expect(ids).toContain('meld-sodium');
    expect(ids).toContain('end-stage-liver-disease-score');
  });

  it('registers MELD routes via CALCULATOR_ROUTE_DEFS before calculators hub', () => {
    assertAppCalculatorRouteWiring(appSource, [...MELD_TOOL_IDS]);
  });

  it('resolveRegistryId maps meld aliases', () => {
    expect(resolveRegistryId('meld')).toBe('meld');
    expect(resolveRegistryId('meld-na')).toBe('meld-na');
    expect(resolveRegistryId('meld-score')).toBe('meld');
    expect(resolveRegistryId('liver-transplant-score')).toBe('meld-na');
  });

  it.each(MELD_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);
    }
  );

  it.each(MELD_TOOL_IDS)('resolveRegistryId maps canonical id %s', (id) => {
    expect(resolveRegistryId(id)).toBe(id);
    expect(NLU_TO_REGISTRY_ID[id]).toBeUndefined();
  });

  it('registers MELD calculator routes via CALCULATOR_ROUTE_DEFS in App.jsx', () => {
    assertAppCalculatorRouteWiring(appSource, [...MELD_TOOL_IDS]);
  });

  it.each(MELD_TOOL_IDS)('CalculatorInterface switch includes case for %s', (id) => {
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });

  it.each(MELD_TOOL_IDS)('clinicalToolRoutes resolves %s deep link', (id) => {
    const path = MELD_ROUTE_BY_REGISTRY_ID[id];
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(expectedLaunchPath(id)).toBe(path);
    expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(path);
  });

  it.each(MELD_CATALOG_SEARCH_QUERIES)(
    'catalog search for %s finds primary %s',
    (primaryId, query) => {
      const rows = getMedicalToolsCatalogRows();
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === primaryId)).toBe(true);
    }
  );

  it('lists meld and meld-na in toolRegistry export', () => {
    const ids = new Set(toolRegistry.map((t) => t.id));
    for (const id of MELD_TOOL_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
