import { describe, it, expect } from 'vitest';
import {
  FIB4_SAFETY_DISCLAIMER,
  calculateFib4,
  fib4RiskCategoryFromIndex,
  interpretFib4,
  validateFib4Inputs,
} from './fib4Calculator';

describe('fib4Calculator', () => {
  it('calculates FIB-4 from age, AST, ALT, and platelets', () => {
    const index = calculateFib4({
      ageYears: 50,
      astUPerL: 40,
      altUPerL: 30,
      platelets10e9PerL: 200,
    });
    expect(index).toBeGreaterThan(1.8);
    expect(index).toBeLessThan(1.9);
  });

  it.each([
    { index: 1.2, age: 50, category: 'low' },
    { index: 2.0, age: 50, category: 'indeterminate' },
    { index: 3.0, age: 50, category: 'high' },
    { index: 1.5, age: 70, category: 'low' },
    { index: 2.5, age: 70, category: 'elevated' },
  ])('fib4RiskCategoryFromIndex($index, $age) is $category', ({ index, age, category }) => {
    expect(fib4RiskCategoryFromIndex(index, age)).toBe(category);
    expect(interpretFib4(index, age)?.riskCategory).toBe(category);
  });

  it('validateFib4Inputs enforces unit ranges', () => {
    expect(validateFib4Inputs({
      ageYears: 50,
      astUPerL: 40,
      altUPerL: 30,
      platelets10e9PerL: 200,
    }).valid).toBe(true);

    const bad = validateFib4Inputs({
      ageYears: 10,
      astUPerL: 0,
      altUPerL: 30,
      platelets10e9PerL: 200,
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(bad.errors.join(' ')).toMatch(/age/i);
    expect(bad.errors.join(' ')).toMatch(/AST/i);
  });

  it('includes safety disclaimer and avoids directive treatment language', () => {
    const interp = interpretFib4(2.5, 55);
    expect(interp?.disclaimer).toBe(FIB4_SAFETY_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/elastography|biopsy/i);
    expect(interp?.interpretation).not.toMatch(/\bprescribe\b/i);
  });

  it('returns null for invalid calculation inputs', () => {
    expect(calculateFib4({ ageYears: 50, astUPerL: 0, altUPerL: 30, platelets10e9PerL: 200 })).toBeNull();
    expect(interpretFib4(0, 50)).toBeNull();
  });
});
