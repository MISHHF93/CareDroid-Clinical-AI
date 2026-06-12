import { describe, expect, it } from 'vitest';
import { Priority } from '../types/emergency';
import { TriageSuggestionEngine } from './triageEngine';

describe('TriageSuggestionEngine', () => {
  it('prioritizes P1 resuscitation vitals above all other rules', () => {
    const result = TriageSuggestionEngine.suggest({
      complaintCategory: 'Chest Pain',
      complaintText: 'diaphoretic',
      vitals: { spo2: '87', hr: '128' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        suggestedPriority: Priority.P1,
        confidence: 'high',
        ruleTriggered: 'p1-spo2-under-88',
        override: false,
      })
    );
    expect(result.reason).toBe('P1 suggested - SpO2 87%');
  });

  it('suggests P2 for chest pain with HR over 120 and explains why', () => {
    const result = TriageSuggestionEngine.suggest({
      complaintCategory: 'Chest Pain',
      complaintText: 'pressure while walking',
      vitals: { hr: '128' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        suggestedPriority: Priority.P2,
        confidence: 'high',
        reason: 'P2 suggested - chest pain with HR 128',
        ruleTriggered: 'p2-chest-pain-hr-over-120',
        override: false,
      })
    );
  });

  it('suggests P3 for moderate pain when no higher-acuity rule fires', () => {
    const result = TriageSuggestionEngine.suggest({
      complaintCategory: 'Other',
      complaintText: 'back pain',
      vitals: { pain: '7' },
    });

    expect(result.suggestedPriority).toBe(Priority.P3);
    expect(result.reason).toBe('P3 suggested - pain 7/10');
  });

  it('returns an override result when staff selects a different priority', () => {
    const result = TriageSuggestionEngine.suggest({
      complaintCategory: 'Chest Pain',
      vitals: { hr: '128' },
      overridePriority: Priority.P4,
    });

    expect(result).toEqual(
      expect.objectContaining({
        suggestedPriority: Priority.P4,
        ruleTriggered: 'staff-override',
        override: true,
      })
    );
    expect(result.reason).toContain('engine suggested P2 suggested - chest pain with HR 128');
  });
});
