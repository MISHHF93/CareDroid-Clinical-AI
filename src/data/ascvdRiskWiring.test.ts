import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
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

describe('ASCVD risk calculator wiring (ascvd-risk)', () => {
  it('exports a frozen PR4A Tier-A audit list', () => {
    expect(Object.isFrozen(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS)).toBe(true);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual(
      expect.arrayContaining(['ascvd-risk']),
    );
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map, and NLU alias map aligned', () => {
    const id = 'ascvd-risk';
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(reg.path).toBe('/tools/calculators/ascvd-risk');
    expect(reg.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu).toBeTruthy();
    if (!nlu) throw new Error('expected clinicalIntentTools entry for ascvd-risk to exist');
    expect(nlu.path).toBe('/tools/calculators/ascvd-risk');
    expect(nlu.sidebarToolId).toBe(id);
    expect(nlu.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    if (!builtin) throw new Error('expected builtin calculator entry to exist');
    expect(builtin).toBeTruthy();
    if (!builtin) throw new Error('expected builtinUiCalculators entry for ascvd-risk to exist');
    expect(builtin.path).toBe('/tools/calculators/ascvd-risk');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'ascvd-risk'");
    expect(patternsSource).toContain('preferAscvdRisk');
  });

  it('resolves required NLU aliases to ascvd-risk', () => {
    const aliases = [
      'ascvd',
      'cardiovascular risk',
      'heart disease risk',
      'cv risk',
      'ascvd score',
    ];
    for (const alias of aliases) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe('ascvd-risk');
      expect(resolveCatalogLaunch(alias).path).toBe('/tools/calculators/ascvd-risk');
      expect(resolveCatalogLaunch(alias).registryId).toBe('ascvd-risk');
      expect(resolveCatalogLaunch(alias).openLabel).toBe('Open');
    }
    expect(resolveCatalogLaunch('ascvd-score').path).toBe('/tools/calculators/ascvd-risk');
    expect(resolveCatalogLaunch('cardiovascular-risk').registryId).toBe('ascvd-risk');
  });

  it('includes ascvd-risk in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has('ascvd-risk')).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === 'ascvd-risk');
    expect(row?.pagePath).toBe('/tools/calculators/ascvd-risk');
    expect(row?.uiCalculatorSlug).toBe('ascvd-risk');
  });

  it('documents discovery aliases for ascvd-score and cv-risk', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('ascvd-score');
    expect(ids).toContain('cv-risk');
    expect(ids).toContain('cardiovascular-risk');
  });

  it('registers calculator routes in App.jsx via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, ['ascvd-risk']);
  });

  it('resolveRegistryId maps ascvd aliases', () => {
    expect(resolveRegistryId('ascvd-risk')).toBe('ascvd-risk');
    expect(resolveRegistryId('ascvd')).toBe('ascvd-risk');
    expect(resolveRegistryId('ascvd-score')).toBe('ascvd-risk');
    expect(resolveRegistryId('heart-disease-risk')).toBe('ascvd-risk');
  });
});
