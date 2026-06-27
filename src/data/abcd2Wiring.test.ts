import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR10_TIER_A_CALCULATOR_REGISTRY_IDS,
  REGISTRY,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';
import { CALCULATOR_ROUTE_DEFS, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const id = REGISTRY.abcd2;

const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const utilSource = readFileSync(join(__dirname, '../utils/abcd2Calculator.ts'), 'utf8');

describe('ABCD² score (abcd2) wiring', () => {
  it('is listed in PR10 Tier A audit list', () => {
    expect([...PR10_TIER_A_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('keeps registry, NLU, builtin, and route aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(`/tools/calculators/${id}`);
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(`/tools/calculators/${id}`);
    expect(nlu?.sidebarToolId).toBe(id);
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
    expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(
      `/tools/calculators/${id}`
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

  it('NLU chat seed includes stroke urgent-care language', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.chatSeed).toMatch(/do not delay urgent/i);
    expect(nlu?.chatSeed).toMatch(/stroke pathways/i);
  });

  it('scoring util documents ABCD² inputs', () => {
    expect(utilSource).toContain('ABCD2_STROKE_DISCLAIMER');
    expect(utilSource).toContain('clinicalFeature');
    expect(utilSource).toContain('durationBand');
    expect(utilSource).toContain('systolicBpMmHg');
  });
});
