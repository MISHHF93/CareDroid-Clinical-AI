import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('GAD-7 calculator wiring (gad7)', () => {
  const id = 'gad7';

  it('is listed in PR5 Tier-A audit ids', () => {
    expect(PR5_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(id);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(reg.path).toBe('/tools/calculators/gad7');
    expect(reg.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu).toBeTruthy();
    expect(nlu.path).toBe('/tools/calculators/gad7');
    expect(nlu.sidebarToolId).toBe(id);
    expect(nlu.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin).toBeTruthy();
    expect(builtin.path).toBe('/tools/calculators/gad7');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'gad7'");
    expect(patternsSource).toContain('preferGad7');
  });

  it('resolves required NLU aliases to dedicated calculator route', () => {
    const aliases = [
      'gad7',
      'anxiety screen',
      'anxiety questionnaire',
      'generalized anxiety screen',
      'anxiety-screen',
    ];
    for (const alias of aliases) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      expect(resolveCatalogLaunch(alias).path).toBe('/tools/calculators/gad7');
      expect(resolveCatalogLaunch(alias).registryId).toBe(id);
      expect(resolveCatalogLaunch(alias).openLabel).toBe('Open');
    }
  });

  it('includes gad7 in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe('/tools/calculators/gad7');
    expect(row?.uiCalculatorSlug).toBe(id);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('anxiety-screen');
    expect(ids).toContain('gad-7');
    expect(ids).toContain('generalized-anxiety-screen');
  });

  it('registers calculator routes in App.jsx via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, ['gad7']);
  });

  it('resolveRegistryId maps gad7 aliases', () => {
    expect(resolveRegistryId('gad7')).toBe(id);
    expect(resolveRegistryId('anxiety-screen')).toBe(id);
    expect(resolveRegistryId('generalized-anxiety-screen')).toBe(id);
  });
});
