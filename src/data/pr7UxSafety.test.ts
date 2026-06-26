/**
 * PR7 clinical safety — Rome IV IBS chat seed contracts.
 */

import { describe, it, expect } from 'vitest';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';

const TREATMENT_PATTERN = /\b(prescribe|recommend (a |the )?(low fodmap|rifaximin|lubiprostone|linaclotide))\b/i;

describe('PR7 NLU — rome-iv-ibs chat seed safety', () => {
  it('chat seed is informational and recommends clinician review', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'rome-iv-ibs');
    const seed = romeIvIbsChatConfig.chatSeed;
    expect(nlu?.chatSeed).toBe(seed);
    expect(seed).toMatch(/informational criteria support only/i);
    expect(seed).toMatch(/NOT a diagnosis/i);
    expect(seed).toMatch(/qualified clinician/i);
    expect(seed).toMatch(/Do NOT state that the patient has IBS/i);
    expect(seed).not.toMatch(TREATMENT_PATTERN);
  });

  it('mentions IBS only in negated diagnostic context', () => {
    const seed = romeIvIbsChatConfig.chatSeed.toLowerCase();
    expect(seed).toMatch(/does not diagnose|not a diagnosis|do not state.*has ibs/);
  });
});
