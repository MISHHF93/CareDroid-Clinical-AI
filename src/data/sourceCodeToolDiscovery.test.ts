import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  getAllDiscoveredTools,
  getSourceCodeDiscoverySummary,
  aliasOnlyToolReferences,
  apiOnlyToolReferences,
  phantomToolReferences,
  SOURCE_SCAN_LOCATIONS,
  toolIdAliases,
  truePhantomToolReferences,
} from './sourceCodeToolDiscovery';
import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from './clinicalToolIdContract';
import { emergencyPatternGroups } from './emergencyPatternCatalog';
import { resolveCatalogLaunch, NLU_TO_REGISTRY_ID } from './clinicalCatalogWiring';
import { assertAppCalculatorRouteWiring } from './testHelpers/calculatorRouteAudit';

const appSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../app/router.tsx'),
  'utf8',
);

/** Keys in CostTrackingContext TOOL_COSTS that are phantom / non-registry tools */
const COST_TRACKING_EXTRA_TOOL_KEYS = [
  'vitals-monitor',
  'antibiotic-scripts',
  'abc-assessment',
  'bleeding-risk',
  'cancer-calculator',
  'tumor-staging',
  'chemo-calculator',
];

describe('sourceCodeToolDiscovery', () => {
  it('indexes NLU clinical tool profiles (PR3 adds GRACE ACS, NIHSS, C-Spine, Ottawa Ankle)', () => {
    expect(clinicalIntentTools.length).toBeGreaterThanOrEqual(28);
    expect(clinicalIntentTools).toHaveLength(getSourceCodeDiscoverySummary().nluPatternCount);
  });

  it('keeps source scan counts derived from current contracts', () => {
    const byLabel = Object.fromEntries(SOURCE_SCAN_LOCATIONS.map((loc) => [loc.label, loc.count]));

    expect(byLabel['NLU clinical tools']).toBe(clinicalIntentTools.length);
    expect(byLabel['Backend executors']).toBe(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length);
    expect(byLabel['Calculator UI slugs']).toBe(builtinUiCalculators.length);
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

  it('separates true phantoms from API-only and alias-only source-audit references', () => {
    expect(truePhantomToolReferences.map((p) => p.id)).toEqual(
      expect.arrayContaining(['abc-assessment', 'cancer-calculator']),
    );
    expect(apiOnlyToolReferences.map((p) => p.id)).toContain('vitals-monitor');
    expect(aliasOnlyToolReferences.map((p) => p.id)).toEqual(
      expect.arrayContaining(['bleeding-risk', 'medication-checker']),
    );
    expect(new Set(phantomToolReferences.map((p) => p.sourceScanKind))).toEqual(
      new Set(['true-phantom', 'api-only', 'alias']),
    );
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
    const emergencyRows = getAllDiscoveredTools().filter((r) => r.status === 'emergency-pattern');
    expect(emergencyRows.length).toBe(emergencyPatternGroups.length);
  });

  it('returns a non-trivial unified discovery count', () => {
    const summary = getSourceCodeDiscoverySummary();
    expect(summary.totalUniqueIds).toBeGreaterThan(40);
    expect(summary.externalCatalogInRepo).toBe(0);
  });

  it('wires NLU calculator ids to routes and chat seeds', () => {
    const apache = resolveCatalogLaunch('apache2-calculator');
    expect(apache.path).toBe('/tools/calculators/apache-ii');
    expect(apache.registryId).toBe('apache2-calculator');
    expect(apache.chatSeed).toMatch(/APACHE/i);

    expect(NLU_TO_REGISTRY_ID['drug-interaction-checker']).toBe('drug-check');
    expect(resolveCatalogLaunch('sofa').path).toBe('/tools/calculators/sofa');

    expect(NLU_TO_REGISTRY_ID.qsofa).toBe('qsofa');
    expect(resolveCatalogLaunch('qsofa').path).toBe('/tools/calculators/qsofa');
    expect(resolveCatalogLaunch('qsofa').registryId).toBe('qsofa');

    expect(NLU_TO_REGISTRY_ID['quick sofa']).toBe('qsofa');
    expect(NLU_TO_REGISTRY_ID['quick sepsis score']).toBe('qsofa');
    expect(NLU_TO_REGISTRY_ID['sepsis bedside score']).toBe('qsofa');
    expect(resolveCatalogLaunch('quick sofa').path).toBe('/tools/calculators/qsofa');
    expect(resolveCatalogLaunch('sepsis bedside score').registryId).toBe('qsofa');

    expect(NLU_TO_REGISTRY_ID.news2).toBe('news2');
    const news2Launch = resolveCatalogLaunch('news2');
    expect(news2Launch.path).toBe('/tools/calculators/news2');
    expect(news2Launch.registryId).toBe('news2');

    expect(NLU_TO_REGISTRY_ID['news 2']).toBe('news2');
    expect(NLU_TO_REGISTRY_ID['national early warning score']).toBe('news2');
    expect(NLU_TO_REGISTRY_ID['early warning score']).toBe('news2');
    expect(NLU_TO_REGISTRY_ID['deterioration score']).toBe('news2');
    expect(resolveCatalogLaunch('early warning score').path).toBe('/tools/calculators/news2');
    expect(resolveCatalogLaunch('deterioration-score').registryId).toBe('news2');

    expect(NLU_TO_REGISTRY_ID['child-pugh']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['ctp-score']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['child pugh']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['ctp score']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['cirrhosis score']).toBe('child-pugh');
    expect(NLU_TO_REGISTRY_ID['liver severity score']).toBe('child-pugh');
    const cpLaunch = resolveCatalogLaunch('child-pugh');
    expect(cpLaunch.path).toBe('/tools/calculators/child-pugh');
    expect(cpLaunch.registryId).toBe('child-pugh');
    expect(resolveCatalogLaunch('ctp score').path).toBe('/tools/calculators/child-pugh');
    expect(resolveCatalogLaunch('liver-severity-score').registryId).toBe('child-pugh');

    expect(NLU_TO_REGISTRY_ID['has-bled']).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID.hasbled).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID['has bled']).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID['bleeding risk']).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID['af bleeding risk']).toBe('has-bled');
    expect(NLU_TO_REGISTRY_ID['anticoagulation bleeding risk']).toBe('has-bled');
    const hbLaunch = resolveCatalogLaunch('has-bled');
    expect(hbLaunch.path).toBe('/tools/calculators/has-bled');
    expect(hbLaunch.registryId).toBe('has-bled');

    expect(NLU_TO_REGISTRY_ID['bleeding-risk']).toBe('has-bled');
    expect(resolveCatalogLaunch('bleeding-risk').path).toBe('/tools/calculators/has-bled');
    expect(resolveCatalogLaunch('bleeding-risk').registryId).toBe('has-bled');
    expect(resolveCatalogLaunch('af bleeding risk').path).toBe('/tools/calculators/has-bled');
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
    assertAppCalculatorRouteWiring(appSrc, ['has-bled']);
  });

  it('registers Child-Pugh sidebar entry and App route', () => {
    expect(toolRegistryById['child-pugh']?.path).toBe('/tools/calculators/child-pugh');
    expect(toolRegistryById['child-pugh']?.initialCalc).toBe('child-pugh');
    assertAppCalculatorRouteWiring(appSrc, ['child-pugh']);
  });

  it('registers NEWS2 sidebar entry and App route', () => {
    expect(toolRegistryById.news2?.path).toBe('/tools/calculators/news2');
    expect(toolRegistryById.news2?.initialCalc).toBe('news2');
    assertAppCalculatorRouteWiring(appSrc, ['news2']);
  });

  it('registers qSOFA sidebar entry and App route', () => {
    expect(toolRegistryById.qsofa?.path).toBe('/tools/calculators/qsofa');
    expect(toolRegistryById.qsofa?.initialCalc).toBe('qsofa');
    assertAppCalculatorRouteWiring(appSrc, ['qsofa']);
  });

  it('resolves PERC as hub-only chat-assisted (no dedicated App route)', () => {
    const launch = resolveCatalogLaunch('perc');
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe('perc');
    expect(launch.chatSeed).toMatch(/PERC rule/i);
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../app/router.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).not.toContain("path: '/tools/calculators/perc'");
  });

  it('resolves Wells PE as hub-only chat-assisted (no dedicated App route)', () => {
    const launch = resolveCatalogLaunch('wells-pe');
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe('wells-pe');
    expect(launch.chatSeed).toMatch(/pulmonary embolism/i);
    expect(toolRegistryById['wells-pe']?.path).toBe('/tools/calculators');
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../app/router.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).not.toContain("path: '/tools/calculators/wells-pe'");
  });

  it.each([
    ['grace-acs', /GRACE ACS/i, 'grace'],
    ['nihss', /NIH Stroke Scale/i, 'stroke scale'],
    ['canadian-c-spine', /Canadian C-Spine Rule/i, 'cervical-spine-rule'],
    ['ottawa-ankle', /Ottawa Ankle Rule/i, 'ankle-injury-imaging'],
  ])('resolves PR3 %s as hub-only with guided chatSeed for aliases', (id, seedPattern, alias) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(seedPattern);
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.chatSeed).toBe(launch.chatSeed);
    const appPath = join(dirname(fileURLToPath(import.meta.url)), '../app/router.tsx');
    const appSrc = readFileSync(appPath, 'utf8');
    expect(appSrc).not.toContain(`path: '/tools/calculators/${id}'`);
  });

  it('registers TIMI UA/NSTEMI sidebar entry and App route', () => {
    expect(toolRegistryById['timi-ua-nstemi']?.path).toBe('/tools/calculators/timi-ua-nstemi');
    assertAppCalculatorRouteWiring(appSrc, ['timi-ua-nstemi']);
  });

  it('registers MELD and MELD-Na sidebar entries and App routes', () => {
    expect(toolRegistryById.meld?.path).toBe('/tools/calculators/meld');
    expect(toolRegistryById['meld-na']?.path).toBe('/tools/calculators/meld-na');
    assertAppCalculatorRouteWiring(appSrc, ['meld', 'meld-na']);
  });
});
