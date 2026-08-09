import { describe, it, expect } from 'vitest';
import { resultFor, criteriaFromVitals } from './qSOFA';
import { qsofaCriteriaFromInputs, interpretQsofaScore } from '../../utils/qsofaCalculator';
import type { Vitals } from '../../types/emergency';

/**
 * `qSOFA.tsx` (live, vitals-driven whiteboard calculator, auto-fills from a
 * patient's real vitals) and `pages/tools/Calculators.tsx`'s qSOFA path (via
 * `utils/qsofaCalculator.ts`, reached through the "All Tools" catalog card
 * rather than the Calculators hub override) each carry their own copy of the
 * same Sepsis-3 qSOFA thresholds (RR >= 22, SBP <= 100, GCS < 15). Neither
 * implementation imports the other, so a future edit to one's threshold
 * could silently diverge from the other -- exactly the drift class
 * news2Equivalence.test.ts already guards for NEWS2. This test locks the
 * two implementations' criteria derivation together across the clinical
 * range, and confirms both agree the alert threshold is a total of 2 or
 * more criteria met.
 */
describe('qSOFA cross-implementation equivalence (qSOFA.tsx vs utils/qsofaCalculator.ts)', () => {
  it('agrees on the respiratory-rate criterion across the full clinical range', () => {
    for (let rr = 5; rr <= 60; rr += 1) {
      const vitals = { rr } as Vitals;
      const fromWhiteboard = criteriaFromVitals(vitals).respiratoryRate;
      const fromCalculator = qsofaCriteriaFromInputs({
        respiratoryRate: rr,
        systolicBloodPressure: 120,
        alteredMentation: false,
        gcs: 15,
      }).respiratoryRateGte22;
      expect(fromWhiteboard).toBe(fromCalculator);
    }
  });

  it('agrees on the systolic BP criterion across the full clinical range', () => {
    for (let sbp = 40; sbp <= 220; sbp += 1) {
      const vitals = { sbp } as Vitals;
      const fromWhiteboard = criteriaFromVitals(vitals).systolicBp;
      const fromCalculator = qsofaCriteriaFromInputs({
        respiratoryRate: 16,
        systolicBloodPressure: sbp,
        alteredMentation: false,
        gcs: 15,
      }).systolicBpLte100;
      expect(fromWhiteboard).toBe(fromCalculator);
    }
  });

  it('agrees on the altered-mentation/GCS criterion across the full clinical range', () => {
    for (let gcs = 3; gcs <= 15; gcs += 1) {
      const vitals = { gcs } as Vitals;
      const fromWhiteboard = criteriaFromVitals(vitals).alteredMentation;
      const fromCalculator = qsofaCriteriaFromInputs({
        respiratoryRate: 16,
        systolicBloodPressure: 120,
        alteredMentation: false,
        gcs,
      }).alteredMentationOrGcsLt15;
      expect(fromWhiteboard).toBe(fromCalculator);
    }
  });

  it('agrees the alert/critical threshold is a total of 2 or more criteria across the full 0-3 range', () => {
    for (let total = 0; total <= 3; total += 1) {
      const whiteboardAlert = resultFor(total).alert;
      const calculatorCritical = interpretQsofaScore(total).severity === 'critical';
      expect(whiteboardAlert).toBe(calculatorCritical);
      expect(whiteboardAlert).toBe(total >= 2);
    }
  });
});
