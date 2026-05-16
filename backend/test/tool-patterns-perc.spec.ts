import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — PERC', () => {
  it('matches perc and pe rule out phrases', () => {
    const a = matchToolPatterns('apply perc rule');
    expect(a.some((m) => m.toolId === 'perc')).toBe(true);

    const b = matchToolPatterns('pulmonary embolism rule out criteria');
    expect(b.some((m) => m.toolId === 'perc')).toBe(true);
  });

  it('prefers perc over wells-pe for rule-out wording', () => {
    const matches = matchToolPatterns('pe rule out perc low risk');
    expect(matches[0]?.toolId).toBe('perc');
  });
});
