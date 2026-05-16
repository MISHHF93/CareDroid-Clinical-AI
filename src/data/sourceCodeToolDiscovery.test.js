import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
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
  it('indexes 19 NLU clinical tool profiles', () => {
    expect(clinicalIntentTools).toHaveLength(19);
    expect(getSourceCodeDiscoverySummary().nluPatternCount).toBe(19);
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

  it('documents drug-interaction-checker, sofa_calculator, and bleeding-risk aliases', () => {
    const aliasIds = toolIdAliases.map((a) => a.id);
    expect(aliasIds).toContain('drug-interaction-checker');
    expect(aliasIds).toContain('sofa_calculator');
    expect(aliasIds).toContain('bleeding-risk');
    const bleeding = toolIdAliases.find((a) => a.id === 'bleeding-risk');
    expect(bleeding?.mapsTo).toBe('has-bled');
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

    expect(NLU_TO_REGISTRY_ID.qsofa).toBe('qsofa');
    expect(resolveCatalogLaunch('qsofa').path).toBe('/tools/calculators/qsofa');
    expect(resolveCatalogLaunch('qsofa').registryId).toBe('qsofa');

    expect(NLU_TO_REGISTRY_ID.news2).toBe('news2');
    const news2Launch = resolveCatalogLaunch('news2');
    expect(news2Launch.path).toBe('/tools/calculators/news2');
    expect(news2Launch.registryId).toBe('news2');

    expect(NLU_TO_REGISTRY_ID['child-pugh']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['ctp-score']).toBe('child-pugh');
    const cpLaunch = resolveCatalogLaunch('child-pugh');
    expect(cpLaunch.path).toBe('/tools/calculators/child-pugh');
    expect(cpLaunch.registryId).toBe('child-pugh');

    expect(NLU_TO_REGISTRY_ID['has-bled']).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID.hasbled).toBe('has-bled');
    const hbLaunch = resolveCatalogLaunch('has-bled');
    expect(hbLaunch.path).toBe('/tools/calculators/has-bled');
    expect(hbLaunch.registryId).toBe('has-bled');

    expect(NLU_TO_REGISTRY_ID['bleeding-risk']).toBe('has-bled');
    expect(resolveCatalogLaunch('bleeding-risk').path).toBe('/tools/calculators/has-bled');
    expect(resolveCatalogLaunch('bleeding-risk').registryId).toBe('has-bled');
  });

  it('exposes HAS-BLED in discovery with calculator path', () => {
    const rows = getAllDiscoveredTools().filter((r) => r.id === 'has-bled');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.path?.includes('/tools/calculators/has-bled'))).toBe(true);
  });

  it('exposes Child-Pugh in discovery with calculator path', () => {
    const rows = getAllDiscoveredTools().filter((r) => r.id === 'child-pugh');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.path?.includes('/tools/calculators/child-pugh'))).toBe(true);
  });

  it('exposes NEWS2 in discovery with calculator path', () => {
    const rows = getAllDiscoveredTools().filter((r) => r.id === 'news2');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.path?.includes('/tools/calculators/news2'))).toBe(true);
  });

  it('exposes qSOFA in discovery with calculator path (searchable id)', () => {
    const rows = getAllDiscoveredTools().filter((r) => r.id === 'qsofa');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.path?.includes('/tools/calculators/qsofa'))).toBe(true);
  });

  it('registers HAS-BLED sidebar entry and App route', () => {
    expect(toolRegistryById['has-bled']?.path).toBe('/tools/calculators/has-bled');
    expect(toolRegistryById['has-bled']?.initialCalc).toBe('has-bled');
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../App.jsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).toContain("path: '/tools/calculators/has-bled'");
    expect(appSrc).toContain('initialCalculatorId="has-bled"');
  });

  it('registers Child-Pugh sidebar entry and App route', () => {
    expect(toolRegistryById['child-pugh']?.path).toBe('/tools/calculators/child-pugh');
    expect(toolRegistryById['child-pugh']?.initialCalc).toBe('child-pugh');
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../App.jsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).toContain("path: '/tools/calculators/child-pugh'");
    expect(appSrc).toContain('initialCalculatorId="child-pugh"');
  });

  it('registers NEWS2 sidebar entry and App route', () => {
    expect(toolRegistryById.news2?.path).toBe('/tools/calculators/news2');
    expect(toolRegistryById.news2?.initialCalc).toBe('news2');
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../App.jsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).toContain("path: '/tools/calculators/news2'");
    expect(appSrc).toContain('initialCalculatorId="news2"');
  });

  it('registers qSOFA sidebar entry and App route', () => {
    expect(toolRegistryById.qsofa?.path).toBe('/tools/calculators/qsofa');
    expect(toolRegistryById.qsofa?.initialCalc).toBe('qsofa');
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../App.jsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).toContain("path: '/tools/calculators/qsofa'");
    expect(appSrc).toContain('initialCalculatorId="qsofa"');
  });
});
