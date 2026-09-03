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

const BISHOP = REGISTRY.bishopScore;
const APGAR = REGISTRY.apgarScore;

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

describe.each([
  ['Bishop score', BISHOP, 'BISHOP_OBSTETRIC_DISCLAIMER', 'Cervical examination'],
  ['Apgar score', APGAR, 'APGAR_OBSTETRIC_DISCLAIMER', 'Apgar at 1 minute'],
])('%s (%s) wiring', (_label, id, disclaimerExport, uiFragment) => {
  it('keeps registry, NLU, builtin, and route aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(`/tools/calculators/${id}`);
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.path).toBe(`/tools/calculators/${id}`);
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

  it('indexes catalog and discovery', () => {
    expect(getMedicalToolsCatalogRows().some((r) => r.primaryId === id)).toBe(true);
    expect(getAllDiscoveredTools().some((r) => r.id === id || r.mapsTo === id)).toBe(true);
    expect(resolveCatalogLaunch(id).path).toBe(`/tools/calculators/${id}`);
  });

  it('NLU chat seed includes obstetric STEP 0 workflow', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.chatSeed).toMatch(/STEP 0/i);
    expect(nlu?.chatSeed).not.toMatch(/\bprescribe\b/i);
  });

  it('UI exposes obstetric disclaimer', () => {
    expect(pr8Source).toContain(disclaimerExport);
    expect(pr8Source).toContain(uiFragment);
  });
});

describe('obstetric scales NLU aliases', () => {
  it('resolves apgar alias to apgar-score', () => {
    expect(NLU_TO_REGISTRY_ID.apgar).toBe(APGAR);
  });

  it('discovers apgar alias row', () => {
    const row = getAllDiscoveredTools().find((r) => r.id === 'apgar');
    expect(row?.mapsTo).toBe(APGAR);
  });
});
