import { describe, it, expect } from 'vitest';
import {
  MORSE_FALL_HOSPITAL_DISCLAIMER,
  calculateMorseFallScore,
  interpretMorseFallScore,
} from './morseFallScaleCalculator';

describe('morseFallScaleCalculator', () => {
  it('scores 0 when all items are lowest risk', () => {
    expect(
      calculateMorseFallScore({
        historyOfFalling: 0,
        secondaryDiagnosis: 0,
        ambulatoryAid: 0,
        ivHeparinLock: 0,
        gait: 0,
        mentalStatus: 0,
      })
    ).toBe(0);
    expect(interpretMorseFallScore(0)?.riskCategory).toBe('low');
  });

  it('scores maximum 125 for highest-risk selections', () => {
    expect(
      calculateMorseFallScore({
        historyOfFalling: 25,
        secondaryDiagnosis: 15,
        ambulatoryAid: 30,
        ivHeparinLock: 20,
        gait: 20,
        mentalStatus: 15,
      })
    ).toBe(125);
    expect(interpretMorseFallScore(125)?.riskCategory).toBe('high');
    expect(interpretMorseFallScore(125)?.severity).toBe('critical');
  });

  it.each([
    { score: 10, category: 'low' },
    { score: 24, category: 'low' },
    { score: 25, category: 'moderate' },
    { score: 50, category: 'moderate' },
    { score: 51, category: 'high' },
  ])('interpretMorseFallScore($score) → $category', ({ score, category }) => {
    expect(interpretMorseFallScore(score)?.riskCategory).toBe(category);
  });

  it('uses hospital disclaimer and avoids directive treatment language', () => {
    const interp = interpretMorseFallScore(60);
    expect(interp?.disclaimer).toBe(MORSE_FALL_HOSPITAL_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/fall-prevention pathway/i);
    expect(interp?.interpretation).not.toMatch(/\bimplement\b/i);
    expect(interp?.interpretation).toMatch(/documentation|protocol/i);
  });

  it('returns null for invalid scores or inputs', () => {
    expect(interpretMorseFallScore(-1)).toBeNull();
    expect(interpretMorseFallScore(126)).toBeNull();
    expect(
      calculateMorseFallScore({
        historyOfFalling: 0,
        secondaryDiagnosis: 0,
        ambulatoryAid: 99,
        ivHeparinLock: 0,
        gait: 0,
        mentalStatus: 0,
      })
    ).toBeNull();
  });
});
