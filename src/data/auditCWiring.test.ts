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

describe('AUDIT-C calculator wiring (audit-c)', () => {
  const id = 'audit-c';

  it('is listed in PR4A Tier-A audit ids', () => {
    expect(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(id);
  });

  it('keeps registry, NLU, builtin, BUILTIN_CALC map aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(reg.path).toBe('/tools/calculators/audit-c');
    expect(reg.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu).toBeTruthy();
    expect(nlu.path).toBe('/tools/calculators/audit-c');
    expect(nlu.sidebarToolId).toBe(id);
    expect(nlu.backendExecutable).toBe(false);

    const builtin = builtinUiCalculators.find((c) => c.id === id);
    if (!builtin) throw new Error('expected builtin calculator entry to exist');
    expect(builtin).toBeTruthy();
    expect(builtin.path).toBe('/tools/calculators/audit-c');
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'audit-c'");
    expect(patternsSource).toContain('preferAuditC');
  });

  it('resolves required NLU aliases', () => {
    const aliases = ['audit c', 'alcohol screen', 'alcohol use screen', 'drinking screen'];
    for (const alias of aliases) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      expect(resolveCatalogLaunch(alias).path).toBe('/tools/calculators/audit-c');
      expect(resolveCatalogLaunch(alias).registryId).toBe(id);
      expect(resolveCatalogLaunch(alias).openLabel).toBe('Open');
    }
    expect(resolveCatalogLaunch('audit-c').path).toBe('/tools/calculators/audit-c');
    expect(resolveCatalogLaunch('alcohol-screen').registryId).toBe(id);
  });

  it('includes audit-c in discovery and medical catalog rows', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe('/tools/calculators/audit-c');
    expect(row?.uiCalculatorSlug).toBe(id);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('alcohol-screen');
    expect(ids).toContain('drinking-screen');
  });

  it('includes Calculators.jsx switch case for audit-c', () => {
    const calculatorsSource = readFileSync(
      join(__dirname, '../pages/tools/Calculators.tsx'),
      'utf8',
    );
    expect(calculatorsSource).toContain("case 'audit-c':");
    expect(calculatorsSource).toContain('AuditCCalculator');
  });

  it('registers calculator routes in App.jsx via CALCULATOR_ROUTE_DEFS before hub', () => {
    assertAppCalculatorRouteWiring(appSource, ['audit-c']);
  });

  it('resolveRegistryId maps audit-c aliases', () => {
    expect(resolveRegistryId('audit-c')).toBe(id);
    expect(resolveRegistryId('alcohol-screen')).toBe(id);
    expect(resolveRegistryId('drinking-screen')).toBe(id);
  });
});
