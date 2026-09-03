import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { clinicalIntentToolsById, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  ENDOCRINE_METABOLIC_TIER_A_CALCULATOR_REGISTRY_IDS,
  ENDOCRINE_METABOLIC_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory, getToolInventoryById } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const TIER_C_IDS = [
  REGISTRY.glucoseTelemetryDashboard,
  REGISTRY.insulinTrendEngine,
  REGISTRY.endocrineMonitoringSystem,
  REGISTRY.metabolicAnalytics,
  REGISTRY.continuousGlucoseCommandCenter,
];

const ALL_PACK_IDS = [
  ...ENDOCRINE_METABOLIC_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...ENDOCRINE_METABOLIC_TIER_B_CHAT_REGISTRY_IDS,
  ...TIER_C_IDS,
];

describe('Endocrine and Metabolic Tools Pack', () => {
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
    for (const id of ENDOCRINE_METABOLIC_TIER_A_CALCULATOR_REGISTRY_IDS) {
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

  it('wires Tier B assistants through guarded endocrine launch flows', () => {
    for (const id of ENDOCRINE_METABOLIC_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/endocrine\//);
      expect(launch.chatSeed).toMatch(/clinical decision support/i);
      expect(launch.chatSeed).toMatch(/do not (diagnose|recommend|calculate|delay)/i);
      expect(launch.chatSeed).toMatch(/insulin|dosing|medication/i);
      expect(launch.orchestratorTool).toBeNull();
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C dashboards as backend telemetry/monitoring routes without dosing automation', () => {
    for (const id of TIER_C_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/endocrine\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/backend|telemetry|monitoring|analytics/i);
      expect(launch.chatSeed).toMatch(/clinical decision support/i);
      expect(launch.chatSeed).not.toMatch(
        /recommend insulin dose|calculate insulin dose|autonomous pump/i,
      );
    }
  });

  it('keeps the pack out of insulin and medication dosing automation', () => {
    for (const id of ALL_PACK_IDS) {
      const launch = resolveCatalogLaunch(id);
      const copy =
        `${launch.chatSeed || ''} ${clinicalIntentToolsById[id]?.description || ''}`.toLowerCase();
      expect(copy).not.toMatch(
        /automated insulin dosing|calculate insulin dose|recommend insulin dose|autonomous pump/i,
      );
      expect(copy).toMatch(
        /decision support|does not recommend|do not recommend|no .*dosing|not .*dosing/i,
      );
    }
  });
});
