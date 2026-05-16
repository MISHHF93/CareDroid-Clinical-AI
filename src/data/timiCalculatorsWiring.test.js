import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_TIMI_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('TIMI UA/NSTEMI calculator wiring', () => {
  const id = 'timi-ua-nstemi';

  it('exports frozen PR2 TIMI registry id list', () => {
    expect(Object.isFrozen(PR2_TIMI_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR2_TIMI_CALCULATOR_REGISTRY_IDS]).toEqual([id]);
  });

  it('keeps registry, NLU, builtin, and maps aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe('/tools/calculators/timi-ua-nstemi');
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators/timi-ua-nstemi');
    expect(nlu?.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe('/tools/calculators/timi-ua-nstemi');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
  });

  it('resolves NLU aliases', () => {
    expect(NLU_TO_REGISTRY_ID.timi).toBe(id);
    expect(NLU_TO_REGISTRY_ID['timi score']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['timi acs']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['timi nstemi']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['timi unstable angina']).toBe(id);
    expect(resolveCatalogLaunch('timi-score').path).toBe('/tools/calculators/timi-ua-nstemi');
  });

  it('is included in discovery and catalog', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe('/tools/calculators/timi-ua-nstemi');
    expect(row?.uiCalculatorSlug).toBe(id);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('timi-score');
    expect(ids).toContain('timi-acs');
    expect(ids).toContain('timi-nstemi');
    expect(ids).toContain('timi-unstable-angina');
  });

  it('registers App route before calculators hub', () => {
    const routeIdx = appSource.indexOf("path: '/tools/calculators/timi-ua-nstemi'");
    const hubIdx = appSource.indexOf("path: '/tools/calculators', element:");
    expect(routeIdx).toBeGreaterThan(-1);
    expect(routeIdx).toBeLessThan(hubIdx);
    expect(appSource).toContain('initialCalculatorId="timi-ua-nstemi"');
  });

  it('resolveRegistryId maps timi aliases', () => {
    expect(resolveRegistryId('timi')).toBe(id);
    expect(resolveRegistryId('timi-score')).toBe(id);
    expect(resolveRegistryId('timi-nstemi')).toBe(id);
  });
});
