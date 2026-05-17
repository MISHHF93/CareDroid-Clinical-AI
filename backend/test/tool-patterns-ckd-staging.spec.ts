import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — CKD staging', () => {
  it('matches ckd and albuminuria staging phrases', () => {
    const a = matchToolPatterns('kdigo ckd stage with acr');
    expect(a.some((m) => m.toolId === 'ckd-staging')).toBe(true);

    const b = matchToolPatterns('kidney disease staging gfr albuminuria');
    expect(b.some((m) => m.toolId === 'ckd-staging')).toBe(true);
  });

  it('prefers ckd-staging over generic gfr calculator for staging wording', () => {
    const matches = matchToolPatterns('ckd stage gfr category');
    expect(matches[0]?.toolId).toBe('ckd-staging');
  });
});
