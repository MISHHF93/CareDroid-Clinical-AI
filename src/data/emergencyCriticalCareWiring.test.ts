import { describe, expect, it } from 'vitest';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  EMERGENCY_CRITICAL_CARE_TIER_A_CALCULATOR_REGISTRY_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_TO_REGISTRY_ID,
  REGISTRY,
} from './clinicalToolIdContract';
import { CALCULATOR_INTERFACE_CLASS_BY_SLUG } from './calculatorHubManifest';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { toolRegistryById } from './toolRegistry';
import { CALCULATOR_ROUTE_DEFS, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const EMERGENCY_TIER_A = [
  [REGISTRY.apache2Calculator, 'apache-ii'],
  [REGISTRY.curb65Calculator, 'curb-65'],
  [REGISTRY.gcsCalculator, 'gcs'],
  [REGISTRY.mews, 'mews'],
  [REGISTRY.revisedTraumaScore, 'revised-trauma-score'],
  [REGISTRY.pews, 'pews'],
];

describe('Emergency & Critical Care calculator wiring', () => {
  it('registers missing emergency calculators as Tier A dedicated forms', () => {
    expect([...EMERGENCY_CRITICAL_CARE_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual(
      EMERGENCY_TIER_A.map(([registryId]) => registryId),
    );

    for (const [registryId, slug] of EMERGENCY_TIER_A) {
      expect(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(registryId);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[slug]).toBe(registryId);
      expect(toolRegistryById[registryId]?.initialCalc).toBe(slug);
      expect(toolRegistryById[registryId]?.path).toBe(`/tools/calculators/${slug}`);
      expect(CALCULATOR_INTERFACE_CLASS_BY_SLUG[slug]).toBe(`calculator-interface--${slug}`);
    }
  });

  it('exposes catalog, NLU profile, and calculator routes without duplicate hub-only IDs', () => {
    const hubOnlyIds = new Set(nluCalculatorHubOnly.map((tool) => tool.toolId));
    for (const [registryId, slug] of EMERGENCY_TIER_A) {
      const builtin = builtinUiCalculators.find((calculator) => calculator.id === slug);
      if (!builtin) throw new Error('expected builtin calculator entry to exist');
      const nlu = clinicalIntentTools.find((tool) => tool.sidebarToolId === registryId);
      if (!nlu) throw new Error('expected nlu tool entry to exist');
      const route = `/tools/calculators/${slug}`;

      expect(builtin?.path).toBe(route);
      expect(nlu?.path).toBe(route);
      expect(NLU_PROFILE_TOOL_IDS).toContain(nlu.toolId);
      expect(resolveCatalogLaunch(registryId).path).toBe(route);
      expect(matchCalculatorRoute(route)?.calculatorSlug).toBe(slug);
      expect(CALCULATOR_ROUTE_DEFS.some((def) => def.calculatorSlug === slug)).toBe(true);
      expect(hubOnlyIds.has(nlu.toolId as any)).toBe(false);
    }
  });

  it('maps launch aliases to canonical registry IDs', () => {
    expect(NLU_TO_REGISTRY_ID['apache ii']).toBe(REGISTRY.apache2Calculator);
    expect(NLU_TO_REGISTRY_ID['curb-65']).toBe(REGISTRY.curb65Calculator);
    expect(NLU_TO_REGISTRY_ID.gcs).toBe(REGISTRY.gcsCalculator);
    expect(NLU_TO_REGISTRY_ID.mews).toBe(REGISTRY.mews);
    expect(NLU_TO_REGISTRY_ID.rts).toBe(REGISTRY.revisedTraumaScore);
    expect(NLU_TO_REGISTRY_ID.pews).toBe(REGISTRY.pews);
  });
});
