import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('CKD staging calculator wiring (ckd-staging)', () => {
  const id = 'ckd-staging';

  it('is listed in PR4A Tier-A audit ids', () => {
    expect(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(id);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(reg.path).toBe('/tools/calculators/ckd-staging');
    expect(reg.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu).toBeTruthy();
    expect(nlu.path).toBe('/tools/calculators/ckd-staging');
    expect(nlu.sidebarToolId).toBe(id);
    expect(nlu.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin).toBeTruthy();
    expect(builtin.path).toBe('/tools/calculators/ckd-staging');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'ckd-staging'");
    expect(patternsSource).toContain('preferCkdStaging');
  });

  it('resolves required NLU aliases', () => {
    const aliases = [
      'ckd stage',
      'kidney stage',
      'kidney disease staging',
      'gfr stage',
      'albuminuria stage',
    ];
    for (const alias of aliases) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      expect(resolveCatalogLaunch(alias).path).toBe('/tools/calculators/ckd-staging');
      expect(resolveCatalogLaunch(alias).registryId).toBe(id);
      expect(resolveCatalogLaunch(alias).openLabel).toBe('Open');
    }
    expect(resolveCatalogLaunch('ckd-stage').path).toBe('/tools/calculators/ckd-staging');
    expect(resolveCatalogLaunch('gfr-stage').registryId).toBe(id);
  });

  it('includes ckd-staging in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe('/tools/calculators/ckd-staging');
    expect(row?.uiCalculatorSlug).toBe(id);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('ckd-stage');
    expect(ids).toContain('albuminuria-stage');
  });

    it('registers calculator routes in App.jsx via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, ['ckd-staging']);
  });

  it('resolveRegistryId maps ckd aliases without overriding legacy gfr', () => {
    expect(resolveRegistryId('ckd-staging')).toBe(id);
    expect(resolveRegistryId('ckd-stage')).toBe(id);
    expect(resolveRegistryId('gfr')).toBe('calc-gfr');
    expect(resolveRegistryId('egfr')).toBe('calc-gfr');
  });
});
