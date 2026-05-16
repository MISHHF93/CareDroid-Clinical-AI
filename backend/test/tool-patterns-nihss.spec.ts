import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — NIHSS', () => {
  it('matches nihss and stroke scale phrases', () => {
    const a = matchToolPatterns('calculate nihss score');
    expect(a.some((m) => m.toolId === 'nihss')).toBe(true);

    const b = matchToolPatterns('national institutes of health stroke scale');
    expect(b.some((m) => m.toolId === 'nihss')).toBe(true);
  });

  it('prefers nihss over gcs-calculator for nihss wording', () => {
    const matches = matchToolPatterns('nih stroke scale assessment');
    expect(matches[0]?.toolId).toBe('nihss');
  });

  it('prefers nihss for stroke severity score', () => {
    const matches = matchToolPatterns('stroke severity score');
    expect(matches.some((m) => m.toolId === 'nihss')).toBe(true);
  });
});
