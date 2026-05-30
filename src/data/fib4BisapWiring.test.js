import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import { resolveCatalogLaunch, BUILTIN_CALC_ID_TO_REGISTRY_ID } from './clinicalCatalogWiring';
import { NLU_TO_REGISTRY_ID, REGISTRY } from './clinicalToolIdContract';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIB4 = REGISTRY.fib4;
const BISAP = REGISTRY.bisapScore;

const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const pr8Source = readFileSync(join(__dirname, '../pages/tools/pr8ClinicalBatchCalculators.jsx'), 'utf8');
const fib4UtilSource = readFileSync(join(__dirname, '../utils/fib4Calculator.js'), 'utf8');
const bisapUtilSource = readFileSync(join(__dirname, '../utils/bisapScoreCalculator.js'), 'utf8');

describe.each([
  ['FIB-4', FIB4, 'FIB4_SAFETY_DISCLAIMER', 'validateFib4Inputs'],
  ['BISAP', BISAP, 'BISAP_SAFETY_DISCLAIMER', 'BISAP criteria within 24 hours'],
])('%s (%s) wiring', (_label, id, disclaimerExport, utilFragment) => {
  it('keeps registry, NLU, builtin, and route aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(`/tools/calculators/${id}`);
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(`/tools/calculators/${id}`);
    expect(nlu?.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(`/tools/calculators/${id}`);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(patternsSource).toContain(`toolId: '${id}'`);
  });

  it('registers App route and Calculators switch case', () => {
    assertAppCalculatorRouteWiring(appSource, [id]);
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id}'\\s*:`));
    expect(matchCalculatorRoute(`/tools/calculators/${id}`)?.calculatorSlug).toBe(id);
  });

  it('indexes catalog and discovery', () => {
    expect(getMedicalToolsCatalogRows().some((r) => r.primaryId === id)).toBe(true);
    expect(getAllDiscoveredTools().some((r) => r.id === id || r.mapsTo === id)).toBe(true);
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(`/tools/calculators/${id}`);
  });

  it('UI and util expose safety disclaimer and validation', () => {
    expect(pr8Source).toContain(disclaimerExport);
    if (id === FIB4) {
      expect(fib4UtilSource).toContain(utilFragment);
      expect(pr8Source).toContain('aria-describedby="fib4-ast-help"');
    } else {
      expect(bisapUtilSource).toContain('BISAP_SAFETY_DISCLAIMER');
      expect(bisapUtilSource).toContain('validateBisapInputs');
      expect(pr8Source).toContain(utilFragment);
    }
  });
});

describe('fib4 / bisap NLU aliases', () => {
  it('resolves bisap alias to bisap-score', () => {
    expect(NLU_TO_REGISTRY_ID.bisap).toBe(BISAP);
    expect(NLU_TO_REGISTRY_ID['fib-4']).toBe(FIB4);
  });

  it('discovers bisap alias row', () => {
    const row = getAllDiscoveredTools().find((r) => r.id === 'bisap');
    expect(row?.mapsTo).toBe(BISAP);
  });
});
