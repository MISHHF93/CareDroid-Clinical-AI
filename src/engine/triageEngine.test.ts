import { describe, expect, it } from 'vitest';
import { suggestTriagePriority } from './triageEngine';
import { Priority } from '../types/emergency';

describe('triageEngine pain scoring (HEAL-239)', () => {
  it('suggests P3 for the moderate 6-8 pain band', () => {
    const result = suggestTriagePriority({
      complaintCategory: 'General',
      vitals: { pain: 7 },
    });
    expect(result.suggestedPriority).toBe(Priority.P3);
    expect(result.ruleTriggered).toBe('p3-moderate-pain');
  });

  it('suggests P3 (not the P4/P5 default) for pain 9 or 10 -- the top of the scale previously fell through every rule', () => {
    const resultNine = suggestTriagePriority({
      complaintCategory: 'General',
      vitals: { pain: 9 },
    });
    expect(resultNine.suggestedPriority).toBe(Priority.P3);
    expect(resultNine.ruleTriggered).toBe('p3-moderate-pain');

    const resultTen = suggestTriagePriority({
      complaintCategory: 'General',
      vitals: { pain: 10 },
    });
    expect(resultTen.suggestedPriority).toBe(Priority.P3);
    expect(resultTen.ruleTriggered).toBe('p3-moderate-pain');
  });
});
