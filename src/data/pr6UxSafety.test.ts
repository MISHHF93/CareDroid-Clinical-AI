/**
 * PR6 clinical safety — COPD GOLD chat seed contracts.
 */

import { describe, it, expect } from 'vitest';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';

const INHALER_PATTERN =
  /\b(laba|lama|ics|triple therapy|tiotropium|budesonide|formoterol|salmeterol)\b/i;

describe('PR6 NLU — copd-gold chat seed safety', () => {
  it('chat seed avoids treatment directives and emphasizes clinician review', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'copd-gold');
    const seed = copdGoldChatConfig.chatSeed;
    expect(nlu?.chatSeed).toBe(seed);
    expect(seed).toMatch(/grouping support only/i);
    expect(seed).toMatch(/not a diagnosis/i);
    expect(seed).toMatch(/Do NOT recommend specific medications/i);
    expect(seed).not.toMatch(/\bprescribe\b/i);
    expect(seed).not.toMatch(/\bstart inhaler\b/i);
    expect(seed).toMatch(/clinician judgment|qualified clinician/i);
  });

  it('mentions inhalers only in negation (no recommendations)', () => {
    const seed = copdGoldChatConfig.chatSeed;
    expect(seed).toMatch(/Do NOT.*inhalers/i);
    const lines = seed.split('\n').filter((l) => INHALER_PATTERN.test(l) && !/do not/i.test(l));
    expect(lines.length).toBe(0);
  });
});
