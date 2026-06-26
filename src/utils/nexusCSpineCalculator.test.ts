import { describe, it, expect } from 'vitest';
import {
  NEXUS_CSPINE_DISCLAIMER,
  evaluateNexusCSpine,
  interpretNexusCSpine,
} from './nexusCSpineCalculator';

describe('nexusCSpineCalculator', () => {
  it('identifies low-risk when all five criteria are absent', () => {
    const result = evaluateNexusCSpine({
      midlineTenderness: false,
      intoxication: false,
      neurologicDeficit: false,
      distractingInjury: false,
      normalAlertness: true,
    });
    expect(result?.lowRiskByRule).toBe(true);
    expect(result?.imagingIndicatedByRule).toBe(false);
    expect(result?.severity).toBe('normal');
  });

  it('flags imaging stratum when any criterion is present', () => {
    expect(evaluateNexusCSpine({ midlineTenderness: true })?.imagingIndicatedByRule).toBe(true);
    expect(evaluateNexusCSpine({ intoxication: true })?.imagingIndicatedByRule).toBe(true);
    expect(evaluateNexusCSpine({ neurologicDeficit: true })?.imagingIndicatedByRule).toBe(true);
    expect(evaluateNexusCSpine({ distractingInjury: true })?.imagingIndicatedByRule).toBe(true);
    expect(evaluateNexusCSpine({ normalAlertness: false })?.imagingIndicatedByRule).toBe(true);
  });

  it('lists triggered criteria', () => {
    const result = evaluateNexusCSpine({
      midlineTenderness: false,
      intoxication: true,
      neurologicDeficit: false,
      distractingInjury: false,
      normalAlertness: true,
    });
    expect(result?.triggeredCriteria).toEqual(['Intoxication']);
  });

  it('includes trauma disclaimer without clearance language', () => {
    const interp = interpretNexusCSpine({
      imagingIndicatedByRule: false,
      lowRiskByRule: true,
      triggeredCriteria: [],
    });
    expect(interp?.disclaimer).toBe(NEXUS_CSPINE_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/does not clear the cervical spine/i);
    expect(interp?.interpretation).not.toMatch(/\bcleared the cervical spine\b/i);
  });
});
