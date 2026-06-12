/**
 * PR4A comprehensive Vitest coverage — scoring, interpretation, wiring, launch, and edge cases.
 * Complements pr4aRegistrationAudit.test.js, pr4aCoverage.test.js, pr4aTenAreaCoverage.test.js,
 * and per-tool *Wiring tests. Formula detail: src/utils/*Calculator.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  categorizeAscvdTenYearRisk,
  computeAscvdPceResult,
  computeAscvdPceTenYearRisk,
  interpretAscvdTenYearRisk,
} from '../utils/ascvdPceCalculator';
import {
  classifyAlbuminuria,
  classifyGfrCategory,
  combineCkdPrognosticRisk,
  computeCkdEpi2021Egfr,
  computeCkdStagingResult,
  interpretCkdStaging,
} from '../utils/ckdStagingCalculator';
import {
  calculateStopBangScore,
  categorizeStopBangOsaRisk,
  computeStopBangResult,
  interpretStopBangScore,
} from '../utils/stopBangCalculator';
import {
  categorizeAuditCScreening,
  computeAuditCResult,
  interpretAuditCScore,
} from '../utils/auditCCalculator';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR4A_CALCULATOR_REGISTRY_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
  isKnownToolAreaPath,
} from '../routes/clinicalToolRoutes';
import { TOOL_PATTERNS_PATH } from './clinicalToolAliasSync';
import {
  aliasToSlug,
  extractToolPatternKeywords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';
import {
  PR4A_ALL_ALIAS_PAIRS,
  PR4A_CATALOG_SEARCH_QUERIES,
  PR4A_DISCOVERY_ALIAS_PAIRS,
  PR4A_EMPTY_LAUNCH,
  PR4A_HUB_PATH,
  PR4A_REQUIRED_NLU_ALIAS_PAIRS,
  PR4A_ROUTE_BY_REGISTRY_ID,
  PR4A_CALC_QUERY_BY_REGISTRY_ID,
  PR4A_TOOL_IDS,
  catalogRowsMatchingQuery,
} from './pr4aTestConstants';
import {
  ASCVD_TABLE_A_DEMO,
  ASCVD_TABLE_A_EXPECTED,
  AUDIT_C_NEGATIVE_INPUT,
  AUDIT_C_POSITIVE_MEN_INPUT,
  CKD_EGFR_FIXTURES,
  CKD_REFERENCE_INPUT,
  PR4A_LAUNCH_ALIASES_BY_REGISTRY_ID,
  STOP_BANG_ALL_FALSE,
  STOP_BANG_ALL_TRUE,
  STOP_BANG_BAND_FIXTURES,
} from './testHelpers/pr4aTestFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

/** Ten deterministic PR4A audit areas (no snapshots). */
export const PR4A_COVERAGE_AREA_LABELS = Object.freeze([
  'ASCVD calculations',
  'CKD staging calculations',
  'STOP-Bang scoring',
  'AUDIT-C scoring',
  'registry mappings',
  'discovery inclusion',
  'catalog inclusion',
  'route resolution',
  'NLU aliases',
  'edge cases',
]);

describe('PR4A comprehensive — coverage matrix', () => {
  it('targets the four required Tier-A registry ids', () => {
    expect([...PR4A_TOOL_IDS]).toEqual([
      'ascvd-risk',
      'ckd-staging',
      'stop-bang',
      'audit-c',
    ]);
    expect([...PR4A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_TOOL_IDS]);
    expect([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]).toEqual([...PR4A_TOOL_IDS]);
  });

  it('documents ten deterministic audit areas', () => {
    expect(PR4A_COVERAGE_AREA_LABELS).toHaveLength(10);
    expect(PR4A_COVERAGE_AREA_LABELS[0]).toBe('ASCVD calculations');
    expect(PR4A_COVERAGE_AREA_LABELS[9]).toBe('edge cases');
  });
});

describe('PR4A comprehensive — 1. ASCVD calculations', () => {
  it.each(ASCVD_TABLE_A_EXPECTED)(
    'Table A demo: $sex × $race → $pct% 10-year risk',
    ({ sex, race, pct }) => {
      const r = computeAscvdPceTenYearRisk({ ...ASCVD_TABLE_A_DEMO, sex, race });
      expect(r.tenYearRiskPct).toBeCloseTo(pct, 0);
    }
  );

  it('maps risk category boundaries', () => {
    expect(categorizeAscvdTenYearRisk(4.9)).toBe('low');
    expect(categorizeAscvdTenYearRisk(5)).toBe('borderline');
    expect(categorizeAscvdTenYearRisk(7.5)).toBe('intermediate');
    expect(categorizeAscvdTenYearRisk(20)).toBe('high');
  });

  it('increases risk with smoking and diabetes', () => {
    const base = computeAscvdPceTenYearRisk({
      ...ASCVD_TABLE_A_DEMO,
      sex: 'male',
      race: 'white',
    });
    const smoker = computeAscvdPceTenYearRisk({
      ...ASCVD_TABLE_A_DEMO,
      sex: 'male',
      race: 'white',
      smoker: true,
    });
    expect(smoker.tenYearRiskPct).toBeGreaterThan(base.tenYearRiskPct);
  });

  it('computeAscvdPceResult includes decision-support disclaimer', () => {
    const out = computeAscvdPceResult({
      ...ASCVD_TABLE_A_DEMO,
      sex: 'male',
      race: 'white',
    });
    expect(out.ok).toBe(true);
    expect(out.riskCategory).toBe(categorizeAscvdTenYearRisk(out.tenYearRiskPct));
    expect(out.clinicianPatientDisclaimer).toMatch(/decision-support/i);
    expect(out.pathwayDisclaimer).toMatch(/does not recommend specific medications/i);
  });

  it('rejects age outside PCE range', () => {
    const out = computeAscvdPceResult({ ...ASCVD_TABLE_A_DEMO, sex: 'male', race: 'white', ageYears: 25 });
    expect(out.ok).toBe(false);
    expect(out.errors.join(' ')).toMatch(/40.*79/i);
  });
});

describe('PR4A comprehensive — 2. CKD staging calculations', () => {
  it.each(CKD_EGFR_FIXTURES)(
    'CKD-EPI 2021 eGFR for age $ageYears $sex Cr $creatinine',
    ({ ageYears, sex, creatinine, expectedEgfr }) => {
      expect(computeCkdEpi2021Egfr(ageYears, sex, creatinine)).toBe(expectedEgfr);
    }
  );

  it('classifies GFR and albuminuria at KDIGO boundaries', () => {
    expect(classifyGfrCategory(90).category).toBe('G1');
    expect(classifyGfrCategory(59).category).toBe('G3a');
    expect(classifyAlbuminuria(30).category).toBe('A2');
    expect(classifyAlbuminuria(301).category).toBe('A3');
  });

  it('combines prognostic risk on heat-map cells', () => {
    expect(combineCkdPrognosticRisk('G1', 'A1')).toBe('low');
    expect(combineCkdPrognosticRisk('G3b', 'A3')).toBe('very_high');
  });

  it('computeCkdStagingResult returns staging without therapy directives', () => {
    const out = computeCkdStagingResult(CKD_REFERENCE_INPUT);
    expect(out.ok).toBe(true);
    expect(out.combinedStageLabel).toMatch(/G×A category/i);
    expect(out.stagingDiscussion).toMatch(/≥3 months/i);
    expect(out.pathwayDisclaimer).toMatch(/does not recommend specific therapies/i);
  });

  it('interpretCkdStaging uses combined G×A stage label', () => {
    const gfr = classifyGfrCategory(outEgfrFromFixture());
    const alb = classifyAlbuminuria(45);
    const risk = combineCkdPrognosticRisk(gfr.category, alb.category);
    const i = interpretCkdStaging(outEgfrFromFixture(), gfr, alb, risk);
    expect(i.combinedStage).toMatch(/^G\d/);
    expect(i.interpretation).not.toMatch(/\bdiagnosed with ckd\b/i);
  });
});

function outEgfrFromFixture() {
  return computeCkdStagingResult(CKD_REFERENCE_INPUT).egfrMlMin;
}

describe('PR4A comprehensive — 3. STOP-Bang scoring', () => {
  it('scores 0 with all negative and 8 with all positive', () => {
    expect(calculateStopBangScore(STOP_BANG_ALL_FALSE)).toBe(0);
    expect(calculateStopBangScore(STOP_BANG_ALL_TRUE)).toBe(8);
  });

  it.each(STOP_BANG_BAND_FIXTURES)(
    'score $score → $osaRiskCategory ($severity)',
    ({ score, osaRiskCategory, severity }) => {
      expect(categorizeStopBangOsaRisk(score)).toBe(osaRiskCategory);
      const i = interpretStopBangScore(score);
      expect(i?.osaRiskCategory).toBe(osaRiskCategory);
      expect(i?.severity).toBe(severity);
    }
  );

  it('computeStopBangResult includes screening-only disclaimer', () => {
    const out = computeStopBangResult(STOP_BANG_ALL_TRUE);
    expect(out.ok).toBe(true);
    expect(out.screeningDisclaimer).toBe('Screening tool only.');
    expect(out.pathwayDisclaimer).toMatch(/does not recommend CPAP/i);
    expect(out.osaRiskDiscussion).not.toMatch(/\bstart cpap\b/i);
  });
});

describe('PR4A comprehensive — 4. AUDIT-C scoring', () => {
  it('negative screen at low consumption pattern', () => {
    const out = computeAuditCResult(AUDIT_C_NEGATIVE_INPUT);
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(0);
    expect(out.screeningResult).toBe('negative');
    expect(categorizeAuditCScreening(out.totalScore)).toBe('negative');
  });

  it('positive men screen at high consumption pattern', () => {
    const out = computeAuditCResult(AUDIT_C_POSITIVE_MEN_INPUT);
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(11);
    expect(out.screeningResult).toBe('positive_men');
    expect(out.screeningDisclaimer).toMatch(/^Screening only\./i);
  });

  it('interpretAuditCScore avoids AUD diagnosis language', () => {
    const i = interpretAuditCScore(5);
    expect(i?.screeningDiscussion).not.toMatch(/\bdetox\b/i);
    expect(i?.pathwayDisclaimer).toMatch(/does not recommend specific medications/i);
  });

  it('requires all three AUDIT-C questions', () => {
    const out = computeAuditCResult({ drinkingFrequency: 'never' });
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PR4A comprehensive — 5. registry mappings', () => {
  it.each(PR4A_TOOL_IDS)('toolRegistry includes %s with dedicated path and initialCalc', (id) => {
    expect(toolRegistry.filter((t) => t.id === id)).toHaveLength(1);
    const reg = toolRegistryById[id];
    expect(reg.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(reg.initialCalc).toBe(id);
    expect(reg.panelTool).toBe('calculators');
    expect(getToolIcon(id)).toBeTruthy();
  });

  it.each(PR4A_TOOL_IDS)('builtinUiCalculators maps %s to registry id', (id) => {
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(builtin?.calcQuery).toBe(PR4A_CALC_QUERY_BY_REGISTRY_ID[id]);
  });

  it.each(PR4A_TOOL_IDS)('%s is not listed in nluCalculatorHubOnly', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
  });
});

describe('PR4A comprehensive — 6. discovery inclusion', () => {
  it.each(PR4A_TOOL_IDS)('merged discovery includes canonical %s once', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
  });

  it.each(PR4A_DISCOVERY_ALIAS_PAIRS)('discovery alias %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR4A comprehensive — 7. catalog inclusion', () => {
  it.each(PR4A_TOOL_IDS)('medical catalog row for %s has dedicated form slug', (id) => {
    const rows = getMedicalToolsCatalogRows().filter((r) => r.primaryId === id);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.pagePath).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(row.chatOnlyForm).toBe(false);
    expect(row.uiCalculatorSlug).toBe(id);
    expect(row.chatOnRequest).toBe(true);
    expect(row.chatSeed).toBe(clinicalIntentToolsById[id]?.chatSeed);
  });

  it.each(PR4A_CATALOG_SEARCH_QUERIES)('catalog search "%s" finds %s', (registryId, query) => {
    const hits = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(hits.some((r) => r.primaryId === registryId)).toBe(true);
  });
});

describe('PR4A comprehensive — 8. route resolution', () => {
  it.each(PR4A_TOOL_IDS)('expectedLaunchPath(%s) is dedicated calculator route', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(isKnownToolAreaPath(PR4A_ROUTE_BY_REGISTRY_ID[id])).toBe(true);
  });

  it.each(PR4A_TOOL_IDS)('CALCULATOR_ROUTE_DEFS and matchCalculatorRoute for %s', (id) => {
    const path = PR4A_ROUTE_BY_REGISTRY_ID[id];
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
    expect(def?.path).toBe(path);
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
  });

  it.each(PR4A_TOOL_IDS)('resolveNavigationPathForLaunch keeps Tier-A dedicated path', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(launch.path).not.toBe(PR4A_HUB_PATH);
  });

  it('registers dedicated calculator routes via CALCULATOR_ROUTE_DEFS before hub', () => {
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).toContain('<LegacyCalculatorRouteRedirect />');
    for (const id of PR4A_TOOL_IDS) {
      expect(matchCalculatorRoute(PR4A_ROUTE_BY_REGISTRY_ID[id])?.calculatorSlug).toBe(id);
    }
  });

  it.each([
    ['ascvd-risk', 'AscvdRiskCalculator'],
    ['ckd-staging', 'CkdStagingCalculator'],
    ['stop-bang', 'StopBangCalculator'],
    ['audit-c', 'AuditCCalculator'],
  ])('Calculators.jsx case %s renders %s from pr4aCalculators', (id, component) => {
    expect(calculatorsSource).toContain(`case '${id}':`);
    expect(calculatorsSource).toContain(`<${component}`);
    expect(calculatorsSource).toContain("from './pr4aCalculators'");
  });
});

describe('PR4A comprehensive — 9. NLU aliases', () => {
  it.each(PR4A_REQUIRED_NLU_ALIAS_PAIRS)('required NLU alias "%s" → %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR4A_ALL_ALIAS_PAIRS)('resolveCatalogLaunch("%s") matches canonical %s', (alias, canonical) => {
    const fromAlias = resolveCatalogLaunch(alias);
    const fromCanonical = resolveCatalogLaunch(canonical);
    expect(fromAlias.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[canonical]);
    expect(fromAlias.registryId).toBe(canonical);
    expect(fromAlias.path).toBe(fromCanonical.path);
    expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    expect(fromAlias.openLabel).toBe('Open');
  });

  it.each(PR4A_TOOL_IDS)('clinicalIntentTools row for %s uses dedicated path', (id) => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nlu?.chatSeed?.length).toBeGreaterThan(40);
  });

  it('returns empty launch shape for unknown ids', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR4A_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR4A_EMPTY_LAUNCH);
    const unknown = resolveCatalogLaunch('not-a-pr4a-tool-xyz');
    expect(unknown.path).toBe('/assistant');
    expect(unknown.registryId).toBeNull();
    expect(resolveNavigationPathForLaunch(unknown)).toBe('/assistant');
  });
});

describe('PR4A comprehensive — 10. edge cases', () => {
  it('separates legacy gfr calculator from ckd-staging gfr-stage alias', () => {
    expect(NLU_TO_REGISTRY_ID.gfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID.egfr).toBe('calc-gfr');
    expect(NLU_TO_REGISTRY_ID['gfr stage']).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr').registryId).toBe('calc-gfr');
    expect(resolveCatalogLaunch('gfr-stage').registryId).toBe('ckd-staging');
    expect(resolveCatalogLaunch('gfr-stage').path).toBe(`${PR4A_HUB_PATH}/ckd-staging`);
  });

  it('separates ascvd-risk from chads2vasc cardiovascular aliases', () => {
    expect(NLU_TO_REGISTRY_ID.ascvd).toBe('ascvd-risk');
    expect(NLU_TO_REGISTRY_ID.chads2vasc).toBe('calc-chads2vasc');
    expect(resolveCatalogLaunch('cardiovascular-risk').registryId).toBe('ascvd-risk');
    expect(resolveCatalogLaunch('chads2vasc').registryId).toBe('calc-chads2vasc');
  });

  it('has no conflicting targets within PR4A_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR4A_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('ASCVD and STOP-Bang return null interpretation for invalid scores', () => {
    expect(interpretAscvdTenYearRisk(Number.NaN)).toBeNull();
    expect(interpretStopBangScore(-1)).toBeNull();
    expect(interpretAuditCScore(13)).toBeNull();
  });

  it.each(PR4A_TOOL_IDS)('tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.filter((p) => p.toolId === id)).toHaveLength(1);
  });

  it.each(PR4A_TOOL_IDS)('required phrases in NLU map or backend keywords for %s', (id) => {
    const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
    const requiredForTool = PR4A_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
      ([a]) => a
    );
    for (const phrase of requiredForTool) {
      const slug = aliasToSlug(phrase);
      const inNlu = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
      const inBackend = keywords.includes(slug);
      expect(inNlu || inBackend, `missing backend/NLU for "${phrase}" (${id})`).toBe(true);
    }
  });
});

describe('PR4A comprehensive — per-tool dedicated launch', () => {
  it.each(PR4A_TOOL_IDS)('launch alias bundle covers %s', (id) => {
    const aliases = PR4A_LAUNCH_ALIASES_BY_REGISTRY_ID[id];
    expect(aliases.length).toBeGreaterThanOrEqual(3);
    const canonical = resolveCatalogLaunch(id);
    for (const alias of aliases) {
      const fromAlias = resolveCatalogLaunch(alias);
      expect(fromAlias.registryId).toBe(id);
      expect(fromAlias.path).toBe(canonical.path);
      expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
    }
  });

  it('ASCVD launch path opens dedicated calculator (not dashboard)', () => {
    const launch = resolveCatalogLaunch('ascvd-risk');
    expect(launch.path).toBe('/tools/calculators/ascvd-risk');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/tools/calculators/ascvd-risk');
    expect(launch.chatSeed).toMatch(/decision support|primary prevention/i);
  });

  it('CKD staging launch references KDIGO staging; NLU description scopes chronicity', () => {
    const launch = resolveCatalogLaunch('ckd-staging');
    const nlu = clinicalIntentToolsById['ckd-staging'];
    expect(launch.path).toBe('/tools/calculators/ckd-staging');
    expect(launch.chatSeed).toMatch(/KDIGO|eGFR|albuminuria/i);
    expect(nlu.description).toMatch(
      /Does not establish chronicity or recommend dialysis or drug therapy/i
    );
  });

  it('STOP-Bang launch seed targets OSA screening', () => {
    const launch = resolveCatalogLaunch('stop-bang');
    expect(launch.chatSeed).toMatch(/STOP-Bang|obstructive sleep apnea screening/i);
    expect(clinicalIntentToolsById['stop-bang'].description).toMatch(/screening/i);
  });

  it('AUDIT-C NLU profile is screening-scoped', () => {
    const launch = resolveCatalogLaunch('audit-c');
    const nlu = clinicalIntentToolsById['audit-c'];
    expect(launch.chatSeed).toMatch(/AUDIT-C|alcohol screen|screening thresholds/i);
    expect(nlu.description).toMatch(/^Screening only:/i);
    expect(nlu.description).toMatch(/does not diagnose alcohol use disorder/i);
  });
});
