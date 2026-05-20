import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — FIB-4 and BISAP', () => {
  it('matches FIB-4 liver fibrosis phrases', () => {
    const a = matchToolPatterns('calculate fib-4 for nafld fibrosis');
    expect(a.some((m) => m.toolId === 'fib4')).toBe(true);

    const b = matchToolPatterns('fib4 liver fibrosis score');
    expect(b.find((m) => m.toolId === 'fib4')).toBeDefined();
  });

  it('matches BISAP acute pancreatitis phrases', () => {
    const a = matchToolPatterns('bisap score acute pancreatitis mortality');
    expect(a.some((m) => m.toolId === 'bisap-score')).toBe(true);

    const b = matchToolPatterns('pancreatitis bisap bun sirs');
    expect(b.find((m) => m.toolId === 'bisap-score')).toBeDefined();
  });
});
