import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — MELD / MELD-Na', () => {
  it('matches meld and meld score phrases', () => {
    const a = matchToolPatterns('calculate meld score for cirrhosis');
    expect(a.some((m) => m.toolId === 'meld')).toBe(true);

    const b = matchToolPatterns('model for end stage liver disease score');
    expect(b.some((m) => m.toolId === 'meld')).toBe(true);
  });

  it('matches meld-na and liver transplant score phrases', () => {
    const a = matchToolPatterns('meld-na with sodium 128');
    expect(a.some((m) => m.toolId === 'meld-na')).toBe(true);

    const b = matchToolPatterns('liver transplant score sodium');
    expect(b.some((m) => m.toolId === 'meld-na')).toBe(true);
  });
});
