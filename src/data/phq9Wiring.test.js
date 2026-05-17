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

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('PHQ-9 calculator wiring (phq9)', () => {
  const id = 'phq9';

  it('is listed in PR5 Tier-A audit ids', () => {
    expect(PR5_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(id);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(reg.path).toBe('/tools/calculators/phq9');
    expect(reg.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu).toBeTruthy();
    expect(nlu.path).toBe('/tools/calculators/phq9');
    expect(nlu.sidebarToolId).toBe(id);
    expect(nlu.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin).toBeTruthy();
    expect(builtin.path).toBe('/tools/calculators/phq9');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'phq9'");
    expect(patternsSource).toContain('preferPhq9');
  });

  it('resolves required NLU aliases', () => {
    expect(NLU_TO_REGISTRY_ID.phq9).toBe(id);
    expect(NLU_TO_REGISTRY_ID['depression screen']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['depression questionnaire']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['mood screen']).toBe(id);
    expect(resolveCatalogLaunch('phq9').path).toBe('/tools/calculators/phq9');
    expect(resolveCatalogLaunch('depression-screen').registryId).toBe(id);
  });

  it('includes phq9 in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe('/tools/calculators/phq9');
    expect(row?.uiCalculatorSlug).toBe(id);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('depression-screen');
    expect(ids).toContain('mood-screen');
    expect(ids).toContain('phq-9');
  });

  it('registers App.jsx route before calculators hub', () => {
    const idx = appSource.indexOf("path: '/tools/calculators/phq9'");
    const hubIdx = appSource.indexOf("path: '/tools/calculators', element:");
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(hubIdx);
  });

  it('resolveRegistryId maps phq9 aliases', () => {
    expect(resolveRegistryId('phq9')).toBe(id);
    expect(resolveRegistryId('depression-screen')).toBe(id);
    expect(resolveRegistryId('mood-screen')).toBe(id);
  });
});
