import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import {
  ALL_REGISTRY_TOOL_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import { getE2eValidationMatrixDocument } from './e2eToolValidationMatrix';
import { getMedicalCatalogSummary } from './medicalToolsCatalogIndex';
import { getPlatformInventory } from './platformInventory';

describe('platformInventory', () => {
  it('aligns counts with authoritative registries', () => {
    const inv = getPlatformInventory();
    const c = inv.counts;

    expect(c.registryTools).toBe(ALL_REGISTRY_TOOL_IDS.length);
    expect(c.registryTools).toBe(toolRegistry.length);
    expect(c.nluClinicalProfiles).toBe(clinicalIntentTools.length);
    expect(c.nluClinicalProfiles).toBe(NLU_PROFILE_TOOL_IDS.length);
    expect(c.builtinCalculatorForms).toBe(builtinUiCalculators.length);
    expect(c.backendPostExecutors).toBe(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length);
    expect(c.backendPostExecutors).toBe(3);
    expect(c.tierACalculators).toBe(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.length);
    expect(c.tierBChatAssisted).toBe(CLINICAL_TIER_B_CHAT_REGISTRY_IDS.length);
    expect(c.e2eMatrixRows).toBe(getE2eValidationMatrixDocument().summary.totalRows);

    const catalog = getMedicalCatalogSummary();
    expect(c.catalogSearchableRows).toBe(catalog.total);
    expect(c.catalogSearchableRows).toBeGreaterThanOrEqual(40);
  });

  it('lists every registry id in a tier bucket', () => {
    const inv = getPlatformInventory();
    const listed = Object.values(inv.registryByTier).flatMap((rows) => rows.map((r) => r.id));
    expect(listed.sort()).toEqual([...ALL_REGISTRY_TOOL_IDS].sort());
  });
});
