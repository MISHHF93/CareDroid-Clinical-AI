import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — PECARN head injury', () => {
  it('matches pecarn and pediatric head CT phrases', () => {
    const a = matchToolPatterns('apply pecarn rule for pediatric head injury');
    expect(a.some((m) => m.toolId === 'pecarn-head')).toBe(true);

    const b = matchToolPatterns('child head trauma ct decision');
    expect(b.find((m) => m.toolId === 'pecarn-head')).toBeDefined();
  });
});
