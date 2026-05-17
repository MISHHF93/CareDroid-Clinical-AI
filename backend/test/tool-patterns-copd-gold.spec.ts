import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — COPD GOLD', () => {
  it('matches gold copd and copd assessment phrases', () => {
    const a = matchToolPatterns('gold copd classification');
    expect(a.some((m) => m.toolId === 'copd-gold')).toBe(true);

    const b = matchToolPatterns('copd assessment tool');
    expect(b.some((m) => m.toolId === 'copd-gold')).toBe(true);
  });

  it('prefers copd-gold for gold classification wording', () => {
    const matches = matchToolPatterns('copd risk gold classification');
    expect(matches[0]?.toolId).toBe('copd-gold');
  });
});
