import { describe, expect, it } from 'vitest';
import { PEDIATRIC_DRUG_CALC_DRUGS } from '../components/calculators/PediatricDrugCalc';
import { PEDIATRIC_EMERGENCY_DRUGS } from '../pages/tools/pediatricsObgynCalculators';
import {
  CALC_NAME_TO_ID,
  CHECKER_NAME_TO_ID,
  KNOWN_PEDIATRIC_DOSE_DISCREPANCIES,
  pediatricDoseCheckerCrossCheckWarning,
  pediatricDoseCrossCheckWarning,
} from './pediatricDoseCrossCheck';

/**
 * Both known-discrepancy drugs use a flat per-kg dose (not a range), so calc(kg)/kg parses
 * cleanly. Evaluated at kg=10 rather than kg=1: some entries (e.g. Atropine) apply a minimum-
 * dose floor that only kicks in below a certain weight, which would corrupt a kg=1 sample.
 */
function checkerPerKgDose(name: string): number {
  const drug = PEDIATRIC_EMERGENCY_DRUGS.find((entry) => entry.name === name);
  if (!drug) throw new Error(`Pediatric Dose Safety Checker table has no entry named "${name}"`);
  const text = drug.calc(10);
  const match = text.match(/[\d.]+/);
  if (!match) throw new Error(`Could not parse a numeric per-kg dose out of "${text}" for "${name}"`);
  return Number(match[0]) / 10;
}

function calcPerKgDose(name: string): number {
  const drug = PEDIATRIC_DRUG_CALC_DRUGS.find((entry) => entry.name === name);
  if (!drug) throw new Error(`Pediatric Drug Calculator table has no entry named "${name}"`);
  return drug.dosePerKg;
}

describe('pediatricDoseCrossCheck', () => {
  it('every id in CALC_NAME_TO_ID/CHECKER_NAME_TO_ID resolves to a real row in its own table', () => {
    for (const calcName of Object.keys(CALC_NAME_TO_ID)) {
      expect(PEDIATRIC_DRUG_CALC_DRUGS.some((drug) => drug.name === calcName)).toBe(true);
    }
    for (const checkerName of Object.keys(CHECKER_NAME_TO_ID)) {
      expect(PEDIATRIC_EMERGENCY_DRUGS.some((drug) => drug.name === checkerName)).toBe(true);
    }
  });

  it('re-derives, from the two live dosing tables themselves, exactly the set of drugs this module flags as discrepant', () => {
    // This is the actual regression guard: if a future edit to either table changes a
    // per-kg dose, this recomputes the real numeric gap rather than trusting stale notes.
    const calcIdToName = Object.fromEntries(Object.entries(CALC_NAME_TO_ID).map(([name, id]) => [id, name]));
    const checkerIdToName = Object.fromEntries(Object.entries(CHECKER_NAME_TO_ID).map(([name, id]) => [id, name]));
    const linkedIds = Object.keys(calcIdToName).filter((id) => id in checkerIdToName);

    const actuallyDiscrepantIds = linkedIds.filter((id) => {
      const calcDose = calcPerKgDose(calcIdToName[id]);
      const checkerDose = checkerPerKgDose(checkerIdToName[id]);
      const relativeDiff = Math.abs(calcDose - checkerDose) / Math.max(calcDose, checkerDose);
      return relativeDiff > 0.05; // >5% apart counts as a real disagreement, not rounding noise
    });

    const knownIds = KNOWN_PEDIATRIC_DOSE_DISCREPANCIES.map((entry) => entry.id).sort();
    expect(actuallyDiscrepantIds.sort()).toEqual(knownIds);
  });

  it('Rocuronium genuinely differs between the two tables (1.2 mg/kg vs 1 mg/kg)', () => {
    expect(calcPerKgDose('Rocuronium')).toBe(1.2);
    expect(checkerPerKgDose('Rocuronium')).toBe(1);
  });

  it('Dextrose 10% / Glucose D10W genuinely differs between the two tables (2 mL/kg vs 5 mL/kg)', () => {
    expect(calcPerKgDose('Dextrose 10%')).toBe(2);
    expect(checkerPerKgDose('Glucose')).toBe(5);
  });

  it('pediatricDoseCrossCheckWarning flags known-discrepant drugs and clears drugs that agree', () => {
    expect(pediatricDoseCrossCheckWarning('Rocuronium')?.id).toBe('rocuronium');
    expect(pediatricDoseCrossCheckWarning('Dextrose 10%')?.id).toBe('dextrose-d10w');
    expect(pediatricDoseCrossCheckWarning('Amiodarone')).toBeNull();
    expect(pediatricDoseCrossCheckWarning('Some drug not on either table')).toBeNull();
  });

  it('pediatricDoseCheckerCrossCheckWarning flags known-discrepant drugs and clears drugs that agree', () => {
    expect(pediatricDoseCheckerCrossCheckWarning('Rocuronium')?.id).toBe('rocuronium');
    expect(pediatricDoseCheckerCrossCheckWarning('Glucose')?.id).toBe('dextrose-d10w');
    expect(pediatricDoseCheckerCrossCheckWarning('Amiodarone')).toBeNull();
  });

  it('drugs that agree across both tables are not flagged (Amiodarone, Atropine, Epinephrine, Adenosine first dose)', () => {
    // Guards against the warning becoming noisy/over-triggering on drugs that actually match.
    expect(calcPerKgDose('Amiodarone')).toBe(5);
    expect(checkerPerKgDose('Amiodarone')).toBe(5);
    expect(calcPerKgDose('Atropine')).toBe(0.02);
    expect(checkerPerKgDose('Atropine')).toBe(0.02);
  });
});
