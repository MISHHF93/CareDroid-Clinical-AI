import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — Wells PE', () => {
  it('matches wells pe and pulmonary embolism wells phrases', () => {
    const a = matchToolPatterns('calculate wells pe score');
    expect(a[0]?.toolId).toBe('wells-pe');

    const b = matchToolPatterns('pulmonary embolism wells rule');
    expect(b.some((m) => m.toolId === 'wells-pe')).toBe(true);
  });

  it('prefers wells-pe over wells-dvt when PE context is clear', () => {
    const matches = matchToolPatterns('wells score for pulmonary embolism');
    expect(matches[0]?.toolId).toBe('wells-pe');
    expect(matches.some((m) => m.toolId === 'wells-dvt-calculator')).toBe(false);
  });

  it('prefers wells-dvt when DVT context is clear', () => {
    const matches = matchToolPatterns('wells score for deep vein thrombosis');
    expect(matches[0]?.toolId).toBe('wells-dvt-calculator');
    expect(matches.some((m) => m.toolId === 'wells-pe')).toBe(false);
  });
});
