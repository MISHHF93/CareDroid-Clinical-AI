import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { builtinUiCalculators, clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  PEDIATRICS_OBGYN_TIER_A_CALCULATOR_REGISTRY_IDS,
  PEDIATRICS_OBGYN_TIER_B_CHAT_REGISTRY_IDS,
  PEDIATRICS_OBGYN_TIER_C_WORKFLOW_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory, getToolInventoryById } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const ALL_PACK_IDS = [
  ...PEDIATRICS_OBGYN_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PEDIATRICS_OBGYN_TIER_B_CHAT_REGISTRY_IDS,
  ...PEDIATRICS_OBGYN_TIER_C_WORKFLOW_REGISTRY_IDS,
];

describe('Pediatrics and OB-GYN Clinical Tools Pack', () => {
  it('registers all pack tools in canonical inventory with no duplicate ids', () => {
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
    for (const id of PEDIATRICS_OBGYN_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      const calculatorSlug = inventoryById[id]?.calculatorSlug;
      expect(launch.path).toMatch(/^\/tools\/calculators\//);
      expect(launch.orchestratorTool).toBeNull();
      expect(calculatorSlug).toBeTruthy();
      expect(builtinSlugs.has(calculatorSlug)).toBe(true);
      expect(smokeSlugs.has(calculatorSlug)).toBe(true);
      expect(CALCULATOR_ROUTE_DEFS.some((route) => route.calculatorSlug === calculatorSlug)).toBe(true);
    }
  });

  it('wires Tier B assistants through guarded pediatrics/OB launch flows', () => {
    for (const id of PEDIATRICS_OBGYN_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/pediatrics-obgyn\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/decision support/i);
      expect(launch.chatSeed).toMatch(/do not (diagnose|recommend|delay)|must not delay/i);
      expect(launch.chatSeed).not.toMatch(/\b\d+(\.\d+)?\s*mg\/kg|should recommend antibiotics|should recommend delivery/i);
      expect(launch.orchestratorTool).toBeNull();
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C dashboards as monitoring surfaces without autonomous care', () => {
    for (const id of PEDIATRICS_OBGYN_TIER_C_WORKFLOW_REGISTRY_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/pediatrics-obgyn\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/dashboard|monitoring|visibility|trend|review queue/i);
      expect(launch.chatSeed).toMatch(/decision support/i);
      expect(launch.chatSeed).toMatch(/no autonomous|no diagnosis|no .*recommendation/i);
    }
  });

  it('keeps pediatric dose support placeholder-only', () => {
    const launch = resolveCatalogLaunch(REGISTRY.pediatricDoseSafetyChecker);
    const copy = `${launch.chatSeed || ''} ${clinicalIntentToolsById[REGISTRY.pediatricDoseSafetyChecker]?.description || ''}`.toLowerCase();
    expect(copy).toMatch(/placeholder only|placeholder-only/i);
    expect(copy).toMatch(/do not provide|does not calculate|no patient-specific dose/i);
    expect(copy).not.toMatch(/calculate \d+|recommend \d+|\b\d+(\.\d+)?\s*mg\/kg/i);
  });
});
