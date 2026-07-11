import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  PR8_TIER_A_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

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

const PR8_IDS = [
  'heart-score',
  'centor-mcisaac',
  'bishop-score',
  'apgar-score',
  'braden-scale',
  'morse-fall-scale',
  'ranson-criteria',
  'bisap-score',
  'fib4',
  'framingham-risk',
];

describe('PR8 Tier-A calculator batch wiring', () => {
  it('exports frozen PR8 Tier-A audit list with all ten tools', () => {
    expect(Object.isFrozen(PR8_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR8_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual(expect.arrayContaining(PR8_IDS));
    expect(PR8_TIER_A_CALCULATOR_REGISTRY_IDS).toHaveLength(PR8_IDS.length);
  });

  it.each(PR8_IDS)('keeps registry, NLU, builtin, and BUILTIN_CALC map aligned for %s', (id) => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(`/tools/calculators/${id}`);
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.path).toBe(`/tools/calculators/${id}`);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    if (!builtin) throw new Error('expected builtin calculator entry to exist');
    expect(builtin?.path).toBe(`/tools/calculators/${id}`);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(patternsSource).toContain(`toolId: '${id}'`);
  });

  it('registers calculator routes in App.jsx', () => {
    assertAppCalculatorRouteWiring(appSource, PR8_IDS);
  });

  it.each(PR8_IDS)('includes Calculators.jsx switch case for %s', (id) => {
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id.replace(/-/g, '\\-')}'\\s*:`));
  });

  it('includes all PR8 tools in discovery and medical catalog', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    for (const id of PR8_IDS) {
      expect(discovered.has(id)).toBe(true);
      const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
      expect(row?.pagePath).toBe(`/tools/calculators/${id}`);
      expect(row?.uiCalculatorSlug).toBe(id);
    }
  });

  it('resolves centor and framingham aliases', () => {
    expect(resolveRegistryId('centor')).toBe('centor-mcisaac');
    expect(resolveCatalogLaunch('framingham').registryId).toBe('framingham-risk');
    expect(resolveCatalogLaunch('fib-4').path).toBe('/tools/calculators/fib4');
  });
});
