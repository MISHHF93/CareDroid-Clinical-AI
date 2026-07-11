import { describe, expect, it } from 'vitest';
import { hybridFuse, lexicalScore, passesMetadataFilter } from './hybridRetrieval';
import {
  filterSupportedClaims,
  scoreClaimAgainstEvidence,
} from './citationEntailment';

describe('hybridFuse', () => {
  it('boosts lexical match when vector scores are close', () => {
    const fused = hybridFuse(
      'sepsis antibiotics hour one bundle lactate',
      [
        {
          id: 'a',
          text: 'Hour-1 sepsis interventions include antibiotics and lactate measurement.',
          vectorScore: 0.72,
        },
        {
          id: 'b',
          text: 'Unrelated orthopedic discharge checklist for elective surgery.',
          vectorScore: 0.74,
        },
      ],
      { topK: 2 },
    );

    expect(fused[0].id).toBe('a');
    expect(fused[0].lexicalScore).toBeGreaterThan(fused[1].lexicalScore);
  });

  it('scores lexical overlap', () => {
    expect(lexicalScore('cardiac arrest epinephrine', 'adult cardiac arrest epinephrine dosing')).toBeGreaterThan(
      0.3,
    );
    expect(lexicalScore('cardiac arrest', 'banana bread recipe')).toBe(0);
  });
});

describe('passesMetadataFilter', () => {
  it('filters expired registry artifacts', () => {
    expect(
      passesMetadataFilter(
        { expiresAt: '2020-01-01', specialty: 'emergency medicine' },
        { excludeExpired: true, now: new Date('2026-07-11') },
      ),
    ).toBe(false);
  });

  it('allows missing optional metadata', () => {
    expect(passesMetadataFilter({ title: 'x' }, { specialty: 'emergency' })).toBe(true);
  });
});

describe('citation entailment', () => {
  it('supports claims backed by evidence spans', () => {
    const result = scoreClaimAgainstEvidence(
      { text: 'Antibiotics should be given within 1 hour for sepsis or septic shock.' },
      [
        {
          artifactId: 'kn-sepsis-hour-1-v1',
          text: 'Administer broad-spectrum antibiotics within 1 hour for sepsis or septic shock.',
        },
      ],
    );
    expect(result.supported).toBe(true);
  });

  it('strips unsupported claims', () => {
    const { kept, stripped } = filterSupportedClaims(
      [
        {
          text: 'All ED patients require steroids within ten minutes of arrival.',
          citationArtifactId: 'kn-sepsis-hour-1-v1',
        },
      ],
      [
        {
          artifactId: 'kn-sepsis-hour-1-v1',
          text: 'Administer broad-spectrum antibiotics within 1 hour for sepsis or septic shock.',
        },
      ],
    );
    expect(kept).toHaveLength(0);
    expect(stripped).toHaveLength(1);
  });
});
