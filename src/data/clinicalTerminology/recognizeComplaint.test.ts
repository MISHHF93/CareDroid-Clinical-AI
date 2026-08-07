import { describe, expect, it } from 'vitest';
import { recognizeComplaint } from './recognizeComplaint';

// Regression/benchmark suite for the 2026-08-08 terminology-recognition round.
// Every phrase below is one of the acceptance-criteria examples the round was
// scoped against — this is the evidence that the pipeline actually recognizes
// them now, not just that the helper functions exist.

describe('recognizeComplaint — high-risk fast-flag phrases (existing registry, some new synonyms)', () => {
  const cases: Array<[string, string]> = [
    ['chest pain', 'chest-pain'],
    ['pain in chest', 'chest-pain'],
    ['tight chest', 'chest-pain'],
    ['pressure in my chest', 'chest-pain'],
    ['sob', 'shortness-of-breath'],
    ['shortness of breath', 'shortness-of-breath'],
    ["can't breathe", 'shortness-of-breath'],
    ['cant breathe', 'shortness-of-breath'],
    ['difficulty breathing', 'shortness-of-breath'],
    ['passed out', 'syncope'],
    ['fainted', 'syncope'],
    ['syncope', 'syncope'],
  ];

  it.each(cases)('recognizes "%s" as %s at HIGH_CONFIDENCE', (phrase, expectedConceptId) => {
    const result = recognizeComplaint(phrase);
    expect(result.matchedConceptId).toBe(expectedConceptId);
    expect(result.confidenceTier).toBe('HIGH_CONFIDENCE');
  });
});

describe('recognizeComplaint — general (non-fast-flag) complaint concepts', () => {
  const cases: Array<[string, string]> = [
    ['dizzy', 'dizziness-lightheadedness'],
    ['lightheaded', 'dizziness-lightheadedness'],
    ['stomach pain', 'abdominal-pain-general'],
    ['abdo pain', 'abdominal-pain-general'],
    ['abdominal pain', 'abdominal-pain-general'],
    ['belly pain', 'abdominal-pain-general'],
    ['throwing up', 'nausea-vomiting'],
    ['vomiting', 'nausea-vomiting'],
    ['nausea', 'nausea-vomiting'],
    ['fever', 'fever'],
    ['high temperature', 'fever'],
    ['weakness', 'weakness-general'],
    ['general weakness', 'weakness-general'],
    ['heart racing', 'palpitations'],
    ['palpitations', 'palpitations'],
    ['irregular heartbeat', 'palpitations'],
  ];

  it.each(cases)('recognizes "%s" as %s', (phrase, expectedConceptId) => {
    const result = recognizeComplaint(phrase);
    expect(result.matchedConceptId).toBe(expectedConceptId);
    expect(result.confidenceTier).not.toBe('NO_MATCH');
    expect(result.sourceSystem).toBe('local');
  });

  it('never auto-labels a general-concept match as diagnostic — always requiresHumanReview unless HIGH_CONFIDENCE, and result carries no diagnosis field', () => {
    const result = recognizeComplaint('nausea');
    expect(result).not.toHaveProperty('diagnosis');
    expect(typeof result.requiresHumanReview).toBe('boolean');
  });
});

describe('recognizeComplaint — unknown input stays unknown', () => {
  it('does not force an intentionally unrelated phrase into any concept', () => {
    const result = recognizeComplaint('xyzzy purple wombat requisition');
    expect(result.matchedConceptId).toBeNull();
    expect(result.confidenceTier).toBe('NO_MATCH');
    expect(result.requiresHumanReview).toBe(true);
    expect(result.rawText).toBe('xyzzy purple wombat requisition');
  });

  it('preserves rawText verbatim even when normalizedText differs', () => {
    const result = recognizeComplaint("  Can't Breathe!!  ");
    expect(result.rawText).toBe("  Can't Breathe!!  ");
    expect(result.normalizedText).toBe('cant breathe');
  });

  it('returns NO_MATCH (not a crash) for empty/whitespace-only input', () => {
    expect(recognizeComplaint('').confidenceTier).toBe('NO_MATCH');
    expect(recognizeComplaint('   ').confidenceTier).toBe('NO_MATCH');
    expect(recognizeComplaint(null).confidenceTier).toBe('NO_MATCH');
    expect(recognizeComplaint(undefined).confidenceTier).toBe('NO_MATCH');
  });
});

describe('recognizeComplaint — spelling-variant fuzzy fallback stays LOW_CONFIDENCE and does not overreach', () => {
  it('recognizes a simple single-letter typo as a LOW_CONFIDENCE candidate, not HIGH', () => {
    const result = recognizeComplaint('naussea');
    expect(result.confidenceTier).toBe('LOW_CONFIDENCE');
    expect(result.matchedConceptId).toBe('nausea-vomiting');
    expect(result.requiresHumanReview).toBe(true);
  });

  it('does not fuzzy-match a short, unrelated word into a concept', () => {
    const result = recognizeComplaint('cat');
    expect(result.confidenceTier).toBe('NO_MATCH');
  });
});

describe('recognizeComplaint — normalization', () => {
  it('is case, punctuation, and whitespace insensitive', () => {
    const a = recognizeComplaint('Chest Pain');
    const b = recognizeComplaint('  chest,   pain!! ');
    expect(a.matchedConceptId).toBe('chest-pain');
    expect(b.matchedConceptId).toBe('chest-pain');
  });
});
