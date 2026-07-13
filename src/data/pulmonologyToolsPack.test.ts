import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { clinicalIntentToolsById, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  PULMONOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  PULMONOLOGY_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const TIER_C_IDS = [
  REGISTRY.ventilatorMonitoringDashboard,
  REGISTRY.respiratoryTelemetryDashboard,
  REGISTRY.sleepApneaAnalytics,
  REGISTRY.pulmonaryTrendEngine,
  REGISTRY.respiratoryCommandCenter,
];

const ALL_PACK_IDS = [
  ...PULMONOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PULMONOLOGY_TIER_B_CHAT_REGISTRY_IDS,
  ...TIER_C_IDS,
];

describe('Pulmonology Clinical Tools Pack', () => {
  it('registers pack tools in canonical inventory with no duplicate ids', () => {
    const inventory = getCanonicalToolInventory();
    const ids = inventory.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALL_PACK_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('wires Tier A pulmonology calculators to builtin forms and canonical routes', () => {
    const builtinSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));
    for (const id of PULMONOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toMatch(/^\/tools\/calculators\//);
      const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] || null;
      if (expectedOrchestratorTool) {
        expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
      } else {
        expect(launch.orchestratorTool).toBeNull();
      }
      expect(builtinSlugs.has(id)).toBe(true);
      expect(smokeSlugs.has(id)).toBe(true);
      expect(CALCULATOR_ROUTE_DEFS.some((route) => route.calculatorSlug === id)).toBe(true);
    }
  });

  it('wires Tier B pulmonology assistants through chat-assisted launch flows', () => {
    for (const id of PULMONOLOGY_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/pulmonology\//);
      expect(launch.chatSeed).toMatch(/clinical decision support only/i);
      expect(launch.chatSeed).toMatch(/do not diagnose|do not recommend|do not delay/i);
      expect(launch.orchestratorTool).toBeNull();
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C pulmonology workflows as canonical tool routes', () => {
    for (const id of TIER_C_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/pulmonology\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/clinical decision support only/i);
    }
  });
});
