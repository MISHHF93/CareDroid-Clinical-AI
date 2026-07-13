/**
 * PR2 comprehensive Vitest coverage — scoring, interpretation, wiring, launch, and edge cases.
 * Complements pr2RegistrationAudit.test.js and per-calculator utils tests.
 */

import { describe, it, expect } from 'vitest';
import {
  applyMeldLabClamps,
  calculateMeldNaScore,
  calculateMeldScore,
  computeMeldResult,
  formatMeldLabValue,
  interpretMeldScores,
  validateMeldInputs,
} from '../utils/meldCalculator';
import {
  TIMI_UA_NSTEMI_CRITERIA_META,
  calculateTimiUaNstemiScore,
  computeTimiBreakdown,
  interpretTimiUaNstemi,
} from '../utils/timiUaNstemiCalculator';
import {
  calculateWellsPeScore,
  interpretWellsPe,
} from '../utils/wellsPeCalculator';
import {
  evaluatePerc,
  interpretPerc,
} from '../utils/percCalculator';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
import { percChatConfig } from './chatAssistedCalculators/perc';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import {
  PR2_ALL_ALIAS_PAIRS,
  PR2_CATALOG_SEARCH_QUERIES,
  PR2_DISCOVERY_ALIAS_PAIRS,
  PR2_HUB_PATH,
  PR2_HUB_ROUTE_BY_REGISTRY_ID,
  PR2_ROUTE_BY_REGISTRY_ID,
  PR2_CALC_QUERY_BY_REGISTRY_ID,
  PR2_TOOL_IDS,
} from './pr2TestConstants';
import {
  MELD_BASE_LABS,
  MELD_DIALYSIS_INPUT,
  MELD_LOW_CREATININE_INPUT,
  MELD_NA_REGRESSION,
  PERC_ALL_MET,
  PERC_LAUNCH_ALIASES,
  PERC_NONE_MET,
  TIMI_ALL,
  TIMI_BAND_FIXTURES,
  TIMI_NONE,
  WELLS_PE_ALL,
  WELLS_PE_BAND_FIXTURES,
  WELLS_PE_LAUNCH_ALIASES,
  WELLS_PE_NONE,
} from './testHelpers/pr2TestFixtures';

const HUB = PR2_HUB_PATH;

describe('PR2 comprehensive — MELD formula & MELD-Na', () => {
  it('matches known MELD score for fixed laboratory inputs (formula regression)', () => {
    expect(
      calculateMeldScore({
        bilirubinMgDl: 2,
        inr: 1.5,
        creatinineMgDl: 1.2,
        onDialysis: false,
      })
    ).toBe(15);
  });

  it('matches UNOS MELD-Na adjustment for MELD 15 and sodium 125', () => {
    expect(calculateMeldNaScore(15, 125)).toBe(25);
  });

  it('end-to-end MELD-Na via computeMeldResult', () => {
    const out = computeMeldResult(
      {
        bilirubin: String(MELD_NA_REGRESSION.bilirubin),
        bilirubinUnit: MELD_NA_REGRESSION.bilirubinUnit,
        inr: MELD_NA_REGRESSION.inr,
        creatinine: MELD_NA_REGRESSION.creatinine,
        creatinineUnit: MELD_NA_REGRESSION.creatinineUnit,
        onDialysis: MELD_NA_REGRESSION.onDialysis,
        sodium: MELD_NA_REGRESSION.sodium,
      },
      { includeMeldNa: true }
    );
    expect(out.ok).toBe(true);
    if (!('meld' in out)) throw new Error('expected computeMeldResult to succeed');
    expect(out.meld).toBe(MELD_NA_REGRESSION.expectedMeld);
    expect(out.meldNa).toBe(MELD_NA_REGRESSION.expectedMeldNa);
    expect(out.meldNa).toBeGreaterThanOrEqual(out.meld);
  });

  it('edge: low creatinine floors to 1.0 mg/dL (same score as creatinine 1.0)', () => {
    const low = computeMeldResult(MELD_LOW_CREATININE_INPUT);
    const floored = computeMeldResult({ ...MELD_BASE_LABS, creatinine: '1' });
    expect(low.ok).toBe(true);
    expect(floored.ok).toBe(true);
    if (!('meld' in low)) throw new Error('expected computeMeldResult to succeed');
    if (!('meld' in floored)) throw new Error('expected computeMeldResult to succeed');
    expect(low.meld).toBe(floored.meld);
    expect(low.clamped.creatinineMgDl).toBe(1);
    expect(applyMeldLabClamps({ bilirubinMgDl: 1, inr: 1, creatinineMgDl: 0.3, onDialysis: false }).creatinineMgDl).toBe(
      1
    );
  });

  it('edge: dialysis applies UNOS creatinine 4.0 mg/dL', () => {
    const dialysis = computeMeldResult(MELD_DIALYSIS_INPUT);
    const crFour = computeMeldResult({ ...MELD_BASE_LABS, creatinine: '4', onDialysis: false });
    expect(dialysis.ok).toBe(true);
    expect(crFour.ok).toBe(true);
    if (!('meld' in dialysis)) throw new Error('expected computeMeldResult to succeed');
    if (!('meld' in crFour)) throw new Error('expected computeMeldResult to succeed');
    expect(dialysis.meld).toBe(crFour.meld);
    expect(dialysis.clamped.onDialysis).toBe(true);
    expect(dialysis.clamped.creatinineMgDl).toBe(4);
  });

  it('clamps aggregate MELD to 6–40 for extreme labs', () => {
    const score = calculateMeldScore({
      bilirubinMgDl: 4,
      inr: 3,
      creatinineMgDl: 4,
      onDialysis: false,
    });
    expect(score).toBeGreaterThanOrEqual(6);
    expect(score).toBeLessThanOrEqual(40);
    expect(score).toBeGreaterThan(30);
  });

  it('interpretMeldScores avoids transplant listing language', () => {
    const i = interpretMeldScores(35, 36 as any);
    if (!i) throw new Error('expected interpretMeldScores to return a result');
    expect(i.transplantDisclaimer).toMatch(/does not recommend transplant/i);
    expect(i.interpretation).not.toMatch(/list for transplant/i);
  });

  it('invalid input: empty required fields return ok:false with errors', () => {
    const out = computeMeldResult({
      bilirubin: '',
      bilirubinUnit: 'mg_dl',
      inr: '',
      creatinine: '',
      creatinineUnit: 'mg_dl',
      onDialysis: false,
    });
    expect(out.ok).toBe(false);
    if ('meld' in out) throw new Error('expected computeMeldResult to fail');
    expect(out.errors.length).toBeGreaterThan(0);
    expect((out as any).meld).toBeUndefined();
  });

  it('invalid input: MELD-Na requires sodium', () => {
    const v = validateMeldInputs(MELD_BASE_LABS, { requireSodium: true });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /sodium/i.test(e))).toBe(true);
  });

  it('edge: formatMeldLabValue displays safely for non-finite breakdown values', () => {
    expect(formatMeldLabValue(Number.NaN)).toBe('—');
    expect(formatMeldLabValue(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatMeldLabValue(1.2)).toBe('1.20');
  });
});

describe('PR2 comprehensive — TIMI scoring & interpretation', () => {
  it('scores zero with no criteria and seven with all criteria', () => {
    expect(calculateTimiUaNstemiScore(TIMI_NONE)).toBe(0);
    expect(calculateTimiUaNstemiScore(TIMI_ALL)).toBe(7);
    expect(TIMI_UA_NSTEMI_CRITERIA_META).toHaveLength(7);
  });

  it.each(TIMI_BAND_FIXTURES)(
    'interpretTimiUaNstemi($score) → $severity / $riskBand',
    ({ score, severity, riskBand }) => {
      const i = interpretTimiUaNstemi(score);
      expect(i?.severity).toBe(severity);
      expect(i?.riskBand).toBe(riskBand);
    }
  );

  it('edge: max score (7) is critical higher-risk band', () => {
    expect(calculateTimiUaNstemiScore(TIMI_ALL)).toBe(7);
    const i = interpretTimiUaNstemi(7);
    expect(i?.label).toBe('Higher TIMI risk band');
    expect(i?.severity).toBe('critical');
    expect(i?.approximateEventRate).toMatch(/26|41/);
  });

  it('breakdown sums match total for partial selection', () => {
    const partial = { ...TIMI_NONE, severeAngina: true, stDeviation: true, elevatedCardiacMarkers: true };
    const b = computeTimiBreakdown(partial);
    expect((Object.values(b) as number[]).reduce((a, n) => a + n, 0)).toBe(3);
    expect(calculateTimiUaNstemiScore(partial)).toBe(3);
  });

  it('ACS disclaimer excludes STEMI and treatment directives', () => {
    const i = interpretTimiUaNstemi(4);
    if (!i) throw new Error('expected interpretTimiUaNstemi to return a result');
    expect(i.acsDisclaimer).toMatch(/not for STEMI/i);
    expect(i.acsDisclaimer).toMatch(/does not confirm ACS/i);
    expect(i.interpretation).not.toMatch(/start heparin|give aspirin|pci now/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretTimiUaNstemi(-1)).toBeNull();
    expect(interpretTimiUaNstemi(8)).toBeNull();
  });
});

describe('PR2 comprehensive — Wells PE scoring', () => {
  it('scores zero with no criteria and 12.5 with all criteria', () => {
    expect(calculateWellsPeScore(WELLS_PE_NONE)).toBe(0);
    expect(calculateWellsPeScore(WELLS_PE_ALL)).toBe(12.5);
  });

  it.each(WELLS_PE_BAND_FIXTURES)(
    'interpretWellsPe($score) → $band ($severity)',
    ({ score, band, severity }) => {
      const i = interpretWellsPe(score);
      expect(i?.probabilityBand).toBe(band);
      expect(i?.severity).toBe(severity);
    }
  );

  it('edge: high-risk path (all criteria) yields critical severity', () => {
    const score = calculateWellsPeScore(WELLS_PE_ALL);
    expect(score).toBeGreaterThan(6);
    const i = interpretWellsPe(score);
    expect(i?.probabilityBand).toBe('High probability');
    expect(i?.severity).toBe('critical');
    expect(i?.diagnosticDisclaimer).toMatch(/does not rule in or rule out/i);
    expect(i?.interpretation).not.toMatch(/pe is excluded|ruled out/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretWellsPe(-1)).toBeNull();
    expect(interpretWellsPe(13)).toBeNull();
  });
});

describe('PR2 comprehensive — PERC evaluation', () => {
  it('edge: all-negative path is not satisfied with eight unmet keys', () => {
    const evalResult = evaluatePerc(PERC_NONE_MET);
    expect(evalResult.satisfied).toBe(false);
    expect(evalResult.unmetKeys).toHaveLength(8);
    const i = interpretPerc(evalResult, { lowPretestProbabilityAcknowledged: true });
    if (!i) throw new Error('expected interpretPerc to return a result');
    expect(i.percStatus).toBe('PERC not satisfied');
    expect(i.interpretation).toMatch(/cannot be used|not satisfied/i);
  });

  it('all criteria met with low pre-test acknowledgment → satisfied with safety copy', () => {
    const evalResult = evaluatePerc(PERC_ALL_MET);
    expect(evalResult.satisfied).toBe(true);
    expect(evalResult.unmetKeys).toHaveLength(0);
    const i = interpretPerc(evalResult, { lowPretestProbabilityAcknowledged: true });
    if (!i) throw new Error('expected interpretPerc to return a result');
    expect(i.percStatus).toBe('PERC satisfied');
    expect(i.safetyDisclaimer).toMatch(/does not rule out PE/i);
    expect(i.interpretation).toMatch(/not definitive exclusion/i);
    expect(i.interpretation).not.toMatch(/pe is ruled out|definitively ruled out/i);
  });

  it('requires low pre-test probability when not acknowledged', () => {
    const i = interpretPerc(evaluatePerc(PERC_ALL_MET));
    if (!i) throw new Error('expected interpretPerc to return a result');
    expect(i.label).toMatch(/low pre-test probability/i);
  });
});

describe('PR2 comprehensive — Wells PE & PERC conversational launch', () => {
  it('Wells PE resolveCatalogLaunch returns hub path and guided chat seed', () => {
    const launch = resolveCatalogLaunch('wells-pe');
    expect(launch.path).toBe(wellsPeChatConfig.hubPath);
    expect(launch.registryId).toBe('wells-pe');
    // wells-pe is now a real registerTool() backend executor (Tier C / backend-backed), so the
    // inventory-derived launch resolves to 'Open' (not the old Tier-B 'Start guided chat') and
    // carries the real orchestrator tool id instead of null.
    expect(launch.openLabel).toBe('Open');
    expect(launch.chatSeed).toBe(wellsPeChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/STEP 0/i);
    expect(launch.chatSeed).toMatch(/does not rule in or rule out/i);
    expect(launch.orchestratorTool).toBe('wells-pe');
  });

  it.each(WELLS_PE_LAUNCH_ALIASES)('Wells alias "%s" resolves to same hub launch', (alias) => {
    const canonical = resolveCatalogLaunch('wells-pe');
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.path).toBe(canonical.path);
    expect(fromAlias.registryId).toBe('wells-pe');
    expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
  });

  it('PERC resolveCatalogLaunch returns hub path and safety-focused chat seed', () => {
    const launch = resolveCatalogLaunch('perc');
    expect(launch.path).toBe(percChatConfig.hubPath);
    expect(launch.registryId).toBe('perc');
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.chatSeed).toBe(percChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/pre-test probability is already low/i);
    expect(launch.chatSeed).toMatch(/does NOT definitively rule out/i);
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PERC_LAUNCH_ALIASES)('PERC alias "%s" resolves to same hub launch', (alias) => {
    const canonical = resolveCatalogLaunch('perc');
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.path).toBe(canonical.path);
    expect(fromAlias.registryId).toBe('perc');
    expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
  });

  it('separates Wells pe-score alias from PERC pe-rule-out alias', () => {
    expect(resolveCatalogLaunch('pe-score').registryId).toBe('wells-pe');
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe('perc');
    expect(resolveCatalogLaunch('pe-score').path).toBe(HUB);
    expect(resolveCatalogLaunch('pe-rule-out').path).toBe(HUB);
  });
});

describe('PR2 comprehensive — registry, catalog, discovery', () => {
  it('PR2_TOOL_IDS matches frozen PR2_CALCULATOR_REGISTRY_IDS', () => {
    expect([...PR2_TOOL_IDS]).toEqual([...PR2_CALCULATOR_REGISTRY_IDS]);
  });

  it.each(PR2_TOOL_IDS)('toolRegistry entry for %s', (id) => {
    const reg = toolRegistryById[id];
    expect(reg).toBeTruthy();
    expect(toolRegistry.filter((t) => t.id === id)).toHaveLength(1);
    const expectedPath =
      PR2_ROUTE_BY_REGISTRY_ID[id] ?? PR2_HUB_ROUTE_BY_REGISTRY_ID[id] ?? HUB;
    expect(reg.path).toBe(expectedPath);
    if ((PR2_TIER_A_CALCULATOR_REGISTRY_IDS as readonly string[]).includes(id)) {
      expect(reg.initialCalc).toBe(id);
    }
  });

  it.each(PR2_TIER_A_CALCULATOR_REGISTRY_IDS)('catalog row for %s with calculator slug', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe(PR2_ROUTE_BY_REGISTRY_ID[id]);
    expect(row?.uiCalculatorSlug).toBe(id);
    expect(row?.chatOnRequest).toBe(true);
    expect(row?.chatOnlyForm).toBe(false);
  });

  it.each(PR2_TIER_B_CHAT_CALCULATOR_IDS)('catalog row for %s as chat-only on hub', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe(HUB);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.uiCalculatorSlug).toBeNull();
  });

  it.each(PR2_TOOL_IDS)('discovery merge includes canonical %s', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    const expectedPath =
      PR2_ROUTE_BY_REGISTRY_ID[id] ?? PR2_HUB_ROUTE_BY_REGISTRY_ID[id] ?? HUB;
    expect(hits[0].path).toBe(expectedPath);
  });

  it.each(PR2_DISCOVERY_ALIAS_PAIRS)('discovery alias %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR2 comprehensive — NLU aliases, routes, resolveCatalogLaunch', () => {
  it.each(PR2_ALL_ALIAS_PAIRS)('NLU alias %s → registry %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR2_TIER_A_CALCULATOR_REGISTRY_IDS)('route resolution for Tier-A %s', (id) => {
    const path = PR2_ROUTE_BY_REGISTRY_ID[id];
    expect(expectedLaunchPath(id)).toBe(path);
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(path);
  });

  it.each(PR2_TIER_B_CHAT_CALCULATOR_IDS)('route resolution for Tier-B %s → hub', (id) => {
    expect(expectedLaunchPath(id)).toBe(HUB);
  });

  it.each(PR2_TIER_A_CALCULATOR_REGISTRY_IDS)('resolveCatalogLaunch(%s) dedicated path and chat seed', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR2_ROUTE_BY_REGISTRY_ID[id]);
    expect(launch.registryId).toBe(id);
    expect(launch.path).not.toBe(HUB);
    expect(launch.chatSeed?.length).toBeGreaterThan(20);
    // timi-ua-nstemi is a real registerTool() backend executor, so orchestratorTool resolves
    // to its tool id instead of null; meld/meld-na have no backend executor.
    const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] ?? null;
    expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
    expect(launch.openLabel).toBe('Open');
  });

  it.each(PR2_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical launch for %s',
    (alias, canonical) => {
      const a = resolveCatalogLaunch(alias);
      const c = resolveCatalogLaunch(canonical);
      expect(a.path).toBe(c.path);
      expect(a.registryId).toBe(c.registryId);
      expect(a.chatSeed).toBe(c.chatSeed);
    }
  );

  it.each(PR2_TIER_A_CALCULATOR_REGISTRY_IDS)('builtin calc query path for %s', (id) => {
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.calcQuery).toBe(PR2_CALC_QUERY_BY_REGISTRY_ID[id]);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(PR2_ROUTE_BY_REGISTRY_ID[id]);
  });

  it.each(PR2_CATALOG_SEARCH_QUERIES)('catalog search resolves %s via "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(true);
  });

  it('resolveCatalogLaunch returns empty shape for unknown id', () => {
    const launch = resolveCatalogLaunch('not-a-pr2-tool-xyz');
    expect(launch.path).toBe('/assistant');
    expect(launch.chatSeed).toBeTruthy();
    expect(launch.registryId).toBeNull();
  });
});
