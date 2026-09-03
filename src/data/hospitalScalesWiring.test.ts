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
import { CALCULATOR_ROUTE_DEFS, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BRADEN = REGISTRY.bradenScale;
const MORSE = REGISTRY.morseFallScale;

const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const pr8Source = readFileSync(
  join(__dirname, '../pages/tools/pr8ClinicalBatchCalculators.tsx'),
  'utf8',
);
const bradenUtilSource = readFileSync(join(__dirname, '../utils/bradenScaleCalculator.ts'), 'utf8');
const morseUtilSource = readFileSync(
  join(__dirname, '../utils/morseFallScaleCalculator.ts'),
  'utf8',
);

describe.each([
  ['Braden scale', BRADEN, 'BRADEN_HOSPITAL_DISCLAIMER', 'Braden subscales'],
  ['Morse Fall Scale', MORSE, 'MORSE_FALL_HOSPITAL_DISCLAIMER', 'Morse fall-risk items'],
])('%s (%s) wiring', (_label, id, disclaimerExport, fieldsetLegendFragment) => {
  it('keeps registry, NLU, builtin, and route aligned', () => {
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

  it('registers App route and Calculators switch case', () => {
    assertAppCalculatorRouteWiring(appSource, [id]);
    expect(calculatorsSource).toMatch(new RegExp(`case\\s+'${id}'\\s*:`));
    expect(matchCalculatorRoute(`/tools/calculators/${id}`)?.calculatorSlug).toBe(id);
    expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(
      `/tools/calculators/${id}`,
    );
  });

  it('indexes catalog and discovery rows', () => {
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe(`/tools/calculators/${id}`);
    expect(row?.uiCalculatorSlug).toBe(id);
    expect(row?.chatOnlyForm).toBe(false);
  });

  it('resolves catalog launch to dedicated calculator path', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(`/tools/calculators/${id}`);
    expect(launch.openLabel).toMatch(/open/i);
  });

  it('NLU chat seed includes inpatient nursing STEP 0 workflow', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.chatSeed).toMatch(/STEP 0/i);
    expect(nlu?.chatSeed).toMatch(/nursing/i);
    expect(nlu?.chatSeed).not.toMatch(/\bimplement\b/i);
  });

  it('UI exposes hospital disclaimer and accessibility labels', () => {
    expect(pr8Source).toContain(disclaimerExport);
    expect(pr8Source).toContain(fieldsetLegendFragment);
    expect(pr8Source).toContain('aria-label={calcButtonLabel}');
    expect(pr8Source).toContain("ariaLive={result ? 'polite' : 'off'}");
  });
});

describe('hospital scales NLU aliases', () => {
  it('resolves morse-fall alias to morse-fall-scale registry id', () => {
    expect(NLU_TO_REGISTRY_ID['morse-fall']).toBe(MORSE);
    expect(NLU_TO_REGISTRY_ID['morse fall']).toBe(MORSE);
  });

  it('discovers morse-fall alias row', () => {
    const row = getAllDiscoveredTools().find((r) => r.id === 'morse-fall');
    expect(row?.mapsTo).toBe(MORSE);
  });

  it('documents hospital disclaimers in scoring utils', () => {
    expect(bradenUtilSource).toContain('riskCategory');
    expect(bradenUtilSource).toContain('BRADEN_HOSPITAL_DISCLAIMER');
    expect(morseUtilSource).toContain('riskCategory');
    expect(morseUtilSource).toContain('MORSE_FALL_HOSPITAL_DISCLAIMER');
  });
});
