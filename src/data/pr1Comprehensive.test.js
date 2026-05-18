/**
 * PR1 comprehensive Vitest coverage — scoring, interpretation, wiring, launch, and edge cases.
 * Complements pr1RegistrationAudit.test.js (full cross-system audit) and per-calculator utils tests.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQsofaScore,
  interpretQsofaScore,
  qsofaCriteriaFromInputs,
  validateQsofaInputs,
} from '../utils/qsofaCalculator';
import {
  computeNews2Breakdown,
  interpretNews2Risk,
  scoreSpo2Scale1,
  scoreSpo2Scale2,
  sumNews2Score,
  validateNews2Inputs,
} from '../utils/news2Calculator';
import {
  computeChildPughBreakdown,
  interpretChildPughClass,
  scoreChildPughBilirubinMgDl,
  sumChildPughScore,
  validateChildPughInputs,
} from '../utils/childPughCalculator';
import {
  calculateHasBledScore,
  computeHasBledBreakdown,
  interpretHasBled,
  sumHasBledScore,
} from '../utils/hasBledCalculator';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR1_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
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
  PR1_ALL_ALIAS_PAIRS,
  PR1_CATALOG_SEARCH_QUERIES,
  PR1_DISCOVERY_ALIAS_PAIRS,
  PR1_ROUTE_BY_REGISTRY_ID,
  PR1_CALC_QUERY_BY_REGISTRY_ID,
} from './pr1TestConstants';
import {
  PR1_TOOL_IDS,
  QSOFA_SCORE_PERMUTATIONS,
  QSOFA_INTERPRETATION_BY_SCORE,
  HAS_BLED_SEVERITY_BY_SCORE,
  HAS_BLED_NONE,
  CHILD_PUGH_CLASS_BY_TOTAL,
  CHILD_PUGH_CLASS_BOUNDARIES,
  CHILD_PUGH_CLASS_A_INPUTS,
  NEWS2_SCALE_SWITCH_FIXTURE,
  NEWS2_SCALE2_SPO2_EDGE,
  NEWS2_VALID_BASE_INPUTS,
} from './testHelpers/pr1TestFixtures';

describe('PR1 comprehensive — qSOFA scoring & interpretation', () => {
  it.each(QSOFA_SCORE_PERMUTATIONS)(
    'score permutation RR=$respiratoryRateGte22 SBP=$systolicBpLte100 ment=$alteredMentationOrGcsLt15 → $expected',
    ({ respiratoryRateGte22, systolicBpLte100, alteredMentationOrGcsLt15, expected }) => {
      expect(
        calculateQsofaScore({
          respiratoryRateGte22,
          systolicBpLte100,
          alteredMentationOrGcsLt15,
        })
      ).toBe(expected);
    }
  );

  it.each(QSOFA_INTERPRETATION_BY_SCORE)(
    'interpretQsofaScore($score) severity=$severity',
    ({ score, severity, positiveThreshold }) => {
      const interp = interpretQsofaScore(score);
      expect(interp.severity).toBe(severity);
      if (positiveThreshold) {
        expect(interp.interpretation).toMatch(/≥2|not diagnostic/i);
      }
    }
  );

  it('end-to-end: valid inputs → criteria → score → interpretation without diagnostic certainty', () => {
    const raw = {
      respiratoryRate: '24',
      systolicBloodPressure: '95',
      alteredMentation: false,
      gcs: '14',
    };
    expect(validateQsofaInputs(raw).ok).toBe(true);
    const criteria = qsofaCriteriaFromInputs(raw);
    const score = calculateQsofaScore(criteria);
    expect(score).toBe(3);
    const interp = interpretQsofaScore(score);
    expect(interp.severity).toBe('critical');
    expect(interp.interpretation).toMatch(/not diagnostic/i);
  });

  it('edge: GCS exactly 15 does not satisfy mentation unless checkbox set', () => {
    const c = qsofaCriteriaFromInputs({
      respiratoryRate: 18,
      systolicBloodPressure: 120,
      alteredMentation: false,
      gcs: 15,
    });
    expect(c.alteredMentationOrGcsLt15).toBe(false);
    expect(
      validateQsofaInputs({
        respiratoryRate: '18',
        systolicBloodPressure: '120',
        alteredMentation: false,
        gcs: '15',
      }).ok
    ).toBe(true);
  });
});

describe('PR1 comprehensive — NEWS2 scale switching & bands', () => {
  it('changes SpO₂ sub-score when switching Scale 1 vs Scale 2 at fixed saturation', () => {
    const base = NEWS2_SCALE_SWITCH_FIXTURE;
    const b1 = computeNews2Breakdown({ ...base, spo2Scale: '1' });
    const b2 = computeNews2Breakdown({ ...base, spo2Scale: '2' });
    expect(b1.spo2ScaleUsed).toBe('1');
    expect(b2.spo2ScaleUsed).toBe('2');
    expect(b1.spo2).toBe(scoreSpo2Scale1(base.spo2));
    expect(b2.spo2).toBe(scoreSpo2Scale2(base.spo2, true));
    expect(b1.spo2).not.toBe(b2.spo2);
  });

  it('Scale 2: room air vs supplemental O₂ diverges at SpO₂ 93% (hypercapnic pathway edge)', () => {
    const base = NEWS2_SCALE2_SPO2_EDGE;
    const roomAir = computeNews2Breakdown({
      ...base,
      spo2Scale: '2',
      supplementalOxygen: false,
    });
    const onO2 = computeNews2Breakdown({
      ...base,
      spo2Scale: '2',
      supplementalOxygen: true,
    });
    expect(roomAir.spo2).toBe(scoreSpo2Scale2(base.spo2, false));
    expect(onO2.spo2).toBe(scoreSpo2Scale2(base.spo2, true));
    expect(roomAir.spo2).not.toBe(onO2.spo2);
    expect(sumNews2Score(onO2)).toBeGreaterThan(sumNews2Score(roomAir));
  });

  it('interpretNews2Risk uses critical severity at aggregate ≥7', () => {
    const breakdown = {
      respiratoryRate: 3,
      spo2: 2,
      supplementalOxygen: 2,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 0,
      spo2ScaleUsed: '1',
    };
    expect(interpretNews2Risk(7, breakdown).severity).toBe('critical');
    expect(interpretNews2Risk(6, breakdown).severity).toBe('warning');
  });

  it('validateNews2Inputs rejects empty required fields and invalid scale token', () => {
    const missing = validateNews2Inputs({
      ...NEWS2_VALID_BASE_INPUTS,
      respiratoryRate: '',
    });
    expect(missing.ok).toBe(false);

    const scale = validateNews2Inputs({
      ...NEWS2_VALID_BASE_INPUTS,
      spo2Scale: 'x',
    });
    expect(scale.ok).toBe(false);
    expect(scale.errors.some((e) => /scale/i.test(e))).toBe(true);
  });
});

describe('PR1 comprehensive — Child-Pugh class boundaries', () => {
  it.each(CHILD_PUGH_CLASS_BY_TOTAL)(
    'interpretChildPughClass($total) → class $childPughClass severity $severity',
    ({ total, childPughClass, severity }) => {
      const interp = interpretChildPughClass(total);
      expect(interp?.childPughClass).toBe(childPughClass);
      expect(interp?.severity).toBe(severity);
    }
  );

  it.each(CHILD_PUGH_CLASS_BOUNDARIES)(
    'class boundary at total $total is $childPughClass',
    ({ total, childPughClass }) => {
      expect(interpretChildPughClass(total)?.childPughClass).toBe(childPughClass);
    }
  );

  it('computeChildPughBreakdown yields class A minimum score 5', () => {
    const b = computeChildPughBreakdown(CHILD_PUGH_CLASS_A_INPUTS);
    expect(sumChildPughScore(b)).toBe(5);
    expect(interpretChildPughClass(5)?.childPughClass).toBe('A');
  });

  it('edge: bilirubin scoring bands at 1.99, 2, and 3.01 mg/dL equivalents', () => {
    expect(scoreChildPughBilirubinMgDl(1.99)).toBe(1);
    expect(scoreChildPughBilirubinMgDl(2)).toBe(2);
    expect(scoreChildPughBilirubinMgDl(3.01)).toBe(3);
  });

  it('interpretChildPughClass returns null outside 5–15', () => {
    expect(interpretChildPughClass(4)).toBeNull();
    expect(interpretChildPughClass(16)).toBeNull();
  });

  it('validateChildPughInputs rejects missing coagulation value for selected mode', () => {
    const missingInr = validateChildPughInputs({
      ...CHILD_PUGH_CLASS_A_INPUTS,
      inr: '',
    });
    expect(missingInr.ok).toBe(false);
    expect(missingInr.errors.some((e) => /inr/i.test(e))).toBe(true);
  });
});

describe('PR1 comprehensive — HAS-BLED ≥3 threshold', () => {
  it.each(HAS_BLED_SEVERITY_BY_SCORE)(
    'interpretHasBled($score) elevated=$elevated severity=$severity',
    ({ score, elevated, severity }) => {
      const interp = interpretHasBled(score);
      expect(interp?.severity).toBe(severity);
      if (elevated) {
        expect(interp?.interpretation).toMatch(/3 or more/i);
        expect(interp?.label).toMatch(/elevated/i);
      } else {
        expect(interp?.interpretation).toMatch(/below 3/i);
      }
    }
  );

  it('threshold: score 2 is normal, score 3 is critical', () => {
    expect(interpretHasBled(2)?.severity).toBe('normal');
    expect(interpretHasBled(3)?.severity).toBe('critical');
    expect(calculateHasBledScore({ ...HAS_BLED_NONE, hypertension: true, renalDysfunction: true, strokeHistory: true })).toBe(3);
  });

  it('sumHasBledScore returns null when a factor is not 0 or 1', () => {
    const b = computeHasBledBreakdown(HAS_BLED_NONE);
    b.hypertension = 2;
    expect(sumHasBledScore(b)).toBeNull();
  });

  it('interpretHasBled returns null for out-of-range totals', () => {
    expect(interpretHasBled(-1)).toBeNull();
    expect(interpretHasBled(10)).toBeNull();
  });
});

describe('PR1 comprehensive — registry, catalog, discovery', () => {
  it('PR1_TOOL_IDS matches frozen PR1_CALCULATOR_REGISTRY_IDS', () => {
    expect([...PR1_TOOL_IDS]).toEqual([...PR1_CALCULATOR_REGISTRY_IDS]);
  });

  it.each(PR1_TOOL_IDS)('toolRegistry entry for %s', (id) => {
    const reg = toolRegistryById[id];
    expect(reg.path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
    expect(reg.initialCalc).toBe(id);
    expect(toolRegistry.some((t) => t.id === id)).toBe(true);
  });

  it.each(PR1_TOOL_IDS)('catalog row for %s with calculator slug', (id) => {
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
    expect(row?.uiCalculatorSlug).toBe(id);
    expect(row?.chatOnRequest).toBe(true);
  });

  it.each(PR1_TOOL_IDS)('discovery merge includes canonical %s', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
  });

  it.each(PR1_DISCOVERY_ALIAS_PAIRS)('discovery alias %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR1 comprehensive — NLU aliases, routes, resolveCatalogLaunch', () => {
  it.each(PR1_ALL_ALIAS_PAIRS)('NLU alias %s → registry %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR1_TOOL_IDS)('route resolution for %s', (id) => {
    const path = PR1_ROUTE_BY_REGISTRY_ID[id];
    expect(expectedLaunchPath(id)).toBe(path);
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(id);
    expect(CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id)?.path).toBe(path);
  });

  it.each(PR1_TOOL_IDS)('resolveCatalogLaunch(%s) dedicated path and chat seed', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
    expect(launch.registryId).toBe(id);
    expect(launch.path).not.toBe('/tools/calculators');
    expect(launch.chatSeed?.length).toBeGreaterThan(20);
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PR1_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical launch for %s',
    (alias, canonical) => {
      const a = resolveCatalogLaunch(alias);
      const c = resolveCatalogLaunch(canonical);
      expect(a.path).toBe(c.path);
      expect(a.registryId).toBe(c.registryId);
      expect(a.chatSeed).toBe(c.chatSeed);
    }
  );

  it.each(PR1_TOOL_IDS)('builtin calc query path for %s', (id) => {
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.calcQuery).toBe(PR1_CALC_QUERY_BY_REGISTRY_ID[id]);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(clinicalIntentTools.find((t) => t.toolId === id)?.path).toBe(PR1_ROUTE_BY_REGISTRY_ID[id]);
  });

  it.each(PR1_CATALOG_SEARCH_QUERIES)('catalog search resolves %s via "%s"', (registryId, query) => {
    const rows = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(rows.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(true);
  });

  it('resolveCatalogLaunch returns empty shape for unknown id', () => {
    const launch = resolveCatalogLaunch('not-a-pr1-tool-xyz');
    expect(launch.path).toBeNull();
    expect(launch.registryId).toBeNull();
  });
});
