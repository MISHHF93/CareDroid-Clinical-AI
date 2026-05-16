import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — NEWS2', () => {
  it('matches news2 and national early warning score aliases', () => {
    const a = matchToolPatterns('Please open national early warning score calculator');
    expect(a.some((m) => m.toolId === 'news2')).toBe(true);

    const b = matchToolPatterns('news2 for this patient');
    expect(b.find((m) => m.toolId === 'news2')).toBeDefined();

    const c = matchToolPatterns('early warning score deterioration');
    expect(c.some((m) => m.toolId === 'news2')).toBe(true);
  });
});
