import { describe, expect, it } from 'vitest';
import {
  parseAllergyArtifactText,
  parseInsuranceArtifactText,
  parseMedicationArtifactText,
  parseReferralArtifactText,
} from './clinicalArtifactParser';

describe('clinicalArtifactParser', () => {
  it('parses insurance card fields', () => {
    const parsed = parseInsuranceArtifactText(`
      Payer: CarePlus Health
      Member ID: CP-442190
      Group ID: GRP-88A
    `);
    expect(parsed.payerName).toBe('CarePlus Health');
    expect(parsed.memberId).toBe('CP-442190');
    expect(parsed.groupId).toBe('GRP-88A');
  });

  it('parses medication list fields', () => {
    const parsed = parseMedicationArtifactText('Medication: Metformin 500mg BID');
    expect(parsed.medication).toContain('Metformin');
  });

  it('parses allergy list fields', () => {
    const parsed = parseAllergyArtifactText('Allergy: Penicillin\nReaction: rash');
    expect(parsed.substance).toBe('Penicillin');
    expect(parsed.reaction).toBe('rash');
  });

  it('parses referral letter fields', () => {
    const parsed = parseReferralArtifactText(
      'Chief complaint: Chest pain\nDiagnoses: Angina rule-out\nRecommendations: ED assessment',
    );
    expect(parsed.chiefComplaint).toContain('Chest pain');
    expect(parsed.diagnoses).toContain('Angina');
    expect(parsed.recommendations).toContain('ED assessment');
  });
});
