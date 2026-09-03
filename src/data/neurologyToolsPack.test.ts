import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { builtinUiCalculators, clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  NEUROLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  NEUROLOGY_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory, getToolInventoryById } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const TIER_C_IDS = [
  REGISTRY.neuroTelemetryDashboard,
  REGISTRY.strokeCommandCenter,
  REGISTRY.neuroMonitoringEngine,
  REGISTRY.eegTrendDashboard,
  REGISTRY.neurologyTimelineAi,
];

const ALL_PACK_IDS = [
  ...NEUROLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...NEUROLOGY_TIER_B_CHAT_REGISTRY_IDS,
  ...TIER_C_IDS,
];

describe('Neurology Clinical Tools Pack', () => {
  it('registers pack tools in canonical inventory with no duplicate ids', () => {
    const inventory = getCanonicalToolInventory();
    const ids = inventory.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALL_PACK_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('wires Tier A calculators to local builtin forms and canonical routes', () => {
    const inventoryById = getToolInventoryById();
    const builtinSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));
    for (const id of NEUROLOGY_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      const calculatorSlug = inventoryById[id]?.calculatorSlug;
      expect(launch.path).toMatch(/^\/tools\/calculators\//);
      const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] || null;
      if (expectedOrchestratorTool) {
        expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
      } else {
        expect(launch.orchestratorTool).toBeNull();
      }
      expect(calculatorSlug).toBeTruthy();
      expect(builtinSlugs.has(calculatorSlug)).toBe(true);
      expect(smokeSlugs.has(calculatorSlug)).toBe(true);
      expect(CALCULATOR_ROUTE_DEFS.some((route) => route.calculatorSlug === calculatorSlug)).toBe(
        true,
      );
    }
  });

  it('wires Tier B assistants through guarded neurology launch flows', () => {
    for (const id of NEUROLOGY_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/neurology\//);
      expect(launch.chatSeed).toMatch(/clinical decision support/i);
      expect(launch.chatSeed).toMatch(
        /do not (diagnose|recommend|determine|delay)|must not delay/i,
      );
      expect(launch.chatSeed).toMatch(/stroke|seizure|urgent|emergency/i);
      expect(launch.orchestratorTool).toBeNull();
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C dashboards as monitoring routes without autonomous care', () => {
    for (const id of TIER_C_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/neurology\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/dashboard|monitoring|timeline|visibility|operations/i);
      expect(launch.chatSeed).toMatch(/clinical decision support/i);
      expect(launch.chatSeed).not.toMatch(
        /will autonomously escalate|should determine thrombolysis|should recommend antiseizure/i,
      );
    }
  });

  it('keeps stroke and seizure workflows from delaying urgent care', () => {
    for (const id of ALL_PACK_IDS) {
      const launch = resolveCatalogLaunch(id);
      const copy =
        `${launch.chatSeed || ''} ${clinicalIntentToolsById[id]?.description || ''}`.toLowerCase();
      expect(copy).toMatch(/decision support|does not|do not|no autonomous/i);
      expect(copy).toMatch(/do not delay|urgent|emergency|pathway|bedside assessment/i);
      expect(copy).not.toMatch(
        /should recommend thrombolysis|should recommend thrombectomy|should recommend antiseizure medication dosing/i,
      );
    }
  });
});
