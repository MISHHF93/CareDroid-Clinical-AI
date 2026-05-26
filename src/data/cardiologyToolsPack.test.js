import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { clinicalIntentToolsById, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  CARDIOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const CARDIOLOGY_TIER_C_IDS = [
  REGISTRY.cardiacTelemetryAnalyzer,
  REGISTRY.ecgTrendEngine,
  REGISTRY.arrhythmiaRiskClassifier,
  REGISTRY.remoteCardiologyMonitoringDashboard,
  REGISTRY.cardiologyCommandCenter,
];

const ALL_PACK_IDS = [
  REGISTRY.calcChads2vasc,
  REGISTRY.hasBled,
  REGISTRY.ascvdRisk,
  REGISTRY.timiUaNstemi,
  REGISTRY.framinghamRisk,
  ...CARDIOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS,
  ...CARDIOLOGY_TIER_C_IDS,
];

describe('Cardiology Clinical Tools Pack', () => {
  it('registers every pack tool in canonical inventory with no duplicate ids', () => {
    const inventory = getCanonicalToolInventory();
    const ids = inventory.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALL_PACK_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('adds missing Tier A cardiology calculators to builtin forms and routes', () => {
    const builtinSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));
    for (const id of CARDIOLOGY_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toMatch(/^\/tools\/calculators\//);
      expect(builtinSlugs.has(id)).toBe(true);
      expect(smokeSlugs.has(id)).toBe(true);
      expect(CALCULATOR_ROUTE_DEFS.some((route) => route.calculatorSlug === id)).toBe(true);
    }
  });

  it('wires Tier B cardiology assistants through resolveCatalogLaunch with safe chat seeds', () => {
    for (const id of CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/cardiology\//);
      expect(launch.chatSeed).toMatch(/clinical decision support only/i);
      expect(launch.chatSeed).toMatch(/do not diagnose|do not recommend|do not delay/i);
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C cardiology workflows as unique canonical tool routes', () => {
    for (const id of CARDIOLOGY_TIER_C_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/cardiology\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/clinical decision support only/i);
    }
  });

  it('does not create duplicate calculator route definitions', () => {
    const routePaths = CALCULATOR_ROUTE_DEFS.map((route) => route.path);
    expect(new Set(routePaths).size).toBe(routePaths.length);
  });
});
