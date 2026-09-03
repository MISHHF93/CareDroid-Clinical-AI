import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import { resolveCatalogLaunch, BUILTIN_CALC_ID_TO_REGISTRY_ID } from './clinicalCatalogWiring';
import { REGISTRY } from './clinicalToolIdContract';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';
import { ensureChatSeedGuardrails, SAFETY_AUDIT_PATTERNS } from './clinicalSafetyGuardrails';
import { CALCULATOR_ROUTE_DEFS, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const id = REGISTRY.heartScore;

const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const utilSource = readFileSync(join(__dirname, '../utils/heartScoreCalculator.ts'), 'utf8');

describe('HEART score (heart-score) wiring', () => {
  it('keeps registry, NLU, builtin, and route aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(`/tools/calculators/${id}`);
    expect(reg?.initialCalc).toBe(id);

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.path).toBe(`/tools/calculators/${id}`);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(true);

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

  it('chat seed includes PE/ACS guardrails after normalization', () => {
    const row = clinicalIntentTools.find((t) => t.toolId === id);
    const seed = ensureChatSeedGuardrails(row);
    expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_GUARDRAIL_RE);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
    expect(seed).toMatch(/unstable|emergency|STEMI/i);
  });

  it('scoring util documents all five HEART inputs', () => {
    for (const key of ['history', 'ecg', 'age', 'riskFactors', 'troponin']) {
      expect(utilSource).toContain(`key: '${key}'`);
    }
    expect(utilSource).toContain('HEART_SCORE_DISCLAIMER');
  });
});
