import { describe, it, expect } from 'vitest';
import { resultFor } from './HEARTScore';
import { heartRiskCategoryFromScore } from '../../utils/heartScoreCalculator';

/**
 * `HEARTScore.tsx` (live, patient-attached whiteboard calculator) and
 * `pages/tools/Calculators.tsx`'s HEART score path (via
 * `utils/heartScoreCalculator.ts`, reached through the "All Tools" catalog
 * card rather than the Calculators hub override) are two real,
 * independently-consumed UI flows reaching the same published HEART score
 * risk bands. Neither implementation imports the other, so a future edit to
 * one's band boundaries could silently diverge from the other. This test
 * locks both implementations to the same risk category across the full
 * 0-10 score range, matching this codebase's own established precedent
 * (see news2Equivalence.test.ts) for pairs of independently-maintained
 * clinical scoring implementations.
 */
const BAND_TO_CATEGORY: Record<string, 'low' | 'intermediate' | 'high'> = {
  'Low risk': 'low',
  'Moderate risk': 'intermediate',
  'High risk': 'high',
};

describe('HEART score cross-implementation equivalence (HEARTScore.tsx vs utils/heartScoreCalculator.ts)', () => {
  it('agrees on risk category across the full 0-10 score range', () => {
    for (let total = 0; total <= 10; total += 1) {
      const bandFromWhiteboard = BAND_TO_CATEGORY[resultFor(total).band];
      const categoryFromCalculator = heartRiskCategoryFromScore(total);
      expect(bandFromWhiteboard).toBe(categoryFromCalculator);
    }
  });
});
