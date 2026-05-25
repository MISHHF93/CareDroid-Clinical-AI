import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { builtinUiCalculators, clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  PSYCHIATRY_SCREENING_TIER_A_CALCULATOR_REGISTRY_IDS,
  PSYCHIATRY_SCREENING_TIER_B_CHAT_REGISTRY_IDS,
  PSYCHIATRY_SCREENING_TIER_C_WORKFLOW_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCanonicalToolInventory, getToolInventoryById } from './toolInventory';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

const ALL_PACK_IDS = [
  ...PSYCHIATRY_SCREENING_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PSYCHIATRY_SCREENING_TIER_B_CHAT_REGISTRY_IDS,
  ...PSYCHIATRY_SCREENING_TIER_C_WORKFLOW_REGISTRY_IDS,
];

describe('Psychiatry and Screening Tools Pack', () => {
  it('registers all pack tools in canonical inventory with no duplicate ids', () => {
    const inventory = getCanonicalToolInventory();
    const ids = inventory.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALL_PACK_IDS) expect(ids).toContain(id);
  });

  it('wires Tier A screens to local forms and canonical calculator routes', () => {
    const inventoryById = getToolInventoryById();
    const builtinSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));

    for (const id of PSYCHIATRY_SCREENING_TIER_A_CALCULATOR_REGISTRY_IDS) {
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

  it('preserves crisis-sensitive copy for PHQ-9 item 9 and Columbia workflow', () => {
    const phq9Seed = resolveCatalogLaunch(REGISTRY.phq9).chatSeed;
    const columbiaSeed = resolveCatalogLaunch(REGISTRY.columbiaSuicideSeverityWorkflow).chatSeed;

    expect(phq9Seed).toMatch(/question 9/i);
    expect(phq9Seed).toMatch(/self-harm|suicidal/i);
    expect(phq9Seed).toMatch(/988|crisis/i);
    expect(columbiaSeed).toMatch(/immediate safety assessment/i);
    expect(columbiaSeed).toMatch(/does not clear risk|not official C-SSRS scoring/i);
  });

  it('wires Tier B assistants through guarded psychiatry launch flows', () => {
    for (const id of PSYCHIATRY_SCREENING_TIER_B_CHAT_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/psychiatry\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/decision support|screening/i);
      expect(launch.chatSeed).toMatch(/do not diagnose/i);
      expect(launch.chatSeed).toMatch(/human review|direct clinician|crisis/i);
      expect(launch.chatSeed).not.toMatch(/\b\d+(\.\d+)?\s*mg\/kg|should recommend medications/i);
      expect(launch.orchestratorTool).toBeNull();
      expect(clinicalIntentToolsById[id]).toBeTruthy();
    }
  });

  it('wires Tier C dashboards as monitoring surfaces without autonomous care', () => {
    for (const id of PSYCHIATRY_SCREENING_TIER_C_WORKFLOW_REGISTRY_IDS) {
      expect(CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS).toContain(id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.registryId).toBe(id);
      expect(launch.path).toMatch(/^\/tools\/psychiatry\//);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(launch.path);
      expect(launch.chatSeed).toMatch(/dashboard|monitoring|trend|audit|population|visibility/i);
      expect(launch.chatSeed).toMatch(/decision support/i);
      expect(launch.chatSeed).toMatch(/no diagnosis|no autonomous|human review/i);
    }
  });
});
