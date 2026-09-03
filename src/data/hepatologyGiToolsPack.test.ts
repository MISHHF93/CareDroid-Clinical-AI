import { describe, expect, it } from 'vitest';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { builtinUiCalculators, clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import {
  HEPATOLOGY_GI_NEW_TIER_A_CALCULATOR_REGISTRY_IDS,
  HEPATOLOGY_GI_TIER_A_CALCULATOR_REGISTRY_IDS,
  HEPATOLOGY_GI_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import {
  getCalculatorToolInventory,
  resolveToolInventoryRecord,
  TOOL_LAUNCH_TYPES,
} from './toolInventory';

const tierATools = [
  REGISTRY.childPugh,
  REGISTRY.meld,
  REGISTRY.meldNa,
  REGISTRY.maddreyDiscriminantFunction,
  REGISTRY.fib4,
  REGISTRY.apri,
  REGISTRY.ransonCriteria,
  REGISTRY.bisapScore,
  REGISTRY.glasgowBlatchfordScore,
  REGISTRY.rockallScore,
];

const tierBTools = [
  REGISTRY.romeIvIbs,
  REGISTRY.giBleedWorkflowAssistant,
  REGISTRY.liverDiseaseAssistant,
  REGISTRY.pancreatitisWorkflowAssistant,
];

const tierCTools = [
  REGISTRY.giSurveillanceDashboard,
  REGISTRY.hepaticTrendAnalytics,
  REGISTRY.endoscopyWorkflowAssistant,
  REGISTRY.cirrhosisMonitoringEngine,
  REGISTRY.giCommandCenter,
];

describe('Hepatology and Gastroenterology Tools Pack wiring', () => {
  it('registers Tier A calculators with dedicated routes and forms', () => {
    const calculatorSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const inventory = getCalculatorToolInventory();

    expect(HEPATOLOGY_GI_TIER_A_CALCULATOR_REGISTRY_IDS).toEqual(tierATools);
    for (const registryId of tierATools) {
      const record = resolveToolInventoryRecord(registryId);
      expect(record?.tier, registryId).toBe('A');
      expect(record?.launchType, registryId).toBe(TOOL_LAUNCH_TYPES.LOCAL_ONLY);
      expect(record?.route, registryId).toMatch(/^\/tools\/calculators\//);
      expect(calculatorSlugs.has(record.calculatorSlug), registryId).toBe(true);
      expect(
        inventory.some((tool) => tool.id === registryId),
        registryId,
      ).toBe(true);
    }
  });

  it('keeps new Tier A calculator launches on calculator routes', () => {
    for (const registryId of HEPATOLOGY_GI_NEW_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(registryId);
      const navigation = getRegistryToolNavigation(registryId);
      expect(launch.path).toBe(`/tools/calculators/${registryId}`);
      expect(navigation.mode).toBe('calculator-route');
      expect(navigation.pathname).toBe(CANONICAL_ROUTES.emergencyTools);
      expect(navigation.search).toContain('filter=calculator');
      expect(navigation.search).toContain(`q=${registryId}`);
    }
  });

  it('registers Tier B chat-assisted workflows with guarded chat seeds', () => {
    expect(HEPATOLOGY_GI_TIER_B_CHAT_REGISTRY_IDS).toEqual(tierBTools.slice(1));
    for (const registryId of tierBTools) {
      const record = resolveToolInventoryRecord(registryId);
      const launch = resolveCatalogLaunch(registryId);
      const navigation = getRegistryToolNavigation(registryId);
      expect(record?.tier, registryId).toBe('B');
      expect(record?.launchType, registryId).toBe(TOOL_LAUNCH_TYPES.CHAT_ASSISTED);
      expect(launch.chatSeed, registryId).toMatch(
        /decision support|does not diagnose|informational/i,
      );
      expect(launch.chatSeed, registryId).toMatch(
        /do not recommend|does not recommend|do not delay|does not diagnose/i,
      );
      expect(navigation.mode, registryId).toBe('chat-assisted');
      expect(navigation.pathname, registryId).toBe(CANONICAL_ROUTES.emergencyCopilot);
    }
  });

  it('registers Tier C hepatology/GI workflow pages without backend executors', () => {
    for (const registryId of tierCTools) {
      const record = resolveToolInventoryRecord(registryId);
      const navigation = getRegistryToolNavigation(registryId);
      expect(record?.tier, registryId).toBe('C');
      expect(record?.launchType, registryId).toBe(TOOL_LAUNCH_TYPES.CLINICAL_PAGE);
      expect(record?.component, registryId).toBe(
        'src/pages/tools/GastroenterologyAssistantPage.tsx',
      );
      expect(record?.orchestratorToolId, registryId).toBeNull();
      expect(clinicalIntentToolsById[registryId]?.chatSeed, registryId).toMatch(
        /do not recommend|does not recommend/i,
      );
      expect(navigation.mode, registryId).toBe('tool-page');
      expect(navigation.pathname, registryId).toBe(CANONICAL_ROUTES.emergencyTools);
      expect(navigation.search, registryId).toContain(registryId);
    }
  });
});
