import { describe, it, expect } from 'vitest';
import toolRegistry from './toolRegistry';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  getAllDiscoveredTools,
  getSourceCodeDiscoverySummary,
  phantomToolReferences,
  toolIdAliases,
} from './sourceCodeToolDiscovery';
import { emergencyPatternGroups } from './emergencyPatternCatalog';
import { resolveCatalogLaunch, NLU_TO_REGISTRY_ID } from './clinicalCatalogWiring';

/** Keys in CostTrackingContext TOOL_COSTS that are phantom / non-registry tools */
const COST_TRACKING_EXTRA_TOOL_KEYS = [
  'vitals-monitor',
  'antibiotic-scripts',
  'trauma-score',
  'abc-assessment',
  'bleeding-risk',
  'cancer-calculator',
  'tumor-staging',
  'chemo-calculator',
];

describe('sourceCodeToolDiscovery', () => {
  it('indexes 15 NLU clinical tool profiles', () => {
    expect(clinicalIntentTools).toHaveLength(15);
    expect(getSourceCodeDiscoverySummary().nluPatternCount).toBe(15);
  });

  it('includes every sidebar registry id in the discovered list', () => {
    const discoveredIds = new Set(getAllDiscoveredTools().map((r) => r.id));
    for (const tool of toolRegistry) {
      expect(discoveredIds.has(tool.id)).toBe(true);
    }
  });

  it('lists every phantom reference used in cost tracking extras', () => {
    const phantomIds = new Set(phantomToolReferences.map((p) => p.id));
    for (const key of COST_TRACKING_EXTRA_TOOL_KEYS) {
      expect(phantomIds.has(key)).toBe(true);
    }
  });

  it('documents drug-interaction-checker and sofa_calculator aliases', () => {
    const aliasIds = toolIdAliases.map((a) => a.id);
    expect(aliasIds).toContain('drug-interaction-checker');
    expect(aliasIds).toContain('sofa_calculator');
  });

  it('mirrors emergency pattern count from catalog file', () => {
    expect(emergencyPatternGroups.length).toBeGreaterThanOrEqual(15);
    const emergencyRows = getAllDiscoveredTools().filter(
      (r) => r.status === 'emergency-pattern'
    );
    expect(emergencyRows.length).toBe(emergencyPatternGroups.length);
  });

  it('returns a non-trivial unified discovery count', () => {
    const summary = getSourceCodeDiscoverySummary();
    expect(summary.totalUniqueIds).toBeGreaterThan(40);
    expect(summary.externalCatalogInRepo).toBe(0);
  });

  it('wires NLU calculator ids to routes and chat seeds', () => {
    const apache = resolveCatalogLaunch('apache2-calculator');
    expect(apache.path).toBe('/tools/calculators');
    expect(apache.registryId).toBe('calculators');
    expect(apache.chatSeed).toMatch(/APACHE/i);

    expect(NLU_TO_REGISTRY_ID['drug-interaction-checker']).toBe('drug-interactions');
    expect(resolveCatalogLaunch('sofa').path).toBe('/tools/calculator/sofa');
  });
});
