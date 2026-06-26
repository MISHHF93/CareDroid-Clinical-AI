import { describe, it, expect } from 'vitest';
import {
  computeNihssTotal,
  interpretNihssSeverity,
  nihssItemPoints,
  validateNihssInputs,
} from './nihssCalculator';

describe('nihssCalculator', () => {
  const zeroExam = {
    loc: 0,
    locQuestions: 0,
    locCommands: 0,
    bestGaze: 0,
    visualFields: 0,
    facialPalsy: 0,
    motorArmLeft: 0,
    motorArmRight: 0,
    motorLegLeft: 0,
    motorLegRight: 0,
    limbAtaxia: 0,
    sensory: 0,
    bestLanguage: 0,
    dysarthria: 0,
    extinctionInattention: 0,
  };

  it('scores untestable motor items as 0 points', () => {
    expect(nihssItemPoints(9, { untestableCode: 9 })).toBe(0);
    expect(nihssItemPoints(4, { untestableCode: 9 })).toBe(4);
  });

  it('validates item score ranges', () => {
    expect(validateNihssInputs(zeroExam).valid).toBe(true);
    expect(validateNihssInputs({ ...zeroExam, loc: 4 }).valid).toBe(false);
    expect(validateNihssInputs({ ...zeroExam, motorArmLeft: 9 }).valid).toBe(true);
  });

  it('sums total NIHSS for normal exam', () => {
    const { total } = computeNihssTotal(zeroExam);
    expect(total).toBe(0);
    const interp = interpretNihssSeverity(total);
    expect(interp.severityBand).toBe('none');
  });

  it('classifies severe stroke totals', () => {
    const severe = {
      ...zeroExam,
      loc: 2,
      bestLanguage: 3,
      motorArmLeft: 4,
      motorArmRight: 4,
      motorLegLeft: 4,
      motorLegRight: 4,
      extinctionInattention: 2,
    };
    const { total } = computeNihssTotal(severe);
    expect(total).toBeGreaterThanOrEqual(21);
    expect(interpretNihssSeverity(total).severityBand).toBe('severe');
  });

  it('interpretation stresses urgent stroke pathways and no treatment directives', () => {
    const interp = interpretNihssSeverity(8);
    expect(interp.safetyDisclaimer).toMatch(/does not replace urgent stroke evaluation/i);
    expect(interp.pathwayDisclaimer).toMatch(/local stroke pathways/i);
    expect(interp.interpretation).not.toMatch(/give tpa|thrombectomy now/i);
  });
});
