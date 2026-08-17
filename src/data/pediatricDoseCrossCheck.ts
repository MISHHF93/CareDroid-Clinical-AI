/**
 * Cross-reference guard between this repository's two independent, live pediatric
 * weight-based emergency drug dosing tables:
 *   - src/components/calculators/PediatricDrugCalc.tsx (patient-context modal,
 *     reached from PatientDetailPanel and ClinicalCalculatorHub)
 *   - src/pages/tools/pediatricsObgynCalculators.tsx's PediatricEmergencyDrugCalculator
 *     (reached via the Pediatric Dose Safety Checker tool page)
 *
 * These were built independently and, as of this audit, disagree on the per-kg dose
 * for at least 2 drugs used for the same indication (Rocuronium RSI paralysis;
 * Dextrose/Glucose D10W for hypoglycemia) — up to a 2.5x difference. Which number is
 * clinically correct is NOT a decision this module or its callers make: that requires
 * licensed clinical/pharmacy review and is tracked as a standing roadmap item. What
 * this module does is make the disagreement impossible to miss — surfaced live in
 * both calculators — instead of two clinicians independently trusting whichever
 * calculator they happened to open, unaware a second one in the same app disagrees.
 *
 * KNOWN_DISCREPANCIES is a deliberately manual, reviewed alias map (drug-name
 * matching across free-text medical names is not something to automate/guess at).
 * pediatricDoseCrossCheckWarning() only ever reports entries from this explicit list —
 * it does not infer new ones. The regression test for this module is the mechanism
 * that keeps the list honest: it re-derives which named drugs actually still diverge
 * and fails if that set changes without this file being updated to match, so a future
 * edit to either dosing table can't silently widen (or silently "fix," unreviewed) the
 * gap without a human noticing.
 */

export type PediatricDoseDiscrepancy = {
  /** Canonical id, stable across both tables' differing display names. */
  id: string;
  /** Name as it appears in PediatricDrugCalc.tsx. */
  calcName: string;
  /** Per-kg dose + unit as it appears in PediatricDrugCalc.tsx. */
  calcDose: string;
  /** Name as it appears in the Pediatric Dose Safety Checker tool page. */
  checkerName: string;
  /** Per-kg dose + unit as it appears in the Pediatric Dose Safety Checker tool page. */
  checkerDose: string;
  /** Short, non-clinical-judgment explanation of the numeric gap. */
  note: string;
};

export const KNOWN_PEDIATRIC_DOSE_DISCREPANCIES: readonly PediatricDoseDiscrepancy[] = Object.freeze([
  {
    id: 'rocuronium',
    calcName: 'Rocuronium',
    calcDose: '1.2 mg/kg',
    checkerName: 'Rocuronium',
    checkerDose: '1 mg/kg',
    note: '20% difference in RSI paralysis dose between this app’s two pediatric drug references.',
  },
  {
    id: 'dextrose-d10w',
    calcName: 'Dextrose 10%',
    calcDose: '2 mL/kg',
    checkerName: 'Glucose (D10W)',
    checkerDose: '5 mL/kg',
    note: '2.5x difference in D10W volume for hypoglycemia between this app’s two pediatric drug references.',
  },
  {
    id: 'ns-bolus-sepsis',
    calcName: 'NS bolus (sepsis)',
    calcDose: '10 mL/kg, capped at 500 mL total',
    checkerName: 'Fluid bolus',
    checkerDose: '10-20 mL/kg, no stated cap',
    note: 'Up to 2.4x difference in shock/sepsis fluid-bolus volume (and disagreement on whether an upper safety cap exists) between this app’s two pediatric drug references.',
  },
]);

/**
 * Canonical ids present on both calculators. Exported (not just used internally) so the
 * regression test can re-derive, from the two tables' own live data, which named drugs
 * actually still numerically disagree -- rather than the test merely checking that this
 * file agrees with itself.
 */
export const CALC_NAME_TO_ID: Readonly<Record<string, string>> = Object.freeze({
  Rocuronium: 'rocuronium',
  'Dextrose 10%': 'dextrose-d10w',
  'NS bolus (sepsis)': 'ns-bolus-sepsis',
});

export const CHECKER_NAME_TO_ID: Readonly<Record<string, string>> = Object.freeze({
  Rocuronium: 'rocuronium',
  Glucose: 'dextrose-d10w',
  'Fluid bolus': 'ns-bolus-sepsis',
});

/** For PediatricDrugCalc.tsx: is this row one of the known cross-calculator discrepancies? */
export function pediatricDoseCrossCheckWarning(drugName: string): PediatricDoseDiscrepancy | null {
  const id = CALC_NAME_TO_ID[drugName];
  if (!id) return null;
  return KNOWN_PEDIATRIC_DOSE_DISCREPANCIES.find((entry) => entry.id === id) ?? null;
}

/** For the Pediatric Dose Safety Checker tool page: same lookup, keyed by its own drug names. */
export function pediatricDoseCheckerCrossCheckWarning(drugName: string): PediatricDoseDiscrepancy | null {
  const id = CHECKER_NAME_TO_ID[drugName];
  if (!id) return null;
  return KNOWN_PEDIATRIC_DOSE_DISCREPANCIES.find((entry) => entry.id === id) ?? null;
}
