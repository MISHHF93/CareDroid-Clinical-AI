import { describe, it, expect } from 'vitest';
import { severityFor } from './NIHSS';
import { categorizeNihssSeverity } from '../../utils/nihssCalculator';

/**
 * `NIHSS.tsx` (live, patient-attached whiteboard calculator) and
 * `pages/tools/sourceBackedClinicalCalculators.tsx`'s NIHSS path (via
 * `utils/nihssCalculator.ts`, reached through the "All Tools" catalog card
 * rather than the Calculators hub override) each carry their own copy of
 * the NIH Stroke Scale severity bands. Neither implementation imports the
 * other, so a future edit to one's band boundaries could silently diverge
 * from the other. This test locks both implementations to the same
 * severity band across the full 0-42 score range, matching this
 * codebase's own established precedent (see news2Equivalence.test.ts,
 * heartScoreEquivalence.test.ts, qsofaEquivalence.test.ts) for pairs of
 * independently-maintained clinical scoring implementations.
 *
 * Note: `NIHSS.tsx`'s UI offers no "untestable" (score 9) option for any
 * item, while `utils/nihssCalculator.ts` explicitly supports it for the 6
 * items where NIHSS allows it (motor arm/leg x2, limb ataxia, dysarthria)
 * and correctly excludes it from the total per standard NIHSS scoring.
 * That is a real expressiveness gap in the whiteboard calculator, not a
 * scoring disagreement this test can catch (the whiteboard UI cannot
 * submit a 9 in the first place) -- tracked separately in the ledger.
 */
const BAND_TO_CATEGORY: Record<string, string> = {
  'No stroke symptoms': 'none',
  'Minor stroke': 'minor',
  'Moderate stroke': 'moderate',
  'Moderate-severe stroke': 'moderate-severe',
  'Severe stroke': 'severe',
};

describe('NIHSS cross-implementation equivalence (NIHSS.tsx vs utils/nihssCalculator.ts)', () => {
  it('agrees on severity band across the full 0-42 score range', () => {
    for (let total = 0; total <= 42; total += 1) {
      const bandFromWhiteboard = BAND_TO_CATEGORY[severityFor(total).label];
      const categoryFromCalculator = categorizeNihssSeverity(total);
      expect(bandFromWhiteboard).toBe(categoryFromCalculator);
    }
  });
});
