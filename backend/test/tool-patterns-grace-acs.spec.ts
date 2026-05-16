import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — GRACE ACS', () => {
  it('matches grace and acs mortality risk phrases', () => {
    const a = matchToolPatterns('calculate grace acs risk');
    expect(a.some((m) => m.toolId === 'grace-acs')).toBe(true);

    const b = matchToolPatterns('acs mortality risk score');
    expect(b.some((m) => m.toolId === 'grace-acs')).toBe(true);
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
