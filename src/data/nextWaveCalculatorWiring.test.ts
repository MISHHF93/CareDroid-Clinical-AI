import { describe, expect, it } from 'vitest';
import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_TO_REGISTRY_ID,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  PR11_TIER_A_CALCULATOR_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { CALCULATOR_INTERFACE_CLASS_BY_SLUG } from './calculatorHubManifest';
import { CALCULATOR_ROUTE_DEFS, expectedLaunchPath, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const PR11_TOOL_IDS = [REGISTRY.shockIndex, REGISTRY.anionGap, REGISTRY.rass];

describe('next-wave Tier A calculators', () => {
  it('registers Shock Index, Anion Gap, and RASS as local Tier A forms', () => {
    expect([...PR11_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual(PR11_TOOL_IDS);

    for (const id of PR11_TOOL_IDS) {
      expect(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS).toContain(id);
      expect(toolRegistryById[id]?.initialCalc).toBe(id);
      expect(toolRegistryById[id]?.path).toBe(`/tools/calculators/${id}`);
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).not.toContain(id);
    }
  });

  it('exposes catalog, route, and form smoke hooks without claiming backend executors', () => {
    for (const id of PR11_TOOL_IDS) {
      const builtin = builtinUiCalculators.find((calc) => calc.id === id);
      const registry = toolRegistry.find((tool) => tool.id === id);
      const nlu = clinicalIntentTools.find((tool) => tool.toolId === id);
      const launch = resolveCatalogLaunch(id);

      expect(builtin?.path).toBe(`/tools/calculators/${id}`);
      expect(builtin?.orchestratorId).toBeNull();
      expect(registry?.panelTool).toBe('calculators');
      expect(nlu?.backendExecutable).toBe(false);
      expect(NLU_PROFILE_TOOL_IDS).toContain(id);
      expect(launch.path).toBe(`/tools/calculators/${id}`);
      expect(CALCULATOR_INTERFACE_CLASS_BY_SLUG[id]).toBe(`calculator-interface--${id}`);
    }
  });

  it('resolves dedicated calculator routes and aliases', () => {
    const aliasPairs = [
      ['shock index', REGISTRY.shockIndex],
      ['anion gap', REGISTRY.anionGap],
      ['rass score', REGISTRY.rass],
    ];

    for (const id of PR11_TOOL_IDS) {
      const path = `/tools/calculators/${id}`;
      expect(expectedLaunchPath(id)).toBe(path);
      expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
      expect(CALCULATOR_ROUTE_DEFS.some((def) => def.calculatorSlug === id)).toBe(true);
    }

    for (const [alias, registryId] of aliasPairs) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(registryId);
      expect(resolveCatalogLaunch(alias).registryId).toBe(registryId);
    }
  });
});
