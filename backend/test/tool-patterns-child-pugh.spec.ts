import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — Child-Pugh', () => {
  it('matches child pugh and cirrhosis score aliases', () => {
    const a = matchToolPatterns('calculate child pugh score');
    expect(a.some((m) => m.toolId === 'child-pugh')).toBe(true);

    const b = matchToolPatterns('ctp score for cirrhosis');
    expect(b.find((m) => m.toolId === 'child-pugh')).toBeDefined();

    const c = matchToolPatterns('liver severity score');
    expect(c.some((m) => m.toolId === 'child-pugh')).toBe(true);
  });
});
