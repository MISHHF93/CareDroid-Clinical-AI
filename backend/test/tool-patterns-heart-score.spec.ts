import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — HEART score', () => {
  it('matches heart score and chest pain risk phrases', () => {
    const a = matchToolPatterns('calculate heart score for chest pain');
    expect(a.some((m) => m.toolId === 'heart-score')).toBe(true);

    const b = matchToolPatterns('ed chest pain risk stratification heart');
    expect(b.find((m) => m.toolId === 'heart-score')).toBeDefined();
  });
});
