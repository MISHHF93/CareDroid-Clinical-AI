import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const GRACE_ACS_REQUIRED_PHRASES = [
  'grace',
  'grace score',
  'grace acs',
  'acs mortality risk',
  'acute coronary syndrome risk',
] as const;

describe('matchToolPatterns — GRACE ACS', () => {
  it.each(GRACE_ACS_REQUIRED_PHRASES)('matches required phrase "%s"', (phrase) => {
    const matches = matchToolPatterns(`calculate ${phrase}`);
    expect(matches.some((m) => m.toolId === 'grace-acs')).toBe(true);
  });

  it('prefers grace-acs over timi-ua-nstemi for grace acs wording', () => {
    const matches = matchToolPatterns('grace acs risk stratification');
    expect(matches[0]?.toolId).toBe('grace-acs');
  });

  it('prefers timi-ua-nstemi over grace-acs for timi-only wording', () => {
    const matches = matchToolPatterns('timi score nstemi');
    expect(matches[0]?.toolId).toBe('timi-ua-nstemi');
    expect(matches.some((m) => m.toolId === 'grace-acs')).toBe(false);
  });
});
